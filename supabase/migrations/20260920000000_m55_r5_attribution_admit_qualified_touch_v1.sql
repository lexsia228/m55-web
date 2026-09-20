-- M55 R5 attribution S2 touch ingest. Local migration only; no payment/lock/appeal.

create table public.m55_r5_attribution_touch_continuations (
  continuation_id bytea primary key check (octet_length(continuation_id) = 16),
  token_version text not null check (token_version = 'v1'),
  token_digest text not null check (token_digest ~ '^[0-9a-f]{64}$'),
  qualified_action_kind text not null check (
    qualified_action_kind in (
      'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
      'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION'
    )
  ),
  direct_buyer_subject_lookup_digest text check (
    direct_buyer_subject_lookup_digest is null
    or direct_buyer_subject_lookup_digest ~ '^[0-9a-f]{64}$'
  ),
  touch_event_key_bytes bytea check (
    touch_event_key_bytes is null or octet_length(touch_event_key_bytes) = 16
  ),
  qualified_touch_at_ms bigint check (
    qualified_touch_at_ms is null
    or (
      qualified_touch_at_ms >= 0
      and qualified_touch_at_ms <= 9007199254740991
    )
  ),
  payload_fingerprint text check (
    payload_fingerprint is null or payload_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  check (
    (
      qualified_action_kind = 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK'
      and direct_buyer_subject_lookup_digest is not null
    )
    or (
      qualified_action_kind = 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION'
      and direct_buyer_subject_lookup_digest is null
    )
  ),
  check (
    (
      touch_event_key_bytes is null
      and qualified_touch_at_ms is null
      and payload_fingerprint is null
    )
    or (
      touch_event_key_bytes is not null
      and qualified_touch_at_ms is not null
      and payload_fingerprint is not null
    )
  ),
  check (
    consumed_at is null
    or (
      touch_event_key_bytes is not null
      and qualified_touch_at_ms is not null
      and payload_fingerprint is not null
    )
  ),
  check (consumed_at is null or consumed_at >= created_at)
);

create unique index m55_r5_attribution_touch_continuations_touch_event_key_uq
  on public.m55_r5_attribution_touch_continuations (touch_event_key_bytes);

create index m55_r5_attribution_touch_continuations_token_digest_idx
  on public.m55_r5_attribution_touch_continuations (token_digest);

create index m55_r5_attribution_touch_continuations_expires_at_idx
  on public.m55_r5_attribution_touch_continuations (expires_at);

create function public.m55_r5_attribution_touch_continuation_insert_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.expires_at := new.created_at + interval '15 minutes';
  return new;
end $$;

create trigger m55_r5_attribution_touch_continuation_insert_trg
  before insert on public.m55_r5_attribution_touch_continuations
  for each row execute function public.m55_r5_attribution_touch_continuation_insert_v1();

create function public.m55_r5_attribution_touch_continuation_lifecycle_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.continuation_id is distinct from old.continuation_id
     or new.token_version is distinct from old.token_version
     or new.token_digest is distinct from old.token_digest
     or new.qualified_action_kind is distinct from old.qualified_action_kind
     or new.direct_buyer_subject_lookup_digest is distinct from old.direct_buyer_subject_lookup_digest
     or new.created_at is distinct from old.created_at
     or new.expires_at is distinct from old.expires_at then
    raise exception 'CONTINUATION_LIFECYCLE_INVALID';
  end if;

  if old.touch_event_key_bytes is not null then
    if new.touch_event_key_bytes is distinct from old.touch_event_key_bytes
       or new.qualified_touch_at_ms is distinct from old.qualified_touch_at_ms
       or new.payload_fingerprint is distinct from old.payload_fingerprint then
      raise exception 'CONTINUATION_TOUCH_TRIPLE_IMMUTABLE';
    end if;
  elsif new.touch_event_key_bytes is not null then
    if new.qualified_touch_at_ms is null or new.payload_fingerprint is null then
      raise exception 'CONTINUATION_TOUCH_TRIPLE_ATOMICITY_REQUIRED';
    end if;
  end if;

  if old.consumed_at is not null and new.consumed_at is distinct from old.consumed_at then
    raise exception 'CONTINUATION_CONSUMED_AT_IMMUTABLE';
  end if;

  return new;
end $$;

create trigger m55_r5_attribution_touch_continuation_lifecycle_trg
  before update on public.m55_r5_attribution_touch_continuations
  for each row execute function public.m55_r5_attribution_touch_continuation_lifecycle_v1();

create function public.m55_r5_attribution_touch_continuation_delete_guard_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'CONTINUATION_DELETE_FORBIDDEN';
end $$;

create trigger m55_r5_attribution_touch_continuation_delete_guard_trg
  before delete on public.m55_r5_attribution_touch_continuations
  for each row execute function public.m55_r5_attribution_touch_continuation_delete_guard_v1();

create function public.m55_r5_attribution_create_touch_continuation_v1(
  p_cookie_continuation_id bytea,
  p_new_continuation_id bytea,
  p_token_digest text,
  p_token_version text,
  p_qualified_action_kind text,
  p_direct_buyer_subject_lookup_digest text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing public.m55_r5_attribution_touch_continuations%rowtype;
begin
  if p_new_continuation_id is null
     or octet_length(p_new_continuation_id) <> 16 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_token_digest is null
     or p_token_digest !~ '^[0-9a-f]{64}$'
     or p_token_version is distinct from 'v1' then
    raise exception 'INVALID_INPUT';
  end if;

  if p_qualified_action_kind not in (
    'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
    'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION'
  ) then
    raise exception 'QUALIFIED_ACTION_KIND_INVALID';
  end if;

  if p_qualified_action_kind = 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK' then
    if p_direct_buyer_subject_lookup_digest is null
       or p_direct_buyer_subject_lookup_digest !~ '^[0-9a-f]{64}$' then
      raise exception 'DIRECT_BUYER_BINDING_REQUIRED';
    end if;
  elsif p_direct_buyer_subject_lookup_digest is not null then
    raise exception 'PREAUTH_BUYER_BINDING_FORBIDDEN';
  end if;

  if p_cookie_continuation_id is not null then
    if octet_length(p_cookie_continuation_id) <> 16 then
      raise exception 'INVALID_INPUT';
    end if;

    select * into v_existing
    from public.m55_r5_attribution_touch_continuations
    where continuation_id = p_cookie_continuation_id
    for update;

    if found
       and v_existing.consumed_at is null
       and v_existing.expires_at > clock_timestamp()
       and v_existing.token_digest = p_token_digest
       and v_existing.token_version = p_token_version
       and v_existing.qualified_action_kind = p_qualified_action_kind
       and v_existing.direct_buyer_subject_lookup_digest is not distinct from p_direct_buyer_subject_lookup_digest then
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'INTENT_REUSED',
        'continuation_id_hex', encode(v_existing.continuation_id, 'hex')
      );
    end if;
  end if;

  if exists (
    select 1
    from public.m55_r5_attribution_touch_continuations
    where continuation_id = p_new_continuation_id
  ) then
    raise exception 'CONTINUATION_ID_COLLISION';
  end if;

  insert into public.m55_r5_attribution_touch_continuations (
    continuation_id,
    token_version,
    token_digest,
    qualified_action_kind,
    direct_buyer_subject_lookup_digest
  ) values (
    p_new_continuation_id,
    p_token_version,
    p_token_digest,
    p_qualified_action_kind,
    p_direct_buyer_subject_lookup_digest
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'succeeded',
    'outcome', 'INTENT_CREATED',
    'continuation_id_hex', encode(p_new_continuation_id, 'hex')
  );
end $$;

create function public.m55_r5_attribution_admit_qualified_touch_v1(
  p_continuation_id bytea,
  p_clerk_subject_lookup_digest text,
  p_qualified_action_kind text,
  p_candidate_touch_event_key_bytes bytea,
  p_candidate_qualified_touch_at_ms bigint,
  p_payload_fingerprint text,
  p_tracking_contract_version text,
  p_attribution_policy_version text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cont public.m55_r5_attribution_touch_continuations%rowtype;
  v_buyer_subject_id uuid;
  v_link public.m55_creator_referral_links%rowtype;
  v_profile public.m55_creator_profiles%rowtype;
  v_touch public.m55_creator_qualified_touches%rowtype;
  v_lookup_subject_id uuid;
  v_lookup_identity_state text;
begin
  if p_continuation_id is null
     or octet_length(p_continuation_id) <> 16 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_clerk_subject_lookup_digest is null
     or p_clerk_subject_lookup_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_INPUT';
  end if;

  if p_qualified_action_kind not in (
    'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
    'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION'
  ) then
    raise exception 'QUALIFIED_ACTION_KIND_INVALID';
  end if;

  if p_candidate_touch_event_key_bytes is null
     or octet_length(p_candidate_touch_event_key_bytes) <> 16 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_candidate_qualified_touch_at_ms is null
     or p_candidate_qualified_touch_at_ms < 0
     or p_candidate_qualified_touch_at_ms > 9007199254740991 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_payload_fingerprint is null
     or p_payload_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_INPUT';
  end if;

  if p_tracking_contract_version is distinct from 'v1'
     or p_attribution_policy_version is distinct from 'v1' then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_cont
  from public.m55_r5_attribution_touch_continuations
  where continuation_id = p_continuation_id
  for update;

  if not found then
    raise exception 'CONTINUATION_NOT_FOUND';
  end if;

  if v_cont.expires_at <= clock_timestamp() then
    raise exception 'CONTINUATION_EXPIRED';
  end if;

  if v_cont.qualified_action_kind is distinct from p_qualified_action_kind then
    raise exception 'CONTINUATION_INVALID';
  end if;

  if v_cont.token_version is distinct from 'v1' then
    raise exception 'CONTINUATION_INVALID';
  end if;

  if v_cont.qualified_action_kind = 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK' then
    if v_cont.direct_buyer_subject_lookup_digest is distinct from p_clerk_subject_lookup_digest then
      raise exception 'CONTINUATION_BUYER_MISMATCH';
    end if;
  elsif v_cont.direct_buyer_subject_lookup_digest is not null then
    raise exception 'CONTINUATION_INVALID';
  end if;

  if v_cont.touch_event_key_bytes is not null then
    -- Bound continuation: ignore unused HTTP candidates. Historical stored
    -- continuation triple + persisted touch + token/action + buyer continuity
    -- are the only identity authority. Concurrent retries that minted distinct
    -- unused candidates must CONVERGED, not TOUCH_KEY_PAYLOAD_MISMATCH.

    select * into v_touch
    from public.m55_creator_qualified_touches
    where touch_event_key_bytes = v_cont.touch_event_key_bytes;

    if not found then
      raise exception 'CONTINUATION_INVALID';
    end if;

    if v_touch.qualified_touch_at_ms is distinct from v_cont.qualified_touch_at_ms
       or v_touch.payload_fingerprint is distinct from v_cont.payload_fingerprint
       or v_touch.qualified_action_kind is distinct from v_cont.qualified_action_kind then
      raise exception 'TOUCH_KEY_PAYLOAD_MISMATCH';
    end if;

    select l.* into v_link
    from public.m55_creator_referral_links as l
    where l.id = v_touch.creator_referral_link_id;

    if not found
       or v_link.token_digest is distinct from v_cont.token_digest
       or v_link.token_version is distinct from v_cont.token_version then
      raise exception 'TOUCH_KEY_PAYLOAD_MISMATCH';
    end if;

    select id, identity_state
    into v_lookup_subject_id, v_lookup_identity_state
    from public.m55_attribution_buyer_subjects
    where clerk_subject_lookup_digest = p_clerk_subject_lookup_digest;

    if v_lookup_subject_id is null
       or v_lookup_subject_id is distinct from v_touch.buyer_subject_id then
      raise exception 'CONTINUATION_BUYER_MISMATCH';
    end if;

    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'CONVERGED'
    );
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('m55_r5_attr_buyer_subject:' || p_clerk_subject_lookup_digest, 0)
  );

  select id, identity_state
  into v_buyer_subject_id, v_lookup_identity_state
  from public.m55_attribution_buyer_subjects
  where clerk_subject_lookup_digest = p_clerk_subject_lookup_digest
  for update;

  if found then
    if v_lookup_identity_state = 'DELETED' then
      raise exception 'BUYER_SUBJECT_DELETED';
    end if;
    if v_lookup_identity_state <> 'ACTIVE' then
      raise exception 'BUYER_SUBJECT_AMBIGUOUS';
    end if;
  else
    insert into public.m55_attribution_buyer_subjects (
      clerk_subject_lookup_digest,
      identity_state
    ) values (
      p_clerk_subject_lookup_digest,
      'ACTIVE'
    )
    returning id into v_buyer_subject_id;
  end if;

  select * into v_link
  from public.m55_creator_referral_links
  where token_digest = v_cont.token_digest
    and token_version = v_cont.token_version
  for update;

  if not found then
    raise exception 'REFERRAL_LINK_NOT_FOUND';
  end if;

  if v_link.ingest_state <> 'ACTIVE' then
    raise exception 'LINK_NOT_ACTIVE_FOR_NEW_TOUCH';
  end if;

  select * into v_profile
  from public.m55_creator_profiles
  where id = v_link.creator_profile_id
    and economic_identity_id = v_link.creator_economic_identity_id
  for update;

  if not found then
    raise exception 'REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH';
  end if;

  if v_profile.status <> 'ACTIVE' then
    raise exception 'CREATOR_NOT_ACTIVE_FOR_NEW_TOUCH';
  end if;

  if exists (
    select 1
    from public.m55_creator_qualified_touches as t
    where t.touch_event_key_bytes = p_candidate_touch_event_key_bytes
  ) then
    raise exception 'TOUCH_KEY_PAYLOAD_MISMATCH';
  end if;

  update public.m55_r5_attribution_touch_continuations
  set
    touch_event_key_bytes = p_candidate_touch_event_key_bytes,
    qualified_touch_at_ms = p_candidate_qualified_touch_at_ms,
    payload_fingerprint = p_payload_fingerprint,
    consumed_at = clock_timestamp()
  where continuation_id = p_continuation_id;

  insert into public.m55_creator_qualified_touches (
    buyer_subject_id,
    creator_referral_link_id,
    creator_economic_identity_id,
    tracking_lane,
    qualified_touch_at_ms,
    touch_event_key_bytes,
    payload_fingerprint,
    qualified_action_kind,
    tracking_contract_version,
    attribution_policy_version
  ) values (
    v_buyer_subject_id,
    v_link.id,
    v_link.creator_economic_identity_id,
    'CREATOR',
    p_candidate_qualified_touch_at_ms,
    p_candidate_touch_event_key_bytes,
    p_payload_fingerprint,
    p_qualified_action_kind,
    p_tracking_contract_version,
    p_attribution_policy_version
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'succeeded',
    'outcome', 'INSERTED'
  );
end $$;

alter table public.m55_r5_attribution_touch_continuations enable row level security;

revoke all on public.m55_r5_attribution_touch_continuations from public, anon, authenticated;
grant all on public.m55_r5_attribution_touch_continuations to service_role;

revoke all on function public.m55_r5_attribution_touch_continuation_insert_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_touch_continuation_lifecycle_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_touch_continuation_delete_guard_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_create_touch_continuation_v1(bytea, bytea, text, text, text, text) from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_admit_qualified_touch_v1(bytea, text, text, bytea, bigint, text, text, text) from public, anon, authenticated;

grant execute on function public.m55_r5_attribution_touch_continuation_insert_v1() to service_role;
grant execute on function public.m55_r5_attribution_touch_continuation_lifecycle_v1() to service_role;
grant execute on function public.m55_r5_attribution_touch_continuation_delete_guard_v1() to service_role;
grant execute on function public.m55_r5_attribution_create_touch_continuation_v1(bytea, bytea, text, text, text, text) to service_role;
grant execute on function public.m55_r5_attribution_admit_qualified_touch_v1(bytea, text, text, bytea, bigint, text, text, text) to service_role;
