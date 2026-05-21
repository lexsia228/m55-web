-- CORE-DTR-SOFT-HIDE-REPURCHASE-B1 — Production preflight DRAFT (m55-soul-core) READ ONLY
-- Migration: supabase/migrations/20260615000000_dtr_report_snapshots_soft_hide_repurchase.sql
-- Forbidden: SELECT * ; DML ; raw user_id / email / session / Stripe IDs / secrets in ticket paste
-- target_safe_label: m55-soul-core
-- APPLY MIGRATION: NO — Human GO required for B2-S / Production apply gate only
-- Run counts-only before any Production schema change.

-- ═══════════════════════════════════════════════════════════════════════════
-- A. Table presence
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_dtr_report_snapshots_table_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots';

-- ═══════════════════════════════════════════════════════════════════════════
-- B. Row counts (aggregates only)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_dtr_report_snapshots_total' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots;

SELECT 'PREFLIGHT_dtr_report_snapshots_dtr_core_product' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE product_id = 'DTR_CORE_STATIC_V1';

-- ═══════════════════════════════════════════════════════════════════════════
-- C. Duplicate pairs (STOP if > 0) — pre-migration all rows count as visible
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_legacy_duplicate_user_product_pairs' AS metric,
       count(*)::bigint AS value
  FROM (
    SELECT user_id, product_id
      FROM public.dtr_report_snapshots
     GROUP BY user_id, product_id
    HAVING count(*) > 1
  ) dup;

-- Post-migration only (B2-S): visible_duplicate via user_hidden_at IS NULL.

-- ═══════════════════════════════════════════════════════════════════════════
-- D. Constraint / index discovery
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_unique_constraints' AS metric,
       c.conname AS constraint_name,
       pg_get_constraintdef(c.oid) AS definition
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
 WHERE n.nspname = 'public'
   AND t.relname = 'dtr_report_snapshots'
   AND c.contype = 'u';

SELECT 'PREFLIGHT_indexes' AS metric,
       i.indexname AS index_name,
       i.indexdef AS definition
  FROM pg_indexes i
 WHERE i.schemaname = 'public'
   AND i.tablename = 'dtr_report_snapshots';

-- ═══════════════════════════════════════════════════════════════════════════
-- E. Soft-hide columns (pre-apply expect 0)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_user_hidden_at_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_at';

SELECT 'PREFLIGHT_user_hidden_source_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_source';

SELECT 'PREFLIGHT_user_hidden_reason_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_reason';

SELECT 'PREFLIGHT_partial_unique_index_exists' AS metric,
       count(*)::bigint AS value
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename = 'dtr_report_snapshots'
   AND indexname = 'dtr_report_snapshots_one_visible_per_user_product_uq';

-- ═══════════════════════════════════════════════════════════════════════════
-- F. Engine v2 legacy NULL counts
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_nonnull_engine_context_json_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE engine_context_json IS NOT NULL;

SELECT 'PREFLIGHT_nonnull_engine_version_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE engine_version IS NOT NULL;

SELECT 'PREFLIGHT_legacy_engine_context_json_null_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE engine_context_json IS NULL;

SELECT 'PREFLIGHT_legacy_engine_version_null_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots
 WHERE engine_version IS NULL;

-- PASS (Production apply gate):
--   legacy_duplicate_user_product_pairs = 0
--   unique constraint name matches migration DROP target
-- STOP: duplicate > 0 | failed_fulfillments_24h > 0 (ops policy) | apply without staging GREEN
