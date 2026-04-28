-- ============================================================================
-- DIAGNOSTIC — fulfillment lineage hash-only (orphan entitlement cohort)
-- Path: scripts/sql/staging/m55_reply_wallet_orphan_fulfillment_lineage_hash_diagnostic.sql
--
-- Audience: Rows where wallet exists + active DTR entitlements stripe_checkout /
--           one_time but PART1 observed no rights / fulfillment / snapshots.
--
-- READ-ONLY: SELECT only — no DDL/DML.
--
-- Privacy: never returns raw user_id, email, UUIDs as row ids, stripe_session_id,
--          checkout_session_id, payment_intent, purchase_ref plaintext, stripe_event IDs.
--          Outputs md5 prefixes of Stripe checkout session ids ONLY for correlating rows:
--               md5('m55_lineage_cs_v1'::text || checkout_session_id)
--
-- Optional columns purchase_ref / stripe_event_id:
-- See OPTIONAL section at bottom — uncomment ONLY if PART 0 confirms column names exist.
--
-- Related: docs/ssot/M55_REPLY_WALLET_ORPHAN_ENTITLEMENT_PART1_OBSERVATION_v1.md
-- ============================================================================


WITH ent AS (
  SELECT
    w.user_id,
    w.status AS wallet_status,
    e.status AS entitlement_status_single,
    e.grant_type AS entitlement_grant_single,
    e.source AS entitlement_source_single,
    e.created_at AS entitlement_created_ts,
    e.stripe_session_id AS entitlement_cs_raw_inner,
    e.product_id
  FROM public.reply_ticket_wallets w
  INNER JOIN public.entitlements e
    ON e.user_id = w.user_id
   AND e.product_id = 'DTR_CORE_STATIC_V1'
   AND e.status = 'active'
   AND COALESCE(e.grant_type::text, '') = 'one_time'
   AND COALESCE(e.source::text, '') = 'stripe_checkout'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.dtr_report_snapshots s
    WHERE s.user_id = w.user_id
      AND s.product_id = 'DTR_CORE_STATIC_V1'
  )
),
scoped AS (
  SELECT
    ent.*,
    (ent.entitlement_cs_raw_inner IS NOT NULL) AS has_entitlement_stripe_session_id_bool,
    CASE
      WHEN ent.entitlement_cs_raw_inner IS NOT NULL THEN
        md5('m55_lineage_cs_v1'::text || ent.entitlement_cs_raw_inner)::text
    END AS hashed_entitlement_session_ref,
    date_trunc('day', ent.entitlement_created_ts AT TIME ZONE 'UTC') AS entitlement_created_day,
    (
      SELECT COUNT(*)::bigint
      FROM public.entitlement_rights er
      WHERE er.user_id = ent.user_id
    ) AS right_same_user_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.one_time_fulfillments o
      WHERE o.user_id = ent.user_id
        AND o.product_id = 'DTR_CORE_STATIC_V1'
    ) AS fulfillment_same_user_product_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.one_time_fulfillments o
      WHERE ent.entitlement_cs_raw_inner IS NOT NULL
        AND md5('m55_lineage_cs_v1'::text || o.checkout_session_id)
          = md5('m55_lineage_cs_v1'::text || ent.entitlement_cs_raw_inner)
    ) AS matching_fulfillment_by_session_hash_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots s
      WHERE ent.entitlement_cs_raw_inner IS NOT NULL
        AND s.checkout_session_id IS NOT NULL
        AND COALESCE(btrim(s.checkout_session_id::text), '') <> ''
        AND md5('m55_lineage_cs_v1'::text || s.checkout_session_id::text)
          = md5('m55_lineage_cs_v1'::text || ent.entitlement_cs_raw_inner::text)
    ) AS matching_snapshot_by_session_hash_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots s
      WHERE s.user_id = ent.user_id
        AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS snapshot_same_user_product_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.one_time_fulfillments o
      WHERE o.user_id = ent.user_id
        AND date_trunc('day', o.fulfilled_at AT TIME ZONE 'UTC')
          = date_trunc('day', ent.entitlement_created_ts AT TIME ZONE 'UTC')
    ) AS fulfillment_same_calendar_day_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots s
      WHERE s.user_id = ent.user_id
        AND date_trunc('day', s.created_at AT TIME ZONE 'UTC')
          = date_trunc('day', ent.entitlement_created_ts AT TIME ZONE 'UTC')
    ) AS snapshot_same_calendar_day_count
  FROM ent
)
SELECT
  md5('m55_wallet_diag_v1'::text || scoped.user_id)::text AS hashed_user_id,
  scoped.entitlement_status_single AS entitlement_status_list,
  scoped.entitlement_grant_single AS entitlement_grant_type_list,
  scoped.entitlement_source_single AS entitlement_source_list,
  scoped.has_entitlement_stripe_session_id_bool AS has_entitlement_stripe_session_id,
  NULL::boolean AS has_entitlement_purchase_ref,
  NULL::boolean AS has_entitlement_stripe_event_id,
  scoped.entitlement_created_day,
  scoped.hashed_entitlement_session_ref,
  scoped.matching_fulfillment_by_session_hash_count,
  scoped.matching_snapshot_by_session_hash_count,
  scoped.fulfillment_same_user_product_count,
  scoped.right_same_user_count AS right_same_user_total_count,
  scoped.snapshot_same_user_product_count,
  scoped.fulfillment_same_calendar_day_count,
  scoped.snapshot_same_calendar_day_count,
  CASE
    WHEN scoped.entitlement_source_single ILIKE '%stripe%'
         AND scoped.entitlement_cs_raw_inner IS NULL
      THEN 'entitlement_only_checkout_write_or_session_id_missing_after_write'
    WHEN scoped.entitlement_cs_raw_inner IS NULL THEN 'no_session_reference_on_entitlement'
    WHEN scoped.matching_fulfillment_by_session_hash_count > 0
      THEN 'rights_and_snapshot_missing_after_entitlement'
    WHEN scoped.entitlement_cs_raw_inner IS NOT NULL
         AND scoped.matching_fulfillment_by_session_hash_count = 0
         AND scoped.fulfillment_same_user_product_count = 0
      THEN 'session_reference_present_but_no_fulfillment'
    WHEN scoped.entitlement_cs_raw_inner IS NOT NULL
         AND scoped.matching_fulfillment_by_session_hash_count = 0
         AND scoped.fulfillment_same_user_product_count > 0
      THEN 'fulfillment_missing_after_checkout_or_session_mismatch'
    ELSE 'needs_manual_review'
  END AS suspected_lineage_issue
FROM scoped;

-- -----------------------------------------------------------------------------
-- OPTIONAL (not executed): if information_schema confirms column names exist on public.entitlements,
-- uncomment and merge into scoped SELECT replacing NULL booleans below:
--
-- , (ent.purchase_ref IS NOT NULL) AS has_entitlement_purchase_ref
-- , (ent.stripe_event_id IS NOT NULL) AS has_entitlement_stripe_event_id   -- VERIFY actual column name
--
-- Separate hash compare for purchase_ref (if textual session-like ref):
-- , CASE WHEN purchase_ref_column IS NOT NULL THEN md5('m55_lineage_pref'::text || purchase_ref_column) END hashed_purchase_ref
-- -----------------------------------------------------------------------------
-- OPTIONAL (not executed): purchase_ref.hash vs fulfillment hash compare — ONLY if column confirmed.
--
-- -----------------------------------------------------------------------------
-- HASH matching note: snapshots may have checkout_session_id NULL; matches only when BOTH sides non-null and equal hash.
--
