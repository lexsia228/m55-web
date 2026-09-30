-- M55 R6-P0-B commission ledger v1. Local migration only; no Preview / Production apply.

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

create unique index m55_r6_commission_ledger_one_accrual_uq
  on public.m55_r6_commission_ledger_events (provider, payment_intent_id)
  where event_family = 'COMMISSION_ACCRUED';

create unique index m55_r6_commission_ledger_economic_transition_uq
  on public.m55_r6_commission_ledger_events (
    provider,
    source_economic_object_type,
    source_economic_object_id,
    economic_transition
  )
  where source_economic_object_type is not null
    and source_economic_object_id is not null
    and economic_transition is not null;

create index m55_r6_commission_ledger_origin_recorded_idx
  on public.m55_r6_commission_ledger_events (
    origin_commission_event_id,
    ledger_event_seq desc
  );

create index m55_r6_commission_ledger_release_scan_idx
  on public.m55_r6_commission_ledger_events (release_at_ms asc, commission_event_id asc)
  where event_family = 'COMMISSION_ACCRUED';

create function public.m55_r6_commission_ledger_append_only_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  raise exception 'COMMISSION_LEDGER_APPEND_ONLY';
end
$fn$;

create trigger m55_r6_commission_ledger_append_only
  before update or delete on public.m55_r6_commission_ledger_events
  for each row execute function public.m55_r6_commission_ledger_append_only_trg();

create function public.m55_r6_commission_ledger_no_truncate_trg()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  raise exception 'COMMISSION_LEDGER_NO_TRUNCATE';
end
$fn$;

create trigger m55_r6_commission_ledger_no_truncate
  before truncate on public.m55_r6_commission_ledger_events
  for each statement execute function public.m55_r6_commission_ledger_no_truncate_trg();

alter table public.m55_r6_commission_ledger_events enable row level security;

revoke all on public.m55_r6_commission_ledger_events from public, anon, authenticated, service_role;
grant select, insert on public.m55_r6_commission_ledger_events to service_role;

create function public.m55_r6_floor_div_bigint_v1(
  p_numerator bigint,
  p_denominator bigint
)
returns bigint
language plpgsql
immutable
set search_path = ''
as $fn$
begin
  if p_denominator = 0 then
    raise exception 'DIVISION_BY_ZERO';
  end if;
  return p_numerator / p_denominator;
end
$fn$;

create function public.m55_r6_derive_rate_bps_v1(
  p_creator_first_final_approved_at_ms bigint,
  p_canonical_payment_succeeded_at_ms bigint
)
returns integer
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_tier_180_ms constant bigint := 15552000000;
  v_tier_365_ms constant bigint := 31536000000;
begin
  if p_creator_first_final_approved_at_ms is null
     or p_canonical_payment_succeeded_at_ms is null
     or p_creator_first_final_approved_at_ms < 0
     or p_canonical_payment_succeeded_at_ms < 0 then
    raise exception 'CREATOR_RATE_AUTHORITY_INVALID';
  end if;
  if p_canonical_payment_succeeded_at_ms < p_creator_first_final_approved_at_ms then
    raise exception 'CREATOR_RATE_AUTHORITY_INVALID';
  end if;
  if p_canonical_payment_succeeded_at_ms < p_creator_first_final_approved_at_ms + v_tier_180_ms then
    return 5000;
  end if;
  if p_canonical_payment_succeeded_at_ms < p_creator_first_final_approved_at_ms + v_tier_365_ms then
    return 4000;
  end if;
  return 3000;
end
$fn$;

create function public.m55_r6_compute_remaining_tax_exclusion_v1(
  p_original_gross_jpy bigint,
  p_original_authoritative_tax_present boolean,
  p_original_authoritative_tax_jpy bigint,
  p_original_tax_rate_bps integer,
  p_remaining_gross_jpy bigint
)
returns bigint
language plpgsql
immutable
set search_path = ''
as $fn$
begin
  if p_remaining_gross_jpy = 0 then
    return 0;
  end if;
  if p_original_authoritative_tax_present then
    return public.m55_r6_floor_div_bigint_v1(
      p_original_authoritative_tax_jpy * p_remaining_gross_jpy,
      p_original_gross_jpy
    );
  end if;
  return public.m55_r6_floor_div_bigint_v1(
    p_remaining_gross_jpy * p_original_tax_rate_bps::bigint,
    (10000 + p_original_tax_rate_bps)::bigint
  );
end
$fn$;

create function public.m55_r6_compute_target_entitlement_v1(
  p_original_gross_jpy bigint,
  p_original_authoritative_tax_present boolean,
  p_original_authoritative_tax_jpy bigint,
  p_original_tax_rate_bps integer,
  p_original_rate_bps integer,
  p_effective_reversal_gross_jpy bigint
)
returns bigint
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_remaining_gross bigint;
  v_remaining_tax bigint;
  v_remaining_commissionable bigint;
begin
  v_remaining_gross := p_original_gross_jpy - p_effective_reversal_gross_jpy;
  v_remaining_tax := public.m55_r6_compute_remaining_tax_exclusion_v1(
    p_original_gross_jpy,
    p_original_authoritative_tax_present,
    coalesce(p_original_authoritative_tax_jpy, 0),
    p_original_tax_rate_bps,
    v_remaining_gross
  );
  v_remaining_commissionable := greatest(v_remaining_gross - v_remaining_tax, 0);
  return public.m55_r6_floor_div_bigint_v1(
    v_remaining_commissionable * p_original_rate_bps::bigint,
    10000::bigint
  );
end
$fn$;

create function public.m55_r6_sum_economic_entitlement_v1(
  p_origin_commission_event_id uuid
)
returns bigint
language plpgsql
stable
set search_path = ''
as $fn$
declare
  v_total bigint;
begin
  select coalesce(sum(commission_delta_jpy), 0)
    into v_total
  from public.m55_r6_commission_ledger_events
  where (
      commission_event_id = p_origin_commission_event_id
      or origin_commission_event_id = p_origin_commission_event_id
    )
    and event_family in (
      'COMMISSION_ACCRUED',
      'COMMISSION_ADJUSTED',
      'COMMISSION_REVERSED',
      'CLAWBACK_ACCRUED'
    );
  return coalesce(v_total, 0);
end
$fn$;

create function public.m55_r6_latest_lifecycle_state_v1(
  p_origin_commission_event_id uuid
)
returns text
language plpgsql
stable
set search_path = ''
as $fn$
declare
  v_state text;
begin
  select lifecycle_state_after_event
    into v_state
  from public.m55_r6_commission_ledger_events
  where commission_event_id = p_origin_commission_event_id
     or origin_commission_event_id = p_origin_commission_event_id
  order by ledger_event_seq desc
  limit 1;
  return v_state;
end
$fn$;

create function public.m55_r6_has_purchase_objective_cancel_v1(
  p_purchase_attempt_id uuid
)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $fn$
begin
  return exists (
    select 1
    from public.m55_r5_compliance_decisions d
    where d.purchase_attempt_id = p_purchase_attempt_id
      and d.disposition = 'AUTO_CANCEL_OBJECTIVE'
  );
end
$fn$;

create function public.m55_r6_has_purchase_active_hold_v1(
  p_purchase_attempt_id uuid
)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $fn$
begin
  if exists (
    select 1
    from public.m55_r5_compliance_decisions d
    where d.purchase_attempt_id = p_purchase_attempt_id
      and d.disposition = 'AUTO_HOLD'
      and not exists (
        select 1
        from public.m55_r5_compliance_cases c
        where c.adverse_decision_id = d.decision_id
          and c.status = 'RESOLVED'
          and c.decision in (
            'RELEASE',
            'AUTO_RELEASE',
            'SUPERSEDED_BY_OBJECTIVE_DECISION',
            'SUPERSEDED_BY_NEW_MACHINE_DECISION'
          )
      )
  ) then
    return true;
  end if;
  return exists (
    select 1
    from public.m55_r5_compliance_cases c
    where c.purchase_attempt_id = p_purchase_attempt_id
      and (
        c.status in ('OPEN', 'HOLD')
        or c.decision in (
          'KEEP_HOLD',
          'REQUEST_CORRECTION',
          'PAUSE_CREATOR',
          'TERMINATE_PARTNERSHIP'
        )
      )
  );
end
$fn$;

create function public.m55_r6_has_purchase_positive_authority_v1(
  p_purchase_attempt_id uuid
)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $fn$
begin
  if not exists (
    select 1
    from public.m55_r5_compliance_decisions d
    where d.purchase_attempt_id = p_purchase_attempt_id
      and d.disposition in ('AUTO_PASS', 'HUMAN_EXCEPTION')
  ) then
    return false;
  end if;
  return not public.m55_r6_has_purchase_active_hold_v1(p_purchase_attempt_id);
end
$fn$;

create function public.m55_r6_purchase_compliance_authority_snapshot_v1(
  p_purchase_attempt_id uuid
)
returns table (
  has_objective_cancel boolean,
  has_active_hold boolean,
  has_positive_authority boolean
)
language plpgsql
security definer
stable
set search_path = ''
as $fn$
declare
  v_has_objective_cancel boolean;
  v_has_active_hold boolean;
  v_has_positive_authority boolean;
begin
  v_has_objective_cancel := public.m55_r6_has_purchase_objective_cancel_v1(p_purchase_attempt_id);
  v_has_active_hold := public.m55_r6_has_purchase_active_hold_v1(p_purchase_attempt_id);
  v_has_positive_authority := exists (
    select 1
    from public.m55_r5_compliance_decisions d
    where d.purchase_attempt_id = p_purchase_attempt_id
      and d.disposition in ('AUTO_PASS', 'HUMAN_EXCEPTION')
  ) and not v_has_active_hold;
  return query
  select v_has_objective_cancel, v_has_active_hold, v_has_positive_authority;
end
$fn$;

create function public.m55_r6_lock_purchase_compliance_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_attempts uuid[] := '{}';
  v_pi text;
begin
  if tg_op in ('UPDATE', 'DELETE') and old.purchase_attempt_id is not null then
    v_attempts := array_append(v_attempts, old.purchase_attempt_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE')
     and new.purchase_attempt_id is not null
     and not new.purchase_attempt_id = any (v_attempts) then
    v_attempts := array_append(v_attempts, new.purchase_attempt_id);
  end if;

  for v_pi in
    select mapped.payment_intent_id
    from public.m55_r5_attribution_canonical_payment_evidence mapped
    where mapped.purchase_attempt_id = any (v_attempts)
    group by mapped.payment_intent_id
    order by mapped.payment_intent_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended('m55_r6_commission:' || v_pi, 0)
    );
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$fn$;

create trigger m55_r6_lock_compliance_decisions_purchase_v1
  before insert or update or delete on public.m55_r5_compliance_decisions
  for each row execute function public.m55_r6_lock_purchase_compliance_mutation_v1();

create trigger m55_r6_lock_compliance_cases_purchase_v1
  before insert or update or delete on public.m55_r5_compliance_cases
  for each row execute function public.m55_r6_lock_purchase_compliance_mutation_v1();

create function public.m55_r6_classify_dispute_authority_v1(
  p_stripe_event_type text,
  p_dispute_status text
)
returns text
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_status text := lower(coalesce(p_dispute_status, ''));
begin
  if p_stripe_event_type in (
    'charge.dispute.created',
    'charge.dispute.updated',
    'charge.dispute.funds_withdrawn'
  ) then
    return 'ACTIVE_HOLD';
  end if;
  if p_stripe_event_type = 'charge.dispute.funds_reinstated' then
    return 'HOLD_RELEASE_CANDIDATE';
  end if;
  if p_stripe_event_type = 'charge.dispute.closed' then
    if v_status = 'won' then
      return 'DISPUTE_WON';
    end if;
    if v_status = 'lost' then
      return 'DISPUTE_LOST';
    end if;
    return 'UNKNOWN_CLOSED_HOLD';
  end if;
  return 'UNKNOWN_CLOSED_HOLD';
end
$fn$;

create function public.m55_r6_classify_economic_event_family_v1(
  p_current_lifecycle text,
  p_delta bigint,
  p_target_entitlement bigint
)
returns text
language plpgsql
immutable
set search_path = ''
as $fn$
begin
  if p_delta = 0 then
    return null;
  end if;
  if p_current_lifecycle = 'COMMISSION_PAYABLE' and p_delta < 0 then
    return 'CLAWBACK_ACCRUED';
  end if;
  if p_target_entitlement = 0 then
    return 'COMMISSION_REVERSED';
  end if;
  return 'COMMISSION_ADJUSTED';
end
$fn$;

create function public.m55_r6_insert_ledger_event_v1(
  p_origin_commission_event_id uuid,
  p_event_family text,
  p_canonical_event_state text,
  p_lifecycle_state_after_event text,
  p_provider text,
  p_payment_intent_id text,
  p_purchase_money_evidence_id uuid,
  p_canonical_payment_evidence_id uuid,
  p_purchase_attempt_id uuid,
  p_creator_economic_identity_id uuid,
  p_creator_profile_id uuid,
  p_runtime_product_id text,
  p_policy_product_id text,
  p_conversion_kind text,
  p_attribution_policy_version text,
  p_creator_terms_version text,
  p_eligible_product_policy_version text,
  p_financial_policy_version text,
  p_calculation_version text,
  p_rate_schedule_version text,
  p_canonical_payment_succeeded_at_ms bigint,
  p_creator_first_final_approved_at_ms bigint,
  p_commission_rate_basis_points integer,
  p_gross_customer_paid_jpy bigint,
  p_discount_amount_jpy bigint,
  p_discount_state text,
  p_authoritative_tax_amount_present boolean,
  p_authoritative_purchase_tax_amount_jpy bigint,
  p_tax_rate_bps integer,
  p_commission_base_tax_exclusion_jpy bigint,
  p_immediately_ineligible_amount_jpy bigint,
  p_commissionable_revenue_jpy bigint,
  p_commission_delta_jpy bigint,
  p_entitlement_after_event_jpy bigint,
  p_release_at_ms bigint,
  p_source_economic_object_type text,
  p_source_economic_object_id text,
  p_economic_transition text,
  p_reason_code text
)
returns uuid
language plpgsql
set search_path = ''
as $fn$
declare
  v_event_id uuid;
begin
  insert into public.m55_r6_commission_ledger_events (
    origin_commission_event_id,
    event_family,
    canonical_event_state,
    lifecycle_state_after_event,
    provider,
    payment_intent_id,
    purchase_money_evidence_id,
    canonical_payment_evidence_id,
    purchase_attempt_id,
    creator_economic_identity_id,
    creator_profile_id,
    runtime_product_id,
    policy_product_id,
    conversion_kind,
    attribution_policy_version,
    creator_terms_version,
    eligible_product_policy_version,
    financial_policy_version,
    calculation_version,
    rate_schedule_version,
    canonical_payment_succeeded_at_ms,
    creator_first_final_approved_at_ms,
    commission_rate_basis_points,
    gross_customer_paid_jpy,
    discount_amount_jpy,
    discount_state,
    authoritative_tax_amount_present,
    authoritative_purchase_tax_amount_jpy,
    tax_rate_bps,
    commission_base_tax_exclusion_jpy,
    immediately_ineligible_amount_jpy,
    commissionable_revenue_jpy,
    commission_delta_jpy,
    entitlement_after_event_jpy,
    release_at_ms,
    source_economic_object_type,
    source_economic_object_id,
    economic_transition,
    reason_code
  ) values (
    p_origin_commission_event_id,
    p_event_family,
    p_canonical_event_state,
    p_lifecycle_state_after_event,
    p_provider,
    p_payment_intent_id,
    p_purchase_money_evidence_id,
    p_canonical_payment_evidence_id,
    p_purchase_attempt_id,
    p_creator_economic_identity_id,
    p_creator_profile_id,
    p_runtime_product_id,
    p_policy_product_id,
    p_conversion_kind,
    p_attribution_policy_version,
    p_creator_terms_version,
    p_eligible_product_policy_version,
    p_financial_policy_version,
    p_calculation_version,
    p_rate_schedule_version,
    p_canonical_payment_succeeded_at_ms,
    p_creator_first_final_approved_at_ms,
    p_commission_rate_basis_points,
    p_gross_customer_paid_jpy,
    p_discount_amount_jpy,
    p_discount_state,
    p_authoritative_tax_amount_present,
    p_authoritative_purchase_tax_amount_jpy,
    p_tax_rate_bps,
    p_commission_base_tax_exclusion_jpy,
    p_immediately_ineligible_amount_jpy,
    p_commissionable_revenue_jpy,
    p_commission_delta_jpy,
    p_entitlement_after_event_jpy,
    p_release_at_ms,
    p_source_economic_object_type,
    p_source_economic_object_id,
    p_economic_transition,
    p_reason_code
  )
  returning commission_event_id into v_event_id;
  return v_event_id;
end
$fn$;

create function public.m55_r6_record_original_commission_v1(
  p_payment_intent_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_review_window_ms constant bigint := 2592000000;
  v_tax_rate_bps constant integer := 1000;
  v_financial_policy_version constant text := 'r6_financial_policy_v1';
  v_calculation_version constant text := 'r6_commission_calculation_v1';
  v_rate_schedule_version constant text := 'r6_standard_rate_schedule_v1';
  v_eligible_product_policy_version constant text := 'r6_affiliate_eligible_products_v1';
  v_evidence public.m55_r5_attribution_canonical_payment_evidence%rowtype;
  v_attempt public.m55_r5_attribution_purchase_attempts%rowtype;
  v_money public.m55_r6_purchase_money_evidence%rowtype;
  v_profile public.m55_creator_profiles%rowtype;
  v_eligibility public.m55_creator_profile_eligibility_events%rowtype;
  v_existing public.m55_r6_commission_ledger_events%rowtype;
  v_approval_ms bigint;
  v_rate_bps integer;
  v_tax_exclusion bigint;
  v_commissionable bigint;
  v_commission bigint;
  v_release_at_ms bigint;
  v_initial_lifecycle text;
  v_event_id uuid;
begin
  if p_payment_intent_id is null or char_length(p_payment_intent_id) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  select *
    into v_evidence
  from public.m55_r5_attribution_canonical_payment_evidence
  where payment_intent_id = p_payment_intent_id;

  if not found then
    raise exception 'COMMISSION_SOURCE_NOT_FOUND';
  end if;

  select *
    into v_attempt
  from public.m55_r5_attribution_purchase_attempts
  where purchase_attempt_id = v_evidence.purchase_attempt_id
  for key share;

  if not found then
    raise exception 'R6_PURCHASE_ATTEMPT_KEY_SHARE_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('m55_r6_commission:' || p_payment_intent_id, 0)
  );

  select *
    into v_money
  from public.m55_r6_purchase_money_evidence
  where canonical_payment_evidence_id = v_evidence.evidence_id;

  if not found then
    raise exception 'COMMISSION_SOURCE_NOT_FOUND';
  end if;

  if v_attempt.decision_kind <> 'CREATOR_WINNER'
     or v_attempt.creator_economic_identity_id is null
     or v_attempt.policy_product_id not in (
       'M55_PREMIUM_REPORT_LIGHT',
       'M55_PREMIUM_REPORT_FULL'
     ) then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'NOT_COMMISSION_ELIGIBLE'
    );
  end if;

  if v_evidence.preliminary_r5b_eligibility in ('NONE', 'OBJECTIVE_DENIAL') then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'NOT_COMMISSION_ELIGIBLE'
    );
  end if;

  if v_evidence.preliminary_r5b_eligibility not in ('CREATOR_CASH', 'HOLD_RECONCILE') then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'NOT_COMMISSION_ELIGIBLE'
    );
  end if;

  select *
    into v_profile
  from public.m55_creator_profiles
  where economic_identity_id = v_attempt.creator_economic_identity_id;

  if not found then
    raise exception 'COMMISSION_SOURCE_NOT_FOUND';
  end if;

  v_approval_ms := floor(extract(epoch from v_profile.first_final_approved_at) * 1000)::bigint;
  v_rate_bps := public.m55_r6_derive_rate_bps_v1(
    v_approval_ms,
    v_evidence.canonical_event_created_at_ms
  );

  select *
    into v_eligibility
  from public.m55_creator_profile_eligibility_events e
  where e.creator_profile_id = v_profile.id
    and e.effective_at_ms <= v_evidence.canonical_event_created_at_ms
  order by e.effective_at_ms desc, e.eligibility_event_seq desc
  limit 1;

  if not found then
    raise exception 'CREATOR_TERMS_AUTHORITY_INVALID';
  end if;

  if v_money.currency is distinct from 'jpy' then
    raise exception 'COMMISSION_SOURCE_NOT_FOUND';
  end if;

  if v_money.authoritative_tax_amount_present then
    v_tax_exclusion := v_money.authoritative_purchase_tax_amount_jpy;
  else
    v_tax_exclusion := public.m55_r6_floor_div_bigint_v1(
      v_money.gross_customer_paid_jpy::bigint * 1000::bigint,
      11000::bigint
    );
  end if;

  v_commissionable := v_money.gross_customer_paid_jpy - v_tax_exclusion;
  if v_commissionable < 0 or v_commissionable > v_money.gross_customer_paid_jpy then
    raise exception 'COMMISSION_PAYLOAD_CONFLICT';
  end if;

  v_commission := public.m55_r6_floor_div_bigint_v1(
    v_commissionable * v_rate_bps::bigint,
    10000::bigint
  );

  v_release_at_ms := v_evidence.canonical_event_created_at_ms + v_review_window_ms;

  select *
    into v_existing
  from public.m55_r6_commission_ledger_events
  where provider = 'STRIPE'
    and payment_intent_id = p_payment_intent_id
    and event_family = 'COMMISSION_ACCRUED';

  if found then
    if v_existing.purchase_money_evidence_id is not distinct from v_money.purchase_money_evidence_id
       and v_existing.canonical_payment_evidence_id is not distinct from v_evidence.evidence_id
       and v_existing.purchase_attempt_id is not distinct from v_attempt.purchase_attempt_id
       and v_existing.creator_economic_identity_id is not distinct from v_profile.economic_identity_id
       and v_existing.creator_profile_id is not distinct from v_profile.id
       and v_existing.runtime_product_id is not distinct from v_attempt.runtime_product_id
       and v_existing.policy_product_id is not distinct from v_attempt.policy_product_id
       and v_existing.conversion_kind is not distinct from v_attempt.conversion_kind
       and v_existing.attribution_policy_version is not distinct from v_attempt.attribution_policy_version
       and v_existing.creator_terms_version is not distinct from v_eligibility.terms_version
       and v_existing.eligible_product_policy_version = v_eligible_product_policy_version
       and v_existing.financial_policy_version = v_financial_policy_version
       and v_existing.calculation_version = v_calculation_version
       and v_existing.rate_schedule_version = v_rate_schedule_version
       and v_existing.canonical_payment_succeeded_at_ms is not distinct from v_evidence.canonical_event_created_at_ms
       and v_existing.creator_first_final_approved_at_ms is not distinct from v_approval_ms
       and v_existing.commission_rate_basis_points is not distinct from v_rate_bps
       and v_existing.gross_customer_paid_jpy is not distinct from v_money.gross_customer_paid_jpy
       and v_existing.discount_amount_jpy is not distinct from v_money.discount_amount_jpy
       and v_existing.discount_state is not distinct from v_money.discount_state
       and v_existing.authoritative_tax_amount_present is not distinct from v_money.authoritative_tax_amount_present
       and v_existing.authoritative_purchase_tax_amount_jpy is not distinct from v_money.authoritative_purchase_tax_amount_jpy
       and v_existing.tax_rate_bps = v_tax_rate_bps
       and v_existing.commission_base_tax_exclusion_jpy is not distinct from v_tax_exclusion
       and v_existing.immediately_ineligible_amount_jpy = 0
       and v_existing.commissionable_revenue_jpy is not distinct from v_commissionable
       and v_existing.commission_delta_jpy is not distinct from v_commission
       and v_existing.entitlement_after_event_jpy is not distinct from v_commission
       and v_existing.release_at_ms is not distinct from v_release_at_ms then
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'CONVERGED',
        'commission_event_id', v_existing.commission_event_id
      );
    end if;
    raise exception 'COMMISSION_PAYLOAD_CONFLICT';
  end if;

  if v_evidence.preliminary_r5b_eligibility = 'HOLD_RECONCILE' then
    v_initial_lifecycle := 'COMMISSION_HOLD';
  elsif public.m55_r6_has_purchase_active_hold_v1(v_attempt.purchase_attempt_id) then
    v_initial_lifecycle := 'COMMISSION_HOLD';
  else
    v_initial_lifecycle := 'COMMISSION_PENDING_COMPLIANCE_REVIEW';
  end if;

  v_event_id := public.m55_r6_insert_ledger_event_v1(
    null,
    'COMMISSION_ACCRUED',
    case
      when v_initial_lifecycle = 'COMMISSION_HOLD' then 'COMMISSION_HOLD'
      else 'COMMISSION_PENDING_COMPLIANCE_REVIEW'
    end,
    v_initial_lifecycle,
    'STRIPE',
    p_payment_intent_id,
    v_money.purchase_money_evidence_id,
    v_evidence.evidence_id,
    v_attempt.purchase_attempt_id,
    v_profile.economic_identity_id,
    v_profile.id,
    v_attempt.runtime_product_id,
    v_attempt.policy_product_id,
    v_attempt.conversion_kind,
    v_attempt.attribution_policy_version,
    v_eligibility.terms_version,
    v_eligible_product_policy_version,
    v_financial_policy_version,
    v_calculation_version,
    v_rate_schedule_version,
    v_evidence.canonical_event_created_at_ms,
    v_approval_ms,
    v_rate_bps,
    v_money.gross_customer_paid_jpy,
    v_money.discount_amount_jpy,
    v_money.discount_state,
    v_money.authoritative_tax_amount_present,
    v_money.authoritative_purchase_tax_amount_jpy,
    v_tax_rate_bps,
    v_tax_exclusion,
    0,
    v_commissionable,
    v_commission,
    v_commission,
    v_release_at_ms,
    null,
    null,
    null,
    'ORIGINAL_ACCRUAL'
  );

  return jsonb_build_object(
    'ok', true,
    'status', 'succeeded',
    'outcome', 'RECORDED',
    'commission_event_id', v_event_id
  );
exception
  when unique_violation then
    select *
      into v_existing
    from public.m55_r6_commission_ledger_events
    where provider = 'STRIPE'
      and payment_intent_id = p_payment_intent_id
      and event_family = 'COMMISSION_ACCRUED';
    if not found then
      raise;
    end if;
    if v_existing.purchase_money_evidence_id is not distinct from v_money.purchase_money_evidence_id
       and v_existing.canonical_payment_evidence_id is not distinct from v_evidence.evidence_id
       and v_existing.purchase_attempt_id is not distinct from v_attempt.purchase_attempt_id
       and v_existing.creator_economic_identity_id is not distinct from v_profile.economic_identity_id
       and v_existing.creator_profile_id is not distinct from v_profile.id
       and v_existing.runtime_product_id is not distinct from v_attempt.runtime_product_id
       and v_existing.policy_product_id is not distinct from v_attempt.policy_product_id
       and v_existing.conversion_kind is not distinct from v_attempt.conversion_kind
       and v_existing.attribution_policy_version is not distinct from v_attempt.attribution_policy_version
       and v_existing.creator_terms_version is not distinct from v_eligibility.terms_version
       and v_existing.eligible_product_policy_version = v_eligible_product_policy_version
       and v_existing.financial_policy_version = v_financial_policy_version
       and v_existing.calculation_version = v_calculation_version
       and v_existing.rate_schedule_version = v_rate_schedule_version
       and v_existing.canonical_payment_succeeded_at_ms is not distinct from v_evidence.canonical_event_created_at_ms
       and v_existing.creator_first_final_approved_at_ms is not distinct from v_approval_ms
       and v_existing.commission_rate_basis_points is not distinct from v_rate_bps
       and v_existing.gross_customer_paid_jpy is not distinct from v_money.gross_customer_paid_jpy
       and v_existing.discount_amount_jpy is not distinct from v_money.discount_amount_jpy
       and v_existing.discount_state is not distinct from v_money.discount_state
       and v_existing.authoritative_tax_amount_present is not distinct from v_money.authoritative_tax_amount_present
       and v_existing.authoritative_purchase_tax_amount_jpy is not distinct from v_money.authoritative_purchase_tax_amount_jpy
       and v_existing.tax_rate_bps = v_tax_rate_bps
       and v_existing.commission_base_tax_exclusion_jpy is not distinct from v_tax_exclusion
       and v_existing.immediately_ineligible_amount_jpy = 0
       and v_existing.commissionable_revenue_jpy is not distinct from v_commissionable
       and v_existing.commission_delta_jpy is not distinct from v_commission
       and v_existing.entitlement_after_event_jpy is not distinct from v_commission
       and v_existing.release_at_ms is not distinct from v_release_at_ms then
      return jsonb_build_object(
        'ok', true,
        'status', 'succeeded',
        'outcome', 'CONVERGED',
        'commission_event_id', v_existing.commission_event_id
      );
    end if;
    raise exception 'COMMISSION_PAYLOAD_CONFLICT';
end
$fn$;

create function public.m55_r6_reconcile_commission_v1(
  p_payment_intent_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_origin public.m55_r6_commission_ledger_events%rowtype;
  v_current_epoch_ms bigint;
  v_current_lifecycle text;
  v_target_lifecycle text;
  v_current_entitlement bigint;
  v_target_entitlement bigint;
  v_delta bigint;
  v_aggregate_delta bigint;
  v_effective_reversal bigint := 0;
  v_refund_total bigint := 0;
  v_lost_dispute_total bigint := 0;
  v_overlap boolean := false;
  v_reversal_exceeds_gross boolean := false;
  v_has_active_dispute_hold boolean := false;
  v_has_unknown_dispute_hold boolean := false;
  v_has_objective_cancel boolean := false;
  v_objective_marker_exists boolean := false;
  v_has_active_hold boolean;
  v_has_positive_authority boolean;
  v_economic_terminal_reversed boolean := false;
  v_recorded boolean := false;
  v_held boolean := false;
  v_refund record;
  v_latest_dispute record;
  v_economic_source record;
  v_event_family text;
  v_canonical_state text;
  v_new_entitlement bigint;
  v_event_lifecycle_after text;
  v_state_event_family text;
  v_purchase_attempt_id uuid;
begin
  if p_payment_intent_id is null or char_length(p_payment_intent_id) = 0 then
    raise exception 'INVALID_INPUT';
  end if;

  select mapped.purchase_attempt_id
    into v_purchase_attempt_id
  from public.m55_r5_attribution_canonical_payment_evidence mapped
  where mapped.payment_intent_id = p_payment_intent_id;

  if not found then
    raise exception 'COMMISSION_SOURCE_NOT_FOUND';
  end if;

  perform 1
  from public.m55_r5_attribution_purchase_attempts attempt
  where attempt.purchase_attempt_id = v_purchase_attempt_id
  for key share;

  if not found then
    raise exception 'R6_PURCHASE_ATTEMPT_KEY_SHARE_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('m55_r6_commission:' || p_payment_intent_id, 0)
  );

  v_current_epoch_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;

  select *
    into v_origin
  from public.m55_r6_commission_ledger_events
  where provider = 'STRIPE'
    and payment_intent_id = p_payment_intent_id
    and event_family = 'COMMISSION_ACCRUED';

  if not found then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'NO_COMMISSION_ORIGIN'
    );
  end if;

  select snapshot.has_objective_cancel, snapshot.has_active_hold, snapshot.has_positive_authority
    into v_has_objective_cancel, v_has_active_hold, v_has_positive_authority
  from public.m55_r6_purchase_compliance_authority_snapshot_v1(v_origin.purchase_attempt_id) snapshot;

  v_current_lifecycle := public.m55_r6_latest_lifecycle_state_v1(v_origin.commission_event_id);
  v_current_entitlement := public.m55_r6_sum_economic_entitlement_v1(v_origin.commission_event_id);

  if v_has_objective_cancel then
    v_objective_marker_exists := exists (
      select 1
      from public.m55_r6_commission_ledger_events e
      where e.origin_commission_event_id = v_origin.commission_event_id
        and e.event_family = 'COMMISSION_REVERSED'
        and e.reason_code = 'AUTO_CANCEL_OBJECTIVE'
        and e.lifecycle_state_after_event = 'COMMISSION_REVERSED'
    );
    if v_objective_marker_exists then
      if v_current_entitlement <> 0 then
        raise exception 'R6_OBJECTIVE_TERMINAL_ENTITLEMENT_INVARIANT_VIOLATION';
      end if;
    else
      if v_current_entitlement < 0 then
        raise exception 'R6_OBJECTIVE_TERMINAL_ENTITLEMENT_INVARIANT_VIOLATION';
      end if;
      v_delta := -v_current_entitlement;
      perform public.m55_r6_insert_ledger_event_v1(
        v_origin.commission_event_id,
        'COMMISSION_REVERSED',
        'COMMISSION_REVERSED',
        'COMMISSION_REVERSED',
        v_origin.provider,
        v_origin.payment_intent_id,
        v_origin.purchase_money_evidence_id,
        v_origin.canonical_payment_evidence_id,
        v_origin.purchase_attempt_id,
        v_origin.creator_economic_identity_id,
        v_origin.creator_profile_id,
        v_origin.runtime_product_id,
        v_origin.policy_product_id,
        v_origin.conversion_kind,
        v_origin.attribution_policy_version,
        v_origin.creator_terms_version,
        v_origin.eligible_product_policy_version,
        v_origin.financial_policy_version,
        v_origin.calculation_version,
        v_origin.rate_schedule_version,
        v_origin.canonical_payment_succeeded_at_ms,
        v_origin.creator_first_final_approved_at_ms,
        v_origin.commission_rate_basis_points,
        v_origin.gross_customer_paid_jpy,
        v_origin.discount_amount_jpy,
        v_origin.discount_state,
        v_origin.authoritative_tax_amount_present,
        v_origin.authoritative_purchase_tax_amount_jpy,
        v_origin.tax_rate_bps,
        v_origin.commission_base_tax_exclusion_jpy,
        v_origin.immediately_ineligible_amount_jpy,
        v_origin.commissionable_revenue_jpy,
        v_delta,
        0,
        v_origin.release_at_ms,
        null,
        null,
        null,
        'AUTO_CANCEL_OBJECTIVE'
      );
      v_recorded := true;
    end if;
    v_current_lifecycle := public.m55_r6_latest_lifecycle_state_v1(v_origin.commission_event_id);
    v_current_entitlement := public.m55_r6_sum_economic_entitlement_v1(v_origin.commission_event_id);
  end if;

  for v_refund in
    with latest_refunds as (
      select distinct on (r.provider_refund_id)
        r.provider_refund_id,
        r.stripe_event_created_at_ms,
        r.stripe_event_id,
        r.refund_status,
        r.amount_jpy
      from public.m55_r6_refund_economic_evidence r
      where r.payment_intent_id = p_payment_intent_id
      order by
        r.provider_refund_id,
        r.stripe_event_created_at_ms desc,
        r.stripe_event_id desc
    )
    select *
    from latest_refunds
    where refund_status = 'succeeded'
    order by
      stripe_event_created_at_ms asc,
      stripe_event_id asc,
      provider_refund_id asc
  loop
    v_refund_total := v_refund_total + v_refund.amount_jpy;
  end loop;

  for v_latest_dispute in
    select distinct on (d.provider_dispute_id)
      d.provider_dispute_id,
      d.stripe_event_type,
      d.stripe_event_created_at_ms,
      d.stripe_event_id,
      d.dispute_status,
      d.amount_jpy
    from public.m55_r6_dispute_economic_evidence d
    where d.payment_intent_id = p_payment_intent_id
    order by
      d.provider_dispute_id,
      d.stripe_event_created_at_ms desc,
      d.stripe_event_id desc
  loop
    case public.m55_r6_classify_dispute_authority_v1(
      v_latest_dispute.stripe_event_type,
      v_latest_dispute.dispute_status
    )
      when 'ACTIVE_HOLD' then
        v_has_active_dispute_hold := true;
      when 'UNKNOWN_CLOSED_HOLD' then
        v_has_unknown_dispute_hold := true;
      when 'DISPUTE_LOST' then
        v_lost_dispute_total := v_lost_dispute_total + v_latest_dispute.amount_jpy;
      else
        null;
    end case;
  end loop;

  v_overlap := v_refund_total > 0 and v_lost_dispute_total > 0;

  if v_refund_total > v_origin.gross_customer_paid_jpy
     or v_lost_dispute_total > v_origin.gross_customer_paid_jpy then
    v_held := true;
    v_reversal_exceeds_gross := true;
  elsif v_overlap then
    v_held := true;
  else
    if v_lost_dispute_total > 0 then
      v_effective_reversal := v_lost_dispute_total;
    elsif v_refund_total > 0 then
      v_effective_reversal := v_refund_total;
    else
      v_effective_reversal := 0;
    end if;

    v_current_entitlement := public.m55_r6_sum_economic_entitlement_v1(v_origin.commission_event_id);
    if v_has_objective_cancel then
      v_target_entitlement := 0;
    else
      v_target_entitlement := public.m55_r6_compute_target_entitlement_v1(
        v_origin.gross_customer_paid_jpy,
        v_origin.authoritative_tax_amount_present,
        coalesce(v_origin.authoritative_purchase_tax_amount_jpy, 0),
        v_origin.tax_rate_bps,
        v_origin.commission_rate_basis_points,
        v_effective_reversal
      );
    end if;
    v_aggregate_delta := v_target_entitlement - v_current_entitlement;
    v_economic_terminal_reversed := not v_has_objective_cancel
      and v_target_entitlement = 0
      and v_effective_reversal > 0;

    for v_economic_source in
      with latest_refunds as (
        select distinct on (r.provider_refund_id)
          r.provider_refund_id,
          r.stripe_event_created_at_ms,
          r.stripe_event_id,
          r.refund_status,
          r.amount_jpy
        from public.m55_r6_refund_economic_evidence r
        where r.payment_intent_id = p_payment_intent_id
        order by
          r.provider_refund_id,
          r.stripe_event_created_at_ms desc,
          r.stripe_event_id desc
      ),
      latest_disputes as (
        select distinct on (d.provider_dispute_id)
          d.provider_dispute_id,
          d.stripe_event_type,
          d.stripe_event_created_at_ms,
          d.stripe_event_id,
          d.dispute_status,
          d.amount_jpy
        from public.m55_r6_dispute_economic_evidence d
        where d.payment_intent_id = p_payment_intent_id
        order by
          d.provider_dispute_id,
          d.stripe_event_created_at_ms desc,
          d.stripe_event_id desc
      ),
      missing_refunds as (
        select
          'REFUND'::text as source_economic_object_type,
          lr.provider_refund_id as source_economic_object_id,
          'REFUND_SUCCEEDED'::text as economic_transition,
          lr.stripe_event_created_at_ms,
          lr.stripe_event_id
        from latest_refunds lr
        where lr.refund_status = 'succeeded'
          and not exists (
            select 1
            from public.m55_r6_commission_ledger_events e
            where e.provider = 'STRIPE'
              and e.source_economic_object_type = 'REFUND'
              and e.source_economic_object_id = lr.provider_refund_id
              and e.economic_transition = 'REFUND_SUCCEEDED'
          )
      ),
      missing_disputes as (
        select
          'DISPUTE'::text as source_economic_object_type,
          ld.provider_dispute_id as source_economic_object_id,
          'DISPUTE_LOST'::text as economic_transition,
          ld.stripe_event_created_at_ms,
          ld.stripe_event_id
        from latest_disputes ld
        where public.m55_r6_classify_dispute_authority_v1(
          ld.stripe_event_type,
          ld.dispute_status
        ) = 'DISPUTE_LOST'
          and not exists (
            select 1
            from public.m55_r6_commission_ledger_events e
            where e.provider = 'STRIPE'
              and e.source_economic_object_type = 'DISPUTE'
              and e.source_economic_object_id = ld.provider_dispute_id
              and e.economic_transition = 'DISPUTE_LOST'
          )
      ),
      combined as (
        select * from missing_refunds
        union all
        select * from missing_disputes
      ),
      numbered as (
        select
          c.source_economic_object_type,
          c.source_economic_object_id,
          c.economic_transition,
          c.stripe_event_created_at_ms,
          c.stripe_event_id,
          count(*) over () as total_missing,
          row_number() over (
            order by
              c.stripe_event_created_at_ms asc,
              c.stripe_event_id asc,
              c.source_economic_object_type asc,
              c.source_economic_object_id asc
          ) as source_ordinal
        from combined c
      )
      select * from numbered
      order by source_ordinal
    loop
      v_current_lifecycle := public.m55_r6_latest_lifecycle_state_v1(v_origin.commission_event_id);
      v_current_entitlement := public.m55_r6_sum_economic_entitlement_v1(v_origin.commission_event_id);

      if v_economic_source.source_ordinal = v_economic_source.total_missing
         and v_aggregate_delta <> 0 then
        v_delta := v_aggregate_delta;
        v_event_family := public.m55_r6_classify_economic_event_family_v1(
          v_current_lifecycle,
          v_delta,
          v_target_entitlement
        );
        v_canonical_state := case v_event_family
          when 'COMMISSION_REVERSED' then 'COMMISSION_REVERSED'
          when 'CLAWBACK_ACCRUED' then 'COMMISSION_ADJUSTED'
          else 'COMMISSION_ADJUSTED'
        end;
        v_new_entitlement := v_current_entitlement + v_delta;
      else
        v_delta := 0;
        v_event_family := 'COMMISSION_ADJUSTED';
        v_canonical_state := 'COMMISSION_ADJUSTED';
        v_new_entitlement := v_current_entitlement;
      end if;

      if v_has_objective_cancel
         or (v_new_entitlement = 0 and v_effective_reversal > 0) then
        v_event_lifecycle_after := 'COMMISSION_REVERSED';
      else
        v_event_lifecycle_after := v_current_lifecycle;
      end if;

      perform public.m55_r6_insert_ledger_event_v1(
        v_origin.commission_event_id,
        v_event_family,
        v_canonical_state,
        v_event_lifecycle_after,
        v_origin.provider,
        v_origin.payment_intent_id,
        v_origin.purchase_money_evidence_id,
        v_origin.canonical_payment_evidence_id,
        v_origin.purchase_attempt_id,
        v_origin.creator_economic_identity_id,
        v_origin.creator_profile_id,
        v_origin.runtime_product_id,
        v_origin.policy_product_id,
        v_origin.conversion_kind,
        v_origin.attribution_policy_version,
        v_origin.creator_terms_version,
        v_origin.eligible_product_policy_version,
        v_origin.financial_policy_version,
        v_origin.calculation_version,
        v_origin.rate_schedule_version,
        v_origin.canonical_payment_succeeded_at_ms,
        v_origin.creator_first_final_approved_at_ms,
        v_origin.commission_rate_basis_points,
        v_origin.gross_customer_paid_jpy,
        v_origin.discount_amount_jpy,
        v_origin.discount_state,
        v_origin.authoritative_tax_amount_present,
        v_origin.authoritative_purchase_tax_amount_jpy,
        v_origin.tax_rate_bps,
        v_origin.commission_base_tax_exclusion_jpy,
        v_origin.immediately_ineligible_amount_jpy,
        v_origin.commissionable_revenue_jpy,
        v_delta,
        v_new_entitlement,
        v_origin.release_at_ms,
        v_economic_source.source_economic_object_type,
        v_economic_source.source_economic_object_id,
        v_economic_source.economic_transition,
        v_economic_source.economic_transition
      );
      v_recorded := true;
    end loop;
  end if;

  for v_latest_dispute in
    select distinct on (d.provider_dispute_id)
      d.provider_dispute_id,
      d.stripe_event_type,
      d.stripe_event_created_at_ms,
      d.stripe_event_id,
      d.dispute_status,
      d.amount_jpy
    from public.m55_r6_dispute_economic_evidence d
    where d.payment_intent_id = p_payment_intent_id
    order by
      d.provider_dispute_id,
      d.stripe_event_created_at_ms desc,
      d.stripe_event_id desc
  loop
    case public.m55_r6_classify_dispute_authority_v1(
      v_latest_dispute.stripe_event_type,
      v_latest_dispute.dispute_status
    )
      when 'ACTIVE_HOLD' then
        if not exists (
          select 1
          from public.m55_r6_commission_ledger_events e
          where e.origin_commission_event_id = v_origin.commission_event_id
            and e.source_economic_object_type = 'DISPUTE'
            and e.source_economic_object_id = v_latest_dispute.provider_dispute_id
            and e.economic_transition = 'DISPUTE_HOLD_STARTED'
        ) then
          perform public.m55_r6_insert_ledger_event_v1(
            v_origin.commission_event_id,
            'COMMISSION_HELD',
            'COMMISSION_HOLD',
            'COMMISSION_HOLD',
            v_origin.provider,
            v_origin.payment_intent_id,
            v_origin.purchase_money_evidence_id,
            v_origin.canonical_payment_evidence_id,
            v_origin.purchase_attempt_id,
            v_origin.creator_economic_identity_id,
            v_origin.creator_profile_id,
            v_origin.runtime_product_id,
            v_origin.policy_product_id,
            v_origin.conversion_kind,
            v_origin.attribution_policy_version,
            v_origin.creator_terms_version,
            v_origin.eligible_product_policy_version,
            v_origin.financial_policy_version,
            v_origin.calculation_version,
            v_origin.rate_schedule_version,
            v_origin.canonical_payment_succeeded_at_ms,
            v_origin.creator_first_final_approved_at_ms,
            v_origin.commission_rate_basis_points,
            v_origin.gross_customer_paid_jpy,
            v_origin.discount_amount_jpy,
            v_origin.discount_state,
            v_origin.authoritative_tax_amount_present,
            v_origin.authoritative_purchase_tax_amount_jpy,
            v_origin.tax_rate_bps,
            v_origin.commission_base_tax_exclusion_jpy,
            v_origin.immediately_ineligible_amount_jpy,
            v_origin.commissionable_revenue_jpy,
            0,
            public.m55_r6_sum_economic_entitlement_v1(v_origin.commission_event_id),
            v_origin.release_at_ms,
            'DISPUTE',
            v_latest_dispute.provider_dispute_id,
            'DISPUTE_HOLD_STARTED',
            'DISPUTE_HOLD_STARTED'
          );
          v_recorded := true;
        end if;
      when 'HOLD_RELEASE_CANDIDATE', 'DISPUTE_WON' then
        if not exists (
          select 1
          from public.m55_r6_commission_ledger_events e
          where e.origin_commission_event_id = v_origin.commission_event_id
            and e.source_economic_object_type = 'DISPUTE'
            and e.source_economic_object_id = v_latest_dispute.provider_dispute_id
            and e.economic_transition = case
              when public.m55_r6_classify_dispute_authority_v1(
                v_latest_dispute.stripe_event_type,
                v_latest_dispute.dispute_status
              ) = 'DISPUTE_WON' then 'DISPUTE_WON'
              else 'DISPUTE_HOLD_RELEASED'
            end
        ) then
          perform public.m55_r6_insert_ledger_event_v1(
            v_origin.commission_event_id,
            'COMMISSION_RELEASED',
            'COMMISSION_HOLD',
            public.m55_r6_latest_lifecycle_state_v1(v_origin.commission_event_id),
            v_origin.provider,
            v_origin.payment_intent_id,
            v_origin.purchase_money_evidence_id,
            v_origin.canonical_payment_evidence_id,
            v_origin.purchase_attempt_id,
            v_origin.creator_economic_identity_id,
            v_origin.creator_profile_id,
            v_origin.runtime_product_id,
            v_origin.policy_product_id,
            v_origin.conversion_kind,
            v_origin.attribution_policy_version,
            v_origin.creator_terms_version,
            v_origin.eligible_product_policy_version,
            v_origin.financial_policy_version,
            v_origin.calculation_version,
            v_origin.rate_schedule_version,
            v_origin.canonical_payment_succeeded_at_ms,
            v_origin.creator_first_final_approved_at_ms,
            v_origin.commission_rate_basis_points,
            v_origin.gross_customer_paid_jpy,
            v_origin.discount_amount_jpy,
            v_origin.discount_state,
            v_origin.authoritative_tax_amount_present,
            v_origin.authoritative_purchase_tax_amount_jpy,
            v_origin.tax_rate_bps,
            v_origin.commission_base_tax_exclusion_jpy,
            v_origin.immediately_ineligible_amount_jpy,
            v_origin.commissionable_revenue_jpy,
            0,
            public.m55_r6_sum_economic_entitlement_v1(v_origin.commission_event_id),
            v_origin.release_at_ms,
            'DISPUTE',
            v_latest_dispute.provider_dispute_id,
            case
              when public.m55_r6_classify_dispute_authority_v1(
                v_latest_dispute.stripe_event_type,
                v_latest_dispute.dispute_status
              ) = 'DISPUTE_WON' then 'DISPUTE_WON'
              else 'DISPUTE_HOLD_RELEASED'
            end,
            case
              when public.m55_r6_classify_dispute_authority_v1(
                v_latest_dispute.stripe_event_type,
                v_latest_dispute.dispute_status
              ) = 'DISPUTE_WON' then 'DISPUTE_WON'
              else 'DISPUTE_HOLD_RELEASED'
            end
          );
          v_recorded := true;
        end if;
      else
        null;
    end case;
  end loop;

  v_current_lifecycle := public.m55_r6_latest_lifecycle_state_v1(v_origin.commission_event_id);
  v_current_entitlement := public.m55_r6_sum_economic_entitlement_v1(v_origin.commission_event_id);

  v_economic_terminal_reversed := not v_has_objective_cancel
    and v_current_entitlement = 0
    and v_effective_reversal > 0;

  if v_has_objective_cancel then
    v_target_lifecycle := 'COMMISSION_REVERSED';
  elsif v_economic_terminal_reversed then
    v_target_lifecycle := 'COMMISSION_REVERSED';
  elsif v_overlap then
    v_target_lifecycle := 'COMMISSION_HOLD';
    v_held := true;
  elsif v_held or v_has_unknown_dispute_hold or v_has_active_dispute_hold or v_has_active_hold then
    v_target_lifecycle := 'COMMISSION_HOLD';
    if v_overlap then
      v_held := true;
    end if;
  elsif not v_has_positive_authority then
    if v_current_lifecycle = 'COMMISSION_HOLD' then
      v_target_lifecycle := 'COMMISSION_HOLD';
    else
      v_target_lifecycle := 'COMMISSION_PENDING_COMPLIANCE_REVIEW';
    end if;
  elsif v_current_epoch_ms < v_origin.release_at_ms then
    v_target_lifecycle := 'COMMISSION_PENDING_COMPLIANCE_REVIEW';
  else
    v_target_lifecycle := 'COMMISSION_PAYABLE';
  end if;

  if v_target_lifecycle = 'COMMISSION_REVERSED'
     and v_current_lifecycle is distinct from 'COMMISSION_REVERSED' then
    raise exception 'R6_TERMINAL_LIFECYCLE_INVARIANT_VIOLATION';
  end if;

  if v_target_lifecycle is distinct from v_current_lifecycle then
    v_state_event_family := case v_target_lifecycle
      when 'COMMISSION_HOLD' then 'COMMISSION_HELD'
      when 'COMMISSION_PAYABLE' then 'COMMISSION_PAYABLE'
      else
        case
          when v_current_lifecycle = 'COMMISSION_HOLD'
               and v_target_lifecycle = 'COMMISSION_PENDING_COMPLIANCE_REVIEW' then
            'COMMISSION_RELEASED'
          else
            'COMMISSION_HELD'
        end
    end;

    if v_state_event_family in ('COMMISSION_HELD', 'COMMISSION_RELEASED', 'COMMISSION_PAYABLE') then
      perform public.m55_r6_insert_ledger_event_v1(
        v_origin.commission_event_id,
        v_state_event_family,
        case
          when v_target_lifecycle = 'COMMISSION_PAYABLE' then 'COMMISSION_PAYABLE'
          when v_target_lifecycle = 'COMMISSION_HOLD' then 'COMMISSION_HOLD'
          else 'COMMISSION_PENDING_COMPLIANCE_REVIEW'
        end,
        v_target_lifecycle,
        v_origin.provider,
        v_origin.payment_intent_id,
        v_origin.purchase_money_evidence_id,
        v_origin.canonical_payment_evidence_id,
        v_origin.purchase_attempt_id,
        v_origin.creator_economic_identity_id,
        v_origin.creator_profile_id,
        v_origin.runtime_product_id,
        v_origin.policy_product_id,
        v_origin.conversion_kind,
        v_origin.attribution_policy_version,
        v_origin.creator_terms_version,
        v_origin.eligible_product_policy_version,
        v_origin.financial_policy_version,
        v_origin.calculation_version,
        v_origin.rate_schedule_version,
        v_origin.canonical_payment_succeeded_at_ms,
        v_origin.creator_first_final_approved_at_ms,
        v_origin.commission_rate_basis_points,
        v_origin.gross_customer_paid_jpy,
        v_origin.discount_amount_jpy,
        v_origin.discount_state,
        v_origin.authoritative_tax_amount_present,
        v_origin.authoritative_purchase_tax_amount_jpy,
        v_origin.tax_rate_bps,
        v_origin.commission_base_tax_exclusion_jpy,
        v_origin.immediately_ineligible_amount_jpy,
        v_origin.commissionable_revenue_jpy,
        0,
        public.m55_r6_sum_economic_entitlement_v1(v_origin.commission_event_id),
        v_origin.release_at_ms,
        null,
        null,
        null,
        case
          when v_reversal_exceeds_gross then 'ECONOMIC_REVERSAL_EXCEEDS_ORIGINAL_GROSS'
          when v_overlap then 'ECONOMIC_OVERLAP_RECONCILIATION_REQUIRED'
          when v_has_unknown_dispute_hold then 'DISPUTE_AUTHORITY_UNKNOWN'
          when v_has_active_dispute_hold then 'DISPUTE_HOLD_ACTIVE'
          when v_has_active_hold then 'COMPLIANCE_HOLD_ACTIVE'
          when v_target_lifecycle = 'COMMISSION_PAYABLE' then 'RELEASE_AT_ELAPSED'
          when v_target_lifecycle = 'COMMISSION_PENDING_COMPLIANCE_REVIEW' then 'COMPLIANCE_PENDING'
          else 'LIFECYCLE_TRANSITION'
        end
      );
      v_recorded := true;
    end if;
  end if;

  if v_recorded then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'RECORDED'
    );
  end if;

  if v_held or v_overlap then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'HELD'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', 'succeeded',
    'outcome', 'NO_CHANGE'
  );
end
$fn$;

create function public.m55_r6_reconcile_due_commissions_v1(
  p_limit integer default 100
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_limit integer;
  v_current_epoch_ms bigint;
  v_origin record;
  v_result jsonb;
  v_any_recorded boolean := false;
  v_any_change boolean := false;
  v_outcome text;
  v_recorded_origin_count integer := 0;
  v_scanned_origin_count integer := 0;
begin
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'INVALID_INPUT';
  end if;

  v_limit := p_limit;
  v_current_epoch_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;

  for v_origin in
    select
      a.commission_event_id,
      a.payment_intent_id,
      a.ledger_event_seq
    from public.m55_r6_commission_ledger_events a
    where a.event_family = 'COMMISSION_ACCRUED'
      and a.release_at_ms <= v_current_epoch_ms
      and public.m55_r6_latest_lifecycle_state_v1(a.commission_event_id) <> 'COMMISSION_REVERSED'
    order by a.release_at_ms asc, a.ledger_event_seq asc
  loop
    v_scanned_origin_count := v_scanned_origin_count + 1;
    v_result := public.m55_r6_reconcile_commission_v1(v_origin.payment_intent_id);
    v_outcome := v_result ->> 'outcome';
    if v_outcome = 'RECORDED' then
      v_any_recorded := true;
      v_any_change := true;
      v_recorded_origin_count := v_recorded_origin_count + 1;
      if v_recorded_origin_count >= v_limit then
        exit;
      end if;
    elsif v_outcome in ('CONVERGED', 'HELD', 'NO_COMMISSION_ORIGIN') then
      v_any_change := true;
    elsif v_outcome = 'NO_CHANGE' then
      null;
    end if;
  end loop;

  if v_any_recorded then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'RECORDED',
      'scanned_origin_count', v_scanned_origin_count,
      'recorded_origin_count', v_recorded_origin_count
    );
  end if;

  if v_any_change then
    return jsonb_build_object(
      'ok', true,
      'status', 'succeeded',
      'outcome', 'CONVERGED',
      'scanned_origin_count', v_scanned_origin_count,
      'recorded_origin_count', v_recorded_origin_count
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', 'succeeded',
    'outcome', 'NO_CHANGE',
    'scanned_origin_count', v_scanned_origin_count,
    'recorded_origin_count', v_recorded_origin_count
  );
end
$fn$;

revoke all on function public.m55_r6_floor_div_bigint_v1(bigint, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_floor_div_bigint_v1(bigint, bigint)
  to service_role;

revoke all on function public.m55_r6_derive_rate_bps_v1(bigint, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_derive_rate_bps_v1(bigint, bigint)
  to service_role;

revoke all on function public.m55_r6_compute_remaining_tax_exclusion_v1(bigint, boolean, bigint, integer, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_compute_remaining_tax_exclusion_v1(bigint, boolean, bigint, integer, bigint)
  to service_role;

revoke all on function public.m55_r6_compute_target_entitlement_v1(bigint, boolean, bigint, integer, integer, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_compute_target_entitlement_v1(bigint, boolean, bigint, integer, integer, bigint)
  to service_role;

revoke all on function public.m55_r6_sum_economic_entitlement_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_sum_economic_entitlement_v1(uuid)
  to service_role;

revoke all on function public.m55_r6_latest_lifecycle_state_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_latest_lifecycle_state_v1(uuid)
  to service_role;

revoke all on function public.m55_r6_has_purchase_objective_cancel_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_has_purchase_objective_cancel_v1(uuid)
  to service_role;

revoke all on function public.m55_r6_has_purchase_active_hold_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_has_purchase_active_hold_v1(uuid)
  to service_role;

revoke all on function public.m55_r6_has_purchase_positive_authority_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_has_purchase_positive_authority_v1(uuid)
  to service_role;

revoke all on function public.m55_r6_purchase_compliance_authority_snapshot_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_purchase_compliance_authority_snapshot_v1(uuid)
  to service_role;

revoke all on function public.m55_r6_lock_purchase_compliance_mutation_v1()
  from public, anon, authenticated, service_role;

revoke all on function public.m55_r6_classify_dispute_authority_v1(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_classify_dispute_authority_v1(text, text)
  to service_role;

revoke all on function public.m55_r6_classify_economic_event_family_v1(text, bigint, bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_classify_economic_event_family_v1(text, bigint, bigint)
  to service_role;

revoke all on function public.m55_r6_insert_ledger_event_v1(
  uuid, text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text, text, text, text, bigint, bigint, integer, bigint, bigint, text, boolean, bigint, integer, bigint, bigint, bigint, bigint, bigint, bigint, text, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_insert_ledger_event_v1(
  uuid, text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text, text, text, text, bigint, bigint, integer, bigint, bigint, text, boolean, bigint, integer, bigint, bigint, bigint, bigint, bigint, bigint, text, text, text, text
) to service_role;

revoke all on function public.m55_r6_record_original_commission_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_record_original_commission_v1(text)
  to service_role;

revoke all on function public.m55_r6_reconcile_commission_v1(text)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_reconcile_commission_v1(text)
  to service_role;

revoke all on function public.m55_r6_reconcile_due_commissions_v1(integer)
  from public, anon, authenticated, service_role;
grant execute on function public.m55_r6_reconcile_due_commissions_v1(integer)
  to service_role;
