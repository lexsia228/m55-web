/**
 * Behavioral coverage: checkout_started fires only after successful checkout
 * session creation (valid URL), immediately before navigation.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import type { BirthProfile } from '../soul/profile';
import {
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
  M55_FUNNEL_EVENTS,
} from './privacySafeFunnelAnalytics';
import {
  runPurchaseCheckoutAttempt,
  type PurchaseCheckoutJson,
  type PurchaseCheckoutPayload,
  type PurchaseCheckoutResponse,
  type PurchaseCheckoutStartedDeps,
} from './purchaseCheckoutStartedAction';
import { DTR_CORE_LIGHT_V1 } from '../oneTimeCheckout';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const VALID_PROFILE: BirthProfile = {
  nickname: 'テスト',
  birthDate: '1990-01-15',
};

type TrackCall = { event: string; surface: string; extras?: Record<string, unknown> };
type NavCall = { mode: 'href' | 'replace'; url: string };

function createHarness(options?: {
  response?: PurchaseCheckoutResponse | (() => Promise<PurchaseCheckoutResponse>);
  fetchImpl?: (payload: PurchaseCheckoutPayload) => Promise<PurchaseCheckoutResponse>;
  profileOk?: boolean;
  validProduct?: boolean;
}) {
  const tracks: TrackCall[] = [];
  const navigations: NavCall[] = [];
  const posts: PurchaseCheckoutPayload[] = [];
  const submitLock = { current: false };

  const defaultResponse = (): PurchaseCheckoutResponse => ({
    status: 200,
    ok: true,
    json: async () => ({ url: 'https://checkout.example/session/abc' }),
  });

  const deps: PurchaseCheckoutStartedDeps = {
    fetchCheckout: async (payload) => {
      posts.push(payload);
      if (options?.fetchImpl) return options.fetchImpl(payload);
      if (typeof options?.response === 'function') return options.response();
      if (options?.response) return options.response;
      return defaultResponse();
    },
    trackFunnelAction: (event, surface, extras) => {
      tracks.push({ event, surface, extras });
    },
    navigateHref: (url) => {
      navigations.push({ mode: 'href', url });
    },
    navigateReplace: (url) => {
      navigations.push({ mode: 'replace', url });
    },
    isProfileGatedProduct: () => true,
    validateProfile: () => ({ ok: options?.profileOk !== false }),
    isValidCheckoutProduct: () => options?.validProduct !== false,
  };

  async function attempt(productId = DTR_CORE_LIGHT_V1) {
    return runPurchaseCheckoutAttempt({
      productId,
      profile: VALID_PROFILE,
      freeAnswerSet: { q1: 'a' },
      paidAnswerSet: { q2: 'b' },
      submitLock,
      loading: false,
      deps,
    });
  }

  return { tracks, navigations, posts, submitLock, deps, attempt };
}

function jsonResponse(
  status: number,
  body: PurchaseCheckoutJson,
  ok = status >= 200 && status < 300,
): PurchaseCheckoutResponse {
  return {
    status,
    ok,
    json: async () => body,
  };
}

describe('checkout_started — behavioral control flow', () => {
  it('1) successful checkout: POST once, emit once after success, before navigation', async () => {
    const order: string[] = [];
    const { tracks, navigations, posts, attempt, deps } = createHarness();
    const baseFetch = deps.fetchCheckout;
    deps.fetchCheckout = async (payload) => {
      order.push('post');
      const res = await baseFetch(payload);
      order.push('response');
      return {
        ...res,
        json: async () => {
          const body = await res.json();
          order.push('json');
          return body;
        },
      };
    };
    const originalTrack = deps.trackFunnelAction;
    deps.trackFunnelAction = (event, surface, extras) => {
      order.push(`track:${event}`);
      originalTrack(event, surface, extras);
    };
    const originalHref = deps.navigateHref;
    deps.navigateHref = (url) => {
      order.push('navigate');
      originalHref(url);
    };

    const outcome = await attempt();
    assert.equal(outcome.kind, 'navigated');
    assert.equal(posts.length, 1);
    assert.equal(posts[0]?.productId, DTR_CORE_LIGHT_V1);
    assert.deepEqual(posts[0]?.freeAnswerSet, { q1: 'a' });
    assert.deepEqual(posts[0]?.paidAnswerSet, { q2: 'b' });
    assert.equal(tracks.length, 1);
    assert.equal(tracks[0]?.event, M55_FUNNEL_EVENTS.checkoutStarted);
    assert.equal(tracks[0]?.surface, 'dtr_paid_plan');
    assert.equal(tracks[0]?.extras?.planClass, 'light');
    assert.equal(navigations.length, 1);
    assert.deepEqual(navigations[0], {
      mode: 'href',
      url: 'https://checkout.example/session/abc',
    });
    assert.deepEqual(order, ['post', 'response', 'json', 'track:checkout_started', 'navigate']);
  });

  it('2) server 401: POST once, no checkout_started, auth-required preserved', async () => {
    const { tracks, navigations, posts, attempt, submitLock } = createHarness({
      response: jsonResponse(401, { error: 'Unauthorized' }, false),
    });
    const outcome = await attempt();
    assert.equal(outcome.kind, 'needs_sign_in');
    assert.equal(posts.length, 1);
    assert.equal(
      tracks.some((t) => t.event === M55_FUNNEL_EVENTS.checkoutStarted),
      false,
    );
    assert.equal(
      tracks.some((t) => t.event === M55_FUNNEL_EVENTS.authRequiredShown),
      true,
    );
    assert.equal(navigations.length, 0);
    assert.equal(submitLock.current, false);
  });

  it('3) server 4xx/5xx: no event; safe public failure outcome preserved', async () => {
    const { tracks, navigations, posts, attempt, submitLock } = createHarness({
      response: jsonResponse(500, { error: 'server boom' }, false),
    });
    const outcome = await attempt();
    assert.equal(outcome.kind, 'error');
    if (outcome.kind === 'error') {
      assert.equal(outcome.message, '支払い画面を開けませんでした。時間をおいてもう一度お試しください。改善しない場合はサポートへお問い合わせください。');
      assert.doesNotMatch(outcome.message, /server boom/);
    }
    assert.equal(posts.length, 1);
    assert.equal(tracks.length, 0);
    assert.equal(navigations.length, 0);
    assert.equal(submitLock.current, false);
  });

  it('4) network rejection: no event; retry remains possible', async () => {
    const harness = createHarness({
      fetchImpl: async () => {
        throw new Error('network down');
      },
    });
    const first = await harness.attempt();
    assert.equal(first.kind, 'error');
    if (first.kind === 'error') {
      assert.doesNotMatch(first.message, /network down/);
    }
    assert.equal(harness.tracks.length, 0);
    assert.equal(harness.submitLock.current, false);

    // Retry after failure with success.
    harness.deps.fetchCheckout = async (payload) => {
      harness.posts.push(payload);
      return jsonResponse(200, { url: 'https://checkout.example/retry' });
    };
    const second = await runPurchaseCheckoutAttempt({
      productId: DTR_CORE_LIGHT_V1,
      profile: VALID_PROFILE,
      submitLock: harness.submitLock,
      loading: false,
      deps: harness.deps,
    });
    assert.equal(second.kind, 'navigated');
    assert.equal(
      harness.tracks.filter((t) => t.event === M55_FUNNEL_EVENTS.checkoutStarted).length,
      1,
    );
  });

  it('5) invalid local product: no POST, no event', async () => {
    const { tracks, posts, attempt, submitLock } = createHarness({
      validProduct: false,
    });
    const outcome = await attempt();
    assert.equal(outcome.kind, 'invalid_product');
    assert.equal(posts.length, 0);
    assert.equal(tracks.length, 0);
    assert.equal(submitLock.current, false);
  });

  it('5b) profile gate failure: no POST, no event', async () => {
    const { tracks, posts, attempt, submitLock } = createHarness({
      profileOk: false,
    });
    const outcome = await attempt();
    assert.equal(outcome.kind, 'needs_profile');
    assert.equal(posts.length, 0);
    assert.equal(tracks.length, 0);
    assert.equal(submitLock.current, false);
  });

  it('6) pending double activation: one POST, at most one event', async () => {
    let release!: (res: PurchaseCheckoutResponse) => void;
    const gate = new Promise<PurchaseCheckoutResponse>((resolve) => {
      release = resolve;
    });
    const { tracks, posts, submitLock, deps } = createHarness({
      fetchImpl: async () => gate,
    });

    const firstPromise = runPurchaseCheckoutAttempt({
      productId: DTR_CORE_LIGHT_V1,
      profile: VALID_PROFILE,
      submitLock,
      loading: false,
      deps,
    });
    const second = await runPurchaseCheckoutAttempt({
      productId: DTR_CORE_LIGHT_V1,
      profile: VALID_PROFILE,
      submitLock,
      loading: false,
      deps,
    });
    assert.equal(second.kind, 'skipped_locked');
    assert.equal(posts.length, 1);

    release(jsonResponse(200, { url: 'https://checkout.example/once' }));
    const first = await firstPromise;
    assert.equal(first.kind, 'navigated');
    assert.equal(
      tracks.filter((t) => t.event === M55_FUNNEL_EVENTS.checkoutStarted).length,
      1,
    );
  });

  it('7) retry after failed request: zero then one emit', async () => {
    let call = 0;
    const { tracks, attempt, deps, submitLock } = createHarness({
      fetchImpl: async () => {
        call += 1;
        if (call === 1) return jsonResponse(503, { error: 'busy' }, false);
        return jsonResponse(200, { url: 'https://checkout.example/second' });
      },
    });
    const first = await attempt();
    assert.equal(first.kind, 'error');
    assert.equal(tracks.length, 0);
    assert.equal(submitLock.current, false);

    const second = await runPurchaseCheckoutAttempt({
      productId: DTR_CORE_LIGHT_V1,
      profile: VALID_PROFILE,
      submitLock,
      loading: false,
      deps,
    });
    assert.equal(second.kind, 'navigated');
    assert.equal(
      tracks.filter((t) => t.event === M55_FUNNEL_EVENTS.checkoutStarted).length,
      1,
    );
  });

  it('8) successful response missing checkout URL: no event, no navigation', async () => {
    const { tracks, navigations, attempt, submitLock } = createHarness({
      response: jsonResponse(200, { url: '' }),
    });
    const outcome = await attempt();
    assert.equal(outcome.kind, 'error');
    if (outcome.kind === 'error') {
      assert.equal(outcome.message, '支払い画面を開けませんでした。時間をおいてもう一度お試しください。改善しない場合はサポートへお問い合わせください。');
      assert.doesNotMatch(outcome.message, /Checkout URL not returned/);
    }
    assert.equal(tracks.length, 0);
    assert.equal(navigations.length, 0);
    assert.equal(submitLock.current, false);
  });

  it('9) privacy: allowlisted analytics payload only', () => {
    const payload = buildPrivacySafeFunnelPayload('dtr_paid_plan');
    assert.deepEqual(Object.keys(payload).sort(), ['eventVersion', 'occurredAt', 'surface']);
    assertPrivacySafeFunnelPayload(payload);
    assert.doesNotMatch(
      JSON.stringify(payload),
      /dob|birth|nickname|email|userId|answer|session|consult/i,
    );
  });

  it('10) no checkout_completed or fulfillment_ready client events', () => {
    const purchase = read('components/PurchaseButton.tsx');
    const helper = read('lib/m55/purchaseCheckoutStartedAction.ts');
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.doesNotMatch(purchase + helper + bridge, /checkout_completed|fulfillment_ready/);
    assert.equal(
      Object.values(M55_FUNNEL_EVENTS).includes('checkout_completed' as never),
      false,
    );
    assert.equal(
      Object.values(M55_FUNNEL_EVENTS).includes('fulfillment_ready' as never),
      false,
    );
  });
});

describe('checkout_started — wiring / bridge source guards', () => {
  it('PurchaseButton delegates to helper; emit is post-response in helper', () => {
    const purchase = read('components/PurchaseButton.tsx');
    const helper = read('lib/m55/purchaseCheckoutStartedAction.ts');
    assert.match(purchase, /runPurchaseCheckoutAttempt/);
    assert.match(purchase, /\/api\/purchase\/checkout/);
    assert.match(purchase, /method:\s*'POST'/);
    assert.doesNotMatch(purchase, /M55_FUNNEL_EVENTS\.checkoutStarted/);
    const emitIdx = helper.indexOf('M55_FUNNEL_EVENTS.checkoutStarted');
    const fetchIdx = helper.indexOf('deps.fetchCheckout');
    const navIdx = helper.indexOf('deps.navigateHref(checkoutUrl)');
    assert.ok(fetchIdx >= 0 && emitIdx > fetchIdx && navIdx > emitIdx);
  });

  it('bridge CTA and /dtr/lp open do not emit checkout_started', () => {
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    const lp = read('app/dtr/lp/page.tsx');
    assert.match(bridge, /paidBridgePrimaryClick/);
    assert.doesNotMatch(bridge, /checkoutStarted|checkout_started/);
    assert.doesNotMatch(lp, /checkoutStarted|checkout_started|trackFunnelAction/);
  });
});
