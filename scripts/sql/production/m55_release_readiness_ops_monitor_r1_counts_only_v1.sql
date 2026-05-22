-- RELEASE-READINESS-OPS-MONITOR-R1 — m55-soul-core PRODUCTION counts-only (READ ONLY)
-- Gate: post soft-hide PARTIAL_READY close / release readiness ops monitor
-- Forbidden: SELECT * ; DML ; raw user_id / email / session / secrets in ticket paste
-- target_safe_label: m55-soul-core

-- ═══ 1. failed_fulfillments ═══
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

-- ═══ 2. DTR artifacts (aggregate only) ═══
SELECT COUNT(*)::bigint AS entitlements_dtr_total
  FROM public.entitlements
 WHERE product_id = 'DTR_CORE_STATIC_V1';

SELECT COUNT(*)::bigint AS dtr_report_snapshots_dtr_total
  FROM public.dtr_report_snapshots
 WHERE product_id = 'DTR_CORE_STATIC_V1';

SELECT COUNT(*)::bigint AS dtr_report_snapshots_visible_total
  FROM public.dtr_report_snapshots
 WHERE product_id = 'DTR_CORE_STATIC_V1'
   AND user_hidden_at IS NULL;

SELECT COUNT(*)::bigint AS dtr_report_snapshots_hidden_total
  FROM public.dtr_report_snapshots
 WHERE product_id = 'DTR_CORE_STATIC_V1'
   AND user_hidden_at IS NOT NULL;

SELECT COUNT(*)::bigint AS user_hidden_at_nonnull_count
  FROM public.dtr_report_snapshots
 WHERE user_hidden_at IS NOT NULL;

SELECT COUNT(*)::bigint AS one_time_fulfillments_total
  FROM public.one_time_fulfillments;

SELECT COUNT(*)::bigint AS reply_ticket_wallets_total
  FROM public.reply_ticket_wallets;

SELECT COUNT(*)::bigint AS reply_wallet_ledgers_total
  FROM public.reply_wallet_ledgers;

-- ═══ 3. soft-hide schema health ═══
SELECT 'user_hidden_at_exists' AS metric,
       COUNT(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_at';

SELECT 'user_hidden_source_exists' AS metric,
       COUNT(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_source';

SELECT 'user_hidden_reason_exists' AS metric,
       COUNT(*)::bigint AS value
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'dtr_report_snapshots'
   AND column_name = 'user_hidden_reason';

SELECT 'partial_unique_index_exists' AS metric,
       COUNT(*)::bigint AS value
  FROM pg_indexes
 WHERE schemaname = 'public'
   AND tablename = 'dtr_report_snapshots'
   AND indexname = 'dtr_report_snapshots_one_visible_per_user_product_uq';

SELECT COUNT(*)::bigint AS visible_duplicate_user_product_pairs
  FROM (
    SELECT user_id, product_id
      FROM public.dtr_report_snapshots
     WHERE user_hidden_at IS NULL
     GROUP BY user_id, product_id
    HAVING COUNT(*) > 1
  ) dup;

-- GREEN heuristics (Human / R1-R):
--   failed_fulfillments_24h = 0
--   visible_duplicate_user_product_pairs = 0
--   user_hidden_* column exists = 1 each
--   partial_unique_index_exists = 1
-- STOP / RED:
--   failed_fulfillments_24h > 0
--   visible_duplicate_user_product_pairs > 0
--   schema metrics = 0
