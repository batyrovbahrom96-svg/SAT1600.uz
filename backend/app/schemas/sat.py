from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class AuthRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    verification_code: str = Field(min_length=6, max_length=6)
    signup_source: str | None = Field(default=None, max_length=80)
    anonymous_id: str | None = Field(default=None, max_length=80)


class OnboardingRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    verification_code: str = Field(min_length=6, max_length=6)
    target_score: int = Field(default=1400, ge=400, le=1600)
    self_assessed_level: str = Field(pattern="^(beginner|intermediate|ready)$")


class VerificationCodeRequest(BaseModel):
    email: EmailStr


class AuthLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


class ChoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    label: str
    text: str


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    section: str
    module: int
    order_index: int
    difficulty: int
    topic: str
    subtopic: str | None
    structure_key: str
    graph_path: str | None
    graph_reasoning_type: str | None
    graph_required: bool
    data_type: str = "none"
    data_payload: dict = Field(default_factory=dict)
    passage: str | None
    prompt: str
    question_type: str
    format: str
    estimated_time: int
    choices: list[ChoiceOut]


class AnswerIn(BaseModel):
    question_id: UUID
    selected_answer: str | None = None
    previous_answer: str | None = None
    answer_changed: bool = False
    marked_for_review: bool = False
    hesitation_seconds: int = Field(default=0, ge=0, le=3600)
    time_spent_seconds: int = Field(default=0, ge=0, le=3600)
    interaction_count: int = Field(default=1, ge=1, le=200)


class AdminQuestionUpdate(BaseModel):
    difficulty: int | None = Field(default=None, ge=1, le=10)
    is_active: bool | None = None
    validation_status: str | None = None
    validation_notes: str | None = Field(default=None, max_length=5000)

    @field_validator("validation_status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        allowed = {"needs_review", "reviewed", "approved", "flagged", "auto_flagged", "disabled"}
        if value is not None and value not in allowed:
            raise ValueError(f"validation_status must be one of {sorted(allowed)}")
        return value


class AttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    test_id: UUID
    current_section: str
    current_module: int
    status: str
    route: dict


class ModuleOut(BaseModel):
    attempt: AttemptOut
    duration_seconds: int
    can_go_back: bool = False
    questions: list[QuestionOut]
    answers: dict[str, dict] = {}


class ResultsOut(BaseModel):
    attempt_id: UUID
    score_total: int
    score_reading_writing: int
    score_math: int
    final_score: float | None = None
    topic_accuracy: dict
    weaknesses: list[str]
    strengths: list[str]
    report: str
    questions: list[dict]
