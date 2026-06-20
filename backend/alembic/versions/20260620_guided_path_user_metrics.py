"""guided path user metrics

Revision ID: 20260620_guided_path_user_metrics
Revises:
Create Date: 2026-06-20
"""

from alembic import op
import sqlalchemy as sa


revision = "20260620_guided_path_user_metrics"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("exam_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("sat_experience", sa.String(length=40), nullable=True))
    op.add_column("users", sa.Column("current_streak", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("longest_streak", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("last_lesson_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("daily_goal", sa.Integer(), server_default="2", nullable=False))
    op.add_column("users", sa.Column("diagnostic_completed", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("users", sa.Column("diagnostic_completed_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("first_lesson_completed", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("users", sa.Column("first_lesson_completed_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("reached_7_day_streak", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("users", sa.Column("reached_7_day_streak_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("first_mock_completed", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("users", sa.Column("first_mock_completed_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("upgraded_to_pro", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("users", sa.Column("upgraded_to_pro_at", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("pro_conversion_source", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "pro_conversion_source")
    op.drop_column("users", "upgraded_to_pro_at")
    op.drop_column("users", "upgraded_to_pro")
    op.drop_column("users", "first_mock_completed_at")
    op.drop_column("users", "first_mock_completed")
    op.drop_column("users", "reached_7_day_streak_at")
    op.drop_column("users", "reached_7_day_streak")
    op.drop_column("users", "first_lesson_completed_at")
    op.drop_column("users", "first_lesson_completed")
    op.drop_column("users", "diagnostic_completed_at")
    op.drop_column("users", "diagnostic_completed")
    op.drop_column("users", "daily_goal")
    op.drop_column("users", "last_lesson_date")
    op.drop_column("users", "longest_streak")
    op.drop_column("users", "current_streak")
    op.drop_column("users", "sat_experience")
    op.drop_column("users", "exam_date")
