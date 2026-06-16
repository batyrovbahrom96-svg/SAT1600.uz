ALTER TABLE users
  ADD COLUMN IF NOT EXISTS detected_language VARCHAR(16),
  ADD COLUMN IF NOT EXISTS chosen_language VARCHAR(16),
  ADD COLUMN IF NOT EXISTS language_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS language_set_date TIMESTAMP;

CREATE TABLE IF NOT EXISTS telegram_audience (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_user_id VARCHAR(80) NOT NULL UNIQUE,
  chat_id VARCHAR(80) NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  detected_language VARCHAR(16),
  chosen_language VARCHAR(16),
  language_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  language_set_date TIMESTAMP,
  target_score VARCHAR(24),
  welcome_sent_at TIMESTAMP,
  followup_24h_sent_at TIMESTAMP,
  followup_72h_sent_at TIMESTAMP,
  pro_reminder_sent_at TIMESTAMP,
  link_clicked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_telegram_audience_user_id ON telegram_audience(telegram_user_id);
CREATE INDEX IF NOT EXISTS ix_telegram_audience_chat_id ON telegram_audience(chat_id);
CREATE INDEX IF NOT EXISTS ix_telegram_audience_language
  ON telegram_audience(chosen_language, detected_language);
CREATE INDEX IF NOT EXISTS ix_telegram_audience_created_at ON telegram_audience(created_at);
