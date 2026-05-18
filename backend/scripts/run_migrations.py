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
                print(f"Replaying idempotent migration {version}")
            else:
                print(f"Applying {version}")
            for statement in split_sql_statements(migration.read_text()):
                connection.exec_driver_sql(statement)
            connection.execute(
                text("INSERT INTO schema_migrations (version) VALUES (:version) ON CONFLICT (version) DO NOTHING"),
                {"version": version},
            )
    print("Migrations complete.")


def split_sql_statements(sql: str) -> list[str]:
    statements: list[str] = []
    current: list[str] = []
    index = 0
    dollar_quote: str | None = None
    in_single_quote = False
    in_double_quote = False
    in_line_comment = False
    in_block_comment = False

    while index < len(sql):
        char = sql[index]
        next_char = sql[index + 1] if index + 1 < len(sql) else ""

        if in_line_comment:
            current.append(char)
            if char == "\n":
                in_line_comment = False
            index += 1
            continue

        if in_block_comment:
            current.append(char)
            if char == "*" and next_char == "/":
                current.append(next_char)
                in_block_comment = False
                index += 2
            else:
                index += 1
            continue

        if dollar_quote:
            if sql.startswith(dollar_quote, index):
                current.append(dollar_quote)
                index += len(dollar_quote)
                dollar_quote = None
            else:
                current.append(char)
                index += 1
            continue

        if in_single_quote:
            current.append(char)
            if char == "'" and next_char == "'":
                current.append(next_char)
                index += 2
                continue
            if char == "'":
                in_single_quote = False
            index += 1
            continue

        if in_double_quote:
            current.append(char)
            if char == '"':
                in_double_quote = False
            index += 1
            continue

        if char == "-" and next_char == "-":
            current.extend([char, next_char])
            in_line_comment = True
            index += 2
            continue

        if char == "/" and next_char == "*":
            current.extend([char, next_char])
            in_block_comment = True
            index += 2
            continue

        if char == "$":
            end = sql.find("$", index + 1)
            if end != -1:
                tag = sql[index : end + 1]
                if tag == "$$" or tag[1:-1].replace("_", "").isalnum():
                    current.append(tag)
                    dollar_quote = tag
                    index = end + 1
                    continue

        if char == "'":
            current.append(char)
            in_single_quote = True
            index += 1
            continue

        if char == '"':
            current.append(char)
            in_double_quote = True
            index += 1
            continue

        if char == ";":
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
            index += 1
            continue

        current.append(char)
        index += 1

    trailing = "".join(current).strip()
    if trailing:
        statements.append(trailing)
    return statements


if __name__ == "__main__":
    main()
