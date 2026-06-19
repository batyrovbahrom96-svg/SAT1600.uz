ALTER TABLE users
  ADD COLUMN IF NOT EXISTS signup_source VARCHAR(80),
  ADD COLUMN IF NOT EXISTS anonymous_visitor_id VARCHAR(80),
  ADD COLUMN IF NOT EXISTS reading_analyzer_limit_signup_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reading_analyzer_followup_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS ix_users_anonymous_visitor_id
  ON users(anonymous_visitor_id);

ALTER TABLE reading_analyses
  ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS reading_analyzer_anonymous_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id VARCHAR(80) NOT NULL,
  usage_date DATE NOT NULL,
  daily_analyses INTEGER NOT NULL DEFAULT 0,
  total_analyses INTEGER NOT NULL DEFAULT 0,
  limit_hit_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reading_analyzer_anon_usage_day UNIQUE (anonymous_id, usage_date)
);

CREATE INDEX IF NOT EXISTS ix_reading_analyzer_anon_usage_id
  ON reading_analyzer_anonymous_usage(anonymous_id);

CREATE INDEX IF NOT EXISTS ix_reading_analyzer_anon_usage_date
  ON reading_analyzer_anonymous_usage(usage_date);

CREATE TABLE IF NOT EXISTS reading_analyzer_limit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anonymous_id VARCHAR(80),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  language VARCHAR(16) NOT NULL DEFAULT 'en',
  source VARCHAR(80) NOT NULL DEFAULT 'reading_analyzer_limit',
  used_count INTEGER NOT NULL DEFAULT 3,
  limit_hit_at TIMESTAMP NOT NULL DEFAULT NOW(),
  account_created_at TIMESTAMP,
  followup_sent_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_reading_analyzer_limit_events_anon
  ON reading_analyzer_limit_events(anonymous_id);

CREATE INDEX IF NOT EXISTS ix_reading_analyzer_limit_events_user
  ON reading_analyzer_limit_events(user_id);

CREATE INDEX IF NOT EXISTS ix_reading_analyzer_limit_events_hit
  ON reading_analyzer_limit_events(limit_hit_at);
