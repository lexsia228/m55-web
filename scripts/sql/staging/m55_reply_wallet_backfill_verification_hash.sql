-- ============================================================================
-- DIAGNOSTIC — backfill / restoration verification (hash-only, read-only)
-- Path: scripts/sql/staging/m55_reply_wallet_backfill_verification_hash.sql
--
-- Purpose: Reconcile reports such as "1/3 backfill succeeded" vs "all 3 show
--          dtr_snapshot = 0" using SELECT-only aggregates and per-user hashes.
--          No DB writes; no Stripe API.
--
-- READ-ONLY: SELECT only — no INSERT/UPDATE/DELETE/ALTER/DROP/CREATE/SET.
--
-- Privacy:
-- - No raw user_id, email, UUID row ids, checkout_session_id, stripe_session_id,
--   snapshot JSON, or payload JSON in the result.
-- - hashed_user_id = md5('m55_wallet_diag_v1' || user_id) for row correlation.
-- - Dates are UTC calendar days only (no timestamps with embedded identifiers).
--
-- Schema note: canonical migration has dtr_report_snapshots.created_at only.
--   snapshot_updated_day is NULL unless your DB added updated_at (see OPTIONAL).
--
-- Related: m55_reply_wallet_report_instance_phase0_lite_counts_only.sql
--          m55_reply_wallet_orphan_fulfillment_lineage_hash_diagnostic.sql
--
-- PHASE: Phase0 / audit — Phase A migration & Stripe product UI = NO-GO.
-- ============================================================================


-- =============================================================================
-- SECTION A — Global metrics (values only; no per-user identifiers)
-- =============================================================================
-- Item 1–3: wallet without snapshot; cohort with stripe session + snapshot off/on.
-- Cohort S: reply_ticket_wallets + entitlements for DTR_CORE_STATIC_V1, active,
--            one_time, stripe_checkout, stripe_session_id IS NOT NULL.

SELECT 'wallet_user_without_snapshot_count'::text AS metric,
  (
    SELECT COUNT(*)::bigint
    FROM public.reply_ticket_wallets AS w
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    )
  )::text AS value
UNION ALL
SELECT 'cohort_s_active_stripe_entitlement_without_dtr_core_snapshot'::text,
  (
    SELECT COUNT(DISTINCT w.user_id)::bigint
    FROM public.reply_ticket_wallets AS w
    INNER JOIN public.entitlements AS e
      ON e.user_id = w.user_id
     AND e.product_id = 'DTR_CORE_STATIC_V1'
     AND e.status = 'active'
     AND COALESCE(e.grant_type::text, '') = 'one_time'
     AND COALESCE(e.source::text, '') = 'stripe_checkout'
     AND e.stripe_session_id IS NOT NULL
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    )
  )::text
UNION ALL
SELECT 'cohort_s_active_stripe_entitlement_with_dtr_core_snapshot'::text,
  (
    SELECT COUNT(DISTINCT w.user_id)::bigint
    FROM public.reply_ticket_wallets AS w
    INNER JOIN public.entitlements AS e
      ON e.user_id = w.user_id
     AND e.product_id = 'DTR_CORE_STATIC_V1'
     AND e.status = 'active'
     AND COALESCE(e.grant_type::text, '') = 'one_time'
     AND COALESCE(e.source::text, '') = 'stripe_checkout'
     AND e.stripe_session_id IS NOT NULL
    WHERE EXISTS (
      SELECT 1
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = w.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    )
  )::text;


-- =============================================================================
-- SECTION B — Per hashed_user_id: snapshot / fulfillment / rights / reply /
--             verification_status (same cohort S as SECTION A aggregates)
-- =============================================================================
-- Items 4–9: per-row dtr_snapshot_count, day strips, ancillary counts, classify.
--
-- Run SECTION A and SECTION B in separate executions if your SQL client merges
-- result sets inconveniently.

WITH cohort_s AS (
  SELECT DISTINCT ON (w.user_id)
    w.user_id,
    w.status AS wallet_status,
    w.available_count,
    w.consumed_count,
    e.stripe_session_id AS entitlement_cs_raw,
    e.created_at AS entitlement_created_at
  FROM public.reply_ticket_wallets AS w
  INNER JOIN public.entitlements AS e
    ON e.user_id = w.user_id
   AND e.product_id = 'DTR_CORE_STATIC_V1'
   AND e.status = 'active'
   AND COALESCE(e.grant_type::text, '') = 'one_time'
   AND COALESCE(e.source::text, '') = 'stripe_checkout'
   AND e.stripe_session_id IS NOT NULL
  ORDER BY w.user_id, e.created_at DESC
),
scoped AS (
  SELECT
    c.user_id,
    c.wallet_status,
    c.available_count,
    c.consumed_count,
    (c.entitlement_cs_raw IS NOT NULL) AS has_entitlement_stripe_session_id,
    (
      SELECT COUNT(*)::bigint
      FROM public.entitlements AS e2
      WHERE e2.user_id = c.user_id
        AND e2.product_id = 'DTR_CORE_STATIC_V1'
    ) AS entitlement_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = c.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS dtr_snapshot_count,
    (
      SELECT date_trunc('day', MIN(s.created_at) AT TIME ZONE 'UTC')::date
      FROM public.dtr_report_snapshots AS s
      WHERE s.user_id = c.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS snapshot_created_day,
    /* Base schema has no updated_at on dtr_report_snapshots; keep NULL or use OPTIONAL */
    (
      NULL::date
    ) AS snapshot_updated_day,
    (
      SELECT COUNT(*)::bigint
      FROM public.entitlement_rights AS er
      WHERE er.user_id = c.user_id
        AND er.right_key = 'm55_p:core_origin'
    ) AS core_right_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.one_time_fulfillments AS o
      WHERE o.user_id = c.user_id
        AND o.product_id = 'DTR_CORE_STATIC_V1'
    ) AS one_time_fulfillment_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.reply_sessions AS rs
      WHERE rs.user_id = c.user_id
    ) AS reply_session_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.reply_documents AS rd
      WHERE rd.user_id = c.user_id
    ) AS reply_document_count
  FROM cohort_s AS c
)
SELECT
  md5('m55_wallet_diag_v1'::text || scoped.user_id)::text AS hashed_user_id,
  scoped.wallet_status,
  scoped.available_count,
  scoped.consumed_count,
  scoped.entitlement_count,
  scoped.has_entitlement_stripe_session_id,
  scoped.dtr_snapshot_count,
  CASE WHEN scoped.dtr_snapshot_count > 0 THEN scoped.snapshot_created_day END AS snapshot_created_day,
  CASE WHEN scoped.dtr_snapshot_count > 0 THEN scoped.snapshot_updated_day END AS snapshot_updated_day,
  scoped.core_right_count,
  scoped.one_time_fulfillment_count,
  scoped.reply_session_count,
  scoped.reply_document_count,
  CASE
    WHEN scoped.dtr_snapshot_count > 1
      THEN 'needs_manual_review'
    WHEN scoped.dtr_snapshot_count = 0
      AND scoped.one_time_fulfillment_count = 0
      AND scoped.core_right_count = 0
      THEN 'still_missing_snapshot'
    WHEN scoped.dtr_snapshot_count >= 1
      AND scoped.one_time_fulfillment_count >= 1
      AND scoped.core_right_count >= 1
      THEN 'restored_snapshot_present'
    WHEN scoped.dtr_snapshot_count >= 1
      AND (
        scoped.one_time_fulfillment_count = 0
        OR scoped.core_right_count = 0
      )
      THEN 'inconsistent_partial_restoration'
    WHEN scoped.dtr_snapshot_count = 0
      AND (
        scoped.one_time_fulfillment_count >= 1
        OR scoped.core_right_count >= 1
      )
      THEN 'inconsistent_partial_restoration'
    ELSE 'needs_manual_review'
  END AS verification_status
FROM scoped
ORDER BY hashed_user_id;


-- =============================================================================
-- OPTIONAL — If information_schema confirms dtr_report_snapshots.updated_at exists,
-- replace snapshot_updated_day in scoped with e.g.:
--   (SELECT date_trunc('day', MAX(s.updated_at) AT TIME ZONE 'UTC')::date
--    FROM public.dtr_report_snapshots s
--    WHERE s.user_id = c.user_id AND s.product_id = 'DTR_CORE_STATIC_V1')
-- ...and keep SELECT-only.
-- =============================================================================
