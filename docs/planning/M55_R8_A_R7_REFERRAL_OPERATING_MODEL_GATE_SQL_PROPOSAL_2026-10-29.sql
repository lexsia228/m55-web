-- M55 R8-A → R7 referral interlock SQL PROPOSAL (INCOMPLETE FOR EXECUTION — do not place under supabase/migrations/).
-- Authoritative JS mirror: lib/m55/creatorProvider/providerPayoutReadinessPredicate.ts
--   evaluateCreatorProviderPayoutReadinessV1 / isTaxProfileEligibleForProviderPayoutReadinessV1
-- Apply only after Human GO on coordinated R7/R8 gate. Does not modify applied R7 migration artifacts in Production.

create or replace function public.m55_r8_provider_referral_readiness_met_v1(
  p_creator_economic_identity_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_stripe_account_id text;
  v_link_state text;
  v_snapshot jsonb;
  v_transfers text;
  v_req_raw text;
  v_req_count int;
begin
  if p_creator_economic_identity_id is null then
    return false;
  end if;

  if to_regclass('public.m55_r8_stripe_connected_accounts_v1') is null
     or to_regclass('public.m55_r8_creator_tax_profiles_v1') is null then
    return false;
  end if;

  select a.stripe_account_id, a.link_state, a.last_provider_snapshot
  into v_stripe_account_id, v_link_state, v_snapshot
  from public.m55_r8_stripe_connected_accounts_v1 as a
  where a.creator_economic_identity_id = p_creator_economic_identity_id;

  if v_stripe_account_id is null or btrim(v_stripe_account_id) = '' then
    return false;
  end if;

  if v_link_state is distinct from 'PAYOUTS_CAPABILITY_ACTIVE' then
    return false;
  end if;

  if v_snapshot is null or jsonb_typeof(v_snapshot) <> 'object' then
    return false;
  end if;

  v_transfers := v_snapshot #>> '{transfersCapability}';
  v_req_raw := v_snapshot #>> '{requirementsCurrentlyDueCount}';

  if v_req_raw is null or v_req_raw !~ '^[0-9]+$' then
    return false;
  end if;

  v_req_count := v_req_raw::int;

  if coalesce(v_snapshot #>> '{detailsSubmitted}', 'false') <> 'true'
     or coalesce(v_snapshot #>> '{payoutsEnabled}', 'false') <> 'true'
     or v_transfers <> 'active'
     or v_req_count > 0 then
    return false;
  end if;

  if not exists (
    select 1
    from public.m55_r8_creator_tax_profiles_v1 as t
    where t.creator_economic_identity_id = p_creator_economic_identity_id
      and t.schema_version = '2026-10-29-v1'
      and t.tax_residency = 'JAPAN_RESIDENT'
      and t.v1_japan_resident_attested is true
      and t.v1_age_18_plus_attested is true
      and t.withholding_classification = 'ORDINARY_JP_AFFILIATE_V1_ZERO'
      and t.payee_type = 'INDIVIDUAL'
  ) then
    return false;
  end if;

  return true;
end;
$fn$;

revoke all on function public.m55_r8_provider_referral_readiness_met_v1(uuid) from public, anon, authenticated;
grant execute on function public.m55_r8_provider_referral_readiness_met_v1(uuid) to service_role;

-- Coordinated R7 issue/rotate wrappers (service_role only). Guard BOTH legacy R7 checks AND provider readiness.

create or replace function public.m55_r7_creator_referral_issue_or_get_v1(
  p_creator_profile_id uuid,
  p_creator_economic_identity_id uuid,
  p_link_id uuid,
  p_token_digest text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_existing uuid;
  v_profile_locked uuid;
begin
  if p_creator_profile_id is null
     or p_creator_economic_identity_id is null
     or p_link_id is null
     or p_token_digest is null
     or p_token_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_INPUT';
  end if;

  select p.id
  into v_profile_locked
  from public.m55_creator_profiles as p
  where p.id = p_creator_profile_id
    and p.economic_identity_id = p_creator_economic_identity_id
    and p.status = 'ACTIVE'
  for update;

  if v_profile_locked is null then
    raise exception 'CREATOR_REFERRAL_NOT_PERMITTED';
  end if;

  if exists (
    select 1
    from public.m55_r5_compliance_cases as c
    where c.creator_economic_identity_id = p_creator_economic_identity_id
      and c.status in ('OPEN', 'HOLD')
      and coalesce(c.decision, 'KEEP_HOLD') in (
        'KEEP_HOLD', 'REQUEST_CORRECTION', 'PAUSE_CREATOR', 'TERMINATE_PARTNERSHIP'
      )
  ) then
    raise exception 'CREATOR_REFERRAL_NOT_PERMITTED';
  end if;

  if not public.m55_r8_provider_referral_readiness_met_v1(p_creator_economic_identity_id) then
    raise exception 'CREATOR_REFERRAL_NOT_PERMITTED';
  end if;

  select l.id
  into v_existing
  from public.m55_creator_referral_links as l
  where l.creator_economic_identity_id = p_creator_economic_identity_id
    and l.ingest_state = 'ACTIVE'
  limit 1
  for update;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.m55_creator_referral_links (
    id,
    creator_profile_id,
    creator_economic_identity_id,
    token_version,
    token_digest,
    ingest_state
  ) values (
    p_link_id,
    p_creator_profile_id,
    p_creator_economic_identity_id,
    'v1',
    p_token_digest,
    'ACTIVE'
  );

  return p_link_id;
end;
$fn$;

create or replace function public.m55_r7_creator_referral_rotate_v1(
  p_creator_profile_id uuid,
  p_creator_economic_identity_id uuid,
  p_expected_active_link_id uuid,
  p_new_link_id uuid,
  p_new_token_digest text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_updated uuid;
  v_profile_locked uuid;
begin
  if p_creator_profile_id is null
     or p_creator_economic_identity_id is null
     or p_expected_active_link_id is null
     or p_new_link_id is null
     or p_new_token_digest is null
     or p_new_token_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_INPUT';
  end if;

  select p.id
  into v_profile_locked
  from public.m55_creator_profiles as p
  where p.id = p_creator_profile_id
    and p.economic_identity_id = p_creator_economic_identity_id
    and p.status = 'ACTIVE'
  for update;

  if v_profile_locked is null then
    raise exception 'CREATOR_REFERRAL_NOT_PERMITTED';
  end if;

  if exists (
    select 1
    from public.m55_r5_compliance_cases as c
    where c.creator_economic_identity_id = p_creator_economic_identity_id
      and c.status in ('OPEN', 'HOLD')
      and coalesce(c.decision, 'KEEP_HOLD') in (
        'KEEP_HOLD', 'REQUEST_CORRECTION', 'PAUSE_CREATOR', 'TERMINATE_PARTNERSHIP'
      )
  ) then
    raise exception 'CREATOR_REFERRAL_NOT_PERMITTED';
  end if;

  if not public.m55_r8_provider_referral_readiness_met_v1(p_creator_economic_identity_id) then
    raise exception 'CREATOR_REFERRAL_NOT_PERMITTED';
  end if;

  update public.m55_creator_referral_links as l
  set
    ingest_state = 'RETIRED_OR_REVOKED',
    retired_at = now()
  where l.id = p_expected_active_link_id
    and l.creator_economic_identity_id = p_creator_economic_identity_id
    and l.ingest_state = 'ACTIVE'
  returning l.id into v_updated;

  if v_updated is null then
    raise exception 'STALE_ACTIVE_LINK';
  end if;

  insert into public.m55_creator_referral_links (
    id,
    creator_profile_id,
    creator_economic_identity_id,
    token_version,
    token_digest,
    ingest_state
  ) values (
    p_new_link_id,
    p_creator_profile_id,
    p_creator_economic_identity_id,
    'v1',
    p_new_token_digest,
    'ACTIVE'
  );

  return p_new_link_id;
end;
$fn$;

revoke all on function public.m55_r7_creator_referral_issue_or_get_v1(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.m55_r7_creator_referral_rotate_v1(uuid, uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.m55_r7_creator_referral_issue_or_get_v1(uuid, uuid, uuid, text) to service_role;
grant execute on function public.m55_r7_creator_referral_rotate_v1(uuid, uuid, uuid, uuid, text) to service_role;

-- PROPOSAL STATUS: parser-safe readiness helper + coordinated issue/rotate guards.
-- Human must not run this file until R8-A sandbox E2E and explicit coordinated deploy GO.
