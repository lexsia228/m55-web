import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildIndividualizationDraftSnapshotV1 } from '../individualization/buildIndividualizationV1';
import { buildFreeFiveViewCompositionV1 } from './buildFreeFiveViewCompositionV1';

function freeSet(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    'free.start_style': 'free.start_style.map_first',
    'free.decision_style': 'free.decision_style.sort_first',
    'free.recovery_style': 'free.recovery_style.pause_short',
    'free.distance_style': 'free.distance_style.close_careful',
    'free.change_style': 'free.change_style.observe_first',
    'free.primary_theme': 'free.primary_theme.work',
    ...overrides,
  };
}

const BASE = {
  birthDate: '1990-01-15',
  stemLaneIndex: 1,
};

describe('buildFreeFiveViewCompositionV1 — CATEGORY-2-M55-FREE-PERSONAL-RESULT', () => {
  it('same DOB + same answers → same five-view output', () => {
    const a = buildFreeFiveViewCompositionV1({ ...BASE, freeAnswerSet: freeSet() });
    const b = buildFreeFiveViewCompositionV1({ ...BASE, freeAnswerSet: freeSet() });
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.deepEqual(a.value, b.value);
    assert.equal(a.value.meta.fingerprintSpecVersion, 'fp-v1');
    assert.equal(a.value.meta.selectorVersion, 'selectors-v1');
    assert.equal(a.value.meta.fieldNamingVersion, 'gmfn-v2');
  });

  it('same DOB + changed start answer → start view changes', () => {
    const base = buildFreeFiveViewCompositionV1({ ...BASE, freeAnswerSet: freeSet() });
    const changed = buildFreeFiveViewCompositionV1({
      ...BASE,
      freeAnswerSet: freeSet({ 'free.start_style': 'free.start_style.try_first' }),
    });
    assert.equal(base.ok && changed.ok, true);
    if (!base.ok || !changed.ok) return;
    assert.notDeepEqual(base.value.views[0], changed.value.views[0]);
    assert.equal(base.value.views[0]!.axisId, 'start');
  });

  it('same DOB + changed decision answer → decision view changes', () => {
    const base = buildFreeFiveViewCompositionV1({ ...BASE, freeAnswerSet: freeSet() });
    const changed = buildFreeFiveViewCompositionV1({
      ...BASE,
      freeAnswerSet: freeSet({
        'free.decision_style': 'free.decision_style.wait_first',
      }),
    });
    assert.equal(base.ok && changed.ok, true);
    if (!base.ok || !changed.ok) return;
    assert.notDeepEqual(base.value.views[1], changed.value.views[1]);
  });

  it('same DOB + changed recovery answer → recovery view changes', () => {
    const base = buildFreeFiveViewCompositionV1({ ...BASE, freeAnswerSet: freeSet() });
    const changed = buildFreeFiveViewCompositionV1({
      ...BASE,
      freeAnswerSet: freeSet({
        'free.recovery_style': 'free.recovery_style.shrink_task',
      }),
    });
    assert.equal(base.ok && changed.ok, true);
    if (!base.ok || !changed.ok) return;
    assert.notDeepEqual(base.value.views[2], changed.value.views[2]);
  });

  it('same DOB + changed distance answer → distance view changes', () => {
    const base = buildFreeFiveViewCompositionV1({ ...BASE, freeAnswerSet: freeSet() });
    const changed = buildFreeFiveViewCompositionV1({
      ...BASE,
      freeAnswerSet: freeSet({
        'free.distance_style': 'free.distance_style.solo_reset',
      }),
    });
    assert.equal(base.ok && changed.ok, true);
    if (!base.ok || !changed.ok) return;
    assert.notDeepEqual(base.value.views[3], changed.value.views[3]);
  });

  it('same DOB + changed change answer → change view changes', () => {
    const base = buildFreeFiveViewCompositionV1({ ...BASE, freeAnswerSet: freeSet() });
    const changed = buildFreeFiveViewCompositionV1({
      ...BASE,
      freeAnswerSet: freeSet({
        'free.change_style': 'free.change_style.rebuild_slow',
      }),
    });
    assert.equal(base.ok && changed.ok, true);
    if (!base.ok || !changed.ok) return;
    assert.notDeepEqual(base.value.views[4], changed.value.views[4]);
  });

  it('same DOB + changed primary theme → focus changes, five views unchanged', () => {
    const base = buildFreeFiveViewCompositionV1({ ...BASE, freeAnswerSet: freeSet() });
    const changed = buildFreeFiveViewCompositionV1({
      ...BASE,
      freeAnswerSet: freeSet({
        'free.primary_theme': 'free.primary_theme.fatigue',
      }),
    });
    assert.equal(base.ok && changed.ok, true);
    if (!base.ok || !changed.ok) return;
    assert.deepEqual(base.value.views, changed.value.views);
    assert.equal(base.value.synthesis.alignSummaryJa, changed.value.synthesis.alignSummaryJa);
    assert.equal(base.value.synthesis.divergeSummaryJa, changed.value.synthesis.divergeSummaryJa);
    assert.equal(
      base.value.synthesis.currentExpressionSummaryJa,
      changed.value.synthesis.currentExpressionSummaryJa,
    );
    assert.notEqual(
      base.value.synthesis.focusThemeLabelJa,
      changed.value.synthesis.focusThemeLabelJa,
    );
    assert.notEqual(
      base.value.synthesis.smallActionJa,
      changed.value.synthesis.smallActionJa,
    );
  });

  it('same DOB + changed start answer → current expression changes, focus unchanged', () => {
    const base = buildFreeFiveViewCompositionV1({ ...BASE, freeAnswerSet: freeSet() });
    const changed = buildFreeFiveViewCompositionV1({
      ...BASE,
      freeAnswerSet: freeSet({ 'free.start_style': 'free.start_style.try_first' }),
    });
    assert.equal(base.ok && changed.ok, true);
    if (!base.ok || !changed.ok) return;
    assert.notEqual(
      base.value.synthesis.currentExpressionSummaryJa,
      changed.value.synthesis.currentExpressionSummaryJa,
    );
    assert.equal(
      base.value.synthesis.focusThemeLabelJa,
      changed.value.synthesis.focusThemeLabelJa,
    );
  });

  it('current expression is not a focus theme label', () => {
    const r = buildFreeFiveViewCompositionV1({ ...BASE, freeAnswerSet: freeSet() });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.doesNotMatch(r.value.synthesis.currentExpressionSummaryJa, /仕事・進め方|人との関係/);
    assert.match(r.value.synthesis.currentExpressionSummaryJa, /状態です。$/);
    assert.equal(r.value.synthesis.focusThemeLabelJa, '仕事や物事の進め方');
  });

  it('no empty view and public titles are five views', () => {
    const r = buildFreeFiveViewCompositionV1({ ...BASE, freeAnswerSet: freeSet() });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.views.length, 5);
    for (const view of r.value.views) {
      assert.ok(view.titleJa.length > 0);
      assert.ok(view.tendencyLabelJa.length > 0);
      assert.ok(view.bodyJa.length > 0);
      assert.ok(view.noteJa.length > 0);
    }
    assert.deepEqual(
      r.value.views.map((v) => v.titleJa),
      ['始め方', '決め方', '回復の仕方', '距離の取り方', '変化への向き合い方'],
    );
  });

  it('no internal selector ID, raw answer ID, or raw DOB in user output', () => {
    const r = buildFreeFiveViewCompositionV1({
      birthDate: '1992-07-15',
      stemLaneIndex: 3,
      freeAnswerSet: freeSet(),
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const publicText = [
      ...r.value.views.flatMap((v) => [
        v.titleJa,
        v.tendencyLabelJa,
        v.bodyJa,
        v.noteJa,
      ]),
      r.value.theme.primaryLabelJa,
      r.value.theme.secondaryLabelJa,
      r.value.synthesis.alignSummaryJa,
      r.value.synthesis.divergeSummaryJa,
      r.value.synthesis.currentExpressionSummaryJa,
      r.value.synthesis.focusThemeLabelJa,
      r.value.synthesis.focusThemeHelperJa,
      r.value.synthesis.primaryThemeJa,
      r.value.synthesis.smallActionJa,
    ].join('\n');
    assert.equal(publicText.includes('free.'), false);
    assert.equal(publicText.includes('strain__'), false);
    assert.equal(publicText.includes('1992-07-15'), false);
    assert.equal(publicText.includes('診断'), false);
    assert.equal(publicText.includes('予測'), false);
    assert.equal(publicText.includes('スコア'), false);
  });

  it('invalid answer fails closed without partial composition', () => {
    const r = buildFreeFiveViewCompositionV1({
      ...BASE,
      freeAnswerSet: freeSet({
        'free.start_style': 'free.start_style.not_real',
      }),
    });
    assert.equal(r.ok, false);
  });

  it('engine draft for same inputs remains selectors-v1 / gmfn-v2', () => {
    const freeAnswerSet = freeSet();
    const draft = buildIndividualizationDraftSnapshotV1({
      birthDate: BASE.birthDate,
      stemLaneIndex: BASE.stemLaneIndex,
      freeAnswerSet,
      paidAnswerSet: null,
      engineVersion: 'free-result-v1',
      catalogVersion: 'free-result-v1',
      reportLogicVersion: 'free-result-v1',
      generatedAt: '1970-01-01T00:00:00.000Z',
      templateBlockIds: ['free-five-view'],
    });
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    assert.equal(draft.value.fingerprint.fingerprintSpecVersion, 'fp-v1');
    assert.ok(draft.value.fingerprint.selectors);
    assert.equal(draft.value.fingerprint.selectors!.version, 'selectors-v1');
    assert.equal(draft.value.audit.sourceVersions.selectorVersion, 'selectors-v1');
    assert.equal(draft.value.audit.sourceVersions.fieldNamingVersion, 'gmfn-v2');

    const composition = buildFreeFiveViewCompositionV1({
      ...BASE,
      freeAnswerSet,
    });
    assert.equal(composition.ok, true);
    if (!composition.ok) return;
    assert.equal(composition.value.meta.selectorVersion, 'selectors-v1');
    assert.equal(composition.value.meta.fieldNamingVersion, 'gmfn-v2');
  });
});
