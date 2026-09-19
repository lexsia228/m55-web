import { createHash } from 'node:crypto';
import { isValidClerkUserId } from '../accountDeletionClerkWebhookContract';
import { M55_ATTRIBUTION_POLICY_CONTRACT_VERSION } from '../contracts/m55AttributionPolicyContract';
import {
  evaluateNewTouchIngestEligibility,
  evaluateTouchPayloadBinding,
  M55_CREATOR_TRACKING_CONTRACT_VERSION,
  parseTouchEventKeyHex,
  parseUnixEpochMilliseconds,
  type TokenIngestState,
  type TouchPayloadBindingDecision,
  type UnixEpochMsParseResult,
} from '../contracts/m55CreatorTrackingContract';

export const M55_R5_TOUCH_SCHEMA_MIGRATION_FILENAME =
  '20260919000000_m55_attribution_touch_schema_v1.sql' as const;

export const M55_R5_TOUCH_SCHEMA_TOKEN_VERSION = M55_CREATOR_TRACKING_CONTRACT_VERSION;
export const M55_R5_TOUCH_SCHEMA_TRACKING_CONTRACT_VERSION =
  M55_CREATOR_TRACKING_CONTRACT_VERSION;
export const M55_R5_TOUCH_SCHEMA_ATTRIBUTION_POLICY_VERSION =
  M55_ATTRIBUTION_POLICY_CONTRACT_VERSION;

export const M55_R5_TOUCH_SCHEMA_MAX_SAFE_INTEGER_MS = 9007199254740991;
export const M55_R5_TOUCH_SCHEMA_SHA256_LOWER_HEX_RE = /^[0-9a-f]{64}$/;

export const M55_R5_ATTRIBUTION_BUYER_SUBJECT_LOOKUP_PURPOSE_V1 =
  'm55.r5.attribution.buyer_subject.clerk_lookup.v1' as const;

export const M55_R5_TOUCH_SCHEMA_PERSISTABLE_QUALIFIED_ACTIONS = [
  'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
  'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
] as const;

export type PersistableQualifiedActionKind =
  (typeof M55_R5_TOUCH_SCHEMA_PERSISTABLE_QUALIFIED_ACTIONS)[number];

export type LinkIngestState = 'ACTIVE' | 'RETIRED_OR_REVOKED';

export function isSha256LowerHex64(value: string): boolean {
  return M55_R5_TOUCH_SCHEMA_SHA256_LOWER_HEX_RE.test(value);
}

export function deriveAttributionBuyerSubjectLookupDigestV1(clerkUserId: string): string {
  if (!isValidClerkUserId(clerkUserId)) {
    throw new Error('INVALID_CLERK_USER_ID');
  }

  return createHash('sha256')
    .update(M55_R5_ATTRIBUTION_BUYER_SUBJECT_LOOKUP_PURPOSE_V1, 'utf8')
    .update('\0', 'utf8')
    .update(clerkUserId, 'utf8')
    .digest('hex');
}

export function isPersistableQualifiedActionKind(value: string): value is PersistableQualifiedActionKind {
  return (M55_R5_TOUCH_SCHEMA_PERSISTABLE_QUALIFIED_ACTIONS as readonly string[]).includes(value);
}

export function parseQualifiedTouchAtMsForSchema(value: number): UnixEpochMsParseResult {
  return parseUnixEpochMilliseconds(value);
}

export function parseTouchEventKeyBytesForSchema(hex: string) {
  return parseTouchEventKeyHex(hex);
}

export function touchEventKeyHexToByteaBuffer(hex: string): Buffer {
  const parsed = parseTouchEventKeyHex(hex);
  if (!parsed.ok) {
    throw new Error('INVALID_TOUCH_EVENT_KEY');
  }
  return Buffer.from(parsed.bytes);
}

export function mapLinkIngestStateToTokenIngestState(
  state: LinkIngestState,
): TokenIngestState {
  return state === 'ACTIVE' ? 'KNOWN_ACTIVE' : 'RETIRED_OR_REVOKED';
}

export function evaluateTouchPayloadBindingForSchema(args: {
  sameTouchEventKey: boolean;
  payloadUnchanged: boolean;
}): TouchPayloadBindingDecision {
  return evaluateTouchPayloadBinding(args);
}

export function evaluateNewTouchIngestFromLinkState(
  ingestState: LinkIngestState,
): ReturnType<typeof evaluateNewTouchIngestEligibility> {
  return evaluateNewTouchIngestEligibility(mapLinkIngestStateToTokenIngestState(ingestState));
}
