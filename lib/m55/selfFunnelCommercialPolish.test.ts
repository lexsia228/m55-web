/**
 * Commercial polish regressions — DOB once, /core entry, concise result, Premium bridge.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { buildFreeDepthAnalysisV1 } from './freeResult/buildFreeDepthAnalysisV1';
import { resolveInitialUxPhase } from './freeResult/coreFreeRevealUxState';
import { FREE_QUESTION_FLOW_TOTAL } from './freeResult/segmentedDobInputV1';
import { STATIC_FREE_TO_PAID_BRIDGE } from '../../components/core/corePublicCopy';
import { PLAN_COMPARISON } from './commercialUx/planComparison';
import { M55_COMMERCIAL_TERMINOLOGY as T } from './commercialUx/terminology';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const SAMPLE_ANSWERS = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
};

describe('Self funnel commercial polish REV1', () => {
  it('skips INTRO when profile is already complete from Home modal', () => {
    assert.equal(resolveInitialUxPhase(true), 'QUESTIONNAIRE');
    assert.equal(resolveInitialUxPhase(false), 'INTRO');
    const panel = read('components/core/CoreEssencePanel.tsx');
    assert.match(panel, /resolveInitialUxPhase\(true\)/);
    assert.doesNotMatch(panel, /CoreFreeIntroSection/);
    assert.match(panel, /BirthProfileIntakeLayer/);
  });

  it('direct /core offers intake without dead-end', () => {
    const locked = read('components/core/CoreLockedState.tsx');
    assert.match(locked, /T\.freeStart|無料で見てみる/);
    assert.match(locked, /m55-core-start-intake/);
    assert.match(locked, /homeLinkJa|ホームへ戻る/);
    assert.match(locked, /onStartIntake/);
    const panel = read('components/core/CoreEssencePanel.tsx');
    assert.match(panel, /onStartIntake=\{\(\) => setIntakeOpen\(true\)\}/);
    assert.match(panel, /m55-core-birth-intake-layer/);
  });

  it('questionnaire shows 1/5 progress without duplicate DOB step', () => {
    assert.equal(FREE_QUESTION_FLOW_TOTAL, 5);
    const q = read('components/core/CoreFreeQuestionnaireLayer.tsx');
    assert.match(q, /questionIndex=\{index\}/);
    assert.doesNotMatch(q, /FREE_FIVE_QUESTION_COUNT} 完了/);
    assert.match(q, /基本情報を変更/);
    assert.match(q, /onRequestProfileEdit/);
    assert.doesNotMatch(q, /onRequestDobChange/);
    assert.doesNotMatch(q, /FREE_CONTINUOUS_FLOW_TOTAL} 完了/);
  });

  it('concise free result avoids duplicate summary blocks', () => {
    const summary = read('components/core/CoreFreeResultSummaryHub.tsx');
    assert.match(summary, /conciseWhyJa/);
    assert.doesNotMatch(summary, /今回の結論/);
    assert.doesNotMatch(summary, /そう読める3つの理由/);
    assert.doesNotMatch(summary, /力が出やすい条件/);
    const scenes = read('components/core/CoreFreeResultScenesSection.tsx');
    assert.match(scenes, /primarySceneJa/);
    assert.doesNotMatch(scenes, /無料で読める範囲/);
  });

  it('Premium bridge CTA is early with personalized locked headings only', () => {
    assert.equal(STATIC_FREE_TO_PAID_BRIDGE.primaryCtaJa, T.premiumBridgeCta);
    assert.match(STATIC_FREE_TO_PAID_BRIDGE.supportingJa, /あと6問|整え直し/);
    const bridge = read('components/core/CoreFreeToPaidConversionBridge.tsx');
    const primaryIdx = bridge.indexOf('m55-paid-bridge-primary');
    const planIdx = bridge.indexOf('conversionBridgePlanGrid');
    assert.ok(primaryIdx >= 0);
    assert.equal(planIdx, -1);
    assert.match(bridge, /premiumLockedHeadingsJa/);
  });

  it('depth builder produces concise fields and locked headings deterministically', () => {
    const built = buildFreeDepthAnalysisV1({
      birthDate: '1990-12-19',
      stemLaneIndex: 3,
      freeAnswerSet: SAMPLE_ANSWERS,
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.value.conciseWhyJa.length, 3);
    assert.ok(built.value.primarySceneJa.length > 20);
    assert.equal(built.value.premiumLockedHeadingsJa.length, 4);
    const again = buildFreeDepthAnalysisV1({
      birthDate: '1990-12-19',
      stemLaneIndex: 3,
      freeAnswerSet: SAMPLE_ANSWERS,
    });
    assert.equal(again.ok, true);
    if (!again.ok) return;
    assert.deepEqual(
      again.value.premiumLockedHeadingsJa,
      built.value.premiumLockedHeadingsJa,
    );
  });

  it('Light/Full product truth unchanged in PLAN_COMPARISON', () => {
    assert.equal(PLAN_COMPARISON.light.priceJpy, 1000);
    assert.equal(PLAN_COMPARISON.full.priceJpy, 1480);
    assert.equal(PLAN_COMPARISON.full.priceJpy - PLAN_COMPARISON.light.priceJpy, 480);
    assert.match(PLAN_COMPARISON.light.includedItemsJa[1]!, /1件/);
    assert.match(PLAN_COMPARISON.full.includedItemsJa[1]!, /5件/);
  });

  it('no payment/DB/auth/provider mutations in polish scope', () => {
    const changed = [
      read('components/core/CoreFreeToPaidConversionBridge.tsx'),
      read('lib/m55/freeResult/buildFreeDepthAnalysisV1.ts'),
      read('components/dtr/DtrPaidQuestionnaireLayer.tsx'),
    ].join('\n');
    assert.doesNotMatch(changed, /supabase|stripe|process\.env|migration/i);
    assert.doesNotMatch(changed, /PurchaseButton|\/api\/purchase/);
  });
});
