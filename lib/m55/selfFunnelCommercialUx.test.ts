/**
 * Competitor-informed Self free→Premium commercial UX guards.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { STATIC_FREE_TO_PAID_BRIDGE } from '../../components/core/corePublicCopy';
import { PLAN_COMPARISON } from './commercialUx/planComparison';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';
import { M55_COMMERCIAL_TERMINOLOGY as T } from './commercialUx/terminology';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('Self funnel commercial UX redesign', () => {
  it('free-result lead: no exact DOB; dynamic outcome is H1; type is secondary', () => {
    const lead = read('components/core/CoreFreeResultLeadSection.tsx');
    const essence = read('components/core/CoreEssencePanel.tsx');
    assert.match(essence, /CoreFreeResultLeadSection/);
    assert.doesNotMatch(
      essence.slice(essence.indexOf('shouldShowHero')),
      /CoreHeroSection/,
    );
    assert.match(lead, /freeResultLeadTitle/);
    assert.match(lead, /outcomeJa/);
    assert.match(lead, /typeLabelJa/);
    assert.match(lead, /supportingTraitJa/);
    assert.match(lead, /この読みは、生年月日から見える基調と、今回の回答の重なりから組み立てています/);
    assert.doesNotMatch(lead, /生年月日 \$\{/);
    assert.doesNotMatch(lead, /formatRecordDateLabelJa|obsMeta|本質の見取り図/);
    assert.doesNotMatch(lead, /\d{4}年\d{1,2}月\d{1,2}日/);
  });

  it('outcome, scene, share, then single Premium bridge with locked headings', () => {
    const essence = read('components/core/CoreEssencePanel.tsx');
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    const slice = essence.slice(essence.indexOf('shouldShowResultSections(uxPhase) && composition'));
    const leadIdx = essence.indexOf('<CoreFreeResultLeadSection');
    const summaryIdx = slice.indexOf('<CoreFreeResultSummaryHub');
    const sceneIdx = slice.indexOf('<CoreFreeResultScenesSection');
    const shareIdx = slice.indexOf('<CoreFreeResultShareCTA');
    const bridgeIdx = slice.indexOf('<CoreEntryReportCTASection');
    assert.ok(
      leadIdx >= 0 &&
        summaryIdx >= 0 &&
        sceneIdx > summaryIdx &&
        shareIdx > sceneIdx &&
        bridgeIdx > shareIdx,
    );
    assert.match(bridge, /premiumLockedHeadingsJa/);
    assert.doesNotMatch(bridge, /conversionBridgePlanGrid/);
    const ctaIdx = bridge.indexOf('m55-paid-bridge-primary');
    const lockedIdx = bridge.indexOf('m55-premium-locked-headings');
    assert.ok(lockedIdx >= 0 && ctaIdx > lockedIdx);
  });

  it('Light/Full plan facts live in shared PLAN_COMPARISON model', () => {
    assert.equal(PLAN_COMPARISON.light.priceJpy, 1000);
    assert.equal(PLAN_COMPARISON.full.priceJpy, 1480);
    assert.equal(PLAN_COMPARISON.light.audienceJa, '一番気になるテーマを、まず1つ深めたい方へ');
    assert.match(PLAN_COMPARISON.full.audienceJa, /複数/);
    assert.match(PLAN_COMPARISON.light.includedItemsJa[1]!, /1件/);
    assert.match(PLAN_COMPARISON.full.includedItemsJa[1]!, /5件/);
  });

  it('CTA copy, /dtr/lp destination, no checkout request', () => {
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, T.premiumBridgeCta);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.ctaSupportJa, /正解はありません/);
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref, '/dtr/lp');
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    assert.match(bridge, /m55-paid-questionnaire/);
    assert.doesNotMatch(bridge, /PurchaseButton|\/api\/purchase/);
    assert.doesNotMatch(bridge, /checkoutStarted|checkout_started/);
  });

  it('six-question layer starts directly without duplicate sales intro', () => {
    const q = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    assert.doesNotMatch(q, /phase === 'entry'/);
    assert.doesNotMatch(q, /力が出やすい条件/);
    assert.match(q, /\$\{index \+ 1\} \/ \$\{total\}/);
    assert.match(q, /ctaSupportJa|正解はありません/);
    assert.doesNotMatch(q, /PurchaseButton|\/api\/purchase/);
  });

  it('privacy-safe commercial copy without unsupported claims', () => {
    const marketing = [
      STATIC_FREE_TO_PAID_BRIDGE.supportingJa,
      STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa,
      STATIC_FREE_TO_PAID_BRIDGE.ctaSupportJa,
      STATIC_FREE_TO_PAID_BRIDGE.safetyNote,
    ].join('\n');
    assert.doesNotMatch(
      marketing,
      /今だけ|残りわずか|人気No|おすすめ度|カウントダウン|期間限定|科学的|精度|万人|保証(?!では)/,
    );
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.safetyNote, /診断、未来や結果の保証ではありません/);
    const lead = read('components/core/CoreFreeResultLeadSection.tsx');
    assert.doesNotMatch(lead, /今日の一歩/);
    const summary = read('components/core/CoreFreeResultSummaryHub.tsx');
    assert.doesNotMatch(summary, /今日の一歩/);
  });

  it('value hierarchy lead is concrete premium reason', () => {
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.supportingJa, /その動きが続く背景/);
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.effortJa, 'あと6問・約1〜2分');
  });
});
