-- M55 R5-B purchase lock v1. Local migration only; no R5-C / R6 / Preview / Production apply.

create extension if not exists pgcrypto;

create unique index if not exists m55_creator_profiles_id_economic_identity_uq
  on public.m55_creator_profiles (id, economic_identity_id);

create unique index if not exists m55_attribution_buyer_subjects_id_clerk_digest_uq
  on public.m55_attribution_buyer_subjects (id, clerk_subject_lookup_digest);

create unique index if not exists m55_r5_qualified_touches_attempt_winner_fk_uq
  on public.m55_creator_qualified_touches (
    id,
    buyer_subject_id,
    touch_event_key_bytes,
    creator_referral_link_id,
    creator_economic_identity_id
  );

create table public.m55_r5_attribution_control_constants (
  singleton boolean primary key check (singleton = true),
  creator_status_history_authority_epoch_ms bigint not null check (
    creator_status_history_authority_epoch_ms >= 0
    and creator_status_history_authority_epoch_ms <= 9007199254740991
  ),
  required_creator_terms_version text not null check (
    required_creator_terms_version = '2026-09-13-v1'
  ),
  created_at timestamptz not null default now()
);

create function public.m55_r5_attribution_control_constants_immutable_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  raise exception 'CONTROL_CONSTANTS_IMMUTABLE';
end
$fn$;

create trigger m55_r5_attribution_control_constants_immutable
  before update or delete on public.m55_r5_attribution_control_constants
  for each row execute function public.m55_r5_attribution_control_constants_immutable_trg();

alter table public.m55_r5_attribution_control_constants enable row level security;
revoke all on public.m55_r5_attribution_control_constants from public, anon, authenticated, service_role;
grant select on public.m55_r5_attribution_control_constants to service_role;

insert into public.m55_r5_attribution_control_constants (
  singleton,
  creator_status_history_authority_epoch_ms,
  required_creator_terms_version
) values (
  true,
  floor(extract(epoch from clock_timestamp()) * 1000)::bigint,
  '2026-09-13-v1'
);

create table public.m55_creator_profile_eligibility_events (
  event_id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null,
  creator_economic_identity_id uuid not null,
  eligibility_event_seq bigint generated always as identity not null,
  profile_status text not null check (
    profile_status in ('APPROVED_PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'REVOKED')
  ),
  terms_version text not null,
  terms_accepted_at_ms bigint not null check (
    terms_accepted_at_ms >= 0 and terms_accepted_at_ms <= 9007199254740991
  ),
  new_earning_off boolean not null default false,
  effective_at_ms bigint not null check (
    effective_at_ms >= 0 and effective_at_ms <= 9007199254740991
  ),
  reason_code text not null check (
    reason_code in ('TRIGGER', 'INITIAL_ROW_SNAPSHOT', 'EFFECTIVE_DEACTIVATION')
  ),
  created_at timestamptz not null default now(),
  constraint m55_r5_eligibility_profile_fk
    foreign key (creator_profile_id, creator_economic_identity_id)
    references public.m55_creator_profiles (id, economic_identity_id)
    on delete restrict,
  constraint m55_r5_eligibility_deactivation_off_chk check (
    reason_code <> 'EFFECTIVE_DEACTIVATION' or new_earning_off = true
  ),
  constraint m55_r5_eligibility_trigger_snapshot_off_chk check (
    reason_code not in ('INITIAL_ROW_SNAPSHOT', 'TRIGGER') or new_earning_off = false
  )
);

create unique index m55_r5_eligibility_initial_snapshot_uq
  on public.m55_creator_profile_eligibility_events (creator_profile_id)
  where reason_code = 'INITIAL_ROW_SNAPSHOT';

create index m55_r5_eligibility_identity_effective_idx
  on public.m55_creator_profile_eligibility_events (
    creator_economic_identity_id,
    effective_at_ms desc,
    eligibility_event_seq desc
  );

create function public.m55_r5_eligibility_events_append_only_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  raise exception 'ELIGIBILITY_EVENT_APPEND_ONLY';
end
$fn$;

create trigger m55_r5_eligibility_events_append_only
  before update or delete on public.m55_creator_profile_eligibility_events
  for each row execute function public.m55_r5_eligibility_events_append_only_trg();

create function public.m55_r5_eligibility_event_from_profile_trg()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_effective bigint;
  v_terms_ms bigint;
begin
  if tg_op = 'INSERT' then
    v_effective := floor(extract(epoch from new.created_at) * 1000)::bigint;
  else
    v_effective := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  end if;
  v_terms_ms := floor(extract(epoch from new.terms_accepted_at) * 1000)::bigint;
  insert into public.m55_creator_profile_eligibility_events (
    creator_profile_id,
    creator_economic_identity_id,
    profile_status,
    terms_version,
    terms_accepted_at_ms,
    new_earning_off,
    effective_at_ms,
    reason_code
  ) values (
    new.id,
    new.economic_identity_id,
    new.status,
    new.terms_version,
    v_terms_ms,
    false,
    v_effective,
    'TRIGGER'
  );
  return new;
end
$fn$;

create trigger m55_r5_eligibility_from_profile_ins
  after insert on public.m55_creator_profiles
  for each row execute function public.m55_r5_eligibility_event_from_profile_trg();

create trigger m55_r5_eligibility_from_profile_upd
  after update of status, terms_version, terms_accepted_at on public.m55_creator_profiles
  for each row execute function public.m55_r5_eligibility_event_from_profile_trg();

alter table public.m55_creator_profile_eligibility_events enable row level security;
revoke all on public.m55_creator_profile_eligibility_events from public, anon, authenticated, service_role;
revoke insert, update, delete on public.m55_creator_profile_eligibility_events from public, anon, authenticated, service_role;
grant select on public.m55_creator_profile_eligibility_events to service_role;

create function public.m55_r5_eligibility_history_epoch_backfill_v1()
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_epoch bigint;
begin
  select creator_status_history_authority_epoch_ms
    into v_epoch
  from public.m55_r5_attribution_control_constants
  where singleton = true;

  insert into public.m55_creator_profile_eligibility_events (
    creator_profile_id,
    creator_economic_identity_id,
    profile_status,
    terms_version,
    terms_accepted_at_ms,
    new_earning_off,
    effective_at_ms,
    reason_code
  )
  select
    p.id,
    p.economic_identity_id,
    p.status,
    p.terms_version,
    floor(extract(epoch from p.terms_accepted_at) * 1000)::bigint,
    false,
    v_epoch,
    'INITIAL_ROW_SNAPSHOT'
  from public.m55_creator_profiles p
  where floor(extract(epoch from p.created_at) * 1000)::bigint < v_epoch
    and not exists (
      select 1
      from public.m55_creator_profile_eligibility_events e
      where e.creator_profile_id = p.id
        and e.reason_code = 'INITIAL_ROW_SNAPSHOT'
    );
end
$fn$;

create function public.m55_r5_attribution_record_effective_deactivation_v1(
  p_creator_economic_identity_id uuid,
  p_effective_at_ms bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_profile public.m55_creator_profiles%rowtype;
begin
  if p_creator_economic_identity_id is null
     or p_effective_at_ms is null
     or p_effective_at_ms < 0
     or p_effective_at_ms > 9007199254740991 then
    raise exception 'INVALID_INPUT';
  end if;
  select * into v_profile
  from public.m55_creator_profiles
  where economic_identity_id = p_creator_economic_identity_id;
  if not found then
    raise exception 'INVALID_INPUT';
  end if;
  insert into public.m55_creator_profile_eligibility_events (
    creator_profile_id,
    creator_economic_identity_id,
    profile_status,
    terms_version,
    terms_accepted_at_ms,
    new_earning_off,
    effective_at_ms,
    reason_code
  ) values (
    v_profile.id,
    v_profile.economic_identity_id,
    v_profile.status,
    v_profile.terms_version,
    floor(extract(epoch from v_profile.terms_accepted_at) * 1000)::bigint,
    true,
    p_effective_at_ms,
    'EFFECTIVE_DEACTIVATION'
  );
  return jsonb_build_object('ok', true, 'status', 'succeeded', 'outcome', 'RECORDED');
end
$fn$;

select public.m55_r5_eligibility_history_epoch_backfill_v1();

revoke all on function public.m55_r5_eligibility_history_epoch_backfill_v1() from public, anon, authenticated, service_role;
revoke all on function public.m55_r5_eligibility_event_from_profile_trg() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_record_effective_deactivation_v1(uuid, bigint) from public, anon, authenticated;
grant execute on function public.m55_r5_attribution_record_effective_deactivation_v1(uuid, bigint) to service_role;

create table public.m55_r5_attribution_purchase_attempts (
  purchase_attempt_id uuid primary key default gen_random_uuid(),
  buyer_subject_id uuid not null,
  owner_clerk_subject_lookup_digest text not null check (owner_clerk_subject_lookup_digest ~ '^[0-9a-f]{64}$'),
  runtime_product_id text not null check (
    runtime_product_id in (
      'dtr_core_light_v1',
      'DTR_CORE_STATIC_V1',
      'dtr_core_full_v1',
      'dtr_core_light_to_full_upgrade_v1'
    )
  ),
  policy_product_id text not null check (
    policy_product_id in ('M55_PREMIUM_REPORT_LIGHT', 'M55_PREMIUM_REPORT_FULL')
  ),
  conversion_kind text not null check (
    conversion_kind in ('FIRST_ELIGIBLE_PAID', 'LIGHT_TO_FULL_UPGRADE', 'REPURCHASE')
  ),
  purchase_scope_id text not null check (char_length(purchase_scope_id) > 0),
  attempt_reuse_scope_digest text not null check (attempt_reuse_scope_digest ~ '^[0-9a-f]{64}$'),
  terminal_state text not null default 'OPEN' check (
    terminal_state in ('OPEN', 'EXPIRED', 'CANCELLED', 'PAID_CANONICAL')
  ),
  cutoff_at_ms bigint not null check (cutoff_at_ms >= 0 and cutoff_at_ms <= 9007199254740991),
  attribution_locked_at_ms bigint not null check (
    attribution_locked_at_ms >= 0 and attribution_locked_at_ms <= 9007199254740991
  ),
  lock_expires_at_ms bigint null check (
    lock_expires_at_ms is null
    or (
      lock_expires_at_ms >= 0
      and lock_expires_at_ms <= 9007199254740991
      and lock_expires_at_ms > attribution_locked_at_ms
    )
  ),
  decision_kind text not null check (decision_kind in ('CREATOR_WINNER', 'NONE')),
  selected_touch_id uuid null,
  selected_touch_event_key_bytes bytea null check (
    selected_touch_event_key_bytes is null
    or octet_length(selected_touch_event_key_bytes) = 16
  ),
  selected_qualified_touch_at_ms bigint null,
  creator_economic_identity_id uuid null,
  creator_referral_link_id uuid null,
  creator_status_at_lock text null check (
    creator_status_at_lock is null
    or creator_status_at_lock in ('APPROVED_PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'REVOKED')
  ),
  eligibility_reason_code text not null,
  tracking_contract_version text not null default 'v1' check (tracking_contract_version = 'v1'),
  attribution_policy_version text not null default 'v1' check (attribution_policy_version = 'v1'),
  created_at timestamptz not null default now(),
  constraint m55_r5_attempt_buyer_fk
    foreign key (buyer_subject_id, owner_clerk_subject_lookup_digest)
    references public.m55_attribution_buyer_subjects (id, clerk_subject_lookup_digest)
    on delete restrict,
  constraint m55_r5_attempt_winner_complete_chk check (
    (
      decision_kind = 'NONE'
      and selected_touch_id is null
      and selected_touch_event_key_bytes is null
      and selected_qualified_touch_at_ms is null
      and creator_economic_identity_id is null
      and creator_referral_link_id is null
    )
    or (
      decision_kind = 'CREATOR_WINNER'
      and selected_touch_id is not null
      and selected_touch_event_key_bytes is not null
      and selected_qualified_touch_at_ms is not null
      and creator_economic_identity_id is not null
      and creator_referral_link_id is not null
      and creator_status_at_lock = 'ACTIVE'
    )
  ),
  constraint m55_r5_attempt_product_map_chk check (
    (
      runtime_product_id in ('dtr_core_light_v1', 'DTR_CORE_STATIC_V1')
      and policy_product_id = 'M55_PREMIUM_REPORT_LIGHT'
      and conversion_kind in ('FIRST_ELIGIBLE_PAID', 'REPURCHASE')
    )
    or (
      runtime_product_id = 'dtr_core_full_v1'
      and policy_product_id = 'M55_PREMIUM_REPORT_FULL'
      and conversion_kind in ('FIRST_ELIGIBLE_PAID', 'REPURCHASE')
    )
    or (
      runtime_product_id = 'dtr_core_light_to_full_upgrade_v1'
      and policy_product_id = 'M55_PREMIUM_REPORT_FULL'
      and conversion_kind = 'LIGHT_TO_FULL_UPGRADE'
    )
  ),
  constraint m55_r5_attempt_winner_touch_fk
    foreign key (
      selected_touch_id,
      buyer_subject_id,
      selected_touch_event_key_bytes,
      creator_referral_link_id,
      creator_economic_identity_id
    )
    references public.m55_creator_qualified_touches (
      id,
      buyer_subject_id,
      touch_event_key_bytes,
      creator_referral_link_id,
      creator_economic_identity_id
    )
);

create unique index m55_r5_attribution_purchase_attempts_open_reuse_uq
  on public.m55_r5_attribution_purchase_attempts (attempt_reuse_scope_digest)
  where terminal_state = 'OPEN';

create index m55_r5_attribution_purchase_attempts_buyer_created_idx
  on public.m55_r5_attribution_purchase_attempts (buyer_subject_id, created_at desc);

create index m55_r5_attribution_purchase_attempts_owner_digest_idx
  on public.m55_r5_attribution_purchase_attempts (owner_clerk_subject_lookup_digest);

create function public.m55_r5_attribution_purchase_attempt_lifecycle_v1()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if tg_op = 'DELETE' then
    raise exception 'ATTEMPT_APPEND_ONLY';
  end if;
  if old.purchase_attempt_id is distinct from new.purchase_attempt_id
     or old.buyer_subject_id is distinct from new.buyer_subject_id
     or old.owner_clerk_subject_lookup_digest is distinct from new.owner_clerk_subject_lookup_digest
     or old.runtime_product_id is distinct from new.runtime_product_id
     or old.policy_product_id is distinct from new.policy_product_id
     or old.conversion_kind is distinct from new.conversion_kind
     or old.purchase_scope_id is distinct from new.purchase_scope_id
     or old.attempt_reuse_scope_digest is distinct from new.attempt_reuse_scope_digest
     or old.cutoff_at_ms is distinct from new.cutoff_at_ms
     or old.attribution_locked_at_ms is distinct from new.attribution_locked_at_ms
     or old.decision_kind is distinct from new.decision_kind
     or old.selected_touch_id is distinct from new.selected_touch_id
     or old.selected_touch_event_key_bytes is distinct from new.selected_touch_event_key_bytes
     or old.selected_qualified_touch_at_ms is distinct from new.selected_qualified_touch_at_ms
     or old.creator_economic_identity_id is distinct from new.creator_economic_identity_id
     or old.creator_referral_link_id is distinct from new.creator_referral_link_id
     or old.creator_status_at_lock is distinct from new.creator_status_at_lock
     or old.eligibility_reason_code is distinct from new.eligibility_reason_code
     or old.tracking_contract_version is distinct from new.tracking_contract_version
     or old.attribution_policy_version is distinct from new.attribution_policy_version
     or old.created_at is distinct from new.created_at then
    raise exception 'ATTEMPT_IMMUTABLE';
  end if;
  if old.lock_expires_at_ms is distinct from new.lock_expires_at_ms then
    if old.lock_expires_at_ms is not null or new.lock_expires_at_ms is null then
      raise exception 'ATTEMPT_IMMUTABLE';
    end if;
  end if;
  if old.terminal_state is distinct from new.terminal_state then
    if old.terminal_state <> 'OPEN'
       or new.terminal_state not in ('EXPIRED', 'CANCELLED', 'PAID_CANONICAL') then
      raise exception 'ATTEMPT_IMMUTABLE';
    end if;
  end if;
  return new;
end
$fn$;

create trigger m55_r5_attribution_purchase_attempt_lifecycle
  before update or delete on public.m55_r5_attribution_purchase_attempts
  for each row execute function public.m55_r5_attribution_purchase_attempt_lifecycle_v1();

create table public.m55_r5_attribution_attempt_provider_bindings (
  binding_id uuid primary key default gen_random_uuid(),
  purchase_attempt_id uuid not null references public.m55_r5_attribution_purchase_attempts(purchase_attempt_id) on delete restrict,
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text null,
  binding_kind text not null check (binding_kind in ('ACCEPTED_PAYABLE_SESSION', 'HISTORICAL')),
  created_at timestamptz not null default now()
);

create unique index m55_r5_attempt_accepted_session_uq
  on public.m55_r5_attribution_attempt_provider_bindings (purchase_attempt_id)
  where binding_kind = 'ACCEPTED_PAYABLE_SESSION';

create unique index m55_r5_attempt_binding_pi_uq
  on public.m55_r5_attribution_attempt_provider_bindings (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create function public.m55_r5_attribution_binding_lifecycle_v1()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if tg_op = 'DELETE' then
    raise exception 'BINDING_APPEND_ONLY';
  end if;
  if old.binding_id is distinct from new.binding_id
     or old.purchase_attempt_id is distinct from new.purchase_attempt_id
     or old.stripe_checkout_session_id is distinct from new.stripe_checkout_session_id
     or old.binding_kind is distinct from new.binding_kind
     or old.created_at is distinct from new.created_at then
    raise exception 'BINDING_IMMUTABLE';
  end if;
  if old.stripe_payment_intent_id is distinct from new.stripe_payment_intent_id then
    if old.stripe_payment_intent_id is not null or new.stripe_payment_intent_id is null then
      raise exception 'BINDING_IMMUTABLE';
    end if;
  end if;
  return new;
end
$fn$;

create trigger m55_r5_attribution_binding_lifecycle
  before update or delete on public.m55_r5_attribution_attempt_provider_bindings
  for each row execute function public.m55_r5_attribution_binding_lifecycle_v1();

create table public.m55_r5_attribution_canonical_payment_evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  purchase_attempt_id uuid not null unique
    references public.m55_r5_attribution_purchase_attempts(purchase_attempt_id) on delete restrict,
  stripe_canonical_event_id text not null unique,
  payment_intent_id text not null unique,
  canonical_event_created_at_ms bigint not null check (
    canonical_event_created_at_ms >= 0
    and canonical_event_created_at_ms <= 9007199254740991
  ),
  creator_status_effective_at_payment text not null check (
    creator_status_effective_at_payment in (
      'ACTIVE',
      'SUSPENDED',
      'REVOKED',
      'EFFECTIVE_DEACTIVATION',
      'NOT_APPLICABLE',
      'UNPROVEN',
      'ACTIVE_TERMS_STALE'
    )
  ),
  preliminary_r5b_eligibility text not null check (
    preliminary_r5b_eligibility in ('CREATOR_CASH', 'NONE', 'HOLD_RECONCILE', 'OBJECTIVE_DENIAL')
  ),
  recorded_at timestamptz not null default now()
);

create table public.m55_r5_attribution_canonical_payment_holds (
  hold_id uuid primary key default gen_random_uuid(),
  stripe_canonical_event_id text not null unique,
  payment_intent_id text not null unique,
  verified_checkout_session_id text null,
  metadata_purchase_attempt_id uuid null,
  resolved_purchase_attempt_id uuid null
    references public.m55_r5_attribution_purchase_attempts(purchase_attempt_id) on delete restrict,
  canonical_event_created_at_ms bigint not null check (
    canonical_event_created_at_ms >= 0
    and canonical_event_created_at_ms <= 9007199254740991
  ),
  reason_code text not null check (
    reason_code in (
      'PI_LOOKUP_ZERO',
      'PI_LOOKUP_MULTIPLE',
      'SESSION_NOT_PAYMENT',
      'SESSION_BINDING_MISMATCH',
      'PI_BINDING_MISMATCH',
      'METADATA_ATTEMPT_MISMATCH',
      'NO_R5_BINDING',
      'MISSING_BINDING',
      'PRE_EPOCH_STATUS',
      'SAME_MS_STATUS_COLLISION',
      'UNPROVEN_STATUS',
      'CONFLICTING_CANONICAL_EVIDENCE',
      'PROVIDER_READ_OK_GRAPH_MISMATCH',
      'HOLD_PAYLOAD_CONFLICT'
    )
  ),
  provider_correlation_state text not null check (
    provider_correlation_state in (
      'PROVIDER_VERIFIED',
      'PROVIDER_ZERO',
      'PROVIDER_MULTIPLE',
      'PROVIDER_NOT_ATTEMPTED',
      'BINDING_MISSING',
      'GRAPH_MISMATCH'
    )
  ),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create function public.m55_r5_canonical_evidence_append_only_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  raise exception 'EVIDENCE_APPEND_ONLY';
end
$fn$;

create trigger m55_r5_canonical_evidence_append_only
  before update or delete on public.m55_r5_attribution_canonical_payment_evidence
  for each row execute function public.m55_r5_canonical_evidence_append_only_trg();

create function public.m55_r5_canonical_hold_append_only_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  raise exception 'HOLD_APPEND_ONLY';
end
$fn$;

create trigger m55_r5_canonical_hold_append_only
  before update or delete on public.m55_r5_attribution_canonical_payment_holds
  for each row execute function public.m55_r5_canonical_hold_append_only_trg();

create function public.m55_r5_hold_evidence_mutual_exclusion_on_evidence_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if exists (
    select 1
    from public.m55_r5_attribution_canonical_payment_holds h
    where h.stripe_canonical_event_id = new.stripe_canonical_event_id
       or h.payment_intent_id = new.payment_intent_id
  ) then
    raise exception 'HOLD_EVIDENCE_MUTUAL_EXCLUSION';
  end if;
  return new;
end
$fn$;

create trigger m55_r5_hold_evidence_mutex_on_evidence
  before insert on public.m55_r5_attribution_canonical_payment_evidence
  for each row execute function public.m55_r5_hold_evidence_mutual_exclusion_on_evidence_trg();

create function public.m55_r5_hold_evidence_mutual_exclusion_on_hold_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if exists (
    select 1
    from public.m55_r5_attribution_canonical_payment_evidence e
    where e.stripe_canonical_event_id = new.stripe_canonical_event_id
       or e.payment_intent_id = new.payment_intent_id
  ) then
    raise exception 'HOLD_EVIDENCE_MUTUAL_EXCLUSION';
  end if;
  return new;
end
$fn$;

create trigger m55_r5_hold_evidence_mutex_on_hold
  before insert on public.m55_r5_attribution_canonical_payment_holds
  for each row execute function public.m55_r5_hold_evidence_mutual_exclusion_on_hold_trg();

alter table public.m55_r5_attribution_purchase_attempts enable row level security;
alter table public.m55_r5_attribution_attempt_provider_bindings enable row level security;
alter table public.m55_r5_attribution_canonical_payment_evidence enable row level security;
alter table public.m55_r5_attribution_canonical_payment_holds enable row level security;

revoke all on public.m55_r5_attribution_purchase_attempts from public, anon, authenticated;
revoke all on public.m55_r5_attribution_attempt_provider_bindings from public, anon, authenticated;
revoke all on public.m55_r5_attribution_canonical_payment_evidence from public, anon, authenticated;
revoke all on public.m55_r5_attribution_canonical_payment_holds from public, anon, authenticated;

grant all on public.m55_r5_attribution_purchase_attempts to service_role;
grant all on public.m55_r5_attribution_attempt_provider_bindings to service_role;
grant all on public.m55_r5_attribution_canonical_payment_evidence to service_role;
grant all on public.m55_r5_attribution_canonical_payment_holds to service_role;

create function public.m55_r5_attribution_lock_purchase_attempt_v1(
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
  join public.m55_creator_profiles p
    on p.economic_identity_id = t.creator_economic_identity_id
  where t.buyer_subject_id = v_buyer_id
    and t.qualified_touch_at_ms <= p_cutoff_at_ms
    and t.qualified_touch_at_ms <= p_attribution_locked_at_ms
    and t.qualified_touch_at_ms >= p_attribution_locked_at_ms - 2592000000
    and p.status = 'ACTIVE'
    and p.terms_version = v_terms
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

create function public.m55_r5_attribution_bind_checkout_session_v1(
  p_purchase_attempt_id uuid,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_lock_expires_at_ms bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_attempt public.m55_r5_attribution_purchase_attempts%rowtype;
  v_binding public.m55_r5_attribution_attempt_provider_bindings%rowtype;
begin
  if p_purchase_attempt_id is null
     or p_stripe_checkout_session_id is null
     or char_length(p_stripe_checkout_session_id) = 0
     or p_lock_expires_at_ms is null
     or p_lock_expires_at_ms < 0
     or p_lock_expires_at_ms > 9007199254740991 then
    raise exception 'INVALID_INPUT';
  end if;
  if p_stripe_payment_intent_id is not null and char_length(p_stripe_payment_intent_id) = 0 then
    p_stripe_payment_intent_id := null;
  end if;

  select * into v_attempt
  from public.m55_r5_attribution_purchase_attempts
  where purchase_attempt_id = p_purchase_attempt_id
  for update;
  if not found then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;
  if v_attempt.terminal_state <> 'OPEN' then
    raise exception 'ATTEMPT_NOT_OPEN';
  end if;
  if p_lock_expires_at_ms <= v_attempt.attribution_locked_at_ms then
    raise exception 'INVALID_EXPIRY';
  end if;

  select * into v_binding
  from public.m55_r5_attribution_attempt_provider_bindings
  where stripe_checkout_session_id = p_stripe_checkout_session_id
  for update;
  if found then
    if v_binding.purchase_attempt_id is distinct from p_purchase_attempt_id then
      raise exception 'SESSION_BOUND_TO_OTHER_ATTEMPT';
    end if;
    if v_binding.binding_kind <> 'ACCEPTED_PAYABLE_SESSION' then
      raise exception 'SESSION_ALREADY_BOUND';
    end if;
    if v_binding.stripe_payment_intent_id is null and p_stripe_payment_intent_id is not null then
      update public.m55_r5_attribution_attempt_provider_bindings
        set stripe_payment_intent_id = p_stripe_payment_intent_id
      where binding_id = v_binding.binding_id;
    elsif v_binding.stripe_payment_intent_id is not null
          and p_stripe_payment_intent_id is not null
          and v_binding.stripe_payment_intent_id is distinct from p_stripe_payment_intent_id then
      raise exception 'SESSION_ALREADY_BOUND';
    end if;
    if v_attempt.lock_expires_at_ms is null then
      update public.m55_r5_attribution_purchase_attempts
        set lock_expires_at_ms = p_lock_expires_at_ms
      where purchase_attempt_id = p_purchase_attempt_id;
    end if;
    return jsonb_build_object('ok', true, 'status', 'succeeded', 'outcome', 'CONVERGED');
  end if;

  if exists (
    select 1
    from public.m55_r5_attribution_attempt_provider_bindings
    where purchase_attempt_id = p_purchase_attempt_id
      and binding_kind = 'ACCEPTED_PAYABLE_SESSION'
  ) then
    raise exception 'SESSION_ALREADY_BOUND';
  end if;

  insert into public.m55_r5_attribution_attempt_provider_bindings (
    purchase_attempt_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    binding_kind
  ) values (
    p_purchase_attempt_id,
    p_stripe_checkout_session_id,
    p_stripe_payment_intent_id,
    'ACCEPTED_PAYABLE_SESSION'
  );

  if v_attempt.lock_expires_at_ms is null then
    update public.m55_r5_attribution_purchase_attempts
      set lock_expires_at_ms = p_lock_expires_at_ms
    where purchase_attempt_id = p_purchase_attempt_id;
  end if;

  return jsonb_build_object('ok', true, 'status', 'succeeded', 'outcome', 'BOUND');
end
$fn$;

create function public.m55_r5_attribution_terminalize_purchase_attempt_v1(
  p_purchase_attempt_id uuid,
  p_terminal_state text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_attempt public.m55_r5_attribution_purchase_attempts%rowtype;
begin
  if p_purchase_attempt_id is null
     or p_terminal_state not in ('EXPIRED', 'CANCELLED') then
    raise exception 'INVALID_INPUT';
  end if;
  select * into v_attempt
  from public.m55_r5_attribution_purchase_attempts
  where purchase_attempt_id = p_purchase_attempt_id
  for update;
  if not found then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;
  if v_attempt.terminal_state = 'PAID_CANONICAL' then
    raise exception 'PAID_CANONICAL';
  end if;
  if v_attempt.terminal_state = p_terminal_state then
    return jsonb_build_object('ok', true, 'status', 'succeeded', 'outcome', 'CONVERGED');
  end if;
  if v_attempt.terminal_state <> 'OPEN' then
    raise exception 'TERMINAL_STATE_MISMATCH';
  end if;
  update public.m55_r5_attribution_purchase_attempts
    set terminal_state = p_terminal_state
  where purchase_attempt_id = p_purchase_attempt_id;
  return jsonb_build_object('ok', true, 'status', 'succeeded', 'outcome', 'TERMINALIZED');
end
$fn$;

create function public.m55_r5_attribution_record_canonical_payment_hold_v1(
  p_stripe_canonical_event_id text,
  p_payment_intent_id text,
  p_canonical_event_created_at_ms bigint,
  p_verified_checkout_session_id text,
  p_metadata_purchase_attempt_id uuid,
  p_resolved_purchase_attempt_id uuid,
  p_reason_code text,
  p_provider_correlation_state text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_hold public.m55_r5_attribution_canonical_payment_holds%rowtype;
  v_pi_hold public.m55_r5_attribution_canonical_payment_holds%rowtype;
begin
  if p_stripe_canonical_event_id is null
     or char_length(p_stripe_canonical_event_id) = 0
     or p_payment_intent_id is null
     or char_length(p_payment_intent_id) = 0
     or p_canonical_event_created_at_ms is null
     or p_canonical_event_created_at_ms < 0
     or p_canonical_event_created_at_ms > 9007199254740991
     or p_reason_code is null
     or p_provider_correlation_state is null then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_hold
  from public.m55_r5_attribution_canonical_payment_holds
  where stripe_canonical_event_id = p_stripe_canonical_event_id
  for update;
  if found then
    if v_hold.payment_intent_id is not distinct from p_payment_intent_id
       and v_hold.canonical_event_created_at_ms is not distinct from p_canonical_event_created_at_ms
       and v_hold.verified_checkout_session_id is not distinct from p_verified_checkout_session_id
       and v_hold.metadata_purchase_attempt_id is not distinct from p_metadata_purchase_attempt_id
       and v_hold.resolved_purchase_attempt_id is not distinct from p_resolved_purchase_attempt_id
       and v_hold.reason_code is not distinct from p_reason_code
       and v_hold.provider_correlation_state is not distinct from p_provider_correlation_state then
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'CONVERGED',
        'hold_id', v_hold.hold_id,
        'reason_code', v_hold.reason_code
      );
    end if;
    raise exception 'HOLD_PAYLOAD_CONFLICT';
  end if;

  select * into v_pi_hold
  from public.m55_r5_attribution_canonical_payment_holds
  where payment_intent_id = p_payment_intent_id
  for update;
  if found and v_pi_hold.stripe_canonical_event_id is distinct from p_stripe_canonical_event_id then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'CONFLICTING_EVIDENCE',
      'hold_id', v_pi_hold.hold_id,
      'reason_code', v_pi_hold.reason_code
    );
  end if;

  if exists (
    select 1
    from public.m55_r5_attribution_canonical_payment_evidence e
    where e.stripe_canonical_event_id = p_stripe_canonical_event_id
       or e.payment_intent_id = p_payment_intent_id
  ) then
    raise exception 'CONFLICTING_EVIDENCE';
  end if;

  insert into public.m55_r5_attribution_canonical_payment_holds (
    stripe_canonical_event_id,
    payment_intent_id,
    verified_checkout_session_id,
    metadata_purchase_attempt_id,
    resolved_purchase_attempt_id,
    canonical_event_created_at_ms,
    reason_code,
    provider_correlation_state
  ) values (
    p_stripe_canonical_event_id,
    p_payment_intent_id,
    p_verified_checkout_session_id,
    p_metadata_purchase_attempt_id,
    p_resolved_purchase_attempt_id,
    p_canonical_event_created_at_ms,
    p_reason_code,
    p_provider_correlation_state
  )
  returning * into v_hold;

  return jsonb_build_object(
    'ok', true,
    'status', 'succeeded',
    'outcome', 'HOLD_RECONCILE',
    'hold_id', v_hold.hold_id,
    'reason_code', v_hold.reason_code
  );
end
$fn$;

create function public.m55_r5_attribution_record_canonical_payment_v1(
  p_stripe_canonical_event_id text,
  p_payment_intent_id text,
  p_canonical_event_created_at_ms bigint,
  p_verified_checkout_session_id text,
  p_metadata_purchase_attempt_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_hold public.m55_r5_attribution_canonical_payment_holds%rowtype;
  v_evidence public.m55_r5_attribution_canonical_payment_evidence%rowtype;
  v_binding public.m55_r5_attribution_attempt_provider_bindings%rowtype;
  v_pi_binding public.m55_r5_attribution_attempt_provider_bindings%rowtype;
  v_attempt public.m55_r5_attribution_purchase_attempts%rowtype;
  v_hold_json jsonb;
  v_reason text;
  v_corr text;
  v_epoch bigint;
  v_required_terms text;
  v_event public.m55_creator_profile_eligibility_events%rowtype;
  v_status text;
  v_elig text;
  v_same_ms boolean;
begin
  if p_stripe_canonical_event_id is null
     or char_length(p_stripe_canonical_event_id) = 0
     or p_payment_intent_id is null
     or char_length(p_payment_intent_id) = 0
     or p_canonical_event_created_at_ms is null
     or p_canonical_event_created_at_ms < 0
     or p_canonical_event_created_at_ms > 9007199254740991
     or p_verified_checkout_session_id is null
     or char_length(p_verified_checkout_session_id) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  select * into v_hold
  from public.m55_r5_attribution_canonical_payment_holds
  where stripe_canonical_event_id = p_stripe_canonical_event_id
     or payment_intent_id = p_payment_intent_id
  limit 1
  for update;
  if found then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'HOLD_RECONCILE',
      'hold_id', v_hold.hold_id,
      'reason_code', v_hold.reason_code
    );
  end if;

  select * into v_evidence
  from public.m55_r5_attribution_canonical_payment_evidence
  where stripe_canonical_event_id = p_stripe_canonical_event_id
     or payment_intent_id = p_payment_intent_id
  limit 1
  for update;
  if found then
    if v_evidence.stripe_canonical_event_id = p_stripe_canonical_event_id
       and v_evidence.payment_intent_id = p_payment_intent_id
       and v_evidence.canonical_event_created_at_ms = p_canonical_event_created_at_ms then
      return jsonb_build_object('ok', true, 'status', 'succeeded', 'outcome', 'CONVERGED');
    end if;
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'CONFLICTING_EVIDENCE',
      'reason_code', 'CONFLICTING_CANONICAL_EVIDENCE'
    );
  end if;

  select * into v_binding
  from public.m55_r5_attribution_attempt_provider_bindings
  where stripe_checkout_session_id = p_verified_checkout_session_id
    and binding_kind = 'ACCEPTED_PAYABLE_SESSION'
  for update;

  select * into v_pi_binding
  from public.m55_r5_attribution_attempt_provider_bindings
  where stripe_payment_intent_id = p_payment_intent_id
  for update;

  if not found and v_binding.binding_id is null and p_metadata_purchase_attempt_id is not null then
    select b.* into v_binding
    from public.m55_r5_attribution_attempt_provider_bindings b
    where b.purchase_attempt_id = p_metadata_purchase_attempt_id
      and b.binding_kind = 'ACCEPTED_PAYABLE_SESSION'
    for update;
    if found
       and v_binding.stripe_checkout_session_id = p_verified_checkout_session_id
       and (v_binding.stripe_payment_intent_id is null
            or v_binding.stripe_payment_intent_id = p_payment_intent_id) then
      if v_binding.stripe_payment_intent_id is null then
        update public.m55_r5_attribution_attempt_provider_bindings
          set stripe_payment_intent_id = p_payment_intent_id
        where binding_id = v_binding.binding_id;
        v_binding.stripe_payment_intent_id := p_payment_intent_id;
      end if;
    else
      v_binding.binding_id := null;
    end if;
  end if;

  if v_binding.binding_id is null then
    v_reason := 'NO_R5_BINDING';
    v_corr := 'BINDING_MISSING';
  elsif v_binding.stripe_checkout_session_id is distinct from p_verified_checkout_session_id then
    v_reason := 'SESSION_BINDING_MISMATCH';
    v_corr := 'GRAPH_MISMATCH';
  elsif v_pi_binding.binding_id is not null
        and v_pi_binding.purchase_attempt_id is distinct from v_binding.purchase_attempt_id then
    v_reason := 'PI_BINDING_MISMATCH';
    v_corr := 'GRAPH_MISMATCH';
  elsif v_binding.stripe_payment_intent_id is not null
        and v_binding.stripe_payment_intent_id is distinct from p_payment_intent_id then
    v_reason := 'PI_BINDING_MISMATCH';
    v_corr := 'GRAPH_MISMATCH';
  elsif p_metadata_purchase_attempt_id is not null
        and p_metadata_purchase_attempt_id is distinct from v_binding.purchase_attempt_id then
    v_reason := 'METADATA_ATTEMPT_MISMATCH';
    v_corr := 'GRAPH_MISMATCH';
  end if;

  if v_reason is not null then
    v_hold_json := public.m55_r5_attribution_record_canonical_payment_hold_v1(
      p_stripe_canonical_event_id,
      p_payment_intent_id,
      p_canonical_event_created_at_ms,
      p_verified_checkout_session_id,
      p_metadata_purchase_attempt_id,
      v_binding.purchase_attempt_id,
      v_reason,
      v_corr
    );
    return v_hold_json || jsonb_build_object(
      'outcome', case
        when v_reason = 'NO_R5_BINDING' then 'NO_R5_BINDING'
        else coalesce(v_hold_json ->> 'outcome', 'HOLD_RECONCILE')
      end
    );
  end if;

  if v_binding.stripe_payment_intent_id is null then
    update public.m55_r5_attribution_attempt_provider_bindings
      set stripe_payment_intent_id = p_payment_intent_id
    where binding_id = v_binding.binding_id;
  end if;

  select * into v_attempt
  from public.m55_r5_attribution_purchase_attempts
  where purchase_attempt_id = v_binding.purchase_attempt_id
  for update;

  if v_attempt.lock_expires_at_ms is not null
     and p_canonical_event_created_at_ms >= v_attempt.lock_expires_at_ms then
    v_hold_json := public.m55_r5_attribution_record_canonical_payment_hold_v1(
      p_stripe_canonical_event_id,
      p_payment_intent_id,
      p_canonical_event_created_at_ms,
      p_verified_checkout_session_id,
      p_metadata_purchase_attempt_id,
      v_attempt.purchase_attempt_id,
      'PROVIDER_READ_OK_GRAPH_MISMATCH',
      'GRAPH_MISMATCH'
    );
    return v_hold_json;
  end if;

  select creator_status_history_authority_epoch_ms, required_creator_terms_version
    into v_epoch, v_required_terms
  from public.m55_r5_attribution_control_constants
  where singleton = true;

  if v_attempt.decision_kind = 'NONE' then
    v_status := 'NOT_APPLICABLE';
    v_elig := 'NONE';
  else
    if p_canonical_event_created_at_ms < v_epoch then
      v_hold_json := public.m55_r5_attribution_record_canonical_payment_hold_v1(
        p_stripe_canonical_event_id,
        p_payment_intent_id,
        p_canonical_event_created_at_ms,
        p_verified_checkout_session_id,
        p_metadata_purchase_attempt_id,
        v_attempt.purchase_attempt_id,
        'PRE_EPOCH_STATUS',
        'PROVIDER_VERIFIED'
      );
      return v_hold_json;
    end if;

    select exists (
      select 1
      from public.m55_creator_profile_eligibility_events e
      where e.creator_economic_identity_id = v_attempt.creator_economic_identity_id
        and e.effective_at_ms = p_canonical_event_created_at_ms
    ) into v_same_ms;
    if v_same_ms then
      v_hold_json := public.m55_r5_attribution_record_canonical_payment_hold_v1(
        p_stripe_canonical_event_id,
        p_payment_intent_id,
        p_canonical_event_created_at_ms,
        p_verified_checkout_session_id,
        p_metadata_purchase_attempt_id,
        v_attempt.purchase_attempt_id,
        'SAME_MS_STATUS_COLLISION',
        'PROVIDER_VERIFIED'
      );
      return v_hold_json;
    end if;

    select * into v_event
    from public.m55_creator_profile_eligibility_events e
    where e.creator_economic_identity_id = v_attempt.creator_economic_identity_id
      and e.effective_at_ms < p_canonical_event_created_at_ms
    order by e.effective_at_ms desc, e.eligibility_event_seq desc
    limit 1;

    if not found then
      select * into v_event
      from public.m55_creator_profile_eligibility_events e
      where e.creator_economic_identity_id = v_attempt.creator_economic_identity_id
        and e.reason_code = 'INITIAL_ROW_SNAPSHOT'
        and e.effective_at_ms = v_epoch
        and p_canonical_event_created_at_ms >= v_epoch
      limit 1;
    end if;

    if not found then
      v_hold_json := public.m55_r5_attribution_record_canonical_payment_hold_v1(
        p_stripe_canonical_event_id,
        p_payment_intent_id,
        p_canonical_event_created_at_ms,
        p_verified_checkout_session_id,
        p_metadata_purchase_attempt_id,
        v_attempt.purchase_attempt_id,
        'UNPROVEN_STATUS',
        'PROVIDER_VERIFIED'
      );
      return v_hold_json;
    end if;

    if v_event.new_earning_off or v_event.reason_code = 'EFFECTIVE_DEACTIVATION' then
      v_status := 'EFFECTIVE_DEACTIVATION';
      v_elig := 'OBJECTIVE_DENIAL';
    elsif v_event.profile_status = 'SUSPENDED' then
      v_status := 'SUSPENDED';
      v_elig := 'HOLD_RECONCILE';
    elsif v_event.profile_status = 'REVOKED' then
      v_status := 'REVOKED';
      v_elig := 'OBJECTIVE_DENIAL';
    elsif v_event.profile_status = 'APPROVED_PENDING_ACTIVATION' then
      v_status := 'UNPROVEN';
      v_elig := 'OBJECTIVE_DENIAL';
    elsif v_event.profile_status = 'ACTIVE'
          and v_event.terms_version = v_required_terms
          and v_event.terms_accepted_at_ms <= p_canonical_event_created_at_ms then
      v_status := 'ACTIVE';
      v_elig := 'CREATOR_CASH';
    elsif v_event.profile_status = 'ACTIVE' then
      v_status := 'ACTIVE_TERMS_STALE';
      v_elig := 'OBJECTIVE_DENIAL';
    else
      v_hold_json := public.m55_r5_attribution_record_canonical_payment_hold_v1(
        p_stripe_canonical_event_id,
        p_payment_intent_id,
        p_canonical_event_created_at_ms,
        p_verified_checkout_session_id,
        p_metadata_purchase_attempt_id,
        v_attempt.purchase_attempt_id,
        'UNPROVEN_STATUS',
        'PROVIDER_VERIFIED'
      );
      return v_hold_json;
    end if;

  end if;

  insert into public.m55_r5_attribution_canonical_payment_evidence (
    purchase_attempt_id,
    stripe_canonical_event_id,
    payment_intent_id,
    canonical_event_created_at_ms,
    creator_status_effective_at_payment,
    preliminary_r5b_eligibility
  ) values (
    v_attempt.purchase_attempt_id,
    p_stripe_canonical_event_id,
    p_payment_intent_id,
    p_canonical_event_created_at_ms,
    v_status,
    v_elig
  );

  if v_attempt.terminal_state = 'OPEN' then
    update public.m55_r5_attribution_purchase_attempts
      set terminal_state = 'PAID_CANONICAL'
    where purchase_attempt_id = v_attempt.purchase_attempt_id;
  end if;

  return jsonb_build_object('ok', true, 'status', 'succeeded', 'outcome', 'RECORDED');
end
$fn$;

revoke all on function public.m55_r5_attribution_lock_purchase_attempt_v1(text, text, text, text, text, bigint, bigint, bytea, text, text) from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_bind_checkout_session_v1(uuid, text, text, bigint) from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_terminalize_purchase_attempt_v1(uuid, text) from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_record_canonical_payment_v1(text, text, bigint, text, uuid) from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_record_canonical_payment_hold_v1(text, text, bigint, text, uuid, uuid, text, text) from public, anon, authenticated;

grant execute on function public.m55_r5_attribution_lock_purchase_attempt_v1(text, text, text, text, text, bigint, bigint, bytea, text, text) to service_role;
grant execute on function public.m55_r5_attribution_bind_checkout_session_v1(uuid, text, text, bigint) to service_role;
grant execute on function public.m55_r5_attribution_terminalize_purchase_attempt_v1(uuid, text) to service_role;
grant execute on function public.m55_r5_attribution_record_canonical_payment_v1(text, text, bigint, text, uuid) to service_role;
grant execute on function public.m55_r5_attribution_record_canonical_payment_hold_v1(text, text, bigint, text, uuid, uuid, text, text) to service_role;
