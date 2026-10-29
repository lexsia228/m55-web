-- M55 R8-B settlement state schema PROPOSAL (NOT under supabase/migrations — do not apply without Human GO).
-- R8-B local implementation authority: lib/m55/creatorSettlement/*
-- No Stripe transfer/payout execution columns are wired in R8-B.

create table if not exists public.m55_r8_payout_batches_v1 (
  batch_id uuid primary key,
  creator_economic_identity_id uuid not null,
  cutoff_at timestamptz not null,
  idempotency_key text not null,
  locked_at timestamptz not null,
  instruction_id uuid not null,
  unique (idempotency_key)
);

create table if not exists public.m55_r8_payout_instructions_v1 (
  instruction_id uuid primary key,
  batch_id uuid not null references public.m55_r8_payout_batches_v1 (batch_id),
  creator_economic_identity_id uuid not null,
  mode text not null,
  payout_due_at timestamptz not null,
  settlement_payable_jpy bigint not null check (settlement_payable_jpy >= 0),
  payout_processing_fee_jpy bigint not null check (payout_processing_fee_jpy >= 0),
  payout_fee_policy_version text not null,
  withholding_jpy bigint not null check (withholding_jpy >= 0),
  net_payout_jpy bigint not null check (net_payout_jpy >= 0),
  parent_instruction_id uuid null,
  locked_at timestamptz not null
);

create table if not exists public.m55_r8_payout_batch_lines_v1 (
  commission_event_id uuid primary key,
  instruction_id uuid not null references public.m55_r8_payout_instructions_v1 (instruction_id),
  allocated_gross_commission_jpy bigint not null check (allocated_gross_commission_jpy >= 0)
);

revoke all on public.m55_r8_payout_batches_v1 from public, anon, authenticated;
revoke all on public.m55_r8_payout_instructions_v1 from public, anon, authenticated;
revoke all on public.m55_r8_payout_batch_lines_v1 from public, anon, authenticated;
grant all on public.m55_r8_payout_batches_v1 to service_role;
grant all on public.m55_r8_payout_instructions_v1 to service_role;
grant all on public.m55_r8_payout_batch_lines_v1 to service_role;
