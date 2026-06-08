from __future__ import annotations

from datetime import datetime, timedelta
import json
import re
from urllib import error, request
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
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


def handle_telegram_update(update: dict, db: Session | None) -> dict:
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
        _send_message(
            chat_id,
            "Assalomu alaykum. To activate SATTEST.UZ access, send your payment screenshot or PDF with this caption:\n\n"
            "your-email@example.com pro\n\n"
            "You can pay by Click, Payme, Paynet, bank card, or transfer. After you send the receipt with your registered email, the bot activates Pro automatically.",
        )
        return {"ok": True}

    has_receipt = bool(message.get("photo") or message.get("document"))
    if not has_receipt:
        _send_message(
            chat_id,
            "Please send the payment screenshot or PDF with your registered email and plan in the caption.\n\n"
            "Example: your-email@example.com pro",
        )
        return {"ok": True}

    email = _extract_email(text)
    plan = _extract_plan(text)
    if not email:
        _send_message(
            chat_id,
            "I received the receipt, but I cannot find the account email.\n\n"
            "Please resend the screenshot with this caption: your-email@example.com pro",
        )
        return {"ok": True}

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

    settings = get_settings()
    auto_activate = settings.telegram_auto_activate_receipts
    subscription = Subscription(
        user_id=user.id,
        plan=plan,
        status="active" if auto_activate else "pending",
        provider="telegram_receipt_auto" if auto_activate else "telegram_manual",
        provider_customer_id=chat_id,
        current_period_end=datetime.utcnow() + timedelta(days=30) if auto_activate else None,
        price_amount=PLAN_PRICES[plan],
        currency="UZS",
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)

    if auto_activate:
        _send_message(
            chat_id,
            "Receipt received. Your SATTEST.UZ Pro access is active for 30 days.\n\n"
            "Open https://www.sattest.uz/login and continue your practice.",
        )
        _notify_admin_for_auto_activation(subscription, user, message)
        return {"ok": True, "subscription_id": str(subscription.id), "status": "active"}

    _send_message(
        chat_id,
        "Receipt received. Founder will verify it and activate your access after approval.\n\n"
        "Please keep this chat open for confirmation.",
    )
    _notify_admin_for_approval(subscription, user, message)
    return {"ok": True, "subscription_id": str(subscription.id), "status": "pending"}


def _handle_callback(callback_query: dict, db: Session | None) -> dict:
    callback_id = callback_query.get("id")
    data = str(callback_query.get("data") or "")
    admin_chat_id = str(callback_query.get("message", {}).get("chat", {}).get("id", ""))

    settings = get_settings()
    if settings.telegram_admin_chat_id and admin_chat_id != str(settings.telegram_admin_chat_id):
        _answer_callback(callback_id, "Only Founder can approve payments.")
        return {"ok": True, "ignored": True}

    action, _, raw_subscription_id = data.partition(":")
    if db is None:
        _answer_callback(callback_id, "Database is not connected, approve manually.")
        return {"ok": True, "manual": True}

    if action not in {"approve", "deny"}:
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
        subscription.status = "active"
        subscription.current_period_end = datetime.utcnow() + timedelta(days=30)
        db.commit()
        _answer_callback(callback_id, "Access activated.")
        if student_chat_id:
            _send_message(
                student_chat_id,
                "Payment approved. Your SATTEST.UZ access is active for 30 days.\n\n"
                "Open https://www.sattest.uz/login and continue your practice.",
            )
        _edit_admin_message(callback_query, f"APPROVED\n\n{_subscription_summary(subscription, user)}")
        return {"ok": True, "status": "active"}

    subscription.status = "denied"
    db.commit()
    _answer_callback(callback_id, "Receipt denied.")
    if student_chat_id:
        _send_message(
            student_chat_id,
            "Founder could not verify this payment receipt. Please resend the correct screenshot or contact @FounderSATTESTUZ.",
        )
    _edit_admin_message(callback_query, f"DENIED\n\n{_subscription_summary(subscription, user)}")
    return {"ok": True, "status": "denied"}


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
        "No Founder approval was required. The copied receipt is attached above for records."
    )

    _copy_message(settings.telegram_admin_chat_id, message["chat"]["id"], message["message_id"])
    _send_message(settings.telegram_admin_chat_id, text)


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
    return (
        f"Student: {full_name}\n"
        f"Email: {email}\n"
        f"Plan: {subscription.plan.upper()}\n"
        f"Amount: {price} {subscription.currency}\n"
        f"Subscription ID: {subscription.id}"
    )


def _extract_email(text: str) -> str | None:
    match = EMAIL_RE.search(text)
    return match.group(0).lower() if match else None


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
