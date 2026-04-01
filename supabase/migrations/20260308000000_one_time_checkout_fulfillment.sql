-- M55 One-time Checkout Fulfillment (2026-03-08)
-- Idempotency and audit for mode=payment checkout.session.completed.
-- Used only by webhook one-time lane. Subscription/invoice lane unchanged.

CREATE TABLE IF NOT EXISTS one_time_fulfillments (
  checkout_session_id text PRIMARY KEY,
  payment_intent_id text,
  event_id text NOT NULL,
  user_id text NOT NULL,
  product_id text NOT NULL,
  fulfilled_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_one_time_fulfillments_event ON one_time_fulfillments(event_id);
CREATE INDEX IF NOT EXISTS idx_one_time_fulfillments_pi ON one_time_fulfillments(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_one_time_fulfillments_user ON one_time_fulfillments(user_id);

-- Manual recovery queue: failed fulfillment (client_reference_id missing, product mismatch, etc.)
CREATE TABLE IF NOT EXISTS failed_fulfillments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  checkout_session_id text NOT NULL,
  failure_reason text NOT NULL,
  raw_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_failed_fulfillments_event ON failed_fulfillments(event_id);
CREATE INDEX IF NOT EXISTS idx_failed_fulfillments_session ON failed_fulfillments(checkout_session_id);
