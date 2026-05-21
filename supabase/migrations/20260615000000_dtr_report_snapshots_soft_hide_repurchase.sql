-- CORE-DTR-SOFT-HIDE-REPURCHASE-B1 — dtr_report_snapshots soft-hide + visible-only partial unique
-- Policy: docs/ssot/M55_PHASE5_6H_5Z_I_V_CORE_DTR_SOFT_HIDE_REPURCHASE_B_SCHEMA_MIGRATION_PLANNING_2026-05-21.md
-- Apply only after preflight GREEN: visible_duplicate_pairs = 0 (staging/production preflight v1).
-- Forbidden in this migration: DELETE, TRUNCATE, DROP TABLE, UPDATE of snapshot body columns.

-- ── 1. Soft-hide columns (additive; existing rows remain visible: user_hidden_at NULL) ──
ALTER TABLE public.dtr_report_snapshots
  ADD COLUMN IF NOT EXISTS user_hidden_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS user_hidden_source text NULL,
  ADD COLUMN IF NOT EXISTS user_hidden_reason text NULL;

COMMENT ON COLUMN public.dtr_report_snapshots.user_hidden_at IS
  'NULL = user-visible saved report; non-null = user 削除 (soft hide) at timestamp.';

COMMENT ON COLUMN public.dtr_report_snapshots.user_hidden_source IS
  'Channel that set hide: my_panel | dtr_shelf | admin_support.';

COMMENT ON COLUMN public.dtr_report_snapshots.user_hidden_reason IS
  'Optional non-PII slug for support correlation; no freeform PII.';

-- ── 2. Drop legacy UNIQUE(user_id, product_id) — name discovered via preflight ──
-- Default PG name from 20260420000000_dtr_drafts_and_report_snapshots.sql:
ALTER TABLE public.dtr_report_snapshots
  DROP CONSTRAINT IF EXISTS dtr_report_snapshots_user_id_product_id_key;

-- Fallback: drop any remaining UNIQUE on exactly (user_id, product_id) if name differs per environment.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
     WHERE n.nspname = 'public'
       AND t.relname = 'dtr_report_snapshots'
       AND c.contype = 'u'
       AND pg_get_constraintdef(c.oid) ~ '\(user_id, product_id\)'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.dtr_report_snapshots DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

-- ── 3. Visible-only partial unique (repurchase INSERT when prior rows hidden) ──
-- FAILS at apply time if >1 visible row per (user_id, product_id) — run preflight first.
CREATE UNIQUE INDEX IF NOT EXISTS dtr_report_snapshots_one_visible_per_user_product_uq
  ON public.dtr_report_snapshots (user_id, product_id)
  WHERE (user_hidden_at IS NULL);

NOTIFY pgrst, 'reload schema';
