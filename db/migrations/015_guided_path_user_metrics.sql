ALTER TABLE users
  ADD COLUMN IF NOT EXISTS exam_date DATE,
  ADD COLUMN IF NOT EXISTS sat_experience VARCHAR(40),
  ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_lesson_date DATE,
  ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS diagnostic_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS diagnostic_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS first_lesson_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS first_lesson_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reached_7_day_streak BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reached_7_day_streak_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS first_mock_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS first_mock_completed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS upgraded_to_pro BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS upgraded_to_pro_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS pro_conversion_source VARCHAR(80);

UPDATE users
SET
  current_streak = COALESCE(current_streak, 0),
  longest_streak = COALESCE(longest_streak, 0),
  daily_goal = COALESCE(daily_goal, 2),
  diagnostic_completed = COALESCE(diagnostic_completed, FALSE),
  first_lesson_completed = COALESCE(first_lesson_completed, FALSE),
  reached_7_day_streak = COALESCE(reached_7_day_streak, FALSE),
  first_mock_completed = COALESCE(first_mock_completed, FALSE),
  upgraded_to_pro = COALESCE(upgraded_to_pro, FALSE);

ALTER TABLE users
  ALTER COLUMN current_streak SET DEFAULT 0,
  ALTER COLUMN current_streak SET NOT NULL,
  ALTER COLUMN longest_streak SET DEFAULT 0,
  ALTER COLUMN longest_streak SET NOT NULL,
  ALTER COLUMN daily_goal SET DEFAULT 2,
  ALTER COLUMN daily_goal SET NOT NULL,
  ALTER COLUMN diagnostic_completed SET DEFAULT FALSE,
  ALTER COLUMN diagnostic_completed SET NOT NULL,
  ALTER COLUMN first_lesson_completed SET DEFAULT FALSE,
  ALTER COLUMN first_lesson_completed SET NOT NULL,
  ALTER COLUMN reached_7_day_streak SET DEFAULT FALSE,
  ALTER COLUMN reached_7_day_streak SET NOT NULL,
  ALTER COLUMN first_mock_completed SET DEFAULT FALSE,
  ALTER COLUMN first_mock_completed SET NOT NULL,
  ALTER COLUMN upgraded_to_pro SET DEFAULT FALSE,
  ALTER COLUMN upgraded_to_pro SET NOT NULL;

CREATE INDEX IF NOT EXISTS ix_users_path_streak
  ON users(current_streak, last_lesson_date);

CREATE INDEX IF NOT EXISTS ix_users_funnel_diagnostic
  ON users(diagnostic_completed, diagnostic_completed_at);

CREATE INDEX IF NOT EXISTS ix_users_pro_conversion_source
  ON users(pro_conversion_source);
