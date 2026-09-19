import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  M55_ABSOLUTE_TIME_REPRESENTATION_V1,
  M55_CANDIDATE_CUTOFF_CONTRACT,
  M55_CREATOR_TRACKING_CONTRACT_VERSION,
  M55_CREATOR_TRACKING_ENFORCEMENT_STATUS,
  M55_CREATOR_TRACKING_TOKEN_CONTRACT,
  M55_FORBIDDEN_BUYER_AUTHORITY_FIELDS,
  M55_FORBIDDEN_TIE_AUTHORITIES,
  M55_FORBIDDEN_TOUCH_TIME_AUTHORITIES,
  M55_QUALIFIED_TOUCH_CLOCK,
  M55_TOUCH_EVENT_KEY_CONTRACT,
  M55_TOUCH_TIE_BREAK,
  M55_TRACKING_SUBJECT_AUTHORITY,
  canAdmitQualifiedCreatorTouch,
  compareQualifiedTouchesForLock,
  compareTouchEventKeyUnsignedAsc,
  evaluateCandidateCutoffParticipation,
  evaluateNewTouchIngestEligibility,
  evaluateTouchPayloadBinding,
  isBuyerAuthorityField,
  isForbiddenBuyerAuthorityField,
  parseTouchEventKeyHex,
  parseUnixEpochMilliseconds,
  retryPreservesTouchIdentity,
  selectLatestQualifiedTouch,
  touchEventKeysHaveSameIdentity,
  touchReplayConverges,
} from './m55CreatorTrackingContract';

const KEY_LOW = '0000000000000000000000000000000a';
const KEY_HIGH = '000000000000000000000000000000ff';
const KEY_RETRY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

describe('m55CreatorTrackingContract — R5-A subject/touch/tie/token semantics', () => {
  it('locks contract version and deferred runtime enforcement', () => {
    assert.equal(M55_CREATOR_TRACKING_CONTRACT_VERSION, 'v1');
    assert.equal(
      M55_CREATOR_TRACKING_ENFORCEMENT_STATUS,
      'R5A_SEMANTICS_FROZEN_RUNTIME_NOT_IMPLEMENTED',
    );
  });

  it('requires server-authenticated Clerk userId as v1 buyer/tracking subject', () => {
    assert.equal(M55_TRACKING_SUBJECT_AUTHORITY.v1Namespace, 'CLERK_USER_ID');
    assert.equal(M55_TRACKING_SUBJECT_AUTHORITY.requiresServerAuthenticatedClerkUserId, true);
    assert.equal(isBuyerAuthorityField('clerkUserId'), true);
  });

  it('forbids email/cookie/device/client fields as buyer authority', () => {
    for (const field of ['email', 'cookie', 'device', 'clientBody'] as const) {
      assert.equal(isForbiddenBuyerAuthorityField(field), true);
      assert.equal(isBuyerAuthorityField(field), false);
    }
    assert.ok(M55_FORBIDDEN_BUYER_AUTHORITY_FIELDS.includes('anonymousId'));
  });

  it('admits an already-authenticated Clerk subject using a verified Creator link', () => {
    assert.equal(
      M55_TRACKING_SUBJECT_AUTHORITY.authenticatedDirectVerifiedCreatorLinkMayQualify,
      true,
    );
    assert.equal(
      M55_TRACKING_SUBJECT_AUTHORITY.authenticationContinuationIsAllowedNotMandatory,
      true,
    );
    assert.equal(
      canAdmitQualifiedCreatorTouch({
        lane: 'CREATOR',
        serverAuthenticatedClerkUserId: 'user_123',
        action: 'AUTHENTICATED_DIRECT_VERIFIED_CREATOR_LINK',
      }),
      true,
    );
  });

  it('admits verified pre-auth Creator-link then same-action login continuation after auth', () => {
    assert.equal(
      M55_TRACKING_SUBJECT_AUTHORITY
        .verifiedCreatorLinkThenAuthenticationContinuationMayQualifyAsSameLogicalAction,
      true,
    );
    assert.equal(
      canAdmitQualifiedCreatorTouch({
        lane: 'CREATOR',
        serverAuthenticatedClerkUserId: 'user_123',
        action: 'VERIFIED_PREAUTH_LINK_THEN_SAME_ACTION_LOGIN_CONTINUATION',
      }),
      true,
    );
  });

  it('rejects unauthenticated landing alone as a qualified Creator touch', () => {
    assert.equal(
      M55_TRACKING_SUBJECT_AUTHORITY.unauthenticatedLandingAloneCannotQualifyCreatorTouch,
      true,
    );
    assert.equal(
      canAdmitQualifiedCreatorTouch({
        lane: 'CREATOR',
        serverAuthenticatedClerkUserId: null,
        action: 'UNAUTHENTICATED_LANDING_ALONE',
      }),
      false,
    );
  });

  it('rejects old cookie reread alone as a new touch', () => {
    assert.equal(
      M55_TRACKING_SUBJECT_AUTHORITY.oldCookieRereadAloneCannotCreateNewTouch,
      true,
    );
    assert.equal(
      canAdmitQualifiedCreatorTouch({
        lane: 'CREATOR',
        serverAuthenticatedClerkUserId: 'user_123',
        action: 'OLD_COOKIE_REREAD_ALONE',
      }),
      false,
    );
  });

  it('prohibits generic anonymous auto-merge and cross-account/device/IP union', () => {
    assert.equal(M55_TRACKING_SUBJECT_AUTHORITY.genericAnonymousToAccountAutoMerge, 'PROHIBITED');
    assert.equal(M55_TRACKING_SUBJECT_AUTHORITY.crossAccountUnion, 'PROHIBITED');
    assert.equal(M55_TRACKING_SUBJECT_AUTHORITY.sameDeviceUnion, 'PROHIBITED');
    assert.equal(M55_TRACKING_SUBJECT_AUTHORITY.sameIpUnion, 'PROHIBITED');
  });

  it('locks server UTC qualified-action acceptance as Unix epoch milliseconds', () => {
    assert.equal(
      M55_QUALIFIED_TOUCH_CLOCK.authority,
      'M55_SERVER_QUALIFIED_ACTION_ACCEPTANCE_UTC',
    );
    assert.equal(M55_QUALIFIED_TOUCH_CLOCK.v1AbsoluteRepresentation, 'UNIX_EPOCH_MILLISECONDS');
    assert.equal(M55_ABSOLUTE_TIME_REPRESENTATION_V1.qualifiedTouchAtMsUnit, 'UNIX_EPOCH_MILLISECONDS');
    assert.equal(M55_ABSOLUTE_TIME_REPRESENTATION_V1.integerRequired, true);
    assert.equal(M55_QUALIFIED_TOUCH_CLOCK.retryMustNotUpdateTimestamp, true);
    assert.equal(parseUnixEpochMilliseconds(100).ok, true);
    assert.equal(parseUnixEpochMilliseconds(100.5).ok, false);
    assert.equal(parseUnixEpochMilliseconds(Number.NaN).ok, false);
    assert.equal(parseUnixEpochMilliseconds(Number.MAX_SAFE_INTEGER + 1).ok, false);
    assert.equal(parseUnixEpochMilliseconds(Number.MAX_SAFE_INTEGER).ok, true);
  });

  it('forbids client, cookie, and DB-commit timestamps as winner authority', () => {
    assert.deepEqual(
      [...M55_FORBIDDEN_TOUCH_TIME_AUTHORITIES],
      [
        'clientTimestamp',
        'cookieTimestamp',
        'cookieWriteTime',
        'dbCommitCompletionTime',
        'dbInsertSequence',
        'dbGeneratedTemporalOrdering',
      ],
    );
  });

  it('forbids serial/sequence/insert/commit/locale order as tie authority', () => {
    assert.deepEqual(
      [...M55_FORBIDDEN_TIE_AUTHORITIES],
      [
        'serial',
        'sequence',
        'dbInsertionOrder',
        'commitOrder',
        'dbGeneratedTemporalOrdering',
        'localeStringOrdering',
      ],
    );
    assert.equal(M55_TOUCH_TIE_BREAK.dbFirstWriterWinsMustNotDecideMoneyWinner, true);
  });

  it('compares valid fixed-length lowercase touch_event_key bytes unsigned without padding', () => {
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.v1FixedByteLength, 16);
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.v1HexCharLength, 32);
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.serializedV1Representation, 'LOWERCASE_32_HEX');
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.minEntropyBits, 128);
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.comparison, 'UNSIGNED_BYTE_ORDER_ASC');
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.generatedBeforeFirstPersist, true);
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.creatorOrBuyerSelectable, false);
    assert.ok(parseTouchEventKeyHex(KEY_LOW).ok);
    assert.equal(compareTouchEventKeyUnsignedAsc(KEY_LOW, KEY_HIGH) < 0, true);
    assert.equal(touchEventKeysHaveSameIdentity(KEY_LOW, KEY_LOW), true);

    const later = { qualifiedTouchAtMs: 200, touchEventKeyHex: KEY_LOW };
    const earlier = { qualifiedTouchAtMs: 100, touchEventKeyHex: KEY_HIGH };
    assert.ok(compareQualifiedTouchesForLock(later, earlier) < 0);
    assert.equal(selectLatestQualifiedTouch([earlier, later]), later);

    const lowKey = { qualifiedTouchAtMs: 100, touchEventKeyHex: KEY_LOW };
    const highKey = { qualifiedTouchAtMs: 100, touchEventKeyHex: KEY_HIGH };
    assert.equal(selectLatestQualifiedTouch([highKey, lowKey]), lowKey);
  });

  it('rejects uppercase/noncanonical hex so comparator and retry identity cannot diverge', () => {
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.uppercaseOrNoncanonicalHex, 'REJECT');
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.sameBytesSameEventIdentity, true);
    const upper = KEY_LOW.toUpperCase();
    assert.deepEqual(parseTouchEventKeyHex(upper), { ok: false, reason: 'INVALID_ENCODING' });
    assert.equal(touchEventKeysHaveSameIdentity(KEY_LOW, upper), false);
    assert.equal(
      retryPreservesTouchIdentity({
        originalTouchAtMs: 1_000,
        retryTouchAtMs: 1_000,
        originalTouchEventKeyHex: KEY_LOW,
        retryTouchEventKeyHex: upper,
      }),
      false,
    );
    assert.throws(() => compareTouchEventKeyUnsignedAsc(KEY_LOW, upper));
  });

  it('rejects invalid hex encoding and mixed-length keys instead of zero-padding them equal', () => {
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.invalidEncoding, 'REJECT');
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.mixedLength, 'REJECT');
    assert.equal(parseTouchEventKeyHex('not-hex').ok, false);
    assert.equal(parseTouchEventKeyHex('zz').ok, false);
    assert.deepEqual(parseTouchEventKeyHex('aa'), { ok: false, reason: 'INVALID_LENGTH' });
    assert.throws(() => compareTouchEventKeyUnsignedAsc(KEY_LOW, 'aa'));
    assert.throws(() =>
      compareQualifiedTouchesForLock(
        { qualifiedTouchAtMs: 1, touchEventKeyHex: KEY_LOW },
        { qualifiedTouchAtMs: 1, touchEventKeyHex: `${KEY_LOW}ff` },
      ),
    );
  });

  it('rejects same event key with a different payload and preserves retry identity', () => {
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.sameKeyDifferentPayload, 'REJECT');
    assert.equal(M55_TOUCH_EVENT_KEY_CONTRACT.retryPreservesSameKey, true);
    assert.equal(
      evaluateTouchPayloadBinding({
        sameTouchEventKey: true,
        payloadUnchanged: false,
      }),
      'REJECT_SAME_KEY_DIFFERENT_PAYLOAD',
    );
    assert.equal(
      evaluateTouchPayloadBinding({
        sameTouchEventKey: true,
        payloadUnchanged: true,
      }),
      'CONVERGE_SAME_EVENT',
    );
    assert.equal(
      retryPreservesTouchIdentity({
        originalTouchAtMs: 1_000,
        retryTouchAtMs: 1_000,
        originalTouchEventKeyHex: KEY_RETRY,
        retryTouchEventKeyHex: KEY_RETRY,
      }),
      true,
    );
    assert.equal(
      retryPreservesTouchIdentity({
        originalTouchAtMs: 1_000,
        retryTouchAtMs: 2_000,
        originalTouchEventKeyHex: KEY_RETRY,
        retryTouchEventKeyHex: KEY_RETRY,
      }),
      false,
    );
    assert.equal(
      touchReplayConverges({
        sameLogicalEvent: true,
        sameIdempotencyKey: true,
        payloadUnchanged: true,
      }),
      true,
    );
  });

  it('holds pending pre-cutoff admission and excludes post-cutoff touches from that lock', () => {
    assert.equal(
      M55_CANDIDATE_CUTOFF_CONTRACT.establishedAt,
      'CHECKOUT_LOCK_SERVER_ACCEPTANCE_CUTOFF',
    );
    assert.equal(
      M55_CANDIDATE_CUTOFF_CONTRACT.pendingPreCutoffAdmission,
      'WAIT_RETRY_HOLD',
    );
    assert.equal(
      M55_CANDIDATE_CUTOFF_CONTRACT.silentExclusionOfPendingPreCutoffAdmission,
      'PROHIBITED',
    );
    assert.equal(M55_CANDIDATE_CUTOFF_CONTRACT.dbCommitLatencyMustNotDecideWinner, true);
    assert.equal(
      M55_CANDIDATE_CUTOFF_CONTRACT.dbLockingImplementation,
      'OUT_OF_SCOPE_R5A',
    );
    assert.equal(
      evaluateCandidateCutoffParticipation({
        serverAcceptedAtMs: 50,
        cutoffAtMs: 100,
        durableAdmissionComplete: true,
      }),
      'INCLUDE_AFTER_DURABLE_ADMISSION',
    );
    assert.equal(
      evaluateCandidateCutoffParticipation({
        serverAcceptedAtMs: 100,
        cutoffAtMs: 100,
        durableAdmissionComplete: true,
      }),
      'INCLUDE_AFTER_DURABLE_ADMISSION',
    );
    assert.equal(
      evaluateCandidateCutoffParticipation({
        serverAcceptedAtMs: 50,
        cutoffAtMs: 100,
        durableAdmissionComplete: false,
      }),
      'WAIT_RETRY_HOLD',
    );
    assert.equal(
      evaluateCandidateCutoffParticipation({
        serverAcceptedAtMs: 101,
        cutoffAtMs: 100,
        durableAdmissionComplete: true,
      }),
      'EXCLUDE_POST_CUTOFF',
    );
    assert.equal(
      evaluateCandidateCutoffParticipation({
        serverAcceptedAtMs: Number.NaN,
        cutoffAtMs: 100,
        durableAdmissionComplete: true,
      }),
      'HOLD_INVALID_TIMESTAMP',
    );
    assert.equal(
      evaluateCandidateCutoffParticipation({
        serverAcceptedAtMs: 50.5,
        cutoffAtMs: 100,
        durableAdmissionComplete: true,
      }),
      'HOLD_INVALID_TIMESTAMP',
    );
    assert.equal(
      evaluateCandidateCutoffParticipation({
        serverAcceptedAtMs: Number.MAX_SAFE_INTEGER + 1,
        cutoffAtMs: 100,
        durableAdmissionComplete: true,
      }),
      'HOLD_INVALID_TIMESTAMP',
    );
  });

  it('separates reusable link identity from logical touch events and requires server-side opaque resolution', () => {
    assert.equal(M55_CREATOR_TRACKING_TOKEN_CONTRACT.kind, 'VERSIONED_OPAQUE_AUTHENTICATED_TOKEN');
    assert.equal(M55_CREATOR_TRACKING_TOKEN_CONTRACT.resolution, 'SERVER_SIDE');
    assert.equal(
      M55_CREATOR_TRACKING_TOKEN_CONTRACT.clientVisibleTokenMustNotExposeCreatorRawIdentity,
      true,
    );
    assert.equal(
      M55_CREATOR_TRACKING_TOKEN_CONTRACT.purposeNamespaceSeparationRequired,
      true,
    );
    assert.equal(
      M55_CREATOR_TRACKING_TOKEN_CONTRACT.tokenIdentityDistinctFromLogicalTouchEventIdentity,
      true,
    );
    assert.equal(M55_CREATOR_TRACKING_TOKEN_CONTRACT.reusableCreatorLinkIsNotOneShot, true);
    assert.equal(
      M55_CREATOR_TRACKING_TOKEN_CONTRACT.httpRetryMustConvergeToSameLogicalEvent,
      true,
    );
    assert.equal(M55_CREATOR_TRACKING_TOKEN_CONTRACT.permanentLinkTokenDedupe, 'PROHIBITED');
  });

  it('allows new touch ingest only for known active tokens and rejects unknown or retired versions', () => {
    assert.equal(
      M55_CREATOR_TRACKING_TOKEN_CONTRACT.newIngestEligibilityDistinctFromHistoricalVerificationEvidence,
      true,
    );
    assert.equal(
      M55_CREATOR_TRACKING_TOKEN_CONTRACT.retiredOrRevokedVersionMayPreserveHistoricalVerificationEvidence,
      true,
    );
    assert.equal(evaluateNewTouchIngestEligibility('KNOWN_ACTIVE'), 'ALLOW');
    assert.equal(evaluateNewTouchIngestEligibility('UNKNOWN'), 'REJECT');
    assert.equal(evaluateNewTouchIngestEligibility('RETIRED_OR_REVOKED'), 'REJECT');
  });
});
