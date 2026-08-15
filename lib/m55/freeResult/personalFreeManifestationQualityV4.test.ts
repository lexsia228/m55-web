import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildBirthSignatureV1 } from '../individualization/birthSignatureV1';
import { buildAlignDivergeItemsV1 } from '../individualization/alignDivergeV1';
import { resolveFreeAxes } from './buildFreeFiveViewCompositionV1';
import { buildFreeDepthAnalysisV1 } from './buildFreeDepthAnalysisV1';
import { buildPersonalFreeFusedInsightSpecV3 } from './personalFreeFusedInsightSpecV3';
import { lintPersonalPrimaryCopy } from './personalFreeManifestationV4';
import { buildPrivacySafeShareCardV1 } from './privacySafeShareCardV1';
import { FREE_FIVE_QUESTIONS_COPY_V1 } from './questionnaireCopyV1';

function answers(partial: Record<string, string> = {}): Record<string, string> {
  return {
    'free.start_style': 'free.start_style.try_first',
    'free.decision_style': 'free.decision_style.sort_first',
    'free.recovery_style': 'free.recovery_style.pause_short',
    'free.distance_style': 'free.distance_style.middle_steady',
    'free.change_style': 'free.change_style.adjust_fast',
    'free.primary_theme': 'free.primary_theme.report_preview',
    ...partial,
  };
}

const PATTERN_A = answers();
const PATTERN_B = answers({
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.deadline_first',
  'free.recovery_style': 'free.recovery_style.shrink_task',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
});
const PATTERN_C = answers({
  'free.start_style': 'free.start_style.ask_first',
  'free.decision_style': 'free.decision_style.wait_first',
  'free.recovery_style': 'free.recovery_style.change_scene',
  'free.distance_style': 'free.distance_style.solo_reset',
  'free.change_style': 'free.change_style.rebuild_slow',
});
const PATTERN_D = answers({
  'free.start_style': 'free.start_style.ask_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.adjust_fast',
  'free.primary_theme': 'free.primary_theme.relation',
});
const PATTERN_E = answers({
  'free.start_style': 'free.start_style.try_first',
  'free.decision_style': 'free.decision_style.wait_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.solo_reset',
  'free.change_style': 'free.change_style.observe_first',
});

const DOB_X = { birthDate: '1983-02-28', stemLaneIndex: 9 };
const DOB_Y = { birthDate: '1990-05-14', stemLaneIndex: 1 };
const DOB_Z = { birthDate: '1992-08-20', stemLaneIndex: 3 };

const PERSONAL_FIXTURES = [
  { id: 'P1', ...DOB_X, freeAnswerSet: PATTERN_A },
  { id: 'P2', ...DOB_Y, freeAnswerSet: PATTERN_A },
  { id: 'P3', ...DOB_X, freeAnswerSet: PATTERN_B },
  { id: 'P4', ...DOB_Y, freeAnswerSet: PATTERN_D },
  { id: 'P5', ...DOB_Z, freeAnswerSet: PATTERN_C },
] as const;

const BARNUM = [
  '実は繊細',
  '周囲に気を遣う',
  '自分の時間も必要',
  '安定と変化の両方',
  '考えすぎることがある',
  '人との距離を大事にする',
  '内側では複雑',
  '本当は優しい',
];

function fusedSpec(birthDate: string, stemLaneIndex: number, freeAnswerSet: Record<string, string>) {
  const birth = buildBirthSignatureV1({ birthDate, stemLaneIndex });
  const free = resolveFreeAxes(freeAnswerSet);
  assert.equal(birth.ok && free.ok, true);
  if (!birth.ok || !free.ok) throw new Error('fixture failed');
  const align = buildAlignDivergeItemsV1({
    dobAxes: birth.value.dimensions,
    freeAxes: free.value.axes,
    freeAnswerSet,
  });
  assert.equal(align.ok, true);
  if (!align.ok) throw new Error('align failed');
  return buildPersonalFreeFusedInsightSpecV3({
    birth: birth.value,
    answers: free.value.axes,
    alignItems: align.value.alignItems,
    divergeItems: align.value.divergeItems,
  });
}

describe('personal free manifestation quality v4', () => {
  it('manifestation is deterministic for the same birth × answers', () => {
    const a = fusedSpec(DOB_Y.birthDate, DOB_Y.stemLaneIndex, PATTERN_A);
    const b = fusedSpec(DOB_Y.birthDate, DOB_Y.stemLaneIndex, PATTERN_A);
    assert.equal(a.manifestation.patternId, b.manifestation.patternId);
    assert.equal(a.headline, b.headline);
  });

  it('same answers and different DOB change observable behavior when signatures differ', () => {
    const x = buildFreeDepthAnalysisV1({ ...DOB_X, freeAnswerSet: PATTERN_A });
    const y = buildFreeDepthAnalysisV1({ ...DOB_Y, freeAnswerSet: PATTERN_A });
    assert.equal(x.ok && y.ok, true);
    if (!x.ok || !y.ok) return;
    assert.notEqual(x.value.headlineJa, y.value.headlineJa);
    assert.notEqual(x.value.manifestationJa, y.value.manifestationJa);
  });

  it('same DOB and different answers change manifestation', () => {
    const a = fusedSpec(DOB_Z.birthDate, DOB_Z.stemLaneIndex, PATTERN_A);
    const b = fusedSpec(DOB_Z.birthDate, DOB_Z.stemLaneIndex, PATTERN_E);
    assert.notEqual(a.manifestation.patternId, b.manifestation.patternId);
    assert.notEqual(a.headline, b.headline);
  });

  it('primary insight rejects abstract model language, Barnum, and teaching openings', () => {
    const openings = PERSONAL_FIXTURES.map((fixture) => {
      const built = buildFreeDepthAnalysisV1(fixture);
      assert.equal(built.ok, true, fixture.id);
      if (!built.ok) throw new Error(fixture.id);
      return built.value.headlineJa;
    });
    assert.equal(new Set(openings).size, PERSONAL_FIXTURES.length);
    for (const opening of openings) {
      assert.deepEqual(lintPersonalPrimaryCopy(opening), []);
      for (const phrase of BARNUM) {
        assert.equal(opening.includes(phrase), false, phrase);
      }
      assert.equal(opening.startsWith('土台では'), false);
      assert.match(opening, /見られ|一人|あと|帰宅|相談/);
    }
  });

  it('records why the hit cannot come from DOB only or answers only', () => {
    const spec = fusedSpec(DOB_X.birthDate, DOB_X.stemLaneIndex, PATTERN_A);
    assert.equal(spec.manifestation.userDidNotDirectlyAnswerThis, true);
    assert.match(spec.manifestation.cannotComeFromDobOnlyJa, /同じ生年月日でも/);
    assert.match(spec.manifestation.cannotComeFromAnswersOnlyJa, /同じ答えでも/);
    assert.ok(spec.birthEvidenceIds.length > 0);
    assert.ok(spec.answerEvidenceQuestionIds.length >= 2);
  });

  it('keeps private DOB provenance and share DOB-free', () => {
    const built = buildFreeDepthAnalysisV1({ ...DOB_X, freeAnswerSet: PATTERN_A });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.match(built.value.trustCueJa, /生年月日/);
    assert.match(built.value.birthBaseJa, /生年月日の土台/);
    assert.doesNotMatch(built.value.headlineJa, /\d{4}-\d{2}-\d{2}/);
    assert.doesNotMatch(built.value.trustCueJa, /\d{4}-\d{2}-\d{2}/);
    const share = buildPrivacySafeShareCardV1({ stemLaneIndex: 9 });
    assert.ok(share);
    assert.doesNotMatch(share.safeStatementJa, /生年月日|\d{4}-\d{2}-\d{2}/);
  });

  it('does not paste questionnaire labels into the opening', () => {
    const labels = FREE_FIVE_QUESTIONS_COPY_V1.flatMap((q) => q.choices.map((c) => c.labelJa));
    const opening = fusedSpec(DOB_Y.birthDate, DOB_Y.stemLaneIndex, PATTERN_D).headline;
    let hits = 0;
    for (const label of labels) {
      if (label.length >= 4 && opening.includes(label)) hits += 1;
    }
    assert.equal(hits, 0);
  });
});
