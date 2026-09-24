import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { M55_PROHIBITED_CLAIMS } from '../contracts/m55CommercialFunnelContract';
import { classifyRouteAccess } from '../authRouting/routeAccessContract';
import {
  M55_R5_COMPLIANCE_ADVERSE_DECISION_FIELDS,
  M55_R5_COMPLIANCE_APPEALABLE_DISPOSITIONS,
  M55_R5_COMPLIANCE_APPEALABLE_HUMAN_REASON_CODES,
  M55_R5_COMPLIANCE_CASE_DECISIONS,
  M55_R5_COMPLIANCE_CASE_KINDS,
  M55_R5_COMPLIANCE_DISPOSITIONS,
  M55_R5_COMPLIANCE_NON_APPEALABLE_HUMAN_REASON_CODE,
  assertOpaqueGraphRef,
  evaluateFraudDispositionV1,
  hasAffiliateDisclosureV1,
  scanContentComplianceV1,
} from './r5ComplianceControlPlaneContract';

const contractSource = readFileSync(
  join(process.cwd(), 'lib/m55/compliance/r5ComplianceControlPlaneContract.ts'),
  'utf8',
);
const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260924000000_m55_r5_compliance_control_plane_v1.sql'),
  'utf8',
);
const runtime = readFileSync(join(process.cwd(), 'lib/m55/compliance/r5ComplianceControlPlane.ts'), 'utf8');
const appealRoute = readFileSync(
  join(process.cwd(), 'app/api/creator/compliance/appeal/route.ts'),
  'utf8',
);

const COMPLIANCE_TABLES = [
  'm55_r5_compliance_contents',
  'm55_r5_compliance_content_snapshots',
  'm55_r5_compliance_graph_nodes',
  'm55_r5_compliance_graph_edges',
  'm55_r5_compliance_decisions',
  'm55_r5_compliance_cases',
  'm55_r5_compliance_case_events',
] as const;

describe('r5 compliance control plane contract', () => {
  it('keeps the exact disposition vocabulary', () => {
    assert.deepEqual(M55_R5_COMPLIANCE_DISPOSITIONS, [
      'AUTO_PASS',
      'AUTO_CANCEL_OBJECTIVE',
      'AUTO_HOLD',
      'HUMAN_EXCEPTION',
    ]);
  });

  it('requires adverse decision fields and does not invent an appeal SLA', () => {
    assert.deepEqual(M55_R5_COMPLIANCE_ADVERSE_DECISION_FIELDS, [
      'reason_code',
      'rule_version',
      'evidence_reference',
      'decision_timestamp',
      'reviewer_type',
      'appeal_status',
    ]);
    assert.doesNotMatch(migration + runtime + appealRoute, /appeal_deadline|appeal_sla|sla_days/i);
  });

  it('holds every canonical M55_PROHIBITED_CLAIMS entry with valid disclosure', () => {
    for (const claim of M55_PROHIBITED_CLAIMS) {
      const result = scanContentComplianceV1(
        { observationKind: 'PRESENT', bodyText: `広告｜${claim}について` },
        M55_PROHIBITED_CLAIMS,
      );
      assert.notEqual(result.disposition, 'AUTO_PASS', claim);
      assert.equal(result.claimScanState, 'PROHIBITED_MATCH', claim);
      assert.equal(result.disposition, 'AUTO_HOLD', claim);
    }
    assert.equal(M55_PROHIBITED_CLAIMS.length, 12);
  });

  it('holds explicit fortune and private-feeling examples', () => {
    assert.equal(
      scanContentComplianceV1(
        { observationKind: 'PRESENT', bodyText: '広告｜これは占いによる未来予測です' },
        M55_PROHIBITED_CLAIMS,
      ).disposition,
      'AUTO_HOLD',
    );
    assert.equal(
      scanContentComplianceV1(
        { observationKind: 'PRESENT', bodyText: 'PR｜相手の本音が必ず分かります' },
        M55_PROHIBITED_CLAIMS,
      ).disposition,
      'AUTO_HOLD',
    );
  });

  it('derives fraud disposition from persisted graph evidence only', () => {
    const none = evaluateFraudDispositionV1({
      persistedObjectiveReasons: [],
      persistedHeuristicSignalClasses: [],
      decisionRequired: false,
    });
    assert.equal(none.disposition, null);
    assert.equal(none.reasonCode, 'NO_DISPOSITION');
    assert.notEqual(none.disposition, 'AUTO_CANCEL_OBJECTIVE');

    const one = evaluateFraudDispositionV1({
      persistedObjectiveReasons: [],
      persistedHeuristicSignalClasses: ['SAME_IP'],
      decisionRequired: true,
    });
    assert.equal(one.disposition, 'AUTO_HOLD');
    assert.equal(one.reasonCode, 'SINGLE_HEURISTIC_SIGNAL_UNRESOLVED');
    assert.equal(one.forfeiture, false);

    const duplicateClass = evaluateFraudDispositionV1({
      persistedObjectiveReasons: [],
      persistedHeuristicSignalClasses: ['SAME_IP', 'SAME_IP'],
      decisionRequired: false,
    });
    assert.equal(duplicateClass.disposition, null);

    const many = evaluateFraudDispositionV1({
      persistedObjectiveReasons: [],
      persistedHeuristicSignalClasses: ['SAME_IP', 'SAME_DEVICE', 'SAME_IP'],
      decisionRequired: false,
    });
    assert.equal(many.disposition, 'AUTO_HOLD');
    assert.equal(many.reasonCode, 'MULTIPLE_HEURISTIC_RISK_SIGNALS');
    assert.equal(many.forfeiture, false);

    const incomplete = evaluateFraudDispositionV1({
      persistedObjectiveReasons: [],
      persistedHeuristicSignalClasses: [],
      decisionRequired: true,
    });
    assert.equal(incomplete.disposition, 'AUTO_HOLD');
    assert.equal(incomplete.reasonCode, 'EVIDENCE_INCOMPLETE');

    const objective = evaluateFraudDispositionV1({
      persistedObjectiveReasons: ['CONFIRMED_SELF_REFERRAL', 'DUPLICATE_ATTRIBUTION'],
      persistedHeuristicSignalClasses: ['SAME_IP', 'SAME_DEVICE'],
      decisionRequired: false,
    });
    assert.equal(objective.disposition, 'AUTO_CANCEL_OBJECTIVE');
    assert.equal(objective.reasonCode, 'CONFIRMED_SELF_REFERRAL');
    assert.equal(objective.forfeiture, true);
  });

  it('scans disclosure and prohibited claims to pass or hold', () => {
    assert.equal(
      scanContentComplianceV1(
        { observationKind: 'PRESENT', bodyText: '広告 アフィリエイトリンクを含みます。相性の読み方です。' },
        M55_PROHIBITED_CLAIMS,
      ).disposition,
      'AUTO_PASS',
    );
    assert.equal(
      scanContentComplianceV1(
        { observationKind: 'PRESENT', bodyText: '相性の読み方です。' },
        M55_PROHIBITED_CLAIMS,
      ).reasonCode,
      'DISCLOSURE_MISSING',
    );
    assert.equal(
      scanContentComplianceV1(
        { observationKind: 'PRESENT', bodyText: '広告 必ず稼げます。' },
        M55_PROHIBITED_CLAIMS,
      ).reasonCode,
      'PROHIBITED_CLAIM_MATCH',
    );
    assert.equal(
      scanContentComplianceV1(
        { observationKind: 'PRESENT', bodyText: '   ' },
        M55_PROHIBITED_CLAIMS,
      ).reasonCode,
      'CONTENT_SCAN_UNKNOWN',
    );
    assert.equal(
      scanContentComplianceV1(
        { observationKind: 'REMOVED', bodyText: null },
        M55_PROHIBITED_CLAIMS,
      ).reasonCode,
      'CONTENT_REMOVAL_OBSERVED',
    );
    assert.match(migration, /observation_kind in \('PRESENT', 'REMOVED'\)/);
  });

  it('keeps caller proof parameters out of the fraud decision authority', () => {
    const fraudStart = runtime.indexOf('export async function recordFraudDecisionV1');
    const fraudFn = runtime.slice(fraudStart, runtime.indexOf('export async function listOpenComplianceCasesV1'));
    assert.doesNotMatch(fraudFn, /objectiveProof|objectiveReasonCode|heuristicSignalClasses|evidenceReference|p_objective_proof|p_objective_reason|p_signal_classes/);
    assert.match(fraudFn, /p_decision_required: input\.decisionRequired/);
    const decideStart = migration.indexOf('function public.m55_r5_compliance_decide_fraud_v1');
    const decideFn = migration.slice(decideStart, migration.indexOf('create or replace function public.m55_r5_compliance_creator_case_v1'));
    assert.match(
      decideFn,
      /m55_r5_compliance_decide_fraud_v1\(\s*p_creator_economic_identity_id uuid,\s*p_purchase_attempt_id uuid,\s*p_decision_required boolean\s*\)/,
    );
    assert.doesNotMatch(decideFn, /p_objective_proof|p_objective_reason|p_signal_classes|p_evidence_reference|text\[\]/);
    assert.match(decideFn, /relation_class = 'OBJECTIVE'/);
    assert.match(decideFn, /order by e\.observed_at asc, e\.edge_id asc/);
    assert.match(decideFn, /count\(distinct e\.risk_signal_class\)/);
    assert.match(decideFn, /fraud_graph_scope:/);
    assert.match(decideFn, /v_disposition = 'AUTO_HOLD'/);
    assert.match(decideFn, /m55_r5_compliance_open_machine_exception_v1/);
    assert.doesNotMatch(migration, /decide_fraud_v1\(uuid, uuid, boolean, text, text\[\], boolean, text\)/);
    assert.match(migration, /OBJECTIVE_PROOF_REQUIRED/);
  });

  it('rejects a raw Clerk user id as a graph node ref', () => {
    assert.throws(() => assertOpaqueGraphRef('user_2abc'), /OPAQUE_GRAPH_REF_REQUIRED/);
    assert.doesNotThrow(() => assertOpaqueGraphRef('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'));
    assert.match(migration, /OPAQUE_GRAPH_REF_REQUIRED/);
  });

  it('denies service_role direct DML and generic decision execute', () => {
    for (const table of COMPLIANCE_TABLES) {
      assert.doesNotMatch(
        migration,
        new RegExp(`grant\\s+(select|insert|update|delete)[\\s\\S]*on\\s+public\\.${table}\\s+to\\s+service_role`, 'i'),
      );
    }
    assert.match(
      migration,
      /revoke all on function public\.m55_r5_compliance_record_decision_v1[\s\S]*service_role/,
    );
    assert.doesNotMatch(
      migration,
      /grant execute on function public\.m55_r5_compliance_record_decision_v1[\s\S]*service_role/,
    );
  });

  it('routes fraud recording through decide_fraud_v1 only', () => {
    assert.match(runtime, /rpc\('m55_r5_compliance_decide_fraud_v1'/);
    assert.doesNotMatch(runtime, /rpc\('m55_r5_compliance_record_decision_v1'/);
  });

  it('requires durable appeal linkage and derived machine evidence', () => {
    assert.deepEqual(M55_R5_COMPLIANCE_CASE_KINDS, ['APPEAL', 'DISCREPANCY', 'MACHINE_EXCEPTION']);
    assert.match(migration, /case_kind text not null check \(case_kind in \('APPEAL', 'DISCREPANCY', 'MACHINE_EXCEPTION'\)\)/);
    assert.match(migration, /adverse_decision_id uuid null references public\.m55_r5_compliance_decisions/);
    assert.match(migration, /case_kind = 'APPEAL' and adverse_decision_id is not null/);
    assert.match(migration, /case_kind = 'DISCREPANCY' and adverse_decision_id is null/);
    assert.match(migration, /case_kind = 'MACHINE_EXCEPTION' and adverse_decision_id is not null/);
    assert.match(migration, /ADVERSE_DECISION_REQUIRED/);
    assert.match(migration, /ADVERSE_DECISION_FORBIDDEN/);
    assert.match(migration, /m55_r5_compliance_decision_machine_evidence_v1/);
    assert.doesNotMatch(migration, /'MACHINE_EVIDENCE_RETAINED'/);
    assert.match(appealRoute, /OPEN_APPEAL/);
    assert.match(appealRoute, /OPEN_DISCREPANCY/);
    assert.match(appealRoute, /adverseDecisionId/);
  });

  it('routes machine AUTO_HOLD into one exception and leaves AUTO_PASS uncased', () => {
    const contentStart = migration.indexOf('function public.m55_r5_compliance_record_content_v1');
    const contentFn = migration.slice(contentStart, migration.indexOf('create or replace function public.m55_r5_compliance_record_graph_edge_v1'));
    assert.match(contentFn, /if p_disposition = 'AUTO_HOLD' then[\s\S]*m55_r5_compliance_open_machine_exception_v1/);
    assert.doesNotMatch(contentFn, /AUTO_PASS' then[\s\S]*open_machine_exception/);
    assert.match(migration, /m55_r5_compliance_one_machine_exception_per_decision/);
    assert.match(migration, /where case_kind = 'MACHINE_EXCEPTION'/);
    assert.match(migration, /'NO_CREATOR_EVIDENCE'/);
    assert.match(migration, /MACHINE_EXCEPTION_REQUIRES_HOLD/);
    assert.doesNotMatch(
      migration,
      /grant execute on function public\.m55_r5_compliance_open_machine_exception_v1/,
    );
    assert.match(
      migration,
      /revoke all on function public\.m55_r5_compliance_open_machine_exception_v1\(uuid\) from public, anon, authenticated, service_role/,
    );
  });

  it('derives appeal scope from the linked decision and dedupes appeals', () => {
    const appealStart = migration.indexOf("if p_action = 'OPEN_APPEAL' then");
    const appealFn = migration.slice(appealStart, migration.indexOf("if p_action = 'OPEN_DISCREPANCY' then"));
    assert.match(appealFn, /APPEAL_SCOPE_FORBIDDEN/);
    assert.match(appealFn, /DECISION_NOT_APPEALABLE/);
    assert.match(appealFn, /APPEAL_ALREADY_EXISTS/);
    assert.match(appealFn, /v_decision\.content_id, v_decision\.purchase_attempt_id/);
    assert.doesNotMatch(appealFn, /p_content_id, p_purchase_attempt_id/);
    for (const disposition of M55_R5_COMPLIANCE_APPEALABLE_DISPOSITIONS) {
      assert.match(appealFn, new RegExp(disposition));
    }
    assert.match(appealFn, /disposition = 'AUTO_PASS' then[\s\S]*DECISION_NOT_APPEALABLE/);
    for (const reason of M55_R5_COMPLIANCE_APPEALABLE_HUMAN_REASON_CODES) {
      assert.match(appealFn, new RegExp(reason));
    }
    assert.equal(M55_R5_COMPLIANCE_NON_APPEALABLE_HUMAN_REASON_CODE, 'RELEASE');
    assert.doesNotMatch(appealFn, /'RELEASE'/);
    assert.match(migration, /m55_r5_compliance_one_appeal_per_decision/);
    assert.match(migration, /where case_kind = 'APPEAL'/);
    assert.match(appealRoute, /'contentId' in body \|\| 'purchaseAttemptId' in body/);
    assert.match(runtime, /APPEAL_SCOPE_FORBIDDEN/);
    assert.match(migration, /ADVERSE_DECISION_NOT_OWNED/);
    assert.match(migration, /creator_economic_identity_id, purchase_attempt_id/);
    assert.match(migration, /objective_reason_code/);
  });

  it('detects only boundary-aware affiliate disclosures', () => {
    for (const text of [
      'PR｜M55を紹介します',
      '【PR】M55を紹介します',
      '#PR M55を紹介します',
      '広告｜M55を紹介します',
      '【広告】M55を紹介します',
      'アフィリエイト｜M55を紹介します',
      'アフィリエイトリンクを含みます',
      '#ad M55を紹介します',
      '#AD M55を紹介します',
    ]) {
      assert.equal(hasAffiliateDisclosureV1(text), true, text);
    }
    for (const text of [
      'M55 PREMIUM REPORT を紹介します',
      'PRODUCT REVIEWです',
      'SPRING REPORT',
      '',
    ]) {
      assert.equal(hasAffiliateDisclosureV1(text), false, text);
    }
    const embedded = scanContentComplianceV1(
      { observationKind: 'PRESENT', bodyText: 'M55 PREMIUM REPORT を紹介します' },
      M55_PROHIBITED_CLAIMS,
    );
    assert.equal(embedded.disclosureState, 'MISSING');
    assert.equal(embedded.disposition, 'AUTO_HOLD');
    assert.equal(embedded.reasonCode, 'DISCLOSURE_MISSING');
    assert.doesNotMatch(contractSource, /includes\('PR'\)|includes\("PR"\)/);
  });

  it('reconciles machine exceptions without overriding human keep-hold or touching other case kinds', () => {
    const reconcileStart = migration.indexOf('function public.m55_r5_compliance_reconcile_machine_exceptions_v1');
    const reconcileFn = migration.slice(
      reconcileStart,
      migration.indexOf('create or replace function public.m55_r5_compliance_record_content_v1'),
    );
    assert.match(reconcileFn, /case_kind = 'MACHINE_EXCEPTION'/);
    assert.match(reconcileFn, /c\.status in \('OPEN', 'HOLD'\)/);
    assert.match(reconcileFn, /status in \('OPEN', 'HOLD'\)/);
    assert.match(reconcileFn, /c\.decision is null/);
    assert.match(reconcileFn, /c\.decision = 'REQUEST_CORRECTION'/);
    assert.match(reconcileFn, /AUTO_RELEASE/);
    assert.match(reconcileFn, /CURRENT_CONTENT_SNAPSHOT_PASSED/);
    assert.match(reconcileFn, /SUPERSEDED_BY_NEW_MACHINE_DECISION/);
    assert.match(reconcileFn, /NEWER_CONTENT_HOLD_DECISION/);
    assert.match(reconcileFn, /NEWER_FRAUD_HOLD_DECISION/);
    assert.match(reconcileFn, /SUPERSEDED_BY_OBJECTIVE_DECISION/);
    assert.match(reconcileFn, /OBJECTIVE_INVALIDITY_CONFIRMED/);
    assert.match(reconcileFn, /set_config\('m55\.compliance_actor_ref', 'MACHINE'/);
    assert.doesNotMatch(reconcileFn, /c\.decision = 'KEEP_HOLD'/);
    assert.doesNotMatch(reconcileFn, /case_kind = 'APPEAL'|case_kind = 'DISCREPANCY'/);
    assert.match(
      migration,
      /v_actor is null or \(v_actor <> 'MACHINE' and v_actor !~ '\^\[0-9a-f\]\{64\}\$'\)/,
    );
    assert.doesNotMatch(
      migration,
      /grant execute on function public\.m55_r5_compliance_reconcile_machine_exceptions_v1/,
    );
    assert.match(
      migration,
      /revoke all on function public\.m55_r5_compliance_reconcile_machine_exceptions_v1\(uuid\) from public, anon, authenticated, service_role/,
    );
    const contentStart = migration.indexOf('function public.m55_r5_compliance_record_content_v1');
    const contentFn = migration.slice(
      contentStart,
      migration.indexOf('create or replace function public.m55_r5_compliance_record_graph_edge_v1'),
    );
    const holdAt = contentFn.indexOf("if p_disposition = 'AUTO_HOLD' then");
    const reconcileAt = contentFn.indexOf('m55_r5_compliance_reconcile_machine_exceptions_v1');
    assert.ok(reconcileAt >= 0 && holdAt > reconcileAt);
    const decideStart = migration.indexOf('function public.m55_r5_compliance_decide_fraud_v1');
    const decideFn = migration.slice(
      decideStart,
      migration.indexOf('create or replace function public.m55_r5_compliance_creator_case_v1'),
    );
    const noDispositionAt = decideFn.indexOf("'NO_DISPOSITION'");
    const fraudReconcileAt = decideFn.indexOf('m55_r5_compliance_reconcile_machine_exceptions_v1');
    assert.ok(noDispositionAt >= 0 && fraudReconcileAt > noDispositionAt);
    assert.match(decideFn, /v_disposition in \('AUTO_HOLD', 'AUTO_CANCEL_OBJECTIVE'\)/);
    for (const decision of M55_R5_COMPLIANCE_CASE_DECISIONS) {
      assert.match(migration, new RegExp(decision));
    }
  });

  it('returns a decision-ready queue packet without content body or R6 money', () => {
    const queueStart = migration.indexOf('function public.m55_r5_compliance_list_open_cases_v1');
    const queueFn = migration.slice(queueStart, migration.indexOf('create or replace function public.m55_r5_compliance_resolve_case_v1'));
    for (const field of [
      'creator_economic_identity_id',
      'content_id',
      'purchase_attempt_id',
      'adverse_decision_id',
      'creator_evidence',
      'machine_evidence',
      'decision_reason',
      'adverse_decision',
      'latest_content_snapshot',
      'content_fingerprint',
      'observed_version',
      'disclosure_state',
      'claim_scan_state',
      'fraud_graph_evidence',
      'objective_reason_code',
      'case_events',
      'event_id',
    ]) {
      assert.match(queueFn, new RegExp(field));
    }
    assert.match(queueFn, /e\.creator_economic_identity_id = c\.creator_economic_identity_id/);
    assert.match(queueFn, /e\.purchase_attempt_id = c\.purchase_attempt_id/);
    assert.match(queueFn, /order by ev\.created_at asc, ev\.event_id asc/);
    assert.match(queueFn, /order by c\.opened_at asc, c\.case_id asc/);
    assert.doesNotMatch(queueFn, /body_text/);
    assert.doesNotMatch(queueFn, /commission_amount|commission_rate|payable|payout_|release_at/i);
  });

  it('enforces fail-closed case state machine contracts', () => {
    assert.match(migration, /if old\.status = 'RESOLVED' then[\s\S]*CASE_TERMINAL/);
    assert.match(migration, /if p_action not in \('RESOLVE', 'KEEP_HOLD'\)/);
    assert.match(migration, /if v_status = 'RESOLVED' then[\s\S]*CASE_TERMINAL/);
    assert.match(migration, /if v_status = 'RESOLVED' then[\s\S]*CASE_TERMINAL/);
    assert.match(migration, /resolved_at = case when v_status = 'RESOLVED' then now\(\) else null end/);
    assert.match(migration, /status in \('OPEN', 'HOLD'\) and resolved_at is null/);
    assert.match(migration, /KEEP_HOLD', 'REQUEST_CORRECTION/);
    assert.match(migration, /'RELEASE', 'PAUSE_CREATOR', 'TERMINATE_PARTNERSHIP/);
  });

  it('keeps R6 money fields out of the R5 contract', () => {
    const joined = migration + runtime;
    assert.doesNotMatch(joined, /commission_amount|commission_rate|COMMISSIONABLE_REVENUE|payable_ledger|payout_batch/i);
  });

  it('protects creator and reviewer compliance routes', () => {
    assert.equal(classifyRouteAccess('/api/creator/compliance/content'), 'protected');
    assert.equal(classifyRouteAccess('/api/creator/compliance/appeal'), 'protected');
    assert.equal(classifyRouteAccess('/api/internal/creator-compliance'), 'protected');
    assert.equal(classifyRouteAccess('/api/creator/compliance/unknown'), 'unknown');
  });
});
