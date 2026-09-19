-- M55 R5 attribution touch schema v1. Local migration only; no payment/lock/appeal.

create table public.m55_creator_referral_links (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.m55_creator_profiles(id),
  creator_economic_identity_id uuid not null references public.m55_creator_profiles(economic_identity_id),
  token_version text not null check (token_version = 'v1'),
  token_digest text not null check (token_digest ~ '^[0-9a-f]{64}$'),
  ingest_state text not null check (ingest_state in ('ACTIVE', 'RETIRED_OR_REVOKED')),
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  check (
    (ingest_state = 'ACTIVE' and retired_at is null)
    or (
      ingest_state = 'RETIRED_OR_REVOKED'
      and retired_at is not null
      and retired_at >= created_at
    )
  )
);

create unique index m55_r5_attribution_referral_links_token_digest_uq
  on public.m55_creator_referral_links (token_digest);

create unique index m55_r5_attribution_referral_links_id_economic_identity_uq
  on public.m55_creator_referral_links (id, creator_economic_identity_id);

create function public.m55_r5_attribution_referral_link_insert_validate_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1
    from public.m55_creator_profiles as p
    where p.id = new.creator_profile_id
      and p.economic_identity_id = new.creator_economic_identity_id
  ) then
    raise exception 'REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH';
  end if;
  return new;
end $$;

create trigger m55_r5_attribution_referral_link_insert_validate_trg
  before insert on public.m55_creator_referral_links
  for each row execute function public.m55_r5_attribution_referral_link_insert_validate_v1();

create function public.m55_r5_attribution_referral_link_lifecycle_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.creator_profile_id is distinct from old.creator_profile_id
     or new.creator_economic_identity_id is distinct from old.creator_economic_identity_id
     or new.token_digest is distinct from old.token_digest
     or new.token_version is distinct from old.token_version
     or new.created_at is distinct from old.created_at then
    raise exception 'REFERRAL_LINK_IDENTITY_IMMUTABLE';
  end if;

  if old.ingest_state = 'RETIRED_OR_REVOKED' and new.ingest_state = 'ACTIVE' then
    raise exception 'REFERRAL_LINK_REACTIVATION_FORBIDDEN';
  end if;

  if old.retired_at is not null and new.retired_at is distinct from old.retired_at then
    raise exception 'REFERRAL_LINK_RETIRED_AT_IMMUTABLE';
  end if;

  if new.retired_at is not null and new.retired_at < old.created_at then
    raise exception 'REFERRAL_LINK_RETIRED_AT_BEFORE_CREATED_AT';
  end if;

  if old.ingest_state = 'ACTIVE' and new.ingest_state = 'RETIRED_OR_REVOKED' then
    if new.retired_at is null then
      raise exception 'REFERRAL_LINK_RETIREMENT_REQUIRES_RETIRED_AT';
    end if;
    return new;
  end if;

  if old.ingest_state = 'RETIRED_OR_REVOKED' and new.ingest_state = 'RETIRED_OR_REVOKED' then
    return new;
  end if;

  if old.ingest_state = 'ACTIVE' and new.ingest_state = 'ACTIVE' then
    if new.retired_at is distinct from old.retired_at then
      raise exception 'REFERRAL_LINK_ACTIVE_RETIRED_AT_MUST_STAY_NULL';
    end if;
    return new;
  end if;

  raise exception 'REFERRAL_LINK_LIFECYCLE_INVALID';
end $$;

create trigger m55_r5_attribution_referral_link_lifecycle_trg
  before update on public.m55_creator_referral_links
  for each row execute function public.m55_r5_attribution_referral_link_lifecycle_v1();

create table public.m55_attribution_buyer_subjects (
  id uuid primary key default gen_random_uuid(),
  clerk_subject_lookup_digest text not null check (clerk_subject_lookup_digest ~ '^[0-9a-f]{64}$'),
  identity_state text not null check (identity_state in ('ACTIVE', 'DELETED')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (
    (identity_state = 'ACTIVE' and deleted_at is null)
    or (
      identity_state = 'DELETED'
      and deleted_at is not null
      and deleted_at >= created_at
    )
  )
);

create unique index m55_r5_attribution_buyer_subjects_clerk_subject_lookup_digest_uq
  on public.m55_attribution_buyer_subjects (clerk_subject_lookup_digest);

create function public.m55_r5_attribution_buyer_subject_insert_validate_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.identity_state is distinct from 'ACTIVE' then
    raise exception 'BUYER_SUBJECT_INSERT_MUST_BE_ACTIVE';
  end if;

  if new.deleted_at is not null then
    raise exception 'BUYER_SUBJECT_INSERT_DELETED_AT_MUST_BE_NULL';
  end if;

  if new.clerk_subject_lookup_digest is null
     or new.clerk_subject_lookup_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'BUYER_SUBJECT_DIGEST_FORMAT_INVALID';
  end if;

  return new;
end $$;

create trigger m55_r5_attribution_buyer_subject_insert_validate_trg
  before insert on public.m55_attribution_buyer_subjects
  for each row execute function public.m55_r5_attribution_buyer_subject_insert_validate_v1();

create function public.m55_r5_attribution_buyer_subject_lifecycle_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
     or new.clerk_subject_lookup_digest is distinct from old.clerk_subject_lookup_digest
     or new.created_at is distinct from old.created_at then
    raise exception 'BUYER_SUBJECT_IDENTITY_IMMUTABLE';
  end if;

  if old.identity_state = 'DELETED' and new.identity_state = 'ACTIVE' then
    raise exception 'BUYER_SUBJECT_REACTIVATION_FORBIDDEN';
  end if;

  if old.identity_state = 'DELETED' and new.deleted_at is distinct from old.deleted_at then
    raise exception 'BUYER_SUBJECT_DELETED_AT_IMMUTABLE';
  end if;

  if old.identity_state = 'DELETED' then
    raise exception 'BUYER_SUBJECT_DELETED_REWRITE_FORBIDDEN';
  end if;

  if old.identity_state = 'ACTIVE' and new.identity_state = 'ACTIVE' then
    raise exception 'BUYER_SUBJECT_ACTIVE_MUTATION_FORBIDDEN';
  end if;

  if old.identity_state = 'ACTIVE' and new.identity_state = 'DELETED' then
    new.deleted_at := clock_timestamp();
    return new;
  end if;

  raise exception 'BUYER_SUBJECT_LIFECYCLE_INVALID';
end $$;

create trigger m55_r5_attribution_buyer_subject_lifecycle_trg
  before update on public.m55_attribution_buyer_subjects
  for each row execute function public.m55_r5_attribution_buyer_subject_lifecycle_v1();

create function public.m55_r5_attribution_buyer_subject_delete_guard_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'BUYER_SUBJECT_DELETE_FORBIDDEN';
end $$;

create trigger m55_r5_attribution_buyer_subject_delete_guard_trg
  before delete on public.m55_attribution_buyer_subjects
  for each row execute function public.m55_r5_attribution_buyer_subject_delete_guard_v1();

create table public.m55_creator_qualified_touches (
  id uuid primary key default gen_random_uuid(),
  buyer_subject_id uuid not null references public.m55_attribution_buyer_subjects(id) on delete restrict,
  creator_referral_link_id uuid not null references public.m55_creator_referral_links(id) on delete restrict,
  creator_economic_identity_id uuid not null,
  tracking_lane text not null check (tracking_lane = 'CREATOR'),
  qualified_touch_at_ms bigint not null check (
    qualified_touch_at_ms >= 0
    and qualified_touch_at_ms <= 9007199254740991
  ),
  touch_event_key_bytes bytea not null check (octet_length(touch_event_key_bytes) = 16),
  payload_fingerprint text not null check (payload_fingerprint ~ '^[0-9a-f]{64}$'),
  qualified_action_kind text not null check (
    qualified_action_kind in (
      'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
      'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION'
    )
  ),
  tracking_contract_version text not null check (tracking_contract_version = 'v1'),
  attribution_policy_version text not null check (attribution_policy_version = 'v1'),
  recorded_at timestamptz not null default now(),
  constraint m55_r5_attribution_touch_link_creator_fk
    foreign key (creator_referral_link_id, creator_economic_identity_id)
    references public.m55_creator_referral_links (id, creator_economic_identity_id)
);

create unique index m55_r5_attribution_qualified_touches_touch_event_key_uq
  on public.m55_creator_qualified_touches (touch_event_key_bytes);

create function public.m55_r5_attribution_qualified_touch_admit_v1() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_ingest_state text;
  v_link_created_at timestamptz;
begin
  select l.ingest_state, l.created_at
  into v_ingest_state, v_link_created_at
  from public.m55_creator_referral_links as l
  where l.id = new.creator_referral_link_id
  for update of l;

  if not found then
    raise exception 'REFERRAL_LINK_NOT_FOUND';
  end if;

  if v_ingest_state <> 'ACTIVE' then
    raise exception 'LINK_NOT_ACTIVE_FOR_NEW_TOUCH';
  end if;

  return new;
end $$;

create trigger m55_r5_attribution_qualified_touch_admit_trg
  before insert on public.m55_creator_qualified_touches
  for each row execute function public.m55_r5_attribution_qualified_touch_admit_v1();

create function public.m55_r5_attribution_qualified_touch_immutable_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'QUALIFIED_TOUCH_APPEND_ONLY';
end $$;

create trigger m55_r5_attribution_qualified_touch_immutable_trg
  before update or delete on public.m55_creator_qualified_touches
  for each row execute function public.m55_r5_attribution_qualified_touch_immutable_v1();

create function public.m55_r5_attribution_referral_link_delete_guard_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1
    from public.m55_creator_qualified_touches as t
    where t.creator_referral_link_id = old.id
  ) then
    raise exception 'REFERRAL_LINK_HAS_TOUCH_HISTORY';
  end if;
  return old;
end $$;

create trigger m55_r5_attribution_referral_link_delete_guard_trg
  before delete on public.m55_creator_referral_links
  for each row execute function public.m55_r5_attribution_referral_link_delete_guard_v1();

create index m55_r5_attribution_qualified_touches_buyer_tie_v1
  on public.m55_creator_qualified_touches (
    buyer_subject_id,
    qualified_touch_at_ms desc,
    touch_event_key_bytes asc
  )
  where tracking_lane = 'CREATOR';

alter table public.m55_creator_referral_links enable row level security;
alter table public.m55_attribution_buyer_subjects enable row level security;
alter table public.m55_creator_qualified_touches enable row level security;

revoke all on public.m55_creator_referral_links from public, anon, authenticated;
revoke all on public.m55_attribution_buyer_subjects from public, anon, authenticated;
revoke all on public.m55_creator_qualified_touches from public, anon, authenticated;

grant all on public.m55_creator_referral_links to service_role;
grant all on public.m55_attribution_buyer_subjects to service_role;
grant all on public.m55_creator_qualified_touches to service_role;

revoke all on function public.m55_r5_attribution_referral_link_insert_validate_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_referral_link_lifecycle_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_buyer_subject_insert_validate_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_buyer_subject_lifecycle_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_buyer_subject_delete_guard_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_qualified_touch_admit_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_qualified_touch_immutable_v1() from public, anon, authenticated;
revoke all on function public.m55_r5_attribution_referral_link_delete_guard_v1() from public, anon, authenticated;

grant execute on function public.m55_r5_attribution_referral_link_insert_validate_v1() to service_role;
grant execute on function public.m55_r5_attribution_referral_link_lifecycle_v1() to service_role;
grant execute on function public.m55_r5_attribution_buyer_subject_insert_validate_v1() to service_role;
grant execute on function public.m55_r5_attribution_buyer_subject_lifecycle_v1() to service_role;
grant execute on function public.m55_r5_attribution_buyer_subject_delete_guard_v1() to service_role;
grant execute on function public.m55_r5_attribution_qualified_touch_admit_v1() to service_role;
grant execute on function public.m55_r5_attribution_qualified_touch_immutable_v1() to service_role;
grant execute on function public.m55_r5_attribution_referral_link_delete_guard_v1() to service_role;
