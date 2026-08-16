/**
 * Misread customer-copy realizer — bounded regression for seen/actual phrasing.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPersonalManualV1 } from '../narrative/personalManualV1';
import { buildPersonalFreeFusedInsightSpecV3 } from './personalFreeFusedInsightSpecV3';
import { buildAlignDivergeItemsV1 } from '../individualization/alignDivergeV1';
import { resolveCanonicalBirthProfileV2 } from '../individualization/canonicalBirthProfileV2';
import { resolveFreeAxes } from './buildFreeFiveViewCompositionV1';
import {
  assertCustomerCopyJa,
  customerCopyFragmentViolations,
} from './humanizeFreeResultWhyV1';

const PRODUCTION_A = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.deadline_first',
  'free.recovery_style': 'free.recovery_style.shrink_task',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
};

const PRODUCTION_B = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.wait_first',
  'free.recovery_style': 'free.recovery_style.change_scene',
  'free.distance_style': 'free.distance_style.solo_reset',
  'free.change_style': 'free.change_style.rebuild_slow',
  'free.primary_theme': 'free.primary_theme.report_preview',
};

function misreadFor(dob: string, answerSet: Record<string, string>) {
  const canonical = resolveCanonicalBirthProfileV2({ birthDate: dob });
  const free = resolveFreeAxes(answerSet);
  assert.equal(canonical.ok && free.ok, true);
  if (!canonical.ok || !free.ok) throw new Error('fixture resolution failed');
  const align = buildAlignDivergeItemsV1({
    dobAxes: canonical.value.birthSignature.dimensions,
    freeAxes: free.value.axes,
    freeAnswerSet: answerSet,
  });
  assert.equal(align.ok, true);
  if (!align.ok) throw new Error('align failed');
  const fused = buildPersonalFreeFusedInsightSpecV3({
    birth: canonical.value.birthSignature,
    answers: free.value.axes,
    alignItems: align.value.alignItems,
    divergeItems: align.value.divergeItems,
    modifiers: {
      stemLane: canonical.value.stemLane,
      lunarMonth: canonical.value.lunarMonth,
      season3: canonical.value.season3,
      dayBand: canonical.value.dayBand,
      tensionIds: canonical.value.tensionIds,
    },
  });
  const manual = buildPersonalManualV1({
    axes: free.value.axes,
    fused,
    completeness: 'short',
  });
  const misread = manual.slots.find((slot) => slot.id === 'misread');
  assert.ok(misread);
  if (!misread) throw new Error('misread slot missing');
  return misread.bodyJa;
}

describe('personal free misread realizer', () => {
  it('forbids double internal wrappers in misread actual phrasing', () => {
    const samples = [
      misreadFor('1983-02-28', PRODUCTION_A),
      misreadFor('1992-08-20', PRODUCTION_B),
    ];
    for (const bodyJa of samples) {
      assert.doesNotMatch(bodyJa, /本人の中では内側では/);
      assert.doesNotMatch(bodyJa, /本人の中では本人の中では/);
      assert.equal(customerCopyFragmentViolations(bodyJa).length, 0);
      assertCustomerCopyJa(bodyJa);
    }
  });

  it('requires completed seen role phrase without しているよう fragment', () => {
    const a = misreadFor('1983-02-28', PRODUCTION_A);
    const b = misreadFor('1992-08-20', PRODUCTION_B);
    assert.doesNotMatch(a, /「[^」]*しているよう」に見えやすい/);
    assert.match(a, /「一人で段取りを整えている人」に見えやすい/);
    assert.match(b, /「準備している人」に見えやすい/);
  });

  it('nominalizes desire clauses before が先に立つ', () => {
    const a = misreadFor('1983-02-28', PRODUCTION_A);
    const b = misreadFor('1992-08-20', PRODUCTION_B);
    assert.doesNotMatch(a, /したいが先に立つ/);
    assert.match(a, /材料を足したい気持ちが先に立つ/);
    assert.doesNotMatch(b, /したいが先に立つ/);
    assert.match(b, /「まだ早い」が長く残る/);
  });
});
