-- M55 R8-A → R7 referral interlock draft (forward-only; DO NOT apply without Human GO).
-- Adds Operating Model §8 provider-readiness gate to referral issue/rotate RPCs.
-- Preserves ACTIVE+compliance checks; does not alter existing link rows or rotation token semantics.

create or replace function public.m55_r8_provider_referral_readiness_met_v1(
  p_creator_economic_identity_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_link_state text;
  v_snapshot jsonb;
  v_transfers text;
  v_payouts text;
  v_req_status text;
begin
  if p_creator_economic_identity_id is null then
    return false;
  end if;

  if to_regclass('public.m55_r8_stripe_connected_accounts_v1') is null then
    return false;
  end if;

  select a.link_state, a.last_provider_snapshot
  into v_link_state, v_snapshot
  from public.m55_r8_stripe_connected_accounts_v1 as a
  where a.creator_economic_identity_id = p_creator_economic_identity_id;

  if v_snapshot is null then
    return false;
  end if;

  v_transfers := v_snapshot #>> '{transfersCapability}';
  v_payouts := case when (v_snapshot #>> '{payoutsEnabled}') = 'true' then 'true' else 'false' end;

  if coalesce(v_snapshot #>> '{detailsSubmitted}', 'false') <> 'true'
     or v_transfers <> 'active'
     or v_payouts <> 'true'
     or coalesce((v_snapshot #>> '{requirementsCurrentlyDueCount}')::int, 1) > 0 then
    return false;
  end if;

  return true;
end;
$fn$;

revoke all on function public.m55_r8_provider_referral_readiness_met_v1(uuid) from public, anon, authenticated;
grant execute on function public.m55_r8_provider_referral_readiness_met_v1(uuid) to service_role;

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

-- Rotate RPC: same Operating Model readiness gate before mutating active link.
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
