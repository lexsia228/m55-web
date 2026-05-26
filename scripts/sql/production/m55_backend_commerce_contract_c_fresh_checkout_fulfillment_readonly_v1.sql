-- M55 BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT — Production read-only fulfillment attestation
-- Target: m55-soul-core PRODUCTION
-- Gates: FRESH-FULFILLMENT-R · FRESH-DTR-UNLOCK-R (post FRESH-CHECKOUT-D-EXEC only)
-- Forbidden: INSERT/UPDATE/DELETE/ALTER · SELECT * · raw user_id / email / Stripe session output
-- Operator: set params.operator_user_hash_hex16 locally ONLY (16-char sha256 prefix of Clerk user_id)
-- SSOT: docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_FRESH_CHECKOUT_E2E_PLANNING_2026-05-23.md

-- ═══ 0. Operator confirmation ═══
SELECT current_database()::text AS current_database_name;

-- ═══ 1. Global baseline (counts only · not cohort proof) ═══
SELECT COUNT(*)::bigint AS one_time_fulfillments_dtr_core_total
FROM public.one_time_fulfillments
WHERE product_id = 'DTR_CORE_STATIC_V1';

SELECT COUNT(*)::bigint AS entitlements_dtr_core_active_total
FROM public.entitlements
WHERE product_id = 'DTR_CORE_STATIC_V1'
  AND status = 'active';

SELECT COUNT(*)::bigint AS ledger_included_grant_total
FROM public.reply_wallet_ledgers
WHERE event_type = 'included_grant';

-- ═══ 2. S-5 guard (unchanged) ═══
SELECT COUNT(*)::bigint AS wallets_null_status_active
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL AND status = 'active';

SELECT COUNT(*)::bigint AS wallets_cap_violation_rows
FROM public.reply_ticket_wallets
WHERE (initial_included_count + purchased_count) > 5
   OR purchased_count > 4
   OR available_count <> (initial_included_count + purchased_count - consumed_count);

-- ═══ 3. Cohort band (operator hash · LOCAL param only) ═══
WITH params AS (
  SELECT CAST(NULL AS text) AS operator_user_hash_hex16
  -- LOCAL ONLY: 16-hex prefix from hashUserIdForLedgerLog(clerk_user_id)
),
cohort_users AS (
  SELECT DISTINCT btrim(s.user_id) AS user_id
  FROM public.dtr_report_snapshots AS s
  CROSS JOIN params AS p
  WHERE p.operator_user_hash_hex16 IS NOT NULL
    AND s.product_id = 'DTR_CORE_STATIC_V1'
    AND substring(
      encode(digest(convert_to(btrim(s.user_id), 'UTF8'), 'sha256'), 'hex'),
      1,
      16
    ) = btrim(lower(p.operator_user_hash_hex16))
  UNION
  SELECT DISTINCT btrim(o.user_id) AS user_id
  FROM public.one_time_fulfillments AS o
  CROSS JOIN params AS p
  WHERE p.operator_user_hash_hex16 IS NOT NULL
    AND o.product_id = 'DTR_CORE_STATIC_V1'
    AND substring(
      encode(digest(convert_to(btrim(o.user_id), 'UTF8'), 'sha256'), 'hex'),
      1,
      16
    ) = btrim(lower(p.operator_user_hash_hex16))
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
  ) AS cohort_visible_snapshot_count,
  (
    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (
        SELECT COUNT(*)::bigint
        FROM public.one_time_fulfillments AS o
        CROSS JOIN params AS p2
        WHERE o.product_id = 'DTR_CORE_STATIC_V1'
          AND substring(
            encode(digest(convert_to(btrim(o.user_id), 'UTF8'), 'sha256'), 'hex'),
            1,
            16
          ) = btrim(lower(p2.operator_user_hash_hex16))
      )
    END
  ) AS cohort_one_time_fulfillments_count,
  (
    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (
        SELECT COUNT(*)::bigint
        FROM public.entitlements AS e
        CROSS JOIN params AS p2
        WHERE e.product_id = 'DTR_CORE_STATIC_V1'
          AND e.status = 'active'
          AND substring(
            encode(digest(convert_to(btrim(e.user_id), 'UTF8'), 'sha256'), 'hex'),
            1,
            16
          ) = btrim(lower(p2.operator_user_hash_hex16))
      )
    END
  ) AS cohort_active_entitlements_count,
  (
    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (
        SELECT COUNT(*)::bigint
        FROM public.entitlement_rights AS er
        CROSS JOIN params AS p2
        WHERE er.right_key = 'm55_p:core_origin'
          AND substring(
            encode(digest(convert_to(btrim(er.user_id), 'UTF8'), 'sha256'), 'hex'),
            1,
            16
          ) = btrim(lower(p2.operator_user_hash_hex16))
      )
    END
  ) AS cohort_entitlement_rights_core_origin_count
FROM params AS p;

-- ═══ 4. Cohort wallet + included_grant (scoped · counts/aggregates only) ═══
WITH params AS (
  SELECT CAST(NULL AS text) AS operator_user_hash_hex16
)
SELECT
  (
    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (
        SELECT COUNT(*)::bigint
        FROM public.reply_ticket_wallets AS w
        CROSS JOIN params AS p2
        WHERE w.status = 'active'
          AND w.report_instance_id IS NOT NULL
          AND substring(
            encode(digest(convert_to(btrim(w.user_id), 'UTF8'), 'sha256'), 'hex'),
            1,
            16
          ) = btrim(lower(p2.operator_user_hash_hex16))
      )
    END
  ) AS cohort_scoped_active_wallet_count,
  (
    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (
        SELECT COALESCE(MAX(w.available_count), 0)::bigint
        FROM public.reply_ticket_wallets AS w
        CROSS JOIN params AS p2
        WHERE w.status = 'active'
          AND w.report_instance_id IS NOT NULL
          AND substring(
            encode(digest(convert_to(btrim(w.user_id), 'UTF8'), 'sha256'), 'hex'),
            1,
            16
          ) = btrim(lower(p2.operator_user_hash_hex16))
      )
    END
  ) AS cohort_scoped_available_count_max,
  (
    CASE
      WHEN p.operator_user_hash_hex16 IS NULL THEN NULL::bigint
      ELSE (
        SELECT COUNT(*)::bigint
        FROM public.reply_wallet_ledgers AS l
        CROSS JOIN params AS p2
        WHERE l.event_type = 'included_grant'
          AND substring(
            encode(digest(convert_to(btrim(l.user_id), 'UTF8'), 'sha256'), 'hex'),
            1,
            16
          ) = btrim(lower(p2.operator_user_hash_hex16))
      )
    END
  ) AS cohort_included_grant_ledger_count
FROM params AS p;

-- Expected pre-payment (launch-cohort-primary start):
--   cohort_visible_snapshot_count = 0
--   cohort_one_time_fulfillments_count = 0
--   cohort_scoped_active_wallet_count = 0 (or null-scope only — see S-5)
--
-- Expected post-payment (FRESH-FULFILLMENT-R / FRESH-DTR-UNLOCK-R):
--   cohort_one_time_fulfillments_count = 1
--   cohort_active_entitlements_count = 1
--   cohort_entitlement_rights_core_origin_count = 1
--   cohort_visible_snapshot_count = 1
--   cohort_scoped_active_wallet_count >= 1
--   cohort_scoped_available_count_max >= 1
--   cohort_included_grant_ledger_count >= 1
--   wallets_null_status_active = 0
--   wallets_cap_violation_rows = 0
