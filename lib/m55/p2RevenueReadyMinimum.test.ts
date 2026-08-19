/**
 * P2 Revenue-Ready minimum implementation guards.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { PAID_DTR_LP } from './paidDtrProductCopy';
import { buildPlanComparisonModel } from './commercialUx/planComparison';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('P2 revenue-ready — LP continuity and canonical purchase path', () => {
  it('mounts personalized continuity without self-anchoring no-op CTA', () => {
    const lp = read('app/dtr/lp/page.tsx');
    const continuity = read('components/dtr/DtrLpPremiumContinuityIntro.tsx');
    assert.match(lp, /DtrLpPremiumContinuityIntro/);
    assert.match(lp, /DtrPaidPurchasePrep/);
    assert.match(continuity, /buildFreeDepthAnalysisV1/);
    assert.match(continuity, /premiumOpenLoopJa/);
    assert.match(continuity, /premiumLockedHeadingsJa/);
    assert.match(continuity, /resolveSelfFunnelStage/);
    assert.match(continuity, /ctaSupportJa/);
    assert.doesNotMatch(continuity, /m55-dtr-lp-continuity-cta/);
    assert.doesNotMatch(continuity, /#m55-paid-questionnaire/);
    assert.doesNotMatch(continuity, /fallback|dummy|mock|lorem/i);
  });

  it('routes purchase intent to the canonical plan decision block', () => {
    const lp = read('app/dtr/lp/page.tsx');
    assert.doesNotMatch(lp, /PurchaseButton/);
    assert.match(lp, /compareSectionId/);
    assert.match(lp, /PlanAnchorLink/);
    assert.match(lp, /m55-paid-questionnaire/);
    assert.doesNotMatch(lp, /m55-lp-tier-\$\{tierKey\}-navigate-prep/);
  });

  it('keeps canonical checkout only inside DtrPaidPurchasePrep', () => {
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(prep, /PurchaseButton/);
    assert.match(prep, /DTR_CORE_LIGHT_V1/);
    assert.match(prep, /DTR_CORE_FULL_V1/);
    assert.match(prep, /data-m55-paid-phase="checkout"/);
    assert.match(prep, /checkoutProceedCtaJa/);
  });

  it('renders factual legal links and post-purchase note near checkout prep', () => {
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(prep, /purchaseNotes\.legalLinks/);
    assert.match(prep, /m55-checkout-legal-links/);
    assert.match(prep, /checkoutFutureJa/);
    assert.match(prep, /m55-checkout-future-note/);
    assert.match(prep, /oneTimeLabelJa/);
    assert.match(prep, /CheckoutTrustRow/);
    assert.match(prep, /\/legal\/refund/);
    assert.match(prep, /\/legal\/tokushoho/);
    assert.match(prep, /purchaseDecisionLegalLinks/);

    const hrefs = PAID_DTR_LP.purchaseNotes.legalLinks.map((l) => l.href);
    assert.deepEqual(hrefs, ['/support', '/legal/refund', '/legal/tokushoho', '/legal/terms', '/legal/privacy']);
  });

  it('preserves Light/Full contract and machine prices', () => {
    const plan = buildPlanComparisonModel();
    assert.equal(plan.light.priceJpy, 1000);
    assert.equal(plan.full.priceJpy, 1480);
    assert.equal(plan.light.additionalReadings, 1);
    assert.equal(plan.full.additionalReadings, 5);
    assert.deepEqual(plan.light.includedItemsJa, ['プレミアムレポート', '追加読み解き 1件']);
    assert.match(plan.full.includedItemsJa[1]!, /合計5件/);
    assert.equal(plan.oneTimeLabelJa, '買い切り・自動更新なし');
  });

  it('preserves funnel analytics wiring on prep surfaces', () => {
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(prep, /M55_FUNNEL_EVENTS\.paidPlanView/);
    assert.match(prep, /M55_FUNNEL_EVENTS\.premiumPlanSelected/);
    assert.match(prep, /trackFunnelImpressionOnce/);
    assert.match(prep, /trackFunnelAction/);
  });

  it('scrolls checkout confirmation into view only on plans-to-checkout transition', () => {
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(prep, /checkoutShellRef/);
    assert.match(prep, /prevGateRef\.current === 'plans'/);
    assert.match(prep, /scrollIntoView\(\{ block: 'start' \}\)/);
    assert.doesNotMatch(prep, /window\.scrollTo/);
  });

  it('gives questionnaire anchor fixed-header-safe scroll margin', () => {
    const lp = read('app/dtr/lp/page.tsx');
    const css = read('app/dtr/lp/lp.module.css');
    assert.match(lp, /lpQuestionnaireAnchor/);
    assert.match(lp, /id="m55-paid-questionnaire"/);
    assert.match(css, /lpQuestionnaireAnchor[\s\S]*scroll-margin-top:\s*calc\(72px \+ env\(safe-area-inset-top, 0px\)\)/);
  });
});
