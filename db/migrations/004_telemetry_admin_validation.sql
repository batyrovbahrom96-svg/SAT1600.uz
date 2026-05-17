ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS validation_status VARCHAR(40) NOT NULL DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS validation_notes TEXT;

CREATE TABLE IF NOT EXISTS question_telemetry_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  module_snapshot INTEGER NOT NULL,
  selected_answer VARCHAR(255),
  previous_answer VARCHAR(255),
  answer_changed BOOLEAN NOT NULL DEFAULT FALSE,
  hesitation_seconds INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  interaction_count INTEGER NOT NULL DEFAULT 1,
  raw_event JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_telemetry_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL UNIQUE REFERENCES test_attempts(id) ON DELETE CASCADE,
  time_decay JSONB NOT NULL DEFAULT '{}',
  accuracy_by_block JSONB NOT NULL DEFAULT '{}',
  streak_patterns JSONB NOT NULL DEFAULT '{}',
  raw_logs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_questions_validation ON questions(validation_status, is_active);
CREATE INDEX IF NOT EXISTS ix_question_telemetry_question ON question_telemetry_logs(question_id, created_at);
