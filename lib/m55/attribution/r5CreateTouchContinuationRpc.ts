import 'server-only';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  M55_R5_TOUCH_CREATE_RPC_NAME,
  classifyCreateTouchContinuationRpcErrorV1,
  type CreateTouchContinuationOutcomeV1,
} from './r5TouchIngestContract';
import type { PersistableQualifiedActionKind } from './r5TouchSchemaContract';
import {
  encodeByteaForPostgrestRpcV1,
  encodeNullableByteaForPostgrestRpcV1,
} from './r5TouchContinuation';

export type CreateTouchContinuationRpcParamsV1 = {
  p_cookie_continuation_id: string | null;
  p_new_continuation_id: string;
  p_token_digest: string;
  p_token_version: 'v1';
  p_qualified_action_kind: PersistableQualifiedActionKind;
  p_direct_buyer_subject_lookup_digest: string | null;
};

export function buildCreateTouchContinuationRpcParamsV1(args: {
  cookieContinuationIdBytes: Buffer | null;
  newContinuationIdBytes: Buffer;
  tokenDigest: string;
  tokenVersion: 'v1';
  qualifiedActionKind: PersistableQualifiedActionKind;
  directBuyerSubjectLookupDigest: string | null;
}): CreateTouchContinuationRpcParamsV1 {
  return {
    p_cookie_continuation_id: encodeNullableByteaForPostgrestRpcV1(args.cookieContinuationIdBytes),
    p_new_continuation_id: encodeByteaForPostgrestRpcV1(args.newContinuationIdBytes),
    p_token_digest: args.tokenDigest,
    p_token_version: args.tokenVersion,
    p_qualified_action_kind: args.qualifiedActionKind,
    p_direct_buyer_subject_lookup_digest: args.directBuyerSubjectLookupDigest,
  };
}

export type CreateTouchContinuationRpcResultV1 = {
  outcome: CreateTouchContinuationOutcomeV1;
  continuationIdHex: string;
};

function parseCreateRpcResult(raw: unknown): CreateTouchContinuationRpcResultV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('CREATE_RPC_INVALID_RESPONSE');
  }
  const row = raw as Record<string, unknown>;
  if (row.ok !== true || row.status !== 'succeeded') {
    throw new Error('CREATE_RPC_FAILED');
  }
  const outcome = row.outcome;
  const continuationIdHex = row.continuation_id_hex;
  if (
    (outcome !== 'INTENT_CREATED' && outcome !== 'INTENT_REUSED') ||
    typeof continuationIdHex !== 'string' ||
    !/^[0-9a-f]{32}$/.test(continuationIdHex)
  ) {
    throw new Error('CREATE_RPC_UNEXPECTED_SHAPE');
  }
  return {
    outcome: outcome as CreateTouchContinuationOutcomeV1,
    continuationIdHex,
  };
}

export async function callCreateTouchContinuationRpcV1(args: {
  cookieContinuationIdBytes: Buffer | null;
  newContinuationIdBytes: Buffer;
  tokenDigest: string;
  tokenVersion: 'v1';
  qualifiedActionKind: PersistableQualifiedActionKind;
  directBuyerSubjectLookupDigest: string | null;
}): Promise<CreateTouchContinuationRpcResultV1> {
  const db = getSupabaseAdmin() as any;
  const params = buildCreateTouchContinuationRpcParamsV1(args);
  const { data, error } = await db.rpc(M55_R5_TOUCH_CREATE_RPC_NAME, params);

  if (error) {
    throw new Error(classifyCreateTouchContinuationRpcErrorV1(error));
  }

  return parseCreateRpcResult(data);
}
