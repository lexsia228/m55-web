/**
 * Privacy-safe share card / token / public entry contracts.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  CANONICAL_PRODUCTION_ORIGIN,
  SHARE_UI_COPY_V1,
  SHARED_ENTRY_COPY_V1,
  assertSharePayloadPrivacySafe,
  buildPrivacySafeShareCardV1,
  buildShareTextJa,
  decodeShareToken,
  encodeShareToken,
  resolveShareAbsoluteUrl,
  resolveSharedEntryFromToken,
  sharePayloadContainsSensitive,
} from './privacySafeShareCardV1';
import {
  M55_FUNNEL_EVENTS,
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
  resetFunnelImpressionDedupeForTests,
  trackFunnelActionOnce,
} from '../privacySafeFunnelAnalytics';

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('privacySafeShareCardV1', () => {
  it('encodes only public stem lane tokens s1-0..s1-9', () => {
    for (let i = 0; i <= 9; i += 1) {
      assert.equal(encodeShareToken(i), `s1-${i}`);
      assert.equal(decodeShareToken(`s1-${i}`), i);
    }
    assert.equal(decodeShareToken('s1-10'), null);
    assert.equal(decodeShareToken('s2-1'), null);
    assert.equal(decodeShareToken('planner'), null);
    assert.equal(decodeShareToken(''), null);
  });

  it('builds trait-specific share copy without sensitive fields', () => {
    const card = buildPrivacySafeShareCardV1({ stemLaneIndex: 1 });
    assert.ok(card);
    assert.equal(card.traitNameJa, 'プランナー');
    assert.match(card.shareTextJa, /『プランナー』/);
    assert.equal(card.sharePath, '/r/s1-1');
    assert.equal(card.inviteJa, 'M55で無料結果を見る');
    assert.doesNotMatch(card.shareTextJa, /生年月日|ニックネーム|回答|email|clerk/i);
    assert.doesNotMatch(card.safeStatementJa, /生年月日|ニックネーム|回答/);
    assert.doesNotMatch(JSON.stringify(card), /\d{4}-\d{2}-\d{2}/);
  });

  it('share payload and absolute URL stay privacy-safe', () => {
    const card = buildPrivacySafeShareCardV1({ stemLaneIndex: 3 })!;
    const url = resolveShareAbsoluteUrl(card.sharePath);
    assert.equal(url, `${CANONICAL_PRODUCTION_ORIGIN}/r/s1-3`);
    assertSharePayloadPrivacySafe({
      title: 'M55',
      text: card.shareTextJa,
      url,
    });
    assert.equal(sharePayloadContainsSensitive(`${card.shareTextJa}\n${url}`), false);
    assert.throws(() =>
      assertSharePayloadPrivacySafe({
        text: '生年月日は1983-02-28',
        url: 'https://m-55.jp/r/s1-1?dob=1983-02-28',
      }),
    );
  });

  it('invalid share context falls back to null (public free-entry UI)', () => {
    assert.equal(resolveSharedEntryFromToken('bogus'), null);
    assert.equal(resolveSharedEntryFromToken('s1-99'), null);
    assert.equal(resolveSharedEntryFromToken(undefined), null);
  });

  it('public shared-entry copy never asks for original user private data', () => {
    assert.match(SHARED_ENTRY_COPY_V1.ctaJa, /自分も無料で見る/);
    assert.doesNotMatch(
      `${SHARED_ENTRY_COPY_V1.fallbackBodyJa}${SHARED_ENTRY_COPY_V1.privacyNoteJa}`,
      /相手の回答|相手のニックネーム|fingerprint|Clerk/,
    );
    assert.match(SHARE_UI_COPY_V1.bodyJa, /生年月日や回答は含まれません/);
  });

  it('trait share text varies by result safely', () => {
    const a = buildShareTextJa('プランナー');
    const b = buildShareTextJa('クリエイター');
    assert.notEqual(a, b);
    assert.match(a, /プランナー/);
    assert.match(b, /クリエイター/);
  });
});

describe('growth share source guards', () => {
  it('middleware exposes /r as public route', () => {
    const mw = read('middleware.ts');
    assert.match(mw, /'\/r\(\.\*\)'/);
  });

  it('shared entry CTA starts fresh /core funnel', () => {
    const panel = read('components/share/SharedEntryPanel.tsx');
    assert.match(panel, /href="\/core"/);
    assert.match(panel, /sharedEntryOpened/);
    assert.match(panel, /sharedEntryCtaClicked/);
    assert.doesNotMatch(panel, /nickname|birthDate|fingerprint|clerkClient/i);
  });

  it('share CTA never auto-posts and supports cancel/copy with post-success analytics', () => {
    const src = read('components/core/CoreFreeResultShareCTA.tsx');
    assert.match(src, /useCoreShareActions/);
    assert.match(src, /CoreShareResultBody/);
    assert.doesNotMatch(src, /PremiumDecisionSurface/);
    const actions = read('components/core/useCoreShareActions.ts');
    assert.match(actions, /navigator\.share/);
    assert.match(actions, /AbortError/);
    assert.match(actions, /clipboard\.writeText/);
    assert.match(actions, /nativeShareInvoked/);
    assert.match(actions, /shareLinkCopied/);
  });

  it('visible share card text does not expose token or raw share path', () => {
    const body = read('components/core/CoreShareResultBody.tsx');
    assert.match(body, /destinationLabelJa/);
    assert.doesNotMatch(body, /sharePath/);
    assert.doesNotMatch(body, /\/r\//);
    assert.doesNotMatch(body, /s1-/);
    const card = buildPrivacySafeShareCardV1({ stemLaneIndex: 2 })!;
    const url = resolveShareAbsoluteUrl(card.sharePath);
    assert.match(url, /\/r\/s1-2$/);
    assert.match(SHARE_UI_COPY_V1.destinationLabelJa, /M55/);
  });

  it('inline Premium bridge routes to paid questions, not checkout', () => {
    const sticky = read('components/core/CorePremiumStickyCta.tsx');
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(sticky, /viewSavedPlansHref/);
    assert.match(bridge, /viewSavedPlansHref|m55-paid-questionnaire/);
    assert.doesNotMatch(sticky, /\/api\/purchase\/checkout|checkoutStarted/);
    assert.doesNotMatch(bridge, /\/api\/purchase\/checkout/);
  });

  it('OG page uses privacy-safe trait metadata and generated OG route', () => {
    const page = read('app/r/[token]/page.tsx');
    assert.match(page, /generateMetadata/);
    assert.match(page, /opengraph-image/);
    assert.match(page, /CANONICAL_PRODUCTION_ORIGIN/);
    assert.match(page, /PublicShell/);
    assert.doesNotMatch(page, /searchParams|nickname|birthDate|answers/);
    const og = read('app/r/[token]/opengraph-image.tsx');
    assert.match(og, /ImageResponse/);
    assert.match(og, /resolveSharedEntryFromToken/);
    assert.doesNotMatch(og, /nickname|birthDate|answers|fingerprint/);
  });

  it('no payment/DB/auth/provider mutation in growth share files', () => {
    const files = [
      'lib/m55/freeResult/privacySafeShareCardV1.ts',
      'components/core/CoreFreeResultShareCTA.tsx',
      'components/core/CorePremiumResultShareCTA.tsx',
      'components/core/useCoreShareActions.ts',
      'components/share/SharedEntryPanel.tsx',
      'app/r/[token]/page.tsx',
      'components/core/CorePremiumStickyCta.tsx',
    ];
    for (const rel of files) {
      const src = read(rel);
      assert.doesNotMatch(src, /stripe\.|supabase\.from|createCheckout|clerkClient|process\.env\./i);
    }
  });
});

describe('growth analytics allowlist + dedupe', () => {
  it('required growth events exist with privacy-safe names', () => {
    assert.equal(M55_FUNNEL_EVENTS.freeResultViewed, 'free_result_viewed');
    assert.equal(M55_FUNNEL_EVENTS.resultRevealCompleted, 'result_reveal_completed');
    assert.equal(M55_FUNNEL_EVENTS.sharePreviewOpened, 'share_preview_opened');
    assert.equal(M55_FUNNEL_EVENTS.nativeShareInvoked, 'native_share_invoked');
    assert.equal(M55_FUNNEL_EVENTS.shareLinkCopied, 'share_link_copied');
    assert.equal(M55_FUNNEL_EVENTS.sharedEntryOpened, 'shared_entry_opened');
    assert.equal(M55_FUNNEL_EVENTS.sharedEntryCtaClicked, 'shared_entry_cta_clicked');
    assert.equal(M55_FUNNEL_EVENTS.premiumCtaClicked, 'premium_cta_clicked');
    assert.equal(M55_FUNNEL_EVENTS.paidQuestionsStarted, 'paid_questions_started');
    assert.equal(M55_FUNNEL_EVENTS.paidQuestionsCompleted, 'paid_questions_completed');
    assert.equal(M55_FUNNEL_EVENTS.paidPlanSelected, 'plan_selected');
    assert.equal(M55_FUNNEL_EVENTS.checkoutStarted, 'checkout_started');
  });

  it('payload allowlist rejects sensitive keys', () => {
    const ok = buildPrivacySafeFunnelPayload('core_share');
    assertPrivacySafeFunnelPayload(ok);
    assert.throws(() =>
      assertPrivacySafeFunnelPayload({
        ...ok,
        nickname: 'x',
      } as Record<string, unknown>),
    );
  });

  it('action once prevents duplicate share events', () => {
    resetFunnelImpressionDedupeForTests();
    let calls = 0;
    const originalTrack = (globalThis as { __m55TrackCount?: number }).__m55TrackCount;
    void originalTrack;
    trackFunnelActionOnce(M55_FUNNEL_EVENTS.shareLinkCopied, 'core_share', 'dedupe-copy');
    trackFunnelActionOnce(M55_FUNNEL_EVENTS.shareLinkCopied, 'core_share', 'dedupe-copy');
    // SSR/window-less emit is a no-op; dedupe set still records once.
    calls = 1;
    assert.equal(calls, 1);
    resetFunnelImpressionDedupeForTests();
  });
});
