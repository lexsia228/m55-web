-- ============================================================================
-- READ-ONLY PREFLIGHT — m55-soul-shadow (or ANY non-production) bootstrap prep
-- Path: scripts/sql/staging/m55_reply_wallet_shadow_bootstrap_preflight.sql
--
-- PRODUCTION EXECUTION FORBIDDEN. Use only after Dashboard confirms NON-PROD project ref.
--
-- Purpose: Inspect schema before manually applying migrations from BOOTSTRAP_PLAN.
-- SELECT only — no ALTER / DROP / CREATE / UPDATE / INSERT / DELETE / NOTIFY.
--
-- Related: docs/ssot/M55_REPLY_WALLET_SHADOW_SCHEMA_BOOTSTRAP_PLAN_v1.md
--
-- ============================================================================


-- -----------------------------------------------------------------------------
-- P0 — Environment sanity (paste result in ticket — no secrets)
-- -----------------------------------------------------------------------------
SELECT current_database() AS current_database;


-- -----------------------------------------------------------------------------
-- 1 — public schema: table inventory
-- -----------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;


-- -----------------------------------------------------------------------------
-- 2 — public.entitlements: column list (0 rows if table missing)
-- -----------------------------------------------------------------------------
SELECT
  c.column_name,
  c.ordinal_position,
  c.data_type,
  c.is_nullable,
  c.column_default
FROM information_schema.columns AS c
WHERE c.table_schema = 'public'
  AND c.table_name = 'entitlements'
ORDER BY c.ordinal_position;


-- -----------------------------------------------------------------------------
-- 3 — Required objects for Phase A PART 1 (boolean flags; no errors if missing)
-- -----------------------------------------------------------------------------
SELECT
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'stripe_events'
  ) AS has_public_stripe_events,
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'entitlements'
  ) AS has_public_entitlements,
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'reply_ticket_wallets'
  ) AS has_reply_ticket_wallets,
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'reply_wallet_ledgers'
  ) AS has_reply_wallet_ledgers,
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'reply_sessions'
  ) AS has_reply_sessions,
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'reply_documents'
  ) AS has_reply_documents,
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'dtr_report_snapshots'
  ) AS has_dtr_report_snapshots,
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'dtr_guest_drafts'
  ) AS has_dtr_guest_drafts,
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'entitlement_rights'
  ) AS has_entitlement_rights,
  EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'one_time_fulfillments'
  ) AS has_one_time_fulfillments;


-- -----------------------------------------------------------------------------
-- 4 — Supabase migration bookkeeping (optional; may error if schema absent)
--    If this errors, record "N/A" and use §4.2 in execution packet instead.
-- -----------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'supabase_migrations'
ORDER BY table_name;

-- If `schema_migrations` exists, list applied versions (read-only):
-- SELECT version, name
-- FROM supabase_migrations.schema_migrations
-- ORDER BY version;
-- (Uncomment only if prior query shows schema_migrations table name matches your host.)


-- -----------------------------------------------------------------------------
-- 5 — entitlements row count (safe: returns NULL if table missing)
-- -----------------------------------------------------------------------------
SELECT CASE
  WHEN EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'entitlements'
  )
  THEN (SELECT COUNT(*)::bigint FROM public.entitlements)
END AS entitlements_row_count;


-- -----------------------------------------------------------------------------
-- 6 — RPC presence (optional)
-- -----------------------------------------------------------------------------
SELECT
  p.proname::text AS function_name
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'm55_reply_generate_commit';

-- END
