/**
 * Local synthetic personalization-resolution audit.
 * No Production/DB/Stripe/PII. Deterministic seed.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { buildBirthSignatureV1 } from '../../lib/m55/individualization/birthSignatureV1';
import { buildFreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import { pickManifestationAxes } from '../../lib/m55/freeResult/personalFreeManifestationV4';
import { resolveFreeAxes } from '../../lib/m55/freeResult/buildFreeFiveViewCompositionV1';
import { essenceStemLaneIndex } from '../../lib/m55/essenceEngine';
import { CALENDAR_RANGE_END, CALENDAR_RANGE_START } from '../../lib/m55/compositeStem/constants';
import { runM55CompositeStemPipeline } from '../../lib/m55/compositeStem/pipeline';
import { buildPairFreeInsightSpecV2 } from '../../lib/m55/compatibility/pairFreeInsightSpecV2';
import {
  derivePairAxisId,
  derivePairDifferenceType,
} from '../../lib/m55/compatibility/pairReadingFingerprint';
import { buildPaidCompatibilityReportV1 } from '../../lib/m55/compatibility/buildPaidCompatibilityReportV1';
import type { CompatibilityCurrentContextAnswers } from '../../lib/m55/compatibility/currentContextContract.v1';
import {
  S1_IDENTITY_BY_BAND,
  S2_COMPOSITION_BY_BAND,
  S2_STEM_WORK_SCENE,
  S4_LIFE_BY_LUNAR_MONTH,
  S4_RECOVERY_BY_BAND,
  S5_FRICTION_BY_BAND,
  S6_LIFE_RELATION_BY_LUNAR_MONTH,
  S6_RELATION_BY_BAND,
  S7_AUXILIARY_BY_BAND,
  SEASON_ESSENCE_CONTEXT,
  type CivilDayBand,
  type SeasonGroup,
} from '../../lib/m55/paidDobCivilRhythm';

const SEED = 0x4d3535;
const STARTS = ['try_first', 'map_first', 'ask_first'] as const;
const DECISIONS = ['sort_first', 'deadline_first', 'wait_first'] as const;
const RECOVERIES = ['pause_short', 'shrink_task', 'change_scene'] as const;
const DISTANCES = ['middle_steady', 'close_careful', 'solo_reset'] as const;
const CHANGES = ['adjust_fast', 'observe_first', 'rebuild_slow'] as const;
const PACE = ['decide_now', 'decide_later', 'decide_varies'] as const;
const DISAGREE = ['talk_now', 'take_space', 'one_carries'] as const;
const PDIST = ['explain_space', 'go_quiet', 'space_is_hard'] as const;
const EXPR = ['words_soon', 'words_later', 'words_vary'] as const;
const RET = ['someone_reaches', 'time_restores', 'return_is_hard'] as const;
const FOCUS = [
  'distance_focus',
  'conversation_focus',
  'loop_focus',
  'return_focus',
  'next_step_focus',
] as const;

function sha(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function isValidDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function iso(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function* eachValidDate(from: string, to: string): Generator<string> {
  const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = to.split('-').map(Number) as [number, number, number];
  const cur = new Date(Date.UTC(fy, fm - 1, fd));
  const end = new Date(Date.UTC(ty, tm - 1, td));
  while (cur.getTime() <= end.getTime()) {
    yield iso(cur.getUTCFullYear(), cur.getUTCMonth() + 1, cur.getUTCDate());
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
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
    disagreement: DISAGREE[Math.floor(i / 3) % 3]!,
    distance: PDIST[Math.floor(i / 9) % 3]!,
    expressionPace: EXPR[Math.floor(i / 27) % 3]!,
    returnPattern: RET[Math.floor(i / 81) % 3]!,
    focus: FOCUS[Math.floor(i / 243) % 5]!,
  };
}

function entropy(counts: number[]): number {
  const n = counts.reduce((a, b) => a + b, 0);
  if (n === 0) return 0;
  return counts.reduce((acc, c) => {
    if (c === 0) return acc;
    const p = c / n;
    return acc - p * Math.log2(p);
  }, 0);
}

function topN(map: Map<string, number>, n: number) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  if (s.length === 0) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function paidPremiumFingerprint(args: {
  stem: number;
  band: CivilDayBand;
  season: SeasonGroup;
  lunarMonth: number;
}): string {
  const blob = [
    `stem:${args.stem}`,
    S1_IDENTITY_BY_BAND[args.band],
    S2_STEM_WORK_SCENE[args.stem],
    S2_COMPOSITION_BY_BAND[args.band],
    SEASON_ESSENCE_CONTEXT[args.season],
    S4_LIFE_BY_LUNAR_MONTH[args.lunarMonth],
    S4_RECOVERY_BY_BAND[args.band],
    S5_FRICTION_BY_BAND[args.band],
    S6_LIFE_RELATION_BY_LUNAR_MONTH[args.lunarMonth],
    S6_RELATION_BY_BAND[args.band],
    S7_AUXILIARY_BY_BAND[args.band],
  ].join('\n');
  return sha(blob);
}

function seasonFromMonth(month: number): SeasonGroup {
  if (month <= 2 || month === 12) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

const report: Record<string, unknown> = {
  schema: 'm55_personalization_resolution_audit_v1',
  generatedFrom: 'd7512c0',
  calendarContract: { start: CALENDAR_RANGE_START, end: CALENDAR_RANGE_END },
};

let validDates = 0;
const signatureCounts = new Map<string, number>();
const vectorCounts = new Map<string, number>();
const civilCoreCounts = new Map<string, number>();
const dayBandCounts = new Map<string, number>();
const season3Counts = new Map<string, number>();
const stemModCounts = new Map<string, number>();
const yearChangeSameMd = 0;
void yearChangeSameMd;
const monthDayCollisions = new Map<string, string[]>();

for (const date of eachValidDate(CALENDAR_RANGE_START, CALENDAR_RANGE_END)) {
  validDates += 1;
  const y = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const md = date.slice(5);
  if (y === 1900) {
    const prev = monthDayCollisions.get(md) ?? [];
    prev.push(date);
    monthDayCollisions.set(md, prev);
  }
  for (let stem = 0; stem <= 9; stem += 1) {
    const sig = buildBirthSignatureV1({ birthDate: date, stemLaneIndex: stem });
    if (!sig.ok) continue;
    const id = sig.value.birthSignatureId;
    signatureCounts.set(id, (signatureCounts.get(id) ?? 0) + 1);
    const vec = [
      sig.value.dimensions.start,
      sig.value.dimensions.decision,
      sig.value.dimensions.recovery,
      sig.value.dimensions.distance,
      sig.value.dimensions.change,
    ].join('|');
    vectorCounts.set(vec, (vectorCounts.get(vec) ?? 0) + 1);
    const civil = `${sig.value.contextModifiers.dayBand}|${sig.value.contextModifiers.season3}`;
    civilCoreCounts.set(civil, (civilCoreCounts.get(civil) ?? 0) + 1);
    dayBandCounts.set(sig.value.contextModifiers.dayBand, (dayBandCounts.get(sig.value.contextModifiers.dayBand) ?? 0) + 1);
    season3Counts.set(String(sig.value.contextModifiers.season3), (season3Counts.get(String(sig.value.contextModifiers.season3)) ?? 0) + 1);
    stemModCounts.set(String(stem % 3), (stemModCounts.get(String(stem % 3)) ?? 0) + 1);
  }
}

const derivedSig = new Map<string, number>();
for (const date of eachValidDate(CALENDAR_RANGE_START, CALENDAR_RANGE_END)) {
  const stem = essenceStemLaneIndex(date);
  const sig = buildBirthSignatureV1({ birthDate: date, stemLaneIndex: stem });
  if (!sig.ok) continue;
  derivedSig.set(sig.value.birthSignatureId, (derivedSig.get(sig.value.birthSignatureId) ?? 0) + 1);
}

const yearPairs = [
  ['1983-02-28', '1993-02-28'],
  ['1990-05-14', '2000-05-14'],
  ['1975-12-31', '2015-12-31'],
];
const yearInsensitive = yearPairs.map(([a, b]) => {
  const sa = buildBirthSignatureV1({ birthDate: a!, stemLaneIndex: 1 });
  const sb = buildBirthSignatureV1({ birthDate: b!, stemLaneIndex: 1 });
  return {
    a,
    b,
    same: sa.ok && sb.ok && sa.value.birthSignatureId === sb.value.birthSignatureId,
  };
});

const compositeSample: Array<{ date: string; composite: number; essence: number; match: boolean }> = [];
for (let y = 1900; y <= 2100; y += 10) {
  for (let m = 1; m <= 12; m += 1) {
    const date = iso(y, m, 15);
    if (!isValidDate(y, m, 15)) continue;
    try {
      const composite = runM55CompositeStemPipeline({
        birthDate: date,
        birthTimeUnknown: true,
        locale: 'ja-JP',
        nickname: 'audit',
        contextScope: 'essence',
        country: 'JP',
      }).stemLaneIndex;
      const essence = essenceStemLaneIndex(date);
      compositeSample.push({ date, composite, essence, match: composite === essence });
    } catch {
      /* out of lunar table — record skip */
    }
  }
}

const sigSizes = [...signatureCounts.values()];
report.dobCardinality = {
  validCivilDatesInContractRange: validDates,
  independentStemLanes: 10,
  dobTimesStemInputsEvaluated: validDates * 10,
  uniqueBirthSignatureIds: signatureCounts.size,
  uniqueCustomerRelevantDobVectors: vectorCounts.size,
  uniqueCivilCoresDayBandTimesSeason3: civilCoreCounts.size,
  dayBandCardinality: dayBandCounts.size,
  season3Cardinality: season3Counts.size,
  stemLaneRawCardinality: 10,
  stemLaneEffectiveForDistance: 3,
  signatureBucket: {
    min: Math.min(...sigSizes),
    max: Math.max(...sigSizes),
    median: median(sigSizes),
    entropyBits: entropy(sigSizes),
    top10: topN(signatureCounts, 10),
  },
  derivedEssenceStemUniqueSignatures: derivedSig.size,
  derivedEssenceTop10: topN(derivedSig, 10),
  yearSensitivitySameMonthDaySameStem: yearInsensitive,
  yearUsedInBirthSignatureAxes: false,
  monthUsedAs: 'season3 = (month-1)%3 only',
  dayUsedAs: 'dayBand early<=10 mid<=20 late',
  informationLoss: [
    'year validated then discarded before axes',
    'month quantized to season3 (4 months collapse)',
    'day quantized to 3 bands',
    'stemLane 10 → mod3 for distance; change determined by stem+dayBandIndex',
    'dobFp hashes full date+stem but is not used by manifestation selection',
    'BirthSignature.tensions computed but unused by Free opening compose',
  ],
  compositeStemVsEssenceSample: {
    n: compositeSample.length,
    matchRate:
      compositeSample.length === 0
        ? null
        : compositeSample.filter((row) => row.match).length / compositeSample.length,
  },
};

const gridOpenings = new Map<string, number>();
const gridPatterns = new Map<string, number>();
const sigList = [...signatureCounts.keys()];
let gridN = 0;
const representativeBySig = new Map<string, { date: string; stem: number }>();
for (const date of ['1983-02-28', '1990-05-14', '1992-08-20', '1955-03-01', '1968-08-15', '1977-11-22', '2001-09-30', '2010-01-05', '1948-06-18']) {
  for (let stem = 0; stem <= 9; stem += 1) {
    const sig = buildBirthSignatureV1({ birthDate: date, stemLaneIndex: stem });
    if (!sig.ok) continue;
    if (!representativeBySig.has(sig.value.birthSignatureId)) {
      representativeBySig.set(sig.value.birthSignatureId, { date, stem });
    }
  }
}

for (const [id, loc] of representativeBySig) {
  for (let a = 0; a < 243; a += 1) {
    const built = buildFreeDepthAnalysisV1({
      birthDate: loc.date,
      stemLaneIndex: loc.stem,
      freeAnswerSet: answersAt(a),
    });
    if (!built.ok) continue;
    gridN += 1;
    const opening = built.value.headlineJa;
    gridOpenings.set(opening, (gridOpenings.get(opening) ?? 0) + 1);
    gridPatterns.set(built.value.manifestationJa.slice(0, 40), (gridPatterns.get(built.value.manifestationJa.slice(0, 40)) ?? 0) + 1);
    void id;
  }
}

report.fullGrid27x243 = {
  n: gridN,
  uniqueOpenings: gridOpenings.size,
  uniqueOpeningCollisionMax: Math.max(...gridOpenings.values()),
  topRepeatedOpenings: topN(gridOpenings, 10).map(([text, n]) => ({ n, preview: text.slice(0, 80) })),
};

const rng = mulberry32(SEED);
const dates: string[] = [];
for (const d of eachValidDate('1948-01-01', '2008-12-31')) dates.push(d);
const cohort = Array.from({ length: 1000 }, (_, i) => {
  const date = dates[Math.floor(rng() * dates.length)]!;
  const stem = essenceStemLaneIndex(date);
  const ansI = i % 243;
  return { i, date, stem, answers: answersAt(ansI), ansI };
});

const personalRows = cohort.map((u) => {
  const sig = buildBirthSignatureV1({ birthDate: u.date, stemLaneIndex: u.stem });
  const built = buildFreeDepthAnalysisV1({
    birthDate: u.date,
    stemLaneIndex: u.stem,
    freeAnswerSet: u.answers,
  });
  const axes = sig.ok ? sig.value.dimensions : null;
  const free = resolveFreeAxes(u.answers);
  const pattern = axes && free.ok ? pickManifestationAxes(axes, free.value.axes).join('+') : 'fail';
  return {
    i: u.i,
    date: u.date,
    stem: u.stem,
    ansI: u.ansI,
    sig: sig.ok ? sig.value.birthSignatureId : 'fail',
    opening: built.ok ? built.value.headlineJa : 'fail',
    first: built.ok ? built.value.headlineJa.split('。')[0]! : 'fail',
    pattern,
    premium: built.ok ? built.value.premiumOpenLoopJa : 'fail',
    inputKey: `${sig.ok ? sig.value.birthSignatureId : 'x'}|${u.ansI}`,
  };
});

function collisionAmongDistinct<T extends { inputKey: string }>(
  rows: T[],
  field: keyof T,
) {
  const byOut = new Map<string, Set<string>>();
  for (const row of rows) {
    const out = String(row[field]);
    const set = byOut.get(out) ?? new Set();
    set.add(row.inputKey);
    byOut.set(out, set);
  }
  const colliding = [...byOut.entries()].filter(([, set]) => set.size > 1);
  const distinctInputs = new Set(rows.map((r) => r.inputKey)).size;
  const collidingInputs = colliding.reduce((n, [, set]) => n + set.size, 0);
  return {
    distinctOutputs: byOut.size,
    distinctInputs,
    clustersWithMultipleDistinctInputs: colliding.length,
    largestClusterDistinctInputs: colliding.length ? Math.max(...colliding.map(([, set]) => set.size)) : 1,
    collidingDistinctInputShare: distinctInputs === 0 ? 0 : collidingInputs / distinctInputs,
    worst: colliding
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 20)
      .map(([out, set]) => ({ distinctInputs: set.size, preview: out.slice(0, 100) })),
  };
}

let dobMatTrials = 0;
let dobMatHits = 0;
let ansMatTrials = 0;
let ansMatHits = 0;
let detTrials = 0;
let detHits = 0;
for (let t = 0; t < 200; t += 1) {
  const answers = answersAt(t % 243);
  const a = cohort[t]!;
  const b = cohort[(t + 37) % 1000]!;
  const sa = buildBirthSignatureV1({ birthDate: a.date, stemLaneIndex: a.stem });
  const sb = buildBirthSignatureV1({ birthDate: b.date, stemLaneIndex: b.stem });
  if (sa.ok && sb.ok && sa.value.birthSignatureId !== sb.value.birthSignatureId) {
    dobMatTrials += 1;
    const ha = buildFreeDepthAnalysisV1({ birthDate: a.date, stemLaneIndex: a.stem, freeAnswerSet: answers });
    const hb = buildFreeDepthAnalysisV1({ birthDate: b.date, stemLaneIndex: b.stem, freeAnswerSet: answers });
    if (ha.ok && hb.ok && ha.value.headlineJa !== hb.value.headlineJa) dobMatHits += 1;
  }
  const date = a.date;
  const stem = a.stem;
  const aa = answersAt(t % 243);
  const ab = answersAt((t + 17) % 243);
  if (JSON.stringify(aa) !== JSON.stringify(ab)) {
    ansMatTrials += 1;
    const ha = buildFreeDepthAnalysisV1({ birthDate: date, stemLaneIndex: stem, freeAnswerSet: aa });
    const hb = buildFreeDepthAnalysisV1({ birthDate: date, stemLaneIndex: stem, freeAnswerSet: ab });
    if (ha.ok && hb.ok && ha.value.headlineJa !== hb.value.headlineJa) ansMatHits += 1;
  }
  detTrials += 1;
  const h1 = buildFreeDepthAnalysisV1({ birthDate: date, stemLaneIndex: stem, freeAnswerSet: aa });
  const h2 = buildFreeDepthAnalysisV1({ birthDate: date, stemLaneIndex: stem, freeAnswerSet: aa });
  if (h1.ok && h2.ok && h1.value.headlineJa === h2.value.headlineJa) detHits += 1;
}

const firstSentence = collisionAmongDistinct(personalRows, 'first');
const openingCol = collisionAmongDistinct(personalRows, 'opening');
const patternCol = collisionAmongDistinct(personalRows, 'pattern');
const premiumCol = collisionAmongDistinct(personalRows, 'premium');

report.personal1000 = {
  n: personalRows.length,
  uniqueDobSignatures: new Set(personalRows.map((r) => r.sig)).size,
  uniqueAnswerPatterns: new Set(personalRows.map((r) => r.ansI)).size,
  uniqueOpenings: new Set(personalRows.map((r) => r.opening)).size,
  uniqueFirstSentences: new Set(personalRows.map((r) => r.first)).size,
  uniquePatterns: new Set(personalRows.map((r) => r.pattern)).size,
  uniquePremiumBridges: new Set(personalRows.map((r) => r.premium)).size,
  openingCollisionDistinctInputs: openingCol,
  firstSentenceCollisionDistinctInputs: firstSentence,
  patternCollision: patternCol,
  premiumCollision: premiumCol,
  materiality: {
    dobTrialsWhereSignatureDiffers: dobMatTrials,
    dobHeadlineChangeRate: dobMatTrials ? dobMatHits / dobMatTrials : null,
    answerTrials: ansMatTrials,
    answerHeadlineChangeRate: ansMatTrials ? ansMatHits / ansMatTrials : null,
    deterministicRate: detTrials ? detHits / detTrials : null,
  },
};

const pairCohort = Array.from({ length: 1000 }, (_, i) => {
  const a = dates[Math.floor(rng() * dates.length)]!;
  let b = dates[Math.floor(rng() * dates.length)]!;
  if (i % 17 === 0) b = a;
  if (i % 29 === 0) {
    const [y, m, d] = a.split('-').map(Number);
    const dt = new Date(Date.UTC(y!, m! - 1, d! + 1));
    b = iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  return {
    i,
    a,
    b,
    answers: pairAnswersAt(i),
  };
});

const pairRows = pairCohort.map((p) => {
  const spec = buildPairFreeInsightSpecV2({
    answers: p.answers,
    pairAxisId: derivePairAxisId(p.a, p.b),
    personABirthDate: p.a,
    personBBirthDate: p.b,
    personAUsesFirstPerspective: true,
    focusLabel: '会話の進め方',
  });
  const swapped = buildPairFreeInsightSpecV2({
    answers: p.answers,
    pairAxisId: derivePairAxisId(p.a, p.b),
    personABirthDate: p.a,
    personBBirthDate: p.b,
    personAUsesFirstPerspective: false,
    focusLabel: '会話の進め方',
  });
  const axis = derivePairAxisId(p.a, p.b);
  const diff = derivePairDifferenceType(p.a, p.b, axis);
  const paid = buildPaidCompatibilityReportV1({
    pairAxisId: axis,
    paidTopicId: 'T2',
    relationStatusId: 'R3',
    temperatureId: 'E0',
    personAUsesFirstPerspective: true,
    currentContext: p.answers,
  });
  const paidBlob = paid.chapters.map((ch) => `${ch.scene}|${ch.relationshipLoop.join('|')}|${ch.usablePhrase}`).join('\n');
  const sceneSet = new Set(paid.chapters.map((ch) => ch.scene));
  return {
    i: p.i,
    inputKey: `${p.a}|${p.b}|${JSON.stringify(p.answers)}`,
    paidSeenKey: `${axis}|${JSON.stringify(p.answers)}`,
    birthPair: `${spec.manifestationPatternId}|${diff}`,
    interaction: spec.interactionId,
    loop: spec.betweenThem,
    reset: spec.reset,
    swapOk: spec.misreadLoop.includes('あなた') && swapped.misreadLoop.includes('相手') && spec.misreadLoop !== swapped.misreadLoop,
    paidFp: sha(paidBlob),
    paidSceneCount: sceneSet.size,
    paidRecurring: paid.recurringLoop,
  };
});

let pairDobTrials = 0;
let pairDobHits = 0;
for (let t = 0; t < 200; t += 1) {
  const answers = pairAnswersAt(t);
  const a1 = '1983-02-28';
  const b1 = '1997-06-15';
  const a2 = '1990-01-05';
  const b2 = '1990-01-06';
  const s1 = buildPairFreeInsightSpecV2({
    answers,
    pairAxisId: 'A2',
    personABirthDate: a1,
    personBBirthDate: b1,
    personAUsesFirstPerspective: true,
    focusLabel: '会話の進め方',
  });
  const s2 = buildPairFreeInsightSpecV2({
    answers,
    pairAxisId: 'A2',
    personABirthDate: a2,
    personBBirthDate: b2,
    personAUsesFirstPerspective: true,
    focusLabel: '会話の進め方',
  });
  const d1 = derivePairDifferenceType(a1, b1, derivePairAxisId(a1, b1));
  const d2 = derivePairDifferenceType(a2, b2, derivePairAxisId(a2, b2));
  if (d1 !== d2 || s1.manifestationPatternId !== s2.manifestationPatternId) {
    pairDobTrials += 1;
    if (s1.betweenThem !== s2.betweenThem) pairDobHits += 1;
  }
}

report.pair1000 = {
  n: pairRows.length,
  uniqueRawPairInputs: new Set(pairRows.map((r) => r.inputKey)).size,
  uniquePaidSeenInputs: new Set(pairRows.map((r) => r.paidSeenKey)).size,
  uniqueBirthPairPatterns: new Set(pairRows.map((r) => r.birthPair)).size,
  uniqueInteractions: new Set(pairRows.map((r) => r.interaction)).size,
  uniqueLoops: new Set(pairRows.map((r) => r.loop)).size,
  uniqueResets: new Set(pairRows.map((r) => r.reset)).size,
  swapCorrectRate: pairRows.filter((r) => r.swapOk).length / pairRows.length,
  loopCollision: collisionAmongDistinct(pairRows, 'loop'),
  paidFingerprintCollisionAmongRawPairInputs: collisionAmongDistinct(pairRows, 'paidFp'),
  paidFingerprintCollisionAmongPaidSeenInputs: collisionAmongDistinct(
    pairRows.map((r) => ({ ...r, inputKey: r.paidSeenKey })),
    'paidFp',
  ),
  paidUniqueRecurringLoops: new Set(pairRows.map((r) => r.paidRecurring)).size,
  paidChapterSceneDiversityMean:
    pairRows.reduce((n, r) => n + r.paidSceneCount, 0) / pairRows.length,
  pairDobMaterialityWhereSignatureDiffers: {
    trials: pairDobTrials,
    rate: pairDobTrials ? pairDobHits / pairDobTrials : null,
  },
};

const premiumCatalog = new Set<string>();
for (let stem = 0; stem < 10; stem += 1) {
  for (const band of ['early', 'mid', 'late'] as const) {
    for (const season of ['winter', 'spring', 'summer', 'autumn'] as const) {
      for (let lunar = 0; lunar < 12; lunar += 1) {
        premiumCatalog.add(paidPremiumFingerprint({ stem, band, season, lunarMonth: lunar }));
      }
    }
  }
}

report.personalPremiumCatalog = {
  theoreticalStemTimesBandTimesSeasonTimesLunarMonth: 10 * 3 * 4 * 12,
  uniqueConcatenatedChapterFingerprints: premiumCatalog.size,
  note: 'Paid DTR v2.1 concatenates stem/band/season/lunar catalogs. Free fusion does not use lunar/solar-term/year.',
};

report.compatibilityPaidArchitecture = {
  reportInputIncludesRawDob: false,
  dobCollapsedTo: 'pairAxisId (4) + differenceType unused in paid builder + currentContext',
  chapterFocusTableStatic: true,
  sixScenesAreStaticFocusPlusContextSuffix: true,
};

report.questionnaireCardinality = {
  personalFreeFiveQuestions: 5,
  optionsPerQuestion: 3,
  personalAnswerVectors: 243,
  personalThemePostPurchase: 5,
  pairBodyAnswers: 3 ** 5,
  pairFocus: 5,
  pairCurrentContextContractCount: 1215,
};

console.log(JSON.stringify(report, null, 2));
writeFileSync(
  'docs/audit/M55_PERSONALIZATION_RESOLUTION_AUDIT_v1.json',
  JSON.stringify(report, null, 2),
);
writeFileSync(
  'docs/audit/M55_PERSONALIZATION_RESOLUTION_AUDIT_metrics.json',
  JSON.stringify(
    {
      uniqueBirthSignatureIds: signatureCounts.size,
      validDates,
      personal1000: report.personal1000,
      pair1000: report.pair1000,
    },
    null,
    2,
  ),
);
