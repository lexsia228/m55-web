/**
 * P1 commercial UX unified implementation guards.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  assertTraitIdentityCatalogComplete,
  resolveTraitIdentity,
  TRAIT_IDENTITY_CATALOG,
} from './traitIdentityCatalog';
import { PLAN_COMPARISON, buildPlanComparisonModel } from './planComparison';
import {
  MOBILE_MENU_PUBLIC,
  DESKTOP_PRIMARY_NAV,
  resolveContextualPrimaryAction,
  resolvePublicHeaderState,
} from './publicHeaderState';
import { M55_COMMERCIAL_TERMINOLOGY as T } from './terminology';
import { buildPrivacySafeShareCardV1 } from '../freeResult/privacySafeShareCardV1';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('traitIdentityCatalog', () => {
  it('all 10 traits have complete canonical fields', () => {
    assertTraitIdentityCatalogComplete();
    assert.equal(TRAIT_IDENTITY_CATALOG.length, 10);
  });

  it('result/share/OG use aligned identity', () => {
    const card = buildPrivacySafeShareCardV1({ stemLaneIndex: 2 })!;
    const identity = resolveTraitIdentity(2)!;
    assert.equal(card.traitNameJa, identity.traitName);
    assert.equal(card.traitPhraseJa, identity.canonicalTagline);
    assert.equal(card.safeStatementJa, identity.shareStatement);
  });

  it('privacySafeShareCardV1 uses trait catalog not second SAFE_STATEMENT catalog', () => {
    const src = read('lib/m55/freeResult/privacySafeShareCardV1.ts');
    assert.match(src, /resolveTraitIdentity/);
    assert.doesNotMatch(src, /SAFE_STATEMENT_BY_LANE\[display\.stemLaneIndex\]/);
  });
});

describe('planComparison', () => {
  it('matches Product Truth arithmetic', () => {
    const plan = buildPlanComparisonModel();
    assert.equal(plan.light.priceJpy, 1000);
    assert.equal(plan.full.priceJpy, 1480);
    assert.equal(plan.priceDeltaJpy, 480);
    assert.equal(plan.additionalReadingsDelta, 4);
    assert.equal(plan.upgradePriceJpy, 600);
    assert.equal(plan.lightThenUpgradeTotalJpy, 1600);
    assert.equal(plan.fullInitialAdvantageJpy, 120);
    assert.match(plan.oneTimeNoteJa, /自動更新なし/);
    assert.match(plan.fullRecommendReasonJa, /複数/);
  });

  it('bridge, pricing, prep, and /dtr/lp consume shared model', () => {
    const pricing = read('app/pricing/page.tsx');
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    const lp = read('app/dtr/lp/page.tsx');
    assert.match(pricing, /PLAN_COMPARISON/);
    assert.match(prep, /PLAN_COMPARISON/);
    assert.match(lp, /PLAN_COMPARISON/);
    assert.equal(PLAN_COMPARISON.light.priceJpy, 1000);
    assert.equal(PLAN_COMPARISON.selectFullCtaJa, 'フルを選ぶ');
  });
});

describe('publicHeaderState contract', () => {
  it('desktop nav uses canonical terminology', () => {
    assert.equal(DESKTOP_PRIMARY_NAV[0]!.label, T.freeEntry);
    assert.equal(DESKTOP_PRIMARY_NAV[1]!.label, T.premiumProduct);
  });

  it('mobile menu contains required destinations', () => {
    const hrefs = MOBILE_MENU_PUBLIC.map((item) => item.href);
    assert.deepEqual(hrefs, ['/home', '/core', '/dtr/lp', '/how-m55-works', '/ten-views']);
    assert.equal(MOBILE_MENU_PUBLIC[3]!.label, T.aboutM55);
  });

  it('shared entry contextual CTA is recipient action', () => {
    const action = resolveContextualPrimaryAction({
      surface: 'shared_entry',
      freeResultAvailable: false,
    });
    assert.equal(action.label, T.recipientAction);
    assert.equal(action.href, '/core');
  });

  it('premium flow returns to free result when available', () => {
    const action = resolveContextualPrimaryAction({
      surface: 'premium_lp',
      freeResultAvailable: true,
    });
    assert.equal(action.label, T.returnToFreeResult);
  });

  it('PublicHeader does not read browser storage directly', () => {
    const header = read('components/shell/PublicHeader.tsx');
    assert.doesNotMatch(header, /readSelfFunnelStage/);
    assert.doesNotMatch(header, /localStorage/);
    assert.doesNotMatch(header, /sessionStorage/);
    assert.match(read('components/shell/PublicHeaderContainer.tsx'), /readSelfFunnelStage/);
  });

  it('/core active state maps to free entry', () => {
    const state = resolvePublicHeaderState({
      pathname: '/core',
      freeResultAvailable: true,
      signedIn: false,
      coreHasResult: true,
    });
    assert.equal(state.contextualPrimaryAction.label, T.viewPremiumReport);
  });

  it('/pricing active state maps to premium product nav', () => {
    const header = read('lib/m55/commercialUx/publicHeaderState.ts');
    assert.match(header, /pathname === '\/pricing'/);
  });
});

describe('free result ordering + single share card', () => {
  it('CoreEssencePanel renders share module once after meaningful content', () => {
    const essence = read('components/core/CoreEssencePanel.tsx');
    assert.equal((essence.match(/<CoreFreeShareableResultCard/g) ?? []).length, 0);
    assert.equal((essence.match(/<CoreFreeResultShareCTA/g) ?? []).length, 1);
    const slice = essence.slice(essence.indexOf('shouldShowResultSections(uxPhase) && composition'));
    const sceneIdx = slice.indexOf('CoreFreeResultScenesSection');
    const shareIdx = slice.indexOf('CoreFreeResultShareCTA');
    const bridgeIdx = slice.indexOf('CoreEntryReportCTASection');
    const stickyIdx = slice.indexOf('CorePremiumStickyCta');
    assert.ok(sceneIdx >= 0 && shareIdx > sceneIdx && bridgeIdx > shareIdx && stickyIdx > bridgeIdx);
  });

  it('share copy emits copied event only after clipboard success', () => {
    const src = read('components/core/CoreFreeResultShareCTA.tsx');
    const copyBlock = src.slice(src.indexOf('async function handleCopyLink'));
    const emitIdx = copyBlock.indexOf('shareLinkCopied');
    const writeIdx = copyBlock.indexOf('clipboard.writeText');
    assert.ok(writeIdx >= 0 && emitIdx > writeIdx);
    assert.match(src, /shareFallbackText/);
  });
});

describe('OG wiring', () => {
  it('metadata references token-specific generated OG route', () => {
    const page = read('app/r/[token]/page.tsx');
    assert.match(page, /opengraph-image/);
    assert.doesNotMatch(page, /images: \[\{ url: card\.imagePath/);
    assert.match(page, /PublicShell/);
  });
});

describe('print contract', () => {
  it('shared print utilities hide chrome controls', () => {
    const css = read('lib/m55/commercialUx/publicPrint.css');
    assert.match(css, /@media print/);
    assert.match(css, /@page/);
    assert.match(css, /data-m55-public-shell/);
    assert.match(css, /m55-premium-sticky-cta/);
    assert.match(css, /menuTrigger/);
    assert.match(css, /premiumStickyBar/);
    assert.match(css, /min-height:\s*0/);
  });
});
