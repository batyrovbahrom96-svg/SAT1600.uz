from pathlib import Path

from sqlalchemy import text

from app.db.session import get_engine


def migrations_dir() -> Path:
    candidates = [
        Path.cwd() / "db" / "migrations",
        Path.cwd().parent / "db" / "migrations",
        Path(__file__).resolve().parents[2] / "db" / "migrations",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise RuntimeError("Could not find db/migrations directory")


def main() -> None:
    directory = migrations_dir()
    migrations = sorted(directory.glob("*.sql"))
    if not migrations:
        raise SystemExit(f"No migrations found in {directory}")

    with get_engine().begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                  version VARCHAR(255) PRIMARY KEY,
                  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
        )
        applied = {
            row[0]
            for row in connection.execute(text("SELECT version FROM schema_migrations")).all()
        }
        for migration in migrations:
            version = migration.name
            if version in applied:
                print(f"Skipping {version}")
                continue
            print(f"Applying {version}")
            connection.execute(text(migration.read_text()))
            connection.execute(text("INSERT INTO schema_migrations (version) VALUES (:version)"), {"version": version})
    print("Migrations complete.")


if __name__ == "__main__":
    main()
