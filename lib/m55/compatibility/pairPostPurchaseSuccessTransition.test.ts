import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  PAIR_POST_PURCHASE_SUCCESS_MARKER_TTL_MS,
  PAIR_POST_PURCHASE_SUCCESS_STORAGE_KEY,
  classifyOwnedReportsRelativeToBaseline,
  clearPairPostPurchaseSuccessMarker,
  computeBoundedPollDelayMs,
  computeBoundedPollFetchTimeoutMs,
  extractOwnedReportIdsFromReportsApiPayload,
  readPairPostPurchaseSuccessMarker,
  validateStrictUuidReportIdList,
  writePairPostPurchaseSuccessMarker,
} from './pairPostPurchaseSuccessTransition';

const ROOT = join(import.meta.dirname, '../../..');
const USER_A = 'user_clerk_a';
const USER_B = 'user_clerk_b';
const REPORT_A = '11111111-1111-4111-8111-111111111111';
const REPORT_B = '22222222-2222-4222-8222-222222222222';
const REPORT_C = '33333333-3333-4333-8333-333333333333';

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
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

describe('pairPostPurchaseSuccessTransition marker', () => {
  it('valid marker write/read round-trip for same Clerk user', () => {
    const storage = createMemoryStorage();
    const now = Date.now();
    assert.equal(writePairPostPurchaseSuccessMarker(storage, USER_A, [REPORT_A], now), true);
    const marker = readPairPostPurchaseSuccessMarker(storage, USER_A, now);
    assert.ok(marker);
    assert.deepEqual(marker.baselineReportIds, [REPORT_A]);
  });

  it('wrong Clerk user is rejected', () => {
    const storage = createMemoryStorage();
    writePairPostPurchaseSuccessMarker(storage, USER_A, [], Date.now());
    assert.equal(readPairPostPurchaseSuccessMarker(storage, USER_B), null);
  });

  it('expired marker is rejected', () => {
    const storage = createMemoryStorage();
    const capturedAt = 1_700_000_000_000;
    writePairPostPurchaseSuccessMarker(storage, USER_A, [], capturedAt);
    const now = capturedAt + PAIR_POST_PURCHASE_SUCCESS_MARKER_TTL_MS + 1;
    assert.equal(readPairPostPurchaseSuccessMarker(storage, USER_A, now), null);
  });

  it('malformed marker object is rejected', () => {
    const storage = createMemoryStorage();
    storage.setItem(PAIR_POST_PURCHASE_SUCCESS_STORAGE_KEY, '{"version":"bad"}');
    assert.equal(readPairPostPurchaseSuccessMarker(storage, USER_A), null);
  });

  it('marker malformed report ID is rejected', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      PAIR_POST_PURCHASE_SUCCESS_STORAGE_KEY,
      JSON.stringify({
        version: 'pair_post_purchase_success_v1',
        ownerUserId: USER_A,
        capturedAtMs: Date.now(),
        baselineReportIds: ['not-a-uuid'],
      }),
    );
    assert.equal(readPairPostPurchaseSuccessMarker(storage, USER_A), null);
  });

  it('marker duplicate report ID is rejected', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      PAIR_POST_PURCHASE_SUCCESS_STORAGE_KEY,
      JSON.stringify({
        version: 'pair_post_purchase_success_v1',
        ownerUserId: USER_A,
        capturedAtMs: Date.now(),
        baselineReportIds: [REPORT_A, REPORT_A],
      }),
    );
    assert.equal(readPairPostPurchaseSuccessMarker(storage, USER_A), null);
  });

  it('writer refuses malformed baseline', () => {
    const storage = createMemoryStorage();
    assert.equal(writePairPostPurchaseSuccessMarker(storage, USER_A, ['bad-id']), false);
  });

  it('writer refuses duplicate baseline', () => {
    const storage = createMemoryStorage();
    assert.equal(writePairPostPurchaseSuccessMarker(storage, USER_A, [REPORT_A, REPORT_A]), false);
  });

  it('clear removes stored marker', () => {
    const storage = createMemoryStorage();
    writePairPostPurchaseSuccessMarker(storage, USER_A, [REPORT_A]);
    clearPairPostPurchaseSuccessMarker(storage);
    assert.equal(readPairPostPurchaseSuccessMarker(storage, USER_A), null);
  });
});

describe('pairPostPurchaseSuccessTransition reports payload', () => {
  it('API available:true with valid reports returns exact IDs', () => {
    const ids = extractOwnedReportIdsFromReportsApiPayload({
      available: true,
      reports: [{ id: REPORT_A }, { id: REPORT_B }],
    });
    assert.deepEqual(ids, [REPORT_A, REPORT_B]);
  });

  it('API available:false returns null', () => {
    assert.equal(
      extractOwnedReportIdsFromReportsApiPayload({ available: false, reports: [] }),
      null,
    );
  });

  it('missing or invalid available returns null', () => {
    assert.equal(extractOwnedReportIdsFromReportsApiPayload({ reports: [] }), null);
    assert.equal(extractOwnedReportIdsFromReportsApiPayload({ available: 'true', reports: [] }), null);
  });

  it('API malformed report ID returns null', () => {
    assert.equal(
      extractOwnedReportIdsFromReportsApiPayload({
        available: true,
        reports: [{ id: REPORT_A }, { id: 'bad' }],
      }),
      null,
    );
  });

  it('API duplicate report ID returns null', () => {
    assert.equal(
      extractOwnedReportIdsFromReportsApiPayload({
        available: true,
        reports: [{ id: REPORT_A }, { id: REPORT_A }],
      }),
      null,
    );
  });
});

describe('pairPostPurchaseSuccessTransition classification', () => {
  it('baseline-only => pending', () => {
    assert.deepEqual(
      classifyOwnedReportsRelativeToBaseline([REPORT_A], [REPORT_A]),
      { kind: 'pending' },
    );
  });

  it('exactly one new valid report => ready exact ID', () => {
    assert.deepEqual(
      classifyOwnedReportsRelativeToBaseline([REPORT_A], [REPORT_A, REPORT_B]),
      { kind: 'ready', reportId: REPORT_B },
    );
  });

  it('malformed classifier input cannot return ready', () => {
    assert.deepEqual(
      classifyOwnedReportsRelativeToBaseline([REPORT_A], [REPORT_A, 'bad']),
      { kind: 'ambiguous' },
    );
  });

  it('duplicate classifier input cannot return ready', () => {
    assert.deepEqual(
      classifyOwnedReportsRelativeToBaseline([REPORT_A], [REPORT_A, REPORT_B, REPORT_B]),
      { kind: 'ambiguous' },
    );
  });

  it('>1 new valid => ambiguous', () => {
    assert.deepEqual(
      classifyOwnedReportsRelativeToBaseline([REPORT_A], [REPORT_A, REPORT_B, REPORT_C]),
      { kind: 'ambiguous' },
    );
  });

  it('validateStrictUuidReportIdList rejects silent filtering', () => {
    assert.equal(validateStrictUuidReportIdList([REPORT_A, 'bad']), null);
  });
});

describe('pairPostPurchaseSuccessTransition polling bounds', () => {
  it('fetch timeout is capped by remaining deadline', () => {
    assert.equal(computeBoundedPollFetchTimeoutMs(10_000, 9_000, 5_000), 1_000);
    assert.equal(computeBoundedPollFetchTimeoutMs(10_000, 10_000, 5_000), null);
  });

  it('poll delay is capped by remaining deadline', () => {
    assert.equal(computeBoundedPollDelayMs(10_000, 9_500, 1_500), 500);
    assert.equal(computeBoundedPollDelayMs(10_000, 10_000, 1_500), null);
  });
});

describe('pairPostPurchaseSuccessTransition source wiring', () => {
  const purchaseSource = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
  const helperSource = read('lib/m55/compatibility/pairPostPurchaseSuccessTransition.ts');

  it('success component reads /api/compatibility/reports', () => {
    assert.match(purchaseSource, /\/api\/compatibility\/reports/);
  });

  it('checkout still posts to /api/compatibility/checkout', () => {
    assert.match(purchaseSource, /\/api\/compatibility\/checkout/);
  });

  it('ready CTA is /synastry/report/${...}', () => {
    assert.match(purchaseSource, /\/synastry\/report\/\$\{/);
  });

  it('helper contains no nickname/displayIdentity correlation', () => {
    assert.doesNotMatch(helperSource, /displayIdentity|partnerLabel|nickname/i);
  });

  it('source bounds fetch timeout and poll delay by remaining time', () => {
    assert.match(purchaseSource, /computeBoundedPollFetchTimeoutMs/);
    assert.match(purchaseSource, /computeBoundedPollDelayMs/);
    assert.match(purchaseSource, /PAIR_POST_PURCHASE_SUCCESS_POLL_DEADLINE_MS = 20_000/);
  });
});

describe('CompatibilityPurchaseSuccess bounded auth readiness (PATCH-2)', () => {
  const purchaseSource = read('components/compatibility/CompatibilityPurchaseExperience.tsx');
  const successBlock = purchaseSource.slice(
    purchaseSource.indexOf('export function CompatibilityPurchaseSuccess'),
    purchaseSource.indexOf('if (viewState === \'ready\' && readyReportId)'),
  );

  it('success component uses bounded auth readiness', () => {
    assert.match(successBlock, /successAuthReadiness = useBoundedReadiness\(isLoaded\)/);
  });

  it('auth readiness timeout transitions to manual', () => {
    assert.match(successBlock, /successAuthReadiness\.timedOut/);
    assert.match(successBlock, /setViewState\('manual'\)/);
  });

  it('success effect depends on auth readiness timeout signal', () => {
    assert.match(successBlock, /\[isLoaded, user\?\.id, successAuthReadiness\.timedOut\]/);
  });

  it('no unbounded isLoaded=false branch that only sets auth_loading', () => {
    assert.doesNotMatch(
      successBlock,
      /if \(!isLoaded\) \{\s*setViewState\('auth_loading'\);\s*return;\s*\}/,
    );
  });

  it('helper source unchanged from PATCH-1 contract scope', () => {
    const helperSource = read('lib/m55/compatibility/pairPostPurchaseSuccessTransition.ts');
    assert.doesNotMatch(helperSource, /useBoundedReadiness/);
  });
});
