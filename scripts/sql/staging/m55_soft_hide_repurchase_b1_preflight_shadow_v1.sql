-- CORE-DTR-SOFT-HIDE-REPURCHASE-B1 — Staging preflight (m55-soul-shadow) READ ONLY
-- Migration: supabase/migrations/20260615000000_dtr_report_snapshots_soft_hide_repurchase.sql
-- Forbidden: SELECT * ; DML ; raw user_id / email / session / Stripe IDs / secrets in ticket paste
-- target_safe_label: m55-soul-shadow
-- production_used: no
-- m55-soul-core_used: no
-- Apply migration: NO (B2 gate only after this preflight GREEN)

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
-- C. Duplicate pairs (STOP if value > 0)
-- Pre-migration: user_hidden_at absent — legacy count equals visible count.
-- Post-migration (B2-S): re-run visible_duplicate with user_hidden_at IS NULL.
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_legacy_duplicate_user_product_pairs' AS metric,
       count(*)::bigint AS value
  FROM (
    SELECT user_id, product_id
      FROM public.dtr_report_snapshots
     GROUP BY user_id, product_id
    HAVING count(*) > 1
  ) dup;

-- ═══════════════════════════════════════════════════════════════════════════
-- D. Constraint / index discovery (for migration DROP + partial unique)
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
-- E. Soft-hide columns (expect 0 before apply; 3 after apply in B2-S)
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
-- F. Engine v2 columns (legacy NULL counts — no PII)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_engine_context_json_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'engine_context_json';

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

-- ═══════════════════════════════════════════════════════════════════════════
-- PASS heuristics (B2 apply gate):
--   PREFLIGHT_dtr_report_snapshots_table_exists = 1
--   PREFLIGHT_legacy_duplicate_user_product_pairs = 0
--   PREFLIGHT_unique_constraints shows user_id+product_id (note conname for ticket)
-- STOP if legacy_duplicate > 0 OR constraint name unknown in migration comment
