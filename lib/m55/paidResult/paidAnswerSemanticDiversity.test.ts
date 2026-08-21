import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { DTR_CORE_LIGHT_V1 } from '../../oneTimeCheckout';
import { buildV2FulfillmentSnapshotFromFields } from '../compositeStem/buildV2FulfillmentSnapshot';
import {
  DTR_DRAWER_PREVIEW_PURCHASED_SNAPSHOT,
  getDtrDrawerPreviewReaderProps,
} from '../fixtures/dtrDrawerPreviewFixture';
import type { PaidChapterEmphasisIdV1 } from '../individualization/individualizationSelectorTypesV1';
import { buildPremiumPurchasedSemanticProjectionV1 } from '../narrative/buildPremiumPurchasedSemanticProjectionV1';
import { projectPersonalPremiumNarrativeV1 } from '../narrative/projectPersonalPremiumNarrativeV1';
import { projectPremiumPublicShareV1 } from '../narrative/projectPublicShareV1';
import { PAID_CHAPTER_EMPHASIS_COPY_V1 } from './paidChapterEmphasisCopyV1';
import { buildPurchaseInputSnapshotV1 } from './purchaseInputSnapshotV1';

const PAID_FAMILIES = {
  'paid.work_focus': [
    'paid.work_focus.priority',
    'paid.work_focus.pace',
    'paid.work_focus.boundary',
  ],
  'paid.decision_friction': [
    'paid.decision_friction.too_many',
    'paid.decision_friction.unclear_end',
    'paid.decision_friction.fear_mistake',
  ],
  'paid.relation_focus': [
    'paid.relation_focus.words',
    'paid.relation_focus.timing',
    'paid.relation_focus.recovery',
  ],
  'paid.fatigue_signal': [
    'paid.fatigue_signal.after_push',
    'paid.fatigue_signal.before_start',
    'paid.fatigue_signal.long_stretch',
  ],
  'paid.recovery_sequence': [
    'paid.recovery_sequence.pause_first',
    'paid.recovery_sequence.small_start',
    'paid.recovery_sequence.sort_materials',
  ],
  'paid.restart_condition': [
    'paid.restart_condition.overview_first',
    'paid.restart_condition.shrink_scope',
    'paid.restart_condition.trusted_support',
  ],
} as const;

type PaidFamilyId = keyof typeof PAID_FAMILIES;

const CONSEQUENCE_BY_ANSWER = {
  'paid.work_focus.priority': {
    id: 'paid_ch2__work_focus_priority',
    chapter: 2,
    copy: '同時に頼まれた日は、こなす量を増やさず、後回しにする作業を先に決める。',
  },
  'paid.work_focus.pace': {
    id: 'paid_ch2__work_focus_pace',
    chapter: 2,
    copy: '疲れがたまりやすい条件と、戻しやすいペースを生活のリズムに結びます。',
  },
  'paid.work_focus.boundary': {
    id: 'paid_ch2__work_focus_boundary',
    chapter: 2,
    copy: '始める前に「今日はここまで」と自分の言葉で決める。',
  },
  'paid.decision_friction.too_many': {
    id: 'paid_ch2__decision_friction_too_many',
    chapter: 2,
    copy: '一気に答えを出そうとすると、考えることが増え、判断がさらに重くなりやすくなります。',
  },
  'paid.decision_friction.unclear_end': {
    id: 'paid_ch2__decision_friction_unclear_end',
    chapter: 2,
    copy: '一つ進めたら、その日はそこで区切る。',
  },
  'paid.decision_friction.fear_mistake': {
    id: 'paid_ch2__decision_friction_fear_mistake',
    chapter: 2,
    copy: '失敗が気になるときは、一度で決め切ろうとせず、\n見直せる小さな確認単位に分けると、\n次の一手を選びやすくなります。',
  },
  'paid.relation_focus.words': {
    id: 'paid_ch3__relation_focus_words',
    chapter: 3,
    copy: '正しさを急ぐより、感じたことを一つ返すほうが扱いやすいです。',
  },
  'paid.relation_focus.timing': {
    id: 'paid_ch3__relation_focus_timing',
    chapter: 3,
    copy: '次に言葉が詰まったとき、結論の前に一つだけ返すところから試せます。',
  },
  'paid.relation_focus.recovery': {
    id: 'paid_ch3__relation_focus_recovery',
    chapter: 3,
    copy: '不快感を内部に溜めると、距離の戻し方が分からなくなる。',
  },
  'paid.fatigue_signal.after_push': {
    id: 'paid_ch4__fatigue_signal_after_push',
    chapter: 4,
    copy: '無理をして押し切るより、余白が戻るほど動きやすくなる形です。',
  },
  'paid.fatigue_signal.before_start': {
    id: 'paid_ch4__fatigue_signal_before_start',
    chapter: 4,
    copy: '始め方のリズムを意識すると、着手の負荷が整いやすくなります。',
  },
  'paid.fatigue_signal.long_stretch': {
    id: 'paid_ch4__fatigue_signal_long_stretch',
    chapter: 4,
    copy: '休めない続きや切り替えの多さなど、崩れやすい条件を先に見える化する。',
  },
  'paid.recovery_sequence.pause_first': {
    id: 'paid_ch4__recovery_sequence_pause_first',
    chapter: 4,
    copy: '今日決めなくていいことを一つ横に置き、休める時間を先に作ると、戻る場所が見えやすくなります。',
  },
  'paid.recovery_sequence.small_start': {
    id: 'paid_ch4__recovery_sequence_small_start',
    chapter: 4,
    copy: '小さな手ごたえが見えると、少しずつ動きを戻しやすいです。',
  },
  'paid.recovery_sequence.sort_materials': {
    id: 'paid_ch4__recovery_sequence_sort_materials',
    chapter: 4,
    copy: '迷いが出やすい場面では、比較と区切りを先に置くと戻りやすくなります。',
  },
  'paid.restart_condition.overview_first': {
    id: 'paid_ch4__restart_condition_overview_first',
    chapter: 4,
    copy: '急かされる場面や見通しの立ちにくさのなかで、論点を一本化しやすくする。',
  },
  'paid.restart_condition.shrink_scope': {
    id: 'paid_ch4__restart_condition_shrink_scope',
    chapter: 4,
    copy: '確かめたい点を一つに絞り、今日決める範囲を小さくすると判断へ戻りやすくなります。',
  },
  'paid.restart_condition.trusted_support': {
    id: 'paid_ch4__restart_condition_trusted_support',
    chapter: 4,
    copy: '回復の仕方と、つながり方のバランスを一緒に見ます。',
  },
} as const satisfies Readonly<
  Record<
    (typeof PAID_FAMILIES)[PaidFamilyId][number],
    { id: PaidChapterEmphasisIdV1; chapter: 2 | 3 | 4; copy: string }
  >
>;

const FREE_VALUES = {
  'free.start_style': [
    'free.start_style.map_first',
    'free.start_style.try_first',
    'free.start_style.ask_first',
  ],
  'free.decision_style': [
    'free.decision_style.sort_first',
    'free.decision_style.deadline_first',
    'free.decision_style.wait_first',
  ],
  'free.recovery_style': [
    'free.recovery_style.pause_short',
    'free.recovery_style.shrink_task',
    'free.recovery_style.change_scene',
  ],
  'free.distance_style': [
    'free.distance_style.close_careful',
    'free.distance_style.middle_steady',
    'free.distance_style.solo_reset',
  ],
  'free.change_style': [
    'free.change_style.observe_first',
    'free.change_style.adjust_fast',
    'free.change_style.rebuild_slow',
  ],
  'free.primary_theme': [
    'free.primary_theme.work',
    'free.primary_theme.relation',
    'free.primary_theme.fatigue',
    'free.primary_theme.tendency',
    'free.primary_theme.report_preview',
  ],
} as const;

type Foundation = {
  id: string;
  nickname: string;
  birthDate: string;
  birthTime?: string | null;
  birthTimeUnknown?: boolean;
  birthplace?: string | null;
  timezone?: string | null;
  freeAnswerSet: Record<string, string>;
};

type SemanticCase = {
  chapters: readonly [string, string, string, string];
  selectors: Readonly<{
    chapter1: readonly PaidChapterEmphasisIdV1[];
    chapter2: readonly PaidChapterEmphasisIdV1[];
    chapter3: readonly PaidChapterEmphasisIdV1[];
    chapter4: readonly PaidChapterEmphasisIdV1[];
  }>;
  projectionIds: Readonly<{
    chapter2: readonly PaidChapterEmphasisIdV1[];
    chapter3: readonly PaidChapterEmphasisIdV1[];
    chapter4: readonly PaidChapterEmphasisIdV1[];
  }>;
  publicShare: string;
  normalizedFullSemantic: string;
};

const CHAPTER_SECTION_IDS = [
  's1_identity',
  's2_composition',
  's3_essence',
  's4_strengths',
] as const;

function indexedFreeSet(index: number): Record<string, string> {
  let value = index;
  const answerSet: Record<string, string> = {};
  for (const [questionId, answers] of Object.entries(FREE_VALUES)) {
    answerSet[questionId] = answers[value % answers.length]!;
    value = Math.floor(value / answers.length);
  }
  return answerSet;
}

function baselinePaidSet(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(PAID_FAMILIES).map(([questionId, answers]) => [
      questionId,
      answers[0],
    ]),
  );
}

const PAID_CONTROL_VARIANTS: readonly Record<string, string>[] = [
  baselinePaidSet(),
  { ...baselinePaidSet(), 'paid.work_focus': PAID_FAMILIES['paid.work_focus'][1] },
  {
    ...baselinePaidSet(),
    'paid.decision_friction': PAID_FAMILIES['paid.decision_friction'][1],
  },
  {
    ...baselinePaidSet(),
    'paid.relation_focus': PAID_FAMILIES['paid.relation_focus'][1],
  },
  {
    ...baselinePaidSet(),
    'paid.fatigue_signal': PAID_FAMILIES['paid.fatigue_signal'][1],
  },
  {
    ...baselinePaidSet(),
    'paid.recovery_sequence': PAID_FAMILIES['paid.recovery_sequence'][1],
  },
  {
    ...baselinePaidSet(),
    'paid.restart_condition': PAID_FAMILIES['paid.restart_condition'][1],
  },
  Object.fromEntries(
    Object.entries(PAID_FAMILIES).map(([questionId, answers]) => [
      questionId,
      answers[2],
    ]),
  ),
];

function profileFields(foundation: Foundation) {
  return {
    nickname: foundation.nickname,
    birthDate: foundation.birthDate,
    birthTime: foundation.birthTime ?? null,
    birthTimeUnknown: foundation.birthTimeUnknown ?? true,
    country: 'JP',
    birthplace: foundation.birthplace ?? null,
    timezone: foundation.timezone ?? null,
  } as const;
}

function withoutQualityAnalyticsLogs<T>(build: () => T): T {
  const previous = console.info;
  console.info = () => undefined;
  try {
    return build();
  } finally {
    console.info = previous;
  }
}

function prepareFoundation(foundation: Foundation) {
  const base = withoutQualityAnalyticsLogs(() =>
    buildV2FulfillmentSnapshotFromFields(profileFields(foundation), {
      dobPersonalizationV2Enabled: true,
    }),
  );
  return {
    foundation,
    stemLaneIndex: base.envelope_json.auditMeta.stemLaneIndex,
  };
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeVisibleSemantic(value: unknown, foundation: Foundation): string {
  return JSON.stringify(value)
    .replaceAll(foundation.nickname, '')
    .replaceAll(foundation.birthDate, '')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSemanticCase(
  prepared: ReturnType<typeof prepareFoundation>,
  paidAnswerSet: Record<string, string>,
  createdAt = '2026-08-21T00:00:00.000Z',
  dobPersonalizationV2Enabled = true,
): SemanticCase {
  const { foundation, stemLaneIndex } = prepared;
  const purchase = buildPurchaseInputSnapshotV1({
    userId: `semantic_${foundation.id}`,
    productId: DTR_CORE_LIGHT_V1,
    profile: profileFields(foundation),
    freeAnswerSet: foundation.freeAnswerSet,
    paidAnswerSet,
    stemLaneIndex,
    createdAt,
  });
  if (!purchase.ok) {
    throw new Error(`${foundation.id}: purchase input:${purchase.code}`);
  }

  const frozenBefore = JSON.stringify(purchase.value);
  const report = withoutQualityAnalyticsLogs(() =>
    buildV2FulfillmentSnapshotFromFields(profileFields(foundation), {
      dobPersonalizationV2Enabled,
      purchaseInput: purchase.value,
    }),
  );
  assert.equal(JSON.stringify(purchase.value), frozenBefore, `${foundation.id}: frozen input mutated`);

  const chapters = CHAPTER_SECTION_IDS.map(
    (sectionId) =>
      report.envelope_json.payload.fullSections.find(
        (section) => section.id === sectionId,
      )?.body ?? '',
  ) as [string, string, string, string];
  assert.ok(chapters.every((body) => body.length > 80), `${foundation.id}: empty chapter`);

  const projection = buildPremiumPurchasedSemanticProjectionV1({
    purchaseInput: purchase.value,
    stemLaneIndex,
  });
  if (!projection.ok) {
    throw new Error(`${foundation.id}: projection:${projection.code}`);
  }

  const narrative = projectPersonalPremiumNarrativeV1({
    payload: report.envelope_json.payload,
    nickname: foundation.nickname,
    stemLaneIndex,
    projection: projection.value,
  });
  const publicShare = projectPremiumPublicShareV1({
    stemLaneIndex,
    answerAxes: projection.value.axes,
    birthAxes: projection.value.birthAxes,
    hingeAxisId: projection.value.hingeAxisId,
  });
  const normalizedFullSemantic = normalizeVisibleSemantic(
    {
      chapters,
      opening: narrative.openingHit.text,
      birthFoundation: narrative.birthFoundation?.text ?? '',
      fusedDiscovery: narrative.fusedDiscovery?.text ?? '',
      context: narrative.contextSections.map((section) => section.text),
      strengthFriction: narrative.strengthFriction
        ? [
            narrative.strengthFriction.strengthJa,
            narrative.strengthFriction.frictionJa,
          ]
        : [],
      manualTitle: narrative.manualSpec.titleJa,
      manualSlots: narrative.manualSpec.slots.map((slot) => [
        slot.labelJa,
        slot.bodyJa,
      ]),
      hiddenSpec: narrative.manualSpec.hiddenSpecJa,
      actions: narrative.actions.map((action) => action.text),
      takeaway: narrative.takeaway?.text ?? '',
    },
    foundation,
  );

  const selectors = purchase.value.individualization.fingerprint.selectors;
  assert.ok(selectors, `${foundation.id}: selectors`);
  return {
    chapters,
    selectors: selectors!.paidChapterEmphasisIds,
    projectionIds: projection.value.paidSemanticConsequenceIds,
    publicShare: JSON.stringify(publicShare),
    normalizedFullSemantic,
  };
}

function broadFoundation(index: number): Foundation {
  const year = 1950 + (index % 65);
  const month = Math.floor(index / 65) % 12 + 1;
  const day = Math.floor(index / (65 * 12)) + 1;
  return {
    id: `broad-${index}`,
    nickname: `Broad${index}`,
    birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    freeAnswerSet: indexedFreeSet(index),
  };
}

function paidControlFoundation(index: number): Foundation {
  const year = 1920 + index;
  const month = (index * 5) % 12 + 1;
  const day = (index * 7) % 27 + 1;
  return {
    id: `paid-control-${index}`,
    nickname: `Control${index}`,
    birthDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    freeAnswerSet: indexedFreeSet(800 + index * 17),
  };
}

function isAnswerSpecificPaidId(id: PaidChapterEmphasisIdV1): boolean {
  return Object.values(CONSEQUENCE_BY_ANSWER).some((row) => row.id === id);
}

type CollisionDiagnosticRecord = Readonly<{
  cohort: 'broad' | 'paid-control';
  sampleIndex: number;
  foundationId: string;
  paidControlGroup: number | null;
  paidVariantId: string;
  paidVariantIndex: number;
  semanticInputFingerprint: string;
  paidAnswerSet: Readonly<Record<string, string>>;
  selectedPaidSemanticConsequenceIds: SemanticCase['projectionIds'];
  normalizedChapterIIHash: string;
  normalizedChapterIIIHash: string;
  normalizedChapterIVHash: string;
  normalizedFullSemanticReportHash: string;
}>;

function collisionDiagnosticRecord(input: {
  cohort: CollisionDiagnosticRecord['cohort'];
  sampleIndex: number;
  foundation: Foundation;
  paidControlGroup: number | null;
  paidVariantIndex: number;
  paidAnswerSet: Record<string, string>;
  result: SemanticCase;
}): CollisionDiagnosticRecord {
  const {
    cohort,
    sampleIndex,
    foundation,
    paidControlGroup,
    paidVariantIndex,
    paidAnswerSet,
    result,
  } = input;
  return {
    cohort,
    sampleIndex,
    foundationId: foundation.id,
    paidControlGroup,
    paidVariantId: `${cohort}-variant-${paidVariantIndex}`,
    paidVariantIndex,
    semanticInputFingerprint: sha256(
      JSON.stringify({
        profile: profileFields(foundation),
        freeAnswerSet: foundation.freeAnswerSet,
        paidAnswerSet,
      }),
    ),
    paidAnswerSet,
    selectedPaidSemanticConsequenceIds: result.projectionIds,
    normalizedChapterIIHash: sha256(result.chapters[1]),
    normalizedChapterIIIHash: sha256(result.chapters[2]),
    normalizedChapterIVHash: sha256(result.chapters[3]),
    normalizedFullSemanticReportHash: sha256(result.normalizedFullSemantic),
  };
}

function recordDistinctSemanticOutput(
  recordsBySemanticHash: Map<string, CollisionDiagnosticRecord>,
  record: CollisionDiagnosticRecord,
): void {
  const prior = recordsBySemanticHash.get(record.normalizedFullSemanticReportHash);
  if (prior !== undefined) {
    assert.fail(JSON.stringify({ collision: { sideA: prior, sideB: record } }, null, 2));
  }
  recordsBySemanticHash.set(record.normalizedFullSemanticReportHash, record);
}

describe('paid answer semantic consequence contract', () => {
  it('freezes all 18 answer-specific selector and copy rows', () => {
    assert.equal(Object.keys(CONSEQUENCE_BY_ANSWER).length, 18);
    for (const row of Object.values(CONSEQUENCE_BY_ANSWER)) {
      assert.equal(PAID_CHAPTER_EMPHASIS_COPY_V1[row.id], row.copy, row.id);
    }
    assert.equal(
      PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch2__decision_friction_fear_mistake,
      '失敗が気になるときは、一度で決め切ろうとせず、\n見直せる小さな確認単位に分けると、\n次の一手を選びやすくなります。',
    );
  });

  it('allocates mandatory current-paid selectors without promoting chapter I', () => {
    const result = buildSemanticCase(
      prepareFoundation(broadFoundation(0)),
      baselinePaidSet(),
    );
    assert.equal(result.selectors.chapter2.length, 3);
    assert.equal(result.selectors.chapter3.length, 3);
    assert.equal(result.selectors.chapter4.length, 3);
    assert.equal(result.selectors.chapter1.some(isAnswerSpecificPaidId), false);
    assert.deepEqual(result.selectors.chapter2.slice(0, 2), [
      'paid_ch2__work_focus_priority',
      'paid_ch2__decision_friction_too_many',
    ]);
    assert.equal(result.selectors.chapter2.slice(2).some(isAnswerSpecificPaidId), false);
    assert.equal(result.selectors.chapter3[0], 'paid_ch3__relation_focus_words');
    assert.equal(result.selectors.chapter3.slice(1).some(isAnswerSpecificPaidId), false);
    assert.deepEqual(result.selectors.chapter4, [
      'paid_ch4__fatigue_signal_after_push',
      'paid_ch4__recovery_sequence_pause_first',
      'paid_ch4__restart_condition_overview_first',
    ]);
    assert.deepEqual(result.projectionIds, {
      chapter2: result.selectors.chapter2.slice(0, 2),
      chapter3: result.selectors.chapter3.slice(0, 1),
      chapter4: result.selectors.chapter4,
    });
  });

  it('proves 144 OAT pairs, cross-domain containment, and public-share invariance', () => {
    const foundations = Array.from({ length: 8 }, (_, index) =>
      prepareFoundation(broadFoundation(40 + index * 73)),
    );
    const targetChapterByFamily: Readonly<Record<PaidFamilyId, 1 | 2 | 3>> = {
      'paid.work_focus': 1,
      'paid.decision_friction': 1,
      'paid.relation_focus': 2,
      'paid.fatigue_signal': 3,
      'paid.recovery_sequence': 3,
      'paid.restart_condition': 3,
    };
    let primaryPairs = 0;
    let containmentAssertions = 0;
    let shareAssertions = 0;

    for (const foundation of foundations) {
      for (const [family, answers] of Object.entries(PAID_FAMILIES) as Array<
        [PaidFamilyId, (typeof PAID_FAMILIES)[PaidFamilyId]]
      >) {
        const cases = answers.map((answer) =>
          buildSemanticCase(foundation, {
            ...baselinePaidSet(),
            [family]: answer,
          }),
        );
        for (const [aIndex, bIndex] of [
          [0, 1],
          [1, 2],
          [0, 2],
        ] as const) {
          const a = cases[aIndex]!;
          const b = cases[bIndex]!;
          const target = targetChapterByFamily[family];
          assert.notEqual(
            a.chapters[target],
            b.chapters[target],
            `${foundation.foundation.id}:${family}:${aIndex}-${bIndex}`,
          );
          assert.doesNotMatch(a.chapters[target], /paid\.|paid_ch|selectors-v1/);
          assert.doesNotMatch(b.chapters[target], /paid\.|paid_ch|selectors-v1/);
          primaryPairs += 1;
          for (const chapter of [0, 1, 2, 3] as const) {
            if (chapter === target) continue;
            assert.equal(
              a.chapters[chapter],
              b.chapters[chapter],
              `${foundation.foundation.id}:${family}:chapter${chapter + 1}`,
            );
            containmentAssertions += 1;
          }
          assert.equal(a.publicShare, b.publicShare, `${foundation.foundation.id}:${family}:share`);
          shareAssertions += 1;
        }
      }
    }

    assert.equal(primaryPairs, 144);
    assert.equal(containmentAssertions, 432);
    assert.equal(shareAssertions, 144);
  });

  it('is deterministic across selectors, chapter bodies, projection IDs, and normalized hash', () => {
    const prepared = prepareFoundation(broadFoundation(611));
    const paid = PAID_CONTROL_VARIANTS[7]!;
    const a = buildSemanticCase(prepared, { ...paid }, '2026-08-21T00:00:00.000Z');
    const b = buildSemanticCase(prepared, { ...paid }, '2026-08-22T12:34:56.000Z');
    assert.deepEqual(a.selectors, b.selectors);
    assert.deepEqual(a.chapters, b.chapters);
    assert.deepEqual(a.projectionIds, b.projectionIds);
    assert.equal(sha256(a.normalizedFullSemantic), sha256(b.normalizedFullSemantic));
  });

  it('uses the same frozen purchase semantic path in production builder and preview fixture', () => {
    const foundation: Foundation = {
      id: 'preview-parity',
      nickname: 'Preview',
      birthDate: '1983-02-28',
      birthTime: '12:00',
      birthTimeUnknown: false,
      birthplace: '東京都',
      timezone: 'Asia/Tokyo',
      freeAnswerSet: {
        'free.start_style': 'free.start_style.map_first',
        'free.decision_style': 'free.decision_style.sort_first',
        'free.recovery_style': 'free.recovery_style.pause_short',
        'free.distance_style': 'free.distance_style.close_careful',
        'free.change_style': 'free.change_style.observe_first',
        'free.primary_theme': 'free.primary_theme.work',
      },
    };
    const production = buildSemanticCase(
      prepareFoundation(foundation),
      baselinePaidSet(),
      '2026-08-21T00:00:00.000Z',
      false,
    );
    const fixtureChapters = CHAPTER_SECTION_IDS.map(
      (sectionId) =>
        DTR_DRAWER_PREVIEW_PURCHASED_SNAPSHOT.envelope.payload.fullSections.find(
          (section) => section.id === sectionId,
        )?.body ?? '',
    );
    assert.deepEqual(fixtureChapters, production.chapters);
    const props = getDtrDrawerPreviewReaderProps(true, undefined, true);
    assert.deepEqual(
      props.premiumProjection?.paidSemanticConsequenceIds,
      production.projectionIds,
    );
  });
});

describe('paid answer semantic diversity corpus', () => {
  it('keeps the 800 broad normalized reports distinct', () => {
    const recordsBySemanticHash = new Map<string, CollisionDiagnosticRecord>();
    for (let index = 0; index < 800; index += 1) {
      const foundation = broadFoundation(index);
      const paidVariantIndex = index % PAID_CONTROL_VARIANTS.length;
      const paidAnswerSet = { ...PAID_CONTROL_VARIANTS[paidVariantIndex]! };
      const result = buildSemanticCase(
        prepareFoundation(foundation),
        paidAnswerSet,
      );
      recordDistinctSemanticOutput(
        recordsBySemanticHash,
        collisionDiagnosticRecord({
          cohort: 'broad',
          sampleIndex: index,
          foundation,
          paidControlGroup: null,
          paidVariantIndex,
          paidAnswerSet,
          result,
        }),
      );
    }
    assert.equal(
      recordsBySemanticHash.size,
      800,
      `broad unique=${recordsBySemanticHash.size}/800`,
    );
  });

  it('keeps all 25×8 paid controls distinct per group and across the paid cohort', () => {
    const paidRecordsBySemanticHash = new Map<string, CollisionDiagnosticRecord>();
    for (let group = 0; group < 25; group += 1) {
      const foundation = paidControlFoundation(group);
      const prepared = prepareFoundation(foundation);
      const cases = PAID_CONTROL_VARIANTS.map((paid) =>
        buildSemanticCase(prepared, { ...paid }),
      );
      const groupRecordsBySemanticHash = new Map<string, CollisionDiagnosticRecord>();
      cases.forEach((result, variant) => {
        const paidAnswerSet = { ...PAID_CONTROL_VARIANTS[variant]! };
        const record = collisionDiagnosticRecord({
          cohort: 'paid-control',
          sampleIndex: group * PAID_CONTROL_VARIANTS.length + variant,
          foundation,
          paidControlGroup: group,
          paidVariantIndex: variant,
          paidAnswerSet,
          result,
        });
        recordDistinctSemanticOutput(groupRecordsBySemanticHash, record);
        recordDistinctSemanticOutput(paidRecordsBySemanticHash, record);
      });
      assert.equal(
        groupRecordsBySemanticHash.size,
        8,
        `${prepared.foundation.id}: unique=${groupRecordsBySemanticHash.size}/8`,
      );
    }
    assert.equal(
      paidRecordsBySemanticHash.size,
      200,
      `paid unique=${paidRecordsBySemanticHash.size}/200`,
    );
  });

  it('keeps the combined deterministic 1000 corpus normalized outputs distinct', () => {
    const recordsBySemanticHash = new Map<string, CollisionDiagnosticRecord>();
    for (let index = 0; index < 800; index += 1) {
      const foundation = broadFoundation(index);
      const paidVariantIndex = index % PAID_CONTROL_VARIANTS.length;
      const paidAnswerSet = { ...PAID_CONTROL_VARIANTS[paidVariantIndex]! };
      const result = buildSemanticCase(
        prepareFoundation(foundation),
        paidAnswerSet,
      );
      recordDistinctSemanticOutput(
        recordsBySemanticHash,
        collisionDiagnosticRecord({
          cohort: 'broad',
          sampleIndex: index,
          foundation,
          paidControlGroup: null,
          paidVariantIndex,
          paidAnswerSet,
          result,
        }),
      );
    }
    for (let group = 0; group < 25; group += 1) {
      const foundation = paidControlFoundation(group);
      const prepared = prepareFoundation(foundation);
      for (const [variant, paid] of PAID_CONTROL_VARIANTS.entries()) {
        const paidAnswerSet = { ...paid };
        const result = buildSemanticCase(prepared, paidAnswerSet);
        recordDistinctSemanticOutput(
          recordsBySemanticHash,
          collisionDiagnosticRecord({
            cohort: 'paid-control',
            sampleIndex: group * PAID_CONTROL_VARIANTS.length + variant,
            foundation,
            paidControlGroup: group,
            paidVariantIndex: variant,
            paidAnswerSet,
            result,
          }),
        );
      }
    }
    assert.equal(
      recordsBySemanticHash.size,
      1000,
      `full unique=${recordsBySemanticHash.size}/1000`,
    );
  });
});
