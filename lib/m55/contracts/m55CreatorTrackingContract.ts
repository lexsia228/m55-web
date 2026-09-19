/**
 * M55 Creator tracking — R5-A machine semantics (subject, touch, clock, tie, token, replay).
 * Human freeze: M55-R5-R5A-POLICY-HUMAN-FREEZE-REV2.
 * Narrative owners: Operating Model §14/§17; Compliance §AG (R5-A FROZEN).
 * Do not treat this contract as current runtime truth. R5-B/R5-C remain unimplemented.
 */

export const M55_CREATOR_TRACKING_CONTRACT_VERSION = 'v1' as const;

export const M55_CREATOR_TRACKING_ENFORCEMENT_STATUS =
  'R5A_SEMANTICS_FROZEN_RUNTIME_NOT_IMPLEMENTED' as const;

export const M55_TRACKING_SUBJECT_AUTHORITY = {
  v1Namespace: 'CLERK_USER_ID',
  requiresServerAuthenticatedClerkUserId: true,
  authenticatedDirectVerifiedCreatorLinkMayQualify: true,
  authenticationContinuationIsAllowedNotMandatory: true,
  unauthenticatedLandingAloneCannotQualifyCreatorTouch: true,
  oldCookieRereadAloneCannotCreateNewTouch: true,
  verifiedCreatorLinkThenAuthenticationContinuationMayQualifyAsSameLogicalAction: true,
  genericAnonymousToAccountAutoMerge: 'PROHIBITED',
  crossAccountUnion: 'PROHIBITED',
  sameDeviceUnion: 'PROHIBITED',
  sameIpUnion: 'PROHIBITED',
} as const;

export const M55_FORBIDDEN_BUYER_AUTHORITY_FIELDS = [
  'email',
  'cookie',
  'device',
  'clientBody',
  'anonymousId',
  'browserId',
  'sessionCookie',
] as const;

export type ForbiddenBuyerAuthorityField =
  (typeof M55_FORBIDDEN_BUYER_AUTHORITY_FIELDS)[number];

export const M55_ABSOLUTE_TIME_REPRESENTATION_V1 = {
  m55HelperUnit: 'UNIX_EPOCH_MILLISECONDS',
  integerRequired: true,
  qualifiedTouchAtMsUnit: 'UNIX_EPOCH_MILLISECONDS',
  attributionLockedAtMsUnit: 'UNIX_EPOCH_MILLISECONDS',
  serverAcceptedAtMsUnit: 'UNIX_EPOCH_MILLISECONDS',
  cutoffAtMsUnit: 'UNIX_EPOCH_MILLISECONDS',
} as const;

export const M55_QUALIFIED_TOUCH_CLOCK = {
  authority: 'M55_SERVER_QUALIFIED_ACTION_ACCEPTANCE_UTC',
  v1AbsoluteRepresentation: 'UNIX_EPOCH_MILLISECONDS',
  retryMustNotUpdateTimestamp: true,
} as const;

export const M55_FORBIDDEN_TOUCH_TIME_AUTHORITIES = [
  'clientTimestamp',
  'cookieTimestamp',
  'cookieWriteTime',
  'dbCommitCompletionTime',
  'dbInsertSequence',
  'dbGeneratedTemporalOrdering',
] as const;

export const M55_TOUCH_EVENT_KEY_CONTRACT = {
  scope: 'LOGICAL_TOUCH_EVENT',
  generatedBeforeFirstPersist: true,
  minEntropyBits: 128,
  v1FixedByteLength: 16,
  v1HexCharLength: 32,
  serializedV1Representation: 'LOWERCASE_32_HEX',
  representation: 'UNSIGNED_FIXED_LENGTH_BYTES',
  comparison: 'UNSIGNED_BYTE_ORDER_ASC',
  uppercaseOrNoncanonicalHex: 'REJECT',
  invalidEncoding: 'REJECT',
  mixedLength: 'REJECT',
  sameKeyDifferentPayload: 'REJECT',
  sameBytesSameEventIdentity: true,
  unpredictable: true,
  immutable: true,
  retryPreservesSameKey: true,
  creatorOrBuyerSelectable: false,
} as const;

export const M55_FORBIDDEN_TIE_AUTHORITIES = [
  'serial',
  'sequence',
  'dbInsertionOrder',
  'commitOrder',
  'dbGeneratedTemporalOrdering',
  'localeStringOrdering',
] as const;

export const M55_TOUCH_TIE_BREAK = {
  appliesOnlyWhenTimestampsEqual: true,
  order: ['qualified_touch_at DESC', 'touch_event_key ASC'] as const,
  candidateSetFrozenAtCheckoutLock: true,
  dbFirstWriterWinsMustNotDecideMoneyWinner: true,
} as const;

export const M55_CANDIDATE_CUTOFF_CONTRACT = {
  establishedAt: 'CHECKOUT_LOCK_SERVER_ACCEPTANCE_CUTOFF',
  preCutoffAcceptedTouchMustReachDurableAdmissionBeforeWinnerSelection: true,
  pendingPreCutoffAdmission: 'WAIT_RETRY_HOLD',
  silentExclusionOfPendingPreCutoffAdmission: 'PROHIBITED',
  postCutoffTouchCannotJoinThatLock: true,
  dbCommitLatencyMustNotDecideWinner: true,
  dbFirstWriterWinsMustNotBeSelectionAuthority: true,
  dbLockingImplementation: 'OUT_OF_SCOPE_R5A',
} as const;

export const M55_CREATOR_TRACKING_TOKEN_CONTRACT = {
  kind: 'VERSIONED_OPAQUE_AUTHENTICATED_TOKEN',
  clientVisibleTokenMustNotExposeCreatorRawIdentity: true,
  resolution: 'SERVER_SIDE',
  purposeNamespaceSeparationRequired: true,
  tokenIdentityDistinctFromLogicalTouchEventIdentity: true,
  reusableCreatorLinkIsNotOneShot: true,
  distinctAuthenticTouchesOnSameLinkMayCreateNewEvents: true,
  httpRetryMustConvergeToSameLogicalEvent: true,
  retryMustNotUpdateTouchTimestamp: true,
  permanentLinkTokenDedupe: 'PROHIBITED',
  newIngestEligibilityDistinctFromHistoricalVerificationEvidence: true,
  retiredOrRevokedVersionMayPreserveHistoricalVerificationEvidence: true,
  cryptographicRuntimeOwner: 'R5_C',
} as const;

export type TrackingLane = 'CREATOR' | 'GENERAL';

export type QualifiedCreatorActionKind =
  | 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK'
  | 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION'
  | 'UNAUTHENTICATED_LANDING_ALONE'
  | 'OLD_COOKIE_REREAD_ALONE';

export type QualifiedTouchAdmissionInput = {
  lane: TrackingLane;
  serverAuthenticatedClerkUserId: string | null;
  action: QualifiedCreatorActionKind;
};

export type TouchEventOrderInput = {
  /** v1: Unix epoch milliseconds (integer), not Stripe Event.created seconds. */
  qualifiedTouchAtMs: number;
  /** v1 canonical serialized form: lowercase 32-hex encoding of 16 bytes. */
  touchEventKeyHex: string;
};

export type UnixEpochMsParseResult =
  | { ok: true; unixEpochMs: number }
  | { ok: false; reason: 'INVALID_TIMESTAMP' };

export type TouchEventKeyParseResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: 'INVALID_ENCODING' | 'INVALID_LENGTH' };

export type CandidateCutoffParticipation =
  | 'INCLUDE_AFTER_DURABLE_ADMISSION'
  | 'WAIT_RETRY_HOLD'
  | 'EXCLUDE_POST_CUTOFF'
  | 'HOLD_INVALID_TIMESTAMP';

export type TokenIngestState = 'KNOWN_ACTIVE' | 'UNKNOWN' | 'RETIRED_OR_REVOKED';

export type NewTouchIngestDecision = 'ALLOW' | 'REJECT';

export type TouchPayloadBindingDecision =
  | 'CONVERGE_SAME_EVENT'
  | 'REJECT_SAME_KEY_DIFFERENT_PAYLOAD'
  | 'DISTINCT_EVENT';

export function isForbiddenBuyerAuthorityField(
  field: string,
): field is ForbiddenBuyerAuthorityField {
  return (M55_FORBIDDEN_BUYER_AUTHORITY_FIELDS as readonly string[]).includes(field);
}

export function isBuyerAuthorityField(field: string): boolean {
  return field === 'clerkUserId';
}

export function canAdmitQualifiedCreatorTouch(
  input: QualifiedTouchAdmissionInput,
): boolean {
  if (input.lane !== 'CREATOR') return false;
  if (input.action === 'UNAUTHENTICATED_LANDING_ALONE') return false;
  if (input.action === 'OLD_COOKIE_REREAD_ALONE') return false;
  if (!input.serverAuthenticatedClerkUserId) return false;
  return (
    input.action === 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK' ||
    input.action === 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION'
  );
}

export function parseUnixEpochMilliseconds(value: number): UnixEpochMsParseResult {
  if (!Number.isSafeInteger(value) || value < 0) {
    return { ok: false, reason: 'INVALID_TIMESTAMP' };
  }
  return { ok: true, unixEpochMs: value };
}

export function parseUnixEpochSeconds(value: number): UnixEpochMsParseResult {
  if (!Number.isSafeInteger(value) || value < 0) {
    return { ok: false, reason: 'INVALID_TIMESTAMP' };
  }
  return { ok: true, unixEpochMs: value };
}

export function parseTouchEventKeyHex(hex: string): TouchEventKeyParseResult {
  if (!/^[0-9a-f]+$/.test(hex) || hex.length % 2 !== 0) {
    return { ok: false, reason: 'INVALID_ENCODING' };
  }
  if (hex.length !== M55_TOUCH_EVENT_KEY_CONTRACT.v1HexCharLength) {
    return { ok: false, reason: 'INVALID_LENGTH' };
  }
  const bytes = new Uint8Array(M55_TOUCH_EVENT_KEY_CONTRACT.v1FixedByteLength);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return { ok: true, bytes };
}

export function touchEventKeysHaveSameIdentity(aHex: string, bHex: string): boolean {
  const a = parseTouchEventKeyHex(aHex);
  const b = parseTouchEventKeyHex(bHex);
  if (!a.ok || !b.ok) return false;
  const bytesEqual = compareTouchEventKeyUnsignedAsc(aHex, bHex) === 0;
  const serializedEqual = aHex === bHex;
  if (bytesEqual !== serializedEqual) {
    throw new Error('TOUCH_EVENT_KEY_IDENTITY_DIVERGENCE');
  }
  return serializedEqual;
}

export function compareTouchEventKeyUnsignedAsc(aHex: string, bHex: string): number {
  const a = parseTouchEventKeyHex(aHex);
  const b = parseTouchEventKeyHex(bHex);
  if (!a.ok || !b.ok) {
    throw new Error('INVALID_TOUCH_EVENT_KEY');
  }
  for (let i = 0; i < a.bytes.length; i += 1) {
    if (a.bytes[i] !== b.bytes[i]) return a.bytes[i] - b.bytes[i];
  }
  return 0;
}

/**
 * Total order for lock selection: later qualified_touch_at wins;
 * exact timestamp ties use unsigned touch_event_key ascending.
 * Invalid or mixed-length keys are rejected, not zero-padded.
 */
export function compareQualifiedTouchesForLock(
  left: TouchEventOrderInput,
  right: TouchEventOrderInput,
): number {
  const leftMs = parseUnixEpochMilliseconds(left.qualifiedTouchAtMs);
  const rightMs = parseUnixEpochMilliseconds(right.qualifiedTouchAtMs);
  if (!leftMs.ok || !rightMs.ok) {
    throw new Error('INVALID_TIMESTAMP');
  }
  const leftKey = parseTouchEventKeyHex(left.touchEventKeyHex);
  const rightKey = parseTouchEventKeyHex(right.touchEventKeyHex);
  if (!leftKey.ok || !rightKey.ok) {
    throw new Error('INVALID_TOUCH_EVENT_KEY');
  }
  if (left.qualifiedTouchAtMs !== right.qualifiedTouchAtMs) {
    return right.qualifiedTouchAtMs - left.qualifiedTouchAtMs;
  }
  return compareTouchEventKeyUnsignedAsc(left.touchEventKeyHex, right.touchEventKeyHex);
}

export function selectLatestQualifiedTouch<T extends TouchEventOrderInput>(
  candidates: readonly T[],
): T | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort(compareQualifiedTouchesForLock)[0] ?? null;
}

export function evaluateCandidateCutoffParticipation(args: {
  serverAcceptedAtMs: number;
  cutoffAtMs: number;
  durableAdmissionComplete: boolean;
}): CandidateCutoffParticipation {
  const accepted = parseUnixEpochMilliseconds(args.serverAcceptedAtMs);
  const cutoff = parseUnixEpochMilliseconds(args.cutoffAtMs);
  if (!accepted.ok || !cutoff.ok) return 'HOLD_INVALID_TIMESTAMP';
  if (args.serverAcceptedAtMs > args.cutoffAtMs) return 'EXCLUDE_POST_CUTOFF';
  if (!args.durableAdmissionComplete) return 'WAIT_RETRY_HOLD';
  return 'INCLUDE_AFTER_DURABLE_ADMISSION';
}

export function evaluateTouchPayloadBinding(args: {
  sameTouchEventKey: boolean;
  payloadUnchanged: boolean;
}): TouchPayloadBindingDecision {
  if (args.sameTouchEventKey && !args.payloadUnchanged) {
    return 'REJECT_SAME_KEY_DIFFERENT_PAYLOAD';
  }
  if (args.sameTouchEventKey && args.payloadUnchanged) return 'CONVERGE_SAME_EVENT';
  return 'DISTINCT_EVENT';
}

export function touchReplayConverges(args: {
  sameLogicalEvent: boolean;
  sameIdempotencyKey: boolean;
  payloadUnchanged: boolean;
}): boolean {
  return args.sameLogicalEvent && args.sameIdempotencyKey && args.payloadUnchanged;
}

export function retryPreservesTouchIdentity(args: {
  originalTouchAtMs: number;
  retryTouchAtMs: number;
  originalTouchEventKeyHex: string;
  retryTouchEventKeyHex: string;
}): boolean {
  const originalMs = parseUnixEpochMilliseconds(args.originalTouchAtMs);
  const retryMs = parseUnixEpochMilliseconds(args.retryTouchAtMs);
  if (!originalMs.ok || !retryMs.ok) return false;
  return (
    args.originalTouchAtMs === args.retryTouchAtMs &&
    touchEventKeysHaveSameIdentity(
      args.originalTouchEventKeyHex,
      args.retryTouchEventKeyHex,
    )
  );
}

export function evaluateNewTouchIngestEligibility(
  state: TokenIngestState,
): NewTouchIngestDecision {
  return state === 'KNOWN_ACTIVE' ? 'ALLOW' : 'REJECT';
}
