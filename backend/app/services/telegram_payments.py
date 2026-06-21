from __future__ import annotations

from datetime import datetime, timedelta
import json
import re
from urllib import error, parse, request
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.pricing import MONTHLY_PLAN_DAYS, MONTHLY_PRICE, THREE_MONTH_PLAN_DAYS
from app.models import PaymentOrder, Subscription, TelegramAudience, TestAttempt, User
from app.services.reading_analyzer import build_analyzer_funnel_stats
from app.services.bot_service import WELCOME_BOT_USERNAME, activate_telegram_user, clean_first_name, notify_bot_after_test
from app.services.messages import BUTTONS, LANGUAGE_BUTTONS, MESSAGES, SUPPORTED_LANGUAGES

PLAN_ALIASES = {
    "pro": "pro",
    "platform": "pro",
    "sattest pro": "pro",
    "sat platform pro": "pro",
}

PLAN_PRICES = {
    "pro": MONTHLY_PRICE,
}

ORDER_PLAN_DAYS = {
    "monthly": MONTHLY_PLAN_DAYS,
    "three_month": THREE_MONTH_PLAN_DAYS,
}

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE_RE = re.compile(r"(?:\+?998|998)?[\s\-.]?\d{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2}")
NAME_LINE_RE = re.compile(r"(?im)^\s*(?:full\s*name|name|fio|фио|имя|ism|to'liq\s*ism|toliq\s*ism)\s*[:\-]\s*(.+?)\s*$")
PHONE_LINE_RE = re.compile(r"(?im)^\s*(?:phone|telephone|tel|телефон|nomer|raqam)\s*[:\-]\s*(.+?)\s*$")
EMAIL_LINE_RE = re.compile(r"(?im)^\s*(?:email|e-mail|почта)\s*[:\-]\s*([\w.+-]+@[\w-]+(?:\.[\w-]+)+)\s*$")
CAPTION_LABEL_RE = re.compile(
    r"(?i)^\s*(?:full\s*name|name|fio|фио|имя|ism|to'liq\s*ism|toliq\s*ism|phone|telephone|tel|телефон|nomer|raqam|email|e-mail|почта|plan|tariff|tarif|тариф|reja)\s*[:\-]\s*"
)
PLAN_LINE_RE = re.compile(r"(?im)^\s*(?:plan|tariff|tarif|тариф|reja)\s*[:\-]\s*(.+?)\s*$")
TASHKENT_TZ = ZoneInfo("Asia/Tashkent")

PAYMENT_WARNING_TEXT = (
    "Warning: Fake receipt leads to account ban. If the payment is not found in Paynet/payment records, Pro access can be revoked immediately.\n\n"
    "Предупреждение: поддельный чек приводит к блокировке аккаунта. Если платеж не найден в Paynet/платежных записях, Pro-доступ может быть немедленно отозван.\n\n"
    "Ogohlantirish: soxta chek akkaunt bloklanishiga olib keladi. Agar to'lov Paynet/to'lov yozuvlarida topilmasa, Pro kirish darhol bekor qilinishi mumkin."
)

FAQ_KEYWORDS = {
    "price": ("narx", "price", "цена", "qancha", "how much", "стоимость"),
    "diagnostic": ("test", "diagnostic", "диагностика", "sinov", "bepul", "free", "boshlash", "start test"),
    "webinar": ("vebinar", "webinar", "dars", "lesson", "вебинар", "занятие"),
    "score": ("ball", "score", "балл", "natija", "result", "результат"),
    "university": (
        "university",
        "universitet",
        "университет",
        "america",
        "amerika",
        "usa",
        "abroad",
        "xorij",
        "grant",
        "stipendiya",
    ),
}

START_MESSAGE = (
    "EN: To activate SATTEST.UZ Pro, send your payment screenshot or PDF. In the caption, write only these 3 lines:\n"
    "Your full name\n"
    "+998901234567\n"
    "your-email@example.com\n\n"
    "No labels are needed. The bot treats every valid receipt as Pro and activates access automatically.\n\n"
    "RU: Чтобы активировать SATTEST.UZ Pro, отправьте скриншот или PDF-чек. В подписи напишите только 3 строки:\n"
    "Ваше полное имя\n"
    "+998901234567\n"
    "your-email@example.com\n\n"
    "Без слов ФИО, телефон, тариф. Бот считает каждый правильный чек тарифом Pro и активирует доступ автоматически.\n\n"
    "UZ: SATTEST.UZ Pro kirishini faollashtirish uchun to'lov skrinshoti yoki PDF chek yuboring. Izohga faqat 3 qator yozing:\n"
    "Ism familiyangiz\n"
    "+998901234567\n"
    "your-email@example.com\n\n"
    "Full name, Phone, Plan kabi so'zlar kerak emas. Bot har bir to'g'ri chekni Pro deb qabul qiladi va kirishni avtomatik faollashtiradi.\n\n"
    f"{PAYMENT_WARNING_TEXT}"
)

RECEIPT_REQUEST_MESSAGE = (
    "EN: Please send the payment screenshot or PDF. Caption format: full name, phone number, email. No labels, no plan.\n"
    "Example:\nYour full name\n+998901234567\nyour-email@example.com\n\n"
    "RU: Отправьте скриншот или PDF-чек. Формат подписи: полное имя, телефон, email. Без подписей и без тарифа.\n"
    "Пример:\nВаше полное имя\n+998901234567\nyour-email@example.com\n\n"
    "UZ: To'lov skrinshoti yoki PDF chekni yuboring. Izoh formati: ism familiya, telefon, email. Yorliqsiz va tarifsiz.\n"
    "Namuna:\nIsm familiyangiz\n+998901234567\nyour-email@example.com\n\n"
    f"{PAYMENT_WARNING_TEXT}"
)

EMAIL_MISSING_MESSAGE = (
    "EN: I received the receipt, but I could not read the full name, phone number, and email. Please resend the receipt with only 3 lines:\n"
    "Your full name\n+998901234567\nyour-email@example.com\n\n"
    "RU: Чек получен, но я не смог прочитать полное имя, телефон и email. Отправьте чек заново только с 3 строками:\n"
    "Ваше полное имя\n+998901234567\nyour-email@example.com\n\n"
    "UZ: Chek qabul qilindi, lekin ism familiya, telefon va emailni aniqlay olmadim. Chekni faqat 3 qator bilan qayta yuboring:\n"
    "Ism familiyangiz\n+998901234567\nyour-email@example.com"
)

RENEWAL_REMINDER_MESSAGE = (
    "EN: SATTEST.UZ Pro renewal reminder {count}/3. Your access ends on {end_date}. Please renew payment to keep Pro active.\n\n"
    "RU: Напоминание о продлении SATTEST.UZ Pro {count}/3. Доступ заканчивается {end_date}. Продлите оплату, чтобы Pro оставался активным.\n\n"
    "UZ: SATTEST.UZ Pro to'lovini yangilash eslatmasi {count}/3. Kirish muddati {end_date} tugaydi. Pro faol qolishi uchun to'lovni yangilang."
)

EXPIRED_MESSAGE = (
    "EN: Your SATTEST.UZ Pro subscription ended on {end_date}. Pro access is now inactive. Send a new payment receipt to renew.\n\n"
    "RU: Ваша подписка SATTEST.UZ Pro закончилась {end_date}. Pro-доступ сейчас неактивен. Отправьте новый чек для продления.\n\n"
    "UZ: SATTEST.UZ Pro obunangiz {end_date} kuni tugadi. Pro kirish hozir faol emas. Yangilash uchun yangi chek yuboring."
)


def handle_telegram_update(update: dict, db: Session | None) -> dict:
    if db is not None:
        process_subscription_maintenance(db)

    if callback_query := update.get("callback_query"):
        return _handle_callback(callback_query, db)

    if chat_member := update.get("chat_member"):
        return _handle_chat_member(chat_member, db)

    if message := update.get("message"):
        return _handle_message(message, db)

    return {"ok": True, "ignored": True}


def _handle_message(message: dict, db: Session | None) -> dict:
    chat_id = str(message.get("chat", {}).get("id", ""))
    if not chat_id:
        return {"ok": True, "ignored": True}

    text = str(message.get("text") or message.get("caption") or "").strip()

    if message.get("new_chat_members"):
        return _handle_new_chat_members(message, db)

    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        if len(parts) > 1 and parts[1].strip().upper().startswith("SAT-"):
            return _handle_payment_order_start(chat_id, parts[1].strip().upper(), message, db)
        if len(parts) > 1 and parts[1].strip().lower() in {"pro", "pay", "payment"}:
            _send_message(chat_id, "Salom! To'lov skrinshoting yubor 📸\n\n" + START_MESSAGE, reply_markup=_payment_help_keyboard())
            return {"ok": True, "payment_help": True}
        if db is not None:
            return _send_welcome_from_message(message, db)
        _send_message(chat_id, "Salom! To'lov skrinshoting yubor 📸\n\n" + START_MESSAGE, reply_markup=_payment_help_keyboard())
        return {"ok": True}

    if text.startswith("/stats"):
        return _handle_stats_command(chat_id, db)

    if text.startswith("/analyzer_stats"):
        return _handle_analyzer_stats_command(chat_id, db)

    if text.startswith("/funnel_stats"):
        return _handle_funnel_stats_command(chat_id, db)

    if text.startswith("/conversion_stats"):
        return _handle_conversion_stats_command(chat_id, db)

    if text.startswith("/sendtip"):
        return _handle_sendtip_command(chat_id, text, db)

    if text.startswith("/webinar_now"):
        return _handle_webinar_now_command(chat_id, db)

    if text.startswith("/scores"):
        return _handle_scores_command(chat_id, db)

    if text.startswith(("/broadcast_uz", "/broadcast_ru", "/broadcast_en", "/broadcast_all")):
        return _handle_broadcast_command(chat_id, text, db)

    if text.startswith(("/pro_report", "/report")):
        return _handle_admin_report_command(chat_id, db)

    if text.startswith("/activate"):
        return _handle_activate_command(chat_id, text, db)

    if text.startswith("/remind"):
        return _handle_remind_command(chat_id, db)

    if text.startswith("/test"):
        return _handle_simple_command(message, db, "faq_diagnostic", "start_test")

    if text.startswith("/pro"):
        return _handle_simple_command(message, db, "faq_price", "get_pro")

    if text.startswith("/webinar"):
        return _handle_webinar_command(message, db)

    if text.startswith("/tips"):
        return _handle_tips_command(message, db)

    if text.startswith("/score"):
        return _handle_score_command(message, db)

    if text.startswith("/help"):
        return _handle_simple_command(message, db, "help_command")

    if text.startswith("/contact"):
        return _handle_simple_command(message, db, "contact_command")

    has_receipt = bool(message.get("photo") or message.get("document"))
    if not has_receipt:
        if _looks_like_score(text):
            return _handle_score_value(message, db)
        return _handle_faq_or_default(message, db)

    if db is not None:
        active_order = _latest_order_for_chat(db, chat_id)
        if active_order:
            return _handle_payment_order_screenshot(active_order, message, db)

    receipt = _extract_receipt_payload(text)
    if not receipt["email"] or not receipt["phone"] or not receipt["full_name"]:
        _send_message(chat_id, EMAIL_MISSING_MESSAGE)
        return {"ok": True}
    email = receipt["email"]
    plan = receipt["plan"]

    if db is None:
        settings = get_settings()
        if chat_id != str(settings.telegram_admin_chat_id):
            _send_message(
                chat_id,
                "Receipt received, but the bot cannot activate Pro automatically because the website database is not connected right now.\n\n"
                "SATTEST.UZ Founder has been notified.",
            )
        _notify_admin_for_manual_approval(email, plan, message)
        return {"ok": True, "mode": "manual_no_database"}

    user = db.execute(select(User).where(User.email == email.lower())).scalar_one_or_none()
    if not user:
        _send_message(
            chat_id,
            f"No SATTEST.UZ account exists for {email}.\n\n"
            "Please create an account first, then resend the receipt with the same email.",
        )
        return {"ok": True}

    period_start = datetime.utcnow()
    period_end = period_start + timedelta(days=30)
    subscription = Subscription(
        user_id=user.id,
        plan=plan,
        status="active",
        provider="telegram_receipt_auto",
        provider_customer_id=chat_id,
        payer_full_name=receipt["full_name"],
        payer_phone=receipt["phone"],
        current_period_start=period_start,
        current_period_end=period_end,
        price_amount=PLAN_PRICES[plan],
        currency="UZS",
    )
    db.add(subscription)
    user.upgraded_to_pro = True
    user.upgraded_to_pro_at = user.upgraded_to_pro_at or period_start
    db.commit()
    db.refresh(subscription)

    _send_message(chat_id, _receipt_active_message(subscription, user), reply_markup=_receipt_active_keyboard(user))
    _notify_admin_for_auto_activation(subscription, user, message)
    return {"ok": True, "subscription_id": str(subscription.id), "status": "active"}


def _handle_callback(callback_query: dict, db: Session | None) -> dict:
    callback_id = callback_query.get("id")
    data = str(callback_query.get("data") or "")
    admin_chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", ""))

    if data.startswith("lang:"):
        return _handle_language_callback(callback_query, db)

    if data.startswith("goal:"):
        return _handle_goal_callback(callback_query, db)

    if data.startswith("webinar:"):
        return _handle_webinar_callback(callback_query, db)

    if data.startswith("tips:"):
        return _handle_tips_callback(callback_query, db)

    settings = get_settings()
    if settings.telegram_admin_chat_id and admin_chat_id != str(settings.telegram_admin_chat_id):
        _answer_callback(callback_id, "Only Founder can manage payment access.")
        return {"ok": True, "ignored": True}

    action, _, raw_id = data.partition(":")
    if db is None:
        _answer_callback(callback_id, "Database is not connected, approve manually.")
        return {"ok": True, "manual": True}

    if action in {"payapprove", "paydeny"}:
        return _handle_payment_order_callback(callback_query, action, raw_id.upper(), db)

    raw_subscription_id = raw_id
    if action not in {"approve", "deny", "revoke"}:
        _answer_callback(callback_id, "Unknown action.")
        return {"ok": True, "ignored": True}

    try:
        subscription_id = UUID(raw_subscription_id)
    except ValueError:
        _answer_callback(callback_id, "Invalid subscription.")
        return {"ok": True, "ignored": True}

    subscription = db.get(Subscription, subscription_id)
    if not subscription:
        _answer_callback(callback_id, "Subscription not found.")
        return {"ok": True}

    user = db.get(User, subscription.user_id)
    student_chat_id = subscription.provider_customer_id

    if action == "approve":
        now = datetime.utcnow()
        subscription.status = "active"
        subscription.current_period_start = now
        subscription.current_period_end = now + timedelta(days=30)
        subscription.renewal_reminders_sent = 0
        subscription.last_renewal_reminder_at = None
        subscription.canceled_at = None
        db.commit()
        _answer_callback(callback_id, "Access activated.")
        if student_chat_id:
            _send_payment_confirmed_message(student_chat_id, db)
            _send_message(student_chat_id, _receipt_active_message(subscription, user), reply_markup=_receipt_active_keyboard(user))
        _edit_admin_message(callback_query, f"APPROVED\n\n{_subscription_summary(subscription, user)}")
        return {"ok": True, "status": "active"}

    if action == "revoke":
        now = datetime.utcnow()
        subscription.status = "revoked"
        subscription.current_period_end = now
        subscription.canceled_at = now
        db.commit()
        _answer_callback(callback_id, "Pro access revoked.")
        if student_chat_id:
            _send_message(
                student_chat_id,
                "SATTEST.UZ Pro access was revoked because the payment could not be verified in payment records.\n\n"
                "If this is a mistake, contact @FounderSATTESTUZ with the correct payment proof.",
            )
        _edit_admin_message(callback_query, f"REVOKED - PAYMENT NOT VERIFIED\n\n{_subscription_summary(subscription, user)}")
        return {"ok": True, "status": "revoked"}

    subscription.status = "denied"
    subscription.canceled_at = datetime.utcnow()
    db.commit()
    _answer_callback(callback_id, "Receipt denied.")
    if student_chat_id:
        _send_message(
            student_chat_id,
            "Founder could not verify this payment receipt. Please resend the correct screenshot or contact @FounderSATTESTUZ.",
        )
    _edit_admin_message(callback_query, f"DENIED\n\n{_subscription_summary(subscription, user)}")
    return {"ok": True, "status": "denied"}


def _handle_chat_member(chat_member: dict, db: Session | None) -> dict:
    if db is None:
        return {"ok": True, "database": False}

    new_member = chat_member.get("new_chat_member") or {}
    status = str(new_member.get("status") or "")
    user = new_member.get("user") or {}
    if status not in {"member", "administrator", "creator"} or user.get("is_bot"):
        return {"ok": True, "ignored": True}

    lead = _upsert_telegram_audience(db, user, str(user.get("id") or ""))
    _send_welcome_to_lead(lead, db)
    return {"ok": True, "welcome": True, "telegram_user_id": lead.telegram_user_id}


def _handle_new_chat_members(message: dict, db: Session | None) -> dict:
    if db is None:
        return {"ok": True, "database": False}

    chat_id = str(message.get("chat", {}).get("id", ""))
    welcomed = 0
    for user in message.get("new_chat_members") or []:
        if user.get("is_bot"):
            continue
        lead = _upsert_telegram_audience(db, user, chat_id)
        _send_welcome_to_lead(lead, db)
        welcomed += 1
    return {"ok": True, "welcomed": welcomed}


def _send_welcome_from_message(message: dict, db: Session) -> dict:
    from_user = message.get("from") or {}
    chat_id = str(message.get("chat", {}).get("id", "") or from_user.get("id", ""))
    lead = _upsert_telegram_audience(db, from_user, chat_id)
    _send_welcome_to_lead(lead, db)
    return {"ok": True, "welcome": True, "telegram_user_id": lead.telegram_user_id}


def _upsert_telegram_audience(db: Session, telegram_user: dict, chat_id: str) -> TelegramAudience:
    telegram_user_id = str(telegram_user.get("id") or chat_id)
    detected_language = _detect_language(telegram_user.get("language_code"))
    lead = db.execute(
        select(TelegramAudience).where(TelegramAudience.telegram_user_id == telegram_user_id)
    ).scalar_one_or_none()
    now = datetime.utcnow()
    if not lead:
        lead = TelegramAudience(
            telegram_user_id=telegram_user_id,
            chat_id=chat_id or telegram_user_id,
            detected_language=detected_language,
            created_at=now,
        )
        db.add(lead)

    lead.chat_id = chat_id or lead.chat_id or telegram_user_id
    lead.username = telegram_user.get("username") or lead.username
    lead.first_name = telegram_user.get("first_name") or lead.first_name
    lead.last_name = telegram_user.get("last_name") or lead.last_name
    if detected_language and not lead.language_confirmed:
        lead.detected_language = detected_language
    elif not telegram_user.get("language_code") and not lead.detected_language:
        lead.detected_language = "unknown"
    lead.updated_at = now
    db.commit()
    db.refresh(lead)
    return lead


def _send_welcome_to_lead(lead: TelegramAudience, db: Session) -> None:
    first_name = clean_first_name(lead.first_name or lead.username)
    delivered = False
    response = _send_message(
        lead.chat_id,
        _message("welcome", "uz", first_name=first_name),
        reply_markup=_diagnostic_keyboard("uz", "start_test", lead),
    )
    delivered = delivered or bool(response.get("ok", True))
    prompt_response = _send_message(lead.chat_id, _message("language_prompt", "en"), reply_markup=_language_keyboard())
    delivered = delivered or bool(prompt_response.get("ok", True))
    menu_response = _send_message(lead.chat_id, _message("quick_menu", "uz"), reply_markup=_quick_menu_keyboard("uz", lead))
    delivered = delivered or bool(menu_response.get("ok", True))
    if delivered:
        lead.welcome_sent_at = lead.welcome_sent_at or datetime.utcnow()
        db.commit()


def _handle_language_callback(callback_query: dict, db: Session | None) -> dict:
    callback_id = callback_query.get("id")
    language = str(callback_query.get("data") or "").partition(":")[2]
    if language not in SUPPORTED_LANGUAGES:
        _answer_callback(callback_id, "Unknown language.")
        return {"ok": True, "ignored": True}
    if db is None:
        _answer_callback(callback_id, "Database is not connected.")
        return {"ok": True, "database": False}

    from_user = callback_query.get("from") or {}
    chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", "") or from_user.get("id", ""))
    lead = _upsert_telegram_audience(db, from_user, chat_id)
    now = datetime.utcnow()
    lead.chosen_language = language
    lead.language_confirmed = True
    lead.language_set_date = now
    lead.updated_at = now
    db.commit()
    _answer_callback(callback_id, _message("language_saved", language))
    _send_message(lead.chat_id, _message("language_saved", language), reply_markup=_diagnostic_keyboard(language, "start_test", lead))
    _send_message(lead.chat_id, _message("quick_menu", language), reply_markup=_quick_menu_keyboard(language, lead))
    return {"ok": True, "language": language}


def _handle_goal_callback(callback_query: dict, db: Session | None) -> dict:
    callback_id = callback_query.get("id")
    goal = str(callback_query.get("data") or "").partition(":")[2]
    if goal not in {"1000-1100", "1200-1300", "1400+"}:
        _answer_callback(callback_id, "Unknown goal.")
        return {"ok": True, "ignored": True}
    if db is None:
        _answer_callback(callback_id, "Database is not connected.")
        return {"ok": True, "database": False}

    from_user = callback_query.get("from") or {}
    chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", "") or from_user.get("id", ""))
    lead = _upsert_telegram_audience(db, from_user, chat_id)
    language = _lead_language(lead)
    lead.target_score = goal
    lead.link_clicked_at = datetime.utcnow()
    db.commit()
    _answer_callback(callback_id, "OK")
    _send_message(
        lead.chat_id,
        _message("goal_reply", language, first_name=clean_first_name(lead.first_name or lead.username), goal=goal),
        reply_markup=_diagnostic_keyboard(language, "start_now", lead),
    )
    return {"ok": True, "goal": goal}


def _lead_from_message(message: dict, db: Session | None) -> TelegramAudience | None:
    if db is None:
        return None
    from_user = message.get("from") or {}
    chat_id = str(message.get("chat", {}).get("id", "") or from_user.get("id", ""))
    lead = _upsert_telegram_audience(db, from_user, chat_id)
    lead.last_message_date = datetime.utcnow()
    db.commit()
    return lead


def _handle_simple_command(message: dict, db: Session | None, message_key: str, button_key: str | None = None) -> dict:
    chat_id = str(message.get("chat", {}).get("id", ""))
    lead = _lead_from_message(message, db)
    language = _lead_language(lead)
    reply_markup = None
    if button_key == "start_test":
        reply_markup = _diagnostic_keyboard(language, "start_test", lead)
    elif button_key == "get_pro":
        reply_markup = _pro_only_keyboard(language)
    _send_message(chat_id, _message(message_key, language), reply_markup=reply_markup)
    return {"ok": True, "command": message_key}


def _handle_webinar_command(message: dict, db: Session | None) -> dict:
    chat_id = str(message.get("chat", {}).get("id", ""))
    lead = _lead_from_message(message, db)
    language = _lead_language(lead)
    _send_message(chat_id, _message("webinar_command", language), reply_markup=_webinar_keyboard(language))
    return {"ok": True, "command": "webinar"}


def _handle_tips_command(message: dict, db: Session | None) -> dict:
    chat_id = str(message.get("chat", {}).get("id", ""))
    lead = _lead_from_message(message, db)
    language = _lead_language(lead)
    _send_message(chat_id, _message("tips_command", language), reply_markup=_tips_keyboard(language))
    return {"ok": True, "command": "tips"}


def _handle_score_command(message: dict, db: Session | None) -> dict:
    chat_id = str(message.get("chat", {}).get("id", ""))
    lead = _lead_from_message(message, db)
    language = _lead_language(lead)
    _send_message(chat_id, _message("score_command", language))
    return {"ok": True, "command": "score"}


def _handle_webinar_callback(callback_query: dict, db: Session | None) -> dict:
    callback_id = callback_query.get("id")
    enabled = str(callback_query.get("data") or "").partition(":")[2] == "yes"
    if db is None:
        _answer_callback(callback_id, "Database is not connected.")
        return {"ok": True, "database": False}

    from_user = callback_query.get("from") or {}
    chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", "") or from_user.get("id", ""))
    lead = _upsert_telegram_audience(db, from_user, chat_id)
    lead.webinar_reminder = enabled
    lead.updated_at = datetime.utcnow()
    db.commit()
    language = _lead_language(lead)
    _answer_callback(callback_id, "OK")
    if enabled:
        _send_message(lead.chat_id, _message("webinar_saved", language))
    else:
        _send_message(lead.chat_id, {"uz": "Eslatma o'chirildi ✅", "ru": "Напоминание отключено ✅", "en": "Reminder turned off ✅"}[language])
    return {"ok": True, "webinar_reminder": enabled}


def _handle_tips_callback(callback_query: dict, db: Session | None) -> dict:
    callback_id = callback_query.get("id")
    enabled = str(callback_query.get("data") or "").partition(":")[2] == "yes"
    if db is None:
        _answer_callback(callback_id, "Database is not connected.")
        return {"ok": True, "database": False}

    from_user = callback_query.get("from") or {}
    chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", "") or from_user.get("id", ""))
    lead = _upsert_telegram_audience(db, from_user, chat_id)
    lead.daily_tips = enabled
    lead.updated_at = datetime.utcnow()
    db.commit()
    language = _lead_language(lead)
    _answer_callback(callback_id, "OK")
    if enabled:
        _send_message(lead.chat_id, _message("tips_saved", language))
    else:
        _send_message(lead.chat_id, {"uz": "Kunlik maslahatlar o'chirildi ✅", "ru": "Ежедневные советы отключены ✅", "en": "Daily tips turned off ✅"}[language])
    return {"ok": True, "daily_tips": enabled}


def _looks_like_score(text: str) -> bool:
    stripped = text.strip()
    return stripped.isdigit() and 400 <= int(stripped) <= 1600


def _handle_score_value(message: dict, db: Session | None) -> dict:
    chat_id = str(message.get("chat", {}).get("id", ""))
    score = int(str(message.get("text") or message.get("caption") or "").strip())
    lead = _lead_from_message(message, db)
    language = _lead_language(lead)
    if lead is not None and db is not None:
        lead.current_score = score
        lead.score_updated_date = datetime.utcnow()
        lead.updated_at = datetime.utcnow()
        db.commit()
    _send_message(chat_id, _score_saved_message(score, language), reply_markup=_diagnostic_keyboard(language, "start_test", lead))
    return {"ok": True, "score": score}


def _score_saved_message(score: int, language: str) -> str:
    gap = max(0, 1400 - score)
    if score < 700:
        detail = {
            "uz": "Zo'r boshlash!\nAdvanced Math dan boshlang! 💪",
            "ru": "Отличный старт!\nНачните с Advanced Math! 💪",
            "en": "Great start!\nBegin with Advanced Math! 💪",
        }
    elif score < 1000:
        detail = {
            "uz": "Yaxshi daraja!\nReading ni kuchayting! 📖",
            "ru": "Хороший уровень!\nУсильте Reading! 📖",
            "en": "Good level!\nStrengthen Reading! 📖",
        }
    elif score < 1200:
        detail = {
            "uz": "Ajoyib!\nDetalllarga e'tibor bering! 🎯",
            "ru": "Отлично!\nОбратите внимание на детали! 🎯",
            "en": "Excellent!\nFocus on details! 🎯",
        }
    elif score < 1400:
        detail = {
            "uz": "Zo'r! 1400 yaqin!\nMock test topshing! 🏆",
            "ru": "Круто! 1400 близко!\nПройдите mock test! 🏆",
            "en": "Great! 1400 is close!\nTake a mock test! 🏆",
        }
    else:
        detail = {
            "uz": "FANTASTIC!\nTop universitetlar kutmoqda! 🎓",
            "ru": "FANTASTIC!\nТоп университеты ждут! 🎓",
            "en": "FANTASTIC!\nTop universities are waiting! 🎓",
        }
    return {
        "uz": f"✅ Ball saqlandi: {score}\n\nMaqsad: 1400+\nFarq: {gap} ball\n\n{detail['uz']}",
        "ru": f"✅ Балл сохранён: {score}\n\nЦель: 1400+\nРазница: {gap} баллов\n\n{detail['ru']}",
        "en": f"✅ Score saved: {score}\n\nGoal: 1400+\nGap: {gap} points\n\n{detail['en']}",
    }[language]


def _handle_faq_or_default(message: dict, db: Session | None) -> dict:
    chat_id = str(message.get("chat", {}).get("id", ""))
    text = str(message.get("text") or message.get("caption") or "").strip()
    lead = _lead_from_message(message, db)
    language = _lead_language(lead)
    faq_key = _match_faq_key(text)
    if faq_key:
        if lead is not None and db is not None:
            lead.faq_count = (lead.faq_count or 0) + 1
            lead.updated_at = datetime.utcnow()
            db.commit()
        reply_key = f"faq_{faq_key}"
        markup = _diagnostic_keyboard(language, "start_test", lead) if faq_key in {"diagnostic", "score", "university"} else None
        if faq_key == "price":
            markup = _pro_only_keyboard(language)
        _send_message(chat_id, _message(reply_key, language), reply_markup=markup)
        return {"ok": True, "faq": faq_key}

    _notify_admin_unknown_message(message, lead, text)
    _send_message(chat_id, _message("unknown_reply", language))
    return {"ok": True, "forwarded_to_admin": True}


def _match_faq_key(text: str) -> str | None:
    lowered = text.lower()
    for key, keywords in FAQ_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return key
    return None


def _notify_admin_unknown_message(message: dict, lead: TelegramAudience | None, text: str) -> None:
    settings = get_settings()
    if not settings.telegram_admin_chat_id:
        return
    from_user = message.get("from") or {}
    username = from_user.get("username") or (lead.username if lead else None)
    sender_name = clean_first_name(from_user.get("first_name") or (lead.first_name if lead else None))
    sender_line = sender_name + (f" (@{username})" if username else "")
    admin_text = (
        "SATTEST Welcome Bot question needs reply.\n\n"
        f"User: {sender_line}\n"
        f"Telegram ID: {from_user.get('id') or (lead.telegram_user_id if lead else 'unknown')}\n"
        f"Language: {_lead_language(lead).upper()}\n\n"
        f"Message:\n{text}"
    )
    _send_message(settings.telegram_admin_chat_id, admin_text)


def _send_payment_confirmed_message(chat_id: str, db: Session | None) -> None:
    language = "uz"
    if db is not None:
        lead = (
            db.execute(
                select(TelegramAudience).where(
                    (TelegramAudience.chat_id == str(chat_id)) | (TelegramAudience.telegram_user_id == str(chat_id))
                )
            )
            .scalars()
            .first()
        )
        language = _lead_language(lead) if lead else "uz"
    _send_message(str(chat_id), _message("payment_confirmed", language))


def _handle_payment_order_start(chat_id: str, reference: str, message: dict, db: Session | None) -> dict:
    if db is None:
        _send_message(chat_id, "Ma'lumotlar bazasi vaqtincha ulanmagan. Iltimos, birozdan keyin qayta urinib ko'ring.")
        return {"ok": True, "database": False}

    order = db.execute(select(PaymentOrder).where(PaymentOrder.reference == reference)).scalar_one_or_none()
    if not order:
        _send_message(chat_id, "Buyurtma topilmadi. Iltimos, SATTEST.UZ payment sahifasidan qayta urinib ko'ring.")
        return {"ok": True, "order_found": False}

    from_user = message.get("from", {})
    order.telegram_chat_id = chat_id
    order.telegram_username = from_user.get("username")
    if message.get("contact"):
      order.telegram_phone = message["contact"].get("phone_number")
    if order.status == "pending":
        order.status = "telegram_opened"
    db.commit()

    _send_message(
        chat_id,
        f"Salom! To'lov skrinshoting yubor 📸\n\n"
        f"Buyurtma raqami: {order.reference}\n"
        "Skrinshotni shu chatga yuboring. Founder tekshiradi va 5 daqiqa ichida Pro faollashtiriladi ✅",
        reply_markup=_payment_help_keyboard(),
    )
    return {"ok": True, "reference": order.reference}


def _latest_order_for_chat(db: Session, chat_id: str) -> PaymentOrder | None:
    return (
        db.execute(
            select(PaymentOrder)
            .where(
                PaymentOrder.telegram_chat_id == chat_id,
                PaymentOrder.status.in_(["pending", "telegram_opened", "screenshot_received"]),
            )
            .order_by(PaymentOrder.created_at.desc())
        )
        .scalars()
        .first()
    )


def _handle_payment_order_screenshot(order: PaymentOrder, message: dict, db: Session) -> dict:
    file_id = _receipt_file_id(message)
    from_user = message.get("from", {})
    order.screenshot_file_id = file_id
    order.telegram_username = from_user.get("username") or order.telegram_username
    if message.get("contact"):
        order.telegram_phone = message["contact"].get("phone_number")
    order.status = "screenshot_received"
    db.commit()

    _send_message(
        str(message.get("chat", {}).get("id", "")),
        f"Chek qabul qilindi ✅\nBuyurtma raqami: {order.reference}\n5 daqiqa ichida tekshiramiz.",
    )
    _notify_admin_for_payment_order(order, message, db)
    return {"ok": True, "reference": order.reference, "status": order.status}


def _receipt_file_id(message: dict) -> str | None:
    photos = message.get("photo") or []
    if photos:
        return photos[-1].get("file_id")
    document = message.get("document") or {}
    return document.get("file_id")


def _notify_admin_for_payment_order(order: PaymentOrder, message: dict, db: Session) -> None:
    settings = get_settings()
    if not settings.telegram_admin_chat_id:
        return

    user = db.get(User, order.user_id)
    from_user = message.get("from", {})
    username = from_user.get("username")
    sender_name = " ".join(part for part in [from_user.get("first_name"), from_user.get("last_name")] if part) or "Unknown"
    sender_line = f"{sender_name}" + (f" (@{username})" if username else "")
    phone = order.telegram_phone or "Not available"
    weak_areas = ", ".join(order.weak_areas or []) or "Not provided"
    amount = f"{int(order.amount or 0):,}".replace(",", " ")

    text = (
        "SATTEST.UZ payment waiting for approval.\n\n"
        f"Order: {order.reference}\n"
        f"Student: {user.full_name if user else 'Unknown'}\n"
        f"Email: {user.email if user else 'Unknown'}\n"
        f"Telegram: {sender_line}\n"
        f"Phone: {phone}\n"
        f"Plan: {_order_plan_label(order.subscription_type)}\n"
        f"Amount: {amount} {order.currency}\n"
        f"Estimated score: {order.estimated_score or 'n/a'}\n"
        f"Weak areas: {weak_areas}\n\n"
        "Tekshirib, tasdiqlang yoki rad eting."
    )
    keyboard = {
        "inline_keyboard": [
            [
                {"text": "✅ Tasdiqlash", "callback_data": f"payapprove:{order.reference}"},
                {"text": "❌ Rad etish", "callback_data": f"paydeny:{order.reference}"},
            ]
        ]
    }

    _copy_message(settings.telegram_admin_chat_id, message["chat"]["id"], message["message_id"])
    response = _send_message(settings.telegram_admin_chat_id, text, reply_markup=keyboard)
    message_id = (response.get("result") or {}).get("message_id")
    if message_id:
        order.admin_message_id = str(message_id)
        db.commit()


def _handle_payment_order_callback(callback_query: dict, action: str, reference: str, db: Session) -> dict:
    callback_id = callback_query.get("id")
    order = db.execute(select(PaymentOrder).where(PaymentOrder.reference == reference)).scalar_one_or_none()
    if not order:
        _answer_callback(callback_id, "Order not found.")
        return {"ok": True, "order_found": False}

    user = db.get(User, order.user_id)
    if not user:
        _answer_callback(callback_id, "User not found.")
        return {"ok": True, "user_found": False}

    if action == "paydeny":
        order.status = "rejected"
        order.rejection_reason = "Admin rejected payment screenshot"
        db.commit()
        _answer_callback(callback_id, "Payment rejected.")
        if order.telegram_chat_id:
            _send_message(
                order.telegram_chat_id,
                "Uzr, to'lovni tasdiqlay olmadik.\n"
                "Iltimos qayta urinib ko'ring yoki @FounderSATTESTUZ ga murojaat qiling",
            )
        _edit_admin_message(callback_query, f"REJECTED\n\nOrder: {order.reference}\nStudent: {user.full_name}\nEmail: {user.email}")
        return {"ok": True, "status": "rejected"}

    now = datetime.utcnow()
    days = ORDER_PLAN_DAYS.get(order.subscription_type, 30)
    expiry = now + timedelta(days=days)
    subscription = Subscription(
        user_id=user.id,
        plan="pro",
        status="active",
        provider="telegram_payment_order",
        provider_customer_id=order.telegram_chat_id,
        payer_full_name=user.full_name,
        payer_phone=order.telegram_phone,
        current_period_start=now,
        current_period_end=expiry,
        price_amount=order.amount,
        currency=order.currency,
    )
    order.status = "approved"
    order.activation_date = now
    order.expiry_date = expiry
    db.add(subscription)
    user.upgraded_to_pro = True
    user.upgraded_to_pro_at = user.upgraded_to_pro_at or now
    db.commit()

    _answer_callback(callback_id, "Pro activated.")
    if order.telegram_chat_id:
        _send_payment_confirmed_message(order.telegram_chat_id, db)
        _send_message(order.telegram_chat_id, _receipt_active_message(subscription, user), reply_markup=_receipt_active_keyboard(user))
    _edit_admin_message(
        callback_query,
        f"APPROVED\n\nOrder: {order.reference}\nStudent: {user.full_name}\nEmail: {user.email}\nExpires: {_format_subscription_date(expiry)}",
    )
    return {"ok": True, "status": "approved"}


def _order_plan_label(subscription_type: str) -> str:
    return "3 months" if subscription_type == "three_month" else "1 month"


def _handle_admin_report_command(chat_id: str, db: Session | None) -> dict:
    settings = get_settings()
    if settings.telegram_admin_chat_id and chat_id != str(settings.telegram_admin_chat_id):
        _send_message(chat_id, "Only Founder can request SATTEST.UZ Pro reports.")
        return {"ok": True, "ignored": True}
    if db is None:
        _send_message(chat_id, "Database is not connected, so the Pro report is unavailable.")
        return {"ok": True, "database": False}

    report = build_daily_pro_report(db)
    _send_message(chat_id, report)
    return {"ok": True, "report": True}


def _handle_activate_command(chat_id: str, text: str, db: Session | None) -> dict:
    settings = get_settings()
    if settings.telegram_admin_chat_id and chat_id != str(settings.telegram_admin_chat_id):
        _send_message(chat_id, "Only Founder can activate SATTEST.UZ Pro.")
        return {"ok": True, "ignored": True}
    if db is None:
        _send_message(chat_id, "Database is not connected, so activation is unavailable.")
        return {"ok": True, "database": False}

    _, _, raw_user_id = text.partition(" ")
    user_id = raw_user_id.strip()
    if not user_id:
        _send_message(chat_id, "Use /activate [telegram_user_id].")
        return {"ok": True, "activated": False}

    ok, message = activate_telegram_user(db, user_id)
    _send_message(chat_id, message)
    return {"ok": True, "activated": ok}


def _handle_remind_command(chat_id: str, db: Session | None) -> dict:
    settings = get_settings()
    if settings.telegram_admin_chat_id and chat_id != str(settings.telegram_admin_chat_id):
        _send_message(chat_id, "Only Founder can trigger SATTEST.UZ reminders.")
        return {"ok": True, "ignored": True}
    if db is None:
        _send_message(chat_id, "Database is not connected, so reminders are unavailable.")
        return {"ok": True, "database": False}

    result = process_welcome_followups(db, force=True)
    _send_message(
        chat_id,
        "Manual reminders sent:\n"
        f"24h: {result['followup1']}\n"
        f"72h: {result['followup2']}\n"
        f"7day Pro: {result['pro_reminder']}",
    )
    return {"ok": True, "reminders": result}


def _handle_stats_command(chat_id: str, db: Session | None) -> dict:
    settings = get_settings()
    if settings.telegram_admin_chat_id and chat_id != str(settings.telegram_admin_chat_id):
        _send_message(chat_id, "Only Founder can request SATTEST.UZ bot statistics.")
        return {"ok": True, "ignored": True}
    if db is None:
        _send_message(chat_id, "Database is not connected, so stats are unavailable.")
        return {"ok": True, "database": False}

    _send_message(chat_id, build_welcome_bot_stats(db))
    return {"ok": True, "stats": True}


def _handle_analyzer_stats_command(chat_id: str, db: Session | None) -> dict:
    settings = get_settings()
    if settings.telegram_admin_chat_id and chat_id != str(settings.telegram_admin_chat_id):
        _send_message(chat_id, "Only Founder can request Reading Analyzer statistics.")
        return {"ok": True, "ignored": True}
    if db is None:
        _send_message(chat_id, "Database is not connected, so analyzer stats are unavailable.")
        return {"ok": True, "database": False}

    _send_message(chat_id, build_analyzer_funnel_stats(db))
    return {"ok": True, "analyzer_stats": True}


def _handle_funnel_stats_command(chat_id: str, db: Session | None) -> dict:
    settings = get_settings()
    if settings.telegram_admin_chat_id and chat_id != str(settings.telegram_admin_chat_id):
        _send_message(chat_id, "Only Founder can request platform funnel statistics.")
        return {"ok": True, "ignored": True}
    if db is None:
        _send_message(chat_id, "Database is not connected, so funnel stats are unavailable.")
        return {"ok": True, "database": False}

    _send_message(chat_id, build_platform_funnel_stats(db))
    return {"ok": True, "funnel_stats": True}


def _handle_conversion_stats_command(chat_id: str, db: Session | None) -> dict:
    settings = get_settings()
    if settings.telegram_admin_chat_id and chat_id != str(settings.telegram_admin_chat_id):
        _send_message(chat_id, "Only Founder can request Pro conversion statistics.")
        return {"ok": True, "ignored": True}
    if db is None:
        _send_message(chat_id, "Database is not connected, so conversion stats are unavailable.")
        return {"ok": True, "database": False}

    _send_message(chat_id, build_conversion_stats(db))
    return {"ok": True, "conversion_stats": True}


def _pct(part: int, whole: int) -> str:
    return f"{round((part / whole) * 100, 1)}%" if whole else "0%"


def build_conversion_stats(db: Session) -> str:
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    users = db.execute(select(User).where(User.upgraded_to_pro_at >= month_start)).scalars().all()
    total = len(users)
    source_counts = {
        "diagnostic_lock": sum(1 for user in users if user.pro_conversion_source == "diagnostic_lock"),
        "analyzer_limit": sum(1 for user in users if user.pro_conversion_source == "analyzer_limit"),
        "path_type_lock": sum(1 for user in users if user.pro_conversion_source == "path_type_lock"),
        "mock_test_lock": sum(1 for user in users if user.pro_conversion_source == "mock_test_lock"),
    }

    return (
        "💰 PRO CONVERSIONS BU OY\n\n"
        f"Jami: {total}\n\n"
        "Manba bo'yicha:\n"
        f"- Diagnostic natija: {source_counts['diagnostic_lock']} ({_pct(source_counts['diagnostic_lock'], total)})\n"
        f"- Reading Analyzer: {source_counts['analyzer_limit']} ({_pct(source_counts['analyzer_limit'], total)})\n"
        f"- Path (savol turlari): {source_counts['path_type_lock']} ({_pct(source_counts['path_type_lock'], total)})\n"
        f"- Mock Test: {source_counts['mock_test_lock']} ({_pct(source_counts['mock_test_lock'], total)})"
    )


def build_platform_funnel_stats(db: Session) -> str:
    users = db.execute(select(User)).scalars().all()
    total = len(users)
    diagnostic_completed = sum(1 for user in users if user.diagnostic_completed or user.diagnostic_completed_at)
    first_lesson_completed = sum(1 for user in users if user.first_lesson_completed or user.first_lesson_completed_at)
    seven_day_streak = sum(1 for user in users if user.reached_7_day_streak or user.reached_7_day_streak_at or (user.longest_streak or 0) >= 7)
    first_mock_completed = sum(1 for user in users if user.first_mock_completed or user.first_mock_completed_at)
    upgraded_to_pro = sum(1 for user in users if user.upgraded_to_pro or user.upgraded_to_pro_at)
    source_counts = {
        "diagnostic_lock": sum(1 for user in users if user.pro_conversion_source == "diagnostic_lock"),
        "analyzer_limit": sum(1 for user in users if user.pro_conversion_source == "analyzer_limit"),
        "path_type_lock": sum(1 for user in users if user.pro_conversion_source == "path_type_lock"),
        "mock_test_lock": sum(1 for user in users if user.pro_conversion_source == "mock_test_lock"),
    }

    if upgraded_to_pro == 0:
        active_subscriptions = db.execute(
            select(func.count(Subscription.id)).where(
                Subscription.status == "active",
                or_(Subscription.current_period_end.is_(None), Subscription.current_period_end > datetime.utcnow()),
            )
        ).scalar() or 0
        upgraded_to_pro = int(active_subscriptions)

    return (
        "📊 PLATFORM FUNNEL\n\n"
        f"Signed up: {total}\n"
        f"→ Diagnostic completed: {diagnostic_completed} ({_pct(diagnostic_completed, total)})\n"
        f"→ First lesson completed: {first_lesson_completed} ({_pct(first_lesson_completed, total)})\n"
        f"→ Reached 7-day streak: {seven_day_streak} ({_pct(seven_day_streak, total)})\n"
        f"→ First mock completed: {first_mock_completed} ({_pct(first_mock_completed, total)})\n"
        f"→ Upgraded to Pro: {upgraded_to_pro} ({_pct(upgraded_to_pro, total)})\n\n"
        "Pro conversion source:\n"
        f"- From diagnostic lock: {source_counts['diagnostic_lock']}\n"
        f"- From analyzer limit: {source_counts['analyzer_limit']}\n"
        f"- From path node lock: {source_counts['path_type_lock']}\n"
        f"- From mock test lock: {source_counts['mock_test_lock']}"
    )


def _handle_broadcast_command(chat_id: str, text: str, db: Session | None) -> dict:
    settings = get_settings()
    if settings.telegram_admin_chat_id and chat_id != str(settings.telegram_admin_chat_id):
        _send_message(chat_id, "Only Founder can send SATTEST.UZ broadcasts.")
        return {"ok": True, "ignored": True}
    if db is None:
        _send_message(chat_id, "Database is not connected, so broadcast is unavailable.")
        return {"ok": True, "database": False}

    command, _, body = text.partition(" ")
    body = body.strip()
    if command == "/broadcast_all":
        versions = _parse_broadcast_versions(body)
        if not versions:
            _send_message(
                chat_id,
                "Use:\n/broadcast_all Uzbek message | Russian message | English message",
            )
            return {"ok": True, "broadcast": False}
        sent = _broadcast_all_languages(db, versions)
    else:
        language = command.removeprefix("/broadcast_")
        if language not in SUPPORTED_LANGUAGES or not body:
            _send_message(chat_id, "Use /broadcast_uz message, /broadcast_ru message, or /broadcast_en message.")
            return {"ok": True, "broadcast": False}
        sent = _broadcast_single_language(db, language, body)

    _send_message(chat_id, f"Broadcast sent: {sent}")
    return {"ok": True, "broadcast": True, "sent": sent}


def _handle_sendtip_command(chat_id: str, text: str, db: Session | None) -> dict:
    settings = get_settings()
    if settings.telegram_admin_chat_id and chat_id != str(settings.telegram_admin_chat_id):
        _send_message(chat_id, "Only Founder can send SATTEST.UZ daily tips.")
        return {"ok": True, "ignored": True}
    if db is None:
        _send_message(chat_id, "Database is not connected, so tips are unavailable.")
        return {"ok": True, "database": False}

    _, _, tip_text = text.partition(" ")
    tip_text = tip_text.strip()
    if not tip_text:
        _send_message(chat_id, "Use /sendtip [tip text].")
        return {"ok": True, "sent": 0}

    sent = send_daily_tip_to_subscribers(db, tip_text)
    _send_message(chat_id, f"Daily tip sent to {sent} subscribers.")
    return {"ok": True, "sent": sent}


def _handle_webinar_now_command(chat_id: str, db: Session | None) -> dict:
    settings = get_settings()
    if settings.telegram_admin_chat_id and chat_id != str(settings.telegram_admin_chat_id):
        _send_message(chat_id, "Only Founder can send webinar reminders.")
        return {"ok": True, "ignored": True}
    if db is None:
        _send_message(chat_id, "Database is not connected, so webinar reminders are unavailable.")
        return {"ok": True, "database": False}

    sent = send_webinar_reminders(db)
    _send_message(chat_id, f"Webinar reminder sent to {sent} subscribers.")
    return {"ok": True, "sent": sent}


def _handle_scores_command(chat_id: str, db: Session | None) -> dict:
    settings = get_settings()
    if settings.telegram_admin_chat_id and chat_id != str(settings.telegram_admin_chat_id):
        _send_message(chat_id, "Only Founder can view SATTEST.UZ scores.")
        return {"ok": True, "ignored": True}
    if db is None:
        _send_message(chat_id, "Database is not connected, so scores are unavailable.")
        return {"ok": True, "database": False}

    rows = (
        db.execute(
            select(TelegramAudience)
            .where(TelegramAudience.current_score.is_not(None))
            .order_by(TelegramAudience.score_updated_date.desc().nullslast())
            .limit(80)
        )
        .scalars()
        .all()
    )
    lines = []
    for lead in rows:
        label = f"@{lead.username}" if lead.username else clean_first_name(lead.first_name or lead.telegram_user_id)
        lines.append(f"{label}: {lead.current_score}")
    _send_message(chat_id, "📊 USER SCORES:\n" + ("\n".join(lines) if lines else "No scores yet."))
    return {"ok": True, "scores": len(lines)}


def _notify_admin_for_approval(subscription: Subscription, user: User, message: dict) -> None:
    settings = get_settings()
    if not settings.telegram_admin_chat_id:
        return

    from_user = message.get("from", {})
    sender = " ".join(part for part in [from_user.get("first_name"), from_user.get("last_name")] if part)
    username = from_user.get("username")
    sender_line = sender or "Unknown Telegram user"
    if username:
        sender_line += f" (@{username})"

    text = (
        "New SATTEST.UZ payment receipt needs approval.\n\n"
        f"{_subscription_summary(subscription, user)}\n"
        f"Telegram sender: {sender_line}\n\n"
        "Approve only after checking the receipt screenshot above."
    )
    keyboard = {
        "inline_keyboard": [
            [
                {"text": "Approve access", "callback_data": f"approve:{subscription.id}"},
                {"text": "Deny", "callback_data": f"deny:{subscription.id}"},
            ]
        ]
    }

    _copy_message(settings.telegram_admin_chat_id, message["chat"]["id"], message["message_id"])
    _send_message(settings.telegram_admin_chat_id, text, reply_markup=keyboard)


def _notify_admin_for_auto_activation(subscription: Subscription, user: User, message: dict) -> None:
    settings = get_settings()
    if not settings.telegram_admin_chat_id:
        return

    from_user = message.get("from", {})
    sender = " ".join(part for part in [from_user.get("first_name"), from_user.get("last_name")] if part)
    username = from_user.get("username")
    sender_line = sender or "Unknown Telegram user"
    if username:
        sender_line += f" (@{username})"

    text = (
        "SATTEST.UZ Pro was auto-activated from a Telegram receipt.\n\n"
        f"{_subscription_summary(subscription, user)}\n"
        f"Telegram sender: {sender_line}\n\n"
        "No Founder approval was required. The copied receipt is attached above for records.\n\n"
        "Fraud control: if this payment is not visible in Paynet/payment records, press Revoke Pro."
    )
    keyboard = {
        "inline_keyboard": [
            [
                {"text": "Revoke Pro - payment not found", "callback_data": f"revoke:{subscription.id}"},
            ]
        ]
    }

    _copy_message(settings.telegram_admin_chat_id, message["chat"]["id"], message["message_id"])
    _send_message(settings.telegram_admin_chat_id, text, reply_markup=keyboard)


def _notify_admin_for_manual_approval(email: str, plan: str, message: dict) -> None:
    settings = get_settings()
    if not settings.telegram_admin_chat_id:
        return

    from_user = message.get("from", {})
    sender = " ".join(part for part in [from_user.get("first_name"), from_user.get("last_name")] if part)
    username = from_user.get("username")
    sender_line = sender or "Unknown Telegram user"
    if username:
        sender_line += f" (@{username})"

    price = f"{PLAN_PRICES[plan]:,}".replace(",", " ")
    text = (
        "New SATTEST.UZ payment receipt received.\n\n"
        f"Email: {email}\n"
        f"Plan: {plan.upper()}\n"
        f"Amount: {price} UZS\n"
        f"Telegram sender: {sender_line}\n\n"
        "Action needed: verify the payment, then activate Pro access for this email.\n\n"
        "Automatic website activation is paused because this bot service is not connected to the live platform database yet."
    )

    _copy_message(settings.telegram_admin_chat_id, message["chat"]["id"], message["message_id"])
    _send_message(settings.telegram_admin_chat_id, text)


def notify_admin_diagnostic_result(
    *,
    timestamp: str,
    estimated_score: int,
    weak_areas: list[str],
    language: str,
) -> dict:
    settings = get_settings()
    if not settings.telegram_admin_chat_id:
        return {"ok": False, "skipped": "telegram_admin_chat_id_missing"}

    cleaned_weak_areas = [area.strip() for area in weak_areas if area.strip()]
    weak_area_line = ", ".join(cleaned_weak_areas) if cleaned_weak_areas else "No weak areas detected"
    text = (
        "SATTEST.UZ free diagnostic completed\n\n"
        f"Timestamp: {timestamp}\n"
        f"Estimated score: ≈{estimated_score}\n"
        f"Weak areas: {weak_area_line}\n"
        f"Language: {language.upper()}"
    )
    response = _send_message(settings.telegram_admin_chat_id, text)
    return {"ok": bool(response.get("ok", True)), "telegram": response}


async def notify_diagnostic_user_result(
    *,
    user_telegram_id: str,
    estimated_score: int,
    weak_areas: list[str],
    language: str,
    db: Session | None = None,
) -> dict:
    return await notify_bot_after_test(
        user_telegram_id=user_telegram_id,
        score=estimated_score,
        weak_areas=weak_areas,
        language=language,
        db=db,
    )


def notify_admin_full_mock_result(
    *,
    timestamp: str,
    total_score: int,
    rw_score: int,
    math_score: int,
    weak_areas: list[str],
    language: str,
) -> dict:
    settings = get_settings()
    if not settings.telegram_admin_chat_id:
        return {"ok": False, "skipped": "telegram_admin_chat_id_missing"}

    cleaned_weak_areas = [area.strip() for area in weak_areas if area.strip()]
    weak_area_line = ", ".join(cleaned_weak_areas) if cleaned_weak_areas else "No weak areas detected"
    text = (
        "Full Mock Test Completed\n\n"
        f"Score: {total_score} (R&W: {rw_score} · Math: {math_score})\n"
        f"Weak areas: {weak_area_line}\n"
        f"Language: {language.upper()}\n"
        f"Time: {timestamp}"
    )
    response = _send_message(settings.telegram_admin_chat_id, text)
    return {"ok": bool(response.get("ok", True)), "telegram": response}


def _subscription_summary(subscription: Subscription, user: User | None) -> str:
    email = user.email if user else "Unknown email"
    full_name = user.full_name if user else "Unknown user"
    price = f"{int(subscription.price_amount or 0):,}".replace(",", " ")
    start = _format_subscription_date(subscription.current_period_start)
    end = _format_subscription_date(subscription.current_period_end)
    return (
        f"Student: {full_name}\n"
        f"Email: {email}\n"
        f"Payer full name: {subscription.payer_full_name or 'Not provided'}\n"
        f"Phone: {subscription.payer_phone or 'Not provided'}\n"
        f"Plan: {subscription.plan.upper()}\n"
        f"Amount: {price} {subscription.currency}\n"
        f"Start: {start}\n"
        f"End: {end}\n"
        f"Renewal reminders: {subscription.renewal_reminders_sent}/3\n"
        f"Subscription ID: {subscription.id}"
    )


def process_subscription_maintenance(db: Session, *, send_daily_report: bool = False) -> dict:
    now = datetime.utcnow()
    today_tashkent = _as_tashkent(now).date()
    active_subscriptions = (
        db.execute(
            select(Subscription, User)
            .join(User, Subscription.user_id == User.id)
            .where(Subscription.status == "active")
            .where(Subscription.current_period_end.is_not(None))
            .where(Subscription.provider_customer_id.is_not(None))
        )
        .all()
    )
    reminders_sent = 0
    expired_count = 0

    for subscription, user in active_subscriptions:
        if not subscription.current_period_end:
            continue

        if subscription.current_period_end <= now:
            subscription.status = "expired"
            subscription.canceled_at = now
            expired_count += 1
            _send_message(
                subscription.provider_customer_id,
                EXPIRED_MESSAGE.format(end_date=_format_subscription_date(subscription.current_period_end)),
            )
            continue

        seconds_left = (subscription.current_period_end - now).total_seconds()
        should_remind = seconds_left <= 3 * 24 * 60 * 60
        already_reminded_today = (
            subscription.last_renewal_reminder_at is not None
            and _as_tashkent(subscription.last_renewal_reminder_at).date() == today_tashkent
        )

        if should_remind and subscription.renewal_reminders_sent < 3 and not already_reminded_today:
            subscription.renewal_reminders_sent += 1
            subscription.last_renewal_reminder_at = now
            reminders_sent += 1
            _send_message(
                subscription.provider_customer_id,
                RENEWAL_REMINDER_MESSAGE.format(
                    count=subscription.renewal_reminders_sent,
                    end_date=_format_subscription_date(subscription.current_period_end),
                ),
            )

    db.commit()

    if send_daily_report:
        settings = get_settings()
        if settings.telegram_admin_chat_id:
            _send_message(settings.telegram_admin_chat_id, build_daily_pro_report(db))

    welcome_followups = process_welcome_followups(db)
    return {"reminders_sent": reminders_sent, "expired": expired_count, "welcome_followups": welcome_followups}


def send_webinar_reminders(db: Session) -> int:
    sent = 0
    leads = (
        db.execute(
            select(TelegramAudience).where(
                TelegramAudience.webinar_reminder.is_(True),
                TelegramAudience.bot_blocked.is_(False),
            )
        )
        .scalars()
        .all()
    )
    for lead in leads:
        language = _lead_language(lead)
        response = _send_message(lead.chat_id, _message("webinar_reminder", language))
        if response.get("ok", True):
            sent += 1
    return sent


def send_streak_reminders(db: Session) -> int:
    today = datetime.now(TASHKENT_TZ).date()
    users = (
        db.execute(
            select(User)
            .where(User.current_streak > 0)
            .where(or_(User.last_lesson_date.is_(None), User.last_lesson_date < today))
        )
        .scalars()
        .all()
    )
    sent = 0
    for user in users:
        order = (
            db.execute(
                select(PaymentOrder)
                .where(PaymentOrder.email == user.email)
                .where(PaymentOrder.telegram_chat_id.is_not(None))
                .order_by(PaymentOrder.created_at.desc())
            )
            .scalars()
            .first()
        )
        if not order or not order.telegram_chat_id:
            continue
        response = _send_message(
            str(order.telegram_chat_id),
            (
                "Salom! 👋\n"
                "Bugun hali darsni tugatmadingiz.\n"
                f"{user.current_streak} kunlik streak'ingizni saqlab qoling! 🔥"
            ),
            reply_markup={"inline_keyboard": [[{"text": "Davom etish →", "url": _public_link("/path")}]]},
        )
        if response.get("ok", True):
            sent += 1
    return sent


def send_daily_tip_to_subscribers(db: Session, tip_text: str) -> int:
    sent = 0
    leads = (
        db.execute(
            select(TelegramAudience).where(
                TelegramAudience.daily_tips.is_(True),
                TelegramAudience.bot_blocked.is_(False),
            )
        )
        .scalars()
        .all()
    )
    for lead in leads:
        response = _send_message(lead.chat_id, tip_text)
        if response.get("ok", True):
            sent += 1
    return sent


def build_daily_pro_report(db: Session) -> str:
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    active_count = db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.status == "active",
            or_(Subscription.current_period_end.is_(None), Subscription.current_period_end > now),
        )
    ).scalar_one()
    activated_today = db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.status == "active",
            Subscription.current_period_start >= today_start,
        )
    ).scalar_one()
    expiring_three_days = db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.status == "active",
            Subscription.current_period_end.is_not(None),
            Subscription.current_period_end > now,
            Subscription.current_period_end <= now + timedelta(days=3),
        )
    ).scalar_one()
    expired_today = db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.status.in_(["expired", "revoked", "denied"]),
            Subscription.canceled_at >= today_start,
        )
    ).scalar_one()

    latest_rows = (
        db.execute(
            select(Subscription, User)
            .join(User, Subscription.user_id == User.id)
            .where(Subscription.status == "active")
            .order_by(Subscription.current_period_start.desc().nullslast(), Subscription.created_at.desc())
            .limit(8)
        )
        .all()
    )
    latest_lines = [
        f"- {user.full_name} | {user.email} | ends {_format_subscription_date(subscription.current_period_end)}"
        for subscription, user in latest_rows
    ]

    return (
        "SATTEST.UZ Pro daily report\n\n"
        f"Active Pro users now: {active_count}\n"
        f"Activated today: {activated_today}\n"
        f"Ending in 3 days: {expiring_three_days}\n"
        f"Expired/revoked today: {expired_today}\n\n"
        "Latest active Pro users:\n"
        f"{chr(10).join(latest_lines) if latest_lines else '- No active users yet'}"
    )


def process_welcome_followups(db: Session, *, force: bool = False) -> dict:
    now = datetime.utcnow()
    leads = db.execute(select(TelegramAudience)).scalars().all()
    sent = {"followup1": 0, "followup2": 0, "pro_reminder": 0}

    for lead in leads:
        has_taken_action = bool(lead.link_clicked_at or lead.test_completed)
        has_pro = bool(lead.pro_activated or _lead_has_active_pro(db, lead))
        created_at = lead.created_at or now
        age = now - created_at
        language = _lead_language(lead)
        first_name = clean_first_name(lead.first_name or lead.username)

        if (force or age >= timedelta(hours=24)) and not lead.followup_24h_sent_at and not has_taken_action:
            response = _send_message(
                lead.chat_id,
                _message("followup1", language, first_name=first_name),
                reply_markup=_goal_keyboard(),
            )
            if response.get("ok", True):
                lead.followup_24h_sent_at = now
                sent["followup1"] += 1

        if (force or age >= timedelta(hours=72)) and not lead.followup_72h_sent_at and not has_taken_action:
            response = _send_message(
                lead.chat_id,
                _message("followup2", language, first_name=first_name),
                reply_markup=_diagnostic_keyboard(language, "start_now_free", lead),
            )
            if response.get("ok", True):
                lead.followup_72h_sent_at = now
                sent["followup2"] += 1

        if (force or age >= timedelta(days=7)) and not lead.pro_reminder_sent_at and not has_pro:
            response = _send_message(
                lead.chat_id,
                _message("pro_reminder", language, first_name=first_name),
                reply_markup=_pro_reminder_keyboard(language),
            )
            if response.get("ok", True):
                lead.pro_reminder_sent_at = now
                sent["pro_reminder"] += 1

    db.commit()
    return sent


def _lead_has_active_pro(db: Session, lead: TelegramAudience) -> bool:
    now = datetime.utcnow()
    return bool(
        db.execute(
            select(Subscription.id)
            .where(Subscription.provider_customer_id == lead.chat_id)
            .where(Subscription.status == "active")
            .where(or_(Subscription.current_period_end.is_(None), Subscription.current_period_end > now))
        ).first()
    )


def build_welcome_bot_stats(db: Session) -> str:
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)
    leads = db.execute(select(TelegramAudience)).scalars().all()
    total = len(leads)
    language_counts = {language: 0 for language in SUPPORTED_LANGUAGES}
    for lead in leads:
        language_counts[_lead_language(lead)] += 1

    welcome_sent = sum(1 for lead in leads if lead.welcome_sent_at)
    link_clicked = sum(1 for lead in leads if lead.link_clicked_at or lead.target_score)
    today = sum(1 for lead in leads if lead.created_at and lead.created_at >= today_start)
    week = sum(1 for lead in leads if lead.created_at and lead.created_at >= week_start)
    month = sum(1 for lead in leads if lead.created_at and lead.created_at >= month_start)
    tests_taken = sum(1 for lead in leads if lead.test_completed) or db.execute(
        select(func.count(TestAttempt.id)).where(TestAttempt.completed_at.is_not(None))
    ).scalar_one()
    pro_taken = db.execute(
        select(func.count(Subscription.id)).where(
            Subscription.status == "active",
            or_(Subscription.current_period_end.is_(None), Subscription.current_period_end > now),
        )
    ).scalar_one()
    bot_pro_taken = sum(1 for lead in leads if lead.pro_activated)
    pro_total = max(pro_taken, bot_pro_taken)
    revenue = int(pro_total) * MONTHLY_PRICE
    webinar_count = sum(1 for lead in leads if lead.webinar_reminder)
    tips_count = sum(1 for lead in leads if lead.daily_tips)
    scores_count = sum(1 for lead in leads if lead.current_score is not None)

    return (
        "📊 BOT STATISTICS\n\n"
        f"👥 Total users: {total}\n"
        f"🇺🇿 Uzbek: {language_counts['uz']}\n"
        f"🇷🇺 Russian: {language_counts['ru']}\n"
        f"🇬🇧 English: {language_counts['en']}\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "FUNNEL:\n"
        f"✅ Welcome sent: {welcome_sent}\n"
        f"🔗 Clicked link: {link_clicked}\n"
        f"🧪 Took test: {tests_taken}\n"
        f"💰 Bought Pro: {pro_total}\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "FEATURES:\n"
        f"🔔 Webinar reminders: {webinar_count}\n"
        f"💡 Tips subscribers: {tips_count}\n"
        f"📊 Scores tracked: {scores_count}\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        f"TODAY: {today}\n"
        f"THIS WEEK: {week}\n"
        f"THIS MONTH: {month}\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "💵 REVENUE:\n"
        f"{pro_total} × 300,000 = {revenue:,} UZS"
    )


def _broadcast_single_language(db: Session, language: str, text: str) -> int:
    sent = 0
    for lead in db.execute(select(TelegramAudience)).scalars().all():
        if _lead_language(lead) != language:
            continue
        _send_message(lead.chat_id, text)
        sent += 1
    return sent


def _broadcast_all_languages(db: Session, versions: dict[str, str]) -> int:
    sent = 0
    for lead in db.execute(select(TelegramAudience)).scalars().all():
        language = _lead_language(lead)
        _send_message(lead.chat_id, versions[language])
        sent += 1
    return sent


def _parse_broadcast_versions(text: str) -> dict[str, str] | None:
    if "|" in text:
        parts = [part.strip() for part in text.split("|", 2)]
        if len(parts) == 3 and all(parts):
            return {"uz": parts[0], "ru": parts[1], "en": parts[2]}

    matches = list(re.finditer(r"(?im)^\s*(UZ|RU|EN)\s*:\s*", text))
    if len(matches) < 3:
        return None
    versions: dict[str, str] = {}
    for index, match in enumerate(matches):
        key = match.group(1).lower()
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        value = text[start:end].strip()
        if value:
            versions[key] = value
    return versions if all(language in versions for language in SUPPORTED_LANGUAGES) else None


def _public_frontend_url() -> str:
    frontend_url = get_settings().frontend_url.rstrip("/")
    if "localhost" in frontend_url or "127.0.0.1" in frontend_url:
        return "https://www.sattest.uz"
    return frontend_url


def _detect_language(language_code: str | None) -> str | None:
    if not language_code:
        return None
    lowered = language_code.lower()
    if lowered.startswith("uz"):
        return "uz"
    if lowered.startswith("ru"):
        return "ru"
    if lowered.startswith("en"):
        return "en"
    return "en"


def _lead_language(lead: TelegramAudience | None) -> str:
    if not lead:
        return "en"
    language = lead.chosen_language or lead.detected_language or "en"
    return language if language in SUPPORTED_LANGUAGES else "en"


def _welcome_languages(lead: TelegramAudience) -> list[str]:
    if lead.chosen_language in SUPPORTED_LANGUAGES:
        return [lead.chosen_language]
    if lead.detected_language in SUPPORTED_LANGUAGES:
        return [lead.detected_language]
    if lead.detected_language == "unknown":
        return list(SUPPORTED_LANGUAGES)
    return ["en"]


def _message(key: str, language: str, **values: str) -> str:
    language = language if language in SUPPORTED_LANGUAGES else "en"
    template = MESSAGES[key].get(language) or MESSAGES[key]["en"]
    return template.format(**values)


def _button(key: str, language: str) -> str:
    language = language if language in SUPPORTED_LANGUAGES else "en"
    return BUTTONS[key].get(language) or BUTTONS[key]["en"]


def _percent(part: int | float, total: int | float) -> int:
    return round((float(part) / float(total)) * 100) if total else 0


def _diagnostic_url(lead: TelegramAudience | None = None) -> str:
    query = "utm_source=bot"
    if lead and lead.telegram_user_id:
        query += f"&tg={parse.quote(lead.telegram_user_id)}"
    return _public_link(f"/diagnostic?{query}")


def _pricing_url() -> str:
    return "https://www.sattest.uz/pricing?lang=en"


def _diagnostic_keyboard(language: str, button_key: str, lead: TelegramAudience | None = None) -> dict:
    return {
        "inline_keyboard": [
            [{"text": _button(button_key, language), "url": _diagnostic_url(lead)}],
        ]
    }


def _language_keyboard() -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": LANGUAGE_BUTTONS["uz"], "callback_data": "lang:uz"},
                {"text": LANGUAGE_BUTTONS["ru"], "callback_data": "lang:ru"},
                {"text": LANGUAGE_BUTTONS["en"], "callback_data": "lang:en"},
            ]
        ]
    }


def _goal_keyboard() -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": _button("goal_1000", "uz"), "callback_data": "goal:1000-1100"},
                {"text": _button("goal_1200", "uz"), "callback_data": "goal:1200-1300"},
                {"text": _button("goal_1400", "uz"), "callback_data": "goal:1400+"},
            ]
        ]
    }


def _pro_reminder_keyboard(language: str) -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": _button("get_pro", language), "url": _pricing_url()},
                {"text": _button("have_question", language), "url": "https://t.me/FounderSATTESTUZ"},
            ]
        ]
    }


def _pro_only_keyboard(language: str) -> dict:
    return {
        "inline_keyboard": [
            [{"text": _button("get_pro", language), "url": _pricing_url()}],
            [{"text": _button("have_question", language), "url": "https://t.me/FounderSATTESTUZ"}],
        ]
    }


def _webinar_keyboard(language: str) -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": _button("webinar_yes", language), "callback_data": "webinar:yes"},
                {"text": _button("webinar_no", language), "callback_data": "webinar:no"},
            ]
        ]
    }


def _tips_keyboard(language: str) -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": _button("tips_yes", language), "callback_data": "tips:yes"},
                {"text": _button("tips_no", language), "callback_data": "tips:no"},
            ]
        ]
    }


def _quick_menu_keyboard(language: str, lead: TelegramAudience | None = None) -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": _button("start_test", language), "url": _diagnostic_url(lead)},
                {"text": _button("get_pro", language), "url": _pricing_url()},
            ],
            [
                {"text": "📅 Webinar", "callback_data": "webinar:yes"},
                {"text": "💡 SAT Tips", "callback_data": "tips:yes"},
            ],
            [
                {"text": _button("have_question", language), "url": "https://t.me/FounderSATTESTUZ"},
            ],
        ]
    }


def _pro_login_link(email: str | None, next_path: str) -> str:
    base = _public_frontend_url()
    if not email:
        return f"{base}{next_path}"
    query = parse.urlencode({"email": email, "next": next_path})
    return f"{base}/login?{query}"


def _mock_result_next_path() -> str:
    return "/mock-test/full/results?unlocked=true"


def _mock_result_link(user: User | None = None) -> str:
    return _pro_login_link(user.email if user else None, _mock_result_next_path())


def _platform_link(user: User | None, next_path: str) -> str:
    return _pro_login_link(user.email if user else None, next_path)


def _public_link(path: str) -> str:
    return f"{_public_frontend_url()}{path}"


def _payment_help_keyboard() -> dict:
    return {
        "inline_keyboard": [
            [
                {"text": "Create account", "url": _public_link("/register")},
                {"text": "Login", "url": _public_link("/login")},
            ],
            [
                {"text": "Pricing / QR", "url": _public_link("/pricing?plan=pro")},
                {"text": "Support", "url": "https://t.me/FounderSATTESTUZ"},
            ],
            [
                {"text": "Open SATTEST.UZ", "url": _public_link("/")},
            ],
        ]
    }


def _receipt_active_keyboard(user: User | None = None) -> dict:
    return {
        "inline_keyboard": [
            [
                {
                    "text": "Open my mock result",
                    "url": _mock_result_link(user),
                }
            ],
            [
                {
                    "text": "My 1400+ route",
                    "url": _platform_link(user, "/my-1400"),
                },
                {
                    "text": "Practice",
                    "url": _platform_link(user, "/practice"),
                },
            ],
            [
                {
                    "text": "Full SAT Mock",
                    "url": _platform_link(user, "/sat-mock"),
                },
                {
                    "text": "Dashboard",
                    "url": _platform_link(user, "/dashboard"),
                },
            ],
            [
                {
                    "text": "Support",
                    "url": "https://t.me/FounderSATTESTUZ",
                },
                {
                    "text": "Channel @sattestuz",
                    "url": "https://t.me/sattestuz",
                },
            ],
        ]
    }


def _receipt_active_message(subscription: Subscription, user: User | None = None) -> str:
    start = _format_subscription_date(subscription.current_period_start)
    end = _format_subscription_date(subscription.current_period_end)
    result_link = _mock_result_link(user)
    return (
        "EN: Receipt received. SATTEST.UZ Pro was activated instantly by the bot.\n"
        f"Start day: {start}\n"
        f"End day: {end}\n"
        f"Open your paid mock result: {result_link}\n"
        "Use the buttons below to return to your result, My 1400+, practice, dashboard, and full mock test.\n\n"
        "RU: Чек получен. SATTEST.UZ Pro был мгновенно активирован ботом.\n"
        f"Дата начала: {start}\n"
        f"Дата окончания: {end}\n"
        f"Открыть оплаченный mock результат: {result_link}\n"
        "Используйте кнопки ниже, чтобы вернуться к результату, My 1400+, практике, dashboard и полному mock test.\n\n"
        "UZ: Chek qabul qilindi. SATTEST.UZ Pro bot orqali darhol faollashtirildi.\n"
        f"Boshlanish kuni: {start}\n"
        f"Tugash kuni: {end}\n"
        f"To'langan mock natijangizni oching: {result_link}\n"
        "Pastdagi tugmalar orqali natija, My 1400+, practice, dashboard va full mock testga tez qaytishingiz mumkin.\n"
        "Kanalimizga qo'shiling: @sattestuz — har kuni foydali materiallar\n\n"
        f"{PAYMENT_WARNING_TEXT}"
    )


def _format_subscription_date(value: datetime | None) -> str:
    if not value:
        return "Not set"
    return _as_tashkent(value).strftime("%Y-%m-%d %H:%M UZT")


def _as_tashkent(value: datetime) -> datetime:
    aware = value.replace(tzinfo=ZoneInfo("UTC")) if value.tzinfo is None else value
    return aware.astimezone(TASHKENT_TZ)


def _extract_email(text: str) -> str | None:
    line_match = EMAIL_LINE_RE.search(text)
    if line_match:
        return line_match.group(1).lower()
    match = EMAIL_RE.search(text)
    return match.group(0).lower() if match else None


def _extract_phone(text: str) -> str | None:
    line_match = PHONE_LINE_RE.search(text)
    candidate = line_match.group(1) if line_match else text
    match = PHONE_RE.search(candidate)
    if not match:
        return None
    digits = re.sub(r"\D", "", match.group(0))
    if len(digits) == 9:
        digits = f"998{digits}"
    if len(digits) != 12 or not digits.startswith("998"):
        return None
    return f"+{digits}"


def _extract_full_name(text: str) -> str | None:
    match = NAME_LINE_RE.search(text)
    if match:
        name = match.group(1)
    else:
        name = _extract_plain_full_name(text)
    if not name:
        return None
    name = re.sub(r"\s+", " ", name).strip(" :-–—,;")
    if len(name.split()) < 2 or len(name) > 120:
        return None
    return name


def _extract_plain_full_name(text: str) -> str | None:
    email = _extract_email(text)
    phone = _extract_phone(text)
    phone_digits = re.sub(r"\D", "", phone or "")

    for raw_line in text.splitlines():
        line = CAPTION_LABEL_RE.sub("", raw_line).strip()
        if not line:
            continue
        if email and email.lower() in line.lower():
            continue
        if phone_digits and phone_digits in re.sub(r"\D", "", line):
            continue
        if _looks_like_plan_only(line):
            continue
        candidate = _remove_contact_tokens(line).strip(" :-–—,;")
        if _looks_like_full_name(candidate):
            return candidate

    compact = _remove_contact_tokens(text)
    compact_lines = []
    for raw_line in compact.splitlines():
        line = CAPTION_LABEL_RE.sub("", raw_line).strip(" :-–—,;")
        if not line or _looks_like_plan_only(line):
            continue
        compact_lines.append(line)

    if compact_lines:
        candidate = " ".join(compact_lines)
        if _looks_like_full_name(candidate):
            return candidate

    return None


def _remove_contact_tokens(text: str) -> str:
    text = EMAIL_RE.sub(" ", text)
    text = PHONE_RE.sub(" ", text)
    text = PLAN_LINE_RE.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def _looks_like_plan_only(text: str) -> bool:
    cleaned = CAPTION_LABEL_RE.sub("", text).strip().lower()
    cleaned = re.sub(r"[^a-zа-яё' ]+", "", cleaned)
    return cleaned in PLAN_ALIASES or cleaned in {"pro", "про", "тариф pro", "tarif pro", "reja pro"}


def _looks_like_full_name(text: str) -> bool:
    if not text:
        return False
    if EMAIL_RE.search(text) or PHONE_RE.search(text):
        return False
    words = [word for word in re.split(r"\s+", text.strip()) if word]
    if len(words) < 2 or len(text) > 120:
        return False
    return any(any(ch.isalpha() for ch in word) for word in words)


def _extract_receipt_payload(text: str) -> dict:
    return {
        "email": _extract_email(text),
        "phone": _extract_phone(text),
        "full_name": _extract_full_name(text),
        "plan": _extract_plan(text),
    }


def _extract_plan(text: str) -> str:
    line_match = PLAN_LINE_RE.search(text)
    if line_match:
        lowered = line_match.group(1).strip().lower()
        for alias, plan in PLAN_ALIASES.items():
            if alias in lowered:
                return plan
    lowered = text.lower()
    for alias, plan in PLAN_ALIASES.items():
        if alias in lowered:
            return plan
    return "pro"


def _telegram_api(method: str, payload: dict) -> dict:
    settings = get_settings()
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=500, detail="Telegram bot token is not configured")

    api_request = request.Request(
        f"https://api.telegram.org/bot{settings.telegram_bot_token}/{method}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "SATTEST.UZ/1.0"},
        method="POST",
    )

    try:
        with request.urlopen(api_request, timeout=12) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        print(f"Telegram API failed: method={method} status={exc.code} body={body}")
        return {"ok": False, "error": body}
    except OSError as exc:
        print(f"Telegram API failed: method={method} error={exc}")
        return {"ok": False, "error": str(exc)}


def telegram_get_me() -> dict:
    return _telegram_api("getMe", {})


def telegram_get_webhook_info() -> dict:
    return _telegram_api("getWebhookInfo", {})


def telegram_set_webhook(webhook_url: str, secret_token: str) -> dict:
    return _telegram_api(
        "setWebhook",
        {
            "url": webhook_url,
            "secret_token": secret_token,
            "allowed_updates": ["message", "callback_query", "chat_member"],
        },
    )


def _send_message(chat_id: str, text: str, reply_markup: dict | None = None) -> dict:
    payload: dict = {"chat_id": chat_id, "text": text}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return _telegram_api("sendMessage", payload)


def _copy_message(chat_id: str, from_chat_id: str, message_id: int) -> dict:
    return _telegram_api("copyMessage", {"chat_id": chat_id, "from_chat_id": from_chat_id, "message_id": message_id})


def _answer_callback(callback_query_id: str | None, text: str) -> dict:
    if not callback_query_id:
        return {"ok": False}
    return _telegram_api("answerCallbackQuery", {"callback_query_id": callback_query_id, "text": text})


def _edit_admin_message(callback_query: dict, text: str) -> dict:
    message = callback_query.get("message") or {}
    chat_id = message.get("chat", {}).get("id")
    message_id = message.get("message_id")
    if not chat_id or not message_id:
        return {"ok": False}
    return _telegram_api("editMessageText", {"chat_id": chat_id, "message_id": message_id, "text": text})
