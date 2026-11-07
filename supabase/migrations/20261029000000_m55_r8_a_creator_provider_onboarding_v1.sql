-- M55 R8-A Creator provider onboarding v1 — tax profile + Stripe linkage plane (draft; local only until Human apply GO).
-- Stores provider ids and redacted readiness snapshots only. No bank account numbers, My Number, KYC blobs, or secrets.

create table public.m55_r8_creator_tax_profiles_v1 (
  creator_economic_identity_id uuid primary key
    references public.m55_creator_profiles (economic_identity_id) on delete restrict,
  schema_version text not null default '2026-10-29-v1'
    check (schema_version = '2026-10-29-v1'),
  tax_residency text not null
    check (tax_residency = 'JAPAN_RESIDENT'),
  payee_type text not null
    check (payee_type in ('INDIVIDUAL', 'CORPORATION')),
  invoice_registration_status text not null
    check (invoice_registration_status in ('NOT_REGISTERED', 'REGISTERED', 'NOT_APPLICABLE')),
  invoice_registration_number text null,
  withholding_classification text not null
    check (withholding_classification = 'ORDINARY_JP_AFFILIATE_V1_ZERO'),
  tax_profile_effective_at timestamptz not null,
  v1_japan_resident_attested boolean not null default true,
  v1_age_18_plus_attested boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint m55_r8_tax_invoice_number_when_registered check (
    (invoice_registration_status = 'REGISTERED' and invoice_registration_number is not null)
    or (invoice_registration_status <> 'REGISTERED' and invoice_registration_number is null)
  )
);

create table public.m55_r8_stripe_connected_accounts_v1 (
  id uuid primary key default gen_random_uuid(),
  creator_economic_identity_id uuid not null unique
    references public.m55_creator_profiles (economic_identity_id) on delete restrict,
  stripe_account_id text null unique,
  link_state text not null default 'NOT_STARTED'
    check (link_state in (
      'NOT_STARTED',
      'ACCOUNT_STUB',
      'ONBOARDING_LINK_ISSUED',
      'PROVIDER_DETAILS_SUBMITTED',
      'PAYOUTS_CAPABILITY_ACTIVE',
      'BLOCKED',
      'ERROR'
    )),
  create_idempotency_key text not null,
  last_onboarding_session_id uuid null,
  last_onboarding_url_issued_at timestamptz null,
  last_provider_snapshot jsonb null,
  last_synced_at timestamptz null,
  last_error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint m55_r8_stripe_create_idempotency_unique unique (create_idempotency_key)
);

create table public.m55_r8_provider_onboarding_sessions_v1 (
  id uuid primary key default gen_random_uuid(),
  creator_economic_identity_id uuid not null
    references public.m55_creator_profiles (economic_identity_id) on delete restrict,
  client_idempotency_key text not null,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'COMPLETED', 'EXPIRED', 'FAILED')),
  return_path text not null,
  expires_at timestamptz not null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint m55_r8_onboarding_session_idempotency unique (creator_economic_identity_id, client_idempotency_key)
);

create index m55_r8_onboarding_sessions_economic_idx
  on public.m55_r8_provider_onboarding_sessions_v1 (creator_economic_identity_id, created_at desc);

create table public.m55_r8_provider_onboarding_events_v1 (
  id uuid primary key default gen_random_uuid(),
  creator_economic_identity_id uuid not null
    references public.m55_creator_profiles (economic_identity_id) on delete restrict,
  event_type text not null,
  idempotency_key text not null unique,
  payload_redacted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.m55_r8_reject_provider_onboarding_event_mutation_v1()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'R8_PROVIDER_ONBOARDING_EVENTS_APPEND_ONLY';
end $$;

create trigger m55_r8_provider_onboarding_events_immutable
  before update or delete on public.m55_r8_provider_onboarding_events_v1
  for each row execute function public.m55_r8_reject_provider_onboarding_event_mutation_v1();

alter table public.m55_r8_creator_tax_profiles_v1 enable row level security;
alter table public.m55_r8_stripe_connected_accounts_v1 enable row level security;
alter table public.m55_r8_provider_onboarding_sessions_v1 enable row level security;
alter table public.m55_r8_provider_onboarding_events_v1 enable row level security;

revoke all on public.m55_r8_creator_tax_profiles_v1 from public, anon, authenticated;
revoke all on public.m55_r8_stripe_connected_accounts_v1 from public, anon, authenticated;
revoke all on public.m55_r8_provider_onboarding_sessions_v1 from public, anon, authenticated;
revoke all on public.m55_r8_provider_onboarding_events_v1 from public, anon, authenticated;

grant all on public.m55_r8_creator_tax_profiles_v1 to service_role;
grant all on public.m55_r8_stripe_connected_accounts_v1 to service_role;
grant all on public.m55_r8_provider_onboarding_sessions_v1 to service_role;
grant all on public.m55_r8_provider_onboarding_events_v1 to service_role;
