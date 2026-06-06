ALTER TABLE test_attempts
  ADD COLUMN IF NOT EXISTS module1_correct INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS module1_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS module2_mode VARCHAR(16) NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS module2_started BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS module2_correct INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS module2_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_score DOUBLE PRECISION;

UPDATE test_attempts
SET
  module2_mode = COALESCE(NULLIF(module2_mode, ''), 'medium'),
  module2_started = COALESCE(module2_started, FALSE),
  module1_correct = COALESCE(module1_correct, 0),
  module1_total = COALESCE(module1_total, 0),
  module2_correct = COALESCE(module2_correct, 0),
  module2_total = COALESCE(module2_total, 0);
