-- LOCAL INTEGRATION ONLY — mirrors supabase/migrations/20260927200000_m55_r6_commission_ledger_v1.sql (ledger DDL excerpt).
-- Parent FK targets are integration stubs below; does NOT modify production migrations.

create table if not exists public.m55_creator_profiles (
  id uuid primary key,
  economic_identity_id uuid not null unique
);

create table if not exists public.m55_r5_attribution_purchase_attempts (
  purchase_attempt_id uuid primary key
);

create table if not exists public.m55_r5_attribution_canonical_payment_evidence (
  evidence_id uuid primary key
);

create table if not exists public.m55_r6_purchase_money_evidence (
  purchase_money_evidence_id uuid primary key
);

create table public.m55_r6_commission_ledger_events (
  commission_event_id uuid primary key default gen_random_uuid(),
  ledger_event_seq bigint generated always as identity not null unique,
  origin_commission_event_id uuid null
    references public.m55_r6_commission_ledger_events (commission_event_id)
    on delete restrict,
  event_family text not null check (
    event_family in (
      'COMMISSION_ACCRUED',
      'COMMISSION_HELD',
      'COMMISSION_RELEASED',
      'COMMISSION_PAYABLE',
      'COMMISSION_REVERSED',
      'COMMISSION_ADJUSTED',
      'CLAWBACK_ACCRUED'
    )
  ),
  canonical_event_state text not null check (
    canonical_event_state in (
      'COMMISSION_PENDING_COMPLIANCE_REVIEW',
      'COMMISSION_HOLD',
      'COMMISSION_PAYABLE',
      'COMMISSION_REVERSED',
      'COMMISSION_ADJUSTED'
    )
  ),
  lifecycle_state_after_event text not null check (
    lifecycle_state_after_event in (
      'COMMISSION_PENDING_COMPLIANCE_REVIEW',
      'COMMISSION_HOLD',
      'COMMISSION_PAYABLE',
      'COMMISSION_REVERSED'
    )
  ),
  provider text not null check (provider = 'STRIPE'),
  payment_intent_id text not null check (char_length(payment_intent_id) > 0),
  purchase_money_evidence_id uuid not null
    references public.m55_r6_purchase_money_evidence (purchase_money_evidence_id)
    on delete restrict,
  canonical_payment_evidence_id uuid not null
    references public.m55_r5_attribution_canonical_payment_evidence (evidence_id)
    on delete restrict,
  purchase_attempt_id uuid not null
    references public.m55_r5_attribution_purchase_attempts (purchase_attempt_id)
    on delete restrict,
  creator_economic_identity_id uuid not null
    references public.m55_creator_profiles (economic_identity_id)
    on delete restrict,
  creator_profile_id uuid not null
    references public.m55_creator_profiles (id)
    on delete restrict,
  runtime_product_id text not null check (char_length(runtime_product_id) > 0),
  policy_product_id text not null check (
    policy_product_id in ('M55_PREMIUM_REPORT_LIGHT', 'M55_PREMIUM_REPORT_FULL')
  ),
  conversion_kind text not null check (
    conversion_kind in ('FIRST_ELIGIBLE_PAID', 'LIGHT_TO_FULL_UPGRADE', 'REPURCHASE')
  ),
  attribution_policy_version text not null check (char_length(attribution_policy_version) > 0),
  creator_terms_version text not null check (char_length(creator_terms_version) > 0),
  eligible_product_policy_version text not null check (
    eligible_product_policy_version = 'r6_affiliate_eligible_products_v1'
  ),
  financial_policy_version text not null check (
    financial_policy_version = 'r6_financial_policy_v1'
  ),
  calculation_version text not null check (
    calculation_version = 'r6_commission_calculation_v1'
  ),
  rate_schedule_version text not null check (
    rate_schedule_version = 'r6_standard_rate_schedule_v1'
  ),
  canonical_payment_succeeded_at_ms bigint not null check (
    canonical_payment_succeeded_at_ms >= 0
    and canonical_payment_succeeded_at_ms <= 9007199254740991
  ),
  creator_first_final_approved_at_ms bigint not null check (
    creator_first_final_approved_at_ms >= 0
    and creator_first_final_approved_at_ms <= 9007199254740991
  ),
  commission_rate_basis_points integer not null check (
    commission_rate_basis_points >= 0
    and commission_rate_basis_points <= 10000
  ),
  gross_customer_paid_jpy bigint not null check (
    gross_customer_paid_jpy >= 1
    and gross_customer_paid_jpy <= 99999999
  ),
  discount_amount_jpy bigint not null check (
    discount_amount_jpy >= 0
    and discount_amount_jpy <= 99999999
  ),
  discount_state text not null check (discount_state in ('NONE', 'PRESENT')),
  authoritative_tax_amount_present boolean not null,
  authoritative_purchase_tax_amount_jpy bigint null check (
    (
      authoritative_tax_amount_present = true
      and authoritative_purchase_tax_amount_jpy is not null
      and authoritative_purchase_tax_amount_jpy >= 0
      and authoritative_purchase_tax_amount_jpy <= gross_customer_paid_jpy
    )
    or (
      authoritative_tax_amount_present = false
      and authoritative_purchase_tax_amount_jpy is null
    )
  ),
  tax_rate_bps integer not null check (tax_rate_bps = 1000),
  commission_base_tax_exclusion_jpy bigint not null check (
    commission_base_tax_exclusion_jpy >= 0
    and commission_base_tax_exclusion_jpy <= gross_customer_paid_jpy
  ),
  immediately_ineligible_amount_jpy bigint not null check (
    immediately_ineligible_amount_jpy = 0
  ),
  commissionable_revenue_jpy bigint not null check (
    commissionable_revenue_jpy >= 0
    and commissionable_revenue_jpy <= gross_customer_paid_jpy
  ),
  commission_delta_jpy bigint not null check (
    commission_delta_jpy >= -99999999
    and commission_delta_jpy <= 99999999
  ),
  entitlement_after_event_jpy bigint not null check (
    entitlement_after_event_jpy >= 0
    and entitlement_after_event_jpy <= 99999999
  ),
  release_at_ms bigint not null check (
    release_at_ms >= 0
    and release_at_ms <= 9007199254740991
  ),
  source_economic_object_type text null check (
    source_economic_object_type is null
    or source_economic_object_type in ('REFUND', 'DISPUTE')
  ),
  source_economic_object_id text null check (
    source_economic_object_id is null
    or char_length(source_economic_object_id) > 0
  ),
  economic_transition text null check (
    economic_transition is null
    or economic_transition in (
      'REFUND_SUCCEEDED',
      'DISPUTE_HOLD_STARTED',
      'DISPUTE_HOLD_RELEASED',
      'DISPUTE_WON',
      'DISPUTE_LOST'
    )
  ),
  reason_code text not null check (char_length(reason_code) between 1 and 128),
  recorded_at timestamptz not null default now(),
  constraint m55_r6_commission_ledger_accrual_origin_chk check (
    event_family <> 'COMMISSION_ACCRUED'
    or origin_commission_event_id is null
  ),
  constraint m55_r6_commission_ledger_child_origin_chk check (
    event_family = 'COMMISSION_ACCRUED'
    or origin_commission_event_id is not null
  ),
  constraint m55_r6_commission_ledger_economic_source_chk check (
    (
      source_economic_object_type is null
      and source_economic_object_id is null
      and economic_transition is null
    )
    or (
      source_economic_object_type is not null
      and source_economic_object_id is not null
      and economic_transition is not null
    )
  ),
  constraint m55_r6_commission_ledger_reversed_delta_chk check (
    event_family <> 'COMMISSION_REVERSED'
    or (
      entitlement_after_event_jpy = 0
      and (
        commission_delta_jpy < 0
        or (
          commission_delta_jpy = 0
          and reason_code = 'AUTO_CANCEL_OBJECTIVE'
          and source_economic_object_type is null
          and source_economic_object_id is null
          and economic_transition is null
          and canonical_event_state = 'COMMISSION_REVERSED'
          and lifecycle_state_after_event = 'COMMISSION_REVERSED'
        )
      )
    )
  )
);


grant select, insert on public.m55_r6_commission_ledger_events to service_role;
