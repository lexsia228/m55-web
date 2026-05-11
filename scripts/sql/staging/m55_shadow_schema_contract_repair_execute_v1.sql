-- =============================================================================
-- M55 Shadow-only: stripe_events / entitlements / entitlement_rights
-- contract repair (code-aligned DDL) + PostgREST reload + verification
--
-- TARGET: Supabase Shadow/Test ONLY (project ref must match your Shadow).
-- FORBIDDEN: Production DB, main branch edits, Stripe/Vercel changes.
--
-- Preconditions (human): Table Editor / SELECT confirms entitlements n=3 discard OK;
--   stripe_events n=0; entitlement_rights n=0 (or acceptable loss).
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS public.entitlement_rights CASCADE;
DROP TABLE IF EXISTS public.entitlements CASCADE;
DROP TABLE IF EXISTS public.stripe_events CASCADE;

CREATE TABLE public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  payload_hash text,
  CONSTRAINT stripe_events_event_id_key UNIQUE (event_id)
);

CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  product_id text NOT NULL,
  grant_type text NOT NULL,
  source text NOT NULL,
  status text NOT NULL,
  stripe_session_id text,
  CONSTRAINT entitlements_user_id_product_id_key UNIQUE (user_id, product_id)
);

CREATE TABLE public.entitlement_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  right_key text NOT NULL,
  right_value text NOT NULL,
  expires_at timestamptz,
  source text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlement_rights_user_id_right_key_key UNIQUE (user_id, right_key)
);

CREATE INDEX IF NOT EXISTS idx_entitlement_rights_user
  ON public.entitlement_rights (user_id);

CREATE INDEX IF NOT EXISTS idx_entitlement_rights_expires
  ON public.entitlement_rights (expires_at)
  WHERE expires_at IS NOT NULL;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- -----------------------------------------------------------------------------
-- Verification (read-only semantics; expect single row all_checks_pass = true)
-- -----------------------------------------------------------------------------
WITH
col AS (
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('stripe_events', 'entitlements', 'entitlement_rights')
),
uniq AS (
  SELECT
    con.conrelid::regclass::text AS relname,
    con.conname,
    pg_get_constraintdef(con.oid) AS def
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname IN ('stripe_events', 'entitlements', 'entitlement_rights')
    AND con.contype = 'u'
)
SELECT
  -- stripe_events
  EXISTS (SELECT 1 FROM col WHERE table_name = 'stripe_events' AND column_name = 'event_id')
    AND EXISTS (SELECT 1 FROM col WHERE table_name = 'stripe_events' AND column_name = 'event_type')
    AS stripe_events_event_id_event_type_ok,
  EXISTS (
    SELECT 1 FROM uniq
    WHERE relname = 'stripe_events'
      AND def ILIKE '%event_id%'
      AND def ILIKE '%UNIQUE%'
  ) AS stripe_events_unique_event_id_ok,
  -- entitlements
  (SELECT data_type FROM col WHERE table_name = 'entitlements' AND column_name = 'user_id' LIMIT 1) IN ('text', 'character varying')
    AS entitlements_user_id_text_ok,
  EXISTS (SELECT 1 FROM col WHERE table_name = 'entitlements' AND column_name = 'stripe_session_id')
    AS entitlements_stripe_session_id_ok,
  EXISTS (
    SELECT 1 FROM uniq
    WHERE relname = 'entitlements'
      AND def ILIKE '%user_id%'
      AND def ILIKE '%product_id%'
  ) AS entitlements_unique_user_product_ok,
  -- entitlement_rights
  EXISTS (SELECT 1 FROM col WHERE table_name = 'entitlement_rights' AND column_name = 'user_id')
    AND EXISTS (SELECT 1 FROM col WHERE table_name = 'entitlement_rights' AND column_name = 'right_value')
    AND EXISTS (SELECT 1 FROM col WHERE table_name = 'entitlement_rights' AND column_name = 'source')
    AND EXISTS (SELECT 1 FROM col WHERE table_name = 'entitlement_rights' AND column_name = 'updated_at')
    AS entitlement_rights_columns_ok,
  EXISTS (
    SELECT 1 FROM uniq
    WHERE relname = 'entitlement_rights'
      AND def ILIKE '%user_id%'
      AND def ILIKE '%right_key%'
  ) AS entitlement_rights_unique_user_right_ok,
  -- rollup
  (
    EXISTS (SELECT 1 FROM col WHERE table_name = 'stripe_events' AND column_name = 'event_id')
    AND EXISTS (SELECT 1 FROM col WHERE table_name = 'stripe_events' AND column_name = 'event_type')
    AND EXISTS (
      SELECT 1 FROM uniq
      WHERE relname = 'stripe_events'
        AND def ILIKE '%event_id%'
        AND def ILIKE '%UNIQUE%'
    )
    AND (SELECT data_type FROM col WHERE table_name = 'entitlements' AND column_name = 'user_id' LIMIT 1) IN ('text', 'character varying')
    AND EXISTS (SELECT 1 FROM col WHERE table_name = 'entitlements' AND column_name = 'stripe_session_id')
    AND EXISTS (
      SELECT 1 FROM uniq
      WHERE relname = 'entitlements'
        AND def ILIKE '%user_id%'
        AND def ILIKE '%product_id%'
    )
    AND EXISTS (SELECT 1 FROM col WHERE table_name = 'entitlement_rights' AND column_name = 'user_id')
    AND EXISTS (SELECT 1 FROM col WHERE table_name = 'entitlement_rights' AND column_name = 'right_value')
    AND EXISTS (SELECT 1 FROM col WHERE table_name = 'entitlement_rights' AND column_name = 'source')
    AND EXISTS (SELECT 1 FROM col WHERE table_name = 'entitlement_rights' AND column_name = 'updated_at')
    AND EXISTS (
      SELECT 1 FROM uniq
      WHERE relname = 'entitlement_rights'
        AND def ILIKE '%user_id%'
        AND def ILIKE '%right_key%'
    )
  ) AS all_checks_pass;
