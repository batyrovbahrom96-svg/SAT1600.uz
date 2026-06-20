ALTER TABLE users
  ADD COLUMN IF NOT EXISTS track_type VARCHAR(24),
  ADD COLUMN IF NOT EXISTS selected_track_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS curriculum_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_name VARCHAR(255) NOT NULL,
  domain VARCHAR(40) NOT NULL,
  order_index INTEGER NOT NULL,
  overview_text TEXT NOT NULL,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_curriculum_units_domain_order UNIQUE (domain, order_index)
);

CREATE INDEX IF NOT EXISTS ix_curriculum_units_domain_order
  ON curriculum_units(domain, order_index);

INSERT INTO curriculum_units (unit_name, domain, order_index, overview_text, topics)
VALUES
  (
    'Information & Ideas',
    'reading_writing',
    1,
    'Learn how SAT Reading questions ask for central ideas, details, inferences, and evidence. This unit teaches students to prove every answer from the text instead of guessing from memory.',
    '["Central Ideas & Details", "Inferences", "Command of Evidence (Textual)", "Command of Evidence (Quantitative)"]'::jsonb
  ),
  (
    'Craft & Structure',
    'reading_writing',
    2,
    'Learn how authors build meaning through word choice, structure, purpose, and connections between texts. This unit trains precise reading rather than surface-level translation.',
    '["Words in Context", "Text Structure & Purpose", "Cross-Text Connections"]'::jsonb
  ),
  (
    'Expression of Ideas',
    'reading_writing',
    3,
    'Learn how SAT Writing questions test logical flow and how information should be combined. This unit focuses on transitions and rhetorical synthesis.',
    '["Rhetorical Synthesis", "Transitions"]'::jsonb
  ),
  (
    'Standard English Conventions',
    'reading_writing',
    4,
    'Learn the grammar and punctuation rules that make sentences clear and complete. This unit focuses on boundaries plus form, structure, and sense.',
    '["Boundaries (punctuation)", "Form, Structure, and Sense"]'::jsonb
  ),
  (
    'Algebra',
    'math',
    5,
    'Build the algebra base needed for SAT Math. Students learn to translate situations into equations, functions, systems, and inequalities.',
    '["Linear equations (one variable)", "Linear equations (two variables)", "Linear functions", "Systems of linear equations", "Linear inequalities"]'::jsonb
  ),
  (
    'Advanced Math',
    'math',
    6,
    'Move from basic equations into expressions, nonlinear equations, and functions. This unit teaches structure recognition instead of memorizing isolated tricks.',
    '["Equivalent expressions", "Nonlinear equations", "Nonlinear functions"]'::jsonb
  ),
  (
    'Problem-Solving & Data Analysis',
    'math',
    7,
    'Learn the SAT skills behind rates, percents, distributions, models, and probability. This unit keeps units and context attached to the math.',
    '["Ratios, rates, proportions", "Percentages", "One-variable data distributions", "Two-variable data models", "Probability"]'::jsonb
  ),
  (
    'Geometry & Trigonometry',
    'math',
    8,
    'Learn the geometry and trig tools needed for SAT diagrams and measurement questions. This unit focuses on shapes, angles, triangles, circles, area, and volume.',
    '["Area and volume", "Lines, angles, triangles", "Right triangle trigonometry", "Circles"]'::jsonb
  )
ON CONFLICT (domain, order_index) DO UPDATE
SET
  unit_name = EXCLUDED.unit_name,
  overview_text = EXCLUDED.overview_text,
  topics = EXCLUDED.topics,
  updated_at = NOW();

CREATE INDEX IF NOT EXISTS ix_users_track_type
  ON users(track_type, selected_track_at);
