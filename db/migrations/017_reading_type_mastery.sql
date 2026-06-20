CREATE TABLE IF NOT EXISTS question_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_name VARCHAR(160) UNIQUE NOT NULL,
    type_name_uz VARCHAR(220) NOT NULL,
    order_index INTEGER NOT NULL UNIQUE,
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO question_types (type_name, type_name_uz, order_index, is_free)
VALUES
    ('Central Ideas & Details', 'Asosiy g''oyalar va tafsilotlar', 1, TRUE),
    ('Inferences', 'Xulosa chiqarish', 2, FALSE),
    ('Command of Evidence (Textual)', 'Matndan dalil topish', 3, FALSE),
    ('Command of Evidence (Quantitative)', 'Jadval va grafikdan dalil topish', 4, FALSE),
    ('Words in Context', 'Kontekstdagi so''zlar', 5, FALSE),
    ('Text Structure & Purpose', 'Matn tuzilishi va maqsadi', 6, FALSE),
    ('Cross-Text Connections', 'Ikki matn orasidagi bog''lanish', 7, FALSE),
    ('Rhetorical Synthesis', 'Ritorik sintez', 8, FALSE),
    ('Transitions', 'O''tish so''zlari', 9, FALSE),
    ('Boundaries (Punctuation)', 'Tinish belgilari chegaralari', 10, FALSE),
    ('Form, Structure, and Sense', 'Forma, tuzilish va ma''no', 11, FALSE),
    ('Reserved/Combined Review Unit', 'Umumiy takrorlash bo''limi', 12, FALSE)
ON CONFLICT (order_index) DO UPDATE
SET type_name = EXCLUDED.type_name,
    type_name_uz = EXCLUDED.type_name_uz,
    is_free = EXCLUDED.is_free;

CREATE TABLE IF NOT EXISTS user_type_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type_id UUID NOT NULL REFERENCES question_types(id) ON DELETE CASCADE,
    status VARCHAR(24) NOT NULL DEFAULT 'locked',
    best_score INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_questions JSONB NOT NULL DEFAULT '{}'::jsonb,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_type_progress_user_type UNIQUE (user_id, type_id)
);

CREATE INDEX IF NOT EXISTS ix_user_type_progress_user_id ON user_type_progress(user_id);
CREATE INDEX IF NOT EXISTS ix_user_type_progress_type_id ON user_type_progress(type_id);
CREATE INDEX IF NOT EXISTS ix_user_type_progress_status ON user_type_progress(status);
