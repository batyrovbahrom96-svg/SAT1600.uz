import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class SATSection(str, enum.Enum):
    reading_writing = "reading_writing"
    math = "math"


class QuestionFormat(str, enum.Enum):
    multiple_choice = "multiple_choice"
    grid_in = "grid_in"


class QuestionSource(str, enum.Enum):
    database = "database"
    generated_variant = "generated_variant"


class ChoiceTrapRole(str, enum.Enum):
    correct = "correct"
    common_mistake = "common_mistake"
    conceptual_misunderstanding = "conceptual_misunderstanding"
    extreme_wrong_logic = "extreme_wrong_logic"


class AttemptStatus(str, enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    expired = "expired"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="student")
    detected_language: Mapped[str | None] = mapped_column(String(16))
    chosen_language: Mapped[str | None] = mapped_column(String(16))
    language_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    language_set_date: Mapped[datetime | None] = mapped_column(DateTime)
    daily_analyses: Mapped[int] = mapped_column(Integer, default=0)
    last_analysis_date: Mapped[datetime | None] = mapped_column(DateTime)
    total_analyses: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    attempts: Mapped[list["TestAttempt"]] = relationship(back_populates="user")
    reading_analyses: Mapped[list["ReadingAnalysis"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Test(Base):
    __tablename__ = "tests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    questions: Mapped[list["Question"]] = relationship(back_populates="test")
    attempts: Mapped[list["TestAttempt"]] = relationship(back_populates="test")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    test_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tests.id"))
    section: Mapped[SATSection] = mapped_column(Enum(SATSection, name="sat_section"))
    module: Mapped[int] = mapped_column(Integer)
    difficulty: Mapped[int] = mapped_column(Integer)
    adaptive_level: Mapped[str] = mapped_column(String(24), default="standard")
    source: Mapped[QuestionSource] = mapped_column(Enum(QuestionSource, name="question_source"), default=QuestionSource.database)
    parent_question_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("questions.id"))
    topic: Mapped[str] = mapped_column(String(120), index=True)
    subtopic: Mapped[str | None] = mapped_column(String(120))
    structure_key: Mapped[str] = mapped_column(String(120), default="standard")
    graph_path: Mapped[str | None] = mapped_column(String(500))
    graph_reasoning_type: Mapped[str | None] = mapped_column(String(80))
    graph_required: Mapped[bool] = mapped_column(Boolean, default=False)
    data_type: Mapped[str] = mapped_column(String(24), default="none")
    data_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    passage: Mapped[str | None] = mapped_column(Text)
    prompt: Mapped[str] = mapped_column(Text)
    correct_answer: Mapped[str] = mapped_column(String(255))
    explanation: Mapped[str] = mapped_column(Text)
    trap_type: Mapped[str | None] = mapped_column(String(120))
    question_type: Mapped[str] = mapped_column(String(120), index=True)
    format: Mapped[QuestionFormat] = mapped_column(Enum(QuestionFormat, name="question_format"))
    estimated_time: Mapped[int] = mapped_column(Integer, default=75)
    discrimination_score: Mapped[float] = mapped_column(Float, default=0.5)
    percent_correct: Mapped[float] = mapped_column(Float, default=0.5)
    average_time_seconds: Mapped[float] = mapped_column(Float, default=75)
    drop_off_rate: Mapped[float] = mapped_column(Float, default=0)
    calibration_attempts: Mapped[int] = mapped_column(Integer, default=0)
    calibration_confidence: Mapped[float] = mapped_column(Float, default=0)
    effective_difficulty: Mapped[float] = mapped_column(Float, default=5)
    confusion_index: Mapped[float] = mapped_column(Float, default=0)
    trap_efficiency: Mapped[float] = mapped_column(Float, default=0)
    time_pressure_score: Mapped[float] = mapped_column(Float, default=0)
    quality_score: Mapped[float] = mapped_column(Float, default=0)
    auto_quality_flag: Mapped[str] = mapped_column(String(40), default="insufficient_data")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    validation_status: Mapped[str] = mapped_column(String(40), default="needs_review")
    validation_notes: Mapped[str | None] = mapped_column(Text)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    test: Mapped[Test | None] = relationship(back_populates="questions")
    choices: Mapped[list["QuestionChoice"]] = relationship(back_populates="question", cascade="all, delete-orphan")


class QuestionChoice(Base):
    __tablename__ = "question_choices"
    __table_args__ = (UniqueConstraint("question_id", "label", name="uq_question_choice_label"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"))
    label: Mapped[str] = mapped_column(String(8))
    text: Mapped[str] = mapped_column(Text)
    trap_role: Mapped[ChoiceTrapRole] = mapped_column(Enum(ChoiceTrapRole, name="choice_trap_role"), default=ChoiceTrapRole.common_mistake)
    error_basis: Mapped[str | None] = mapped_column(Text)

    question: Mapped[Question] = relationship(back_populates="choices")


class TestAttempt(Base):
    __tablename__ = "test_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    test_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tests.id"))
    current_section: Mapped[SATSection] = mapped_column(Enum(SATSection, name="sat_section"), default=SATSection.reading_writing)
    current_module: Mapped[int] = mapped_column(Integer, default=1)
    route: Mapped[dict] = mapped_column(JSON, default=dict)
    module1_correct: Mapped[int] = mapped_column(Integer, default=0)
    module1_total: Mapped[int] = mapped_column(Integer, default=0)
    module2_mode: Mapped[str] = mapped_column(String(16), default="medium")
    module2_started: Mapped[bool] = mapped_column(Boolean, default=False)
    module2_correct: Mapped[int] = mapped_column(Integer, default=0)
    module2_total: Mapped[int] = mapped_column(Integer, default=0)
    final_score: Mapped[float | None] = mapped_column(Float)
    score_total: Mapped[int | None] = mapped_column(Integer)
    score_reading_writing: Mapped[int | None] = mapped_column(Integer)
    score_math: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[AttemptStatus] = mapped_column(Enum(AttemptStatus, name="attempt_status"), default=AttemptStatus.in_progress)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    module_started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    module_deadline_at: Mapped[datetime | None] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    user: Mapped[User] = relationship(back_populates="attempts")
    test: Mapped[Test] = relationship(back_populates="attempts")
    results: Mapped[list["QuestionResult"]] = relationship(back_populates="attempt", cascade="all, delete-orphan")


class QuestionResult(Base):
    __tablename__ = "question_results"
    __table_args__ = (UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("test_attempts.id", ondelete="CASCADE"))
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id"))
    selected_answer: Mapped[str | None] = mapped_column(String(255))
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    marked_for_review: Mapped[bool] = mapped_column(Boolean, default=False)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)
    module_snapshot: Mapped[int] = mapped_column(Integer)
    answered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    attempt: Mapped[TestAttempt] = relationship(back_populates="results")
    question: Mapped[Question] = relationship()


class QuestionExposure(Base):
    __tablename__ = "question_exposures"
    __table_args__ = (UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question_exposure"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("test_attempts.id", ondelete="CASCADE"))
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id"))
    module_snapshot: Mapped[int] = mapped_column(Integer)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    question: Mapped[Question] = relationship()


class QuestionTelemetryLog(Base):
    __tablename__ = "question_telemetry_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("test_attempts.id", ondelete="CASCADE"))
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id"))
    module_snapshot: Mapped[int] = mapped_column(Integer)
    selected_answer: Mapped[str | None] = mapped_column(String(255))
    previous_answer: Mapped[str | None] = mapped_column(String(255))
    answer_changed: Mapped[bool] = mapped_column(Boolean, default=False)
    hesitation_seconds: Mapped[int] = mapped_column(Integer, default=0)
    time_spent_seconds: Mapped[int] = mapped_column(Integer, default=0)
    interaction_count: Mapped[int] = mapped_column(Integer, default=1)
    raw_event: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    question: Mapped[Question] = relationship()


class TestTelemetrySummary(Base):
    __tablename__ = "test_telemetry_summaries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("test_attempts.id", ondelete="CASCADE"), unique=True)
    time_decay: Mapped[dict] = mapped_column(JSON, default=dict)
    accuracy_by_block: Mapped[dict] = mapped_column(JSON, default=dict)
    streak_patterns: Mapped[dict] = mapped_column(JSON, default=dict)
    raw_logs: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Analytics(Base):
    __tablename__ = "analytics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    attempt_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("test_attempts.id"))
    score_progression: Mapped[list] = mapped_column(JSON, default=list)
    topic_accuracy: Mapped[dict] = mapped_column(JSON, default=dict)
    average_time_by_topic: Mapped[dict] = mapped_column(JSON, default=dict)
    graph_performance: Mapped[dict] = mapped_column(JSON, default=dict)
    careless_mistakes: Mapped[list] = mapped_column(JSON, default=list)
    adaptive_route_history: Mapped[dict] = mapped_column(JSON, default=dict)
    strengths: Mapped[list] = mapped_column(JSON, default=list)
    weaknesses: Mapped[list] = mapped_column(JSON, default=list)
    report: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class GraphAsset(Base):
    __tablename__ = "graph_assets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    graph_type: Mapped[str] = mapped_column(String(80))
    path: Mapped[str] = mapped_column(String(500))
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    plan: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(40), default="inactive")
    provider: Mapped[str | None] = mapped_column(String(80))
    provider_customer_id: Mapped[str | None] = mapped_column(String(255))
    payer_full_name: Mapped[str | None] = mapped_column(String(255))
    payer_phone: Mapped[str | None] = mapped_column(String(40))
    current_period_start: Mapped[datetime | None] = mapped_column(DateTime)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime)
    renewal_reminders_sent: Mapped[int] = mapped_column(Integer, default=0)
    last_renewal_reminder_at: Mapped[datetime | None] = mapped_column(DateTime)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime)
    price_amount: Mapped[float | None] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(8), default="UZS")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reference: Mapped[str] = mapped_column(String(16), unique=True, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    subscription_type: Mapped[str] = mapped_column(String(24))
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String(8), default="UZS")
    status: Mapped[str] = mapped_column(String(40), default="pending")
    estimated_score: Mapped[int | None] = mapped_column(Integer)
    weak_areas: Mapped[list] = mapped_column(JSON, default=list)
    telegram_chat_id: Mapped[str | None] = mapped_column(String(80))
    telegram_username: Mapped[str | None] = mapped_column(String(255))
    telegram_phone: Mapped[str | None] = mapped_column(String(40))
    screenshot_file_id: Mapped[str | None] = mapped_column(String(255))
    admin_message_id: Mapped[str | None] = mapped_column(String(80))
    activation_date: Mapped[datetime | None] = mapped_column(DateTime)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ReadingAnalysis(Base):
    __tablename__ = "reading_analyses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    share_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    language: Mapped[str] = mapped_column(String(16), default="uz")
    source_text: Mapped[str] = mapped_column(Text)
    input_type: Mapped[str] = mapped_column(String(16), default="text")
    analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    is_pro_snapshot: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship(back_populates="reading_analyses")


class TelegramAudience(Base):
    __tablename__ = "telegram_audience"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    telegram_user_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    chat_id: Mapped[str] = mapped_column(String(80), index=True)
    username: Mapped[str | None] = mapped_column(String(255))
    first_name: Mapped[str | None] = mapped_column(String(255))
    last_name: Mapped[str | None] = mapped_column(String(255))
    detected_language: Mapped[str | None] = mapped_column(String(16))
    chosen_language: Mapped[str | None] = mapped_column(String(16))
    language_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    language_set_date: Mapped[datetime | None] = mapped_column(DateTime)
    target_score: Mapped[str | None] = mapped_column(String(24))
    welcome_sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    followup_24h_sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    followup_72h_sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    pro_reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    link_clicked_at: Mapped[datetime | None] = mapped_column(DateTime)
    test_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    test_score: Mapped[int | None] = mapped_column(Integer)
    test_weak_areas: Mapped[str | None] = mapped_column(Text)
    pro_activated: Mapped[bool] = mapped_column(Boolean, default=False)
    activation_date: Mapped[datetime | None] = mapped_column(DateTime)
    bot_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    webinar_reminder: Mapped[bool] = mapped_column(Boolean, default=False)
    daily_tips: Mapped[bool] = mapped_column(Boolean, default=False)
    current_score: Mapped[int | None] = mapped_column(Integer)
    score_updated_date: Mapped[datetime | None] = mapped_column(DateTime)
    faq_count: Mapped[int] = mapped_column(Integer, default=0)
    last_message_date: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
