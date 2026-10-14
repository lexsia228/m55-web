-- M55 R7 D1-D5 runtime catalog probes (SELECT-only). One statement per probe ID.
-- @probe R7_D1_PRE_CATALOG_R5_COMPLIANCE_ABSENT
SELECT json_build_object(
  'anchor_table_count',
  (
    SELECT count(*)::int
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
        'm55_r5_compliance_contents',
        'm55_r5_compliance_content_snapshots',
        'm55_r5_compliance_graph_nodes',
        'm55_r5_compliance_graph_edges',
        'm55_r5_compliance_decisions',
        'm55_r5_compliance_cases',
        'm55_r5_compliance_case_events'
      )
  )
) AS probe_payload;

-- @probe R7_D1_POST_CATALOG_R5_COMPLIANCE_PRESENT
SELECT json_build_object(
  'anchor_table_count',
  (
    SELECT count(*)::int
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname IN (
        'm55_r5_compliance_contents',
        'm55_r5_compliance_content_snapshots',
        'm55_r5_compliance_graph_nodes',
        'm55_r5_compliance_graph_edges',
        'm55_r5_compliance_decisions',
        'm55_r5_compliance_cases',
        'm55_r5_compliance_case_events'
      )
  ),
  'reject_mutation_function_present',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r5_compliance_reject_mutation_v1'
  ),
  'reject_mutation_empty_args',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r5_compliance_reject_mutation_v1'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ),
  'snapshots_content_fingerprint_text_column_ok',
  EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_type t ON t.oid = a.atttypid
    WHERE n.nspname = 'public'
      AND c.relname = 'm55_r5_compliance_content_snapshots'
      AND a.attname = 'content_fingerprint'
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND t.typname = 'text'
  )
) AS probe_payload;

-- @probe R7_D2_PRE_CATALOG_R6_PURCHASE_MONEY_ABSENT
SELECT json_build_object(
  'purchase_money_table_absent',
  NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = 'm55_r6_purchase_money_evidence'
  ),
  'record_function_absent',
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r6_record_purchase_money_evidence_v1'
  )
) AS probe_payload;

-- @probe R7_D2_POST_CATALOG_R6_PURCHASE_MONEY_PRESENT
SELECT json_build_object(
  'purchase_money_table_present',
  EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname = 'm55_r6_purchase_money_evidence'
  ),
  'canonical_payment_evidence_id_column_present',
  EXISTS (
    SELECT 1
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'm55_r6_purchase_money_evidence'
      AND a.attname = 'canonical_payment_evidence_id'
      AND a.attnum > 0
      AND NOT a.attisdropped
  ),
  'record_function_present',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r6_record_purchase_money_evidence_v1'
  ),
  'record_function_signature_ok',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r6_record_purchase_money_evidence_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_stripe_canonical_event_id text, p_payment_intent_id text, p_gross_customer_paid_jpy bigint, p_currency text, p_authoritative_tax_amount_present boolean, p_authoritative_purchase_tax_amount_jpy bigint, p_discount_amount_jpy bigint, p_discount_state text'
  ),
  'record_function_search_path_empty',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r6_record_purchase_money_evidence_v1'
      AND p.proconfig IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg = 'search_path=""'
      )
  )
) AS probe_payload;

-- @probe R7_D3_PRE_CATALOG_R6_REFUND_DISPUTE_ABSENT
SELECT json_build_object(
  'refund_table_absent',
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'm55_r6_refund_economic_evidence'
  ),
  'dispute_table_absent',
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'm55_r6_dispute_economic_evidence'
  )
) AS probe_payload;

-- @probe R7_D3_POST_CATALOG_R6_REFUND_DISPUTE_PRESENT
SELECT json_build_object(
  'refund_table_present',
  EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'm55_r6_refund_economic_evidence'
  ),
  'dispute_table_present',
  EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'm55_r6_dispute_economic_evidence'
  ),
  'refund_record_function_present',
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'm55_r6_record_refund_economic_evidence_v1'
  ),
  'refund_record_function_signature_ok',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r6_record_refund_economic_evidence_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_stripe_event_id text, p_stripe_event_type text, p_stripe_event_created_at_ms bigint, p_provider_refund_id text, p_provider_refund_created_at_ms bigint, p_payment_intent_id text, p_amount_jpy bigint, p_currency text, p_refund_status text'
  ),
  'refund_record_function_search_path_empty',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r6_record_refund_economic_evidence_v1'
      AND p.proconfig IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg = 'search_path=""'
      )
  )
) AS probe_payload;

-- @probe R7_D4_PRE_CATALOG_R6_COMMISSION_LEDGER_ABSENT
SELECT json_build_object(
  'ledger_table_absent',
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'm55_r6_commission_ledger_events'
  )
) AS probe_payload;

-- @probe R7_D4_POST_CATALOG_R6_COMMISSION_LEDGER_PRESENT
SELECT json_build_object(
  'ledger_table_present',
  EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'm55_r6_commission_ledger_events'
  ),
  'one_accrual_unique_index_present',
  EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'm55_r6_commission_ledger_one_accrual_uq'
  ),
  'one_accrual_index_on_ledger_table',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r6_commission_ledger_one_accrual_uq'
      AND tc.relname = 'm55_r6_commission_ledger_events'
  ),
  'one_accrual_index_unique',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r6_commission_ledger_one_accrual_uq'
      AND i.indisunique
  ),
  'one_accrual_index_valid',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r6_commission_ledger_one_accrual_uq'
      AND i.indisvalid
  ),
  'one_accrual_index_ready',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r6_commission_ledger_one_accrual_uq'
      AND i.indisready
  ),
  'one_accrual_index_key_order_ok',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r6_commission_ledger_one_accrual_uq'
      AND (
        SELECT array_agg(a.attname ORDER BY u.ordinality)
        FROM unnest(i.indkey) WITH ORDINALITY AS u(attnum, ordinality)
        JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = u.attnum AND NOT a.attisdropped
      ) = ARRAY['provider', 'payment_intent_id']::name[]
  ),
  'one_accrual_index_predicate_exact_ok',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r6_commission_ledger_one_accrual_uq'
      AND pg_get_expr(i.indpred, tc.oid) = '(event_family = ''COMMISSION_ACCRUED''::text)'
  ),
  'insert_ledger_function_present',
  EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'm55_r6_insert_ledger_event_v1'
  ),
  'insert_ledger_function_signature_ok',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r6_insert_ledger_event_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_origin_commission_event_id uuid, p_event_family text, p_canonical_event_state text, p_lifecycle_state_after_event text, p_provider text, p_payment_intent_id text, p_purchase_money_evidence_id uuid, p_canonical_payment_evidence_id uuid, p_purchase_attempt_id uuid, p_creator_economic_identity_id uuid, p_creator_profile_id uuid, p_runtime_product_id text, p_policy_product_id text, p_conversion_kind text, p_attribution_policy_version text, p_creator_terms_version text, p_eligible_product_policy_version text, p_financial_policy_version text, p_calculation_version text, p_rate_schedule_version text, p_canonical_payment_succeeded_at_ms bigint, p_creator_first_final_approved_at_ms bigint, p_commission_rate_basis_points integer, p_gross_customer_paid_jpy bigint, p_discount_amount_jpy bigint, p_discount_state text, p_authoritative_tax_amount_present boolean, p_authoritative_purchase_tax_amount_jpy bigint, p_tax_rate_bps integer, p_commission_base_tax_exclusion_jpy bigint, p_immediately_ineligible_amount_jpy bigint, p_commissionable_revenue_jpy bigint, p_commission_delta_jpy bigint, p_entitlement_after_event_jpy bigint, p_release_at_ms bigint, p_source_economic_object_type text, p_source_economic_object_id text, p_economic_transition text, p_reason_code text'
  )
) AS probe_payload;

-- @probe R7_D5_PRE_CATALOG_R7_REFERRAL_RPC_ABSENT
SELECT json_build_object(
  'issue_or_get_absent',
  NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'm55_r7_creator_referral_issue_or_get_v1'
  ),
  'rotate_absent',
  NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'm55_r7_creator_referral_rotate_v1'
  ),
  'one_active_unique_index_absent',
  NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'm55_r7_creator_referral_one_active_per_economic_identity'
  )
) AS probe_payload;

-- @probe R7_D5_POST_CATALOG_R7_REFERRAL_RPC_PRESENT
SELECT json_build_object(
  'issue_or_get_present',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_issue_or_get_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_link_id uuid, p_token_digest text'
  ),
  'rotate_present',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_rotate_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_expected_active_link_id uuid, p_new_link_id uuid, p_new_token_digest text'
  ),
  'issue_or_get_signature_ok',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_issue_or_get_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_link_id uuid, p_token_digest text'
  ),
  'rotate_signature_ok',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_rotate_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_expected_active_link_id uuid, p_new_link_id uuid, p_new_token_digest text'
  ),
  'issue_or_get_service_role_execute',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_issue_or_get_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_link_id uuid, p_token_digest text'
      AND has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  'rotate_service_role_execute',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_rotate_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_expected_active_link_id uuid, p_new_link_id uuid, p_new_token_digest text'
      AND has_function_privilege('service_role', p.oid, 'EXECUTE')
  ),
  'issue_or_get_security_definer',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_issue_or_get_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_link_id uuid, p_token_digest text'
      AND p.prosecdef
  ),
  'rotate_security_definer',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_rotate_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_expected_active_link_id uuid, p_new_link_id uuid, p_new_token_digest text'
      AND p.prosecdef
  ),
  'issue_or_get_search_path_empty',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_issue_or_get_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_link_id uuid, p_token_digest text'
      AND p.proconfig IS NOT NULL
      AND EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg = 'search_path=""')
  ),
  'rotate_search_path_empty',
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_rotate_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_expected_active_link_id uuid, p_new_link_id uuid, p_new_token_digest text'
      AND p.proconfig IS NOT NULL
      AND EXISTS (SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg = 'search_path=""')
  ),
  'issue_or_get_non_privileged_execute_absent',
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_issue_or_get_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_link_id uuid, p_token_digest text'
      AND (
        has_function_privilege('public', p.oid, 'EXECUTE')
        OR has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  ),
  'rotate_non_privileged_execute_absent',
  NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'm55_r7_creator_referral_rotate_v1'
      AND pg_get_function_identity_arguments(p.oid) =
        'p_creator_profile_id uuid, p_creator_economic_identity_id uuid, p_expected_active_link_id uuid, p_new_link_id uuid, p_new_token_digest text'
      AND (
        has_function_privilege('public', p.oid, 'EXECUTE')
        OR has_function_privilege('anon', p.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
      )
  ),
  'one_active_index_on_referral_links_table',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r7_creator_referral_one_active_per_economic_identity'
      AND tc.relname = 'm55_creator_referral_links'
  ),
  'one_active_index_unique',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r7_creator_referral_one_active_per_economic_identity'
      AND i.indisunique
  ),
  'one_active_index_valid',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r7_creator_referral_one_active_per_economic_identity'
      AND i.indisvalid
  ),
  'one_active_index_ready',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r7_creator_referral_one_active_per_economic_identity'
      AND i.indisready
  ),
  'one_active_index_single_key_ok',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r7_creator_referral_one_active_per_economic_identity'
      AND (
        SELECT array_agg(a.attname ORDER BY u.ordinality)
        FROM unnest(i.indkey) WITH ORDINALITY AS u(attnum, ordinality)
        JOIN pg_attribute a ON a.attrelid = tc.oid AND a.attnum = u.attnum AND NOT a.attisdropped
      ) = ARRAY['creator_economic_identity_id']::name[]
  ),
  'one_active_index_predicate_exact_ok',
  EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    WHERE n.nspname = 'public'
      AND ic.relname = 'm55_r7_creator_referral_one_active_per_economic_identity'
      AND pg_get_expr(i.indpred, tc.oid) = '(ingest_state = ''ACTIVE''::text)'
  ),
  'duplicate_active_violation_present',
  EXISTS (
    SELECT 1
    FROM (
      SELECT 1
      FROM public.m55_creator_referral_links
      WHERE ingest_state = 'ACTIVE'
      GROUP BY creator_economic_identity_id
      HAVING count(*) > 1
      LIMIT 1
    ) dup
  ),
  'post_apply_unique_index_invariant_scope_only',
  true
) AS probe_payload;
