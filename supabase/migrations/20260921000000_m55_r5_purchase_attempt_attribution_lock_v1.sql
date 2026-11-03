-- M55 R5 S3A purchase attempt + immutable attribution lock. Local migration only.
-- No payment consume, no commission ledger, no live checkout wiring.

create function public.m55_r5_attribution_clerk_lookup_digest_v1(p_clerk_user_id text)
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

grant usage on schema extensions to service_role;
grant execute on function extensions.digest(bytea, text) to service_role;

alter table public.m55_creator_qualified_touches
  alter column recorded_at
  set default clock_timestamp();

create table public.m55_r5_purchase_attempts_v1 (
  id uuid primary key default gen_random_uuid(),
  buyer_subject_id uuid not null references public.m55_attribution_buyer_subjects(id) on delete restrict,
  creator_cash_product_key text not null check (
    creator_cash_product_key in ('M55_PREMIUM_REPORT_LIGHT', 'M55_PREMIUM_REPORT_FULL')
  ),
  repurchase_lane boolean not null,
  scope_generation integer not null check (scope_generation >= 0),
  cutoff_at_ms bigint not null check (
    cutoff_at_ms >= 0
    and cutoff_at_ms <= 9007199254740991
  ),
  correlation_purchase_context_id uuid,
  attribution_policy_version text not null default 'v1' check (attribution_policy_version = 'v1'),
  created_at timestamptz not null default now(),
  unique (buyer_subject_id, creator_cash_product_key, repurchase_lane, scope_generation)
);

create function public.m55_r5_purchase_attempt_immutable_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'PURCHASE_ATTEMPT_IMMUTABLE';
end $$;

create trigger m55_r5_purchase_attempt_immutable_trg
  before update or delete on public.m55_r5_purchase_attempts_v1
  for each row execute function public.m55_r5_purchase_attempt_immutable_v1();

create table public.m55_r5_attribution_locks_v1 (
  purchase_attempt_id uuid primary key
    references public.m55_r5_purchase_attempts_v1(id) on delete restrict,
  decision_kind text not null check (decision_kind in ('CREATOR_WINNER', 'NONE')),
  locked_at_ms bigint not null check (
    locked_at_ms >= 0
    and locked_at_ms <= 9007199254740991
  ),
  lock_expires_at_ms bigint not null check (
    lock_expires_at_ms > locked_at_ms
    and lock_expires_at_ms >= 0
    and lock_expires_at_ms <= 9007199254740991
  ),
  winner_qualified_touch_id uuid
    references public.m55_creator_qualified_touches(id) on delete restrict,
  winner_creator_economic_identity_id uuid,
  winner_qualified_touch_at_ms bigint check (
    winner_qualified_touch_at_ms is null
    or (
      winner_qualified_touch_at_ms >= 0
      and winner_qualified_touch_at_ms <= 9007199254740991
    )
  ),
  winner_touch_event_key_bytes bytea check (
    winner_touch_event_key_bytes is null
    or octet_length(winner_touch_event_key_bytes) = 16
  ),
  lock_denial_reason_code text,
  attribution_policy_version text not null default 'v1' check (attribution_policy_version = 'v1'),
  check (
    (
      decision_kind = 'NONE'
      and lock_denial_reason_code is not null
      and lock_denial_reason_code in (
        'NO_QUALIFIED_TOUCH',
        'WINDOW_EXPIRED',
        'SELF_REFERRAL',
        'CIRCULAR_ABUSE',
        'CREATOR_NOT_ACTIVE'
      )
      and winner_qualified_touch_id is null
      and winner_creator_economic_identity_id is null
      and winner_qualified_touch_at_ms is null
      and winner_touch_event_key_bytes is null
    )
    or (
      decision_kind = 'CREATOR_WINNER'
      and lock_denial_reason_code is null
      and winner_qualified_touch_id is not null
      and winner_creator_economic_identity_id is not null
      and winner_qualified_touch_at_ms is not null
      and winner_touch_event_key_bytes is not null
    )
  )
);

create function public.m55_r5_attribution_lock_immutable_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'ATTRIBUTION_LOCK_IMMUTABLE';
end $$;

create trigger m55_r5_attribution_lock_immutable_trg
  before update or delete on public.m55_r5_attribution_locks_v1
  for each row execute function public.m55_r5_attribution_lock_immutable_v1();

create table public.m55_r5_purchase_attempt_provider_bindings_v1 (
  purchase_attempt_id uuid primary key
    references public.m55_r5_purchase_attempts_v1(id) on delete restrict,
  stripe_checkout_session_id text not null unique,
  bound_at timestamptz not null default now()
);

create function public.m55_r5_provider_binding_immutable_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'PROVIDER_BINDING_IMMUTABLE';
end $$;

create trigger m55_r5_provider_binding_immutable_trg
  before update or delete on public.m55_r5_purchase_attempt_provider_bindings_v1
  for each row execute function public.m55_r5_provider_binding_immutable_v1();

create function public.m55_r5_attribution_purchase_attempt_payload_v1(p_attempt_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_attempt public.m55_r5_purchase_attempts_v1%rowtype;
  v_lock public.m55_r5_attribution_locks_v1%rowtype;
  v_binding public.m55_r5_purchase_attempt_provider_bindings_v1%rowtype;
  v_has_lock boolean;
  v_has_binding boolean;
begin
  select * into v_attempt
  from public.m55_r5_purchase_attempts_v1
  where id = p_attempt_id;

  if not found then
    raise exception 'PURCHASE_ATTEMPT_NOT_FOUND';
  end if;

  select * into v_lock
  from public.m55_r5_attribution_locks_v1
  where purchase_attempt_id = p_attempt_id;
  v_has_lock := found;

  select * into v_binding
  from public.m55_r5_purchase_attempt_provider_bindings_v1
  where purchase_attempt_id = p_attempt_id;
  v_has_binding := found;

  if v_has_lock is distinct from v_has_binding then
    raise exception 'FINALIZATION_STATE_CORRUPT';
  end if;

  if not v_has_lock then
    return jsonb_build_object(
      'purchase_attempt_id', v_attempt.id,
      'cutoff_at_ms', v_attempt.cutoff_at_ms,
      'finalization_state', 'UNFINALIZED',
      'stripe_checkout_session_id', null,
      'decision_kind', null,
      'lock_denial_reason_code', null
    );
  end if;

  return jsonb_build_object(
    'purchase_attempt_id', v_attempt.id,
    'cutoff_at_ms', v_attempt.cutoff_at_ms,
    'finalization_state', 'FINALIZED',
    'stripe_checkout_session_id', v_binding.stripe_checkout_session_id,
    'decision_kind', v_lock.decision_kind,
    'lock_denial_reason_code', v_lock.lock_denial_reason_code
  );
end $$;

create function public.m55_r5_attribution_resolve_purchase_attempt_v1(
  p_clerk_subject_lookup_digest text,
  p_buyer_clerk_user_id text,
  p_creator_cash_product_key text,
  p_repurchase_lane boolean,
  p_scope_generation integer,
  p_successor_reason text,
  p_correlation_purchase_context_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expected_digest text;
  v_buyer_subject_id uuid;
  v_identity_state text;
  v_latest public.m55_r5_purchase_attempts_v1%rowtype;
  v_has_lock boolean;
  v_has_binding boolean;
  v_new_id uuid;
  v_cutoff bigint;
begin
  if p_buyer_clerk_user_id is null
     or length(p_buyer_clerk_user_id) = 0
     or length(p_buyer_clerk_user_id) > 128
     or p_buyer_clerk_user_id is distinct from btrim(p_buyer_clerk_user_id) then
    raise exception 'INVALID_INPUT';
  end if;

  if p_clerk_subject_lookup_digest is null
     or p_clerk_subject_lookup_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_INPUT';
  end if;

  v_expected_digest := public.m55_r5_attribution_clerk_lookup_digest_v1(p_buyer_clerk_user_id);
  if v_expected_digest is distinct from p_clerk_subject_lookup_digest then
    raise exception 'BUYER_SUBJECT_DIGEST_MISMATCH';
  end if;

  if p_creator_cash_product_key not in ('M55_PREMIUM_REPORT_LIGHT', 'M55_PREMIUM_REPORT_FULL') then
    raise exception 'INVALID_INPUT';
  end if;

  if p_repurchase_lane is null then
    raise exception 'INVALID_INPUT';
  end if;

  if p_scope_generation is null or p_scope_generation < 0 then
    raise exception 'INVALID_INPUT';
  end if;

  if p_successor_reason is not null
     and p_successor_reason not in (
       'SAME_ATTEMPT_RETRY',
       'NETWORK_RETRY',
       'UNKNOWN_STRIPE_CREATE_OUTCOME',
       'CONFIRMED_EXPIRY',
       'CONFIRMED_CANCEL',
       'PURCHASE_SCOPE_CHANGE'
     ) then
    raise exception 'INVALID_SUCCESSOR_REASON';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('m55_r5_attr_buyer_subject:' || p_clerk_subject_lookup_digest, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended(
      'm55_r5_purchase_attempt:'
      || p_clerk_subject_lookup_digest
      || ':'
      || p_creator_cash_product_key
      || ':'
      || p_repurchase_lane::text,
      0
    )
  );

  select id, identity_state
  into v_buyer_subject_id, v_identity_state
  from public.m55_attribution_buyer_subjects
  where clerk_subject_lookup_digest = p_clerk_subject_lookup_digest
  for update;

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
    returning id into v_buyer_subject_id;
  end if;

  select *
  into v_latest
  from public.m55_r5_purchase_attempts_v1
  where buyer_subject_id = v_buyer_subject_id
    and creator_cash_product_key = p_creator_cash_product_key
    and repurchase_lane = p_repurchase_lane
  order by scope_generation desc
  limit 1
  for update;

  if not found then
    if p_scope_generation is distinct from 0 or p_successor_reason is not null then
      raise exception 'INVALID_SCOPE_GENERATION';
    end if;
    v_cutoff := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
    insert into public.m55_r5_purchase_attempts_v1 (
      buyer_subject_id,
      creator_cash_product_key,
      repurchase_lane,
      scope_generation,
      cutoff_at_ms,
      correlation_purchase_context_id
    ) values (
      v_buyer_subject_id,
      p_creator_cash_product_key,
      p_repurchase_lane,
      0,
      v_cutoff,
      p_correlation_purchase_context_id
    )
    returning id into v_new_id;
    return public.m55_r5_attribution_purchase_attempt_payload_v1(v_new_id);
  end if;

  select exists(
    select 1 from public.m55_r5_attribution_locks_v1 where purchase_attempt_id = v_latest.id
  ) into v_has_lock;
  select exists(
    select 1 from public.m55_r5_purchase_attempt_provider_bindings_v1 where purchase_attempt_id = v_latest.id
  ) into v_has_binding;

  if v_has_lock is distinct from v_has_binding then
    raise exception 'FINALIZATION_STATE_CORRUPT';
  end if;

  if not v_has_lock then
    return public.m55_r5_attribution_purchase_attempt_payload_v1(v_latest.id);
  end if;

  if p_scope_generation > v_latest.scope_generation + 1 then
    raise exception 'INVALID_SCOPE_GENERATION';
  end if;

  if p_scope_generation = v_latest.scope_generation + 1 then
    if p_successor_reason not in ('CONFIRMED_EXPIRY', 'CONFIRMED_CANCEL', 'PURCHASE_SCOPE_CHANGE') then
      raise exception 'INVALID_SUCCESSOR_REASON';
    end if;
    v_cutoff := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
    insert into public.m55_r5_purchase_attempts_v1 (
      buyer_subject_id,
      creator_cash_product_key,
      repurchase_lane,
      scope_generation,
      cutoff_at_ms,
      correlation_purchase_context_id
    ) values (
      v_buyer_subject_id,
      p_creator_cash_product_key,
      p_repurchase_lane,
      v_latest.scope_generation + 1,
      v_cutoff,
      p_correlation_purchase_context_id
    )
    returning id into v_new_id;
    return public.m55_r5_attribution_purchase_attempt_payload_v1(v_new_id);
  end if;

  return public.m55_r5_attribution_purchase_attempt_payload_v1(v_latest.id);
end $$;

create function public.m55_r5_attribution_finalize_lock_and_bind_checkout_session_v1(
  p_purchase_attempt_id uuid,
  p_stripe_checkout_session_id text,
  p_lock_expires_at_ms bigint
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_attempt public.m55_r5_purchase_attempts_v1%rowtype;
  v_buyer public.m55_attribution_buyer_subjects%rowtype;
  v_lock public.m55_r5_attribution_locks_v1%rowtype;
  v_binding public.m55_r5_purchase_attempt_provider_bindings_v1%rowtype;
  v_has_lock boolean;
  v_has_binding boolean;
  v_touch public.m55_creator_qualified_touches%rowtype;
  v_winner_profile public.m55_creator_profiles%rowtype;
  v_buyer_creator public.m55_creator_profiles%rowtype;
  v_cutoff bigint;
  v_window_ms bigint := 30::bigint * 24 * 60 * 60 * 1000;
  v_decision text;
  v_denial text;
  v_winner_touch_id uuid;
  v_winner_economic uuid;
  v_winner_touch_at bigint;
  v_winner_key bytea;
begin
  if p_purchase_attempt_id is null then
    raise exception 'INVALID_INPUT';
  end if;

  if p_stripe_checkout_session_id is null
     or length(p_stripe_checkout_session_id) = 0
     or p_stripe_checkout_session_id is distinct from btrim(p_stripe_checkout_session_id) then
    raise exception 'INVALID_INPUT';
  end if;

  if p_lock_expires_at_ms is null
     or p_lock_expires_at_ms < 0
     or p_lock_expires_at_ms > 9007199254740991 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_attempt
  from public.m55_r5_purchase_attempts_v1
  where id = p_purchase_attempt_id
  for update;

  if not found then
    raise exception 'PURCHASE_ATTEMPT_NOT_FOUND';
  end if;

  v_cutoff := v_attempt.cutoff_at_ms;

  if p_lock_expires_at_ms <= v_cutoff then
    raise exception 'LOCK_EXPIRY_NOT_AFTER_CUTOFF';
  end if;

  select * into v_lock
  from public.m55_r5_attribution_locks_v1
  where purchase_attempt_id = p_purchase_attempt_id;
  v_has_lock := found;

  select * into v_binding
  from public.m55_r5_purchase_attempt_provider_bindings_v1
  where purchase_attempt_id = p_purchase_attempt_id;
  v_has_binding := found;

  if v_has_lock is distinct from v_has_binding then
    raise exception 'FINALIZATION_STATE_CORRUPT';
  end if;

  if v_has_lock then
    if v_binding.stripe_checkout_session_id is not distinct from p_stripe_checkout_session_id then
      return public.m55_r5_attribution_purchase_attempt_payload_v1(p_purchase_attempt_id);
    end if;
    raise exception 'CONFLICTING_FINALIZATION';
  end if;

  if exists (
    select 1
    from public.m55_r5_purchase_attempt_provider_bindings_v1
    where stripe_checkout_session_id = p_stripe_checkout_session_id
  ) then
    raise exception 'CONFLICTING_SESSION_BINDING';
  end if;

  select * into v_buyer
  from public.m55_attribution_buyer_subjects
  where id = v_attempt.buyer_subject_id;

  if not found or v_buyer.identity_state <> 'ACTIVE' then
    raise exception 'BUYER_SUBJECT_DELETED';
  end if;

  select *
  into v_touch
  from public.m55_creator_qualified_touches
  where buyer_subject_id = v_attempt.buyer_subject_id
    and qualified_touch_at_ms <= v_cutoff
  order by qualified_touch_at_ms desc, touch_event_key_bytes asc
  limit 1;

  v_decision := 'NONE';
  v_denial := 'NO_QUALIFIED_TOUCH';
  v_winner_touch_id := null;
  v_winner_economic := null;
  v_winner_touch_at := null;
  v_winner_key := null;

  if found then
    if not (
      v_touch.qualified_touch_at_ms <= v_cutoff
      and v_cutoff < v_touch.qualified_touch_at_ms + v_window_ms
    ) then
      v_denial := 'WINDOW_EXPIRED';
    else
      select * into v_winner_profile
      from public.m55_creator_profiles
      where economic_identity_id = v_touch.creator_economic_identity_id;

      if not found then
        v_denial := 'CREATOR_NOT_ACTIVE';
      elsif public.m55_r5_attribution_clerk_lookup_digest_v1(v_winner_profile.clerk_user_id)
            = v_buyer.clerk_subject_lookup_digest then
        v_denial := 'SELF_REFERRAL';
      else
        select * into v_buyer_creator
        from public.m55_creator_profiles
        where public.m55_r5_attribution_clerk_lookup_digest_v1(clerk_user_id)
              = v_buyer.clerk_subject_lookup_digest;

        if found then
          if exists (
            select 1
            from public.m55_creator_qualified_touches as t
            join public.m55_attribution_buyer_subjects as s
              on s.id = t.buyer_subject_id
            where s.clerk_subject_lookup_digest
                  = public.m55_r5_attribution_clerk_lookup_digest_v1(v_winner_profile.clerk_user_id)
              and t.creator_economic_identity_id = v_buyer_creator.economic_identity_id
              and t.qualified_touch_at_ms <= v_cutoff
          ) then
            v_denial := 'CIRCULAR_ABUSE';
          elsif v_winner_profile.status is distinct from 'ACTIVE' then
            v_denial := 'CREATOR_NOT_ACTIVE';
          else
            v_decision := 'CREATOR_WINNER';
            v_denial := null;
            v_winner_touch_id := v_touch.id;
            v_winner_economic := v_touch.creator_economic_identity_id;
            v_winner_touch_at := v_touch.qualified_touch_at_ms;
            v_winner_key := v_touch.touch_event_key_bytes;
          end if;
        elsif v_winner_profile.status is distinct from 'ACTIVE' then
          v_denial := 'CREATOR_NOT_ACTIVE';
        else
          v_decision := 'CREATOR_WINNER';
          v_denial := null;
          v_winner_touch_id := v_touch.id;
          v_winner_economic := v_touch.creator_economic_identity_id;
          v_winner_touch_at := v_touch.qualified_touch_at_ms;
          v_winner_key := v_touch.touch_event_key_bytes;
        end if;
      end if;
    end if;
  end if;

  insert into public.m55_r5_attribution_locks_v1 (
    purchase_attempt_id,
    decision_kind,
    locked_at_ms,
    lock_expires_at_ms,
    winner_qualified_touch_id,
    winner_creator_economic_identity_id,
    winner_qualified_touch_at_ms,
    winner_touch_event_key_bytes,
    lock_denial_reason_code
  ) values (
    p_purchase_attempt_id,
    v_decision,
    v_cutoff,
    p_lock_expires_at_ms,
    v_winner_touch_id,
    v_winner_economic,
    v_winner_touch_at,
    v_winner_key,
    v_denial
  );

  insert into public.m55_r5_purchase_attempt_provider_bindings_v1 (
    purchase_attempt_id,
    stripe_checkout_session_id
  ) values (
    p_purchase_attempt_id,
    p_stripe_checkout_session_id
  );

  return public.m55_r5_attribution_purchase_attempt_payload_v1(p_purchase_attempt_id);
end $$;

alter table public.m55_r5_purchase_attempts_v1 enable row level security;
alter table public.m55_r5_attribution_locks_v1 enable row level security;
alter table public.m55_r5_purchase_attempt_provider_bindings_v1 enable row level security;

revoke all on public.m55_r5_purchase_attempts_v1 from public, anon, authenticated;
revoke all on public.m55_r5_attribution_locks_v1 from public, anon, authenticated;
revoke all on public.m55_r5_purchase_attempt_provider_bindings_v1 from public, anon, authenticated;

grant all on public.m55_r5_purchase_attempts_v1 to service_role;
grant all on public.m55_r5_attribution_locks_v1 to service_role;
grant all on public.m55_r5_purchase_attempt_provider_bindings_v1 to service_role;

revoke all on function public.m55_r5_attribution_clerk_lookup_digest_v1(text) from public, anon, authenticated;
revoke all on function public.m55_r5_purchase_attempt_immutable_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_lock_immutable_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_provider_binding_immutable_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_purchase_attempt_payload_v1(uuid) from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_resolve_purchase_attempt_v1(text, text, text, boolean, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_finalize_lock_and_bind_checkout_session_v1(uuid, text, bigint) from public, anon, authenticated;

grant execute on function public.m55_r5_attribution_clerk_lookup_digest_v1(text) to service_role;
grant execute on function public.m55_r5_purchase_attempt_immutable_v1() to service_role;
grant execute on function public.m55_r5_attribution_lock_immutable_v1() to service_role;
grant execute on function public.m55_r5_provider_binding_immutable_v1() to service_role;
grant execute on function public.m55_r5_attribution_purchase_attempt_payload_v1(uuid) to service_role;
grant execute on function public.m55_r5_attribution_resolve_purchase_attempt_v1(text, text, text, boolean, integer, text, uuid) to service_role;
grant execute on function public.m55_r5_attribution_finalize_lock_and_bind_checkout_session_v1(uuid, text, bigint) to service_role;
