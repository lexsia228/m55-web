-- ============================================================================
-- DIAGNOSTIC — wallet without DTR_CORE_STATIC_V1 snapshot (HASH-ONLY OUTPUT)
-- Path: scripts/sql/staging/m55_reply_wallet_without_snapshot_hash_diagnostic.sql
--
-- Use when Phase0 Lite reports wallet_user_without_snapshot_count > 0.
-- READ-ONLY: SELECT only. No DDL/DML.
--
-- Privacy:
-- - Does NOT return raw user_id, email, checkout_session_id, UUIDs, or Stripe ids.
-- - hashed_user_id = md5('m55_wallet_diag_v1'::text || user_id) — pseudonym for
--   cross-row correlation in logs (not a secret; rotate label if re-publishing).
--
-- Run only under your org's policy; this file is not executed by repo automation.
-- ============================================================================


WITH base AS (
  SELECT
    w.user_id,
    w.id AS wallet_id_for_subqueries,
    w.status AS wallet_status,
    w.available_count,
    w.initial_included_count,
    w.purchased_count,
    w.consumed_count,
    1::integer AS wallet_row_count,
    (SELECT COUNT(*)::bigint
     FROM public.dtr_report_snapshots s
     WHERE s.user_id = w.user_id) AS any_snapshot_count,
    (SELECT COUNT(*)::bigint
     FROM public.dtr_report_snapshots s
     WHERE s.user_id = w.user_id
       AND s.product_id = 'DTR_CORE_STATIC_V1') AS dtr_core_snapshot_count,
    (SELECT COUNT(*)::bigint
     FROM public.entitlement_rights er
     WHERE er.user_id = w.user_id
       AND er.right_key = 'm55_p:core_origin') AS core_right_count,
    (SELECT COUNT(*)::bigint
     FROM public.entitlements e
     WHERE e.user_id = w.user_id
       AND e.product_id = 'DTR_CORE_STATIC_V1') AS entitlement_count,
    (SELECT COUNT(*)::bigint
     FROM public.one_time_fulfillments o
     WHERE o.user_id = w.user_id
       AND o.product_id = 'DTR_CORE_STATIC_V1') AS fulfillment_count,
    (SELECT COUNT(*)::bigint
     FROM public.reply_sessions rs
     WHERE rs.user_id = w.user_id) AS reply_session_count,
    (SELECT COUNT(*)::bigint
     FROM public.reply_documents rd
     WHERE rd.user_id = w.user_id) AS reply_document_count,
    (SELECT COUNT(*)::bigint
     FROM public.reply_wallet_ledgers l
     WHERE l.wallet_id = w.id) AS ledger_count
  FROM public.reply_ticket_wallets w
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots s
    WHERE s.user_id = w.user_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
  )
)
SELECT
  md5('m55_wallet_diag_v1'::text || base.user_id)::text AS hashed_user_id,
  base.wallet_row_count AS wallet_count,
  base.wallet_status,
  base.available_count,
  base.initial_included_count,
  base.purchased_count,
  base.consumed_count,
  base.dtr_core_snapshot_count,
  base.any_snapshot_count,
  base.core_right_count,
  base.entitlement_count,
  base.fulfillment_count,
  base.reply_session_count,
  base.reply_document_count,
  base.ledger_count,
  CASE
    WHEN base.fulfillment_count > 0 THEN 'wallet_with_fulfillment_but_no_snapshot'
    WHEN base.core_right_count > 0 THEN 'wallet_with_right_but_no_snapshot'
    WHEN base.entitlement_count > 0 THEN 'wallet_with_entitlement_but_no_snapshot'
    WHEN base.any_snapshot_count > 0 THEN 'wallet_other_product_snapshot_but_no_core_entry_snapshot'
    WHEN base.fulfillment_count = 0
     AND base.core_right_count = 0
     AND base.entitlement_count = 0
     AND base.any_snapshot_count = 0
     AND (base.reply_session_count + base.reply_document_count + base.ledger_count) <= 10
      THEN 'test_or_orphan_wallet_candidate'
    WHEN base.any_snapshot_count = 0 THEN 'wallet_without_any_snapshot'
    ELSE 'needs_manual_review'
  END AS suspected_category
FROM base;
