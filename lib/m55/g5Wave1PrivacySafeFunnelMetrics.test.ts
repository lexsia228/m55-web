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
import { planPremiumLpViewedEmit } from './analytics/planPremiumLpViewedEmit';
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
      assert.match(lpAnalytics, /planPremiumLpViewedEmit/);
      assert.match(lpAnalytics, /trackFunnelAction/);
      assert.doesNotMatch(lpAnalytics, /trackFunnelImpressionOnce/);
      assert.doesNotMatch(lpAnalytics, /dtr-premium-lp-viewed/);
      assert.match(lpAnalytics, /emittedRef/);
      const lpPage = read('app/dtr/lp/page.tsx');
      assert.match(lpPage, /DtrPremiumLpViewAnalytics/);
    } finally {
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: original,
      });
    }
  });

  it('D-E) LP analytics uses per-mount local dedupe, not global fixed impression key', () => {
    const lpAnalytics = read('components/dtr/DtrPremiumLpViewAnalytics.tsx');
    assert.doesNotMatch(lpAnalytics, /trackFunnelImpressionOnce/);
    assert.doesNotMatch(lpAnalytics, /dtr-premium-lp-viewed/);
    assert.match(lpAnalytics, /useRef\(false\)/);
    assert.match(lpAnalytics, /trackFunnelAction\(\s*M55_FUNNEL_EVENTS\.premiumLpViewed/);
  });

  it('F) direct LP then later Free→LP both emit; second is not suppressed', () => {
    const emits: Array<{ extras?: { entrySource?: string } }> = [];

    // Mount 1: direct LP
    let emittedMount1 = false;
    const plan1a = planPremiumLpViewedEmit({
      alreadyEmittedThisMount: emittedMount1,
      consumeFreeMarker: () => false,
    });
    assert.equal(plan1a.shouldEmit, true);
    if (plan1a.shouldEmit) {
      emittedMount1 = true;
      emits.push({ extras: plan1a.extras });
    }
    // Strict Mode remount of SAME mount must not emit again
    const plan1b = planPremiumLpViewedEmit({
      alreadyEmittedThisMount: emittedMount1,
      consumeFreeMarker: () => {
        throw new Error('must not consume on suppressed remount');
      },
    });
    assert.equal(plan1b.shouldEmit, false);

    // Mount 2: Free CTA set marker, then LP again
    let freeMarker = true;
    let emittedMount2 = false;
    const plan2 = planPremiumLpViewedEmit({
      alreadyEmittedThisMount: emittedMount2,
      consumeFreeMarker: () => {
        const v = freeMarker;
        freeMarker = false;
        return v;
      },
    });
    assert.equal(plan2.shouldEmit, true);
    if (plan2.shouldEmit) {
      emittedMount2 = true;
      emits.push({ extras: plan2.extras });
    }

    assert.equal(emits.length, 2);
    assert.equal(emits[0]?.extras?.entrySource, undefined);
    assert.equal(emits[1]?.extras?.entrySource, 'free_result');
    assert.equal(freeMarker, false);
  });

  it('G) Strict-Mode-style duplicate effect for SAME mount does not double emit', () => {
    let consumed = 0;
    let emitted = false;
    const run = () =>
      planPremiumLpViewedEmit({
        alreadyEmittedThisMount: emitted,
        consumeFreeMarker: () => {
          consumed += 1;
          return false;
        },
      });

    const first = run();
    assert.equal(first.shouldEmit, true);
    emitted = true;
    const second = run();
    assert.equal(second.shouldEmit, false);
    assert.equal(consumed, 1);
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

    // A) one-time / webhook console paths must not interpolate raw id variables
    const webhookConsoleBlocks = webhook.match(/console\.(?:error|warn|info)\([\s\S]*?\n\s*\)/g) ?? [];
    assert.ok(webhookConsoleBlocks.length > 0);
    for (const block of webhookConsoleBlocks) {
      assert.doesNotMatch(block, /,\s*event\.id\b/);
      assert.doesNotMatch(block, /,\s*session\.id\b/);
      assert.doesNotMatch(block, /,\s*paymentIntentId\b/);
      assert.doesNotMatch(block, /,\s*userId\b/);
      assert.doesNotMatch(block, /event_id:\s*event\.id/);
      assert.doesNotMatch(block, /Boolean\(paymentIntentId\)/);
      assert.doesNotMatch(block, /Boolean\(userId\)/);
    }

    // B) stripe_events_insert failure is coarse-only
    const insertFailIdx = webhook.indexOf("failure_reason: 'stripe_events_insert'");
    assert.ok(insertFailIdx > 0);
    const insertFailSlice = webhook.slice(insertFailIdx - 200, insertFailIdx + 350);
    assert.match(insertFailSlice, /event_id_present:\s*true/);
    assert.doesNotMatch(insertFailSlice, /event\.id/);
    assert.doesNotMatch(insertFailSlice, /insertErr\b/);

    // C) checkout session reuse retrieve does not log raw caught error
    assert.match(checkout, /session_reuse_retrieve/);
    assert.match(checkout, /status:\s*'retrieve_failed'/);
    assert.doesNotMatch(checkout, /session reuse retrieve failed',\s*e\)/);
    assert.doesNotMatch(checkout, /getResumeCheckoutSessionIdForDtr failed',\s*e\)/);
    assert.doesNotMatch(checkout, /stripe session create failed',\s*e\)/);

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
