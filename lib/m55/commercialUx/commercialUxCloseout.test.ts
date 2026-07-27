/**
 * High-quality commercial UX / print closeout guards — PR #81.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  TRAIT_IDENTITY_CATALOG,
  assertTraitIdentityCatalogComplete,
  resolveTraitIdentity,
} from './traitIdentityCatalog';
import { buildPrivacySafeShareCardV1 } from '../freeResult/privacySafeShareCardV1';
import { M55_COMMERCIAL_TERMINOLOGY as T } from './terminology';
import { MOBILE_MENU_PUBLIC, DESKTOP_PRIMARY_NAV } from './publicHeaderState';

const ROOT = join(import.meta.dirname, '../../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('commercial UX closeout — sticky CTA overlap contract', () => {
  it('sticky CTA uses fixed dock, page padding reserve, and hides near bridge/footer', () => {
    const sticky = read('components/core/CorePremiumStickyCta.tsx');
    const css = read('components/core/CoreExperience.module.css');
    assert.match(sticky, /IntersectionObserver/);
    assert.match(sticky, /data-m55-sticky-cta/);
    assert.match(sticky, /core-paid/);
    assert.match(css, /--m55-sticky-cta-height/);
    assert.match(css, /data-m55-sticky-cta='1'/);
    assert.match(css, /\.premiumStickyBar\s*\{[^}]*position:\s*fixed/s);
  });

  it('floating scroll control reserves rail and hides in print', () => {
    const scroll = read('components/common/ScrollToTopButton.tsx');
    const css = read('components/common/ScrollToTopButton.module.css');
    assert.match(scroll, /data-m55-print-hide/);
    assert.match(css, /--m55-float-rail-offset/);
    assert.match(css, /@media print/);
  });
});

describe('commercial UX closeout — header contract', () => {
  it('desktop primary nav and mobile menu match required destinations', () => {
    assert.deepEqual(
      DESKTOP_PRIMARY_NAV.map((i) => i.label),
      [T.freeEntry, T.premiumProduct],
    );
    assert.equal(MOBILE_MENU_PUBLIC[0]!.label, T.home);
    assert.equal(MOBILE_MENU_PUBLIC[3]!.label, T.aboutM55);
    assert.equal(MOBILE_MENU_PUBLIC[4]!.label, T.tenQualities);
  });

  it('PublicHeader does not read storage and uses 960px breakpoint', () => {
    const header = read('components/shell/PublicHeader.tsx');
    const css = read('components/shell/ShellLayout.module.css');
    assert.doesNotMatch(header, /localStorage|sessionStorage|readSelfFunnelStage/);
    assert.match(css, /min-width: 960px/);
    assert.match(css, /max-width: 959px/);
  });
});

describe('commercial UX closeout — all-ten trait semantic parity', () => {
  it('catalog complete and share recognition distinct from tagline', () => {
    assertTraitIdentityCatalogComplete();
    assert.equal(TRAIT_IDENTITY_CATALOG.length, 10);
    for (const trait of TRAIT_IDENTITY_CATALOG) {
      const card = buildPrivacySafeShareCardV1({ stemLaneIndex: trait.stemLaneIndex })!;
      assert.equal(card.traitNameJa, trait.traitName);
      assert.equal(card.traitPhraseJa, trait.canonicalTagline);
      assert.equal(card.safeStatementJa, trait.shareStatement);
      assert.notEqual(card.traitPhraseJa, card.safeStatementJa);
      assert.match(trait.premiumContinuityTemplate, /4章で深く読む/);
    }
  });

  it('クリエイター and アナリスト identities are coherent', () => {
    const creator = resolveTraitIdentity(3)!;
    assert.equal(creator.traitName, 'クリエイター');
    assert.match(creator.canonicalTagline, /材料を集め/);
    assert.match(creator.shareStatement, /材料と候補|形が見え/);
    assert.doesNotMatch(creator.canonicalTagline, /少しずつ良く/);
    assert.doesNotMatch(creator.shareStatement, /少しずつ良く/);

    const analyst = resolveTraitIdentity(9)!;
    assert.equal(analyst.traitName, 'アナリスト');
    assert.match(analyst.canonicalTagline, /全体を見渡し/);
    assert.match(analyst.shareStatement, /全体と選択肢/);
  });
});

describe('commercial UX closeout — questionnaire progress simplification', () => {
  it('card progress drops duplicate stage label and bottom 完了 ack', () => {
    const progress = read('components/core/CoreFreeContinuousFlowProgress.tsx');
    const q = read('components/core/CoreFreeQuestionnaireLayer.tsx');
    const stepper = read('components/core/CoreFreeJourneyStepper.tsx');
    assert.match(stepper, /5つの問い/);
    assert.doesNotMatch(progress, /inQuestionnaire \? '5つの問い'/);
    assert.match(progress, /あと\$\{questionRemaining\}問/);
    assert.doesNotMatch(q, /完了/);
    assert.match(q, /CoreFreeContinuousFlowProgress/);
  });
});

describe('commercial UX closeout — print A4 contract', () => {
  it('defines @page A4 and removes blank-page / mobile-column sources', () => {
    const css = read('lib/m55/commercialUx/publicPrint.css');
    assert.match(css, /@page/);
    assert.match(css, /size:\s*A4/);
    assert.match(css, /min-height:\s*0/);
    assert.match(css, /m55-scroll-to-top/);
    assert.match(css, /freeQuestionnaireActions/);
    assert.match(css, /premiumStickyBar/);
    assert.match(css, /max-width:\s*none/);
  });
});

describe('commercial UX closeout — Japanese pattern copy', () => {
  it('uses 周囲の視点を集めてから動く', () => {
    const depth = read('lib/m55/freeResult/buildFreeDepthAnalysisV1.ts');
    assert.match(depth, /情報や周囲の視点を集めてから動く/);
    assert.doesNotMatch(depth, /情報や他者の視点を足してから動く/);
  });
});
