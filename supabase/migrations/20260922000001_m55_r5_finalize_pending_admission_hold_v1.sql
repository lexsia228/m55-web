-- M55 R5 S3 follow-on: pending admission HOLD + global buyer settlement boundary.
-- Local migration only. Does not alter frozen 20260921000000 migration file.

create or replace function public.m55_r5_attribution_finalize_lock_and_bind_checkout_session_v1(
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
  v_now_ms bigint;
  v_window_ms bigint := 30::bigint * 24 * 60 * 60 * 1000;
  v_decision text;
  v_denial text;
  v_winner_touch_id uuid;
  v_winner_economic uuid;
  v_winner_touch_at bigint;
  v_winner_key bytea;
  v_winner_creator_digest text;
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

  if not pg_try_advisory_xact_lock(
    hashtextextended('m55_r5_attr_buyer_subject:' || v_buyer.clerk_subject_lookup_digest, 0)
  ) then
    raise exception 'PENDING_ADMISSION_RETRY_HOLD';
  end if;

  v_now_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  if v_now_ms <= v_cutoff then
    raise exception 'PENDING_ADMISSION_RETRY_HOLD';
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
          v_winner_creator_digest :=
            public.m55_r5_attribution_clerk_lookup_digest_v1(v_winner_profile.clerk_user_id);

          if not pg_try_advisory_xact_lock(
            hashtextextended('m55_r5_attr_buyer_subject:' || v_winner_creator_digest, 0)
          ) then
            raise exception 'PENDING_ADMISSION_RETRY_HOLD';
          end if;

          if exists (
            select 1
            from public.m55_creator_qualified_touches as t
            join public.m55_attribution_buyer_subjects as s
              on s.id = t.buyer_subject_id
            where s.clerk_subject_lookup_digest = v_winner_creator_digest
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

revoke all on function public.m55_r5_attribution_finalize_lock_and_bind_checkout_session_v1(
  uuid, text, bigint
) from public, anon, authenticated;

grant execute on function public.m55_r5_attribution_finalize_lock_and_bind_checkout_session_v1(
  uuid, text, bigint
) to service_role;
