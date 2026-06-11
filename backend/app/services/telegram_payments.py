from __future__ import annotations

from datetime import datetime, timedelta
import json
import re
from urllib import error, request
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import Subscription, User

PLAN_ALIASES = {
    "pro": "pro",
    "platform": "pro",
    "sattest pro": "pro",
    "sat platform pro": "pro",
}

PLAN_PRICES = {
    "pro": 200000,
}

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE_RE = re.compile(r"(?:\+?998|998)?[\s\-.]?\d{2}[\s\-.]?\d{3}[\s\-.]?\d{2}[\s\-.]?\d{2}")
NAME_LINE_RE = re.compile(r"(?im)^\s*(?:full\s*name|name|fio|фио|имя|ism|to'liq\s*ism|toliq\s*ism)\s*[:\-]\s*(.+?)\s*$")
PHONE_LINE_RE = re.compile(r"(?im)^\s*(?:phone|telephone|tel|телефон|nomer|raqam)\s*[:\-]\s*(.+?)\s*$")
EMAIL_LINE_RE = re.compile(r"(?im)^\s*(?:email|e-mail|почта)\s*[:\-]\s*([\w.+-]+@[\w-]+(?:\.[\w-]+)+)\s*$")
TASHKENT_TZ = ZoneInfo("Asia/Tashkent")

PAYMENT_WARNING_TEXT = (
    "Warning: Fake receipt leads to account ban. If the payment is not found in Paynet/payment records, Pro access can be revoked immediately.\n\n"
    "Предупреждение: поддельный чек приводит к блокировке аккаунта. Если платеж не найден в Paynet/платежных записях, Pro-доступ может быть немедленно отозван.\n\n"
    "Ogohlantirish: soxta chek akkaunt bloklanishiga olib keladi. Agar to'lov Paynet/to'lov yozuvlarida topilmasa, Pro kirish darhol bekor qilinishi mumkin."
)

START_MESSAGE = (
    "EN: To activate SATTEST.UZ Pro, send your payment screenshot or PDF with this caption:\n"
    "Full name: Your full name\n"
    "Phone: +998901234567\n"
    "Email: your-email@example.com\n"
    "Plan: pro\n\n"
    "You can pay by Click, Payme, Paynet, bank card, or transfer. After you send the receipt with your registered email, the bot activates Pro automatically.\n\n"
    "RU: Чтобы активировать SATTEST.UZ Pro, отправьте скриншот или PDF-чек с подписью:\n"
    "ФИО: Ваше полное имя\n"
    "Телефон: +998901234567\n"
    "Email: your-email@example.com\n"
    "Тариф: pro\n\n"
    "Оплатить можно через Click, Payme, Paynet, банковскую карту или перевод. После отправки чека с email, указанным при регистрации, бот автоматически активирует Pro.\n\n"
    "UZ: SATTEST.UZ Pro kirishini faollashtirish uchun to'lov skrinshoti yoki PDF chekni quyidagi izoh bilan yuboring:\n"
    "To'liq ism: Ism familiyangiz\n"
    "Telefon: +998901234567\n"
    "Email: your-email@example.com\n"
    "Tarif: pro\n\n"
    "To'lovni Click, Payme, Paynet, bank kartasi yoki o'tkazma orqali qilishingiz mumkin. Ro'yxatdan o'tgan emailingiz bilan chek yuborilgach, bot Pro kirishni avtomatik faollashtiradi.\n\n"
    f"{PAYMENT_WARNING_TEXT}"
)

RECEIPT_REQUEST_MESSAGE = (
    "EN: Please send the payment screenshot or PDF with full name, phone number, registered email, and plan in the caption.\n"
    "Example:\nFull name: Your full name\nPhone: +998901234567\nEmail: your-email@example.com\nPlan: pro\n\n"
    "RU: Отправьте скриншот или PDF-чек с ФИО, телефоном, email регистрации и тарифом в подписи.\n"
    "Пример:\nФИО: Ваше полное имя\nТелефон: +998901234567\nEmail: your-email@example.com\nТариф: pro\n\n"
    "UZ: To'lov skrinshoti yoki PDF chekni to'liq ism, telefon raqam, ro'yxatdan o'tgan email va tarif bilan yuboring.\n"
    "Namuna:\nTo'liq ism: Ism familiyangiz\nTelefon: +998901234567\nEmail: your-email@example.com\nTarif: pro\n\n"
    f"{PAYMENT_WARNING_TEXT}"
)

EMAIL_MISSING_MESSAGE = (
    "EN: I received the receipt, but full name, phone number, or account email is missing. Please resend the receipt with this exact caption:\n"
    "Full name: Your full name\nPhone: +998901234567\nEmail: your-email@example.com\nPlan: pro\n\n"
    "RU: Чек получен, но не хватает ФИО, телефона или email аккаунта. Отправьте чек заново с такой подписью:\n"
    "ФИО: Ваше полное имя\nТелефон: +998901234567\nEmail: your-email@example.com\nТариф: pro\n\n"
    "UZ: Chek qabul qilindi, lekin to'liq ism, telefon yoki akkaunt emaili yetishmayapti. Chekni shu izoh bilan qayta yuboring:\n"
    "To'liq ism: Ism familiyangiz\nTelefon: +998901234567\nEmail: your-email@example.com\nTarif: pro"
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

    if message := update.get("message"):
        return _handle_message(message, db)

    return {"ok": True, "ignored": True}


def _handle_message(message: dict, db: Session | None) -> dict:
    chat_id = str(message.get("chat", {}).get("id", ""))
    if not chat_id:
        return {"ok": True, "ignored": True}

    text = str(message.get("text") or message.get("caption") or "").strip()

    if text.startswith("/start"):
        _send_message(chat_id, START_MESSAGE)
        return {"ok": True}

    if text.startswith(("/pro_report", "/report")):
        return _handle_admin_report_command(chat_id, db)

    has_receipt = bool(message.get("photo") or message.get("document"))
    if not has_receipt:
        _send_message(chat_id, RECEIPT_REQUEST_MESSAGE)
        return {"ok": True}

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
    db.commit()
    db.refresh(subscription)

    _send_message(chat_id, _receipt_active_message(subscription))
    _notify_admin_for_auto_activation(subscription, user, message)
    return {"ok": True, "subscription_id": str(subscription.id), "status": "active"}


def _handle_callback(callback_query: dict, db: Session | None) -> dict:
    callback_id = callback_query.get("id")
    data = str(callback_query.get("data") or "")
    admin_chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", ""))

    settings = get_settings()
    if settings.telegram_admin_chat_id and admin_chat_id != str(settings.telegram_admin_chat_id):
        _answer_callback(callback_id, "Only Founder can manage payment access.")
        return {"ok": True, "ignored": True}

    action, _, raw_subscription_id = data.partition(":")
    if db is None:
        _answer_callback(callback_id, "Database is not connected, approve manually.")
        return {"ok": True, "manual": True}

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
            _send_message(student_chat_id, _receipt_active_message(subscription))
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

    return {"reminders_sent": reminders_sent, "expired": expired_count}


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


def _receipt_active_message(subscription: Subscription) -> str:
    start = _format_subscription_date(subscription.current_period_start)
    end = _format_subscription_date(subscription.current_period_end)
    return (
        "EN: Receipt received. SATTEST.UZ Pro was activated instantly by the bot.\n"
        f"Start day: {start}\n"
        f"End day: {end}\n"
        "Open https://www.sattest.uz/login and continue your practice.\n\n"
        "RU: Чек получен. SATTEST.UZ Pro был мгновенно активирован ботом.\n"
        f"Дата начала: {start}\n"
        f"Дата окончания: {end}\n"
        "Откройте https://www.sattest.uz/login и продолжайте практику.\n\n"
        "UZ: Chek qabul qilindi. SATTEST.UZ Pro bot orqali darhol faollashtirildi.\n"
        f"Boshlanish kuni: {start}\n"
        f"Tugash kuni: {end}\n"
        "https://www.sattest.uz/login sahifasini oching va practice davom ettiring.\n\n"
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
    if not match:
        return None
    name = re.sub(r"\s+", " ", match.group(1)).strip()
    if len(name.split()) < 2 or len(name) > 120:
        return None
    return name


def _extract_receipt_payload(text: str) -> dict:
    return {
        "email": _extract_email(text),
        "phone": _extract_phone(text),
        "full_name": _extract_full_name(text),
        "plan": _extract_plan(text),
    }


def _extract_plan(text: str) -> str:
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
