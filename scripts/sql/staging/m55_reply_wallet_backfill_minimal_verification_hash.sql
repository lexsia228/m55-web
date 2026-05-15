-- ============================================================================
-- MINIMAL — backfill verification (Phase0 wallet-without-snapshot cohort)
-- Path: scripts/sql/staging/m55_reply_wallet_backfill_minimal_verification_hash.sql
--
-- Why: Broader "cohort_s" INNER JOIN entitlements can return 0 rows while
--      wallet_user_without_snapshot_count > 0 (users lack matching entitlement
--      rows or column filters differ). This file anchors on the same NOT EXISTS
--      as Phase0 Lite so every wallet without DTR_CORE_STATIC_V1 snapshot appears.
--
-- READ-ONLY: SELECT only — no DDL/DML, no SET.
--
-- Privacy: hashed_user_id = md5('m55_wallet_diag_v1' || user_id) only; no raw
--          user_id, email, UUIDs, session ids, or JSON bodies.
--
-- Expectation: If wallet_user_without_snapshot_count = N, the second query
--              returns exactly N rows. If not, stop — do not advance Phase A.
--
-- PHASE: Phase0 STOP — migration / Stripe / shelf UI = NO-GO.
-- ============================================================================


-- -----------------------------------------------------------------------------
-- PART 1 — Metrics (name / value; no per-user identifiers)
-- -----------------------------------------------------------------------------

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
SELECT 'active_stripe_entitlement_without_snapshot_count'::text,
  (
    SELECT COUNT(DISTINCT w.user_id)::bigint
    FROM public.reply_ticket_wallets AS w
    WHERE EXISTS (
      SELECT 1
      FROM public.entitlements AS e
      WHERE e.user_id = w.user_id
        AND e.product_id = 'DTR_CORE_STATIC_V1'
        AND e.status = 'active'
        AND COALESCE(e.grant_type::text, '') = 'one_time'
        AND COALESCE(e.source::text, '') = 'stripe_checkout'
        AND e.stripe_session_id IS NOT NULL
    )
      AND NOT EXISTS (
        SELECT 1
        FROM public.dtr_report_snapshots AS s
        WHERE s.user_id = w.user_id
          AND s.product_id = 'DTR_CORE_STATIC_V1'
      )
  )::text
UNION ALL
SELECT 'active_stripe_entitlement_with_snapshot_count'::text,
  (
    SELECT COUNT(DISTINCT w.user_id)::bigint
    FROM public.reply_ticket_wallets AS w
    WHERE EXISTS (
      SELECT 1
      FROM public.entitlements AS e
      WHERE e.user_id = w.user_id
        AND e.product_id = 'DTR_CORE_STATIC_V1'
        AND e.status = 'active'
        AND COALESCE(e.grant_type::text, '') = 'one_time'
        AND COALESCE(e.source::text, '') = 'stripe_checkout'
        AND e.stripe_session_id IS NOT NULL
    )
      AND EXISTS (
        SELECT 1
        FROM public.dtr_report_snapshots AS s
        WHERE s.user_id = w.user_id
          AND s.product_id = 'DTR_CORE_STATIC_V1'
      )
  )::text;


-- -----------------------------------------------------------------------------
-- PART 2 — One row per wallet user without DTR_CORE snapshot (hashed only)
-- -----------------------------------------------------------------------------

SELECT
  md5('m55_wallet_diag_v1'::text || w.user_id)::text AS hashed_user_id,
  w.status AS wallet_status,
  w.available_count,
  w.initial_included_count,
  w.purchased_count,
  w.consumed_count,
  (
    SELECT COUNT(*)::bigint
    FROM public.dtr_report_snapshots AS s
    WHERE s.user_id = w.user_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
  ) AS dtr_core_snapshot_count,
  (
    SELECT COUNT(*)::bigint
    FROM public.entitlements AS e
    WHERE e.user_id = w.user_id
      AND e.product_id = 'DTR_CORE_STATIC_V1'
  ) AS entitlement_count,
  EXISTS (
    SELECT 1
    FROM public.entitlements AS e
    WHERE e.user_id = w.user_id
      AND e.product_id = 'DTR_CORE_STATIC_V1'
      AND e.stripe_session_id IS NOT NULL
  ) AS has_entitlement_stripe_session_id,
  (
    SELECT COUNT(*)::bigint
    FROM public.entitlement_rights AS er
    WHERE er.user_id = w.user_id
      AND er.right_key = 'm55_p:core_origin'
  ) AS core_right_count,
  (
    SELECT COUNT(*)::bigint
    FROM public.one_time_fulfillments AS o
    WHERE o.user_id = w.user_id
      AND o.product_id = 'DTR_CORE_STATIC_V1'
  ) AS one_time_fulfillment_count,
  (
    SELECT COUNT(*)::bigint
    FROM public.reply_sessions AS rs
    WHERE rs.user_id = w.user_id
  ) AS reply_session_count,
  (
    SELECT COUNT(*)::bigint
    FROM public.reply_documents AS rd
    WHERE rd.user_id = w.user_id
  ) AS reply_document_count,
  CASE
    WHEN w.available_count IS DISTINCT FROM
         w.initial_included_count + w.purchased_count - w.consumed_count
      OR w.available_count < 0
      OR w.consumed_count < 0
      OR w.purchased_count < 0
      OR w.initial_included_count < 0
      THEN 'needs_manual_review'::text
    WHEN (
      SELECT COUNT(*)::bigint
      FROM public.one_time_fulfillments AS o
      WHERE o.user_id = w.user_id
        AND o.product_id = 'DTR_CORE_STATIC_V1'
    ) > 0
      OR (
        SELECT COUNT(*)::bigint
        FROM public.entitlement_rights AS er
        WHERE er.user_id = w.user_id
          AND er.right_key = 'm55_p:core_origin'
      ) > 0
      THEN 'inconsistent_partial_restoration'::text
    ELSE 'still_missing_snapshot'::text
  END AS verification_status
FROM public.reply_ticket_wallets AS w
WHERE NOT EXISTS (
  SELECT 1
  FROM public.dtr_report_snapshots AS s
  WHERE s.user_id = w.user_id
    AND s.product_id = 'DTR_CORE_STATIC_V1'
)
ORDER BY md5('m55_wallet_diag_v1'::text || w.user_id)::text;
