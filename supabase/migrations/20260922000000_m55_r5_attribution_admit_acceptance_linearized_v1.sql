-- M55 R5 S2 follow-on: linearize unbound admission authority inside admit txn.
-- Local migration only. Does not alter frozen 20260920000000 migration file.

grant usage on schema extensions to service_role;
grant execute on function extensions.gen_random_bytes(integer) to service_role;
grant execute on function extensions.digest(bytea, text) to service_role;

create or replace function public.m55_r5_attribution_qualified_touch_payload_fingerprint_v1(
  p_qualified_action_kind text,
  p_token_version text,
  p_token_digest text,
  p_qualified_touch_at_ms bigint,
  p_tracking_contract_version text,
  p_attribution_policy_version text
) returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to('m55.r5.attribution.qualified_touch.payload.v1', 'UTF8')
      || decode('00', 'hex')
      || convert_to('CREATOR', 'UTF8')
      || decode('00', 'hex')
      || convert_to(p_qualified_action_kind, 'UTF8')
      || decode('00', 'hex')
      || convert_to(p_token_version, 'UTF8')
      || decode('00', 'hex')
      || convert_to(p_token_digest, 'UTF8')
      || decode('00', 'hex')
      || convert_to(p_qualified_touch_at_ms::text, 'UTF8')
      || decode('00', 'hex')
      || convert_to(p_tracking_contract_version, 'UTF8')
      || decode('00', 'hex')
      || convert_to(p_attribution_policy_version, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function public.m55_r5_attribution_qualified_touch_payload_fingerprint_v1(
  text, text, text, bigint, text, text
) from public, anon, authenticated;

grant execute on function public.m55_r5_attribution_qualified_touch_payload_fingerprint_v1(
  text, text, text, bigint, text, text
) to service_role;

create or replace function public.m55_r5_attribution_admit_qualified_touch_v1(
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
  v_touch_key bytea;
  v_accept_ms bigint;
  v_fingerprint text;
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

  v_accept_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_touch_key := extensions.gen_random_bytes(16);
  v_fingerprint := public.m55_r5_attribution_qualified_touch_payload_fingerprint_v1(
    p_qualified_action_kind,
    v_cont.token_version,
    v_cont.token_digest,
    v_accept_ms,
    p_tracking_contract_version,
    p_attribution_policy_version
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
    where t.touch_event_key_bytes = v_touch_key
  ) then
    raise exception 'TOUCH_KEY_PAYLOAD_MISMATCH';
  end if;

  update public.m55_r5_attribution_touch_continuations
  set
    touch_event_key_bytes = v_touch_key,
    qualified_touch_at_ms = v_accept_ms,
    payload_fingerprint = v_fingerprint,
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
    v_accept_ms,
    v_touch_key,
    v_fingerprint,
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

revoke all on function public.m55_r5_attribution_admit_qualified_touch_v1(
  bytea, text, text, bytea, bigint, text, text, text
) from public, anon, authenticated;

grant execute on function public.m55_r5_attribution_admit_qualified_touch_v1(
  bytea, text, text, bytea, bigint, text, text, text
) to service_role;
