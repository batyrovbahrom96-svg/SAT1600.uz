import os
from datetime import datetime, timedelta

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Subscription, User


def main() -> None:
    email = os.environ.get("TEST_PRO_EMAIL")
    password = os.environ.get("TEST_PRO_PASSWORD")
    full_name = os.environ.get("TEST_PRO_FULL_NAME", "Founder Pro Tester")
    role = os.environ.get("TEST_PRO_ROLE", "admin")
    days = int(os.environ.get("TEST_PRO_DAYS", "30"))

    if not email or not password:
        raise SystemExit("TEST_PRO_EMAIL and TEST_PRO_PASSWORD are required")
    if len(password) < 12:
        raise SystemExit("TEST_PRO_PASSWORD must be at least 12 characters")

    now = datetime.utcnow()
    db = SessionLocal()
    try:
        user = db.execute(select(User).where(User.email == email.lower())).scalar_one_or_none()
        if user:
            user.full_name = full_name
            user.password_hash = hash_password(password)
            user.role = role
            action = "Updated"
        else:
            user = User(
                email=email.lower(),
                full_name=full_name,
                password_hash=hash_password(password),
                role=role,
            )
            db.add(user)
            db.flush()
            action = "Created"

        subscription = (
            db.execute(
                select(Subscription)
                .where(Subscription.user_id == user.id)
                .order_by(Subscription.created_at.desc())
            )
            .scalars()
            .first()
        )

        if subscription:
            subscription.plan = "pro"
            subscription.status = "active"
            subscription.provider = "manual_test_seed"
            subscription.provider_customer_id = f"test:{email.lower()}"
            subscription.payer_full_name = full_name
            subscription.payer_phone = "+998000000000"
            subscription.current_period_start = now
            subscription.current_period_end = now + timedelta(days=days)
            subscription.price_amount = 0
            subscription.currency = "UZS"
            subscription.canceled_at = None
        else:
            subscription = Subscription(
                user_id=user.id,
                plan="pro",
                status="active",
                provider="manual_test_seed",
                provider_customer_id=f"test:{email.lower()}",
                payer_full_name=full_name,
                payer_phone="+998000000000",
                current_period_start=now,
                current_period_end=now + timedelta(days=days),
                price_amount=0,
                currency="UZS",
            )
            db.add(subscription)

        db.commit()
        print(f"{action} {role} Pro test user: {email.lower()}")
        print(f"Pro active until: {subscription.current_period_end.isoformat()} UTC")
    finally:
        db.close()


if __name__ == "__main__":
    main()
