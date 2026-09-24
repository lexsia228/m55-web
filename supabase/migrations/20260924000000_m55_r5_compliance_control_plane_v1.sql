-- R5 compliance control plane. Forward-only. Does not rewrite attribution winners.
-- Appeal submission deadline / Human SLA is deferred to Beta Terms freeze. No numeric SLA is stored.

create table public.m55_r5_compliance_contents (
  content_id uuid primary key default gen_random_uuid(),
  creator_economic_identity_id uuid not null
    references public.m55_creator_profiles (economic_identity_id),
  platform_source text not null check (char_length(platform_source) between 1 and 80),
  source_locator text not null check (char_length(source_locator) between 1 and 2000),
  created_at timestamptz not null default now(),
  registered_at timestamptz not null default now(),
  unique (creator_economic_identity_id, platform_source, source_locator)
);

create table public.m55_r5_compliance_content_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.m55_r5_compliance_contents (content_id),
  observation_kind text not null check (observation_kind in ('PRESENT', 'REMOVED')),
  body_text text null check (body_text is null or char_length(body_text) <= 8000),
  content_fingerprint text not null check (content_fingerprint ~ '^[0-9a-f]{64}$'),
  observed_version integer not null check (observed_version > 0),
  disclosure_state text not null check (disclosure_state in ('PRESENT', 'MISSING', 'UNKNOWN')),
  claim_scan_state text not null check (claim_scan_state in ('CLEAN', 'PROHIBITED_MATCH', 'UNKNOWN')),
  observed_at timestamptz not null default now(),
  unique (content_id, observed_version)
);

create table public.m55_r5_compliance_graph_nodes (
  node_id uuid primary key default gen_random_uuid(),
  node_kind text not null check (node_kind in (
    'CREATOR', 'REFERRAL_LINK', 'TOUCH', 'BUYER', 'DEVICE_CLUSTER', 'PAYMENT_IDENTITY', 'PURCHASE'
  )),
  opaque_ref text not null check (
    opaque_ref ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or opaque_ref ~ '^[0-9a-f]{64}$'
  ),
  observed_at timestamptz not null default now(),
  unique (node_kind, opaque_ref)
);

create table public.m55_r5_compliance_graph_edges (
  edge_id uuid primary key default gen_random_uuid(),
  from_node_id uuid not null references public.m55_r5_compliance_graph_nodes (node_id),
  to_node_id uuid not null references public.m55_r5_compliance_graph_nodes (node_id),
  creator_economic_identity_id uuid not null
    references public.m55_creator_profiles (economic_identity_id),
  purchase_attempt_id uuid not null
    references public.m55_r5_attribution_purchase_attempts (purchase_attempt_id),
  relation_class text not null check (relation_class in ('OBJECTIVE', 'HEURISTIC_RISK')),
  risk_signal_class text null check (
    risk_signal_class is null or risk_signal_class in (
      'SAME_IP', 'SAME_DEVICE', 'SAME_ADDRESS', 'SAME_SURNAME', 'HIGH_VELOCITY',
      'ACCOUNT_CREATION_BURST', 'DEVICE_CLUSTER', 'PAYMENT_CLUSTER', 'UNUSUAL_GEOGRAPHIC_PATTERN'
    )
  ),
  objective_reason_code text null,
  evidence_reference text not null check (char_length(evidence_reference) between 1 and 200),
  observed_at timestamptz not null default now(),
  constraint m55_r5_compliance_edge_class_chk check (
    (
      relation_class = 'OBJECTIVE'
      and risk_signal_class is null
      and objective_reason_code in (
        'CONFIRMED_SELF_REFERRAL', 'CONFIRMED_CIRCULAR_ABUSE',
        'DUPLICATE_ATTRIBUTION', 'NONEXISTENT_OR_FAILED_PAYMENT'
      )
    )
    or (
      relation_class = 'HEURISTIC_RISK'
      and risk_signal_class is not null
      and objective_reason_code is null
    )
  )
);

create unique index m55_r5_compliance_graph_edges_dedupe
  on public.m55_r5_compliance_graph_edges (
    creator_economic_identity_id,
    purchase_attempt_id,
    from_node_id,
    to_node_id,
    relation_class,
    coalesce(risk_signal_class, ''),
    coalesce(objective_reason_code, ''),
    evidence_reference
  );

create table public.m55_r5_compliance_decisions (
  decision_id uuid primary key default gen_random_uuid(),
  creator_economic_identity_id uuid not null
    references public.m55_creator_profiles (economic_identity_id),
  purchase_attempt_id uuid null
    references public.m55_r5_attribution_purchase_attempts (purchase_attempt_id),
  content_id uuid null references public.m55_r5_compliance_contents (content_id),
  case_id uuid null,
  disposition text not null check (disposition in (
    'AUTO_PASS', 'AUTO_CANCEL_OBJECTIVE', 'AUTO_HOLD', 'HUMAN_EXCEPTION'
  )),
  reason_code text not null check (char_length(reason_code) between 1 and 80),
  rule_version text not null check (char_length(rule_version) between 1 and 80),
  evidence_reference text not null check (char_length(evidence_reference) between 1 and 200),
  decision_timestamp timestamptz not null default now(),
  reviewer_type text not null check (reviewer_type in ('MACHINE', 'HUMAN')),
  appeal_status text not null check (appeal_status in ('NONE', 'OPEN', 'RESOLVED'))
);

create table public.m55_r5_compliance_cases (
  case_id uuid primary key default gen_random_uuid(),
  creator_economic_identity_id uuid not null
    references public.m55_creator_profiles (economic_identity_id),
  case_kind text not null check (case_kind in ('APPEAL', 'DISCREPANCY', 'MACHINE_EXCEPTION')),
  adverse_decision_id uuid null references public.m55_r5_compliance_decisions (decision_id),
  content_id uuid null references public.m55_r5_compliance_contents (content_id),
  purchase_attempt_id uuid null
    references public.m55_r5_attribution_purchase_attempts (purchase_attempt_id),
  reason text not null check (char_length(reason) between 1 and 500),
  creator_evidence text not null check (char_length(creator_evidence) between 1 and 4000),
  machine_evidence text not null check (char_length(machine_evidence) between 1 and 4000),
  opened_at timestamptz not null default now(),
  status text not null check (status in ('OPEN', 'HOLD', 'RESOLVED')),
  decision text null check (decision is null or decision in (
    'KEEP_HOLD', 'REQUEST_CORRECTION', 'RELEASE', 'PAUSE_CREATOR', 'TERMINATE_PARTNERSHIP',
    'AUTO_RELEASE', 'SUPERSEDED_BY_NEW_MACHINE_DECISION', 'SUPERSEDED_BY_OBJECTIVE_DECISION'
  )),
  decision_reason text null check (decision_reason is null or char_length(decision_reason) between 1 and 500),
  resolved_at timestamptz null,
  constraint m55_r5_compliance_case_kind_chk check (
    (case_kind = 'APPEAL' and adverse_decision_id is not null)
    or (case_kind = 'DISCREPANCY' and adverse_decision_id is null)
    or (case_kind = 'MACHINE_EXCEPTION' and adverse_decision_id is not null)
  ),
  constraint m55_r5_compliance_case_resolved_at_chk check (
    (status in ('OPEN', 'HOLD') and resolved_at is null)
    or (status = 'RESOLVED' and resolved_at is not null)
  )
);

alter table public.m55_r5_compliance_decisions
  add constraint m55_r5_compliance_decisions_case_fk
  foreign key (case_id) references public.m55_r5_compliance_cases (case_id);

create unique index m55_r5_compliance_one_appeal_per_decision
  on public.m55_r5_compliance_cases (adverse_decision_id)
  where case_kind = 'APPEAL';

create unique index m55_r5_compliance_one_machine_exception_per_decision
  on public.m55_r5_compliance_cases (adverse_decision_id)
  where case_kind = 'MACHINE_EXCEPTION';

create table public.m55_r5_compliance_case_events (
  event_id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.m55_r5_compliance_cases (case_id),
  event_kind text not null check (event_kind in (
    'OPENED', 'CREATOR_CORRECTION', 'REVIEWER_ACTIVITY', 'RESOLUTION'
  )),
  actor_ref text not null check (actor_ref ~ '^[0-9a-f]{64}$' or actor_ref = 'MACHINE'),
  evidence text not null check (char_length(evidence) between 1 and 4000),
  created_at timestamptz not null default now()
);

create or replace function public.m55_r5_compliance_reject_mutation_v1()
returns trigger
language plpgsql
as $$
begin
  raise exception 'IMMUTABLE_ROW';
end;
$$;

create trigger m55_r5_compliance_snapshots_immutable
  before update or delete on public.m55_r5_compliance_content_snapshots
  for each row execute function public.m55_r5_compliance_reject_mutation_v1();

create trigger m55_r5_compliance_nodes_immutable
  before update or delete on public.m55_r5_compliance_graph_nodes
  for each row execute function public.m55_r5_compliance_reject_mutation_v1();

create trigger m55_r5_compliance_edges_immutable
  before update or delete on public.m55_r5_compliance_graph_edges
  for each row execute function public.m55_r5_compliance_reject_mutation_v1();

create trigger m55_r5_compliance_decisions_immutable
  before update or delete on public.m55_r5_compliance_decisions
  for each row execute function public.m55_r5_compliance_reject_mutation_v1();

create trigger m55_r5_compliance_case_events_immutable
  before update or delete on public.m55_r5_compliance_case_events
  for each row execute function public.m55_r5_compliance_reject_mutation_v1();

create or replace function public.m55_r5_compliance_decision_machine_evidence_v1(p_decision_id uuid)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_decision public.m55_r5_compliance_decisions%rowtype;
begin
  select * into v_decision
  from public.m55_r5_compliance_decisions
  where decision_id = p_decision_id;
  if not found then
    raise exception 'ADVERSE_DECISION_NOT_FOUND';
  end if;
  return format(
    'decision_id=%s|disposition=%s|reason_code=%s|rule_version=%s|evidence_reference=%s|decision_timestamp=%s|reviewer_type=%s|appeal_status=%s',
    v_decision.decision_id,
    v_decision.disposition,
    v_decision.reason_code,
    v_decision.rule_version,
    v_decision.evidence_reference,
    v_decision.decision_timestamp,
    v_decision.reviewer_type,
    v_decision.appeal_status
  );
end;
$$;

create or replace function public.m55_r5_compliance_case_transition_v1()
returns trigger
language plpgsql
as $$
declare
  v_actor text := current_setting('m55.compliance_actor_ref', true);
begin
  if old.creator_economic_identity_id is distinct from new.creator_economic_identity_id
     or old.case_kind is distinct from new.case_kind
     or old.adverse_decision_id is distinct from new.adverse_decision_id
     or old.content_id is distinct from new.content_id
     or old.purchase_attempt_id is distinct from new.purchase_attempt_id
     or old.reason is distinct from new.reason
     or old.creator_evidence is distinct from new.creator_evidence
     or old.machine_evidence is distinct from new.machine_evidence
     or old.opened_at is distinct from new.opened_at
     or old.case_id is distinct from new.case_id then
    raise exception 'CASE_HISTORY_IMMUTABLE';
  end if;
  if old.status = 'RESOLVED' then
    raise exception 'CASE_TERMINAL';
  end if;
  if new.status = old.status and new.status = 'HOLD' then
    null;
  elsif new.status = old.status then
    raise exception 'CASE_STATE_UNCHANGED';
  end if;
  if new.status not in ('OPEN', 'HOLD', 'RESOLVED') then
    raise exception 'CASE_STATUS_INVALID';
  end if;
  if old.status = 'OPEN' and new.status not in ('HOLD', 'RESOLVED') then
    raise exception 'CASE_TRANSITION_INVALID';
  end if;
  if old.status = 'HOLD' and new.status not in ('HOLD', 'RESOLVED') then
    raise exception 'CASE_TRANSITION_INVALID';
  end if;
  if new.status in ('OPEN', 'HOLD') and new.resolved_at is not null then
    raise exception 'RESOLVED_AT_INVALID';
  end if;
  if new.status = 'RESOLVED' then
    if new.resolved_at is null or new.decision is null or new.decision_reason is null then
      raise exception 'RESOLVED_FIELDS_REQUIRED';
    end if;
  end if;
  if v_actor is null or (v_actor <> 'MACHINE' and v_actor !~ '^[0-9a-f]{64}$') then
    raise exception 'REVIEWER_ACTOR_REF_REQUIRED';
  end if;
  insert into public.m55_r5_compliance_case_events (case_id, event_kind, actor_ref, evidence)
  values (
    new.case_id,
    case when new.status = 'RESOLVED' then 'RESOLUTION' else 'REVIEWER_ACTIVITY' end,
    v_actor,
    coalesce(new.decision_reason, new.status)
  );
  return new;
end;
$$;

create trigger m55_r5_compliance_cases_transition
  before update on public.m55_r5_compliance_cases
  for each row execute function public.m55_r5_compliance_case_transition_v1();

create or replace function public.m55_r5_compliance_assert_locator_v1(p_source_locator text)
returns void
language plpgsql
as $$
begin
  if p_source_locator !~ '^https://[A-Za-z0-9.-]+/' then
    raise exception 'SOURCE_LOCATOR_INVALID';
  end if;
  if position('@' in split_part(substr(p_source_locator, 9), '/', 1)) > 0
     or p_source_locator ~* 'localhost|127\.0\.0\.1|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|\[::1\]' then
    raise exception 'SOURCE_LOCATOR_INVALID';
  end if;
end;
$$;

create or replace function public.m55_r5_compliance_open_machine_exception_v1(p_decision_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_decision public.m55_r5_compliance_decisions%rowtype;
  v_case_id uuid;
  v_machine_evidence text;
begin
  select * into v_decision
  from public.m55_r5_compliance_decisions
  where decision_id = p_decision_id;
  if not found then
    raise exception 'ADVERSE_DECISION_NOT_FOUND';
  end if;
  if v_decision.disposition is distinct from 'AUTO_HOLD' then
    raise exception 'MACHINE_EXCEPTION_REQUIRES_HOLD';
  end if;
  select case_id into v_case_id
  from public.m55_r5_compliance_cases
  where case_kind = 'MACHINE_EXCEPTION'
    and adverse_decision_id = p_decision_id;
  if found then
    return v_case_id;
  end if;
  v_machine_evidence := public.m55_r5_compliance_decision_machine_evidence_v1(p_decision_id);
  insert into public.m55_r5_compliance_cases (
    creator_economic_identity_id, case_kind, adverse_decision_id, content_id, purchase_attempt_id,
    reason, creator_evidence, machine_evidence, status
  ) values (
    v_decision.creator_economic_identity_id, 'MACHINE_EXCEPTION', v_decision.decision_id,
    v_decision.content_id, v_decision.purchase_attempt_id,
    v_decision.reason_code, 'NO_CREATOR_EVIDENCE', v_machine_evidence, 'HOLD'
  ) returning case_id into v_case_id;
  insert into public.m55_r5_compliance_case_events (case_id, event_kind, actor_ref, evidence)
  values (v_case_id, 'OPENED', 'MACHINE', v_decision.reason_code);
  return v_case_id;
exception
  when unique_violation then
    select case_id into v_case_id
    from public.m55_r5_compliance_cases
    where case_kind = 'MACHINE_EXCEPTION'
      and adverse_decision_id = p_decision_id;
    if v_case_id is null then
      raise;
    end if;
    return v_case_id;
end;
$$;

create or replace function public.m55_r5_compliance_reconcile_machine_exceptions_v1(p_new_decision_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_decision public.m55_r5_compliance_decisions%rowtype;
  v_case public.m55_r5_compliance_cases%rowtype;
  v_decision_code text;
  v_reason text;
  v_count integer := 0;
begin
  select * into v_decision
  from public.m55_r5_compliance_decisions
  where decision_id = p_new_decision_id;
  if not found then
    raise exception 'ADVERSE_DECISION_NOT_FOUND';
  end if;
  if v_decision.reviewer_type is distinct from 'MACHINE' then
    raise exception 'MACHINE_DECISION_REQUIRED';
  end if;
  if v_decision.disposition = 'AUTO_PASS' then
    if v_decision.content_id is null then
      return 0;
    end if;
    v_decision_code := 'AUTO_RELEASE';
    v_reason := 'CURRENT_CONTENT_SNAPSHOT_PASSED';
  elsif v_decision.disposition = 'AUTO_HOLD' then
    v_decision_code := 'SUPERSEDED_BY_NEW_MACHINE_DECISION';
    if v_decision.content_id is not null then
      v_reason := 'NEWER_CONTENT_HOLD_DECISION';
    elsif v_decision.purchase_attempt_id is not null then
      v_reason := 'NEWER_FRAUD_HOLD_DECISION';
    else
      return 0;
    end if;
  elsif v_decision.disposition = 'AUTO_CANCEL_OBJECTIVE' then
    if v_decision.purchase_attempt_id is null then
      return 0;
    end if;
    v_decision_code := 'SUPERSEDED_BY_OBJECTIVE_DECISION';
    v_reason := 'OBJECTIVE_INVALIDITY_CONFIRMED';
  else
    return 0;
  end if;
  perform set_config('m55.compliance_actor_ref', 'MACHINE', true);
  for v_case in
    select c.*
    from public.m55_r5_compliance_cases c
    where c.case_kind = 'MACHINE_EXCEPTION'
      and c.status in ('OPEN', 'HOLD')
      and c.creator_economic_identity_id = v_decision.creator_economic_identity_id
      and c.adverse_decision_id is distinct from p_new_decision_id
      and (
        (v_decision.content_id is not null and c.content_id = v_decision.content_id)
        or (
          v_decision.content_id is null
          and v_decision.purchase_attempt_id is not null
          and c.purchase_attempt_id = v_decision.purchase_attempt_id
        )
      )
      and (
        v_decision.disposition = 'AUTO_CANCEL_OBJECTIVE'
        or c.decision is null
        or c.decision = 'REQUEST_CORRECTION'
      )
    order by c.opened_at asc, c.case_id asc
    for update
  loop
    update public.m55_r5_compliance_cases
    set status = 'RESOLVED',
        decision = v_decision_code,
        decision_reason = v_reason,
        resolved_at = now()
    where case_id = v_case.case_id
      and status in ('OPEN', 'HOLD');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.m55_r5_compliance_record_content_v1(
  p_creator_economic_identity_id uuid,
  p_content_id uuid,
  p_platform_source text,
  p_source_locator text,
  p_observation_kind text,
  p_body_text text,
  p_disclosure_state text,
  p_claim_scan_state text,
  p_disposition text,
  p_reason_code text,
  p_rule_version text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_content public.m55_r5_compliance_contents%rowtype;
  v_version integer;
  v_fingerprint text;
  v_snapshot_id uuid;
  v_decision_id uuid;
  v_machine_case uuid;
begin
  if p_disposition not in ('AUTO_PASS', 'AUTO_HOLD') then
    raise exception 'CONTENT_DISPOSITION_INVALID';
  end if;
  perform public.m55_r5_compliance_assert_locator_v1(p_source_locator);
  if p_content_id is null then
    insert into public.m55_r5_compliance_contents (
      creator_economic_identity_id, platform_source, source_locator
    ) values (
      p_creator_economic_identity_id, p_platform_source, p_source_locator
    )
    on conflict (creator_economic_identity_id, platform_source, source_locator)
    do nothing;
    select * into v_content
    from public.m55_r5_compliance_contents
    where creator_economic_identity_id = p_creator_economic_identity_id
      and platform_source = p_platform_source
      and source_locator = p_source_locator;
  else
    select * into v_content
    from public.m55_r5_compliance_contents
    where content_id = p_content_id
      and creator_economic_identity_id = p_creator_economic_identity_id;
    if not found then
      raise exception 'CONTENT_NOT_OWNED';
    end if;
  end if;
  select coalesce(max(observed_version), 0) + 1 into v_version
  from public.m55_r5_compliance_content_snapshots
  where content_id = v_content.content_id;
  v_fingerprint := encode(extensions.digest(convert_to(coalesce(p_body_text, ''), 'UTF8'), 'sha256'), 'hex');
  insert into public.m55_r5_compliance_content_snapshots (
    content_id, observation_kind, body_text, content_fingerprint, observed_version,
    disclosure_state, claim_scan_state
  ) values (
    v_content.content_id, p_observation_kind, p_body_text, v_fingerprint, v_version,
    p_disclosure_state, p_claim_scan_state
  ) returning snapshot_id into v_snapshot_id;
  insert into public.m55_r5_compliance_decisions (
    creator_economic_identity_id, content_id, disposition, reason_code, rule_version,
    evidence_reference, reviewer_type, appeal_status
  ) values (
    p_creator_economic_identity_id, v_content.content_id, p_disposition, p_reason_code, p_rule_version,
    v_snapshot_id::text, 'MACHINE', 'NONE'
  ) returning decision_id into v_decision_id;
  perform public.m55_r5_compliance_reconcile_machine_exceptions_v1(v_decision_id);
  v_machine_case := null;
  if p_disposition = 'AUTO_HOLD' then
    v_machine_case := public.m55_r5_compliance_open_machine_exception_v1(v_decision_id);
  end if;
  return jsonb_build_object(
    'ok', true,
    'content_id', v_content.content_id,
    'snapshot_id', v_snapshot_id,
    'decision_id', v_decision_id,
    'observed_version', v_version,
    'machine_exception_case_id', v_machine_case
  );
end;
$$;

create or replace function public.m55_r5_compliance_record_graph_edge_v1(
  p_creator_economic_identity_id uuid,
  p_purchase_attempt_id uuid,
  p_from_kind text,
  p_from_ref text,
  p_to_kind text,
  p_to_ref text,
  p_relation_class text,
  p_risk_signal_class text,
  p_objective_reason_code text,
  p_evidence_reference text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_from uuid;
  v_to uuid;
  v_edge uuid;
  v_attempt_creator uuid;
  v_from_ref text := lower(p_from_ref);
  v_to_ref text := lower(p_to_ref);
  v_uuid_re text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if not exists (
    select 1 from public.m55_creator_profiles
    where economic_identity_id = p_creator_economic_identity_id
  ) then
    raise exception 'CREATOR_NOT_FOUND';
  end if;
  select creator_economic_identity_id into v_attempt_creator
  from public.m55_r5_attribution_purchase_attempts
  where purchase_attempt_id = p_purchase_attempt_id;
  if not found then
    raise exception 'PURCHASE_NOT_FOUND';
  end if;
  if v_attempt_creator is not null and v_attempt_creator <> p_creator_economic_identity_id then
    raise exception 'PURCHASE_CREATOR_MISMATCH';
  end if;
  if p_from_ref ~* '^user_' or p_to_ref ~* '^user_'
     or (v_from_ref !~ v_uuid_re and v_from_ref !~ '^[0-9a-f]{64}$')
     or (v_to_ref !~ v_uuid_re and v_to_ref !~ '^[0-9a-f]{64}$') then
    raise exception 'OPAQUE_GRAPH_REF_REQUIRED';
  end if;
  if p_from_kind = 'CREATOR' and v_from_ref ~ v_uuid_re
     and v_from_ref is distinct from lower(p_creator_economic_identity_id::text) then
    raise exception 'GRAPH_NODE_SCOPE_MISMATCH';
  end if;
  if p_to_kind = 'CREATOR' and v_to_ref ~ v_uuid_re
     and v_to_ref is distinct from lower(p_creator_economic_identity_id::text) then
    raise exception 'GRAPH_NODE_SCOPE_MISMATCH';
  end if;
  if p_from_kind = 'PURCHASE' and v_from_ref ~ v_uuid_re
     and v_from_ref is distinct from lower(p_purchase_attempt_id::text) then
    raise exception 'GRAPH_NODE_SCOPE_MISMATCH';
  end if;
  if p_to_kind = 'PURCHASE' and v_to_ref ~ v_uuid_re
     and v_to_ref is distinct from lower(p_purchase_attempt_id::text) then
    raise exception 'GRAPH_NODE_SCOPE_MISMATCH';
  end if;
  if p_relation_class = 'OBJECTIVE' then
    if p_risk_signal_class is not null or p_objective_reason_code not in (
      'CONFIRMED_SELF_REFERRAL', 'CONFIRMED_CIRCULAR_ABUSE',
      'DUPLICATE_ATTRIBUTION', 'NONEXISTENT_OR_FAILED_PAYMENT'
    ) then
      raise exception 'GRAPH_EDGE_CLASS_MISMATCH';
    end if;
  elsif p_relation_class = 'HEURISTIC_RISK' then
    if p_objective_reason_code is not null or p_risk_signal_class is null or p_risk_signal_class not in (
      'SAME_IP', 'SAME_DEVICE', 'SAME_ADDRESS', 'SAME_SURNAME', 'HIGH_VELOCITY',
      'ACCOUNT_CREATION_BURST', 'DEVICE_CLUSTER', 'PAYMENT_CLUSTER', 'UNUSUAL_GEOGRAPHIC_PATTERN'
    ) then
      raise exception 'GRAPH_EDGE_CLASS_MISMATCH';
    end if;
  else
    raise exception 'GRAPH_EDGE_CLASS_MISMATCH';
  end if;
  insert into public.m55_r5_compliance_graph_nodes (node_kind, opaque_ref)
  values (p_from_kind, v_from_ref)
  on conflict (node_kind, opaque_ref) do nothing;
  select node_id into v_from
  from public.m55_r5_compliance_graph_nodes
  where node_kind = p_from_kind and opaque_ref = v_from_ref;
  insert into public.m55_r5_compliance_graph_nodes (node_kind, opaque_ref)
  values (p_to_kind, v_to_ref)
  on conflict (node_kind, opaque_ref) do nothing;
  select node_id into v_to
  from public.m55_r5_compliance_graph_nodes
  where node_kind = p_to_kind and opaque_ref = v_to_ref;
  insert into public.m55_r5_compliance_graph_edges (
    creator_economic_identity_id, purchase_attempt_id, from_node_id, to_node_id,
    relation_class, risk_signal_class, objective_reason_code, evidence_reference
  ) values (
    p_creator_economic_identity_id, p_purchase_attempt_id, v_from, v_to,
    p_relation_class, p_risk_signal_class, p_objective_reason_code, p_evidence_reference
  )
  on conflict do nothing;
  select edge_id into v_edge
  from public.m55_r5_compliance_graph_edges
  where creator_economic_identity_id = p_creator_economic_identity_id
    and purchase_attempt_id = p_purchase_attempt_id
    and from_node_id = v_from
    and to_node_id = v_to
    and relation_class = p_relation_class
    and coalesce(risk_signal_class, '') = coalesce(p_risk_signal_class, '')
    and coalesce(objective_reason_code, '') = coalesce(p_objective_reason_code, '')
    and evidence_reference = p_evidence_reference;
  return jsonb_build_object('ok', true, 'edge_id', v_edge);
end;
$$;

create or replace function public.m55_r5_compliance_record_decision_v1(
  p_creator_economic_identity_id uuid,
  p_purchase_attempt_id uuid,
  p_content_id uuid,
  p_case_id uuid,
  p_disposition text,
  p_reason_code text,
  p_rule_version text,
  p_evidence_reference text,
  p_reviewer_type text,
  p_appeal_status text,
  p_objective_proof boolean
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  if p_disposition = 'AUTO_CANCEL_OBJECTIVE' and p_objective_proof is distinct from true then
    raise exception 'OBJECTIVE_PROOF_REQUIRED';
  end if;
  if p_disposition = 'AUTO_CANCEL_OBJECTIVE' and p_reason_code not in (
    'CONFIRMED_SELF_REFERRAL', 'CONFIRMED_CIRCULAR_ABUSE', 'DUPLICATE_ATTRIBUTION', 'NONEXISTENT_OR_FAILED_PAYMENT'
  ) then
    raise exception 'OBJECTIVE_REASON_REQUIRED';
  end if;
  if p_purchase_attempt_id is not null and not exists (
    select 1 from public.m55_r5_attribution_purchase_attempts
    where purchase_attempt_id = p_purchase_attempt_id
      and creator_economic_identity_id = p_creator_economic_identity_id
  ) then
    raise exception 'PURCHASE_NOT_OWNED';
  end if;
  insert into public.m55_r5_compliance_decisions (
    creator_economic_identity_id, purchase_attempt_id, content_id, case_id, disposition,
    reason_code, rule_version, evidence_reference, reviewer_type, appeal_status
  ) values (
    p_creator_economic_identity_id, p_purchase_attempt_id, p_content_id, p_case_id, p_disposition,
    p_reason_code, p_rule_version, p_evidence_reference, p_reviewer_type, p_appeal_status
  ) returning decision_id into v_id;
  return jsonb_build_object('ok', true, 'decision_id', v_id, 'disposition', p_disposition);
end;
$$;

create or replace function public.m55_r5_compliance_decide_fraud_v1(
  p_creator_economic_identity_id uuid,
  p_purchase_attempt_id uuid,
  p_decision_required boolean
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_attempt_creator uuid;
  v_distinct integer;
  v_disposition text;
  v_reason text;
  v_evidence text;
  v_result jsonb;
  v_machine_case uuid;
begin
  if p_purchase_attempt_id is null then
    raise exception 'PURCHASE_ATTEMPT_REQUIRED';
  end if;
  if not exists (
    select 1 from public.m55_creator_profiles
    where economic_identity_id = p_creator_economic_identity_id
  ) then
    raise exception 'CREATOR_NOT_FOUND';
  end if;
  select creator_economic_identity_id into v_attempt_creator
  from public.m55_r5_attribution_purchase_attempts
  where purchase_attempt_id = p_purchase_attempt_id;
  if not found then
    raise exception 'PURCHASE_NOT_FOUND';
  end if;
  if v_attempt_creator is not null and v_attempt_creator <> p_creator_economic_identity_id then
    raise exception 'PURCHASE_CREATOR_MISMATCH';
  end if;
  select e.objective_reason_code, e.evidence_reference
  into v_reason, v_evidence
  from public.m55_r5_compliance_graph_edges e
  where e.creator_economic_identity_id = p_creator_economic_identity_id
    and e.purchase_attempt_id = p_purchase_attempt_id
    and e.relation_class = 'OBJECTIVE'
  order by e.observed_at asc, e.edge_id asc
  limit 1;
  if found then
    v_disposition := 'AUTO_CANCEL_OBJECTIVE';
  else
    select count(distinct e.risk_signal_class) into v_distinct
    from public.m55_r5_compliance_graph_edges e
    where e.creator_economic_identity_id = p_creator_economic_identity_id
      and e.purchase_attempt_id = p_purchase_attempt_id
      and e.relation_class = 'HEURISTIC_RISK';
    v_evidence := 'fraud_graph_scope:' || p_purchase_attempt_id::text;
    if v_distinct >= 2 then
      v_disposition := 'AUTO_HOLD';
      v_reason := 'MULTIPLE_HEURISTIC_RISK_SIGNALS';
    elsif p_decision_required is true then
      v_disposition := 'AUTO_HOLD';
      v_reason := case when v_distinct = 1 then 'SINGLE_HEURISTIC_SIGNAL_UNRESOLVED' else 'EVIDENCE_INCOMPLETE' end;
    else
      return jsonb_build_object('ok', true, 'outcome', 'NO_DISPOSITION', 'forfeiture', false);
    end if;
  end if;
  v_result := public.m55_r5_compliance_record_decision_v1(
    p_creator_economic_identity_id, p_purchase_attempt_id, null, null, v_disposition, v_reason,
    'm55.r5.compliance.fraud_graph.v1', v_evidence, 'MACHINE', 'NONE',
    v_disposition = 'AUTO_CANCEL_OBJECTIVE'
  );
  if v_disposition in ('AUTO_HOLD', 'AUTO_CANCEL_OBJECTIVE') then
    perform public.m55_r5_compliance_reconcile_machine_exceptions_v1((v_result->>'decision_id')::uuid);
  end if;
  if v_disposition = 'AUTO_HOLD' then
    v_machine_case := public.m55_r5_compliance_open_machine_exception_v1((v_result->>'decision_id')::uuid);
    v_result := v_result || jsonb_build_object('machine_exception_case_id', v_machine_case);
  end if;
  return v_result || jsonb_build_object('forfeiture', v_disposition = 'AUTO_CANCEL_OBJECTIVE');
end;
$$;

create or replace function public.m55_r5_compliance_creator_case_v1(
  p_creator_economic_identity_id uuid,
  p_action text,
  p_case_id uuid,
  p_adverse_decision_id uuid,
  p_content_id uuid,
  p_purchase_attempt_id uuid,
  p_reason text,
  p_evidence text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_case_id uuid;
  v_actor text;
  v_status text;
  v_decision public.m55_r5_compliance_decisions%rowtype;
  v_machine_evidence text;
begin
  v_actor := encode(extensions.digest(convert_to(p_creator_economic_identity_id::text, 'UTF8'), 'sha256'), 'hex');
  if p_content_id is not null and not exists (
    select 1 from public.m55_r5_compliance_contents
    where content_id = p_content_id and creator_economic_identity_id = p_creator_economic_identity_id
  ) then
    raise exception 'CONTENT_NOT_OWNED';
  end if;
  if p_purchase_attempt_id is not null and not exists (
    select 1 from public.m55_r5_attribution_purchase_attempts
    where purchase_attempt_id = p_purchase_attempt_id
      and creator_economic_identity_id = p_creator_economic_identity_id
  ) then
    raise exception 'PURCHASE_NOT_OWNED';
  end if;
  if p_action = 'OPEN_APPEAL' then
    if p_adverse_decision_id is null then
      raise exception 'ADVERSE_DECISION_REQUIRED';
    end if;
    select * into v_decision
    from public.m55_r5_compliance_decisions
    where decision_id = p_adverse_decision_id
      and creator_economic_identity_id = p_creator_economic_identity_id;
    if not found then
      raise exception 'ADVERSE_DECISION_NOT_OWNED';
    end if;
    if p_content_id is not null or p_purchase_attempt_id is not null then
      raise exception 'APPEAL_SCOPE_FORBIDDEN';
    end if;
    if v_decision.disposition = 'AUTO_PASS' then
      raise exception 'DECISION_NOT_APPEALABLE';
    end if;
    if v_decision.disposition in ('AUTO_CANCEL_OBJECTIVE', 'AUTO_HOLD') then
      null;
    elsif v_decision.disposition = 'HUMAN_EXCEPTION'
      and v_decision.reason_code in (
        'KEEP_HOLD', 'REQUEST_CORRECTION', 'PAUSE_CREATOR', 'TERMINATE_PARTNERSHIP'
      ) then
      null;
    else
      raise exception 'DECISION_NOT_APPEALABLE';
    end if;
    if exists (
      select 1 from public.m55_r5_compliance_cases
      where case_kind = 'APPEAL' and adverse_decision_id = p_adverse_decision_id
    ) then
      raise exception 'APPEAL_ALREADY_EXISTS';
    end if;
    v_machine_evidence := public.m55_r5_compliance_decision_machine_evidence_v1(p_adverse_decision_id);
    insert into public.m55_r5_compliance_cases (
      creator_economic_identity_id, case_kind, adverse_decision_id, content_id, purchase_attempt_id,
      reason, creator_evidence, machine_evidence, status
    ) values (
      p_creator_economic_identity_id, 'APPEAL', p_adverse_decision_id,
      v_decision.content_id, v_decision.purchase_attempt_id,
      p_reason, p_evidence, v_machine_evidence, 'OPEN'
    ) returning case_id into v_case_id;
    insert into public.m55_r5_compliance_case_events (case_id, event_kind, actor_ref, evidence)
    values (v_case_id, 'OPENED', v_actor, p_evidence);
    return jsonb_build_object('ok', true, 'case_id', v_case_id, 'status', 'OPEN', 'case_kind', 'APPEAL');
  end if;
  if p_action = 'OPEN_DISCREPANCY' then
    if p_adverse_decision_id is not null then
      raise exception 'ADVERSE_DECISION_FORBIDDEN';
    end if;
    insert into public.m55_r5_compliance_cases (
      creator_economic_identity_id, case_kind, adverse_decision_id, content_id, purchase_attempt_id,
      reason, creator_evidence, machine_evidence, status
    ) values (
      p_creator_economic_identity_id, 'DISCREPANCY', null, p_content_id, p_purchase_attempt_id,
      p_reason, p_evidence, 'NO_ADVERSE_DECISION', 'OPEN'
    ) returning case_id into v_case_id;
    insert into public.m55_r5_compliance_case_events (case_id, event_kind, actor_ref, evidence)
    values (v_case_id, 'OPENED', v_actor, p_evidence);
    return jsonb_build_object('ok', true, 'case_id', v_case_id, 'status', 'OPEN', 'case_kind', 'DISCREPANCY');
  end if;
  if p_action <> 'CORRECTION' or p_case_id is null then
    raise exception 'CASE_ACTION_INVALID';
  end if;
  select status into v_status
  from public.m55_r5_compliance_cases
  where case_id = p_case_id and creator_economic_identity_id = p_creator_economic_identity_id;
  if not found then
    raise exception 'CASE_NOT_OWNED';
  end if;
  if v_status = 'RESOLVED' then
    raise exception 'CASE_TERMINAL';
  end if;
  if v_status not in ('OPEN', 'HOLD') then
    raise exception 'CASE_CORRECTION_INVALID';
  end if;
  insert into public.m55_r5_compliance_case_events (case_id, event_kind, actor_ref, evidence)
  values (p_case_id, 'CREATOR_CORRECTION', v_actor, p_evidence);
  return jsonb_build_object('ok', true, 'case_id', p_case_id, 'status', 'CORRECTION_APPENDED');
end;
$$;

create or replace function public.m55_r5_compliance_list_open_cases_v1()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'case_id', c.case_id,
      'case_kind', c.case_kind,
      'status', c.status,
      'reason', c.reason,
      'opened_at', c.opened_at,
      'creator_economic_identity_id', c.creator_economic_identity_id,
      'content_id', c.content_id,
      'purchase_attempt_id', c.purchase_attempt_id,
      'adverse_decision_id', c.adverse_decision_id,
      'creator_evidence', c.creator_evidence,
      'machine_evidence', c.machine_evidence,
      'decision', c.decision,
      'decision_reason', c.decision_reason,
      'adverse_decision', (
        select jsonb_build_object(
          'decision_id', d.decision_id,
          'disposition', d.disposition,
          'reason_code', d.reason_code,
          'rule_version', d.rule_version,
          'evidence_reference', d.evidence_reference,
          'decision_timestamp', d.decision_timestamp,
          'reviewer_type', d.reviewer_type,
          'appeal_status', d.appeal_status,
          'content_id', d.content_id,
          'purchase_attempt_id', d.purchase_attempt_id
        )
        from public.m55_r5_compliance_decisions d
        where d.decision_id = c.adverse_decision_id
      ),
      'latest_content_snapshot', (
        select jsonb_build_object(
          'snapshot_id', s.snapshot_id,
          'observation_kind', s.observation_kind,
          'content_fingerprint', s.content_fingerprint,
          'observed_version', s.observed_version,
          'disclosure_state', s.disclosure_state,
          'claim_scan_state', s.claim_scan_state,
          'observed_at', s.observed_at
        )
        from public.m55_r5_compliance_content_snapshots s
        where s.content_id = c.content_id
        order by s.observed_version desc
        limit 1
      ),
      'fraud_graph_evidence', case
        when c.purchase_attempt_id is null then null
        else (
          select coalesce(jsonb_agg(jsonb_build_object(
            'edge_id', e.edge_id,
            'relation_class', e.relation_class,
            'risk_signal_class', e.risk_signal_class,
            'objective_reason_code', e.objective_reason_code,
            'evidence_reference', e.evidence_reference,
            'observed_at', e.observed_at
          ) order by e.observed_at asc, e.edge_id asc), '[]'::jsonb)
          from public.m55_r5_compliance_graph_edges e
          where e.creator_economic_identity_id = c.creator_economic_identity_id
            and e.purchase_attempt_id = c.purchase_attempt_id
        )
      end,
      'case_events', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'event_id', ev.event_id,
          'event_kind', ev.event_kind,
          'actor_ref', ev.actor_ref,
          'evidence', ev.evidence,
          'created_at', ev.created_at
        ) order by ev.created_at asc, ev.event_id asc), '[]'::jsonb)
        from public.m55_r5_compliance_case_events ev
        where ev.case_id = c.case_id
      )
    ) order by c.opened_at asc, c.case_id asc)
    from public.m55_r5_compliance_cases c
    where c.status in ('OPEN', 'HOLD')
  ), '[]'::jsonb);
end;
$$;

create or replace function public.m55_r5_compliance_resolve_case_v1(
  p_case_id uuid,
  p_reviewer_actor_ref text,
  p_action text,
  p_decision text,
  p_decision_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_case public.m55_r5_compliance_cases%rowtype;
  v_status text;
begin
  if p_reviewer_actor_ref !~ '^[0-9a-f]{64}$' then
    raise exception 'REVIEWER_ACTOR_REF_REQUIRED';
  end if;
  if p_action not in ('RESOLVE', 'KEEP_HOLD') then
    raise exception 'CASE_ACTION_INVALID';
  end if;
  if p_action = 'KEEP_HOLD' and p_decision not in ('KEEP_HOLD', 'REQUEST_CORRECTION') then
    raise exception 'HUMAN_DECISION_INVALID';
  end if;
  if p_action = 'RESOLVE' and p_decision not in ('RELEASE', 'PAUSE_CREATOR', 'TERMINATE_PARTNERSHIP') then
    raise exception 'HUMAN_DECISION_INVALID';
  end if;
  select * into v_case from public.m55_r5_compliance_cases where case_id = p_case_id for update;
  if not found then
    raise exception 'CASE_NOT_FOUND';
  end if;
  if v_case.status = 'RESOLVED' then
    raise exception 'CASE_TERMINAL';
  end if;
  if p_action = 'RESOLVE' then
    v_status := 'RESOLVED';
    if p_decision_reason is null or char_length(trim(p_decision_reason)) = 0 then
      raise exception 'DECISION_REASON_REQUIRED';
    end if;
  else
    v_status := 'HOLD';
  end if;
  perform public.m55_r5_compliance_record_decision_v1(
    v_case.creator_economic_identity_id, v_case.purchase_attempt_id, v_case.content_id, v_case.case_id,
    'HUMAN_EXCEPTION', p_decision, 'm55.r5.compliance.human_exception.v1', p_case_id::text,
    'HUMAN', case when v_status = 'RESOLVED' then 'RESOLVED' else 'OPEN' end, false
  );
  perform set_config('m55.compliance_actor_ref', p_reviewer_actor_ref, true);
  update public.m55_r5_compliance_cases
  set status = v_status,
      decision = p_decision,
      decision_reason = p_decision_reason,
      resolved_at = case when v_status = 'RESOLVED' then now() else null end
  where case_id = p_case_id;
  return jsonb_build_object('ok', true, 'case_id', p_case_id, 'status', v_status);
end;
$$;

alter table public.m55_r5_compliance_contents enable row level security;
alter table public.m55_r5_compliance_content_snapshots enable row level security;
alter table public.m55_r5_compliance_graph_nodes enable row level security;
alter table public.m55_r5_compliance_graph_edges enable row level security;
alter table public.m55_r5_compliance_decisions enable row level security;
alter table public.m55_r5_compliance_cases enable row level security;
alter table public.m55_r5_compliance_case_events enable row level security;

revoke all on public.m55_r5_compliance_contents from public, anon, authenticated, service_role;
revoke all on public.m55_r5_compliance_content_snapshots from public, anon, authenticated, service_role;
revoke all on public.m55_r5_compliance_graph_nodes from public, anon, authenticated, service_role;
revoke all on public.m55_r5_compliance_graph_edges from public, anon, authenticated, service_role;
revoke all on public.m55_r5_compliance_decisions from public, anon, authenticated, service_role;
revoke all on public.m55_r5_compliance_cases from public, anon, authenticated, service_role;
revoke all on public.m55_r5_compliance_case_events from public, anon, authenticated, service_role;

revoke all on function public.m55_r5_compliance_record_content_v1(uuid, uuid, text, text, text, text, text, text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.m55_r5_compliance_record_graph_edge_v1(uuid, uuid, text, text, text, text, text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.m55_r5_compliance_record_decision_v1(uuid, uuid, uuid, uuid, text, text, text, text, text, text, boolean) from public, anon, authenticated, service_role;
revoke all on function public.m55_r5_compliance_open_machine_exception_v1(uuid) from public, anon, authenticated, service_role;
revoke all on function public.m55_r5_compliance_reconcile_machine_exceptions_v1(uuid) from public, anon, authenticated, service_role;
revoke all on function public.m55_r5_compliance_decide_fraud_v1(uuid, uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function public.m55_r5_compliance_creator_case_v1(uuid, text, uuid, uuid, uuid, uuid, text, text) from public, anon, authenticated, service_role;
revoke all on function public.m55_r5_compliance_list_open_cases_v1() from public, anon, authenticated, service_role;
revoke all on function public.m55_r5_compliance_resolve_case_v1(uuid, text, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.m55_r5_compliance_decision_machine_evidence_v1(uuid) from public, anon, authenticated, service_role;

grant execute on function public.m55_r5_compliance_record_content_v1(uuid, uuid, text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.m55_r5_compliance_record_graph_edge_v1(uuid, uuid, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.m55_r5_compliance_decide_fraud_v1(uuid, uuid, boolean) to service_role;
grant execute on function public.m55_r5_compliance_creator_case_v1(uuid, text, uuid, uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.m55_r5_compliance_list_open_cases_v1() to service_role;
grant execute on function public.m55_r5_compliance_resolve_case_v1(uuid, text, text, text, text) to service_role;
