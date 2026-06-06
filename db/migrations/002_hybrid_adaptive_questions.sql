DO $$ BEGIN
  CREATE TYPE question_source AS ENUM ('database', 'generated_variant');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'questions'
      AND column_name = 'difficulty'
      AND data_type <> 'integer'
  ) THEN
    ALTER TABLE questions
      ALTER COLUMN difficulty TYPE INTEGER USING
        CASE
          WHEN difficulty ~ '^[0-9]+$' THEN difficulty::INTEGER
          WHEN difficulty = 'easy' THEN 3
          WHEN difficulty = 'medium' THEN 6
          WHEN difficulty = 'hard' THEN 8
          ELSE 5
        END;
  END IF;
END $$;

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS source question_source NOT NULL DEFAULT 'database',
  ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES questions(id),
  ADD COLUMN IF NOT EXISTS structure_key VARCHAR(120) NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS estimated_time INTEGER NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS discrimination_score DOUBLE PRECISION NOT NULL DEFAULT 0.5;

ALTER TABLE questions
  DROP CONSTRAINT IF EXISTS questions_difficulty_check,
  ADD CONSTRAINT questions_difficulty_check CHECK (difficulty BETWEEN 1 AND 10);

CREATE INDEX IF NOT EXISTS ix_questions_source ON questions(source);
