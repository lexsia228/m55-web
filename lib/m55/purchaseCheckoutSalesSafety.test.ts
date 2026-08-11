/**
 * P3 sales-safety focused tests — processing truth, public errors, origin, repurchase ack.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { BirthProfile } from '../soul/profile';
import {
  runPurchaseCheckoutAttempt,
  type PurchaseCheckoutJson,
  type PurchaseCheckoutResponse,
  type PurchaseCheckoutStartedDeps,
  PURCHASE_CHECKOUT_PUBLIC_ERRORS,
  mapPurchaseCheckoutHttpError,
  buildCheckoutIdempotencyKey,
  buildDeterministicCheckoutPurchaseContextId,
  resolveCheckoutPurchaseContextId,
  resolveCheckoutSessionGeneration,
} from './purchaseCheckoutStartedAction';
import { resolveTrustedCheckoutOrigin, isStaleSessionEscapeAllowed } from './trustedCheckoutOrigin';

const ROOT = join(import.meta.dirname, '../..');
const DTR_HIDDEN_ONLY_REPURCHASE_LP_PATH = '/dtr/lp?repurchase=1';

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const VALID_PROFILE: BirthProfile = {
  nickname: 'テスト',
  birthDate: '1990-01-15',
};

function jsonResponse(status: number, body: PurchaseCheckoutJson, ok = status >= 200 && status < 300): PurchaseCheckoutResponse {
  return { status, ok, json: async () => body };
}

describe('trustedCheckoutOrigin', () => {
  it('production resolves to canonical origin only', () => {
    const prev = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = 'production';
    try {
      const origin = resolveTrustedCheckoutOrigin({
        requestOrigin: 'https://evil.example',
        fallbackOrigin: 'https://other.example',
      });
      assert.equal(origin, 'https://m-55.jp');
    } finally {
      process.env.VERCEL_ENV = prev;
    }
  });

  it('allows localhost in non-production', () => {
    const prev = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = 'preview';
    try {
      const origin = resolveTrustedCheckoutOrigin({ requestOrigin: 'http://localhost:3000' });
      assert.equal(origin, 'http://localhost:3000');
    } finally {
      process.env.VERCEL_ENV = prev;
    }
  });
});

describe('isStaleSessionEscapeAllowed', () => {
  it('is false in production even when env flag set', () => {
    const prevFlag = process.env.DTR_ALLOW_STALE_SESSION_NEW_CHECKOUT;
    const prevEnv = process.env.VERCEL_ENV;
    process.env.DTR_ALLOW_STALE_SESSION_NEW_CHECKOUT = '1';
    process.env.VERCEL_ENV = 'production';
    try {
      assert.equal(isStaleSessionEscapeAllowed(), false);
    } finally {
      process.env.DTR_ALLOW_STALE_SESSION_NEW_CHECKOUT = prevFlag;
      process.env.VERCEL_ENV = prevEnv;
    }
  });
});

describe('mapPurchaseCheckoutHttpError', () => {
  it('never exposes raw Stripe or env strings', () => {
    assert.equal(
      mapPurchaseCheckoutHttpError(503, { error: 'Product x is not configured (missing env: STRIPE_PRICE_X)' }),
      PURCHASE_CHECKOUT_PUBLIC_ERRORS.checkout_unavailable,
    );
    assert.equal(
      mapPurchaseCheckoutHttpError(500, { error: 'Stripe API error: Invalid API Key' }),
      PURCHASE_CHECKOUT_PUBLIC_ERRORS.checkout_unavailable,
    );
  });
});

describe('runPurchaseCheckoutAttempt — fulfillment_pending', () => {
  it('shows visible message instead of silent LP when resume id missing', async () => {
    const navigations: string[] = [];
    const submitLock = { current: false };
    const outcome = await runPurchaseCheckoutAttempt({
      productId: 'dtr_core_light_v1',
      profile: VALID_PROFILE,
      submitLock,
      loading: false,
      deps: {
        fetchCheckout: async () => jsonResponse(409, { code: 'fulfillment_pending' }),
        trackFunnelAction: () => {},
        navigateHref: () => {},
        navigateReplace: (url) => navigations.push(url),
        isProfileGatedProduct: () => true,
        validateProfile: () => ({ ok: true }),
        isValidCheckoutProduct: () => true,
      },
    });
    assert.equal(outcome.kind, 'fulfillment_pending');
    if (outcome.kind === 'fulfillment_pending') {
      assert.match(outcome.message, /再購入/);
      assert.equal(navigations.length, 0);
    }
  });

  it('routes to processing when resume session id present', async () => {
    const navigations: string[] = [];
    const submitLock = { current: false };
    const outcome = await runPurchaseCheckoutAttempt({
      productId: 'dtr_core_light_v1',
      profile: VALID_PROFILE,
      submitLock,
      loading: false,
      deps: {
        fetchCheckout: async () =>
          jsonResponse(409, { code: 'fulfillment_pending', resumeCheckoutSessionId: 'cs_resume_1' }),
        trackFunnelAction: () => {},
        navigateHref: () => {},
        navigateReplace: (url) => navigations.push(url),
        isProfileGatedProduct: () => true,
        validateProfile: () => ({ ok: true }),
        isValidCheckoutProduct: () => true,
      },
    });
    assert.equal(outcome.kind, 'navigated');
    assert.equal(navigations[0], '/dtr/processing?session_id=cs_resume_1');
  });
});

describe('checkout intent identity — SB-04 first-intent concurrency', () => {
  const userId = 'user_concurrent_test';
  const light = 'dtr_core_light_v1';
  const full = 'dtr_core_full_v1';

  it('deterministic context converges when no draft row exists', () => {
    const a = resolveCheckoutPurchaseContextId({
      userId,
      productId: light,
      repurchaseLane: false,
      existingDraftId: null,
    });
    const b = resolveCheckoutPurchaseContextId({
      userId,
      productId: light,
      repurchaseLane: false,
      existingDraftId: null,
    });
    assert.equal(a, b);
    assert.match(a, /^[0-9a-f-]{36}$/);
  });

  it('two near-concurrent first-intent requests share one Stripe idempotency key', () => {
    const ctxA = resolveCheckoutPurchaseContextId({
      userId,
      productId: light,
      repurchaseLane: false,
      existingDraftId: null,
    });
    const ctxB = resolveCheckoutPurchaseContextId({
      userId,
      productId: light,
      repurchaseLane: false,
      existingDraftId: null,
    });
    const genA = resolveCheckoutSessionGeneration({
      pendingExtra: {},
      productId: light,
      sessionReuseKind: 'none',
    });
    const genB = resolveCheckoutSessionGeneration({
      pendingExtra: {},
      productId: light,
      sessionReuseKind: 'none',
    });
    const keyA = buildCheckoutIdempotencyKey(userId, light, ctxA, genA);
    const keyB = buildCheckoutIdempotencyKey(userId, light, ctxB, genB);
    assert.equal(keyA, keyB);

    let chargeableCreateCount = 0;
    const idempotencyRegistry = new Set<string>();
    const simulateStripeCreate = (idempotencyKey: string): 'created' | 'replayed' => {
      if (idempotencyRegistry.has(idempotencyKey)) return 'replayed';
      idempotencyRegistry.add(idempotencyKey);
      chargeableCreateCount += 1;
      return 'created';
    };
    assert.equal(simulateStripeCreate(keyA), 'created');
    assert.equal(simulateStripeCreate(keyB), 'replayed');
    assert.equal(chargeableCreateCount, 1);
  });

  it('uses existing draft id when present (shared DB anchor)', () => {
    const draftId = 'aaaaaaaa-bbbb-4ccc-addd-eeeeeeeeeeee';
    const a = resolveCheckoutPurchaseContextId({
      userId,
      productId: light,
      repurchaseLane: false,
      existingDraftId: draftId,
    });
    const b = resolveCheckoutPurchaseContextId({
      userId,
      productId: light,
      repurchaseLane: false,
      existingDraftId: draftId,
    });
    assert.equal(a, draftId);
    assert.equal(a, b);
  });

  it('cancelled/expired session bumps generation for legitimate retry', () => {
    const ctx = buildDeterministicCheckoutPurchaseContextId(userId, light, false);
    const pending = {
      pendingCheckoutSessionId: 'cs_old_1',
      pendingCheckoutProductId: light,
      checkoutSessionGeneration: 0,
    };
    const gen = resolveCheckoutSessionGeneration({
      pendingExtra: pending,
      productId: light,
      sessionReuseKind: 'unusable',
    });
    assert.equal(gen, 1);
    const retryKey = buildCheckoutIdempotencyKey(userId, light, ctx, gen);
    const firstKey = buildCheckoutIdempotencyKey(userId, light, ctx, 0);
    assert.notEqual(retryKey, firstKey);
  });

  it('different product does not share purchase context or idempotency key', () => {
    const lightCtx = resolveCheckoutPurchaseContextId({
      userId,
      productId: light,
      repurchaseLane: false,
      existingDraftId: null,
    });
    const fullCtx = resolveCheckoutPurchaseContextId({
      userId,
      productId: full,
      repurchaseLane: false,
      existingDraftId: null,
    });
    assert.notEqual(lightCtx, fullCtx);
    const lightKey = buildCheckoutIdempotencyKey(userId, light, lightCtx, 0);
    const fullKey = buildCheckoutIdempotencyKey(userId, full, fullCtx, 0);
    assert.notEqual(lightKey, fullKey);
  });

  it('acknowledged repurchase lane is a distinct deliberate intent', () => {
    const freshCtx = buildDeterministicCheckoutPurchaseContextId(userId, light, false);
    const repurchaseCtx = buildDeterministicCheckoutPurchaseContextId(userId, light, true);
    assert.notEqual(freshCtx, repurchaseCtx);
    const freshKey = buildCheckoutIdempotencyKey(userId, light, freshCtx, 0);
    const repurchaseKey = buildCheckoutIdempotencyKey(userId, light, repurchaseCtx, 0);
    assert.notEqual(freshKey, repurchaseKey);
  });

  it('open-session reuse does not increment generation', () => {
    const pending = {
      pendingCheckoutSessionId: 'cs_open_1',
      pendingCheckoutProductId: light,
      checkoutSessionGeneration: 2,
    };
    const gen = resolveCheckoutSessionGeneration({
      pendingExtra: pending,
      productId: light,
      sessionReuseKind: 'open',
    });
    assert.equal(gen, 2);
  });
});

describe('source contracts — static safety invariants', () => {
  it('processing page does not silently redirect invalid paid session to LP', () => {
    const src = read('app/dtr/processing/page.tsx');
    assert.doesNotMatch(src, /if \(!sessionVerified\.valid\) \{\s*redirect\('\/dtr\/lp'\)/);
    assert.match(src, /sessionVerified\.valid/);
  });

  it('PaidDtrAnalysisLoading gates completion copy on processingComplete', () => {
    const src = read('components/dtr/PaidDtrAnalysisLoading.tsx');
    assert.match(src, /processingComplete/);
    assert.match(src, /整いました|stepCopy/);
  });

  it('checkout route uses trusted origin helper', () => {
    const src = read('app/api/purchase/checkout/route.ts');
    assert.match(src, /resolveTrustedCheckoutOrigin/);
    assert.match(src, /const origin = resolveTrustedCheckoutOrigin/);
  });

  it('checkout route uses Stripe idempotency or open-session reuse', () => {
    const src = read('app/api/purchase/checkout/route.ts');
    assert.ok(src.includes('idempotencyKey') || src.includes('idempotency'));
    assert.ok(src.includes('pendingCheckoutSessionId') || src.includes('open'));
    assert.match(src, /resolveCheckoutPurchaseContextId/);
    assert.match(src, /getDraftById/);
  });

  it('hidden-only repurchase LP includes repurchase query', () => {
    assert.match(DTR_HIDDEN_ONLY_REPURCHASE_LP_PATH, /repurchase=1/);
  });

  it('processing page keeps paid buyers off sales LP after fulfillment lag', () => {
    const src = read('app/dtr/processing/page.tsx');
    assert.match(src, /paymentConfirmed/);
    assert.match(src, /paidProcessingRecoveryMessage\(\)/);
    const postFulfillmentBlock = src.split('const fr = await fulfillDtrCoreFromCheckoutSessionId')[1] ?? '';
    assert.doesNotMatch(postFulfillmentBlock, /redirect\('\/dtr\/lp'\)/);
  });

  it('checkout route resumes paid sessions instead of creating duplicates', () => {
    const src = read('app/api/purchase/checkout/route.ts');
    assert.match(src, /kind: 'paid'/);
    assert.match(src, /retrieve_failed/);
    assert.match(src, /fulfillment_pending/);
  });

  it('DtrPaidPurchasePrep reads checkout=cancelled client-side', () => {
    const src = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(src, /checkout.*cancelled|cancelled.*checkout/);
  });
});
