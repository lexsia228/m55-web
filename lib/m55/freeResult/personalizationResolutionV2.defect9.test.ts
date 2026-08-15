import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveCanonicalBirthProfileV2 } from '../individualization/canonicalBirthProfileV2';
import { buildFreeDepthAnalysisV1 } from './buildFreeDepthAnalysisV1';
import { buildPersonalFreeFusedInsightSpecV3 } from './personalFreeFusedInsightSpecV3';
import { personalCompleteReadingSemanticFingerprintV2 } from './personalCompleteReadingSemanticFingerprintV2';
import { buildAlignDivergeItemsV1 } from '../individualization/alignDivergeV1';
import { resolveFreeAxes } from './buildFreeFiveViewCompositionV1';

const STARTS = ['try_first', 'map_first', 'ask_first'] as const;
const DECISIONS = ['sort_first', 'deadline_first', 'wait_first'] as const;
const RECOVERIES = ['pause_short', 'shrink_task', 'change_scene'] as const;
const DISTANCES = ['middle_steady', 'close_careful', 'solo_reset'] as const;
const CHANGES = ['adjust_fast', 'observe_first', 'rebuild_slow'] as const;

function answersAt(i: number): Record<string, string> {
  return {
    'free.start_style': `free.start_style.${STARTS[i % 3]}`,
    'free.decision_style': `free.decision_style.${DECISIONS[Math.floor(i / 3) % 3]}`,
    'free.recovery_style': `free.recovery_style.${RECOVERIES[Math.floor(i / 9) % 3]}`,
    'free.distance_style': `free.distance_style.${DISTANCES[Math.floor(i / 27) % 3]}`,
    'free.change_style': `free.change_style.${CHANGES[Math.floor(i / 81) % 3]}`,
    'free.primary_theme': 'free.primary_theme.report_preview',
  };
}

function semanticFor(birthDate: string, ansIndex: number) {
  const profile = resolveCanonicalBirthProfileV2({ birthDate });
  assert.equal(profile.ok, true, birthDate);
  if (!profile.ok) throw new Error(birthDate);
  const freeAnswerSet = answersAt(ansIndex);
  const free = resolveFreeAxes(freeAnswerSet);
  assert.equal(free.ok, true);
  if (!free.ok) throw new Error('axes');
  const align = buildAlignDivergeItemsV1({
    dobAxes: profile.value.birthSignature.dimensions,
    freeAxes: free.value.axes,
    freeAnswerSet,
  });
  assert.equal(align.ok, true);
  if (!align.ok) throw new Error('align');
  const insight = buildPersonalFreeFusedInsightSpecV3({
    birth: profile.value.birthSignature,
    answers: free.value.axes,
    alignItems: align.value.alignItems,
    divergeItems: align.value.divergeItems,
    modifiers: {
      stemLane: profile.value.stemLane,
      lunarMonth: profile.value.lunarMonth,
      season3: profile.value.season3,
      dayBand: profile.value.dayBand,
      tensionIds: profile.value.tensionIds,
    },
  });
  return personalCompleteReadingSemanticFingerprintV2({
    insight,
    modifiers: {
      stemLane: profile.value.stemLane,
      lunarMonth: profile.value.lunarMonth,
      season3: profile.value.season3,
      dayBand: profile.value.dayBand,
      tensionIds: profile.value.tensionIds,
    },
    birthAxes: profile.value.birthSignature.dimensions,
    answerAxes: free.value.axes,
  });
}

const PRIOR_DEFECT_PAIRS = [
  { a: { birthDate: '1987-01-12', ans: 16 }, b: { birthDate: '2000-01-14', ans: 17 } },
  { a: { birthDate: '1980-01-19', ans: 193 }, b: { birthDate: '2009-01-16', ans: 194 } },
  { a: { birthDate: '1952-02-11', ans: 212 }, b: { birthDate: '1983-02-18', ans: 211 } },
  { a: { birthDate: '1973-10-24', ans: 228 }, b: { birthDate: '1999-10-28', ans: 229 } },
  { a: { birthDate: '2019-09-13', ans: 183 }, b: { birthDate: '2018-09-18', ans: 184 } },
  { a: { birthDate: '1994-06-21', ans: 221 }, b: { birthDate: '1985-06-28', ans: 219 } },
  { a: { birthDate: '1973-03-19', ans: 30 }, b: { birthDate: '1978-03-13', ans: 31 } },
  { a: { birthDate: '1978-02-18', ans: 178 }, b: { birthDate: '2009-02-15', ans: 179 } },
  { a: { birthDate: '1980-08-21', ans: 177 }, b: { birthDate: '1982-08-21', ans: 178 } },
] as const;

describe('personalization resolution v2 prior information-loss defects', () => {
  it('all 9 prior defect pairs now differ in customer reading when semantics differ', () => {
    for (const pair of PRIOR_DEFECT_PAIRS) {
      const builtA = buildFreeDepthAnalysisV1({
        birthDate: pair.a.birthDate,
        freeAnswerSet: answersAt(pair.a.ans),
      });
      const builtB = buildFreeDepthAnalysisV1({
        birthDate: pair.b.birthDate,
        freeAnswerSet: answersAt(pair.b.ans),
      });
      assert.equal(builtA.ok && builtB.ok, true, `${pair.a.birthDate}/${pair.b.birthDate}`);
      if (!builtA.ok || !builtB.ok) continue;
      const semA = semanticFor(pair.a.birthDate, pair.a.ans);
      const semB = semanticFor(pair.b.birthDate, pair.b.ans);
      assert.notEqual(semA.stableKey, semB.stableKey, `semantic ${pair.a.birthDate}`);
      assert.notEqual(
        builtA.value.headlineJa,
        builtB.value.headlineJa,
        `customer ${pair.a.birthDate} vs ${pair.b.birthDate}`,
      );
      const startA = answersAt(pair.a.ans)['free.start_style'];
      const startB = answersAt(pair.b.ans)['free.start_style'];
      if (startA !== startB) {
        assert.notEqual(
          builtA.value.headlineJa,
          builtB.value.headlineJa.replace(/。/g, '。'),
        );
      }
    }
  });
});
