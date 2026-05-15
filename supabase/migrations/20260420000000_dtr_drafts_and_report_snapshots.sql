-- Guest draft (server SSOT) + immutable purchased Entry Report snapshot
-- Draft: pre-login intake; linked to Clerk user_id after login / sync
-- Snapshot: fixed at fulfillment time; /dtr/core reads this for paid body

CREATE TABLE IF NOT EXISTS dtr_guest_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname text NOT NULL,
  birth_date date NOT NULL,
  extra_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id text,
  linked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dtr_guest_drafts_user_id ON dtr_guest_drafts(user_id)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dtr_guest_drafts_updated ON dtr_guest_drafts(updated_at DESC);

COMMENT ON TABLE dtr_guest_drafts IS 'Server-side draft for free intake; cookie holds draft UUID; promote links user_id.';

CREATE TABLE IF NOT EXISTS dtr_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  product_id text NOT NULL,
  checkout_session_id text,
  profile_snapshot jsonb NOT NULL,
  draft_snapshot jsonb,
  envelope_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_dtr_report_snapshots_user ON dtr_report_snapshots(user_id);

COMMENT ON TABLE dtr_report_snapshots IS 'Immutable Entry Report at purchase; envelope_json is full DtrEnvelope.';
