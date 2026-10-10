-- M55 R7 Creator Dashboard v1 — forward-only schema guard + referral RPCs. Local file only; no apply in this gate.

do $$
begin
  if exists (
    select creator_economic_identity_id
    from public.m55_creator_referral_links
    where ingest_state = 'ACTIVE'
    group by creator_economic_identity_id
    having count(*) > 1
  ) then
    raise exception 'R7_REFERRAL_DUPLICATE_ACTIVE_PRECONDITION_FAILED';
  end if;
end $$;

create unique index if not exists m55_r7_creator_referral_one_active_per_economic_identity
  on public.m55_creator_referral_links (creator_economic_identity_id)
  where ingest_state = 'ACTIVE';

create index if not exists m55_r7_creator_qualified_touches_economic_time_idx
  on public.m55_creator_qualified_touches (creator_economic_identity_id, qualified_touch_at_ms desc);

create index if not exists m55_r7_commission_ledger_economic_recorded_idx
  on public.m55_r6_commission_ledger_events (creator_economic_identity_id, recorded_at desc);

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
end
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
end
$fn$;

revoke all on function public.m55_r7_creator_referral_issue_or_get_v1(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.m55_r7_creator_referral_rotate_v1(uuid, uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.m55_r7_creator_referral_issue_or_get_v1(uuid, uuid, uuid, text) to service_role;
grant execute on function public.m55_r7_creator_referral_rotate_v1(uuid, uuid, uuid, uuid, text) to service_role;
