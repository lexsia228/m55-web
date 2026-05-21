-- ENGINE-IMPL-B3-C / B3-D — m55-soul-core PRODUCTION preflight ONLY (no DDL in this file)
-- Run BEFORE Production apply. STOP if any fail condition in planning SSOT.
-- Forbidden: SELECT * ; raw user_id ; secrets in ticket paste

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 0 — Human target confirmation (ticket only)
-- ═══════════════════════════════════════════════════════════════════════════
-- target_safe_label: m55-soul-core
-- environment: PRODUCTION / main
-- m55-soul-shadow_used: no
-- jonlynrbfveaprncyrmv_used: no

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1 — Table exists
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_dtr_report_snapshots_table_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2 — New columns must NOT exist yet (STOP if 1)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_engine_context_json_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'engine_context_json';

SELECT 'PREFLIGHT_engine_version_exists' AS metric,
       count(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'engine_version';

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3 — Baseline row count (record integer; must match post-apply)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_snapshot_row_count' AS metric,
       count(*)::bigint AS value
  FROM public.dtr_report_snapshots;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4 — Related artifact counts (unchanged after additive DDL)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 'PREFLIGHT_entitlements_count' AS metric,
       count(*)::bigint AS value
  FROM public.entitlements;

SELECT 'PREFLIGHT_entitlement_rights_count' AS metric,
       count(*)::bigint AS value
  FROM public.entitlement_rights;

SELECT 'PREFLIGHT_reply_ticket_wallets_count' AS metric,
       count(*)::bigint AS value
  FROM public.reply_ticket_wallets;

-- PASS heuristics (planning SSOT):
--   PREFLIGHT_dtr_report_snapshots_table_exists = 1
--   PREFLIGHT_engine_context_json_exists = 0
--   PREFLIGHT_engine_version_exists = 0
--   PREFLIGHT_snapshot_row_count = N (record N for postflight equality)
