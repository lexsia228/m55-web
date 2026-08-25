/**
 * Post-c55e217 collision root-cause classifier.
 * Local/synthetic only. Classifies loss points A–H per collision cluster.
 */
import { resolveCanonicalBirthProfileV2 } from '../../lib/m55/individualization/canonicalBirthProfileV2';
import { buildFreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import { buildPersonalFreeFusedInsightSpecV3 } from '../../lib/m55/freeResult/personalFreeFusedInsightSpecV3';
import { personalCompleteReadingSemanticFingerprintV2 } from '../../lib/m55/freeResult/personalCompleteReadingSemanticFingerprintV2';
import { buildAlignDivergeItemsV1 } from '../../lib/m55/individualization/alignDivergeV1';
import { resolveFreeAxes } from '../../lib/m55/freeResult/buildFreeFiveViewCompositionV1';
import { buildPairFreeInsightSpecV2 } from '../../lib/m55/compatibility/pairFreeInsightSpecV2';
import { resolvePairCanonicalProfileV2 } from '../../lib/m55/compatibility/pairCanonicalProfileV2';
import { buildPaidCompatibilityReportV1 } from '../../lib/m55/compatibility/buildPaidCompatibilityReportV1';
import type { CompatibilityCurrentContextAnswers } from '../../lib/m55/compatibility/currentContextContract.v1';

const STARTS = ['try_first', 'map_first', 'ask_first'] as const;
const DECISIONS = ['sort_first', 'deadline_first', 'wait_first'] as const;
const RECOVERIES = ['pause_short', 'shrink_task', 'change_scene'] as const;
const DISTANCES = ['middle_steady', 'close_careful', 'solo_reset'] as const;
const CHANGES = ['adjust_fast', 'observe_first', 'rebuild_slow'] as const;
const PACE = ['decide_now', 'decide_later', 'decide_varies'] as const;
const DIS = ['talk_now', 'take_space', 'one_carries'] as const;
const PDIST = ['explain_space', 'go_quiet', 'space_is_hard'] as const;
const EXPR = ['words_soon', 'words_later', 'words_vary'] as const;
const RET = ['someone_reaches', 'time_restores', 'return_is_hard'] as const;

type LossPoint =
  | 'A_same_primary'
  | 'B_same_tension'
  | 'C_same_scene'
  | 'D_same_social_mirror'
  | 'E_modifier_discarded'
  | 'F_missing_cell'
  | 'G_ranking_tiebreak'
  | 'H_renderer_drop'
  | 'LEGITIMATE_SHARED';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

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

function pairAnswersAt(i: number): CompatibilityCurrentContextAnswers {
  return {
    decisionPace: PACE[i % 3]!,
    disagreement: DIS[Math.floor(i / 3) % 3]!,
    distance: PDIST[Math.floor(i / 9) % 3]!,
    expressionPace: EXPR[Math.floor(i / 27) % 3]!,
    returnPattern: RET[Math.floor(i / 81) % 3]!,
    focus: 'conversation_focus',
  };
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function classifyPersonalLoss(
  a: ReturnType<typeof rowPersonal>,
  b: ReturnType<typeof rowPersonal>,
): LossPoint {
  if (a.semantic.stableKey === b.semantic.stableKey) return 'LEGITIMATE_SHARED';
  if (a.semantic.primaryMechanismId === b.semantic.primaryMechanismId) {
    if (a.birthFp !== b.birthFp && a.semantic.birthModifierId === b.semantic.birthModifierId) {
      return 'E_modifier_discarded';
    }
    if (a.answerFp !== b.answerFp && a.semantic.answerModifierId === b.semantic.answerModifierId) {
      return 'G_ranking_tiebreak';
    }
    return 'A_same_primary';
  }
  if (a.semantic.sceneId === b.semantic.sceneId && a.lunarMonth !== b.lunarMonth) return 'C_same_scene';
  if (a.semantic.socialMirrorId === b.semantic.socialMirrorId && a.stemLane !== b.stemLane) {
    return 'D_same_social_mirror';
  }
  if (a.semantic.stableKey !== b.semantic.stableKey && a.reading === b.reading) return 'H_renderer_drop';
  return 'F_missing_cell';
}

function rowPersonal(i: number, birthDate: string) {
  const profile = resolveCanonicalBirthProfileV2({ birthDate });
  if (!profile.ok) throw new Error('profile fail');
  const freeAnswerSet = answersAt(i);
  const built = buildFreeDepthAnalysisV1({ birthDate, freeAnswerSet });
  if (!built.ok) throw new Error('build fail');
  const free = resolveFreeAxes(freeAnswerSet);
  if (!free.ok) throw new Error('axes fail');
  const alignDiv = buildAlignDivergeItemsV1({
    dobAxes: profile.value.birthSignature.dimensions,
    freeAxes: free.value.axes,
    freeAnswerSet,
  });
  if (!alignDiv.ok) throw new Error('align fail');
  const modifiers = {
    stemLane: profile.value.stemLane,
    lunarMonth: profile.value.lunarMonth,
    season3: profile.value.season3,
    dayBand: profile.value.dayBand,
    tensionIds: profile.value.tensionIds,
  };
  const insight = buildPersonalFreeFusedInsightSpecV3({
    birth: profile.value.birthSignature,
    answers: free.value.axes,
    alignItems: alignDiv.value.alignItems,
    divergeItems: alignDiv.value.divergeItems,
    modifiers,
  });
  const semantic = personalCompleteReadingSemanticFingerprintV2({
    insight,
    modifiers,
    birthAxes: profile.value.birthSignature.dimensions,
    answerAxes: free.value.axes,
  });
  return {
    effectiveKey: `${profile.value.stableFingerprint}|${i % 243}`,
    birthFp: profile.value.stableFingerprint,
    answerFp: String(i % 243),
    stemLane: profile.value.stemLane,
    lunarMonth: profile.value.lunarMonth,
    tensions: profile.value.tensionIds.join(','),
    reading: built.value.headlineJa,
    semantic,
    patternId: insight.manifestation.patternId,
  };
}

function collisionStats<T extends { effectiveKey: string; reading: string }>(
  rows: T[],
  classify?: (a: T, b: T) => LossPoint,
) {
  const byReading = new Map<string, T[]>();
  for (const row of rows) {
    const list = byReading.get(row.reading) ?? [];
    list.push(row);
    byReading.set(row.reading, list);
  }
  const clusters = [...byReading.entries()]
    .filter(([, list]) => {
      const keys = new Set(list.map((r) => r.effectiveKey));
      return keys.size > 1;
    })
    .map(([reading, list]) => ({
      size: new Set(list.map((r) => r.effectiveKey)).size,
      reading: reading.slice(0, 80),
      rows: list,
    }))
    .sort((a, b) => b.size - a.size);

  const distinctKeys = new Set(rows.map((r) => r.effectiveKey)).size;
  let colliding = 0;
  for (const c of clusters) colliding += c.size;

  const lossCounts = new Map<LossPoint, number>();
  if (classify) {
    for (const cluster of clusters) {
      const sample = cluster.rows.slice(0, 3);
      for (let i = 0; i < sample.length - 1; i += 1) {
        const point = classify(sample[i]!, sample[i + 1]!);
        lossCounts.set(point, (lossCounts.get(point) ?? 0) + 1);
      }
    }
  }

  return {
    distinctEffectiveProfiles: distinctKeys,
    uniqueReadings: byReading.size,
    collidingDistinctShare: distinctKeys ? colliding / distinctKeys : 0,
    largestCluster: clusters[0]?.size ?? 1,
    clusterCount: clusters.length,
    lossPointCounts: Object.fromEntries(lossCounts),
    worst20: clusters.slice(0, 20).map((c) => {
      const a = c.rows[0]!;
      const b = c.rows[1] ?? c.rows[0]!;
      return {
        clusterSize: c.size,
        birthDiff:
          'birthFp' in a && 'birthFp' in b
            ? a.birthFp !== b.birthFp
            : 'pairFp' in a && 'pairFp' in b
              ? a.pairFp !== b.pairFp
              : false,
        answerDiff: 'answerFp' in a && 'answerFp' in b ? a.answerFp !== b.answerFp : false,
        semanticA: 'semantic' in a ? (a as { semantic: { stableKey: string } }).semantic.stableKey : '',
        semanticB: 'semantic' in b ? (b as { semantic: { stableKey: string } }).semantic.stableKey : '',
        classification:
          classify && 'semantic' in a && 'semantic' in b ? classify(a, b) : 'unknown',
        preview: c.reading,
      };
    }),
  };
}

const rng = mulberry32(0x4d3535);
const personalRows: ReturnType<typeof rowPersonal>[] = [];
for (let i = 0; i < 1000; i += 1) {
  const y = 1950 + Math.floor(rng() * 70);
  const m = 1 + Math.floor(rng() * 12);
  const d = 1 + Math.floor(rng() * 28);
  personalRows.push(rowPersonal(i, iso(y, m, d)));
}

const personalSemantic = collisionStats(personalRows, classifyPersonalLoss);
const personalExact = collisionStats(personalRows);

const pairRng = mulberry32(0x50414952);
type PairRow = {
  effectiveKey: string;
  reading: string;
  pairFp: string;
  answerFp: string;
  interactionId: string;
  patternId: string;
};
const pairRows: PairRow[] = [];
for (let i = 0; i < 1000; i += 1) {
  const a = iso(1955 + Math.floor(pairRng() * 50), 1 + Math.floor(pairRng() * 12), 1 + Math.floor(pairRng() * 28));
  const b = iso(1955 + Math.floor(pairRng() * 50), 1 + Math.floor(pairRng() * 12), 1 + Math.floor(pairRng() * 28));
  const answers = pairAnswersAt(i);
  const spec = buildPairFreeInsightSpecV2({
    answers,
    pairAxisId: 'A2',
    personABirthDate: a,
    personBBirthDate: b,
    personAUsesFirstPerspective: true,
    focusLabel: '会話の進め方',
    relationStatusId: 'R3',
  });
  const pair = resolvePairCanonicalProfileV2({ personABirthDate: a, personBBirthDate: b });
  pairRows.push({
    effectiveKey: `${pair?.stableFingerprint ?? a}|${i % 243}`,
    reading: spec.betweenThem,
    pairFp: pair?.stableFingerprint ?? a,
    answerFp: String(i % 243),
    interactionId: spec.interactionId,
    patternId: spec.manifestationPatternId,
  });
}

const pairStats = collisionStats(pairRows);

let swapOk = 0;
for (let i = 0; i < 100; i += 1) {
  const a = buildPairFreeInsightSpecV2({
    answers: pairAnswersAt(i),
    pairAxisId: 'A2',
    personABirthDate: '1983-02-28',
    personBBirthDate: '1990-05-14',
    personAUsesFirstPerspective: true,
    focusLabel: '会話の進め方',
    relationStatusId: 'R3',
  });
  const b = buildPairFreeInsightSpecV2({
    answers: pairAnswersAt(i),
    pairAxisId: 'A2',
    personABirthDate: '1983-02-28',
    personBBirthDate: '1990-05-14',
    personAUsesFirstPerspective: false,
    focusLabel: '会話の進め方',
    relationStatusId: 'R3',
  });
  if (a.misreadLoop !== b.misreadLoop) swapOk += 1;
}

const paid = buildPaidCompatibilityReportV1({
  pairAxisId: 'A2',
  paidTopicId: 'T2',
  relationStatusId: 'R3',
  temperatureId: 'E0',
  personAUsesFirstPerspective: true,
  currentContext: pairAnswersAt(4),
  personABirthDate: '1983-02-28',
  personBBirthDate: '1990-05-14',
});
const paidSceneIds = new Set(paid.chapters.map((ch) => ch.sceneInteractionId));

console.log(
  JSON.stringify(
    {
      schema: 'm55_personalization_collision_root_cause_v2',
      head: 'c55e217',
      personal1000: {
        exact: personalExact,
        semantic: personalSemantic,
      },
      pair1000: pairStats,
      pairSwapCorrectRate: swapOk / 100,
      paidSixSceneDistinctIds: paidSceneIds.size,
      paidSceneInteractionIds: [...paidSceneIds],
    },
    null,
    2,
  ),
);
