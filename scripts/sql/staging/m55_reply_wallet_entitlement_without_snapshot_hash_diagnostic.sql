-- ============================================================================
-- DIAGNOSTIC — wallet + DTR entitlements but NO dtr_report_snapshots (HASH-ONLY)
-- Path: scripts/sql/staging/m55_reply_wallet_entitlement_without_snapshot_hash_diagnostic.sql
--
-- Target: reply_ticket_wallets row exists AND at least one public.entitlements row
--         for product_id = 'DTR_CORE_STATIC_V1' AND
--         NO dtr_report_snapshots row for (user_id, DTR_CORE_STATIC_V1).
--
-- READ-ONLY: SELECT only. No DDL/DML.
-- Does not return: raw user_id, email, checkout_session_id, Stripe ids, raw UUIDs.
-- hashed_user_id = md5('m55_wallet_diag_v1'::text || user_id) — same salt as sibling script.
-- Timestamps: date_trunc('day', timestamptz) UTC only (no sub-day precision in output).
--
-- If entitlements.* columns differ in your DB, run PART 0 first, then adjust PART 1
-- or add missing columns to your migration before relying on created_at lines.
-- ============================================================================


-- ############################################################################
-- PART 0 (optional): column inventory — NO secrets, NO row data from business tables
-- Run once if PART 1 errors on unknown columns (especially entitlements.created_at).
-- ############################################################################

SELECT ic.table_schema::text AS table_schema,
       ic.table_name::text AS table_name,
       ic.column_name::text AS column_name,
       ic.data_type::text AS data_type
FROM information_schema.columns ic
WHERE ic.table_schema = 'public'
  AND ic.table_name IN (
    'entitlements',
    'entitlement_rights',
    'reply_ticket_wallets',
    'reply_wallet_ledgers',
    'reply_sessions',
    'reply_documents',
    'dtr_report_snapshots',
    'one_time_fulfillments'
  )
ORDER BY ic.table_name, ic.ordinal_position;


-- ############################################################################
-- PART 1 — hash-only diagnostic (separate batch / below PART 0 in Editor)
-- ############################################################################
--
-- NOTE: entitlement_created_day_* uses entitlements.created_at.
-- If absent (check PART 0), replace MIN/MAX date_trunc subqueries with NULL::timestamp.

WITH base AS (
  SELECT
    w.user_id,
    w.id AS wallet_id_for_subqueries,
    w.status AS wallet_status,
    w.available_count,
    w.initial_included_count,
    w.purchased_count,
    w.consumed_count,
    (SELECT COUNT(*)::bigint
     FROM public.reply_wallet_ledgers l
     WHERE l.wallet_id = w.id) AS wallet_ledger_count,
    (SELECT COUNT(*)::bigint
     FROM public.reply_sessions rs
     WHERE rs.user_id = w.user_id) AS reply_session_count,
    (SELECT COUNT(*)::bigint
     FROM public.reply_documents rd
     WHERE rd.user_id = w.user_id) AS reply_document_count,
    (SELECT COUNT(*)::bigint
     FROM public.entitlements e
     WHERE e.user_id = w.user_id
       AND e.product_id = 'DTR_CORE_STATIC_V1') AS entitlement_dtr_row_count,
    (SELECT COUNT(DISTINCT e.product_id)::bigint
     FROM public.entitlements e
     WHERE e.user_id = w.user_id) AS entitlement_product_ids_distinct_count,
    (SELECT COALESCE(string_agg(DISTINCT e.status::text, ',' ORDER BY e.status::text), '')
     FROM public.entitlements e
     WHERE e.user_id = w.user_id
       AND e.product_id = 'DTR_CORE_STATIC_V1') AS entitlement_status_list,
    (SELECT MIN(date_trunc('day', e.created_at AT TIME ZONE 'UTC'))
     FROM public.entitlements e
     WHERE e.user_id = w.user_id
       AND e.product_id = 'DTR_CORE_STATIC_V1') AS entitlement_created_day_min,
    (SELECT MAX(date_trunc('day', e.created_at AT TIME ZONE 'UTC'))
     FROM public.entitlements e
     WHERE e.user_id = w.user_id
       AND e.product_id = 'DTR_CORE_STATIC_V1') AS entitlement_created_day_max,
    (SELECT COALESCE(string_agg(DISTINCT e.grant_type::text, ',' ORDER BY e.grant_type::text), '')
     FROM public.entitlements e
     WHERE e.user_id = w.user_id
       AND e.product_id = 'DTR_CORE_STATIC_V1') AS entitlement_grant_type_list,
    (SELECT COALESCE(string_agg(DISTINCT e.source::text, ',' ORDER BY e.source::text), '')
     FROM public.entitlements e
     WHERE e.user_id = w.user_id
       AND e.product_id = 'DTR_CORE_STATIC_V1') AS entitlement_source_list,
    (SELECT COUNT(*)::bigint
     FROM public.entitlement_rights er
     WHERE er.user_id = w.user_id
       AND er.right_key = 'm55_p:core_origin') AS core_right_count,
    (SELECT COUNT(DISTINCT er.right_key)::bigint
     FROM public.entitlement_rights er
     WHERE er.user_id = w.user_id) AS right_key_distinct_count,
    (SELECT COUNT(*)::bigint
     FROM public.one_time_fulfillments o
     WHERE o.user_id = w.user_id
       AND o.product_id = 'DTR_CORE_STATIC_V1') AS one_time_fulfillment_count,
    (SELECT COUNT(*)::bigint
     FROM public.dtr_report_snapshots s
     WHERE s.user_id = w.user_id
       AND s.product_id = 'DTR_CORE_STATIC_V1') AS dtr_core_snapshot_row_count,
    (SELECT COUNT(*)::bigint
     FROM public.dtr_report_snapshots s
     WHERE s.user_id = w.user_id) AS any_snapshot_count,
    (SELECT COUNT(DISTINCT s.product_id)::bigint
     FROM public.dtr_report_snapshots s
     WHERE s.user_id = w.user_id) AS any_snapshot_product_distinct_count
  FROM public.reply_ticket_wallets w
  WHERE EXISTS (
    SELECT 1
    FROM public.entitlements e0
    WHERE e0.user_id = w.user_id
      AND e0.product_id = 'DTR_CORE_STATIC_V1'
  )
    AND NOT EXISTS (
      SELECT 1
      FROM public.dtr_report_snapshots s0
      WHERE s0.user_id = w.user_id
        AND s0.product_id = 'DTR_CORE_STATIC_V1'
    )
)
SELECT
  md5('m55_wallet_diag_v1'::text || base.user_id)::text AS hashed_user_id,
  base.wallet_status,
  base.available_count,
  base.initial_included_count,
  base.purchased_count,
  base.consumed_count,
  base.wallet_ledger_count,
  base.reply_session_count,
  base.reply_document_count,
  base.entitlement_dtr_row_count AS entitlement_count,
  base.entitlement_product_ids_distinct_count AS entitlement_product_ids_count,
  base.entitlement_status_list,
  base.entitlement_created_day_min,
  base.entitlement_created_day_max,
  base.entitlement_grant_type_list,
  base.entitlement_source_list,
  base.core_right_count,
  base.right_key_distinct_count AS right_key_list_count,
  base.one_time_fulfillment_count,
  base.dtr_core_snapshot_row_count AS dtr_snapshot_count,
  base.any_snapshot_count,
  base.any_snapshot_product_distinct_count AS any_snapshot_product_count,
  CASE
    WHEN base.reply_session_count > 0
      OR base.reply_document_count > 0
      OR base.consumed_count > 0
      THEN 'reply_used_without_snapshot'
    WHEN base.reply_session_count = 0
      AND base.reply_document_count = 0
      AND base.consumed_count = 0
      AND base.entitlement_dtr_row_count > 0
      AND base.core_right_count > 0
      THEN 'unused_wallet_with_entitlement_no_snapshot'
    WHEN base.entitlement_dtr_row_count > 0
      AND base.core_right_count = 0
      THEN 'entitlement_exists_but_no_snapshot_and_no_right'
    WHEN base.entitlement_dtr_row_count > 0
      AND base.core_right_count > 0
      AND base.one_time_fulfillment_count = 0
      THEN 'legacy_entitlement_without_fulfillment'
    WHEN base.entitlement_dtr_row_count > 0
      AND base.core_right_count > 0
      THEN 'entitlement_and_right_exist_but_no_snapshot'
    ELSE 'needs_manual_review'
  END AS likely_reason
FROM base;
