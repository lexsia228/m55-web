-- M55 Reply system data layer v1 (2026-04-16)
-- SSOT: docs/ssot/M55_REPLY_DATA_MODEL_AND_DB_CONTRACT_v1.md
-- Tables: reply_sessions, reply_documents, reply_ticket_wallets, reply_wallet_ledgers

-- ── ReplySession
CREATE TABLE IF NOT EXISTS reply_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL
    CHECK (length(btrim(user_id)) > 0),
  theme text NOT NULL
    CHECK (length(btrim(theme)) > 0),
  input_mode text NOT NULL
    CHECK (length(btrim(input_mode)) > 0),
  selected_subquestions_json jsonb NOT NULL
    CHECK (jsonb_typeof(selected_subquestions_json) = 'array'),
  free_text text,
  schema_version text NOT NULL DEFAULT '1.1'
    CHECK (schema_version = '1.1'),
  idempotency_key text NOT NULL
    CHECK (length(btrim(idempotency_key)) > 0),
  status text NOT NULL
    CHECK (status IN ('accepted', 'generating', 'succeeded', 'failed', 'cancelled')),
  core_profile_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_reply_sessions_user_created
  ON reply_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reply_sessions_status
  ON reply_sessions (status);

-- ── ReplyTicketWallet (1 row per user)
CREATE TABLE IF NOT EXISTS reply_ticket_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  initial_included_count integer NOT NULL
    CHECK (initial_included_count >= 0),
  purchased_count integer NOT NULL
    CHECK (purchased_count >= 0),
  consumed_count integer NOT NULL
    CHECK (consumed_count >= 0),
  available_count integer NOT NULL
    CHECK (available_count >= 0),
  status text NOT NULL
    CHECK (status IN ('active', 'suspended', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    available_count = initial_included_count + purchased_count - consumed_count
  )
);

CREATE INDEX IF NOT EXISTS idx_reply_ticket_wallets_status
  ON reply_ticket_wallets (status);

-- ── ReplyDocument (0..1 per session)
CREATE TABLE IF NOT EXISTS reply_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_session_id uuid NOT NULL UNIQUE
    REFERENCES reply_sessions (id) ON DELETE CASCADE,
  user_id text NOT NULL
    CHECK (length(btrim(user_id)) > 0),
  theme text NOT NULL
    CHECK (length(btrim(theme)) > 0),
  payload_json jsonb NOT NULL
    CHECK (jsonb_typeof(payload_json) = 'object'),
  version text NOT NULL
    CHECK (length(btrim(version)) > 0 AND version = '1.1'),
  generator_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (payload_json->>'version') IS NOT NULL
    AND (payload_json->>'version') = version
  ),
  CHECK (
    (payload_json->>'theme') IS NOT NULL
    AND (payload_json->>'theme') = theme
  )
);

CREATE INDEX IF NOT EXISTS idx_reply_documents_user_created
  ON reply_documents (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reply_documents_theme
  ON reply_documents (theme);

-- ── WalletLedger (audit)
CREATE TABLE IF NOT EXISTS reply_wallet_ledgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL
    CHECK (length(btrim(user_id)) > 0),
  wallet_id uuid NOT NULL
    REFERENCES reply_ticket_wallets (id) ON DELETE CASCADE,
  reply_session_id uuid
    REFERENCES reply_sessions (id) ON DELETE SET NULL,
  delta integer NOT NULL,
  balance_after integer NOT NULL
    CHECK (balance_after >= 0),
  event_type text NOT NULL
    CHECK (event_type IN (
      'included_grant',
      'purchase_grant',
      'reply_consume',
      'recovery_adjust',
      'admin_adjust'
    )),
  source_of_grant text
    CHECK (
      source_of_grant IS NULL
      OR source_of_grant IN ('PURCHASE', 'INCLUDED', 'RECOVERY', 'ADMIN_ADJUST')
    ),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (
      event_type = 'reply_consume'
      AND delta < 0
      AND reply_session_id IS NOT NULL
    )
    OR (
      event_type IN ('included_grant', 'purchase_grant')
      AND delta > 0
    )
    OR (
      event_type IN ('recovery_adjust', 'admin_adjust')
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_reply_wallet_ledgers_wallet_created
  ON reply_wallet_ledgers (wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reply_wallet_ledgers_user_created
  ON reply_wallet_ledgers (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reply_wallet_ledgers_session
  ON reply_wallet_ledgers (reply_session_id)
  WHERE reply_session_id IS NOT NULL;
