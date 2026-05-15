-- M55 Phase 1 Entitlements SSOT (2026-03-06)
-- 権利のSSOTテーブル。既存 stripe_events / entitlements と併存。
-- 秘密値は含まない。env/DBに Stripe price id 等を設定すること。

-- stripe_events: 冪等化用。既存の場合があるので ADD COLUMN のみ。
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS processed_at timestamptz DEFAULT now();
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE stripe_events ADD COLUMN IF NOT EXISTS payload_hash text;

-- purchases: 購入記録
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  canonical_product_id text NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  stripe_event_id text,
  meta_json jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product ON purchases(canonical_product_id);

-- subscriptions: サブスク状態
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id text PRIMARY KEY,
  tier text NOT NULL CHECK (tier IN ('free','standard','premium')),
  status text NOT NULL,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz DEFAULT now()
);

-- entitlement_rights: 権利のSSOT（right_key ベース）
CREATE TABLE IF NOT EXISTS entitlement_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  right_key text NOT NULL,
  right_value text NOT NULL,
  expires_at timestamptz,
  source text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, right_key)
);

CREATE INDEX IF NOT EXISTS idx_entitlement_rights_user ON entitlement_rights(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlement_rights_expires ON entitlement_rights(expires_at) WHERE expires_at IS NOT NULL;
