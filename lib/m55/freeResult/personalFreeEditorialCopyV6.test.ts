import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildFreeDepthAnalysisV1 } from './buildFreeDepthAnalysisV1';
import {
  buildPersonalManifestationV4,
  customerLanguageBanned,
  lintPersonalPrimaryCopy,
} from './personalFreeManifestationV4';
import { buildBirthSignatureV1 } from '../individualization/birthSignatureV1';
import { resolveFreeAxes } from './buildFreeFiveViewCompositionV1';
import { PERSONAL_V5_FIXTURES } from './personalFreeCommercialCopyV5.test';
import { PAIR_V5_FIXTURES } from '../compatibility/pairFreeCommercialCopyV5.test';
import { buildPairFreeInsightSpecV2 } from '../compatibility/pairFreeInsightSpecV2';

const STARTS = ['try_first', 'map_first', 'ask_first'] as const;
const DECISIONS = ['sort_first', 'deadline_first', 'wait_first'] as const;
const RECOVERIES = ['pause_short', 'shrink_task', 'change_scene'] as const;
const DISTANCES = ['middle_steady', 'close_careful', 'solo_reset'] as const;
const CHANGES = ['adjust_fast', 'observe_first', 'rebuild_slow'] as const;

function answers(start: string, decision: string, recovery: string, distance: string, change: string) {
  return {
    'free.start_style': `free.start_style.${start}`,
    'free.decision_style': `free.decision_style.${decision}`,
    'free.recovery_style': `free.recovery_style.${recovery}`,
    'free.distance_style': `free.distance_style.${distance}`,
    'free.change_style': `free.change_style.${change}`,
    'free.primary_theme': 'free.primary_theme.report_preview',
  };
}

describe('personal free editorial copy v6', () => {
  it('does not concatenate scene fragments across reachable start×decision overlays', () => {
    const dobs = [
      { birthDate: '1983-02-28', stemLaneIndex: 9 },
      { birthDate: '1990-05-14', stemLaneIndex: 1 },
      { birthDate: '1992-08-20', stemLaneIndex: 3 },
    ];
    for (const dob of dobs) {
      const birth = buildBirthSignatureV1(dob);
      assert.equal(birth.ok, true);
      if (!birth.ok) continue;
      for (const start of STARTS) {
        for (const decision of DECISIONS) {
          const free = resolveFreeAxes(
            answers(start, decision, 'pause_short', 'middle_steady', 'adjust_fast'),
          );
          assert.equal(free.ok, true);
          if (!free.ok) continue;
          const manifestation = buildPersonalManifestationV4(
            birth.value.dimensions,
            free.value.axes,
          );
          assert.doesNotMatch(manifestation.sceneCandidateJa, /、[^。]{0,12}、/);
          assert.doesNotMatch(manifestation.sceneCandidateJa, /とき。$/u);
          assert.match(manifestation.sceneCandidateJa, /。$/u);
          assert.equal(manifestation.manifestationJa.includes(manifestation.sceneCandidateJa), true);
          assert.deepEqual(lintPersonalPrimaryCopy(manifestation.manifestationJa), []);
        }
      }
    }
  });

  it('keeps seven Personal fixtures as authored paragraphs without invented biography', () => {
    for (const fixture of PERSONAL_V5_FIXTURES) {
      const built = buildFreeDepthAnalysisV1(fixture);
      assert.equal(built.ok, true, fixture.id);
      if (!built.ok) continue;
      const opening = built.value.headlineJa;
      const sentences = opening.split('。').filter((part) => part.trim().length > 0);
      assert.ok(sentences.length >= 3 && sentences.length <= 6, `${fixture.id}:${sentences.length}`);
      assert.deepEqual(customerLanguageBanned(opening), [], fixture.id);
      assert.doesNotMatch(opening, /仕事では武器になり、近い関係ではすれ違いになるのはどこか/);
      assert.doesNotMatch(built.value.premiumOpenLoopJa, /同じ動きを場面に分けて読み返します/);
    }
  });
});

describe('pair free editorial copy v6', () => {
  it('does not restate the same mechanic as opening plus そのため plus birth jargon', () => {
    for (const fixture of PAIR_V5_FIXTURES) {
      const spec = buildPairFreeInsightSpecV2({
        answers: fixture.answers,
        pairAxisId: 'A2',
        personABirthDate: fixture.personA,
        personBBirthDate: fixture.personB,
        personAUsesFirstPerspective: true,
        focusLabel: fixture.focus,
      });
      const blob = `${spec.betweenThem}\n${spec.misreadLoop}\n${spec.reset}\n${spec.premiumContinuation}`;
      assert.doesNotMatch(blob, /今どちらの日か|見えやすい反応|土台の差が|同じ土台でも|接点の入口|基調の寄り/);
      assert.doesNotMatch(spec.betweenThem, /あなた側は「/);
      const youWantsConclusion = /あなた側は.*結論/.test(spec.betweenThem);
      const youWantsWords = /あなた側は.*言葉を足して/.test(spec.betweenThem);
      assert.equal(youWantsConclusion && youWantsWords, false, fixture.id);
    }
  });
});
