-- =============================================================================
-- READ-ONLY — M55 Production controlled-deletion smoke postcheck
-- Path: scripts/sql/production/m55_production_controlled_deletion_smoke_postcheck.sql
--
-- Session GUCs (never commit real ids):
--   SET m55.deletion_smoke.scenario_mode = 'PRE_DELETE_SUBJECT_CONTROL' |
--     'PRE_DELETE_EVENT_LEDGER' | 'POST_DELETE_EVENT_RPC' |
--     'POST_DELETE_TARGET_RETAINED' | 'POST_DELETE_CONTROL_UNRELATED' |
--     'INTEGRATED_DELETION_CLOSURE';
--   SET m55.deletion_smoke.deletion_subject_token = '<opaque subject token — never output>';
--   SET m55.deletion_smoke.control_subject_token = '<opaque subject token — never output>';
--   SET m55.deletion_smoke.deletion_safe_label = 'M55_PROD_PURCHASE_A';
--   SET m55.deletion_smoke.control_safe_label = 'M55_PROD_PURCHASE_B';
--   SET m55.deletion_smoke.human_clerk_action_marker = 'CLERK_DELETE_CONFIRMED';
--   SET m55.deletion_smoke.human_transport_marker = 'WEBHOOK_ACCEPTED_EXACT';
--   SET m55.deletion_smoke.control_baseline_fingerprint = '<opaque baseline hash>';
--
-- SELECT/WITH only — no DML/DDL/COPY/CALL/DO/NOTIFY.
-- No secrets, payloads, PII, Svix IDs, or raw Clerk IDs in output.
-- Clerk action and transport acceptance are NOT inferred from DB alone.
-- =============================================================================

WITH params AS (
  SELECT
    COALESCE(
      NULLIF(current_setting('m55.deletion_smoke.scenario_mode', true), ''),
      'PRE_DELETE_SUBJECT_CONTROL'
    )::text AS scenario_mode,
    COALESCE(
      NULLIF(current_setting('m55.deletion_smoke.deletion_subject_token', true), ''),
      :'m55_deletion_subject_token'
    )::text AS deletion_subject_token,
    COALESCE(
      NULLIF(current_setting('m55.deletion_smoke.control_subject_token', true), ''),
      :'m55_control_subject_token'
    )::text AS control_subject_token,
    COALESCE(
      NULLIF(current_setting('m55.deletion_smoke.deletion_safe_label', true), ''),
      'M55_PROD_PURCHASE_A'
    )::text AS deletion_safe_label,
    COALESCE(
      NULLIF(current_setting('m55.deletion_smoke.control_safe_label', true), ''),
      'M55_PROD_PURCHASE_B'
    )::text AS control_safe_label,
    COALESCE(
      NULLIF(current_setting('m55.deletion_smoke.human_clerk_action_marker', true), ''),
      ''
    )::text AS human_clerk_action_marker,
    COALESCE(
      NULLIF(current_setting('m55.deletion_smoke.human_transport_marker', true), ''),
      ''
    )::text AS human_transport_marker,
    COALESCE(
      NULLIF(current_setting('m55.deletion_smoke.control_baseline_fingerprint', true), ''),
      ''
    )::text AS control_baseline_fingerprint,
    COALESCE(
      NULLIF(current_setting('m55.deletion_smoke.observed_control_fingerprint', true), ''),
      ''
    )::text AS observed_control_fingerprint
),
subject_guard AS (
  SELECT
    p.*,
    CASE
      WHEN length(trim(p.deletion_subject_token)) > 0 THEN true
      ELSE false
    END AS deletion_ref_present,
    CASE
      WHEN length(trim(p.control_subject_token)) > 0 THEN true
      ELSE false
    END AS control_ref_present,
    CASE
      WHEN p.deletion_safe_label = 'M55_PROD_PURCHASE_A'
        AND p.control_safe_label = 'M55_PROD_PURCHASE_B'
        AND p.deletion_safe_label <> p.control_safe_label
        THEN true
      ELSE false
    END AS labels_exact
  FROM params p
),
deletion_metrics AS (
  SELECT
    sg.*,
    (
      SELECT COUNT(*)::bigint
      FROM public.entitlements AS e
      WHERE sg.deletion_ref_present AND e.user_id = sg.deletion_subject_token
    ) AS deletion_entitlement_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.entitlement_rights AS er
      WHERE sg.deletion_ref_present AND er.user_id = sg.deletion_subject_token
    ) AS deletion_right_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.reply_ticket_wallets AS w
      WHERE sg.deletion_ref_present AND w.user_id = sg.deletion_subject_token
    ) AS deletion_wallet_row_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE sg.deletion_ref_present AND s.user_id = sg.deletion_subject_token AND s.user_hidden_at IS NULL
    ) AS deletion_snapshot_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.one_time_fulfillments AS o
      WHERE sg.deletion_ref_present AND o.user_id = sg.deletion_subject_token
    ) AS deletion_fulfillment_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE sg.deletion_ref_present
        AND c.deletion_subject_id IS NOT NULL
    ) AS deletion_prior_event_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.failed_fulfillments AS ff
      WHERE sg.deletion_ref_present AND ff.checkout_session_id IN (
        SELECT o.checkout_session_id FROM public.one_time_fulfillments AS o
        WHERE o.user_id = sg.deletion_subject_token
      )
    ) AS deletion_failed_fulfillment_count
  FROM subject_guard sg
),
control_metrics AS (
  SELECT
    dm.*,
    (
      SELECT COUNT(*)::bigint
      FROM public.entitlements AS e
      WHERE dm.control_ref_present AND e.user_id = dm.control_subject_token
    ) AS control_entitlement_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.one_time_fulfillments AS o
      WHERE dm.control_ref_present AND o.user_id = dm.control_subject_token
        AND o.product_id = 'dtr_core_full_v1'
    ) AS control_full_fulfillment_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE dm.control_ref_present AND c.deletion_subject_id IS NOT NULL
    ) AS control_prior_event_count
  FROM deletion_metrics dm
),
event_ledger AS (
  SELECT
    cm.*,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE c.event_type = 'user.deleted' AND c.status = 'succeeded'
    ) AS global_succeeded_event_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE c.event_type = 'user.deleted' AND c.status IN ('pending', 'processing', 'failed')
    ) AS global_ambiguous_event_count
  FROM control_metrics cm
),
post_delete AS (
  SELECT
    el.*,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE c.event_type = 'user.deleted'
        AND c.status = 'succeeded'
        AND el.scenario_mode IN ('POST_DELETE_EVENT_RPC', 'INTEGRATED_DELETION_CLOSURE')
    ) AS post_event_succeeded_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE c.deletion_subject_id IS NOT NULL
        AND c.status = 'succeeded'
        AND el.scenario_mode IN ('POST_DELETE_EVENT_RPC', 'INTEGRATED_DELETION_CLOSURE')
    ) AS post_deletion_ledger_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.stripe_events AS se
    ) AS stripe_events_retained_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.stripe_processed_events AS spe
    ) AS stripe_processed_retained_count
  FROM event_ledger el
),
flags AS (
  SELECT
    pd.*,
    CASE
      WHEN pd.scenario_mode = 'PRE_DELETE_SUBJECT_CONTROL'
        AND NOT pd.labels_exact THEN 'HOLD_SUBJECT_STATE_MISMATCH'
      WHEN pd.scenario_mode = 'PRE_DELETE_SUBJECT_CONTROL'
        AND pd.deletion_prior_event_count > 0 THEN 'HOLD_PRIOR_EVENT_OR_LEDGER_PRESENT'
      WHEN pd.scenario_mode = 'PRE_DELETE_SUBJECT_CONTROL'
        AND pd.deletion_fulfillment_count >= 1
        AND pd.deletion_entitlement_count >= 1
        AND pd.deletion_prior_event_count = 0
        AND pd.control_full_fulfillment_count >= 1
        AND pd.control_prior_event_count = 0
        AND length(trim(pd.control_baseline_fingerprint)) > 0
        THEN 'DELETION_SUBJECT_READY'
      WHEN pd.scenario_mode = 'PRE_DELETE_SUBJECT_CONTROL'
        AND pd.control_full_fulfillment_count >= 1
        AND pd.control_prior_event_count = 0
        AND length(trim(pd.control_baseline_fingerprint)) > 0
        THEN 'CONTROL_SUBJECT_READY'
      WHEN pd.scenario_mode = 'PRE_DELETE_SUBJECT_CONTROL' THEN 'HOLD_UNKNOWN'
      WHEN pd.scenario_mode = 'PRE_DELETE_EVENT_LEDGER'
        AND pd.global_succeeded_event_count = 0
        AND pd.global_ambiguous_event_count = 0
        THEN 'EVENT_LEDGER_PRECHECK_GREEN'
      WHEN pd.scenario_mode = 'PRE_DELETE_EVENT_LEDGER'
        AND pd.global_succeeded_event_count > 0 THEN 'HOLD_PRIOR_EVENT_OR_LEDGER_PRESENT'
      WHEN pd.scenario_mode = 'PRE_DELETE_EVENT_LEDGER' THEN 'HOLD_UNKNOWN'
      WHEN pd.scenario_mode = 'POST_DELETE_EVENT_RPC'
        AND pd.human_clerk_action_marker = 'CLERK_DELETE_CONFIRMED'
        AND pd.human_transport_marker = 'WEBHOOK_ACCEPTED_EXACT'
        AND pd.post_event_succeeded_count = 1
        AND pd.post_deletion_ledger_count = 1
        THEN 'POST_EVENT_RPC_GREEN'
      WHEN pd.scenario_mode = 'POST_DELETE_EVENT_RPC'
        AND (pd.human_clerk_action_marker = '' OR pd.human_transport_marker = '')
        THEN 'HOLD_TRANSPORT_OR_CLERK_MARKER_MISSING'
      WHEN pd.scenario_mode = 'POST_DELETE_EVENT_RPC'
        AND pd.post_event_succeeded_count <> 1 THEN 'HOLD_EVENT_LEDGER_MISMATCH'
      WHEN pd.scenario_mode = 'POST_DELETE_EVENT_RPC' THEN 'HOLD_UNKNOWN'
      WHEN pd.scenario_mode = 'POST_DELETE_TARGET_RETAINED'
        AND pd.deletion_entitlement_count = 0
        AND pd.deletion_wallet_row_count = 0
        AND pd.deletion_snapshot_count = 0
        AND pd.stripe_events_retained_count >= 0
        AND pd.stripe_processed_retained_count >= 0
        THEN 'TARGET_RETAINED_GREEN'
      WHEN pd.scenario_mode = 'POST_DELETE_TARGET_RETAINED' THEN 'HOLD_TARGET_DATA_REMAINS'
      WHEN pd.scenario_mode = 'POST_DELETE_CONTROL_UNRELATED'
        AND pd.labels_exact
        AND length(trim(pd.control_baseline_fingerprint)) > 0
        AND length(trim(pd.observed_control_fingerprint)) > 0
        AND pd.observed_control_fingerprint = pd.control_baseline_fingerprint
        THEN 'CONTROL_UNRELATED_GREEN'
      WHEN pd.scenario_mode = 'POST_DELETE_CONTROL_UNRELATED'
        AND pd.observed_control_fingerprint <> pd.control_baseline_fingerprint
        THEN 'HOLD_CONTROL_SUBJECT_CHANGED'
      WHEN pd.scenario_mode = 'POST_DELETE_CONTROL_UNRELATED' THEN 'HOLD_UNKNOWN'
      WHEN pd.scenario_mode = 'INTEGRATED_DELETION_CLOSURE'
        AND pd.human_clerk_action_marker = 'CLERK_DELETE_CONFIRMED'
        AND pd.human_transport_marker = 'WEBHOOK_ACCEPTED_EXACT'
        AND pd.post_event_succeeded_count = 1
        AND pd.post_deletion_ledger_count = 1
        AND pd.deletion_entitlement_count = 0
        AND pd.observed_control_fingerprint = pd.control_baseline_fingerprint
        THEN 'PRODUCTION_DELETION_GREEN'
      WHEN pd.scenario_mode = 'INTEGRATED_DELETION_CLOSURE'
        AND (pd.human_clerk_action_marker = '' OR pd.human_transport_marker = '')
        THEN 'HOLD_WEBHOOK_NOT_ACCEPTED'
      WHEN pd.scenario_mode = 'INTEGRATED_DELETION_CLOSURE' THEN 'HOLD_UNKNOWN'
      ELSE 'HOLD_UNKNOWN'
    END AS scenario_classification,
    CASE
      WHEN pd.scenario_mode = 'PRE_DELETE_SUBJECT_CONTROL'
        AND pd.deletion_entitlement_count >= 1 THEN 'DELETION_SUBJECT_READY'
      WHEN pd.scenario_mode = 'PRE_DELETE_SUBJECT_CONTROL'
        AND pd.control_full_fulfillment_count >= 1 THEN 'CONTROL_SUBJECT_READY'
      ELSE NULL
    END AS deletion_subject_precheck_classification,
    CASE
      WHEN pd.scenario_mode = 'PRE_DELETE_SUBJECT_CONTROL'
        AND pd.control_full_fulfillment_count >= 1 THEN 'CONTROL_SUBJECT_READY'
      ELSE NULL
    END AS control_subject_precheck_classification,
    pd.human_transport_marker AS transport_evidence_marker,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT pd.deletion_ref_present THEN 'deletion_ref_missing' END,
      CASE WHEN NOT pd.control_ref_present THEN 'control_ref_missing' END,
      CASE WHEN NOT pd.labels_exact THEN 'labels_mismatch' END,
      CASE WHEN pd.deletion_failed_fulfillment_count > 0 THEN 'failed_fulfillments_present' END,
      CASE
        WHEN pd.scenario_mode IN ('POST_DELETE_EVENT_RPC', 'INTEGRATED_DELETION_CLOSURE')
          AND pd.post_event_succeeded_count > 1
          THEN 'duplicate_event'
      END,
      CASE
        WHEN pd.scenario_mode IN ('POST_DELETE_EVENT_RPC', 'INTEGRATED_DELETION_CLOSURE')
          AND pd.post_deletion_ledger_count > 1
          THEN 'duplicate_ledger'
      END
    ], NULL) AS failed_flags,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT pd.deletion_ref_present THEN 'deletion_unknown' END,
      CASE WHEN NOT pd.control_ref_present THEN 'control_unknown' END,
      CASE
        WHEN pd.scenario_mode IN ('POST_DELETE_EVENT_RPC', 'INTEGRATED_DELETION_CLOSURE')
          AND pd.human_clerk_action_marker = ''
          THEN 'clerk_marker_unconfirmed'
      END,
      CASE
        WHEN pd.scenario_mode IN ('POST_DELETE_EVENT_RPC', 'INTEGRATED_DELETION_CLOSURE')
          AND pd.human_transport_marker = ''
          THEN 'transport_marker_unconfirmed'
      END
    ], NULL) AS unknown_flags
  FROM post_delete pd
)
SELECT
  'm55_production_controlled_deletion_smoke_postcheck_v1' AS schema_version,
  scenario_mode,
  labels_exact,
  deletion_subject_precheck_classification,
  control_subject_precheck_classification,
  transport_evidence_marker,
  scenario_classification AS deletion_classification,
  scenario_classification,
  post_event_succeeded_count AS event_row_count,
  post_deletion_ledger_count AS deletion_ledger_row_count,
  (post_event_succeeded_count = 1 AND post_deletion_ledger_count = 1) AS rpc_green,
  (scenario_classification IN ('TARGET_RETAINED_GREEN', 'PRODUCTION_DELETION_GREEN')) AS target_state_green,
  (stripe_events_retained_count >= 0 AND stripe_processed_retained_count >= 0) AS retained_state_green,
  (scenario_classification = 'PRODUCTION_DELETION_GREEN') AS identifiability_green,
  (observed_control_fingerprint = control_baseline_fingerprint) AS control_subject_unchanged,
  CASE
    WHEN observed_control_fingerprint = control_baseline_fingerprint THEN 0
    ELSE 1
  END::integer AS unrelated_data_change_count,
  (post_event_succeeded_count = 1) AS event_ledger_green,
  (post_deletion_ledger_count = 1) AS deletion_ledger_green,
  failed_flags,
  unknown_flags,
  CASE
    WHEN scenario_classification = 'PRODUCTION_DELETION_GREEN'
      AND cardinality(failed_flags) = 0
      AND cardinality(unknown_flags) = 0
      THEN true
    WHEN scenario_classification IN (
      'DELETION_SUBJECT_READY', 'CONTROL_SUBJECT_READY', 'EVENT_LEDGER_PRECHECK_GREEN',
      'POST_EVENT_RPC_GREEN', 'TARGET_RETAINED_GREEN', 'CONTROL_UNRELATED_GREEN'
    )
      AND cardinality(failed_flags) = 0
      THEN true
    ELSE false
  END AS overall_predicate,
  CASE
    WHEN scenario_classification = 'PRODUCTION_DELETION_GREEN'
      THEN 'CATEGORY-1-M55-FINAL-PUBLIC-RELEASE-GO-CHECKLIST-READ-ONLY-PLANNING'
    ELSE 'CATEGORY-1-M55-PRODUCTION-CONTROLLED-DELETION-SMOKE-HUMAN-ACTION'
  END AS next_gate
FROM flags;
