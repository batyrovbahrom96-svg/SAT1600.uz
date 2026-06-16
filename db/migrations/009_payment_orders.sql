CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference VARCHAR(16) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_type VARCHAR(24) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'UZS',
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  estimated_score INTEGER,
  weak_areas JSONB NOT NULL DEFAULT '[]',
  telegram_chat_id VARCHAR(80),
  telegram_username VARCHAR(255),
  telegram_phone VARCHAR(40),
  screenshot_file_id VARCHAR(255),
  admin_message_id VARCHAR(80),
  activation_date TIMESTAMP,
  expiry_date TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_payment_orders_reference ON payment_orders(reference);
CREATE INDEX IF NOT EXISTS ix_payment_orders_status_created ON payment_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_payment_orders_user_created ON payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_payment_orders_telegram_chat ON payment_orders(telegram_chat_id);
