-- =============================================================================
-- READ-ONLY — M55 Production purchase smoke wave1 postcheck
-- Path: scripts/sql/production/m55_production_purchase_smoke_wave1_postcheck.sql
--
-- Wave1 products: dtr_core_light_v1, dtr_core_full_v1, dtr_core_light_to_full_upgrade_v1
-- Supersedes legacy-only dtr_purchased_state_summary.sql for wave1 smoke evidence.
--
-- Before run (psql example — substitute locally, never commit real ids):
--   \set m55_smoke_user_id 'PUT_CLERK_USER_ID_HERE'
-- Or session GUC:
--   SET m55.purchase_smoke.user_id = 'PUT_CLERK_USER_ID_HERE';
--
-- SELECT/WITH only — no DML/DDL/COPY/CALL/DO/NOTIFY.
-- No secrets, payloads, PII, or card data in output.
-- =============================================================================

WITH params AS (
  SELECT COALESCE(
    NULLIF(current_setting('m55.purchase_smoke.user_id', true), ''),
    :'m55_smoke_user_id'
  )::text AS subject_user_id
),
subject_guard AS (
  SELECT
    subject_user_id,
    CASE
      WHEN subject_user_id IS NULL OR length(trim(subject_user_id)) = 0 THEN false
      ELSE true
    END AS subject_present
  FROM params
),
-- stripe_events dedupe (canonical event_id uniqueness observation)
stripe_event_counts AS (
  SELECT COUNT(*)::bigint AS stripe_event_row_count
  FROM public.stripe_events AS se
  CROSS JOIN subject_guard AS sg
  WHERE sg.subject_present
    AND EXISTS (
      SELECT 1
      FROM public.one_time_fulfillments AS otf
      WHERE otf.user_id = sg.subject_user_id
        AND otf.event_id = se.event_id
    )
),
fulfillment AS (
  SELECT
    COUNT(*) FILTER (WHERE o.product_id = 'dtr_core_light_v1')::bigint AS light_fulfillment_count,
    COUNT(*) FILTER (WHERE o.product_id = 'dtr_core_full_v1')::bigint AS full_fulfillment_count,
    COUNT(*)::bigint AS total_fulfillment_count,
    COUNT(DISTINCT o.checkout_session_id)::bigint AS distinct_checkout_session_count
  FROM public.one_time_fulfillments AS o
  CROSS JOIN subject_guard AS sg
  WHERE sg.subject_present AND o.user_id = sg.subject_user_id
),
entitlements AS (
  SELECT
    COUNT(*) FILTER (WHERE e.product_id = 'dtr_core_light_v1' AND e.status = 'active')::bigint AS light_entitlement_count,
    COUNT(*) FILTER (WHERE e.product_id = 'dtr_core_full_v1' AND e.status = 'active')::bigint AS full_entitlement_count
  FROM public.entitlements AS e
  CROSS JOIN subject_guard AS sg
  WHERE sg.subject_present AND e.user_id = sg.subject_user_id
),
rights AS (
  SELECT COUNT(*)::bigint AS core_origin_right_count
  FROM public.entitlement_rights AS er
  CROSS JOIN subject_guard AS sg
  WHERE sg.subject_present
    AND er.user_id = sg.subject_user_id
    AND er.right_key = 'm55_p:core_origin'
),
failed AS (
  SELECT COUNT(*)::bigint AS failed_fulfillment_count
  FROM public.failed_fulfillments AS ff
  CROSS JOIN subject_guard AS sg
  WHERE sg.subject_present
    AND ff.checkout_session_id IN (
      SELECT o.checkout_session_id
      FROM public.one_time_fulfillments AS o
      WHERE o.user_id = sg.subject_user_id
    )
),
wallet AS (
  SELECT
    COALESCE(MAX(w.initial_included_count), -1)::bigint AS wallet_initial_included,
    COALESCE(MAX(w.purchased_count), -1)::bigint AS wallet_purchased_count,
    COALESCE(MAX(w.available_count), -1)::bigint AS wallet_available_count,
    COUNT(*)::bigint AS wallet_row_count
  FROM public.reply_ticket_wallets AS w
  CROSS JOIN subject_guard AS sg
  WHERE sg.subject_present AND w.user_id = sg.subject_user_id
),
ledger AS (
  SELECT
    COUNT(*) FILTER (WHERE l.event_type = 'included_grant')::bigint AS included_grant_count,
    COUNT(*) FILTER (WHERE l.event_type = 'purchase_grant')::bigint AS purchase_grant_count,
    COUNT(*)::bigint AS ledger_row_count
  FROM public.reply_wallet_ledgers AS l
  CROSS JOIN subject_guard AS sg
  WHERE sg.subject_present AND l.user_id = sg.subject_user_id
),
snapshots AS (
  SELECT
    COUNT(*) FILTER (WHERE s.product_id = 'dtr_core_light_v1')::bigint AS light_snapshot_count,
    COUNT(*) FILTER (WHERE s.product_id = 'dtr_core_full_v1')::bigint AS full_snapshot_count,
    COUNT(*)::bigint AS total_snapshot_count
  FROM public.dtr_report_snapshots AS s
  CROSS JOIN subject_guard AS sg
  WHERE sg.subject_present
    AND s.user_id = sg.subject_user_id
    AND s.user_hidden_at IS NULL
),
upgrade_ledger AS (
  SELECT COUNT(*)::bigint AS upgrade_product_ledger_count
  FROM public.reply_wallet_ledgers AS l
  CROSS JOIN subject_guard AS sg
  WHERE sg.subject_present
    AND l.user_id = sg.subject_user_id
    AND l.product_key = 'dtr_core_light_to_full_upgrade_v1'
),
flags AS (
  SELECT
    sg.subject_present,
    f.light_fulfillment_count,
    f.full_fulfillment_count,
    f.total_fulfillment_count,
    f.distinct_checkout_session_count,
    e.light_entitlement_count,
    e.full_entitlement_count,
    r.core_origin_right_count,
    fd.failed_fulfillment_count,
    w.wallet_initial_included,
    w.wallet_purchased_count,
    w.wallet_available_count,
    w.wallet_row_count,
    l.included_grant_count,
    l.purchase_grant_count,
    l.ledger_row_count,
    s.light_snapshot_count,
    s.full_snapshot_count,
    s.total_snapshot_count,
    u.upgrade_product_ledger_count,
    se.stripe_event_row_count,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT sg.subject_present THEN 'subject_missing' END,
      CASE WHEN fd.failed_fulfillment_count > 0 THEN 'failed_fulfillments_present' END,
      CASE WHEN f.total_fulfillment_count > f.distinct_checkout_session_count THEN 'duplicate_checkout_fulfillment' END,
      CASE WHEN w.wallet_row_count > 1 THEN 'duplicate_wallet_rows' END,
      CASE WHEN s.total_snapshot_count > 2 THEN 'excessive_snapshot_rows' END
    ], NULL) AS failed_flags,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT sg.subject_present THEN 'subject_unknown' END,
      CASE WHEN w.wallet_initial_included < 0 THEN 'wallet_unknown' END
    ], NULL) AS unknown_flags,
    CASE
      WHEN NOT sg.subject_present THEN 'UNKNOWN'
      WHEN f.light_fulfillment_count = 1
        AND e.light_entitlement_count >= 1
        AND r.core_origin_right_count >= 1
        AND w.wallet_initial_included = 1
        AND w.wallet_purchased_count = 0
        AND s.light_snapshot_count = 1
        AND fd.failed_fulfillment_count = 0
        THEN 'LIGHT_GREEN'
      WHEN u.upgrade_product_ledger_count >= 1
        AND w.wallet_purchased_count = 4
        AND w.wallet_available_count <= 5
        AND fd.failed_fulfillment_count = 0
        THEN 'CONVERSION_GREEN'
      WHEN f.full_fulfillment_count = 1
        AND e.full_entitlement_count >= 1
        AND w.wallet_purchased_count = 4
        AND w.wallet_available_count = 5
        AND s.full_snapshot_count = 1
        AND fd.failed_fulfillment_count = 0
        THEN 'FRESH_FULL_GREEN'
      WHEN f.distinct_checkout_session_count = f.total_fulfillment_count
        AND fd.failed_fulfillment_count = 0
        AND se.stripe_event_row_count >= 0
        THEN 'IDEMPOTENCY_GREEN'
      ELSE 'HOLD_EXACT_REASON'
    END AS scenario_classification
  FROM subject_guard AS sg
  CROSS JOIN fulfillment AS f
  CROSS JOIN entitlements AS e
  CROSS JOIN rights AS r
  CROSS JOIN failed AS fd
  CROSS JOIN wallet AS w
  CROSS JOIN ledger AS l
  CROSS JOIN snapshots AS s
  CROSS JOIN upgrade_ledger AS u
  CROSS JOIN stripe_event_counts AS se
)
SELECT
  'm55_production_purchase_smoke_wave1_postcheck_v1' AS schema_version,
  subject_present,
  light_fulfillment_count,
  full_fulfillment_count,
  total_fulfillment_count,
  distinct_checkout_session_count,
  light_entitlement_count,
  full_entitlement_count,
  core_origin_right_count,
  failed_fulfillment_count,
  wallet_initial_included,
  wallet_purchased_count,
  wallet_available_count,
  wallet_row_count,
  included_grant_count,
  purchase_grant_count,
  ledger_row_count,
  light_snapshot_count,
  full_snapshot_count,
  total_snapshot_count,
  upgrade_product_ledger_count,
  stripe_event_row_count,
  scenario_classification,
  failed_flags,
  unknown_flags,
  CASE
    WHEN scenario_classification IN ('LIGHT_GREEN', 'CONVERSION_GREEN', 'FRESH_FULL_GREEN', 'IDEMPOTENCY_GREEN', 'DUPLICATE_FULL_REJECTED_GREEN')
      AND cardinality(failed_flags) = 0
      THEN true
    ELSE false
  END AS overall_predicate
FROM flags;
