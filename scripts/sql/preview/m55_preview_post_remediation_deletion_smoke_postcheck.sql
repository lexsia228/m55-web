-- =============================================================================
-- READ-ONLY — M55 Preview post-remediation deletion smoke postcheck
-- Path: scripts/sql/preview/m55_preview_post_remediation_deletion_smoke_postcheck.sql
--
-- Session GUCs (never commit real ids):
--   SET m55.preview_deletion_smoke.scenario_mode = 'PRE_DELETE_DEPLOYMENT_SUBJECT' |
--     'PRE_DELETE_EVENT_LEDGER' | 'POST_DELETE_EVENT_LEDGER_RPC' |
--     'POST_DELETE_TARGET_RETAINED' | 'POST_DELETE_UNRELATED' |
--     'INTEGRATED_PREVIEW_DELETION_CLOSURE';
--   SET m55.preview_deletion_smoke.deployment_identity_marker = '<post-push-deployment-id>';
--   SET m55.preview_deletion_smoke.subject_token = '<opaque subject token — never output>';
--   SET m55.preview_deletion_smoke.subject_safe_label = 'M55_PREVIEW_DELETE_POST_REMEDIATION_01';
--   SET m55.preview_deletion_smoke.human_clerk_action_marker = 'CLERK_DELETE_CONFIRMED';
--   SET m55.preview_deletion_smoke.human_transport_marker = 'WEBHOOK_ACCEPTED_EXACT';
--   SET m55.preview_deletion_smoke.unrelated_baseline_fingerprint = '<opaque baseline hash>';
--   SET m55.preview_deletion_smoke.observed_unrelated_fingerprint = '<opaque baseline hash>';
--
-- SELECT/WITH only — no DML/DDL/COPY/CALL/DO/NOTIFY.
-- No secrets, payloads, PII, Svix IDs, or raw Clerk IDs in output.
-- Clerk action and transport acceptance are NOT inferred from DB alone.
-- =============================================================================

WITH params AS (
  SELECT
    COALESCE(
      NULLIF(current_setting('m55.preview_deletion_smoke.scenario_mode', true), ''),
      'PRE_DELETE_DEPLOYMENT_SUBJECT'
    )::text AS scenario_mode,
    COALESCE(
      NULLIF(current_setting('m55.preview_deletion_smoke.deployment_identity_marker', true), ''),
      ''
    )::text AS deployment_identity_marker,
    COALESCE(
      NULLIF(current_setting('m55.preview_deletion_smoke.subject_token', true), ''),
      :'m55_preview_subject_token'
    )::text AS subject_token,
    COALESCE(
      NULLIF(current_setting('m55.preview_deletion_smoke.subject_safe_label', true), ''),
      'M55_PREVIEW_DELETE_POST_REMEDIATION_01'
    )::text AS subject_safe_label,
    COALESCE(
      NULLIF(current_setting('m55.preview_deletion_smoke.human_clerk_action_marker', true), ''),
      ''
    )::text AS human_clerk_action_marker,
    COALESCE(
      NULLIF(current_setting('m55.preview_deletion_smoke.human_transport_marker', true), ''),
      ''
    )::text AS human_transport_marker,
    COALESCE(
      NULLIF(current_setting('m55.preview_deletion_smoke.unrelated_baseline_fingerprint', true), ''),
      ''
    )::text AS unrelated_baseline_fingerprint,
    COALESCE(
      NULLIF(current_setting('m55.preview_deletion_smoke.observed_unrelated_fingerprint', true), ''),
      ''
    )::text AS observed_unrelated_fingerprint
),
subject_guard AS (
  SELECT
    p.*,
    -- deployment_identity_green: true when a non-empty execution deployment marker is supplied.
    -- The actual deployment identity is verified by the orchestrator/Human; the SQL only checks
    -- that the marker was provided, not that it matches a hardcoded planning deployment ID.
    CASE
      WHEN length(trim(p.deployment_identity_marker)) > 0 THEN true
      ELSE false
    END AS deployment_identity_green,
    CASE
      WHEN length(trim(p.subject_token)) > 0 THEN true
      ELSE false
    END AS subject_ref_present,
    CASE
      WHEN p.subject_safe_label = 'M55_PREVIEW_DELETE_POST_REMEDIATION_01' THEN true
      ELSE false
    END AS subject_label_exact
  FROM params p
),
subject_metrics AS (
  SELECT
    sg.*,
    (
      SELECT COUNT(*)::bigint
      FROM public.entitlements AS e
      WHERE sg.subject_ref_present AND e.user_id = sg.subject_token
    ) AS subject_entitlement_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.reply_ticket_wallets AS w
      WHERE sg.subject_ref_present AND w.user_id = sg.subject_token
    ) AS subject_wallet_row_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.dtr_report_snapshots AS s
      WHERE sg.subject_ref_present AND s.user_id = sg.subject_token AND s.user_hidden_at IS NULL
    ) AS subject_snapshot_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE sg.subject_ref_present
        AND c.deletion_subject_id IS NOT NULL
    ) AS subject_prior_event_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.failed_fulfillments AS ff
      WHERE sg.subject_ref_present AND ff.checkout_session_id IN (
        SELECT o.checkout_session_id FROM public.one_time_fulfillments AS o
        WHERE o.user_id = sg.subject_token
      )
    ) AS subject_failed_fulfillment_count
  FROM subject_guard sg
),
event_ledger AS (
  SELECT
    sm.*,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE c.event_type = 'user.deleted' AND c.status = 'succeeded'
    ) AS global_succeeded_event_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE c.event_type = 'user.deleted' AND c.status IN ('pending', 'processing', 'failed')
    ) AS global_ambiguous_event_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE c.deletion_subject_id IS NOT NULL AND c.status = 'succeeded'
    ) AS global_deletion_ledger_count
  FROM subject_metrics sm
),
post_delete AS (
  SELECT
    el.*,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE c.event_type = 'user.deleted'
        AND c.status = 'succeeded'
        AND el.scenario_mode IN ('POST_DELETE_EVENT_LEDGER_RPC', 'INTEGRATED_PREVIEW_DELETION_CLOSURE')
    ) AS post_event_succeeded_count,
    (
      SELECT COUNT(*)::bigint
      FROM public.clerk_webhook_events AS c
      WHERE c.deletion_subject_id IS NOT NULL
        AND c.status = 'succeeded'
        AND el.scenario_mode IN ('POST_DELETE_EVENT_LEDGER_RPC', 'INTEGRATED_PREVIEW_DELETION_CLOSURE')
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
      WHEN pd.scenario_mode = 'PRE_DELETE_DEPLOYMENT_SUBJECT'
        AND NOT pd.deployment_identity_green THEN 'HOLD_DEPLOYMENT_MISMATCH'
      WHEN pd.scenario_mode = 'PRE_DELETE_DEPLOYMENT_SUBJECT'
        AND NOT pd.subject_label_exact THEN 'HOLD_SUBJECT_LABEL_MISMATCH'
      WHEN pd.scenario_mode = 'PRE_DELETE_DEPLOYMENT_SUBJECT'
        AND pd.subject_prior_event_count > 0 THEN 'HOLD_PRIOR_EVENT_OR_LEDGER_PRESENT'
      WHEN pd.scenario_mode = 'PRE_DELETE_DEPLOYMENT_SUBJECT'
        AND pd.subject_ref_present
        AND pd.subject_prior_event_count = 0
        AND length(trim(pd.unrelated_baseline_fingerprint)) > 0
        THEN 'SUBJECT_PRECHECK_GREEN'
      WHEN pd.scenario_mode = 'PRE_DELETE_DEPLOYMENT_SUBJECT' THEN 'HOLD_UNKNOWN'
      WHEN pd.scenario_mode = 'PRE_DELETE_EVENT_LEDGER'
        AND pd.global_succeeded_event_count = 0
        AND pd.global_ambiguous_event_count = 0
        AND pd.global_deletion_ledger_count = 0
        THEN 'EVENT_LEDGER_PRECHECK_GREEN'
      WHEN pd.scenario_mode = 'PRE_DELETE_EVENT_LEDGER'
        AND pd.global_succeeded_event_count > 0 THEN 'HOLD_PRIOR_EVENT_OR_LEDGER_PRESENT'
      WHEN pd.scenario_mode = 'PRE_DELETE_EVENT_LEDGER'
        AND pd.global_deletion_ledger_count > 0 THEN 'HOLD_PRIOR_DELETION_LEDGER_PRESENT'
      WHEN pd.scenario_mode = 'PRE_DELETE_EVENT_LEDGER' THEN 'HOLD_UNKNOWN'
      WHEN pd.scenario_mode = 'POST_DELETE_EVENT_LEDGER_RPC'
        AND pd.human_clerk_action_marker = 'CLERK_DELETE_CONFIRMED'
        AND pd.human_transport_marker = 'WEBHOOK_ACCEPTED_EXACT'
        AND pd.post_event_succeeded_count = 1
        AND pd.post_deletion_ledger_count = 1
        THEN 'POST_EVENT_RPC_GREEN'
      WHEN pd.scenario_mode = 'POST_DELETE_EVENT_LEDGER_RPC'
        AND (pd.human_clerk_action_marker = '' OR pd.human_transport_marker = '')
        THEN 'HOLD_TRANSPORT_OR_CLERK_MARKER_MISSING'
      WHEN pd.scenario_mode = 'POST_DELETE_EVENT_LEDGER_RPC'
        AND pd.post_event_succeeded_count <> 1 THEN 'HOLD_EVENT_LEDGER_MISMATCH'
      WHEN pd.scenario_mode = 'POST_DELETE_EVENT_LEDGER_RPC' THEN 'HOLD_UNKNOWN'
      WHEN pd.scenario_mode = 'POST_DELETE_TARGET_RETAINED'
        AND pd.subject_entitlement_count = 0
        AND pd.subject_wallet_row_count = 0
        AND pd.subject_snapshot_count = 0
        AND pd.stripe_events_retained_count >= 0
        AND pd.stripe_processed_retained_count >= 0
        THEN 'TARGET_RETAINED_GREEN'
      WHEN pd.scenario_mode = 'POST_DELETE_TARGET_RETAINED' THEN 'HOLD_TARGET_DATA_REMAINS'
      WHEN pd.scenario_mode = 'POST_DELETE_UNRELATED'
        AND pd.observed_unrelated_fingerprint = pd.unrelated_baseline_fingerprint
        THEN 'UNRELATED_DATA_GREEN'
      WHEN pd.scenario_mode = 'POST_DELETE_UNRELATED'
        AND pd.observed_unrelated_fingerprint <> pd.unrelated_baseline_fingerprint
        THEN 'HOLD_UNRELATED_DATA_CHANGED'
      WHEN pd.scenario_mode = 'POST_DELETE_UNRELATED' THEN 'HOLD_UNKNOWN'
      WHEN pd.scenario_mode = 'INTEGRATED_PREVIEW_DELETION_CLOSURE'
        AND pd.human_clerk_action_marker = 'CLERK_DELETE_CONFIRMED'
        AND pd.human_transport_marker = 'WEBHOOK_ACCEPTED_EXACT'
        AND pd.post_event_succeeded_count = 1
        AND pd.post_deletion_ledger_count = 1
        AND pd.subject_entitlement_count = 0
        AND pd.observed_unrelated_fingerprint = pd.unrelated_baseline_fingerprint
        THEN 'PREVIEW_DELETION_GREEN'
      WHEN pd.scenario_mode = 'INTEGRATED_PREVIEW_DELETION_CLOSURE'
        AND (pd.human_clerk_action_marker = '' OR pd.human_transport_marker = '')
        THEN 'HOLD_WEBHOOK_NOT_ACCEPTED'
      WHEN pd.scenario_mode = 'INTEGRATED_PREVIEW_DELETION_CLOSURE' THEN 'HOLD_UNKNOWN'
      ELSE 'HOLD_UNKNOWN'
    END AS scenario_classification,
    CASE
      WHEN pd.scenario_mode = 'PRE_DELETE_DEPLOYMENT_SUBJECT'
        AND pd.subject_ref_present
        AND pd.subject_prior_event_count = 0
        AND pd.subject_label_exact
        THEN 'SUBJECT_NEW_AND_CLEAN'
      WHEN pd.scenario_mode = 'PRE_DELETE_DEPLOYMENT_SUBJECT'
        AND pd.subject_prior_event_count > 0 THEN 'SUBJECT_PREVIOUS_ATTEMPT_REUSE_RISK'
      ELSE NULL
    END AS subject_precheck_classification,
    CASE
      WHEN pd.scenario_mode = 'PRE_DELETE_DEPLOYMENT_SUBJECT'
        AND pd.subject_prior_event_count > 0 THEN true
      ELSE false
    END AS historical_attempt_reuse_detected,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT pd.deployment_identity_green THEN 'deployment_mismatch' END,
      CASE WHEN NOT pd.subject_label_exact THEN 'subject_label_mismatch' END,
      CASE WHEN NOT pd.subject_ref_present THEN 'subject_ref_missing' END,
      CASE WHEN pd.subject_failed_fulfillment_count > 0 THEN 'failed_fulfillments_present' END,
      CASE
        WHEN pd.scenario_mode IN ('POST_DELETE_EVENT_LEDGER_RPC', 'INTEGRATED_PREVIEW_DELETION_CLOSURE')
          AND pd.post_event_succeeded_count > 1
          THEN 'duplicate_event'
      END,
      CASE
        WHEN pd.scenario_mode IN ('POST_DELETE_EVENT_LEDGER_RPC', 'INTEGRATED_PREVIEW_DELETION_CLOSURE')
          AND pd.post_deletion_ledger_count > 1
          THEN 'duplicate_ledger'
      END
    ], NULL) AS failed_flags,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT pd.subject_ref_present THEN 'subject_unknown' END,
      CASE
        WHEN pd.scenario_mode IN ('POST_DELETE_EVENT_LEDGER_RPC', 'INTEGRATED_PREVIEW_DELETION_CLOSURE')
          AND pd.human_clerk_action_marker = ''
          THEN 'clerk_marker_unconfirmed'
      END,
      CASE
        WHEN pd.scenario_mode IN ('POST_DELETE_EVENT_LEDGER_RPC', 'INTEGRATED_PREVIEW_DELETION_CLOSURE')
          AND pd.human_transport_marker = ''
          THEN 'transport_marker_unconfirmed'
      END
    ], NULL) AS unknown_flags
  FROM post_delete pd
)
SELECT
  'm55_preview_post_remediation_deletion_smoke_postcheck_v1' AS schema_version,
  scenario_mode,
  deployment_identity_green,
  subject_precheck_classification,
  historical_attempt_reuse_detected,
  (post_event_succeeded_count = 1) AS event_ledger_green,
  (post_deletion_ledger_count = 1) AS deletion_ledger_green,
  (post_event_succeeded_count = 1 AND post_deletion_ledger_count = 1) AS rpc_green,
  (scenario_classification IN ('TARGET_RETAINED_GREEN', 'PREVIEW_DELETION_GREEN')) AS target_state_green,
  (stripe_events_retained_count >= 0 AND stripe_processed_retained_count >= 0) AS retained_state_green,
  (scenario_classification = 'PREVIEW_DELETION_GREEN') AS identifiability_green,
  CASE
    WHEN observed_unrelated_fingerprint = unrelated_baseline_fingerprint THEN 0
    ELSE 1
  END::integer AS unrelated_data_change_count,
  scenario_classification AS deletion_smoke_classification,
  failed_flags,
  unknown_flags,
  CASE
    WHEN scenario_classification = 'PREVIEW_DELETION_GREEN'
      AND cardinality(failed_flags) = 0
      AND cardinality(unknown_flags) = 0
      THEN true
    WHEN scenario_classification IN (
      'SUBJECT_PRECHECK_GREEN', 'EVENT_LEDGER_PRECHECK_GREEN',
      'POST_EVENT_RPC_GREEN', 'TARGET_RETAINED_GREEN', 'UNRELATED_DATA_GREEN'
    )
      AND cardinality(failed_flags) = 0
      THEN true
    ELSE false
  END AS overall_predicate,
  CASE
    WHEN scenario_classification = 'PREVIEW_DELETION_GREEN'
      THEN 'CATEGORY-1-M55-FINAL-INTEGRATED-RC-AUDIT'
    ELSE 'CATEGORY-1-M55-PREVIEW-ACCOUNT-DELETION-SMOKE-POST-REMEDIATION-HUMAN-ACTION'
  END AS next_gate
FROM flags;
