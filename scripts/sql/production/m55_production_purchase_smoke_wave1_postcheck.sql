-- =============================================================================
-- READ-ONLY — M55 Production purchase smoke wave1 postcheck
-- Path: scripts/sql/production/m55_production_purchase_smoke_wave1_postcheck.sql
--
-- Session GUCs (never commit real ids):
--   SET m55.purchase_smoke.scenario_mode = 'SUBJECT_PRECHECK' | 'LIGHT_POSTCHECK' |
--     'CONVERSION_POSTCHECK' | 'DUPLICATE_REJECTION_POSTCHECK' | 'FRESH_FULL_POSTCHECK' |
--     'INTEGRATED_CLOSURE';
--   SET m55.purchase_smoke.user_id = '<subject>';
--   SET m55.purchase_smoke.subject_b_user_id = '<subject B for INTEGRATED_CLOSURE>';
--   SET m55.purchase_smoke.human_no_charge_confirmed = 'true' (DUPLICATE_REJECTION only);
--   SET m55.purchase_smoke.human_rejection_code = 'already_purchased' | 'cap_reached';
--   SET m55.purchase_smoke.baseline_fulfillment_count = 'N' (DUPLICATE_REJECTION only);
--   SET m55.purchase_smoke.subject_safe_label = 'M55_PROD_PURCHASE_A' | 'M55_PROD_PURCHASE_B';
--
-- SELECT/WITH only — no DML/DDL/COPY/CALL/DO/NOTIFY.
-- No secrets, payloads, PII, or card data in output.
-- =============================================================================

WITH params AS (
  SELECT
    COALESCE(
      NULLIF(current_setting('m55.purchase_smoke.scenario_mode', true), ''),
      'LIGHT_POSTCHECK'
    )::text AS scenario_mode,
    COALESCE(
      NULLIF(current_setting('m55.purchase_smoke.user_id', true), ''),
      :'m55_smoke_user_id'
    )::text AS subject_user_id,
    COALESCE(
      NULLIF(current_setting('m55.purchase_smoke.subject_b_user_id', true), ''),
      ''
    )::text AS subject_b_user_id,
    COALESCE(
      NULLIF(current_setting('m55.purchase_smoke.human_no_charge_confirmed', true), ''),
      'false'
    )::text AS human_no_charge_confirmed,
    COALESCE(
      NULLIF(current_setting('m55.purchase_smoke.human_rejection_code', true), ''),
      ''
    )::text AS human_rejection_code,
    COALESCE(
      NULLIF(current_setting('m55.purchase_smoke.baseline_fulfillment_count', true), ''),
      '-1'
    )::bigint AS baseline_fulfillment_count,
    COALESCE(
      NULLIF(current_setting('m55.purchase_smoke.subject_safe_label', true), ''),
      ''
    )::text AS subject_safe_label
),
subject_guard AS (
  SELECT
    p.scenario_mode,
    p.subject_user_id,
    p.subject_b_user_id,
    p.human_no_charge_confirmed,
    p.human_rejection_code,
    p.baseline_fulfillment_count,
    p.subject_safe_label,
    CASE
      WHEN p.subject_user_id IS NULL OR length(trim(p.subject_user_id)) = 0 THEN false
      ELSE true
    END AS subject_present,
    CASE
      WHEN p.scenario_mode = 'INTEGRATED_CLOSURE'
        AND (p.subject_b_user_id IS NULL OR length(trim(p.subject_b_user_id)) = 0)
        THEN false
      WHEN p.scenario_mode = 'INTEGRATED_CLOSURE' THEN true
      ELSE NULL
    END AS subject_b_present
  FROM params p
),
subject_metrics AS (
  SELECT
    sg.*,
    (
      SELECT COUNT(*)::bigint
      FROM public.one_time_fulfillments AS o
      WHERE sg.subject_present AND o.user_id = sg.subject_user_id
    ) AS fulfillment_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.entitlements AS e
      WHERE sg.subject_present AND e.user_id = sg.subject_user_id
    ) AS entitlement_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.entitlement_rights AS er
      WHERE sg.subject_present AND er.user_id = sg.subject_user_id
    ) AS right_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.reply_ticket_wallets AS w
      WHERE sg.subject_present AND w.user_id = sg.subject_user_id
    ) AS wallet_row_count,
    (
      SELECT COALESCE(MAX(w.purchased_count), -1)::bigint
      FROM public.reply_ticket_wallets AS w
      WHERE sg.subject_present AND w.user_id = sg.subject_user_id
    ) AS wallet_purchased_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.reply_wallet_ledgers AS l
      WHERE sg.subject_present AND l.user_id = sg.subject_user_id
    ) AS ledger_row_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE sg.subject_present AND s.user_id = sg.subject_user_id AND s.user_hidden_at IS NULL
    ) AS snapshot_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.failed_fulfillments AS ff
      WHERE sg.subject_present AND ff.checkout_session_id IN (
        SELECT o.checkout_session_id FROM public.one_time_fulfillments AS o
        WHERE o.user_id = sg.subject_user_id
      )
    ) AS failed_fulfillment_count
  FROM subject_guard sg
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
stripe_event_counts AS (
  SELECT COUNT(*)::bigint AS stripe_event_row_count
  FROM public.stripe_events AS se
  CROSS JOIN subject_guard AS sg
  WHERE sg.subject_present
    AND EXISTS (
      SELECT 1
      FROM public.one_time_fulfillments AS otf
      WHERE otf.user_id = sg.subject_user_id AND otf.event_id = se.event_id
    )
),
subject_b_metrics AS (
  SELECT
    COALESCE(
      (
        SELECT COUNT(*) FILTER (WHERE o.product_id = 'dtr_core_full_v1')::bigint
        FROM subject_guard AS sg
        JOIN public.one_time_fulfillments AS o ON o.user_id = sg.subject_b_user_id
        WHERE sg.subject_b_present = true
      ),
      0
    )::bigint AS subject_b_full_fulfillment_count,
    COALESCE(
      (
        SELECT MAX(w.purchased_count)::bigint
        FROM subject_guard AS sg
        JOIN public.reply_ticket_wallets AS w ON w.user_id = sg.subject_b_user_id
        WHERE sg.subject_b_present = true
      ),
      -1
    )::bigint AS subject_b_wallet_purchased
),
flags AS (
  SELECT
    sg.scenario_mode,
    sg.subject_present,
    sg.subject_b_present,
    sm.fulfillment_count AS subject_precheck_fulfillment_count,
    sm.entitlement_count AS subject_precheck_entitlement_count,
    sm.wallet_row_count AS subject_precheck_wallet_rows,
    sm.failed_fulfillment_count AS subject_precheck_failed_count,
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
    sb.subject_b_full_fulfillment_count,
    sb.subject_b_wallet_purchased,
    sg.human_no_charge_confirmed,
    sg.human_rejection_code,
    sg.baseline_fulfillment_count,
    CASE
      WHEN sg.scenario_mode = 'SUBJECT_PRECHECK' AND NOT sg.subject_present THEN 'SUBJECT_IDENTITY_AMBIGUOUS'
      WHEN sg.scenario_mode = 'SUBJECT_PRECHECK'
        AND (
          sg.subject_user_id LIKE '%@%'
          OR (
            length(trim(sg.subject_safe_label)) > 0
            AND sg.subject_safe_label NOT IN ('M55_PROD_PURCHASE_A', 'M55_PROD_PURCHASE_B')
          )
        )
        THEN 'SUBJECT_REAL_USER_RISK'
      WHEN sg.scenario_mode = 'SUBJECT_PRECHECK'
        AND sm.fulfillment_count = 0
        AND sm.entitlement_count = 0
        AND sm.right_count = 0
        AND sm.wallet_row_count = 0
        AND sm.ledger_row_count = 0
        AND sm.snapshot_count = 0
        AND sm.failed_fulfillment_count = 0
        THEN 'SUBJECT_READY_CLEAN'
      WHEN sg.scenario_mode = 'SUBJECT_PRECHECK' AND sm.failed_fulfillment_count > 0 THEN 'SUBJECT_CONFLICTING_STATE'
      WHEN sg.scenario_mode = 'SUBJECT_PRECHECK' AND sm.fulfillment_count > 0 THEN 'SUBJECT_CONFLICTING_STATE'
      WHEN sg.scenario_mode = 'SUBJECT_PRECHECK' THEN 'SUBJECT_UNKNOWN'
      ELSE NULL
    END AS subject_classification,
    CASE
      WHEN sg.scenario_mode = 'LIGHT_POSTCHECK'
        AND f.light_fulfillment_count = 1
        AND e.light_entitlement_count >= 1
        AND r.core_origin_right_count >= 1
        AND w.wallet_initial_included = 1
        AND w.wallet_purchased_count = 0
        AND s.light_snapshot_count = 1
        AND fd.failed_fulfillment_count = 0
        THEN 'LIGHT_GREEN'
      WHEN sg.scenario_mode = 'CONVERSION_POSTCHECK'
        AND u.upgrade_product_ledger_count >= 1
        AND w.wallet_purchased_count = 4
        AND w.wallet_available_count <= 5
        AND fd.failed_fulfillment_count = 0
        THEN 'CONVERSION_GREEN'
      WHEN sg.scenario_mode = 'FRESH_FULL_POSTCHECK'
        AND f.full_fulfillment_count = 1
        AND e.full_entitlement_count >= 1
        AND w.wallet_purchased_count = 4
        AND w.wallet_available_count = 5
        AND s.full_snapshot_count = 1
        AND fd.failed_fulfillment_count = 0
        THEN 'FRESH_FULL_GREEN'
      WHEN sg.scenario_mode = 'DUPLICATE_REJECTION_POSTCHECK'
        AND sg.human_no_charge_confirmed = 'true'
        AND sg.human_rejection_code IN ('already_purchased', 'cap_reached')
        AND sg.baseline_fulfillment_count >= 0
        AND f.total_fulfillment_count = sg.baseline_fulfillment_count
        AND fd.failed_fulfillment_count = 0
        THEN 'DUPLICATE_REJECTED_NO_WRITE_GREEN'
      WHEN sg.scenario_mode = 'DUPLICATE_REJECTION_POSTCHECK'
        AND sg.human_no_charge_confirmed <> 'true'
        THEN 'DUPLICATE_REJECTION_HOLD_CHARGE_AMBIGUOUS'
      WHEN sg.scenario_mode = 'DUPLICATE_REJECTION_POSTCHECK'
        AND f.total_fulfillment_count > sg.baseline_fulfillment_count
        THEN 'DUPLICATE_REJECTION_HOLD_STATE_CHANGED'
      WHEN sg.scenario_mode = 'INTEGRATED_CLOSURE'
        AND sg.subject_present
        AND sg.subject_b_present
        AND f.light_fulfillment_count = 1
        AND u.upgrade_product_ledger_count >= 1
        AND sb.subject_b_full_fulfillment_count = 1
        AND (f.light_fulfillment_count + CASE WHEN u.upgrade_product_ledger_count >= 1 THEN 1 ELSE 0 END + sb.subject_b_full_fulfillment_count) = 3
        AND fd.failed_fulfillment_count = 0
        THEN 'PURCHASE_WAVE_GREEN'
      ELSE 'HOLD_EXACT_REASON'
    END AS scenario_classification,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT sg.subject_present THEN 'subject_missing' END,
      CASE WHEN sg.scenario_mode = 'INTEGRATED_CLOSURE' AND NOT sg.subject_b_present THEN 'subject_b_missing' END,
      CASE WHEN fd.failed_fulfillment_count > 0 THEN 'failed_fulfillments_present' END,
      CASE WHEN f.total_fulfillment_count > f.distinct_checkout_session_count THEN 'duplicate_checkout_fulfillment' END,
      CASE WHEN w.wallet_row_count > 1 THEN 'duplicate_wallet_rows' END,
      CASE WHEN s.total_snapshot_count > 2 THEN 'excessive_snapshot_rows' END,
      CASE
        WHEN sg.scenario_mode = 'DUPLICATE_REJECTION_POSTCHECK'
          AND f.total_fulfillment_count > sg.baseline_fulfillment_count
          THEN 'duplicate_state_delta'
      END
    ], NULL) AS failed_flags,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT sg.subject_present THEN 'subject_unknown' END,
      CASE WHEN w.wallet_initial_included < 0 AND sg.scenario_mode <> 'SUBJECT_PRECHECK' THEN 'wallet_unknown' END,
      CASE
        WHEN sg.scenario_mode = 'DUPLICATE_REJECTION_POSTCHECK'
          AND sg.human_no_charge_confirmed <> 'true'
          THEN 'human_no_charge_unconfirmed'
      END
    ], NULL) AS unknown_flags
  FROM subject_guard AS sg
  CROSS JOIN subject_metrics AS sm
  CROSS JOIN fulfillment AS f
  CROSS JOIN entitlements AS e
  CROSS JOIN rights AS r
  CROSS JOIN failed AS fd
  CROSS JOIN wallet AS w
  CROSS JOIN ledger AS l
  CROSS JOIN snapshots AS s
  CROSS JOIN upgrade_ledger AS u
  CROSS JOIN stripe_event_counts AS se
  CROSS JOIN subject_b_metrics AS sb
)
SELECT
  'm55_production_purchase_smoke_wave1_postcheck_v2' AS schema_version,
  scenario_mode,
  subject_present,
  subject_b_present,
  subject_classification,
  scenario_classification AS purchase_wave_classification,
  scenario_classification,
  light_fulfillment_count,
  full_fulfillment_count,
  total_fulfillment_count,
  light_entitlement_count,
  full_entitlement_count,
  wallet_purchased_count,
  wallet_available_count,
  upgrade_product_ledger_count,
  subject_b_full_fulfillment_count,
  subject_b_wallet_purchased,
  (light_fulfillment_count + CASE WHEN upgrade_product_ledger_count >= 1 THEN 1 ELSE 0 END + COALESCE(subject_b_full_fulfillment_count, 0))::integer AS integrated_successful_charge_count,
  failed_flags,
  unknown_flags,
  (scenario_mode = 'INTEGRATED_CLOSURE' AND scenario_classification = 'PURCHASE_WAVE_GREEN') AS cross_subject_isolation_green,
  (
    scenario_classification = 'PURCHASE_WAVE_GREEN'
    AND (light_fulfillment_count + CASE WHEN upgrade_product_ledger_count >= 1 THEN 1 ELSE 0 END + COALESCE(subject_b_full_fulfillment_count, 0)) = 3
  ) AS integrated_charge_budget_green,
  CASE
    WHEN scenario_classification = 'PURCHASE_WAVE_GREEN'
      AND cardinality(failed_flags) = 0
      AND cardinality(unknown_flags) = 0
      THEN true
    WHEN scenario_classification IN ('LIGHT_GREEN', 'CONVERSION_GREEN', 'FRESH_FULL_GREEN', 'DUPLICATE_REJECTED_NO_WRITE_GREEN')
      AND cardinality(failed_flags) = 0
      AND cardinality(unknown_flags) = 0
      THEN true
    WHEN scenario_classification = 'SUBJECT_READY_CLEAN'
      AND cardinality(failed_flags) = 0
      THEN true
    ELSE false
  END AS overall_predicate,
  CASE
    WHEN scenario_classification = 'PURCHASE_WAVE_GREEN' THEN 'CATEGORY-1-M55-PRODUCTION-CONTROLLED-DELETION-SMOKE-PLAN-DELTA-REVIEW'
    ELSE 'CATEGORY-1-M55-PRODUCTION-PURCHASE-WAVE-HUMAN-ACTION'
  END AS next_gate
FROM flags;
