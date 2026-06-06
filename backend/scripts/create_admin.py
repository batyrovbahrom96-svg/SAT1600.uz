import os

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import User


def main() -> None:
    email = os.environ.get("ADMIN_EMAIL")
    password = os.environ.get("ADMIN_PASSWORD")
    full_name = os.environ.get("ADMIN_FULL_NAME", "SATTEST Admin")
    if not email or not password:
        raise SystemExit("ADMIN_EMAIL and ADMIN_PASSWORD are required")
    if len(password) < 12:
        raise SystemExit("ADMIN_PASSWORD must be at least 12 characters")

    db = SessionLocal()
    try:
        existing = db.execute(select(User).where(User.email == email.lower())).scalar_one_or_none()
        if existing:
            existing.role = "admin"
            existing.full_name = full_name
            existing.password_hash = hash_password(password)
            print(f"Updated admin user {email.lower()}")
        else:
            db.add(
                User(
                    email=email.lower(),
                    full_name=full_name,
                    password_hash=hash_password(password),
                    role="admin",
                )
            )
            print(f"Created admin user {email.lower()}")
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
