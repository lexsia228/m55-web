-- R4 creator distribution foundation. Local migration only; no cash, attribution or payout.
create table public.m55_creator_invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'ISSUED' check (status in ('ISSUED','ACCEPTED','EXPIRED','REVOKED')),
  source_channel text not null default 'M55_SCOUT' check (source_channel = 'M55_SCOUT'),
  source_campaign text,
  issued_by_reviewer_clerk_user_id text not null,
  revoked_by_reviewer_clerk_user_id text,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (status <> 'ACCEPTED' or accepted_at is not null),
  check (status <> 'REVOKED' or revoked_at is not null)
);

create table public.m55_creator_applications (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null check (length(clerk_user_id) between 3 and 128),
  application_source text not null check (application_source in ('PUBLIC_APPLICATION','M55_SCOUT')),
  source_campaign text,
  invite_id uuid unique references public.m55_creator_invites(id),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','UNDER_REVIEW','NEED_MORE_INFO','TERMS_REACCEPT_REQUIRED','APPROVED_PENDING_ACTIVATION','REJECTED','BLOCKED')),
  age_18_plus_attested boolean not null,
  japan_resident_attested boolean not null,
  content_focus_safe text not null check (length(content_focus_safe) between 1 and 1000),
  promotion_experience_safe text check (length(promotion_experience_safe) <= 1000),
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  rejected_reapply_after timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  final_reviewed_at timestamptz,
  check ((application_source = 'M55_SCOUT') = (invite_id is not null))
);
create unique index m55_creator_one_open_application
  on public.m55_creator_applications (clerk_user_id)
  where status in ('SUBMITTED','UNDER_REVIEW','NEED_MORE_INFO','TERMS_REACCEPT_REQUIRED','APPROVED_PENDING_ACTIVATION');
create index m55_creator_applications_queue on public.m55_creator_applications (status, submitted_at);
create index m55_creator_applications_user on public.m55_creator_applications (clerk_user_id, submitted_at desc);

create table public.m55_creator_application_media (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.m55_creator_applications(id),
  platform text not null check (length(platform) between 1 and 80),
  canonical_url text not null check (length(canonical_url) between 12 and 500),
  handle text check (length(handle) <= 120),
  is_primary boolean not null default false,
  self_reported_audience_size bigint check (self_reported_audience_size >= 0),
  self_reported_recent_avg_views bigint check (self_reported_recent_avg_views >= 0),
  control_verification_method text check (control_verification_method in ('DM_CHALLENGE','BIO_CHALLENGE','EXISTING_SCOUT_THREAD','MANUAL_OTHER')),
  control_verification_status text not null default 'PENDING' check (control_verification_status in ('PENDING','VERIFIED','FAILED')),
  challenge_hash text check (challenge_hash is null or challenge_hash ~ '^[0-9a-f]{64}$'),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((control_verification_status = 'VERIFIED') = (verified_at is not null))
);
create unique index m55_creator_one_primary_media on public.m55_creator_application_media (application_id) where is_primary;
create index m55_creator_media_application on public.m55_creator_application_media (application_id);

create table public.m55_creator_review_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.m55_creator_applications(id),
  reviewer_clerk_user_id text not null,
  from_status text,
  to_status text,
  reason_code text,
  internal_notes_safe text check (length(internal_notes_safe) <= 2000),
  evidence_snapshot jsonb,
  created_at timestamptz not null default now()
);
create index m55_creator_review_events_application on public.m55_creator_review_events (application_id, created_at);

create function public.m55_creator_reject_review_event_mutation_v1() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'CREATOR_REVIEW_EVENTS_APPEND_ONLY';
end $$;
create trigger m55_creator_review_events_immutable
  before update or delete on public.m55_creator_review_events
  for each row execute function public.m55_creator_reject_review_event_mutation_v1();

create table public.m55_creator_profiles (
  id uuid primary key default gen_random_uuid(),
  economic_identity_id uuid not null unique default gen_random_uuid(),
  clerk_user_id text not null unique,
  originating_application_id uuid not null unique references public.m55_creator_applications(id),
  creator_code text not null unique,
  first_final_approved_at timestamptz not null,
  status text not null default 'APPROVED_PENDING_ACTIVATION' check (status in ('APPROVED_PENDING_ACTIVATION','ACTIVE','SUSPENDED','REVOKED')),
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.m55_creator_invites enable row level security;
alter table public.m55_creator_applications enable row level security;
alter table public.m55_creator_application_media enable row level security;
alter table public.m55_creator_review_events enable row level security;
alter table public.m55_creator_profiles enable row level security;
revoke all on public.m55_creator_invites from public, anon, authenticated;
revoke all on public.m55_creator_applications from public, anon, authenticated;
revoke all on public.m55_creator_application_media from public, anon, authenticated;
revoke all on public.m55_creator_review_events from public, anon, authenticated;
revoke all on public.m55_creator_profiles from public, anon, authenticated;
grant all on public.m55_creator_invites to service_role;
grant all on public.m55_creator_applications to service_role;
grant all on public.m55_creator_application_media to service_role;
grant all on public.m55_creator_review_events to service_role;
grant all on public.m55_creator_profiles to service_role;

-- Service-role-only atomic submission consumes a scout token exactly once.
create function public.m55_creator_submit_application_v1(
  p_clerk_user_id text, p_source text, p_invite_hash text, p_terms_version text,
  p_age_18_plus boolean, p_japan_resident boolean, p_content_focus text,
  p_promotion_experience text, p_platform text, p_media_url text,
  p_handle text, p_audience_size bigint, p_recent_avg_views bigint
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_invite public.m55_creator_invites%rowtype;
  v_application_id uuid;
  v_previous public.m55_creator_applications%rowtype;
begin
  if p_clerk_user_id is null or p_terms_version <> '2026-09-13-v1'
     or p_age_18_plus is distinct from true or p_japan_resident is distinct from true
     or p_source not in ('PUBLIC_APPLICATION','M55_SCOUT') then
    raise exception 'APPLICATION_INELIGIBLE';
  end if;
  if exists (select 1 from public.m55_creator_profiles where clerk_user_id = p_clerk_user_id) then
    raise exception 'PROFILE_ALREADY_EXISTS';
  end if;
  select * into v_previous from public.m55_creator_applications
    where clerk_user_id = p_clerk_user_id order by submitted_at desc limit 1 for update;
  if found then
    if v_previous.status = 'BLOCKED' then raise exception 'REAPPLY_BLOCKED'; end if;
    if v_previous.status <> 'REJECTED' then raise exception 'APPLICATION_ALREADY_EXISTS'; end if;
    if v_previous.rejected_reapply_after is null or v_previous.rejected_reapply_after > now() then
      raise exception 'REAPPLY_COOLDOWN';
    end if;
  end if;
  if p_source = 'M55_SCOUT' then
    select * into v_invite from public.m55_creator_invites
      where token_hash = p_invite_hash for update;
    if not found or v_invite.status <> 'ISSUED' or v_invite.expires_at <= now() then
      raise exception 'INVITE_INVALID';
    end if;
    update public.m55_creator_invites set status = 'ACCEPTED', accepted_at = now() where id = v_invite.id;
  elsif p_invite_hash is not null then
    raise exception 'INVITE_INVALID';
  end if;
  insert into public.m55_creator_applications
    (clerk_user_id, application_source, source_campaign, invite_id, age_18_plus_attested,
     japan_resident_attested, content_focus_safe, promotion_experience_safe, terms_version, terms_accepted_at)
  values
    (p_clerk_user_id, p_source, v_invite.source_campaign, v_invite.id, p_age_18_plus,
     p_japan_resident, p_content_focus, p_promotion_experience, p_terms_version, now())
  returning id into v_application_id;
  insert into public.m55_creator_application_media
    (application_id, platform, canonical_url, handle, is_primary, self_reported_audience_size, self_reported_recent_avg_views)
  values (v_application_id, p_platform, p_media_url, p_handle, true, p_audience_size, p_recent_avg_views);
  return v_application_id;
end $$;

-- Final approval is a single transaction: locked application, evidence, profile, event.
create function public.m55_creator_approve_application_v1(
  p_application_id uuid, p_reviewer_clerk_user_id text, p_current_terms_version text,
  p_reason_code text, p_internal_notes_safe text,
  p_activity_continuity text, p_creator_track_record text, p_engagement_quality text,
  p_audience_authenticity text, p_content_fit text, p_disclosure_readiness text
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_app public.m55_creator_applications%rowtype;
  v_profile_id uuid;
begin
  select * into v_app from public.m55_creator_applications where id = p_application_id for update;
  if not found or v_app.status not in ('SUBMITTED','UNDER_REVIEW','NEED_MORE_INFO') then
    raise exception 'APPLICATION_NOT_APPROVABLE';
  end if;
  if p_reason_code is distinct from 'QUALIFIED'
     or p_activity_continuity is distinct from 'PASS'
     or p_creator_track_record is distinct from 'PASS'
     or p_engagement_quality is distinct from 'PASS'
     or p_audience_authenticity is distinct from 'PASS'
     or p_content_fit is distinct from 'PASS'
     or p_disclosure_readiness is distinct from 'PASS' then
    raise exception 'APPROVAL_EVIDENCE_NOT_ALL_PASS';
  end if;
  if v_app.terms_version <> p_current_terms_version or p_current_terms_version <> '2026-09-13-v1' then
    update public.m55_creator_applications set status = 'TERMS_REACCEPT_REQUIRED', updated_at = now() where id = p_application_id;
    insert into public.m55_creator_review_events(application_id, reviewer_clerk_user_id, from_status, to_status, reason_code)
      values (p_application_id, p_reviewer_clerk_user_id, v_app.status, 'TERMS_REACCEPT_REQUIRED', 'TERMS_REACCEPT_REQUIRED');
    return null;
  end if;
  if v_app.age_18_plus_attested is distinct from true or v_app.japan_resident_attested is distinct from true
     or exists (select 1 from public.m55_creator_profiles where clerk_user_id = v_app.clerk_user_id)
     or not exists (select 1 from public.m55_creator_application_media
       where application_id = p_application_id and is_primary and control_verification_status = 'VERIFIED')
     or (v_app.invite_id is not null and not exists
       (select 1 from public.m55_creator_invites where id = v_app.invite_id and status = 'ACCEPTED')) then
    raise exception 'APPROVAL_PRECONDITION_FAILED';
  end if;
  insert into public.m55_creator_profiles
    (clerk_user_id, originating_application_id, creator_code, first_final_approved_at,
     terms_version, terms_accepted_at)
  values
    (v_app.clerk_user_id, v_app.id, 'cr_' || replace(gen_random_uuid()::text, '-', ''), now(),
     v_app.terms_version, v_app.terms_accepted_at)
  returning id into v_profile_id;
  update public.m55_creator_applications
    set status = 'APPROVED_PENDING_ACTIVATION', final_reviewed_at = now(), updated_at = now()
    where id = p_application_id;
  insert into public.m55_creator_review_events
    (application_id, reviewer_clerk_user_id, from_status, to_status, reason_code, internal_notes_safe, evidence_snapshot)
  values (p_application_id, p_reviewer_clerk_user_id, v_app.status, 'APPROVED_PENDING_ACTIVATION',
          p_reason_code, p_internal_notes_safe,
          jsonb_build_object(
            'ACTIVITY_CONTINUITY', p_activity_continuity,
            'CREATOR_TRACK_RECORD', p_creator_track_record,
            'ENGAGEMENT_QUALITY', p_engagement_quality,
            'AUDIENCE_AUTHENTICITY', p_audience_authenticity,
            'CONTENT_FIT', p_content_fit,
            'DISCLOSURE_READINESS', p_disclosure_readiness));
  return v_profile_id;
end $$;

-- Structured reviewer state changes and media-control decisions are transactional.
create function public.m55_creator_review_action_v1(
  p_application_id uuid, p_reviewer_clerk_user_id text, p_action text,
  p_reason_code text, p_notes text, p_media_id uuid default null,
  p_method text default null, p_challenge_hash text default null
) returns text language plpgsql security invoker set search_path = '' as $$
declare
  v_app public.m55_creator_applications%rowtype;
  v_next text;
begin
  select * into v_app from public.m55_creator_applications where id = p_application_id for update;
  if not found or v_app.status in ('APPROVED_PENDING_ACTIVATION','BLOCKED') then
    raise exception 'REVIEW_NOT_ALLOWED';
  end if;
  if p_action in ('MEDIA_CHALLENGE','MEDIA_VERIFIED','MEDIA_FAILED') then
    if p_method not in ('DM_CHALLENGE','BIO_CHALLENGE','EXISTING_SCOUT_THREAD','MANUAL_OTHER') then
      raise exception 'MEDIA_METHOD_INVALID';
    end if;
    if p_action = 'MEDIA_CHALLENGE' and (p_challenge_hash is null or p_challenge_hash !~ '^[0-9a-f]{64}$') then
      raise exception 'MEDIA_CHALLENGE_INVALID';
    end if;
    if p_action = 'MEDIA_CHALLENGE' then
      update public.m55_creator_application_media
        set control_verification_method = p_method, control_verification_status = 'PENDING',
            challenge_hash = p_challenge_hash, verified_at = null, updated_at = now()
        where id = p_media_id and application_id = p_application_id;
    else
      update public.m55_creator_application_media
        set control_verification_method = p_method,
            control_verification_status = case when p_action = 'MEDIA_VERIFIED' then 'VERIFIED' else 'FAILED' end,
            verified_at = case when p_action = 'MEDIA_VERIFIED' then now() else null end,
            updated_at = now()
        where id = p_media_id and application_id = p_application_id;
    end if;
    if not found then raise exception 'MEDIA_NOT_FOUND'; end if;
    v_next := v_app.status;
  else
    v_next := case p_action
      when 'START_REVIEW' then 'UNDER_REVIEW'
      when 'NEED_MORE_INFO' then 'NEED_MORE_INFO'
      when 'REJECT' then 'REJECTED'
      when 'BLOCK' then 'BLOCKED'
      else null end;
    if v_next is null or v_app.status = 'REJECTED' then raise exception 'REVIEW_ACTION_INVALID'; end if;
    update public.m55_creator_applications
      set status = v_next, updated_at = now(),
          final_reviewed_at = case when v_next in ('REJECTED','BLOCKED') then now() else final_reviewed_at end,
          rejected_reapply_after = case when v_next = 'REJECTED' then now() + interval '30 days' else rejected_reapply_after end
      where id = p_application_id;
  end if;
  insert into public.m55_creator_review_events
    (application_id, reviewer_clerk_user_id, from_status, to_status, reason_code, internal_notes_safe, evidence_snapshot)
  values (p_application_id, p_reviewer_clerk_user_id, v_app.status, v_next, p_reason_code, p_notes,
          jsonb_build_object('action', p_action, 'media_id', p_media_id, 'method', p_method));
  return v_next;
end $$;

create function public.m55_creator_reaccept_terms_v1(p_application_id uuid, p_user_id text, p_terms_version text)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_terms_version <> '2026-09-13-v1' then raise exception 'TERMS_VERSION_INVALID'; end if;
  update public.m55_creator_applications
    set terms_version = p_terms_version, terms_accepted_at = now(), status = 'UNDER_REVIEW', updated_at = now()
    where id = p_application_id and clerk_user_id = p_user_id and status = 'TERMS_REACCEPT_REQUIRED';
  if not found then raise exception 'TERMS_REACCEPT_NOT_ALLOWED'; end if;
  return true;
end $$;

revoke all on function public.m55_creator_submit_application_v1(text,text,text,text,boolean,boolean,text,text,text,text,text,bigint,bigint) from public, anon, authenticated;
revoke all on function public.m55_creator_approve_application_v1(uuid,text,text,text,text,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.m55_creator_review_action_v1(uuid,text,text,text,text,uuid,text,text) from public, anon, authenticated;
revoke all on function public.m55_creator_reaccept_terms_v1(uuid,text,text) from public, anon, authenticated;
revoke all on function public.m55_creator_reject_review_event_mutation_v1() from public, anon, authenticated;
grant execute on function public.m55_creator_submit_application_v1(text,text,text,text,boolean,boolean,text,text,text,text,text,bigint,bigint) to service_role;
grant execute on function public.m55_creator_approve_application_v1(uuid,text,text,text,text,text,text,text,text,text,text) to service_role;
grant execute on function public.m55_creator_review_action_v1(uuid,text,text,text,text,uuid,text,text) to service_role;
grant execute on function public.m55_creator_reaccept_terms_v1(uuid,text,text) to service_role;
