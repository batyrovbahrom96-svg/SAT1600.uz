ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payer_full_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payer_phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP,
  ADD COLUMN IF NOT EXISTS renewal_reminders_sent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_renewal_reminder_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP;

UPDATE subscriptions
SET current_period_start = COALESCE(current_period_start, created_at)
WHERE current_period_start IS NULL
  AND status = 'active';

CREATE INDEX IF NOT EXISTS ix_subscriptions_status_period
  ON subscriptions(status, current_period_end);

CREATE INDEX IF NOT EXISTS ix_subscriptions_provider_customer
  ON subscriptions(provider_customer_id);
