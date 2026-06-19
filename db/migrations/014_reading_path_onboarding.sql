ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS target_score INTEGER,
  ADD COLUMN IF NOT EXISTS self_assessed_level VARCHAR(40);

CREATE TABLE IF NOT EXISTS reading_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_key VARCHAR(120) NOT NULL,
  order_index INTEGER NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'locked',
  best_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  CONSTRAINT uq_reading_level_user_topic UNIQUE (user_id, topic_key)
);

CREATE INDEX IF NOT EXISTS ix_reading_levels_user_id
  ON reading_levels(user_id);

CREATE INDEX IF NOT EXISTS ix_reading_levels_order
  ON reading_levels(user_id, order_index);

CREATE INDEX IF NOT EXISTS ix_reading_levels_status
  ON reading_levels(status);

CREATE INDEX IF NOT EXISTS ix_reading_levels_topic_key
  ON reading_levels(topic_key);

CREATE TABLE IF NOT EXISTS level_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_id UUID NOT NULL REFERENCES reading_levels(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  correct_answer VARCHAR(8) NOT NULL,
  explanation TEXT NOT NULL,
  question_type VARCHAR(80) NOT NULL,
  difficulty VARCHAR(24) NOT NULL DEFAULT 'Medium',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_level_questions_level_id
  ON level_questions(level_id);

CREATE INDEX IF NOT EXISTS ix_level_questions_type
  ON level_questions(question_type);
