-- LOCAL ISOLATED E2E ONLY — bind an ACTIVE Creator profile to a Clerk test user (no Production application review).
-- Apply on the same non-Production Postgres project as NEXT_PUBLIC_SUPABASE_URL / getSupabaseAdmin().
-- Replace :clerk_user_id with the signed-in Clerk user id from isolated dev (do not commit real ids).

-- Usage (psql): \set clerk_user_id 'user_...'
-- Then run the insert block below.

insert into public.m55_creator_applications (
  clerk_user_id,
  application_source,
  age_18_plus_attested,
  japan_resident_attested,
  content_focus_safe,
  promotion_experience_safe,
  terms_version,
  terms_accepted_at,
  status
) values (
  :'clerk_user_id',
  'PUBLIC_APPLICATION',
  true,
  true,
  'isolated e2e fixture',
  'isolated e2e fixture',
  '2026-09-13-v1',
  now(),
  'APPROVED_PENDING_ACTIVATION'
)
on conflict do nothing;

insert into public.m55_creator_profiles (
  clerk_user_id,
  originating_application_id,
  creator_code,
  first_final_approved_at,
  terms_version,
  terms_accepted_at,
  status
)
select
  a.clerk_user_id,
  a.id,
  'cr_isolated_e2e',
  now(),
  '2026-09-13-v1',
  now(),
  'ACTIVE'
from public.m55_creator_applications as a
where a.clerk_user_id = :'clerk_user_id'
on conflict (clerk_user_id) do update set status = excluded.status;

insert into public.m55_r8_creator_tax_profiles_v1 (
  creator_economic_identity_id,
  tax_residency,
  payee_type,
  invoice_registration_status,
  withholding_classification,
  tax_profile_effective_at
)
select
  p.economic_identity_id,
  'JAPAN_RESIDENT',
  'INDIVIDUAL',
  'NOT_REGISTERED',
  'ORDINARY_JP_AFFILIATE_V1_ZERO',
  now()
from public.m55_creator_profiles as p
where p.clerk_user_id = :'clerk_user_id'
on conflict (creator_economic_identity_id) do nothing;
