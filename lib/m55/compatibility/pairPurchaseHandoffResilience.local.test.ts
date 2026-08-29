import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { COMPATIBILITY_REPORT_PRODUCT_AUTHORITY } from './compatibilityCommerceAuthority';
import { COMPATIBILITY_GUEST_SESSION_KEY_V3 } from './pairReadingGuestContract';
import {
  capturePreAuthSessionJourneyCandidate,
  claimPreAuthSessionJourneyForUser,
  guestJourneyV3ToPurchaseJourney,
  persistCompletedPairJourney,
  readCompatibilityGuestJourneyV3FromSession,
  readCompatibilityPurchaseJourneyFromSession,
  readLastCompletedPairJourney,
  resolveSignedInPurchaseHandoff,
  resolveSignedOutPurchaseHandoff,
  writeLastCompletedPairJourney,
} from './pairGuestClientStore';
import type { CompatibilityGuestJourneyV3 } from './pairReadingGuestContract';
import type { CompatibilityCurrentContextAnswersV2 } from './currentContextContract.v2';
import type { RelationStatusId } from './pairReadingTypes';

const ROOT = join(import.meta.dirname, '../../..');
const USER_A = 'user_clerk_a';
const USER_B = 'user_clerk_b';

const COMPLETE_R2_ANSWERS: CompatibilityCurrentContextAnswersV2 = {
  expressionPace: 'words_soon',
  contactPace: 'steady_contact',
};

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function completeJourney(
  personA = '1982-02-28',
  personB = '1997-06-15',
  relationStatusId: RelationStatusId = 'R2',
  answers: CompatibilityCurrentContextAnswersV2 = COMPLETE_R2_ANSWERS,
): CompatibilityGuestJourneyV3 {
  return {
    version: 'journey_v3',
    input: { personA, personB },
    relationStatusId,
    answers,
  };
}

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

function withLocalStorage<T>(run: (storage: Storage) => T): T {
  const storage = createMemoryStorage();
  const previous = (globalThis as { localStorage?: Storage }).localStorage;
  (globalThis as { localStorage: Storage }).localStorage = storage;
  try {
    return run(storage);
  } finally {
    if (previous === undefined) {
      delete (globalThis as { localStorage?: Storage }).localStorage;
    } else {
      (globalThis as { localStorage: Storage }).localStorage = previous;
    }
  }
}

describe('pair purchase handoff resilience', () => {
  it('uses a valid same-tab session journey on the signed-out purchase path', () => {
    const journey = completeJourney();
    const storage = createMemoryStorage();
    persistCompletedPairJourney(storage, null, journey);

    const sessionJourney = readCompatibilityPurchaseJourneyFromSession(storage);
    const resolution = resolveSignedOutPurchaseHandoff({
      sessionJourney,
      hasObservedSignedInIdentity: false,
    });

    assert.ok(sessionJourney);
    assert.equal(resolution.kind, 'session');
    assert.deepEqual(resolution.journey.input, journey.input);
    assert.equal(resolution.journey.relationStatusId, 'R2');
  });

  it('recovers from the current-user saved journey when sessionStorage is missing', () => {
    withLocalStorage(() => {
      const journey = completeJourney();
      writeLastCompletedPairJourney(USER_A, journey);

      const persisted = readLastCompletedPairJourney(USER_A);
      const resolution = resolveSignedInPurchaseHandoff({
        clerkUserId: USER_A,
        persistedJourney: persisted,
      });

      assert.equal(resolution.kind, 'persisted');
      assert.deepEqual(resolution.journey, guestJourneyV3ToPurchaseJourney(journey));
    });
  });

  it('does not restore a saved journey that belongs to another Clerk user', () => {
    withLocalStorage(() => {
      const journey = completeJourney();
      writeLastCompletedPairJourney(USER_A, journey);

      assert.equal(readLastCompletedPairJourney(USER_B), null);
      assert.equal(
        resolveSignedInPurchaseHandoff({
          clerkUserId: USER_B,
          persistedJourney: readLastCompletedPairJourney(USER_B),
        }).kind,
        'recovery',
      );
    });
  });

  it('does not restore malformed saved journey payloads', () => {
    withLocalStorage((storage) => {
      storage.setItem(
        `m55_pair_guest_last_journey_v1_${USER_A}`,
        JSON.stringify({ version: 'pair_guest_persisted_v1', ownerUserId: USER_A, journey: { bad: true } }),
      );

      assert.equal(readLastCompletedPairJourney(USER_A), null);
      assert.equal(
        resolveSignedInPurchaseHandoff({
          clerkUserId: USER_A,
          persistedJourney: readLastCompletedPairJourney(USER_A),
        }).kind,
        'recovery',
      );
    });
  });

  it('returns recovery when no trustworthy journey exists for a signed-in user', () => {
    const component = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
    const resolution = resolveSignedInPurchaseHandoff({
      clerkUserId: USER_A,
      persistedJourney: null,
    });

    assert.equal(resolution.kind, 'recovery');
    assert.match(component, /data-testid="compatibility-purchase-recovery"/);
    assert.match(component, /二人の無料結果を開き直す/);
    assert.match(component, /href="\/synastry"/);
    assert.doesNotMatch(component, /このタブに二人分の入力がありません/);
    assert.doesNotMatch(component, /inputMissing/);
  });

  it('keeps Pair price and checkout product identity unchanged', () => {
    const component = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
    assert.equal(COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.priceLabel, '¥1,480（税込）');
    assert.match(component, /¥1,480で購入手続きへ/);
    assert.match(component, /二人の相性レポート/);
    assert.match(component, /\/api\/compatibility\/checkout/);
    assert.match(component, /currentContext: journey\.currentContext/);
    assert.doesNotMatch(component, /\/synastry\/purchase\/success/);
  });

  it('does not invent a direct purchase bypass', () => {
    const component = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
    assert.match(component, /resolveSignedInPurchaseHandoff/);
    assert.match(component, /readLastCompletedPairJourney/);
    assert.doesNotMatch(component, /window\.location\.assign\('\/synastry/);
    assert.doesNotMatch(component, /checkout\?/);
  });

  it('preserves the signed-in happy path wiring', () => {
    const component = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
    const store = read('lib/m55/compatibility/pairGuestClientStore.ts');
    assert.match(component, /<SignedIn>\{signedInContent\}<\/SignedIn>/);
    assert.match(component, /readCompatibilityGuestJourneyV3FromSession/);
    assert.match(component, /claimPreAuthSessionJourneyForUser/);
    assert.match(store, /isCompleteCompatibilityCurrentContextV2/);
  });
});

describe('pair purchase auth-boundary ownership', () => {
  it('already-signed-in User B with unowned session from A and no B persisted journey → recovery, not session', () => {
    const journeyA = completeJourney('1980-01-01', '1985-05-05');
    const storage = createMemoryStorage();
    storage.setItem(COMPATIBILITY_GUEST_SESSION_KEY_V3, JSON.stringify(journeyA));

    assert.equal(readCompatibilityPurchaseJourneyFromSession(storage), null);
    assert.equal(storage.getItem(COMPATIBILITY_GUEST_SESSION_KEY_V3), null);
    const resolution = resolveSignedInPurchaseHandoff({
      clerkUserId: USER_B,
      persistedJourney: null,
    });

    assert.equal(resolution.kind, 'recovery');
  });

  it('already-signed-in User B with unowned session and valid B persisted journey → B persisted wins', () => {
    withLocalStorage(() => {
      const journeyA = completeJourney('1980-01-01', '1985-05-05');
      const journeyB = completeJourney('1991-03-12', '1993-07-22');
      const storage = createMemoryStorage();
      storage.setItem(COMPATIBILITY_GUEST_SESSION_KEY_V3, JSON.stringify(journeyA));
      writeLastCompletedPairJourney(USER_B, journeyB);

      assert.equal(readCompatibilityPurchaseJourneyFromSession(storage), null);

      const resolution = resolveSignedInPurchaseHandoff({
        clerkUserId: USER_B,
        persistedJourney: readLastCompletedPairJourney(USER_B),
      });

      assert.equal(resolution.kind, 'persisted');
      assert.deepEqual(resolution.journey.input, journeyB.input);
      assert.notDeepEqual(resolution.journey.input, journeyA.input);
    });
  });

  it('signed-out initial mount with valid guest session retains pre-auth candidate', () => {
    const journey = completeJourney();
    const storage = createMemoryStorage();
    persistCompletedPairJourney(storage, null, journey);

    const sessionV3 = readCompatibilityGuestJourneyV3FromSession(storage);
    const captured = capturePreAuthSessionJourneyCandidate(null, sessionV3, false);
    const resolution = resolveSignedOutPurchaseHandoff({
      sessionJourney: captured ? guestJourneyV3ToPurchaseJourney(captured) : null,
      hasObservedSignedInIdentity: false,
    });

    assert.ok(captured);
    assert.equal(storage.length, 2);
    assert.deepEqual(captured, journey);
    assert.equal(resolution.kind, 'session');
  });

  it('guest pre-auth candidate is explicitly claimed for User B after modal login and purchase continues', () => {
    withLocalStorage(() => {
      const guestJourney = completeJourney('1988-04-04', '1990-08-08');
      const session = createMemoryStorage();
      persistCompletedPairJourney(session, null, guestJourney);
      assert.equal(session.length, 2);
      const captured = capturePreAuthSessionJourneyCandidate(
        null,
        readCompatibilityGuestJourneyV3FromSession(session),
        false,
      );
      assert.ok(captured);

      const resolution = claimPreAuthSessionJourneyForUser(USER_B, captured, session);

      assert.equal(resolution.kind, 'persisted');
      assert.deepEqual(resolution.journey.input, guestJourney.input);
      const saved = readLastCompletedPairJourney(USER_B);
      assert.ok(saved);
      assert.deepEqual(saved.input, guestJourney.input);
      assert.deepEqual(saved.answers, guestJourney.answers);
      assert.equal(readCompatibilityGuestJourneyV3FromSession(session), null);
      assert.equal(session.length, 0);
      assert.equal(
        capturePreAuthSessionJourneyCandidate(
          null,
          readCompatibilityGuestJourneyV3FromSession(session),
          false,
        ),
        null,
      );
    });
  });

  it('post-auth session payload changes do not replace the held pre-auth candidate', () => {
    const original = completeJourney('1988-04-04', '1990-08-08');
    const mutated = completeJourney('2001-12-12', '2003-01-01');

    let held = capturePreAuthSessionJourneyCandidate(null, original, false);
    held = capturePreAuthSessionJourneyCandidate(held, mutated, false);

    assert.deepEqual(held, original);
    assert.notDeepEqual(held?.input, mutated.input);
  });

  it('another Clerk user persisted journey remains inaccessible after auth-boundary split', () => {
    withLocalStorage(() => {
      const journeyA = completeJourney();
      writeLastCompletedPairJourney(USER_A, journeyA);

      assert.equal(readLastCompletedPairJourney(USER_B), null);
      assert.equal(
        resolveSignedInPurchaseHandoff({
          clerkUserId: USER_B,
          persistedJourney: readLastCompletedPairJourney(USER_B),
        }).kind,
        'recovery',
      );
    });
  });

  it('signed-in User A completion → sign-out → User B login cannot claim or persist A journey', () => {
    withLocalStorage(() => {
      const journeyA = completeJourney('1980-01-01', '1985-05-05');
      const session = createMemoryStorage();

      persistCompletedPairJourney(session, USER_A, journeyA);

      assert.equal(readCompatibilityGuestJourneyV3FromSession(session), null);
      assert.equal(session.length, 0);
      assert.deepEqual(readLastCompletedPairJourney(USER_A), journeyA);

      // The mounted purchase boundary has already observed signed-in User A.
      // Even a stale session payload appearing after sign-out cannot become guest-owned.
      session.setItem(COMPATIBILITY_GUEST_SESSION_KEY_V3, JSON.stringify(journeyA));
      const capturedAfterSignOut = capturePreAuthSessionJourneyCandidate(
        null,
        readCompatibilityGuestJourneyV3FromSession(session),
        true,
      );
      const signedOutResolution = resolveSignedOutPurchaseHandoff({
        sessionJourney: readCompatibilityPurchaseJourneyFromSession(session),
        hasObservedSignedInIdentity: true,
      });

      assert.equal(capturedAfterSignOut, null);
      assert.equal(signedOutResolution.kind, 'recovery');

      const userBResolution = resolveSignedInPurchaseHandoff({
        clerkUserId: USER_B,
        persistedJourney: readLastCompletedPairJourney(USER_B),
      });

      assert.equal(userBResolution.kind, 'recovery');
      assert.equal(readLastCompletedPairJourney(USER_B), null);
    });
  });

  it('pre-hotfix raw V3 without provenance fails closed on a fresh signed-out purchase mount', () => {
    const staleJourneyA = completeJourney('1980-01-01', '1985-05-05');
    const session = createMemoryStorage();

    session.setItem(COMPATIBILITY_GUEST_SESSION_KEY_V3, JSON.stringify(staleJourneyA));

    const freshMountCandidate = capturePreAuthSessionJourneyCandidate(
      null,
      readCompatibilityGuestJourneyV3FromSession(session),
      false,
    );
    const freshMountResolution = resolveSignedOutPurchaseHandoff({
      sessionJourney: freshMountCandidate
        ? guestJourneyV3ToPurchaseJourney(freshMountCandidate)
        : null,
      hasObservedSignedInIdentity: false,
    });

    assert.equal(freshMountCandidate, null);
    assert.equal(freshMountResolution.kind, 'recovery');
    assert.equal(session.getItem(COMPATIBILITY_GUEST_SESSION_KEY_V3), null);
    assert.equal(session.length, 0);
  });

  it('pre-hotfix raw User A session cannot reach User B when A signs out elsewhere', () => {
    withLocalStorage(() => {
      const staleJourneyA = completeJourney('1980-01-01', '1985-05-05');
      const session = createMemoryStorage();

      session.setItem(
        COMPATIBILITY_GUEST_SESSION_KEY_V3,
        JSON.stringify(staleJourneyA),
      );

      // User A signs out elsewhere; no post-hotfix Pair surface observes A first.
      const freshMountCandidate = capturePreAuthSessionJourneyCandidate(
        null,
        readCompatibilityGuestJourneyV3FromSession(session),
        false,
      );
      const freshMountResolution = resolveSignedOutPurchaseHandoff({
        sessionJourney: freshMountCandidate
          ? guestJourneyV3ToPurchaseJourney(freshMountCandidate)
          : null,
        hasObservedSignedInIdentity: false,
      });

      assert.equal(freshMountCandidate, null);
      assert.equal(freshMountResolution.kind, 'recovery');
      assert.equal(session.length, 0);

      const userBResolution = resolveSignedInPurchaseHandoff({
        clerkUserId: USER_B,
        persistedJourney: readLastCompletedPairJourney(USER_B),
      });

      assert.equal(userBResolution.kind, 'recovery');
      assert.equal(readLastCompletedPairJourney(USER_B), null);
    });
  });

  it('signed-in User A → sign-out → User B uses only B persisted journey', () => {
    withLocalStorage(() => {
      const journeyA = completeJourney('1980-01-01', '1985-05-05');
      const journeyB = completeJourney('1991-03-12', '1993-07-22');
      const session = createMemoryStorage();

      persistCompletedPairJourney(session, USER_A, journeyA);
      writeLastCompletedPairJourney(USER_B, journeyB);
      session.setItem(COMPATIBILITY_GUEST_SESSION_KEY_V3, JSON.stringify(journeyA));

      const capturedAfterSignOut = capturePreAuthSessionJourneyCandidate(
        null,
        readCompatibilityGuestJourneyV3FromSession(session),
        true,
      );
      const userBResolution = resolveSignedInPurchaseHandoff({
        clerkUserId: USER_B,
        persistedJourney: readLastCompletedPairJourney(USER_B),
      });

      assert.equal(capturedAfterSignOut, null);
      assert.equal(userBResolution.kind, 'persisted');
      assert.deepEqual(userBResolution.journey.input, journeyB.input);
      assert.notDeepEqual(userBResolution.journey.input, journeyA.input);
    });
  });

  it('malformed session remains unusable for signed-out and signed-in paths', () => {
    const storage = createMemoryStorage();
    storage.setItem(COMPATIBILITY_GUEST_SESSION_KEY_V3, JSON.stringify({ version: 'journey_v3', bad: true }));

    assert.equal(readCompatibilityGuestJourneyV3FromSession(storage), null);
    assert.equal(readCompatibilityPurchaseJourneyFromSession(storage), null);
    assert.equal(
      resolveSignedOutPurchaseHandoff({
        sessionJourney: null,
        hasObservedSignedInIdentity: false,
      }).kind,
      'recovery',
    );
    assert.equal(
      resolveSignedInPurchaseHandoff({
        clerkUserId: USER_A,
        persistedJourney: null,
      }).kind,
      'recovery',
    );
  });
});
