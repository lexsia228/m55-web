-- M55 DTR_OWNER_IDENTITY_RECONCILIATION — Production read-only (counts + hash match only)
-- Target: m55-soul-core PRODUCTION
-- Gate: DTR_OWNER_IDENTITY_RECONCILIATION_READONLY
-- Forbidden: INSERT/UPDATE/DELETE/ALTER · SELECT * · raw user_id / email output
-- Operator: set params.operator_user_hash_hex16 locally ONLY (16-char sha256 prefix of Clerk user_id)
-- SSOT: docs/ssot/M55_DTR_OWNER_IDENTITY_RECONCILIATION_READONLY_2026-05-23.md

-- ═══ 0. Operator confirmation ═══
SELECT current_database()::text AS current_database_name;

-- ═══ 1. Production owner inventory (counts only) ═══
SELECT COUNT(DISTINCT s.user_id)::bigint AS dtr_owner_users
FROM public.dtr_report_snapshots AS s
WHERE s.product_id = 'DTR_CORE_STATIC_V1';

SELECT COUNT(DISTINCT s.user_id)::bigint AS visible_dtr_report_users
FROM public.dtr_report_snapshots AS s
WHERE s.product_id = 'DTR_CORE_STATIC_V1'
  AND s.user_hidden_at IS NULL;

SELECT COUNT(DISTINCT w.user_id)::bigint AS scoped_wallet_users
FROM public.reply_ticket_wallets AS w
WHERE w.report_instance_id IS NOT NULL;

SELECT COUNT(DISTINCT w.user_id)::bigint AS scoped_active_available_wallet_users
FROM public.reply_ticket_wallets AS w
WHERE w.report_instance_id IS NOT NULL
  AND w.status = 'active'
  AND w.available_count > 0;

-- ═══ 2. Controlled smoke-ready inventory (join snapshot + scoped active wallet) ═══
WITH smoke_ready AS (
  SELECT DISTINCT s.user_id
  FROM public.dtr_report_snapshots AS s
  INNER JOIN public.reply_ticket_wallets AS w
    ON btrim(w.user_id) = btrim(s.user_id)
   AND w.report_instance_id = s.id
  WHERE s.product_id = 'DTR_CORE_STATIC_V1'
    AND s.user_hidden_at IS NULL
    AND w.report_instance_id IS NOT NULL
    AND w.status = 'active'
    AND w.available_count > 0
)
SELECT COUNT(*)::bigint AS controlled_smoke_ready_users FROM smoke_ready;

SELECT COUNT(*)::bigint AS controlled_smoke_ready_wallets
FROM public.reply_ticket_wallets AS w
WHERE w.report_instance_id IS NOT NULL
  AND w.status = 'active'
  AND w.available_count > 0
  AND EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots AS s
    WHERE s.id = w.report_instance_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
      AND s.user_hidden_at IS NULL
  );

SELECT COALESCE(SUM(w.available_count), 0)::bigint AS controlled_smoke_ready_available_sum
FROM public.reply_ticket_wallets AS w
WHERE w.report_instance_id IS NOT NULL
  AND w.status = 'active'
  AND w.available_count > 0
  AND EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots AS s
    WHERE s.id = w.report_instance_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
      AND s.user_hidden_at IS NULL
  );

-- ═══ 3. S-5 guard (unchanged) ═══
SELECT COUNT(*)::bigint AS wallets_null_status_active
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active';

SELECT COUNT(*)::bigint AS wallets_cap_violation_rows
FROM public.reply_ticket_wallets
WHERE (initial_included_count + purchased_count) > 5
   OR purchased_count > 4
   OR available_count <> (initial_included_count + purchased_count - consumed_count);

-- ═══ 4. Current browser session match (operator hash · LOCAL param only) ═══
WITH params AS (
  SELECT CAST(NULL AS text) AS operator_user_hash_hex16
  -- LOCAL ONLY: 16-hex prefix from hashUserIdForLedgerLog(clerk_user_id)
)
SELECT
  (p.operator_user_hash_hex16 IS NOT NULL) AS operator_hash_bound_bool,
  (
    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (
        SELECT COUNT(*)::bigint
        FROM public.dtr_report_snapshots AS s
        CROSS JOIN params AS p2
        WHERE s.product_id = 'DTR_CORE_STATIC_V1'
          AND s.user_hidden_at IS NULL
          AND substring(
            encode(digest(convert_to(btrim(s.user_id), 'UTF8'), 'sha256'), 'hex'),
            1,
            16
          ) = btrim(lower(p2.operator_user_hash_hex16))
      )
    END
  ) AS operator_visible_snapshot_count,
  (
    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (
        SELECT COUNT(*)::bigint
        FROM public.reply_ticket_wallets AS w
        CROSS JOIN params AS p2
        WHERE w.report_instance_id IS NOT NULL
          AND w.status = 'active'
          AND w.available_count > 0
          AND substring(
            encode(digest(convert_to(btrim(w.user_id), 'UTF8'), 'sha256'), 'hex'),
            1,
            16
          ) = btrim(lower(p2.operator_user_hash_hex16))
      )
    END
  ) AS operator_smoke_ready_wallet_count
FROM params AS p;

-- Expected when current session is NOT owned:
--   operator_hash_bound + operator_visible_snapshot_count = 0
--   operator_smoke_ready_wallet_count = 0

-- ═══ 5. Payment backing signal (aggregate · no user filter) ═══
SELECT COUNT(*)::bigint AS one_time_fulfillments_dtr_core_total
FROM public.one_time_fulfillments
WHERE product_id = 'DTR_CORE_STATIC_V1';

SELECT COUNT(*)::bigint AS entitlements_dtr_core_active_total
FROM public.entitlements
WHERE product_id = 'DTR_CORE_STATIC_V1'
  AND status = 'active';

-- ═══ 6. Identity mapping table (if populated) ═══
SELECT COUNT(*)::bigint AS m55_user_identity_mappings_total
FROM public.m55_user_identity_mappings;

SELECT COUNT(*)::bigint AS m55_user_identity_mappings_active
FROM public.m55_user_identity_mappings
WHERE mapping_status = 'active';

-- NOTE: m55_user_identity_mappings seed = 0 rows expected unless Human populated separately
