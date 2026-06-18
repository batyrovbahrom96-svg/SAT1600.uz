ALTER TABLE users
  ADD COLUMN IF NOT EXISTS daily_analyses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_analysis_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS total_analyses INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS reading_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_id VARCHAR(32) NOT NULL UNIQUE,
  language VARCHAR(16) NOT NULL DEFAULT 'uz',
  source_text TEXT NOT NULL,
  analysis JSONB NOT NULL DEFAULT '{}',
  is_pro_snapshot BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_reading_analyses_user_created
  ON reading_analyses(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ix_reading_analyses_share_id
  ON reading_analyses(share_id);
