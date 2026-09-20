import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  M55_R5_TOUCH_ADMIT_RPC_NAME,
  classifyAdmitQualifiedTouchRpcErrorV1,
  type AdmitQualifiedTouchOutcomeV1,
} from './r5TouchIngestContract';
import type { PersistableQualifiedActionKind } from './r5TouchSchemaContract';
import { encodeByteaForPostgrestRpcV1 } from './r5TouchContinuation';

export type AdmitQualifiedTouchRpcParamsV1 = {
  p_continuation_id: string;
  p_clerk_subject_lookup_digest: string;
  p_qualified_action_kind: PersistableQualifiedActionKind;
  p_candidate_touch_event_key_bytes: string;
  p_candidate_qualified_touch_at_ms: number;
  p_payload_fingerprint: string;
  p_tracking_contract_version: 'v1';
  p_attribution_policy_version: 'v1';
};

export function buildAdmitQualifiedTouchRpcParamsV1(args: {
  continuationIdBytes: Buffer;
  clerkSubjectLookupDigest: string;
  qualifiedActionKind: PersistableQualifiedActionKind;
  candidateTouchEventKeyBytes: Buffer;
  candidateQualifiedTouchAtMs: number;
  payloadFingerprint: string;
  trackingContractVersion: 'v1';
  attributionPolicyVersion: 'v1';
}): AdmitQualifiedTouchRpcParamsV1 {
  return {
    p_continuation_id: encodeByteaForPostgrestRpcV1(args.continuationIdBytes),
    p_clerk_subject_lookup_digest: args.clerkSubjectLookupDigest,
    p_qualified_action_kind: args.qualifiedActionKind,
    p_candidate_touch_event_key_bytes: encodeByteaForPostgrestRpcV1(
      args.candidateTouchEventKeyBytes,
    ),
    p_candidate_qualified_touch_at_ms: args.candidateQualifiedTouchAtMs,
    p_payload_fingerprint: args.payloadFingerprint,
    p_tracking_contract_version: args.trackingContractVersion,
    p_attribution_policy_version: args.attributionPolicyVersion,
  };
}

export type AdmitQualifiedTouchRpcResultV1 = {
  outcome: AdmitQualifiedTouchOutcomeV1;
};

function parseAdmitRpcResult(raw: unknown): AdmitQualifiedTouchRpcResultV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('ADMIT_RPC_INVALID_RESPONSE');
  }
  const row = raw as Record<string, unknown>;
  if (row.ok !== true || row.status !== 'succeeded') {
    throw new Error('ADMIT_RPC_FAILED');
  }
  const outcome = row.outcome;
  if (outcome !== 'INSERTED' && outcome !== 'CONVERGED') {
    throw new Error('ADMIT_RPC_UNEXPECTED_SHAPE');
  }
  return { outcome: outcome as AdmitQualifiedTouchOutcomeV1 };
}

export async function callAdmitQualifiedTouchRpcV1(args: {
  continuationIdBytes: Buffer;
  clerkSubjectLookupDigest: string;
  qualifiedActionKind: PersistableQualifiedActionKind;
  candidateTouchEventKeyBytes: Buffer;
  candidateQualifiedTouchAtMs: number;
  payloadFingerprint: string;
  trackingContractVersion: 'v1';
  attributionPolicyVersion: 'v1';
}): Promise<AdmitQualifiedTouchRpcResultV1> {
  const db = getSupabaseAdmin() as any;
  const params = buildAdmitQualifiedTouchRpcParamsV1(args);
  const { data, error } = await db.rpc(M55_R5_TOUCH_ADMIT_RPC_NAME, params);

  if (error) {
    throw new Error(classifyAdmitQualifiedTouchRpcErrorV1(error));
  }

  return parseAdmitRpcResult(data);
}
