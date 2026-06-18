-- =============================================================================
-- READ-ONLY — M55 Preview deletion smoke correlation pre/postcheck v2
-- SELECT/WITH only. No mutation, RPC, psql placeholders, secrets, raw IDs, hashes, payloads, or Svix IDs in output.
-- Local helper sets transaction-local GUCs from one raw subject input; Human never supplies a hash.
-- =============================================================================

WITH params AS (
  SELECT
    COALESCE(NULLIF(current_setting('m55.preview_deletion_smoke.scenario_mode', true), ''), 'PRE_DELETE_DEPLOYMENT_SUBJECT')::text AS scenario_mode,
    COALESCE(NULLIF(current_setting('m55.preview_deletion_smoke.raw_subject_token', true), ''), '')::text AS raw_subject_token,
    COALESCE(NULLIF(current_setting('m55.preview_deletion_smoke.user_ref_hash', true), ''), '')::text AS user_ref_hash,
    COALESCE(NULLIF(current_setting('m55.preview_deletion_smoke.final_pushed_head', true), ''), '')::text AS final_pushed_head,
    COALESCE(NULLIF(current_setting('m55.preview_deletion_smoke.deployment_identity', true), ''), '')::text AS deployment_identity,
    COALESCE(NULLIF(current_setting('m55.preview_deletion_smoke.migration_identity', true), ''), '')::text AS migration_identity,
    COALESCE(NULLIF(current_setting('m55.preview_deletion_smoke.migration_sha256', true), ''), '')::text AS migration_sha256,
    COALESCE(NULLIF(current_setting('m55.preview_deletion_smoke.postapply_catalog_identity', true), ''), '')::text AS postapply_catalog_identity,
    COALESCE(NULLIF(current_setting('m55.preview_deletion_smoke.precheck_failed_fulfillment_ids_json', true), ''), '[]')::jsonb AS precheck_failed_fulfillment_ids_json,
    COALESCE(NULLIF(current_setting('m55.preview_deletion_smoke.precheck_unrelated_surface_sha256', true), ''), '')::text AS precheck_unrelated_surface_sha256
), guards AS (
  SELECT
    p.*,
    p.scenario_mode IN (
      'PRE_DELETE_DEPLOYMENT_SUBJECT','PRE_DELETE_EVENT_LEDGER','POST_DELETE_EVENT_LEDGER_RPC',
      'POST_DELETE_TARGET_RETAINED','POST_DELETE_UNRELATED','INTEGRATED_PREVIEW_DELETION_CLOSURE'
    ) AS mode_known,
    p.raw_subject_token LIKE 'user\_%' ESCAPE '\' AS raw_subject_present,
    p.user_ref_hash ~ '^[0-9a-f]{16}$' AS hash_format_green,
    p.final_pushed_head ~ '^[0-9a-f]{40}$' AS head_green,
    length(p.deployment_identity) > 8 AS deployment_green,
    p.migration_identity = '20260617000001_m55_clerk_webhook_user_ref_hash_v1' AS migration_identity_green,
    p.migration_sha256 ~ '^[0-9a-f]{64}$' AS migration_sha_green,
    length(p.postapply_catalog_identity) > 8 AS catalog_green,
    p.precheck_unrelated_surface_sha256 = '' OR p.precheck_unrelated_surface_sha256 ~ '^[0-9a-f]{64}$' AS precheck_unrelated_sha_green
  FROM params p
), ff_predelete AS (
  SELECT
    g.*,
    COALESCE(jsonb_agg(ff.id::text ORDER BY ff.id::text) FILTER (WHERE ff.id IS NOT NULL), '[]'::jsonb) AS failed_fulfillment_uuid_list,
    COUNT(ff.id)::integer AS failed_fulfillment_count,
    md5(COALESCE(string_agg(ff.id::text, '|' ORDER BY ff.id::text), 'EMPTY_SET')) AS failed_fulfillment_uuid_digest_sql
  FROM guards g
  LEFT JOIN public.failed_fulfillments AS ff
    ON g.raw_subject_present
   AND (
        ff.user_ref_hash = g.user_ref_hash
        OR ff.checkout_session_id IN (
          SELECT otf.checkout_session_id
          FROM public.one_time_fulfillments AS otf
          WHERE otf.user_id = g.raw_subject_token
        )
   )
  GROUP BY g.scenario_mode, g.raw_subject_token, g.user_ref_hash, g.final_pushed_head, g.deployment_identity,
           g.migration_identity, g.migration_sha256, g.postapply_catalog_identity,
           g.precheck_failed_fulfillment_ids_json, g.precheck_unrelated_surface_sha256,
           g.mode_known, g.raw_subject_present, g.hash_format_green, g.head_green, g.deployment_green,
           g.migration_identity_green, g.migration_sha_green, g.catalog_green, g.precheck_unrelated_sha_green
), ff_bound AS (
  SELECT
    f.*,
    COALESCE((SELECT array_agg(value::uuid ORDER BY value) FROM jsonb_array_elements_text(f.precheck_failed_fulfillment_ids_json) AS x(value)), ARRAY[]::uuid[]) AS bound_failed_fulfillment_ids
  FROM ff_predelete f
), event_scope AS (
  SELECT
    fb.*,
    (SELECT COUNT(*)::integer FROM public.clerk_webhook_events c WHERE c.event_type = 'user.deleted' AND c.user_ref_hash = fb.user_ref_hash) AS correlated_event_count,
    (SELECT COUNT(*)::integer FROM public.clerk_webhook_events c WHERE c.event_type = 'user.deleted' AND c.user_ref_hash = fb.user_ref_hash AND c.status = 'succeeded') AS correlated_succeeded_event_count,
    (SELECT COUNT(*)::integer FROM public.clerk_webhook_events c WHERE c.event_type = 'user.deleted' AND c.user_ref_hash IS NULL AND c.status = 'succeeded') AS legacy_uncorrelated_succeeded_count,
    (SELECT max(c.created_at)::text FROM public.clerk_webhook_events c WHERE c.event_type = 'user.deleted' AND c.user_ref_hash = fb.user_ref_hash) AS correlated_max_created_at,
    (SELECT c.deletion_subject_id FROM public.clerk_webhook_events c WHERE c.event_type = 'user.deleted' AND c.user_ref_hash = fb.user_ref_hash AND c.status = 'succeeded' ORDER BY c.created_at DESC LIMIT 1) AS deletion_subject_id
  FROM ff_bound fb
), targets AS (
  SELECT
    es.*,
    (SELECT COUNT(*)::integer FROM public.entitlements e WHERE e.user_id = es.raw_subject_token) AS subject_entitlements_count,
    (SELECT COUNT(*)::integer FROM public.one_time_fulfillments otf WHERE otf.user_id = es.raw_subject_token) AS subject_otf_count,
    (SELECT COUNT(*)::integer FROM public.consult_threads ct WHERE ct.user_id = es.raw_subject_token) AS subject_consult_threads_count,
    (SELECT COUNT(*)::integer FROM public.reply_sessions rs WHERE rs.user_id = es.raw_subject_token) AS subject_reply_sessions_count,
    (SELECT COUNT(*)::integer FROM public.dtr_guest_drafts dgd WHERE dgd.user_id = es.raw_subject_token) AS subject_guest_drafts_count,
    (SELECT COUNT(*)::integer FROM public.dtr_report_snapshots drs WHERE drs.user_id = es.raw_subject_token) AS subject_snapshots_count,
    (SELECT COUNT(*)::integer FROM public.entitlements e WHERE e.user_id = es.deletion_subject_id) AS pseudonymized_entitlements_count,
    (SELECT COUNT(*)::integer FROM public.one_time_fulfillments otf WHERE otf.user_id = es.deletion_subject_id) AS pseudonymized_otf_count
  FROM event_scope es
), ff_post AS (
  SELECT
    t.*,
    (SELECT COUNT(*)::integer FROM public.failed_fulfillments ff WHERE ff.id = ANY(t.bound_failed_fulfillment_ids)) AS bound_ff_existing_count,
    (SELECT COUNT(*)::integer FROM public.failed_fulfillments ff WHERE ff.id = ANY(t.bound_failed_fulfillment_ids) AND ff.raw_metadata IS NULL AND ff.user_ref_hash IS NULL) AS bound_ff_scrubbed_count
  FROM targets t
), unrelated_segments AS (
  SELECT
    fp.*,
    jsonb_build_array(
      jsonb_build_object(
        'segment_id','stripe_events_all_v1','schema_name','public','relation_name','stripe_events','relation','public.stripe_events','segment_schema_version','stripe_events_v1','sort_key_columns',jsonb_build_array('event_id'),'audited_columns',jsonb_build_array('event_id','event_type','received_at'),'canonical_encoding_version','ordered_jsonb_build_array_v1','pre_delete_exclusion_policy_id','exclude_none_v1','post_delete_exclusion_policy_id','exclude_none_v1','authorized_change_policy_id','none_v1','empty_set_representation','EMPTY_SET','row_count',
        (SELECT COUNT(*)::integer FROM public.stripe_events),
        'segment_digest_sql',
        (SELECT md5(COALESCE(string_agg(jsonb_build_array(se.event_id,se.event_type,se.received_at)::text, '|' ORDER BY se.event_id), 'EMPTY_SET')) FROM public.stripe_events se)
      ),
      jsonb_build_object(
        'segment_id','stripe_processed_events_all_v1','schema_name','public','relation_name','stripe_processed_events','relation','public.stripe_processed_events','segment_schema_version','stripe_processed_events_v1','sort_key_columns',jsonb_build_array('stripe_event_id'),'audited_columns',jsonb_build_array('stripe_event_id','processed_at'),'canonical_encoding_version','ordered_jsonb_build_array_v1','pre_delete_exclusion_policy_id','exclude_none_v1','post_delete_exclusion_policy_id','exclude_none_v1','authorized_change_policy_id','none_v1','empty_set_representation','EMPTY_SET','row_count',
        (SELECT COUNT(*)::integer FROM public.stripe_processed_events),
        'segment_digest_sql',
        (SELECT md5(COALESCE(string_agg(jsonb_build_array(spe.stripe_event_id,spe.processed_at)::text, '|' ORDER BY spe.stripe_event_id), 'EMPTY_SET')) FROM public.stripe_processed_events spe)
      ),
      jsonb_build_object(
        'segment_id','clerk_webhook_events_excluding_subject_v1','schema_name','public','relation_name','clerk_webhook_events','relation','public.clerk_webhook_events','segment_schema_version','clerk_webhook_events_excluding_subject_v1','sort_key_columns',jsonb_build_array('created_at','event_type'),'audited_columns',jsonb_build_array('event_type','status','error_code'),'canonical_encoding_version','ordered_jsonb_build_array_v1','pre_delete_exclusion_policy_id','exclude_subject_user_ref_hash_v1','post_delete_exclusion_policy_id','exclude_subject_user_ref_hash_v1','authorized_change_policy_id','expected_subject_event_only_v1','empty_set_representation','EMPTY_SET','row_count',
        (SELECT COUNT(*)::integer FROM public.clerk_webhook_events c WHERE c.user_ref_hash IS DISTINCT FROM fp.user_ref_hash),
        'segment_digest_sql',
        (SELECT md5(COALESCE(string_agg(jsonb_build_array(c.event_type,c.status,c.error_code)::text, '|' ORDER BY c.created_at, c.event_type), 'EMPTY_SET')) FROM public.clerk_webhook_events c WHERE c.user_ref_hash IS DISTINCT FROM fp.user_ref_hash)
      ),
      jsonb_build_object(
        'segment_id','failed_fulfillments_excluding_bound_v1','schema_name','public','relation_name','failed_fulfillments','relation','public.failed_fulfillments','segment_schema_version','failed_fulfillments_excluding_bound_v1','sort_key_columns',jsonb_build_array('id'),'audited_columns',jsonb_build_array('id','failure_reason','created_at'),'canonical_encoding_version','ordered_jsonb_build_array_v1','pre_delete_exclusion_policy_id','exclude_bound_failed_fulfillment_ids_v1','post_delete_exclusion_policy_id','exclude_bound_failed_fulfillment_ids_v1','authorized_change_policy_id','scrub_bound_failed_fulfillments_only_v1','empty_set_representation','EMPTY_SET','row_count',
        (SELECT COUNT(*)::integer FROM public.failed_fulfillments ff WHERE NOT (ff.id = ANY(fp.bound_failed_fulfillment_ids))),
        'segment_digest_sql',
        (SELECT md5(COALESCE(string_agg(jsonb_build_array(ff.id,ff.failure_reason,ff.created_at)::text, '|' ORDER BY ff.id), 'EMPTY_SET')) FROM public.failed_fulfillments ff WHERE NOT (ff.id = ANY(fp.bound_failed_fulfillment_ids)))
      )
    ) AS unrelated_segment_bundle
  FROM ff_post fp
), unrelated_evidence AS (
  SELECT
    us.*,
    encode(
      digest(
        (
          SELECT jsonb_agg(
            (seg - 'segment_digest_sql')
            || jsonb_build_object(
              'segment_sha256',
              encode(
                digest(
                  jsonb_build_object(
                    'row_count', (seg->>'row_count')::integer,
                    'segment_digest_sql', seg->>'segment_digest_sql',
                    'segment_id', seg->>'segment_id'
                  )::text,
                  'sha256'
                ),
                'hex'
              )
            )
            ORDER BY ord
          )::text
          FROM jsonb_array_elements(us.unrelated_segment_bundle) WITH ORDINALITY AS bundle(seg, ord)
        ),
        'sha256'
      ),
      'hex'
    ) AS unrelated_surface_digest_evidence_chain
  FROM unrelated_segments us
), classified AS (
  SELECT
    ue.*,
    ue.unrelated_surface_digest_evidence_chain AS unrelated_surface_digest_sql,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT mode_known THEN 'mode_unknown' END,
      CASE WHEN NOT raw_subject_present THEN 'raw_subject_missing' END,
      CASE WHEN NOT hash_format_green THEN 'hash_format_invalid' END,
      CASE WHEN NOT head_green THEN 'head_missing' END,
      CASE WHEN NOT deployment_green THEN 'deployment_identity_missing' END,
      CASE WHEN NOT migration_identity_green THEN 'migration_identity_mismatch' END,
      CASE WHEN NOT migration_sha_green THEN 'migration_sha_missing' END,
      CASE WHEN NOT catalog_green THEN 'catalog_identity_missing' END,
      CASE WHEN NOT precheck_unrelated_sha_green THEN 'precheck_unrelated_sha_invalid' END,
      CASE WHEN scenario_mode IN ('PRE_DELETE_DEPLOYMENT_SUBJECT','PRE_DELETE_EVENT_LEDGER') AND correlated_event_count <> 0 THEN 'prior_correlated_event_present' END,
      CASE WHEN scenario_mode IN ('POST_DELETE_EVENT_LEDGER_RPC','POST_DELETE_TARGET_RETAINED','POST_DELETE_UNRELATED','INTEGRATED_PREVIEW_DELETION_CLOSURE') AND correlated_succeeded_event_count <> 1 THEN 'correlated_event_not_exactly_one' END,
      CASE WHEN scenario_mode IN ('POST_DELETE_EVENT_LEDGER_RPC','POST_DELETE_TARGET_RETAINED','POST_DELETE_UNRELATED','INTEGRATED_PREVIEW_DELETION_CLOSURE') AND correlated_event_count > 1 THEN 'duplicate_correlated_event' END,
      CASE WHEN scenario_mode IN ('POST_DELETE_TARGET_RETAINED','INTEGRATED_PREVIEW_DELETION_CLOSURE') AND deletion_subject_id !~ '^m55-del:[0-9a-f]{32}$' THEN 'deletion_subject_invalid' END,
      CASE WHEN scenario_mode IN ('POST_DELETE_TARGET_RETAINED','INTEGRATED_PREVIEW_DELETION_CLOSURE') AND (subject_entitlements_count <> 0 OR subject_otf_count <> 0 OR subject_consult_threads_count <> 0 OR subject_reply_sessions_count <> 0 OR subject_guest_drafts_count <> 0 OR subject_snapshots_count <> 0) THEN 'raw_subject_rows_remain' END,
      CASE WHEN scenario_mode IN ('POST_DELETE_TARGET_RETAINED','INTEGRATED_PREVIEW_DELETION_CLOSURE') AND bound_ff_existing_count <> cardinality(bound_failed_fulfillment_ids) THEN 'failed_fulfillment_missing_exact_id' END,
      CASE WHEN scenario_mode IN ('POST_DELETE_TARGET_RETAINED','INTEGRATED_PREVIEW_DELETION_CLOSURE') AND bound_ff_scrubbed_count <> cardinality(bound_failed_fulfillment_ids) THEN 'failed_fulfillment_not_scrubbed' END,
      CASE WHEN scenario_mode IN ('POST_DELETE_UNRELATED','INTEGRATED_PREVIEW_DELETION_CLOSURE') AND precheck_unrelated_surface_sha256 <> '' AND precheck_unrelated_surface_sha256 <> unrelated_surface_digest_evidence_chain THEN 'unrelated_surface_changed' END
    ], NULL) AS failed_flags,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN scenario_mode IN ('POST_DELETE_EVENT_LEDGER_RPC','POST_DELETE_TARGET_RETAINED','POST_DELETE_UNRELATED','INTEGRATED_PREVIEW_DELETION_CLOSURE') AND deletion_subject_id IS NULL THEN 'deletion_subject_unknown' END
    ], NULL) AS unknown_flags
  FROM unrelated_evidence ue
)
SELECT jsonb_build_object(
  'schema_version','m55_preview_post_remediation_deletion_smoke_postcheck_v2',
  'scenario_mode',scenario_mode,
  'subject_label','M55_PREVIEW_DELETE_POST_REMEDIATION_01',
  'identity_green',(head_green AND deployment_green AND migration_identity_green AND migration_sha_green AND catalog_green),
  'event_watermark',jsonb_build_object('correlated_user_deleted_count',correlated_event_count,'max_created_at',correlated_max_created_at),
  'target_baseline_counts',jsonb_build_object(
    'entitlements',subject_entitlements_count,
    'one_time_fulfillments',subject_otf_count,
    'consult_threads',subject_consult_threads_count,
    'reply_sessions',subject_reply_sessions_count,
    'dtr_guest_drafts',subject_guest_drafts_count,
    'dtr_report_snapshots',subject_snapshots_count
  ),
  'failed_fulfillments',jsonb_build_object('sorted_uuid_list',failed_fulfillment_uuid_list,'count',failed_fulfillment_count,'digest_sql_md5',failed_fulfillment_uuid_digest_sql),
  'unrelated_surface_registry',jsonb_build_object('registry_id','M55_PREVIEW_DELETION_UNRELATED_SURFACE_REGISTRY_V1','registry_schema_version','m55_unrelated_surface_registry_v1','registry_sha256','834107bbf22b02a5ea12c5c6c089aa683517765948baf6200d7c4dfe518d87ee'),
  'unrelated_audited_surface',jsonb_build_object('segments',unrelated_segment_bundle,'digest_sha256',unrelated_surface_digest_sql),
  'postdelete',jsonb_build_object('correlated_succeeded_event_count',correlated_succeeded_event_count,'deletion_subject_id_valid',deletion_subject_id ~ '^m55-del:[0-9a-f]{32}$','failed_fulfillment_exact_ids_existing',bound_ff_existing_count,'failed_fulfillment_exact_ids_scrubbed',bound_ff_scrubbed_count),
  'failed_flags',to_jsonb(failed_flags),
  'unknown_flags',to_jsonb(unknown_flags),
  'overall_predicate',cardinality(failed_flags) = 0 AND cardinality(unknown_flags) = 0,
  'next_gate',CASE WHEN scenario_mode = 'INTEGRATED_PREVIEW_DELETION_CLOSURE' AND cardinality(failed_flags) = 0 AND cardinality(unknown_flags) = 0 THEN 'CATEGORY-1-M55-FINAL-INTEGRATED-RC-AUDIT' ELSE 'CATEGORY-1-M55-PREVIEW-DELETION-SMOKE-CORRELATION-CONTINUE' END
) AS result
FROM classified;
