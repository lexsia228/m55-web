-- LOCAL INTEGRATION ONLY — R6-style commission lifecycle rows (full ledger columns).
-- Requires docs/planning/M55_R8_SETTLEMENT_DB_INTEGRATION_R6_SCHEMA_MIRROR.sql applied first.

create or replace function public.m55_r8_test_seed_r6_payable_chain_v1(
  p_origin_commission_event_id uuid,
  p_creator_economic_identity_id uuid,
  p_creator_profile_id uuid,
  p_entitlement_jpy bigint,
  p_payable_recorded_at timestamptz
) returns void
language plpgsql
set search_path = ''
as $fn$
declare
  v_money uuid := gen_random_uuid();
  v_evidence uuid := gen_random_uuid();
  v_attempt uuid := gen_random_uuid();
  v_pi text := 'pi_test_' || replace(gen_random_uuid()::text, '-', '');
  v_base record;
begin
  insert into public.m55_creator_profiles (id, economic_identity_id)
  values (p_creator_profile_id, p_creator_economic_identity_id)
  on conflict (economic_identity_id) do nothing;

  insert into public.m55_r5_attribution_purchase_attempts (purchase_attempt_id)
  values (v_attempt) on conflict do nothing;
  insert into public.m55_r5_attribution_canonical_payment_evidence (evidence_id)
  values (v_evidence) on conflict do nothing;
  insert into public.m55_r6_purchase_money_evidence (purchase_money_evidence_id)
  values (v_money) on conflict do nothing;

  v_base := row(
    p_creator_economic_identity_id,
    p_creator_profile_id,
    v_money,
    v_evidence,
    v_attempt,
    v_pi
  );

  insert into public.m55_r6_commission_ledger_events (
    commission_event_id, origin_commission_event_id, event_family, canonical_event_state,
    lifecycle_state_after_event, provider, payment_intent_id, purchase_money_evidence_id,
    canonical_payment_evidence_id, purchase_attempt_id, creator_economic_identity_id, creator_profile_id,
    runtime_product_id, policy_product_id, conversion_kind, attribution_policy_version, creator_terms_version,
    eligible_product_policy_version, financial_policy_version, calculation_version, rate_schedule_version,
    canonical_payment_succeeded_at_ms, creator_first_final_approved_at_ms, commission_rate_basis_points,
    gross_customer_paid_jpy, discount_amount_jpy, discount_state, authoritative_tax_amount_present,
    authoritative_purchase_tax_amount_jpy, tax_rate_bps, commission_base_tax_exclusion_jpy,
    immediately_ineligible_amount_jpy, commissionable_revenue_jpy, commission_delta_jpy,
    entitlement_after_event_jpy, release_at_ms, reason_code, recorded_at
  ) values (
    p_origin_commission_event_id, null, 'COMMISSION_ACCRUED', 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
    'COMMISSION_PENDING_COMPLIANCE_REVIEW', 'STRIPE', v_pi, v_money, v_evidence, v_attempt,
    p_creator_economic_identity_id, p_creator_profile_id,
    'M55_PREMIUM_REPORT_LIGHT', 'M55_PREMIUM_REPORT_LIGHT', 'FIRST_ELIGIBLE_PAID',
    'r6_attribution_policy_v1', 'r6_creator_terms_v1', 'r6_affiliate_eligible_products_v1',
    'r6_financial_policy_v1', 'r6_commission_calculation_v1', 'r6_standard_rate_schedule_v1',
    1_700_000_000_000, 1_700_000_000_000, 2000,
    50_000, 0, 'NONE', false, null, 1000, 45_455,
    0, 45_455, p_entitlement_jpy, p_entitlement_jpy, (extract(epoch from p_payable_recorded_at) * 1000)::bigint,
    'INTEGRATION_ACCRUAL', p_payable_recorded_at - interval '30 days'
  );

  insert into public.m55_r6_commission_ledger_events (
    commission_event_id, origin_commission_event_id, event_family, canonical_event_state,
    lifecycle_state_after_event, provider, payment_intent_id, purchase_money_evidence_id,
    canonical_payment_evidence_id, purchase_attempt_id, creator_economic_identity_id, creator_profile_id,
    runtime_product_id, policy_product_id, conversion_kind, attribution_policy_version, creator_terms_version,
    eligible_product_policy_version, financial_policy_version, calculation_version, rate_schedule_version,
    canonical_payment_succeeded_at_ms, creator_first_final_approved_at_ms, commission_rate_basis_points,
    gross_customer_paid_jpy, discount_amount_jpy, discount_state, authoritative_tax_amount_present,
    authoritative_purchase_tax_amount_jpy, tax_rate_bps, commission_base_tax_exclusion_jpy,
    immediately_ineligible_amount_jpy, commissionable_revenue_jpy, commission_delta_jpy,
    entitlement_after_event_jpy, release_at_ms, reason_code, recorded_at
  ) values (
    gen_random_uuid(), p_origin_commission_event_id, 'COMMISSION_RELEASED', 'COMMISSION_PENDING_COMPLIANCE_REVIEW',
    'COMMISSION_PENDING_COMPLIANCE_REVIEW', 'STRIPE', v_pi, v_money, v_evidence, v_attempt,
    p_creator_economic_identity_id, p_creator_profile_id,
    'M55_PREMIUM_REPORT_LIGHT', 'M55_PREMIUM_REPORT_LIGHT', 'FIRST_ELIGIBLE_PAID',
    'r6_attribution_policy_v1', 'r6_creator_terms_v1', 'r6_affiliate_eligible_products_v1',
    'r6_financial_policy_v1', 'r6_commission_calculation_v1', 'r6_standard_rate_schedule_v1',
    1_700_000_000_000, 1_700_000_000_000, 2000,
    50_000, 0, 'NONE', false, null, 1000, 45_455,
    0, 45_455, 0, p_entitlement_jpy, (extract(epoch from p_payable_recorded_at) * 1000)::bigint,
    'INTEGRATION_RELEASED', p_payable_recorded_at - interval '1 day'
  );

  insert into public.m55_r6_commission_ledger_events (
    commission_event_id, origin_commission_event_id, event_family, canonical_event_state,
    lifecycle_state_after_event, provider, payment_intent_id, purchase_money_evidence_id,
    canonical_payment_evidence_id, purchase_attempt_id, creator_economic_identity_id, creator_profile_id,
    runtime_product_id, policy_product_id, conversion_kind, attribution_policy_version, creator_terms_version,
    eligible_product_policy_version, financial_policy_version, calculation_version, rate_schedule_version,
    canonical_payment_succeeded_at_ms, creator_first_final_approved_at_ms, commission_rate_basis_points,
    gross_customer_paid_jpy, discount_amount_jpy, discount_state, authoritative_tax_amount_present,
    authoritative_purchase_tax_amount_jpy, tax_rate_bps, commission_base_tax_exclusion_jpy,
    immediately_ineligible_amount_jpy, commissionable_revenue_jpy, commission_delta_jpy,
    entitlement_after_event_jpy, release_at_ms, reason_code, recorded_at
  ) values (
    gen_random_uuid(), p_origin_commission_event_id, 'COMMISSION_PAYABLE', 'COMMISSION_PAYABLE',
    'COMMISSION_PAYABLE', 'STRIPE', v_pi, v_money, v_evidence, v_attempt,
    p_creator_economic_identity_id, p_creator_profile_id,
    'M55_PREMIUM_REPORT_LIGHT', 'M55_PREMIUM_REPORT_LIGHT', 'FIRST_ELIGIBLE_PAID',
    'r6_attribution_policy_v1', 'r6_creator_terms_v1', 'r6_affiliate_eligible_products_v1',
    'r6_financial_policy_v1', 'r6_commission_calculation_v1', 'r6_standard_rate_schedule_v1',
    1_700_000_000_000, 1_700_000_000_000, 2000,
    50_000, 0, 'NONE', false, null, 1000, 45_455,
    0, 45_455, 0, p_entitlement_jpy, (extract(epoch from p_payable_recorded_at) * 1000)::bigint,
    'INTEGRATION_PAYABLE', p_payable_recorded_at
  );
end;
$fn$;

create or replace function public.m55_r8_test_seed_r6_adjusted_payable_v1(
  p_origin_commission_event_id uuid,
  p_creator_economic_identity_id uuid,
  p_creator_profile_id uuid,
  p_adjusted_entitlement_jpy bigint,
  p_adjusted_recorded_at timestamptz
) returns void
language plpgsql
set search_path = ''
as $fn$
declare
  v_pi text;
  v_money uuid;
  v_evidence uuid;
  v_attempt uuid;
  v_prev bigint;
  v_delta bigint;
begin
  select e.payment_intent_id, e.purchase_money_evidence_id, e.canonical_payment_evidence_id, e.purchase_attempt_id
  into v_pi, v_money, v_evidence, v_attempt
  from public.m55_r6_commission_ledger_events as e
  where e.commission_event_id = p_origin_commission_event_id;

  select e.entitlement_after_event_jpy
  into v_prev
  from public.m55_r6_commission_ledger_events as e
  where e.origin_commission_event_id = p_origin_commission_event_id
  order by e.ledger_event_seq desc
  limit 1;

  v_delta := p_adjusted_entitlement_jpy - v_prev;

  insert into public.m55_r6_commission_ledger_events (
    commission_event_id, origin_commission_event_id, event_family, canonical_event_state,
    lifecycle_state_after_event, provider, payment_intent_id, purchase_money_evidence_id,
    canonical_payment_evidence_id, purchase_attempt_id, creator_economic_identity_id, creator_profile_id,
    runtime_product_id, policy_product_id, conversion_kind, attribution_policy_version, creator_terms_version,
    eligible_product_policy_version, financial_policy_version, calculation_version, rate_schedule_version,
    canonical_payment_succeeded_at_ms, creator_first_final_approved_at_ms, commission_rate_basis_points,
    gross_customer_paid_jpy, discount_amount_jpy, discount_state, authoritative_tax_amount_present,
    authoritative_purchase_tax_amount_jpy, tax_rate_bps, commission_base_tax_exclusion_jpy,
    immediately_ineligible_amount_jpy, commissionable_revenue_jpy, commission_delta_jpy,
    entitlement_after_event_jpy, release_at_ms, reason_code, recorded_at
  ) values (
    gen_random_uuid(), p_origin_commission_event_id, 'COMMISSION_ADJUSTED', 'COMMISSION_ADJUSTED',
    'COMMISSION_PAYABLE', 'STRIPE', v_pi, v_money, v_evidence, v_attempt,
    p_creator_economic_identity_id, p_creator_profile_id,
    'M55_PREMIUM_REPORT_LIGHT', 'M55_PREMIUM_REPORT_LIGHT', 'FIRST_ELIGIBLE_PAID',
    'r6_attribution_policy_v1', 'r6_creator_terms_v1', 'r6_affiliate_eligible_products_v1',
    'r6_financial_policy_v1', 'r6_commission_calculation_v1', 'r6_standard_rate_schedule_v1',
    1_700_000_000_000, 1_700_000_000_000, 2000,
    50_000, 0, 'NONE', false, null, 1000, 45_455,
    0, 45_455, v_delta, p_adjusted_entitlement_jpy, (extract(epoch from p_adjusted_recorded_at) * 1000)::bigint,
    'INTEGRATION_ADJUSTED', p_adjusted_recorded_at
  );
end;
$fn$;

grant execute on function public.m55_r8_test_seed_r6_payable_chain_v1(uuid, uuid, uuid, bigint, timestamptz) to service_role;
grant execute on function public.m55_r8_test_seed_r6_adjusted_payable_v1(uuid, uuid, uuid, bigint, timestamptz) to service_role;
