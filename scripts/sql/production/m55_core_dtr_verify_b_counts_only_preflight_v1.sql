-- CORE-DTR-VERIFY-B — m55-soul-core PRODUCTION counts-only preflight (READ ONLY)
-- Forbidden: SELECT * ; DML ; raw user_id in ticket paste
-- target_safe_label: m55-soul-core

-- A. failed_fulfillments
SELECT COUNT(*)::bigint AS failed_fulfillments_total
  FROM public.failed_fulfillments;

SELECT COUNT(*)::bigint AS failed_fulfillments_24h
  FROM public.failed_fulfillments
 WHERE created_at >= NOW() - INTERVAL '24 hours';

SELECT failure_reason AS safe_failure_category,
       COUNT(*)::bigint AS category_count
  FROM public.failed_fulfillments
 GROUP BY failure_reason
 ORDER BY failure_reason;

-- B. Artifact totals (global)
SELECT COUNT(*)::bigint AS entitlements_dtr_total
  FROM public.entitlements
 WHERE product_id = 'DTR_CORE_STATIC_V1';

SELECT COUNT(*)::bigint AS dtr_report_snapshots_dtr_total
  FROM public.dtr_report_snapshots
 WHERE product_id = 'DTR_CORE_STATIC_V1';

SELECT COUNT(*)::bigint AS dtr_report_snapshots_total
  FROM public.dtr_report_snapshots;

SELECT COUNT(*)::bigint AS one_time_fulfillments_total
  FROM public.one_time_fulfillments;

SELECT COUNT(*)::bigint AS reply_ticket_wallets_total
  FROM public.reply_ticket_wallets;

SELECT COUNT(*)::bigint AS reply_wallet_ledgers_total
  FROM public.reply_wallet_ledgers;

-- C. v2 columns (expect legacy NULL only until flag ON + new purchase)
SELECT COUNT(*)::bigint AS nonnull_engine_context_json_count
  FROM public.dtr_report_snapshots
 WHERE engine_context_json IS NOT NULL;

SELECT COUNT(*)::bigint AS nonnull_engine_version_count
  FROM public.dtr_report_snapshots
 WHERE engine_version IS NOT NULL;

SELECT COUNT(*)::bigint AS legacy_engine_context_json_null_count
  FROM public.dtr_report_snapshots
 WHERE engine_context_json IS NULL;

SELECT COUNT(*)::bigint AS legacy_engine_version_null_count
  FROM public.dtr_report_snapshots
 WHERE engine_version IS NULL;

-- PASS heuristics (VERIFY-B):
--   failed_fulfillments_24h = 0
--   nonnull_engine_* = 0 (unless documented v2 purchase)
--   legacy_engine_*_null_count = dtr_report_snapshots_total (currently 6)
