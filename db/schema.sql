CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE sat_section AS ENUM ('reading_writing', 'math');
CREATE TYPE question_format AS ENUM ('multiple_choice', 'grid_in');
CREATE TYPE attempt_status AS ENUM ('in_progress', 'completed', 'expired');
CREATE TYPE question_source AS ENUM ('database', 'generated_variant');
CREATE TYPE choice_trap_role AS ENUM ('correct', 'common_mistake', 'conceptual_misunderstanding', 'extreme_wrong_logic');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'student',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID REFERENCES tests(id),
  section sat_section NOT NULL,
  module INTEGER NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
  adaptive_level VARCHAR(24) NOT NULL DEFAULT 'standard',
  source question_source NOT NULL DEFAULT 'database',
  parent_question_id UUID REFERENCES questions(id),
  topic VARCHAR(120) NOT NULL,
  subtopic VARCHAR(120),
  structure_key VARCHAR(120) NOT NULL DEFAULT 'standard',
  graph_path VARCHAR(500),
  graph_reasoning_type VARCHAR(80),
  graph_required BOOLEAN NOT NULL DEFAULT FALSE,
  data_type VARCHAR(24) NOT NULL DEFAULT 'none',
  data_payload JSONB NOT NULL DEFAULT '{}',
  passage TEXT,
  prompt TEXT NOT NULL,
  correct_answer VARCHAR(255) NOT NULL,
  explanation TEXT NOT NULL,
  trap_type VARCHAR(120),
  question_type VARCHAR(120) NOT NULL,
  format question_format NOT NULL,
  estimated_time INTEGER NOT NULL DEFAULT 75,
  discrimination_score DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  percent_correct DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  average_time_seconds DOUBLE PRECISION NOT NULL DEFAULT 75,
  drop_off_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  calibration_attempts INTEGER NOT NULL DEFAULT 0,
  calibration_confidence DOUBLE PRECISION NOT NULL DEFAULT 0,
  effective_difficulty DOUBLE PRECISION NOT NULL DEFAULT 5,
  confusion_index DOUBLE PRECISION NOT NULL DEFAULT 0,
  trap_efficiency DOUBLE PRECISION NOT NULL DEFAULT 0,
  time_pressure_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  quality_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  auto_quality_flag VARCHAR(40) NOT NULL DEFAULT 'insufficient_data',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  validation_status VARCHAR(40) NOT NULL DEFAULT 'needs_review',
  validation_notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE question_choices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  label VARCHAR(8) NOT NULL,
  text TEXT NOT NULL,
  trap_role choice_trap_role NOT NULL DEFAULT 'common_mistake',
  error_basis TEXT,
  CONSTRAINT uq_question_choice_label UNIQUE (question_id, label)
);

CREATE TABLE test_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  test_id UUID NOT NULL REFERENCES tests(id),
  current_section sat_section NOT NULL DEFAULT 'reading_writing',
  current_module INTEGER NOT NULL DEFAULT 1,
  route JSONB NOT NULL DEFAULT '{}',
  score_total INTEGER,
  score_reading_writing INTEGER,
  score_math INTEGER,
  status attempt_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  module_started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  module_deadline_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE question_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  selected_answer VARCHAR(255),
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  marked_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  module_snapshot INTEGER NOT NULL,
  answered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
);

CREATE TABLE question_exposures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  module_snapshot INTEGER NOT NULL,
  first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_attempt_question_exposure UNIQUE (attempt_id, question_id)
);

CREATE TABLE question_telemetry_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  module_snapshot INTEGER NOT NULL,
  selected_answer VARCHAR(255),
  previous_answer VARCHAR(255),
  answer_changed BOOLEAN NOT NULL DEFAULT FALSE,
  hesitation_seconds INTEGER NOT NULL DEFAULT 0,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  interaction_count INTEGER NOT NULL DEFAULT 1,
  raw_event JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE test_telemetry_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id UUID NOT NULL UNIQUE REFERENCES test_attempts(id) ON DELETE CASCADE,
  time_decay JSONB NOT NULL DEFAULT '{}',
  accuracy_by_block JSONB NOT NULL DEFAULT '{}',
  streak_patterns JSONB NOT NULL DEFAULT '{}',
  raw_logs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  attempt_id UUID REFERENCES test_attempts(id),
  score_progression JSONB NOT NULL DEFAULT '[]',
  topic_accuracy JSONB NOT NULL DEFAULT '{}',
  average_time_by_topic JSONB NOT NULL DEFAULT '{}',
  graph_performance JSONB NOT NULL DEFAULT '{}',
  careless_mistakes JSONB NOT NULL DEFAULT '[]',
  adaptive_route_history JSONB NOT NULL DEFAULT '{}',
  strengths JSONB NOT NULL DEFAULT '[]',
  weaknesses JSONB NOT NULL DEFAULT '[]',
  report TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE graph_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  graph_type VARCHAR(80) NOT NULL,
  path VARCHAR(500) NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'inactive',
  provider VARCHAR(80),
  provider_customer_id VARCHAR(255),
  current_period_end TIMESTAMP,
  price_amount NUMERIC(10, 2),
  currency VARCHAR(8) NOT NULL DEFAULT 'UZS',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_questions_sat_routing ON questions(test_id, section, module, adaptive_level, difficulty);
CREATE INDEX ix_questions_source ON questions(source);
CREATE INDEX ix_questions_topic ON questions(topic);
CREATE INDEX ix_questions_validation ON questions(validation_status, is_active);
CREATE INDEX ix_questions_quality_flag ON questions(auto_quality_flag);
CREATE INDEX ix_question_telemetry_question ON question_telemetry_logs(question_id, created_at);
CREATE INDEX ix_attempts_user ON test_attempts(user_id, started_at);
