DO $$ BEGIN
  CREATE TYPE choice_trap_role AS ENUM ('correct', 'common_mistake', 'conceptual_misunderstanding', 'extreme_wrong_logic');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS graph_reasoning_type VARCHAR(80),
  ADD COLUMN IF NOT EXISTS graph_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS percent_correct DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS average_time_seconds DOUBLE PRECISION NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS drop_off_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calibration_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE question_choices
  ADD COLUMN IF NOT EXISTS trap_role choice_trap_role NOT NULL DEFAULT 'common_mistake',
  ADD COLUMN IF NOT EXISTS error_basis TEXT;

UPDATE question_choices qc
SET trap_role = CASE
  WHEN qc.label = q.correct_answer THEN 'correct'::choice_trap_role
  WHEN qc.label = 'A' THEN 'common_mistake'::choice_trap_role
  WHEN qc.label = 'B' AND q.correct_answer <> 'B' THEN 'conceptual_misunderstanding'::choice_trap_role
  WHEN qc.label = 'C' AND q.correct_answer <> 'C' THEN 'conceptual_misunderstanding'::choice_trap_role
  ELSE 'extreme_wrong_logic'::choice_trap_role
END,
error_basis = COALESCE(qc.error_basis, 'Legacy distractor migrated; replace with a real solution-error explanation.')
FROM questions q
WHERE qc.question_id = q.id;

CREATE TABLE IF NOT EXISTS question_exposures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  module_snapshot INTEGER NOT NULL,
  first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_attempt_question_exposure UNIQUE (attempt_id, question_id)
);
