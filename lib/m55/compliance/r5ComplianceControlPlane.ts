import 'server-only';
import { createHash } from 'node:crypto';
import { M55_PROHIBITED_CLAIMS } from '../contracts/m55CommercialFunnelContract';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  scanContentComplianceV1,
  type ContentObservationKind,
  type R5HeuristicRiskSignal,
  type R5ObjectiveReasonCode,
} from './r5ComplianceControlPlaneContract';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadOwnCreatorEconomicIdentityId(clerkUserId: string): Promise<string> {
  const db = getSupabaseAdmin() as any;
  const profile = await db
    .from('m55_creator_profiles')
    .select('economic_identity_id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();
  if (profile.error || !profile.data?.economic_identity_id) {
    throw new Error('CREATOR_PROFILE_REQUIRED');
  }
  return profile.data.economic_identity_id as string;
}

export function reviewerActorRefV1(reviewerClerkUserId: string): string {
  return createHash('sha256')
    .update('m55.r5.compliance.reviewer_ref.v1', 'utf8')
    .update('\0', 'utf8')
    .update(reviewerClerkUserId, 'utf8')
    .digest('hex');
}

export async function registerOrRescanContentV1(input: {
  creatorEconomicIdentityId: string;
  action: 'REGISTER' | 'RESCAN' | 'REMOVAL';
  platformSource: string;
  sourceLocator: string;
  bodyText: string | null;
  contentId?: string | null;
}): Promise<Record<string, unknown>> {
  const observationKind: ContentObservationKind = input.action === 'REMOVAL' ? 'REMOVED' : 'PRESENT';
  const scan = scanContentComplianceV1({ observationKind, bodyText: input.bodyText }, M55_PROHIBITED_CLAIMS);
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db.rpc('m55_r5_compliance_record_content_v1', {
    p_creator_economic_identity_id: input.creatorEconomicIdentityId,
    p_content_id: input.contentId ?? null,
    p_platform_source: input.platformSource,
    p_source_locator: input.sourceLocator,
    p_observation_kind: observationKind,
    p_body_text: input.bodyText,
    p_disclosure_state: scan.disclosureState,
    p_claim_scan_state: scan.claimScanState,
    p_disposition: scan.disposition,
    p_reason_code: scan.reasonCode,
    p_rule_version: scan.ruleVersion,
  });
  if (error || !data) throw new Error('CONTENT_RECORD_FAILED');
  return data as Record<string, unknown>;
}

export async function openOrCorrectCaseV1(input: {
  creatorEconomicIdentityId: string;
  action: 'OPEN_APPEAL' | 'OPEN_DISCREPANCY' | 'CORRECTION';
  caseId?: string | null;
  adverseDecisionId?: string | null;
  contentId?: string | null;
  purchaseAttemptId?: string | null;
  reason: string;
  evidence: string;
}): Promise<Record<string, unknown>> {
  if (input.action === 'OPEN_APPEAL' && (input.contentId != null || input.purchaseAttemptId != null)) {
    throw new Error('APPEAL_SCOPE_FORBIDDEN');
  }
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db.rpc('m55_r5_compliance_creator_case_v1', {
    p_creator_economic_identity_id: input.creatorEconomicIdentityId,
    p_action: input.action,
    p_case_id: input.caseId ?? null,
    p_adverse_decision_id: input.adverseDecisionId ?? null,
    p_content_id: input.action === 'OPEN_APPEAL' ? null : input.contentId ?? null,
    p_purchase_attempt_id: input.action === 'OPEN_APPEAL' ? null : input.purchaseAttemptId ?? null,
    p_reason: input.reason,
    p_evidence: input.evidence,
  });
  if (error || !data) throw new Error('CASE_WRITE_FAILED');
  return data as Record<string, unknown>;
}

export async function recordFraudGraphEdgeV1(input: {
  creatorEconomicIdentityId: string;
  purchaseAttemptId: string;
  fromKind: string;
  fromRef: string;
  toKind: string;
  toRef: string;
  relationClass: 'OBJECTIVE' | 'HEURISTIC_RISK';
  riskSignalClass: R5HeuristicRiskSignal | null;
  objectiveReasonCode: R5ObjectiveReasonCode | null;
  evidenceReference: string;
}): Promise<Record<string, unknown>> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db.rpc('m55_r5_compliance_record_graph_edge_v1', {
    p_creator_economic_identity_id: input.creatorEconomicIdentityId,
    p_purchase_attempt_id: input.purchaseAttemptId,
    p_from_kind: input.fromKind,
    p_from_ref: input.fromRef,
    p_to_kind: input.toKind,
    p_to_ref: input.toRef,
    p_relation_class: input.relationClass,
    p_risk_signal_class: input.riskSignalClass,
    p_objective_reason_code: input.objectiveReasonCode,
    p_evidence_reference: input.evidenceReference,
  });
  if (error || !data) throw new Error('GRAPH_EDGE_RECORD_FAILED');
  return data as Record<string, unknown>;
}

export async function recordFraudDecisionV1(input: {
  creatorEconomicIdentityId: string;
  purchaseAttemptId: string;
  decisionRequired: boolean;
}): Promise<Record<string, unknown>> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db.rpc('m55_r5_compliance_decide_fraud_v1', {
    p_creator_economic_identity_id: input.creatorEconomicIdentityId,
    p_purchase_attempt_id: input.purchaseAttemptId,
    p_decision_required: input.decisionRequired,
  });
  if (error || !data) throw new Error('DECISION_RECORD_FAILED');
  return data as Record<string, unknown>;
}

export async function listOpenComplianceCasesV1(): Promise<unknown> {
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db.rpc('m55_r5_compliance_list_open_cases_v1');
  if (error) throw new Error('QUEUE_UNAVAILABLE');
  return data ?? [];
}

export async function resolveComplianceCaseV1(input: {
  caseId: string;
  reviewerActorRef: string;
  action: 'RESOLVE' | 'KEEP_HOLD';
  decision: string;
  decisionReason: string;
}): Promise<Record<string, unknown>> {
  if (!UUID_RE.test(input.caseId)) throw new Error('CASE_ID_INVALID');
  const db = getSupabaseAdmin() as any;
  const { data, error } = await db.rpc('m55_r5_compliance_resolve_case_v1', {
    p_case_id: input.caseId,
    p_reviewer_actor_ref: input.reviewerActorRef,
    p_action: input.action,
    p_decision: input.decision,
    p_decision_reason: input.decisionReason,
  });
  if (error || !data) throw new Error('CASE_RESOLVE_FAILED');
  return data as Record<string, unknown>;
}
