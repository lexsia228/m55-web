import {
  M55_R5_TOUCH_SCHEMA_ATTRIBUTION_POLICY_VERSION,
  M55_R5_TOUCH_SCHEMA_PERSISTABLE_QUALIFIED_ACTIONS,
  M55_R5_TOUCH_SCHEMA_TRACKING_CONTRACT_VERSION,
  type PersistableQualifiedActionKind,
} from './r5TouchSchemaContract';

export const M55_R5_TOUCH_INGEST_MIGRATION_FILENAME =
  '20260920000000_m55_r5_attribution_admit_qualified_touch_v1.sql' as const;

export const M55_R5_TOUCH_CONTINUATION_COOKIE_NAME = 'm55_r5_ctc' as const;
export const M55_R5_TOUCH_CONTINUATION_COOKIE_PATH = '/api' as const;
export const M55_R5_TOUCH_CONTINUATION_COOKIE_MAX_AGE_SECONDS = 900 as const;
export const M55_R5_S2_CONTINUATION_TTL_MS = 900_000 as const;

export const M55_R5_TOUCH_CREATE_RPC_NAME =
  'm55_r5_attribution_create_touch_continuation_v1' as const;
export const M55_R5_TOUCH_ADMIT_RPC_NAME =
  'm55_r5_attribution_admit_qualified_touch_v1' as const;

export const M55_R5_TOUCH_INGEST_PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
} as const;

export const M55_R5_TOUCH_CONTEXT_READ_TRANSPORT_ERROR =
  'CONTEXT_READ_TRANSPORT_ERROR' as const;

export const M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR =
  'CREATE_RPC_TRANSPORT_ERROR' as const;
export const M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR =
  'ADMIT_RPC_TRANSPORT_ERROR' as const;

export const M55_R5_TOUCH_CREATE_RPC_SEMANTIC_CODES = [
  'INVALID_INPUT',
  'QUALIFIED_ACTION_KIND_INVALID',
  'DIRECT_BUYER_BINDING_REQUIRED',
  'PREAUTH_BUYER_BINDING_FORBIDDEN',
  'CONTINUATION_ID_COLLISION',
] as const;

export const M55_R5_TOUCH_ADMIT_RPC_SEMANTIC_CODES = [
  'INVALID_INPUT',
  'QUALIFIED_ACTION_KIND_INVALID',
  'CONTINUATION_NOT_FOUND',
  'CONTINUATION_INVALID',
  'CONTINUATION_EXPIRED',
  'CONTINUATION_BUYER_MISMATCH',
  'TOUCH_KEY_PAYLOAD_MISMATCH',
  'BUYER_SUBJECT_DELETED',
  'BUYER_SUBJECT_AMBIGUOUS',
  'REFERRAL_LINK_NOT_FOUND',
  'LINK_NOT_ACTIVE_FOR_NEW_TOUCH',
  'REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH',
  'CREATOR_NOT_ACTIVE_FOR_NEW_TOUCH',
] as const;

export type CreateTouchContinuationRpcSemanticCodeV1 =
  (typeof M55_R5_TOUCH_CREATE_RPC_SEMANTIC_CODES)[number];

export type TouchAdmitRpcErrorCodeV1 =
  (typeof M55_R5_TOUCH_ADMIT_RPC_SEMANTIC_CODES)[number];

const M55_R5_TOUCH_CREATE_RPC_SEMANTIC_CODE_SET = new Set<string>(
  M55_R5_TOUCH_CREATE_RPC_SEMANTIC_CODES,
);
const M55_R5_TOUCH_ADMIT_RPC_SEMANTIC_CODE_SET = new Set<string>(
  M55_R5_TOUCH_ADMIT_RPC_SEMANTIC_CODES,
);

function extractExactRpcErrorMessageV1(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const message = (error as { message?: unknown }).message;
  if (typeof message !== 'string' || message.length === 0) return null;
  return message;
}

export function classifyCreateTouchContinuationRpcErrorV1(
  error: unknown,
): CreateTouchContinuationRpcSemanticCodeV1 | typeof M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && M55_R5_TOUCH_CREATE_RPC_SEMANTIC_CODE_SET.has(message)) {
    return message as CreateTouchContinuationRpcSemanticCodeV1;
  }
  return M55_R5_TOUCH_CREATE_RPC_TRANSPORT_ERROR;
}

export function classifyAdmitQualifiedTouchRpcErrorV1(
  error: unknown,
): TouchAdmitRpcErrorCodeV1 | typeof M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR {
  const message = extractExactRpcErrorMessageV1(error);
  if (message && M55_R5_TOUCH_ADMIT_RPC_SEMANTIC_CODE_SET.has(message)) {
    return message as TouchAdmitRpcErrorCodeV1;
  }
  return M55_R5_TOUCH_ADMIT_RPC_TRANSPORT_ERROR;
}

export function parseCreatorTouchPhase1JsonBodyV1(
  body: unknown,
): { ok: true; token: string } | { ok: false; errorCode: 'INVALID_INPUT' } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errorCode: 'INVALID_INPUT' };
  }
  const keys = Object.keys(body);
  if (keys.length !== 1 || keys[0] !== 'token') {
    return { ok: false, errorCode: 'INVALID_INPUT' };
  }
  const token = (body as { token: unknown }).token;
  if (typeof token !== 'string') {
    return { ok: false, errorCode: 'INVALID_INPUT' };
  }
  return { ok: true, token };
}

export function isEmptyHttpRequestBodyV1(rawBody: string): boolean {
  return rawBody.length === 0;
}

export type SupabaseMaybeSingleResultV1<T> = {
  data: T | null | undefined;
  error: unknown;
};

export type InterpretedSupabaseMaybeSingleV1<T> =
  | { status: 'row'; row: T }
  | { status: 'empty' };

export function interpretSupabaseMaybeSingleReadV1<T>(
  result: SupabaseMaybeSingleResultV1<T>,
): InterpretedSupabaseMaybeSingleV1<T> {
  if (result.error) {
    throw new Error(M55_R5_TOUCH_CONTEXT_READ_TRANSPORT_ERROR);
  }
  if (result.data == null) {
    return { status: 'empty' };
  }
  return { status: 'row', row: result.data };
}

export type CreatorTrackingTokenRegistryErrorCodeV1 =
  | 'INVALID_TOKEN'
  | 'REFERRAL_LINK_NOT_FOUND'
  | 'LINK_NOT_ACTIVE'
  | 'CREATOR_NOT_ACTIVE'
  | 'REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH';

export type TouchAdmissionServerContextErrorCodeV1 =
  | 'CONTINUATION_NOT_FOUND'
  | 'CONTINUATION_INVALID'
  | 'CONTINUATION_EXPIRED'
  | 'REFERRAL_LINK_NOT_FOUND'
  | 'REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH'
  | 'LINK_NOT_ACTIVE'
  | 'CREATOR_NOT_ACTIVE'
  | 'SELF_REFERRAL';

export const M55_R5_TOUCH_TERMINAL_COOKIE_CLEAR_ERRORS = new Set<string>([
  'CONTINUATION_NOT_FOUND',
  'CONTINUATION_INVALID',
  'CONTINUATION_EXPIRED',
  'CONTINUATION_BUYER_MISMATCH',
  'TOUCH_KEY_PAYLOAD_MISMATCH',
  'SELF_REFERRAL',
  'LINK_NOT_ACTIVE',
  'CREATOR_NOT_ACTIVE',
  'REFERRAL_LINK_NOT_FOUND',
  'REFERRAL_LINK_CREATOR_IDENTITY_MISMATCH',
  'BUYER_SUBJECT_DELETED',
  'INVALID_TOKEN',
]);

export type TouchAdmissionServerContextV1 =
  | {
      ok: true;
      tokenDigest: string;
      tokenVersion: 'v1';
      qualifiedActionKind: PersistableQualifiedActionKind;
      creatorClerkUserId: string;
      isBound: boolean;
      boundTouchEventKeyBytes: Buffer | null;
      boundQualifiedTouchAtMs: number | null;
      boundPayloadFingerprint: string | null;
    }
  | {
      ok: false;
      errorCode: TouchAdmissionServerContextErrorCodeV1;
    };

export type CreateTouchContinuationOutcomeV1 = 'INTENT_CREATED' | 'INTENT_REUSED';
export type AdmitQualifiedTouchOutcomeV1 = 'INSERTED' | 'CONVERGED';

export {
  M55_R5_TOUCH_SCHEMA_PERSISTABLE_QUALIFIED_ACTIONS,
  M55_R5_TOUCH_SCHEMA_TRACKING_CONTRACT_VERSION,
  M55_R5_TOUCH_SCHEMA_ATTRIBUTION_POLICY_VERSION,
};
