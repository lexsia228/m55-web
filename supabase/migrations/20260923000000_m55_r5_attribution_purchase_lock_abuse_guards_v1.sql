-- M55 R5 post-R5B reconciliation: main210-native purchase-lock abuse guards.
-- Forward-only local migration. Does not alter frozen 190/200/210 migration files.

grant usage on schema extensions to service_role;
grant execute on function extensions.digest(bytea, text) to service_role;

create or replace function public.m55_r5_attribution_clerk_lookup_digest_v1(p_clerk_user_id text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to('m55.r5.attribution.buyer_subject.clerk_lookup.v1', 'UTF8')
      || decode('00', 'hex')
      || convert_to(p_clerk_user_id, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function public.m55_r5_attribution_lock_purchase_attempt_v1(
  p_clerk_subject_lookup_digest text,
  p_runtime_product_id text,
  p_policy_product_id text,
  p_conversion_kind text,
  p_purchase_scope_id text,
  p_cutoff_at_ms bigint,
  p_attribution_locked_at_ms bigint,
  p_pending_continuation_id bytea,
  p_tracking_contract_version text,
  p_attribution_policy_version text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_digest text;
  v_existing public.m55_r5_attribution_purchase_attempts%rowtype;
  v_buyer_id uuid;
  v_identity_state text;
  v_terms text;
  v_touch public.m55_creator_qualified_touches%rowtype;
  v_profile public.m55_creator_profiles%rowtype;
  v_buyer_creator public.m55_creator_profiles%rowtype;
  v_winner_creator_digest text;
  v_attempt_id uuid;
  v_pending public.m55_r5_attribution_touch_continuations%rowtype;
  v_direct_pending int;
  v_cookie bytea;
begin
  if p_clerk_subject_lookup_digest is null
     or p_clerk_subject_lookup_digest !~ '^[0-9a-f]{64}$'
     or p_runtime_product_id is null
     or p_policy_product_id is null
     or p_conversion_kind is null
     or p_purchase_scope_id is null
     or char_length(p_purchase_scope_id) = 0
     or p_cutoff_at_ms is null
     or p_cutoff_at_ms < 0
     or p_cutoff_at_ms > 9007199254740991
     or p_attribution_locked_at_ms is null
     or p_attribution_locked_at_ms < 0
     or p_attribution_locked_at_ms > 9007199254740991
     or p_tracking_contract_version is distinct from 'v1'
     or p_attribution_policy_version is distinct from 'v1' then
    raise exception 'INVALID_INPUT';
  end if;

  v_digest := encode(
    extensions.digest(
      convert_to('m55.r5.attribution.purchase_attempt.scope.v1', 'UTF8')
      || '\x00'::bytea
      || convert_to(p_clerk_subject_lookup_digest, 'UTF8')
      || '\x00'::bytea
      || convert_to(p_runtime_product_id, 'UTF8')
      || '\x00'::bytea
      || convert_to(p_purchase_scope_id, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  perform pg_advisory_xact_lock(
    hashtextextended('m55_r5_attr_buyer_subject:' || p_clerk_subject_lookup_digest, 0)
  );

  v_cookie := p_pending_continuation_id;
  if v_cookie is not null then
    if octet_length(v_cookie) <> 16 then
      v_cookie := null;
    else
      select * into v_pending
      from public.m55_r5_attribution_touch_continuations
      where continuation_id = v_cookie
      for update;
      if found
         and v_pending.consumed_at is null
         and v_pending.expires_at > clock_timestamp()
         and floor(extract(epoch from v_pending.created_at) * 1000)::bigint <= p_cutoff_at_ms then
        return jsonb_build_object(
          'ok', true,
          'status', 'succeeded',
          'outcome', 'HOLD_PENDING_ADMISSION',
          'purchase_attempt_id', null
        );
      end if;
    end if;
  end if;

  select count(*)::int into v_direct_pending
  from public.m55_r5_attribution_touch_continuations
  where qualified_action_kind = 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK'
    and direct_buyer_subject_lookup_digest = p_clerk_subject_lookup_digest
    and consumed_at is null
    and expires_at > clock_timestamp()
    and floor(extract(epoch from created_at) * 1000)::bigint <= p_cutoff_at_ms;
  if v_direct_pending > 0 then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'HOLD_PENDING_ADMISSION',
      'purchase_attempt_id', null
    );
  end if;

  select * into v_existing
  from public.m55_r5_attribution_purchase_attempts
  where attempt_reuse_scope_digest = v_digest
    and terminal_state = 'OPEN'
  for update;
  if found then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'CONVERGED',
      'purchase_attempt_id', v_existing.purchase_attempt_id
    );
  end if;

  select id, identity_state into v_buyer_id, v_identity_state
  from public.m55_attribution_buyer_subjects
  where clerk_subject_lookup_digest = p_clerk_subject_lookup_digest;
  if found then
    if v_identity_state = 'DELETED' then
      raise exception 'BUYER_SUBJECT_DELETED';
    end if;
    if v_identity_state <> 'ACTIVE' then
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
    returning id into v_buyer_id;
  end if;

  select c.required_creator_terms_version into v_terms
  from public.m55_r5_attribution_control_constants c
  where c.singleton = true;

  select t.* into v_touch
  from public.m55_creator_qualified_touches t
  where t.buyer_subject_id = v_buyer_id
    and t.qualified_touch_at_ms <= p_cutoff_at_ms
    and t.qualified_touch_at_ms <= p_attribution_locked_at_ms
    and t.qualified_touch_at_ms >= p_attribution_locked_at_ms - 2592000000
  order by t.qualified_touch_at_ms desc, t.touch_event_key_bytes asc
  limit 1;

  if v_touch.id is null then
    insert into public.m55_r5_attribution_purchase_attempts (
      buyer_subject_id,
      owner_clerk_subject_lookup_digest,
      runtime_product_id,
      policy_product_id,
      conversion_kind,
      purchase_scope_id,
      attempt_reuse_scope_digest,
      cutoff_at_ms,
      attribution_locked_at_ms,
      decision_kind,
      eligibility_reason_code
    ) values (
      v_buyer_id,
      p_clerk_subject_lookup_digest,
      p_runtime_product_id,
      p_policy_product_id,
      p_conversion_kind,
      p_purchase_scope_id,
      v_digest,
      p_cutoff_at_ms,
      p_attribution_locked_at_ms,
      'NONE',
      'NONE_NO_ELIGIBLE_WINNER'
    )
    returning purchase_attempt_id into v_attempt_id;
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'LOCKED_NONE',
      'purchase_attempt_id', v_attempt_id
    );
  end if;

  select * into v_profile
  from public.m55_creator_profiles
  where economic_identity_id = v_touch.creator_economic_identity_id;

  if not found then
    insert into public.m55_r5_attribution_purchase_attempts (
      buyer_subject_id,
      owner_clerk_subject_lookup_digest,
      runtime_product_id,
      policy_product_id,
      conversion_kind,
      purchase_scope_id,
      attempt_reuse_scope_digest,
      cutoff_at_ms,
      attribution_locked_at_ms,
      decision_kind,
      eligibility_reason_code
    ) values (
      v_buyer_id,
      p_clerk_subject_lookup_digest,
      p_runtime_product_id,
      p_policy_product_id,
      p_conversion_kind,
      p_purchase_scope_id,
      v_digest,
      p_cutoff_at_ms,
      p_attribution_locked_at_ms,
      'NONE',
      'NONE_NO_ELIGIBLE_WINNER'
    )
    returning purchase_attempt_id into v_attempt_id;
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'LOCKED_NONE',
      'purchase_attempt_id', v_attempt_id
    );
  end if;

  v_winner_creator_digest :=
    public.m55_r5_attribution_clerk_lookup_digest_v1(v_profile.clerk_user_id);

  if v_winner_creator_digest = p_clerk_subject_lookup_digest then
    insert into public.m55_r5_attribution_purchase_attempts (
      buyer_subject_id,
      owner_clerk_subject_lookup_digest,
      runtime_product_id,
      policy_product_id,
      conversion_kind,
      purchase_scope_id,
      attempt_reuse_scope_digest,
      cutoff_at_ms,
      attribution_locked_at_ms,
      decision_kind,
      eligibility_reason_code
    ) values (
      v_buyer_id,
      p_clerk_subject_lookup_digest,
      p_runtime_product_id,
      p_policy_product_id,
      p_conversion_kind,
      p_purchase_scope_id,
      v_digest,
      p_cutoff_at_ms,
      p_attribution_locked_at_ms,
      'NONE',
      'SELF_REFERRAL'
    )
    returning purchase_attempt_id into v_attempt_id;
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'LOCKED_NONE',
      'purchase_attempt_id', v_attempt_id
    );
  end if;

  select * into v_buyer_creator
  from public.m55_creator_profiles
  where public.m55_r5_attribution_clerk_lookup_digest_v1(clerk_user_id)
        = p_clerk_subject_lookup_digest;

  if found then
    if not pg_try_advisory_xact_lock(
      hashtextextended('m55_r5_attr_buyer_subject:' || v_winner_creator_digest, 0)
    ) then
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'HOLD_PENDING_ADMISSION',
        'purchase_attempt_id', null
      );
    end if;

    if exists (
      select 1
      from public.m55_creator_qualified_touches as t
      join public.m55_attribution_buyer_subjects as s
        on s.id = t.buyer_subject_id
      where s.clerk_subject_lookup_digest = v_winner_creator_digest
        and t.creator_economic_identity_id = v_buyer_creator.economic_identity_id
        and t.qualified_touch_at_ms <= p_cutoff_at_ms
    ) then
      insert into public.m55_r5_attribution_purchase_attempts (
        buyer_subject_id,
        owner_clerk_subject_lookup_digest,
        runtime_product_id,
        policy_product_id,
        conversion_kind,
        purchase_scope_id,
        attempt_reuse_scope_digest,
        cutoff_at_ms,
        attribution_locked_at_ms,
        decision_kind,
        eligibility_reason_code
      ) values (
        v_buyer_id,
        p_clerk_subject_lookup_digest,
        p_runtime_product_id,
        p_policy_product_id,
        p_conversion_kind,
        p_purchase_scope_id,
        v_digest,
        p_cutoff_at_ms,
        p_attribution_locked_at_ms,
        'NONE',
        'CIRCULAR_ABUSE'
      )
      returning purchase_attempt_id into v_attempt_id;
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'LOCKED_NONE',
        'purchase_attempt_id', v_attempt_id
      );
    end if;
  end if;

  if v_profile.status is distinct from 'ACTIVE'
     or v_profile.terms_version is distinct from v_terms then
    insert into public.m55_r5_attribution_purchase_attempts (
      buyer_subject_id,
      owner_clerk_subject_lookup_digest,
      runtime_product_id,
      policy_product_id,
      conversion_kind,
      purchase_scope_id,
      attempt_reuse_scope_digest,
      cutoff_at_ms,
      attribution_locked_at_ms,
      decision_kind,
      eligibility_reason_code
    ) values (
      v_buyer_id,
      p_clerk_subject_lookup_digest,
      p_runtime_product_id,
      p_policy_product_id,
      p_conversion_kind,
      p_purchase_scope_id,
      v_digest,
      p_cutoff_at_ms,
      p_attribution_locked_at_ms,
      'NONE',
      'NONE_NO_ELIGIBLE_WINNER'
    )
    returning purchase_attempt_id into v_attempt_id;
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'LOCKED_NONE',
      'purchase_attempt_id', v_attempt_id
    );
  end if;

  insert into public.m55_r5_attribution_purchase_attempts (
    buyer_subject_id,
    owner_clerk_subject_lookup_digest,
    runtime_product_id,
    policy_product_id,
    conversion_kind,
    purchase_scope_id,
    attempt_reuse_scope_digest,
    cutoff_at_ms,
    attribution_locked_at_ms,
    decision_kind,
    selected_touch_id,
    selected_touch_event_key_bytes,
    selected_qualified_touch_at_ms,
    creator_economic_identity_id,
    creator_referral_link_id,
    creator_status_at_lock,
    eligibility_reason_code
  ) values (
    v_buyer_id,
    p_clerk_subject_lookup_digest,
    p_runtime_product_id,
    p_policy_product_id,
    p_conversion_kind,
    p_purchase_scope_id,
    v_digest,
    p_cutoff_at_ms,
    p_attribution_locked_at_ms,
    'CREATOR_WINNER',
    v_touch.id,
    v_touch.touch_event_key_bytes,
    v_touch.qualified_touch_at_ms,
    v_touch.creator_economic_identity_id,
    v_touch.creator_referral_link_id,
    'ACTIVE',
    'LAST_QUALIFIED_DIRECT_CREATOR_TOUCH'
  )
  returning purchase_attempt_id into v_attempt_id;

  return jsonb_build_object(
    'ok', true,
    'status', 'succeeded',
    'outcome', 'LOCKED_WINNER',
    'purchase_attempt_id', v_attempt_id
  );
end
$fn$;

revoke all on function public.m55_r5_attribution_clerk_lookup_digest_v1(text) from public, anon, authenticated;
grant execute on function public.m55_r5_attribution_clerk_lookup_digest_v1(text) to service_role;
