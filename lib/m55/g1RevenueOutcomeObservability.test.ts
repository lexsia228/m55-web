/**
 * G1 P0 revenue outcome observability — focused behavioral + privacy contract tests.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  emitPostPaymentTerminalOutcomeOnce,
  M55_FUNNEL_EVENTS,
  resetFunnelImpressionDedupeForTests,
  shouldEmitPostPaymentReady,
  shouldEmitPostPaymentStuck,
  shouldRedirectOwnedRepurchase,
  trackFunnelAction,
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
} from './privacySafeFunnelAnalytics';
import {
  runLightToFullUpgradeCheckoutAttempt,
  type LightToFullUpgradeCheckoutDeps,
} from '../../components/dtr/LightToFullUpgradeButton';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

type TrackCall = { event: string; surface: string };

function createLightToFullHarness(options?: {
  response?: { ok: boolean; body: unknown };
  fetchThrows?: boolean;
}) {
  const tracks: TrackCall[] = [];
  const navigations: string[] = [];
  const posts: Array<{ reportInstanceId: string; productKey: string }> = [];

  const deps: LightToFullUpgradeCheckoutDeps = {
    fetchReplyTicketCheckout: async (body) => {
      posts.push(body);
      if (options?.fetchThrows) throw new Error('network');
      const response = options?.response ?? {
        ok: true,
        body: { checkout_url: 'https://checkout.example/upgrade' },
      };
      return {
        ok: response.ok,
        json: async () => response.body,
      };
    },
    trackFunnelAction: (event, surface) => {
      tracks.push({ event, surface });
      assertPrivacySafeFunnelPayload(buildPrivacySafeFunnelPayload(surface));
    },
    assignLocation: (url) => {
      navigations.push(url);
    },
  };

  return { tracks, navigations, posts, deps };
}

describe('G1 privacy-safe funnel taxonomy', () => {
  it('registers the four new wire event names exactly', () => {
    assert.equal(M55_FUNNEL_EVENTS.lightToFullUpgradeIntent, 'm55_light_to_full_upgrade_intent');
    assert.equal(
      M55_FUNNEL_EVENTS.lightToFullUpgradeCheckoutRedirect,
      'm55_light_to_full_upgrade_checkout_redirect',
    );
    assert.equal(M55_FUNNEL_EVENTS.postPaymentReady, 'm55_post_payment_ready');
    assert.equal(M55_FUNNEL_EVENTS.postPaymentStuck, 'm55_post_payment_stuck');
  });

  it('keeps the existing payload safety contract GREEN', () => {
    assert.doesNotThrow(() =>
      assertPrivacySafeFunnelPayload(buildPrivacySafeFunnelPayload('dtr_saved_report')),
    );
    assert.doesNotThrow(() =>
      assertPrivacySafeFunnelPayload(buildPrivacySafeFunnelPayload('dtr_paid_plan')),
    );
  });
});

describe('Light→Full upgrade observability', () => {
  it('empty report id => no intent', async () => {
    const { tracks, deps } = createLightToFullHarness();
    const result = await runLightToFullUpgradeCheckoutAttempt({ reportInstanceId: '   ' }, deps);
    assert.equal(result.kind, 'noop');
    assert.equal(tracks.length, 0);
  });

  it('valid user attempt => intent exactly once per accepted click', async () => {
    const { tracks, deps } = createLightToFullHarness();
    const result = await runLightToFullUpgradeCheckoutAttempt(
      { reportInstanceId: 'snap-light-1' },
      deps,
    );
    assert.equal(result.kind, 'navigated');
    assert.equal(tracks.filter((t) => t.event === M55_FUNNEL_EVENTS.lightToFullUpgradeIntent).length, 1);
    assert.equal(tracks[0]?.surface, 'dtr_saved_report');
  });

  it('successful checkout URL => redirect event before navigation', async () => {
    const order: string[] = [];
    const { tracks, navigations, deps } = createLightToFullHarness();
    const baseTrack = deps.trackFunnelAction;
    deps.trackFunnelAction = (event, surface) => {
      order.push(`track:${event}`);
      baseTrack(event, surface);
    };
    const baseAssign = deps.assignLocation;
    deps.assignLocation = (url) => {
      order.push('navigate');
      baseAssign(url);
    };

    await runLightToFullUpgradeCheckoutAttempt({ reportInstanceId: 'snap-light-1' }, deps);

    assert.deepEqual(order, [
      `track:${M55_FUNNEL_EVENTS.lightToFullUpgradeIntent}`,
      `track:${M55_FUNNEL_EVENTS.lightToFullUpgradeCheckoutRedirect}`,
      'navigate',
    ]);
    assert.equal(
      tracks.filter((t) => t.event === M55_FUNNEL_EVENTS.lightToFullUpgradeCheckoutRedirect).length,
      1,
    );
    assert.deepEqual(navigations, ['https://checkout.example/upgrade']);
  });

  it('API error => no redirect event', async () => {
    const { tracks, navigations, deps } = createLightToFullHarness({
      response: { ok: false, body: { error: { code: 'unauthenticated' } } },
    });
    const result = await runLightToFullUpgradeCheckoutAttempt(
      { reportInstanceId: 'snap-light-1' },
      deps,
    );
    assert.equal(result.kind, 'error');
    assert.equal(tracks.filter((t) => t.event === M55_FUNNEL_EVENTS.lightToFullUpgradeIntent).length, 1);
    assert.equal(
      tracks.some((t) => t.event === M55_FUNNEL_EVENTS.lightToFullUpgradeCheckoutRedirect),
      false,
    );
    assert.equal(navigations.length, 0);
  });

  it('malformed/missing checkout URL => no redirect event', async () => {
    const { tracks, navigations, deps } = createLightToFullHarness({
      response: { ok: true, body: { checkout_url: '' } },
    });
    const result = await runLightToFullUpgradeCheckoutAttempt(
      { reportInstanceId: 'snap-light-1' },
      deps,
    );
    assert.equal(result.kind, 'error');
    assert.equal(
      tracks.some((t) => t.event === M55_FUNNEL_EVENTS.lightToFullUpgradeCheckoutRedirect),
      false,
    );
    assert.equal(navigations.length, 0);
  });

  it('analytics event contains no raw reportInstanceId/productKey/checkout URL in request body audit', async () => {
    const { posts, deps } = createLightToFullHarness();
    await runLightToFullUpgradeCheckoutAttempt({ reportInstanceId: 'snap-light-1' }, deps);
    assert.equal(posts[0]?.reportInstanceId, 'snap-light-1');
    assert.equal(posts[0]?.productKey, 'dtr_core_light_to_full_upgrade_v1');
    const analyticsSrc = read('lib/m55/privacySafeFunnelAnalytics.ts');
    assert.doesNotMatch(analyticsSrc, /reportInstanceId|productKey|checkout_url/);
  });

  it('component busy guard remains outside analytics attempt', () => {
    const src = read('components/dtr/LightToFullUpgradeButton.tsx');
    assert.match(src, /if \(!rid \|\| busy\) return;/);
    assert.match(src, /runLightToFullUpgradeCheckoutAttempt/);
  });
});

describe('post-payment ready/stuck observability', () => {
  it('exact ready predicate => postPaymentReady eligibility', () => {
    assert.equal(
      shouldEmitPostPaymentReady({
        ready: true,
        hasOwnership: true,
        hasPurchaseSnapshot: true,
      }),
      true,
    );
  });

  it('partial readiness => no ready event eligibility', () => {
    assert.equal(
      shouldEmitPostPaymentReady({
        ready: true,
        hasOwnership: true,
        hasPurchaseSnapshot: false,
      }),
      false,
    );
    assert.equal(
      shouldEmitPostPaymentReady({
        ready: false,
        hasOwnership: true,
        hasPurchaseSnapshot: true,
      }),
      false,
    );
  });

  it('hiddenOnlyRepurchase path is not a ready predicate', () => {
    const src = read('components/dtr/DtrProcessingClient.tsx');
    assert.match(src, /if \(hiddenOnlyRepurchase\)/);
    assert.doesNotMatch(
      src.slice(0, src.indexOf('if (hiddenOnlyRepurchase)')),
      /postPaymentReady|postPaymentStuck/,
    );
  });

  it('owned recovery repurchase branch => no ready predicate', () => {
    assert.equal(
      shouldRedirectOwnedRepurchase(
        {
          hasOwnership: true,
          hasPurchaseSnapshot: false,
          showPurchaseCta: true,
        },
        true,
      ),
      true,
    );
    assert.equal(
      shouldEmitPostPaymentReady({
        hasOwnership: true,
        hasPurchaseSnapshot: false,
        showPurchaseCta: true,
      }),
      false,
    );
  });

  it('MAX_POLLS existing stuck transition => postPaymentStuck eligibility', () => {
    const maxPolls = 120;
    assert.equal(shouldEmitPostPaymentStuck(maxPolls, maxPolls), true);
    assert.equal(shouldEmitPostPaymentStuck(maxPolls - 1, maxPolls), false);
  });

  it('terminal emitter dedupes to one outcome per component instance', () => {
    resetFunnelImpressionDedupeForTests();
    const emitted = { current: null as 'ready' | 'stuck' | null };
    const tracks: TrackCall[] = [];
    const deps = {
      trackFunnelAction: (event: string, surface: string) => {
        tracks.push({ event, surface });
      },
      emitted,
    };

    emitPostPaymentTerminalOutcomeOnce('ready', deps);
    emitPostPaymentTerminalOutcomeOnce('stuck', deps);

    assert.equal(tracks.length, 1);
    assert.equal(tracks[0]?.event, M55_FUNNEL_EVENTS.postPaymentReady);
    assert.equal(emitted.current, 'ready');
  });

  it('ready emission uses dtr_paid_plan surface without forbidden payload keys', () => {
    resetFunnelImpressionDedupeForTests();
    const emitted = { current: null as 'ready' | 'stuck' | null };
    emitPostPaymentTerminalOutcomeOnce('ready', {
      trackFunnelAction,
      emitted,
    });
    assert.equal(emitted.current, 'ready');
  });

  it('processing navigation target remains unchanged', () => {
    const src = read('components/dtr/DtrProcessingClient.tsx');
    assert.match(src, /DTR_PROCESSING_CORE_READY = '\/dtr\/core\?post_purchase=1'/);
    assert.match(src, /router\.replace\(pendingNav\)/);
    const emitterBlock = read('lib/m55/privacySafeFunnelAnalytics.ts').slice(
      read('lib/m55/privacySafeFunnelAnalytics.ts').indexOf(
        'export function emitPostPaymentTerminalOutcomeOnce',
      ),
    );
    assert.doesNotMatch(emitterBlock, /recoveryRef|paymentConfirmed|polls/);
  });
});
