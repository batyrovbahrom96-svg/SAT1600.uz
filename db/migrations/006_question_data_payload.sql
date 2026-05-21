ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS data_type VARCHAR(24) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS data_payload JSONB NOT NULL DEFAULT '{}';

UPDATE questions
SET data_type = CASE
    WHEN graph_path IS NOT NULL THEN 'graph'
    ELSE COALESCE(NULLIF(data_type, ''), 'none')
  END,
  data_payload = COALESCE(data_payload, '{}')
WHERE data_type IS NULL
   OR data_payload IS NULL
   OR graph_path IS NOT NULL;
