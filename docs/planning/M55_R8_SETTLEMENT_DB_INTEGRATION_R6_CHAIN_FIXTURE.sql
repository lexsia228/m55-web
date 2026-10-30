-- LOCAL INTEGRATION ONLY — R6-style commission lifecycle rows for lock RPC tests.
-- Does not modify supabase/migrations R6 authority.

create or replace function public.m55_r8_test_seed_r6_payable_chain_v1(
  p_origin_commission_event_id uuid,
  p_creator_economic_identity_id uuid,
  p_entitlement_jpy bigint,
  p_payable_recorded_at timestamptz
) returns void
language plpgsql
set search_path = ''
as $fn$
begin
  insert into public.m55_r6_commission_ledger_events (
    commission_event_id,
    origin_commission_event_id,
    event_family,
    lifecycle_state_after_event,
    entitlement_after_event_jpy,
    recorded_at,
    creator_economic_identity_id
  ) values (
    p_origin_commission_event_id,
    null,
    'COMMISSION_ACCRUED',
    'COMMISSION_PENDING_COMPLIANCE_REVIEW',
    p_entitlement_jpy,
    p_payable_recorded_at - interval '30 days',
    p_creator_economic_identity_id
  );

  insert into public.m55_r6_commission_ledger_events (
    commission_event_id,
    origin_commission_event_id,
    event_family,
    lifecycle_state_after_event,
    entitlement_after_event_jpy,
    recorded_at,
    creator_economic_identity_id
  ) values (
    gen_random_uuid(),
    p_origin_commission_event_id,
    'COMMISSION_RELEASED',
    'COMMISSION_PENDING_COMPLIANCE_REVIEW',
    p_entitlement_jpy,
    p_payable_recorded_at - interval '1 day',
    p_creator_economic_identity_id
  );

  insert into public.m55_r6_commission_ledger_events (
    commission_event_id,
    origin_commission_event_id,
    event_family,
    lifecycle_state_after_event,
    entitlement_after_event_jpy,
    recorded_at,
    creator_economic_identity_id
  ) values (
    gen_random_uuid(),
    p_origin_commission_event_id,
    'COMMISSION_PAYABLE',
    'COMMISSION_PAYABLE',
    p_entitlement_jpy,
    p_payable_recorded_at,
    p_creator_economic_identity_id
  );
end;
$fn$;

create or replace function public.m55_r8_test_seed_r6_adjusted_payable_v1(
  p_origin_commission_event_id uuid,
  p_creator_economic_identity_id uuid,
  p_adjusted_entitlement_jpy bigint,
  p_adjusted_recorded_at timestamptz
) returns void
language plpgsql
set search_path = ''
as $fn$
begin
  insert into public.m55_r6_commission_ledger_events (
    commission_event_id,
    origin_commission_event_id,
    event_family,
    lifecycle_state_after_event,
    entitlement_after_event_jpy,
    recorded_at,
    creator_economic_identity_id
  ) values (
    gen_random_uuid(),
    p_origin_commission_event_id,
    'COMMISSION_ADJUSTED',
    'COMMISSION_PAYABLE',
    p_adjusted_entitlement_jpy,
    p_adjusted_recorded_at,
    p_creator_economic_identity_id
  );
end;
$fn$;

grant execute on function public.m55_r8_test_seed_r6_payable_chain_v1(uuid, uuid, bigint, timestamptz) to service_role;
grant execute on function public.m55_r8_test_seed_r6_adjusted_payable_v1(uuid, uuid, bigint, timestamptz) to service_role;
