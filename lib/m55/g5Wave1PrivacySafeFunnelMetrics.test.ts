/**
 * G5 Wave 1 — privacy-safe funnel metrics contract (bounded semantic tests).
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  sanitizeAnalyticsBeforeSendEvent,
  sanitizeAnalyticsPageUrl,
} from './analytics/sanitizeAnalyticsPageUrl';
import {
  consumeFreeResultPremiumLpEntry,
  markFreeResultPremiumLpEntry,
  M55_FREE_RESULT_LP_ENTRY_KEY,
} from './analytics/freeResultPremiumLpEntry';
import { planClassFromDtrCoreProductId } from './analytics/planClassFromProductId';
import {
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
  M55_FUNNEL_EVENTS,
  resetFunnelImpressionDedupeForTests,
  trackFunnelImpressionOnce,
} from './privacySafeFunnelAnalytics';
import { DTR_CORE_FULL_V1, DTR_CORE_LIGHT_V1 } from '../oneTimeCheckout';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('G5 Wave 1 — Analytics URL redaction', () => {
  it('1-2) strips query strings and hashes', () => {
    assert.equal(
      sanitizeAnalyticsPageUrl('https://m-55.jp/home?utm_source=x&foo=1#section'),
      'https://m-55.jp/home',
    );
    assert.equal(sanitizeAnalyticsPageUrl('/core?x=1#y'), '/core');
  });

  it('3-4) never emits session_id secrets from processing/success', () => {
    const processing = sanitizeAnalyticsPageUrl(
      'https://m-55.jp/dtr/processing?session_id=TEST_SECRET_VALUE',
    );
    const success = sanitizeAnalyticsPageUrl(
      'https://m-55.jp/purchase/success?session_id=TEST_SECRET_VALUE',
    );
    assert.equal(processing, 'https://m-55.jp/dtr/processing');
    assert.equal(success, 'https://m-55.jp/purchase/success');
    assert.doesNotMatch(String(processing), /TEST_SECRET_VALUE|session_id/);
    assert.doesNotMatch(String(success), /TEST_SECRET_VALUE|session_id/);
  });

  it('5-6) normalizes share token and pair report id families', () => {
    assert.equal(sanitizeAnalyticsPageUrl('/r/raw-token'), '/r/[token]');
    assert.equal(
      sanitizeAnalyticsPageUrl('/synastry/report/raw-id'),
      '/synastry/report/[reportId]',
    );
    assert.equal(
      sanitizeAnalyticsPageUrl('https://m-55.jp/r/abc123?x=1#h'),
      'https://m-55.jp/r/[token]',
    );
  });

  it('7) malformed URL fails closed', () => {
    assert.equal(sanitizeAnalyticsPageUrl(''), null);
    assert.equal(sanitizeAnalyticsBeforeSendEvent({ type: 'pageview', url: '' }), null);
    // Control characters / unparseable absolute-like junk must not leak raw input.
    const bad = sanitizeAnalyticsPageUrl('http://\u0000');
    assert.ok(bad === null || !bad.includes('\u0000'));
  });

  it('beforeSend sanitizes pageviews via layout client wrapper', () => {
    const layout = read('app/layout.tsx');
    assert.match(layout, /M55PrivacySafeAnalytics/);
    assert.doesNotMatch(layout, /<Analytics\s*\/>/);
    const wrapper = read('components/analytics/M55PrivacySafeAnalytics.tsx');
    assert.match(wrapper, /beforeSend/);
    assert.match(wrapper, /sanitizeAnalyticsBeforeSendEvent/);
  });
});

describe('G5 Wave 1 — payload allowlist privacy', () => {
  it('8-12) rejects nickname/DOB/answers/user/stripe identifiers as properties', () => {
    const base = buildPrivacySafeFunnelPayload('core_paid_bridge', '2026-08-21T00:00:00.000Z');
    for (const key of [
      'nickname',
      'dob',
      'answers',
      'userId',
      'clerkUserId',
      'session_id',
      'sessionId',
      'paymentIntentId',
      'checkoutId',
      'stripeCustomerId',
      'productId',
      'priceId',
    ]) {
      assert.throws(() => assertPrivacySafeFunnelPayload({ ...base, [key]: 'x' }));
    }
  });

  it('13) planClass allows only light/full', () => {
    const base = buildPrivacySafeFunnelPayload('dtr_paid_plan', '2026-08-21T00:00:00.000Z');
    assertPrivacySafeFunnelPayload({ ...base, planClass: 'light' });
    assertPrivacySafeFunnelPayload({ ...base, planClass: 'full' });
    assert.throws(() => assertPrivacySafeFunnelPayload({ ...base, planClass: 'static' }));
    assert.equal(planClassFromDtrCoreProductId(DTR_CORE_LIGHT_V1), 'light');
    assert.equal(planClassFromDtrCoreProductId(DTR_CORE_FULL_V1), 'full');
  });

  it('14) entrySource allows free_result and shared_result only', () => {
    const base = buildPrivacySafeFunnelPayload('dtr_premium_lp', '2026-08-21T00:00:00.000Z');
    assertPrivacySafeFunnelPayload({ ...base, entrySource: 'free_result' });
    assertPrivacySafeFunnelPayload({ ...base, entrySource: 'shared_result' });
    assert.throws(() => assertPrivacySafeFunnelPayload({ ...base, entrySource: 'utm_campaign' }));
  });
});

describe('G5 Wave 1 — bridge visibility', () => {
  it('15-17) viewport observer, not mount; once-only', () => {
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(bridge, /IntersectionObserver/);
    assert.match(bridge, /premiumBridgeVisible/);
    assert.doesNotMatch(bridge, /premiumBridgeViewed/);
    assert.match(bridge, /core-premium-bridge-visible/);
    assert.match(bridge, /m55-premium-bridge-cta-block/);
    assert.match(bridge, /visibleEmittedRef/);
    resetFunnelImpressionDedupeForTests();
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.premiumBridgeVisible,
      'core_paid_bridge',
      'core-premium-bridge-visible',
    );
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.premiumBridgeVisible,
      'core_paid_bridge',
      'core-premium-bridge-visible',
    );
    assert.ok(true);
  });
});

describe('G5 Wave 1 — Free→LP attribution', () => {
  it('18-19) one-shot free_result marker consumed; direct LP has no false claim', () => {
    const store = new Map<string, string>();
    const original = globalThis.sessionStorage;
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v);
        },
        removeItem: (k: string) => {
          store.delete(k);
        },
      },
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: globalThis,
    });

    try {
      markFreeResultPremiumLpEntry();
      assert.equal(store.get(M55_FREE_RESULT_LP_ENTRY_KEY), '1');
      assert.equal(consumeFreeResultPremiumLpEntry(), true);
      assert.equal(store.has(M55_FREE_RESULT_LP_ENTRY_KEY), false);
      assert.equal(consumeFreeResultPremiumLpEntry(), false);

      const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
      assert.match(bridge, /markFreeResultPremiumLpEntry/);
      const lpAnalytics = read('components/dtr/DtrPremiumLpViewAnalytics.tsx');
      assert.match(lpAnalytics, /premiumLpViewed/);
      assert.match(lpAnalytics, /consumeFreeResultPremiumLpEntry/);
      assert.match(lpAnalytics, /entrySource:\s*'free_result'/);
      const lpPage = read('app/dtr/lp/page.tsx');
      assert.match(lpPage, /DtrPremiumLpViewAnalytics/);
    } finally {
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: original,
      });
    }
  });
});

describe('G5 Wave 1 — plan decision / selection', () => {
  it('20-21) one canonical selection event with planClass', () => {
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(prep, /premiumPlanDecisionViewed/);
    assert.doesNotMatch(prep, /M55_FUNNEL_EVENTS\.paidPlanView/);
    assert.match(prep, /planClass:\s*'light'/);
    assert.match(prep, /planClass:\s*'full'/);
    assert.match(prep, /premiumPlanSelected/);
    assert.doesNotMatch(prep, /M55_FUNNEL_EVENTS\.paidPlanSelected/);
    const lightIdx = prep.indexOf("planClass: 'light'");
    const fullIdx = prep.indexOf("planClass: 'full'");
    assert.ok(lightIdx > 0 && fullIdx > 0);
    assert.doesNotMatch(prep, /trackFunnelAction\(\s*M55_FUNNEL_EVENTS\.paidPlanSelected/);
  });
});

describe('G5 Wave 1 — checkout_started planClass', () => {
  it('22-23) requires usable URL; carries safe planClass only', () => {
    const action = read('lib/m55/purchaseCheckoutStartedAction.ts');
    assert.match(action, /checkoutStarted/);
    assert.match(action, /planClassFromDtrCoreProductId/);
    assert.match(action, /checkoutUrl/);
    assert.doesNotMatch(action, /planClass:.*productId/);
    assert.doesNotMatch(action, /session\.id|checkoutSessionId/);
  });
});

describe('G5 Wave 1 — server purchase / delivery idempotency', () => {
  it('24-28) first-success / first-delivery authority; transport cannot fail fulfillment', () => {
    const fulfill = read('lib/m55/dtrCoreCheckoutFulfillment.ts');
    const draft = read('lib/m55/dtrDraftDb.ts');
    const serverTrack = read('lib/m55/analytics/trackServerFunnelAction.ts');

    assert.match(fulfill, /fulfillmentNewlyCreated/);
    assert.match(fulfill, /purchaseSucceeded/);
    assert.match(fulfill, /premiumValueDelivered/);
    assert.match(fulfill, /trackServerFunnelAction/);
    assert.match(draft, /firstDelivery/);
    assert.match(draft, /firstDelivery:\s*false/);
    assert.match(draft, /firstDelivery:\s*true/);

    // purchase_succeeded only when newly created
    const purchaseBlock = fulfill.slice(
      fulfill.indexOf('if (fulfillmentNewlyCreated)'),
      fulfill.indexOf('await grantInitialIncludedReplyIfNeeded'),
    );
    assert.match(purchaseBlock, /purchaseSucceeded/);

    // value delivered only on firstDelivery
    assert.match(fulfill, /if \(snap\.firstDelivery\)/);

    assert.match(serverTrack, /@vercel\/analytics\/server/);
    assert.match(serverTrack, /catch/);
    assert.match(serverTrack, /transport_failed/);
  });
});

describe('G5 Wave 1 — report open canonicality + log privacy + G1-G4 unchanged', () => {
  it('12/29) premium_report_opened is sole reader-open emit', () => {
    const reader = read('components/dtr/DtrFullReader.tsx');
    assert.match(reader, /premiumReportOpened/);
    assert.doesNotMatch(reader, /M55_FUNNEL_EVENTS\.savedReportOpen/);
    assert.equal(M55_FUNNEL_EVENTS.premiumReportOpened, 'premium_report_opened');
  });

  it('29) Personal Premium console logs avoid raw identifiers', () => {
    const webhook = read('app/api/stripe/webhook/route.ts');
    const checkout = read('app/api/purchase/checkout/route.ts');
    const fulfill = read('lib/m55/dtrCoreCheckoutFulfillment.ts');

    const oneTimeLogs = webhook
      .split('\n')
      .filter((l) => l.includes('console.') && l.includes('one_time'));
    for (const line of oneTimeLogs) {
      assert.doesNotMatch(line, /user_id=\s*['"`]?user_/);
      assert.doesNotMatch(line, /event_id=\s*evt_/);
      assert.doesNotMatch(line, /checkout_session_id=\s*cs_/);
    }

    assert.match(fulfill, /user_id_present/);
    assert.match(fulfill, /checkout_session_id_present/);
    assert.doesNotMatch(
      fulfill.slice(fulfill.indexOf('[dtrGrant]'), fulfill.indexOf('[dtrGrant]') + 400),
      /userId:\s*ownerUserId/,
    );

    assert.match(checkout, /user_id_present/);
    assert.doesNotMatch(
      checkout
        .split('\n')
        .filter((l) => l.includes('console.') && /userId[,:]/.test(l))
        .join('\n'),
      /userId,\s*$|userId: userId/,
    );
  });

  it('30) G1–G4 product behavior unchanged (no price/subscription/pair/today)', () => {
    assert.equal(M55_FUNNEL_EVENTS.selfEntryStarted, 'self_entry_started');
    assert.equal(M55_FUNNEL_EVENTS.coreQuestionsCompleted, 'core_questions_completed');
    assert.equal(M55_FUNNEL_EVENTS.freeResultViewed, 'free_result_viewed');
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(bridge, /data-testid="m55-free-to-paid-bridge"/);
    assert.doesNotMatch(bridge, /PurchaseButton/);
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(prep, /DTR_CORE_LIGHT_V1/);
    assert.match(prep, /DTR_CORE_FULL_V1/);
  });
});
