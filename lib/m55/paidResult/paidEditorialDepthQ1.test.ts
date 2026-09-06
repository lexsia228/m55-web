/**
 * SELF PREMIUM EDITORIAL DEPTH Q1 — focused contract (4 representative cases).
 * Production pure-function chain only; no 900/1000-case matrices.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DTR_CORE_FULL_V1, DTR_CORE_LIGHT_V1 } from '../../oneTimeCheckout';
import { resetCalendarBundleCacheForTests } from '../calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from '../compositeStem/buildV2FulfillmentSnapshot';
import { ENGINE_VERSION_V2 } from '../compositeStem/constants';
import { resolveDisplayedDtrEnvelope } from '../compositeStem/resolveDisplayedDtrEnvelope';
import type { DtrReportSnapshotReadRow } from '../compositeStem/storedEnvelopeRead';
import { composePaidIndividualizationFromEngineContext } from '../dtrPaidIndividualizationCompose';
import { buildPaidDtrChapterMaterialPack } from '../dtrPaidChapterMaterialPack';
import type { PaidChapterEmphasisIdV1 } from '../individualization/individualizationSelectorTypesV1';
import {
  buildPaidSavedReportChapterBodiesV1,
  collectSelectorBoundSubstanceText,
  hashChapterBodiesForEquality,
} from './buildPaidSavedReportChapterBodiesV1';
import {
  PAID_CHAPTER_EMPHASIS_COPY_V1,
  PAID_CHAPTER_EMPHASIS_EXPLANATION_V1,
} from './paidChapterEmphasisCopyV1';
import {
  buildPurchaseInputSnapshotV1,
  purchaseInputExtraJson,
} from './purchaseInputSnapshotV1';

const CHAPTER_IDS = ['s1_identity', 's2_composition', 's3_essence', 's4_strengths'] as const;

const CHAPTER_ONE_GENERIC_IDS: readonly PaidChapterEmphasisIdV1[] = [
  'paid_ch1__baseline_landscape',
  'paid_ch1__expression_mirror',
  'paid_ch1__align_diverge_bridge',
];

const ESSENCE_RHYTHM_NOTE_MARKERS = [
  '冬の入り口',
  '初夏に近づく',
  '一年の折り返し',
] as const;

const Q1_META_PHRASES = ['見取り', '読み返せる形'] as const;

const ANSWER_SPECIFIC_IDS: readonly PaidChapterEmphasisIdV1[] = [
  'paid_ch2__work_focus_priority',
  'paid_ch2__work_focus_pace',
  'paid_ch2__work_focus_boundary',
  'paid_ch2__decision_friction_too_many',
  'paid_ch2__decision_friction_unclear_end',
  'paid_ch2__decision_friction_fear_mistake',
  'paid_ch3__relation_focus_words',
  'paid_ch3__relation_focus_timing',
  'paid_ch3__relation_focus_recovery',
  'paid_ch4__fatigue_signal_after_push',
  'paid_ch4__fatigue_signal_before_start',
  'paid_ch4__fatigue_signal_long_stretch',
  'paid_ch4__recovery_sequence_pause_first',
  'paid_ch4__recovery_sequence_small_start',
  'paid_ch4__recovery_sequence_sort_materials',
  'paid_ch4__restart_condition_overview_first',
  'paid_ch4__restart_condition_shrink_scope',
  'paid_ch4__restart_condition_trusted_support',
];

const PRESERVED_ANSWER_COPY: Readonly<Record<string, string>> = {
  'paid_ch2__work_focus_priority':
    '同時に頼まれた日は、こなす量を増やさず、後回しにする作業を先に決める。',
  'paid_ch2__work_focus_pace':
    '疲れがたまりやすい条件と、戻しやすいペースを生活のリズムに結びます。',
  'paid_ch2__work_focus_boundary':
    '始める前に「今日はここまで」と自分の言葉で決める。',
  'paid_ch2__decision_friction_too_many':
    '一気に答えを出そうとすると、考えることが増え、判断がさらに重くなりやすくなります。',
  'paid_ch2__decision_friction_unclear_end':
    '一つ進めたら、その日はそこで区切る。',
  'paid_ch2__decision_friction_fear_mistake':
    '失敗が気になるときは、一度で決め切ろうとせず、\n見直せる小さな確認単位に分けると、\n次の一手を選びやすくなります。',
  'paid_ch3__relation_focus_words':
    '正しさを急ぐより、感じたことを一つ返すほうが扱いやすいです。',
  'paid_ch3__relation_focus_timing':
    '次に言葉が詰まったとき、結論の前に一つだけ返すところから試せます。',
  'paid_ch3__relation_focus_recovery':
    '不快感を内部に溜めると、距離の戻し方が分からなくなる。',
  'paid_ch4__fatigue_signal_after_push':
    '無理をして押し切るより、余白が戻るほど動きやすくなる形です。',
  'paid_ch4__fatigue_signal_before_start':
    '始め方のリズムを意識すると、着手の負荷が整いやすくなります。',
  'paid_ch4__fatigue_signal_long_stretch':
    '休めない続きや切り替えの多さなど、崩れやすい条件を先に見える化する。',
  'paid_ch4__recovery_sequence_pause_first':
    '今日決めなくていいことを一つ横に置き、休める時間を先に作ると、戻る場所が見えやすくなります。',
  'paid_ch4__recovery_sequence_small_start':
    '小さな手ごたえが見えると、少しずつ動きを戻しやすいです。',
  'paid_ch4__recovery_sequence_sort_materials':
    '迷いが出やすい場面では、比較と区切りを先に置くと戻りやすくなります。',
  'paid_ch4__restart_condition_overview_first':
    '急かされる場面や見通しの立ちにくさのなかで、論点を一本化しやすくする。',
  'paid_ch4__restart_condition_shrink_scope':
    '確かめたい点を一つに絞り、今日決める範囲を小さくすると判断へ戻りやすくなります。',
  'paid_ch4__restart_condition_trusted_support':
    '回復の仕方と、つながり方のバランスを一緒に見ます。',
};

type Q1CorpusCase = {
  id: string;
  coverage: string;
  nickname: string;
  birthDate: string;
  freeAnswerSet: Record<string, string>;
  paidAnswerSet: Record<string, string>;
  expectedStemLaneIndex: number;
  expectAlign: boolean;
  expectDiverge: boolean;
  primaryTheme: string;
};

const Q1_CORPUS: readonly Q1CorpusCase[] = [
  {
    id: 'q1-align-work-lane2',
    coverage:
      'ALIGN/DIVERGE mix + work primary theme + stem lane 2 + baseline paid tuple',
    nickname: 'AlignWork',
    birthDate: '1990-01-15',
    freeAnswerSet: {
      'free.start_style': 'free.start_style.map_first',
      'free.decision_style': 'free.decision_style.sort_first',
      'free.recovery_style': 'free.recovery_style.pause_short',
      'free.distance_style': 'free.distance_style.close_careful',
      'free.change_style': 'free.change_style.observe_first',
      'free.primary_theme': 'free.primary_theme.work',
    },
    paidAnswerSet: {
      'paid.work_focus': 'paid.work_focus.priority',
      'paid.decision_friction': 'paid.decision_friction.too_many',
      'paid.relation_focus': 'paid.relation_focus.words',
      'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
      'paid.recovery_sequence': 'paid.recovery_sequence.pause_first',
      'paid.restart_condition': 'paid.restart_condition.overview_first',
    },
    expectedStemLaneIndex: 2,
    expectAlign: true,
    expectDiverge: true,
    primaryTheme: 'work',
  },
  {
    id: 'q1-diverge-relation-lane9',
    coverage:
      'ALIGN/DIVERGE mix (diverge-heavy) + relation primary theme + stem lane 9 + distinct paid emphasis tuple',
    nickname: 'DivRel',
    birthDate: '1983-02-28',
    freeAnswerSet: {
      'free.start_style': 'free.start_style.try_first',
      'free.decision_style': 'free.decision_style.deadline_first',
      'free.recovery_style': 'free.recovery_style.shrink_task',
      'free.distance_style': 'free.distance_style.solo_reset',
      'free.change_style': 'free.change_style.adjust_fast',
      'free.primary_theme': 'free.primary_theme.relation',
    },
    paidAnswerSet: {
      'paid.work_focus': 'paid.work_focus.boundary',
      'paid.decision_friction': 'paid.decision_friction.unclear_end',
      'paid.relation_focus': 'paid.relation_focus.timing',
      'paid.fatigue_signal': 'paid.fatigue_signal.before_start',
      'paid.recovery_sequence': 'paid.recovery_sequence.small_start',
      'paid.restart_condition': 'paid.restart_condition.shrink_scope',
    },
    expectedStemLaneIndex: 9,
    expectAlign: true,
    expectDiverge: true,
    primaryTheme: 'relation',
  },
  {
    id: 'q1-fatigue-diverge-lane1',
    coverage:
      'ALIGN/DIVERGE mix + fatigue primary theme + stem lane 1 + multi-chapter paid consequence mix',
    nickname: 'Fatigue1',
    birthDate: '1992-12-19',
    freeAnswerSet: {
      'free.start_style': 'free.start_style.ask_first',
      'free.decision_style': 'free.decision_style.wait_first',
      'free.recovery_style': 'free.recovery_style.change_scene',
      'free.distance_style': 'free.distance_style.middle_steady',
      'free.change_style': 'free.change_style.rebuild_slow',
      'free.primary_theme': 'free.primary_theme.fatigue',
    },
    paidAnswerSet: {
      'paid.work_focus': 'paid.work_focus.pace',
      'paid.decision_friction': 'paid.decision_friction.fear_mistake',
      'paid.relation_focus': 'paid.relation_focus.recovery',
      'paid.fatigue_signal': 'paid.fatigue_signal.long_stretch',
      'paid.recovery_sequence': 'paid.recovery_sequence.sort_materials',
      'paid.restart_condition': 'paid.restart_condition.trusted_support',
    },
    expectedStemLaneIndex: 1,
    expectAlign: true,
    expectDiverge: true,
    primaryTheme: 'fatigue',
  },
  {
    id: 'q1-tendency-mixed-lane1',
    coverage:
      'ALIGN/DIVERGE mix (diverge-heavy) + tendency primary theme + stem lane 1 + alternate paid emphasis tuple',
    nickname: 'Tend1',
    birthDate: '1980-06-15',
    freeAnswerSet: {
      'free.start_style': 'free.start_style.map_first',
      'free.decision_style': 'free.decision_style.wait_first',
      'free.recovery_style': 'free.recovery_style.pause_short',
      'free.distance_style': 'free.distance_style.close_careful',
      'free.change_style': 'free.change_style.observe_first',
      'free.primary_theme': 'free.primary_theme.tendency',
    },
    paidAnswerSet: {
      'paid.work_focus': 'paid.work_focus.pace',
      'paid.decision_friction': 'paid.decision_friction.fear_mistake',
      'paid.relation_focus': 'paid.relation_focus.words',
      'paid.fatigue_signal': 'paid.fatigue_signal.long_stretch',
      'paid.recovery_sequence': 'paid.recovery_sequence.pause_first',
      'paid.restart_condition': 'paid.restart_condition.overview_first',
    },
    expectedStemLaneIndex: 1,
    expectAlign: true,
    expectDiverge: true,
    primaryTheme: 'tendency',
  },
];

function profileFields(caseDef: Q1CorpusCase) {
  return {
    nickname: caseDef.nickname,
    birthDate: caseDef.birthDate,
    birthTime: '12:00',
    birthTimeUnknown: false,
    country: 'JP',
    birthplace: '東京都',
    timezone: 'Asia/Tokyo',
  };
}

function buildCorpusArtifacts(caseDef: Q1CorpusCase) {
  resetCalendarBundleCacheForTests();
  const userId = `q1_user_${caseDef.id}`;
  const v2 = buildV2FulfillmentSnapshotFromFields(profileFields(caseDef));
  const purchase = buildPurchaseInputSnapshotV1({
    userId,
    productId: DTR_CORE_LIGHT_V1,
    profile: profileFields(caseDef),
    freeAnswerSet: caseDef.freeAnswerSet,
    paidAnswerSet: caseDef.paidAnswerSet,
    stemLaneIndex: v2.engine_context_json.stemLaneIndex,
    createdAt: '2026-09-06T00:00:00.000Z',
  });
  assert.equal(purchase.ok, true, `${caseDef.id}: purchase:${!purchase.ok && purchase.code}`);
  if (!purchase.ok) throw new Error(purchase.code);

  const ind = composePaidIndividualizationFromEngineContext(v2.engine_context_json);
  const pack = buildPaidDtrChapterMaterialPack(v2.engine_context_json, ind);
  const bodies = buildPaidSavedReportChapterBodiesV1({
    draft: purchase.value.individualization,
    materialPack: pack,
  });

  const report = buildV2FulfillmentSnapshotFromFields(profileFields(caseDef), {
    purchaseInput: purchase.value,
  });

  return {
    caseDef,
    userId,
    purchase: purchase.value,
    stemLaneIndex: v2.engine_context_json.stemLaneIndex,
    bodies,
    report,
    selectors: purchase.value.individualization.fingerprint.selectors!,
  };
}

function substanceForChapter(
  ids: readonly PaidChapterEmphasisIdV1[],
): string {
  return collectSelectorBoundSubstanceText(ids);
}

function normalizeParagraphBlob(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function assertNoDuplicateSubstanceFamilies(
  reports: readonly { id: string; substance: string }[],
): void {
  const seen = new Map<string, string>();
  for (const report of reports) {
    const normalized = normalizeParagraphBlob(report.substance);
    if (!normalized) continue;
    const prior = seen.get(normalized);
    assert.equal(
      prior,
      undefined,
      `duplicate substantive selector-bound family: ${prior} vs ${report.id}`,
    );
    seen.set(normalized, report.id);
  }
}

function assertNoConsequenceTailWhenExplanationExists(
  chapterBody: string,
  ids: readonly PaidChapterEmphasisIdV1[],
  label: string,
): void {
  for (const id of ids) {
    const explanation = PAID_CHAPTER_EMPHASIS_EXPLANATION_V1[id];
    if (!explanation?.trim()) continue;
    const tail = PAID_CHAPTER_EMPHASIS_COPY_V1[id];
    if (!tail) continue;
    assert.equal(
      chapterBody.includes(tail),
      false,
      `${label}: consequence tail must not duplicate explanation for ${id}`,
    );
  }
}

function assertChapterOneNoScaffoldDuplication(ch1: string, caseId: string): void {
  for (const id of CHAPTER_ONE_GENERIC_IDS) {
    const explanation = PAID_CHAPTER_EMPHASIS_EXPLANATION_V1[id];
    const copy = PAID_CHAPTER_EMPHASIS_COPY_V1[id];
    if (explanation) {
      assert.equal(
        ch1.includes(explanation),
        false,
        `${caseId}: ch1 must not include generic explanation ${id}`,
      );
    }
    assert.equal(
      ch1.includes(copy),
      false,
      `${caseId}: ch1 must not include generic consequence copy ${id}`,
    );
  }
  assert.equal(
    ch1.includes('日々の気分では入れ替わりません'),
    false,
    `${caseId}: ch1 must avoid objective birth-date certainty framing`,
  );
  assert.equal(
    ch1.includes('6問の回答は、いま表に出ている動き方の手がかりです'),
    false,
    `${caseId}: ch1 must not repeat assembly meta about six answers`,
  );
}

function assertNoEssenceRhythmNote(ch3: string, caseId: string): void {
  for (const marker of ESSENCE_RHYTHM_NOTE_MARKERS) {
    assert.equal(
      ch3.includes(marker),
      false,
      `${caseId}: ch3 must not include essenceRhythmNote marker: ${marker}`,
    );
  }
}

function assertNoQ1MetaLeak(text: string, label: string): void {
  for (const phrase of Q1_META_PHRASES) {
    assert.equal(text.includes(phrase), false, `${label} must not include: ${phrase}`);
  }
  assert.equal(text.includes('土台の上に'), false, `${label} must not include composition meta`);
  assert.equal(text.includes('土台と今の見取り'), false, `${label} must not include composition meta`);
}

function assertChapterDifferentiation(chapters: readonly string[]): void {
  assert.notEqual(chapters[0], chapters[1]);
  assert.notEqual(chapters[0], chapters[2]);
  assert.notEqual(chapters[0], chapters[3]);
  assert.notEqual(chapters[1], chapters[2]);
  assert.notEqual(chapters[1], chapters[3]);
  assert.notEqual(chapters[2], chapters[3]);
}

function assertNoCrossChapterExactDuplicates(
  emphasisByChapter: readonly string[][],
  caseId: string,
): void {
  const seen = new Map<string, number>();
  emphasisByChapter.forEach((lines, chapterIndex) => {
    for (const line of lines) {
      const prior = seen.get(line);
      assert.equal(
        prior,
        undefined,
        `${caseId}: exact duplicate emphasis across chapters ch${prior ?? '?'} and ch${chapterIndex + 1}: ${line.slice(0, 40)}`,
      );
      seen.set(line, chapterIndex + 1);
    }
  });
}

describe('paid editorial depth Q1 — emphasis copy contract', () => {
  it('preserves all 18 answer-specific consequence strings exactly', () => {
    for (const id of ANSWER_SPECIFIC_IDS) {
      assert.equal(
        PAID_CHAPTER_EMPHASIS_COPY_V1[id],
        PRESERVED_ANSWER_COPY[id],
        `answer-specific copy drift: ${id}`,
      );
    }
  });

  it('generic chapter emphasis copy has no Q1 meta phrase leakage', () => {
    const genericIds = Object.keys(PAID_CHAPTER_EMPHASIS_COPY_V1).filter(
      (id) => !ANSWER_SPECIFIC_IDS.includes(id as PaidChapterEmphasisIdV1),
    ) as PaidChapterEmphasisIdV1[];
    const genericTexts = genericIds.map((id) => PAID_CHAPTER_EMPHASIS_COPY_V1[id]);
    assert.equal(new Set(genericTexts).size, genericTexts.length, 'generic payloads must be unique');
    for (const text of genericTexts) {
      assertNoQ1MetaLeak(text, 'generic emphasis');
    }
  });
});

describe('paid editorial depth Q1 — four representative corpus cases', () => {
  it('remains exactly four representative corpus cases', () => {
    assert.equal(Q1_CORPUS.length, 4);
  });

  for (const caseDef of Q1_CORPUS) {
    it(`${caseDef.id}: ${caseDef.coverage}`, () => {
      const built = buildCorpusArtifacts(caseDef);
      const chapters = CHAPTER_IDS.map((id) => built.bodies[id] ?? '');
      const emphasisByChapter = [
        built.selectors.paidChapterEmphasisIds.chapter1.map((id) => PAID_CHAPTER_EMPHASIS_COPY_V1[id]),
        built.selectors.paidChapterEmphasisIds.chapter2.map((id) => PAID_CHAPTER_EMPHASIS_COPY_V1[id]),
        built.selectors.paidChapterEmphasisIds.chapter3.map((id) => PAID_CHAPTER_EMPHASIS_COPY_V1[id]),
        built.selectors.paidChapterEmphasisIds.chapter4.map((id) => PAID_CHAPTER_EMPHASIS_COPY_V1[id]),
      ];
      const substanceByChapter = [
        substanceForChapter(built.selectors.paidChapterEmphasisIds.chapter1),
        substanceForChapter(built.selectors.paidChapterEmphasisIds.chapter2),
        substanceForChapter(built.selectors.paidChapterEmphasisIds.chapter3),
        substanceForChapter(built.selectors.paidChapterEmphasisIds.chapter4),
      ];

      assert.equal(built.stemLaneIndex, caseDef.expectedStemLaneIndex, `${caseDef.id}: stem lane`);
      assert.equal(
        built.purchase.individualization.fingerprint.freeExpression.primaryReplyTheme,
        caseDef.primaryTheme,
      );

      const alignCount = built.purchase.individualization.fingerprint.alignItems.length;
      const divergeCount = built.purchase.individualization.fingerprint.divergeItems.length;
      if (caseDef.expectAlign) assert.ok(alignCount > 0, 'expected ALIGN evidence');
      if (caseDef.expectDiverge) assert.ok(divergeCount > 0, 'expected DIVERGE evidence');

      const selectorTuple = JSON.stringify(built.selectors.paidChapterEmphasisIds);
      assert.ok(selectorTuple.length > 40, 'distinct emphasis tuple');

      assertChapterDifferentiation(chapters);
      assertNoCrossChapterExactDuplicates(emphasisByChapter, caseDef.id);

      for (const [index, lines] of emphasisByChapter.entries()) {
        const joined = lines.join('\n');
        assertNoQ1MetaLeak(joined, `${caseDef.id} ch${index + 1} emphasis`);
        assert.equal(
          new Set(lines).size,
          lines.length,
          `${caseDef.id} ch${index + 1} intra-chapter exact duplicate`,
        );
      }
      for (const [index, substance] of substanceByChapter.entries()) {
        assert.ok(
          substance.length > 40 || index === 0,
          `${caseDef.id} ch${index + 1} substantive selector depth`,
        );
        assertNoQ1MetaLeak(substance, `${caseDef.id} ch${index + 1} substance`);
      }

      if (caseDef.expectAlign) {
        assert.match(chapters[0], /重なりやすい/);
      }
      if (caseDef.expectDiverge) {
        assert.match(chapters[0], /少しずれる/);
      }

      assert.ok(chapters[0].length > 80, `${caseDef.id}: ch1 portrait remains substantial`);
      assertChapterOneNoScaffoldDuplication(chapters[0], caseDef.id);
      assert.match(
        chapters[0],
        /このレポートで生年月日から置く基調と、今の回答を分けて見ると/,
        `${caseDef.id}: ch1 compact align/diverge framing`,
      );

      assertNoEssenceRhythmNote(chapters[2], caseDef.id);
      assertNoConsequenceTailWhenExplanationExists(
        chapters[1],
        built.selectors.paidChapterEmphasisIds.chapter2,
        `${caseDef.id} ch2`,
      );
      assertNoConsequenceTailWhenExplanationExists(
        chapters[2],
        built.selectors.paidChapterEmphasisIds.chapter3,
        `${caseDef.id} ch3`,
      );
      assertNoConsequenceTailWhenExplanationExists(
        chapters[3],
        built.selectors.paidChapterEmphasisIds.chapter4,
        `${caseDef.id} ch4`,
      );

      const lightPurchase = buildPurchaseInputSnapshotV1({
        userId: `q1_light_${caseDef.id}`,
        productId: DTR_CORE_LIGHT_V1,
        profile: profileFields(caseDef),
        freeAnswerSet: caseDef.freeAnswerSet,
        paidAnswerSet: caseDef.paidAnswerSet,
        stemLaneIndex: built.stemLaneIndex,
        createdAt: '2026-09-06T00:00:00.000Z',
      });
      const fullPurchase = buildPurchaseInputSnapshotV1({
        userId: `q1_full_${caseDef.id}`,
        productId: DTR_CORE_FULL_V1,
        profile: profileFields(caseDef),
        freeAnswerSet: caseDef.freeAnswerSet,
        paidAnswerSet: caseDef.paidAnswerSet,
        stemLaneIndex: built.stemLaneIndex,
        createdAt: '2026-09-06T00:00:00.000Z',
      });
      assert.equal(lightPurchase.ok, true);
      assert.equal(fullPurchase.ok, true);
      if (!lightPurchase.ok || !fullPurchase.ok) return;

      assert.equal(
        lightPurchase.value.individualization.audit.outputHash,
        fullPurchase.value.individualization.audit.outputHash,
        'Light/FULL selector hash equality',
      );
      assert.equal(
        hashChapterBodiesForEquality(built.bodies),
        hashChapterBodiesForEquality(
          buildPaidSavedReportChapterBodiesV1({
            draft: fullPurchase.value.individualization,
            materialPack: buildPaidDtrChapterMaterialPack(
              built.report.engine_context_json,
              composePaidIndividualizationFromEngineContext(built.report.engine_context_json),
            ),
          }),
        ),
        'Light/FULL chapter body equality',
      );

      const ch2Tail = chapters[1].slice(-Math.min(220, chapters[1].length));
      const ch3Tail = chapters[2].slice(-Math.min(220, chapters[2].length));
      const ch4Tail = chapters[3].slice(-Math.min(220, chapters[3].length));
      assert.notEqual(ch2Tail, ch3Tail, 'ch2/ch3 semantic tail separation');
      assert.notEqual(ch3Tail, ch4Tail, 'ch3/ch4 semantic tail separation');
      assert.ok(substanceByChapter[1].length > 80, 'ch2 substantive depth');
      assert.ok(substanceByChapter[2].length > 80, 'ch3 substantive depth');
      assert.ok(substanceByChapter[3].length > 80, 'ch4 substantive depth');
    });
  }

  it('reports 3 and 4 differ substantively in Chapter II–IV before tail lines', () => {
    const report3 = buildCorpusArtifacts(Q1_CORPUS[2]!);
    const report4 = buildCorpusArtifacts(Q1_CORPUS[3]!);

    assert.equal(report3.stemLaneIndex, report3.caseDef.expectedStemLaneIndex, 'report3 stem lane');
    assert.equal(report4.stemLaneIndex, report4.caseDef.expectedStemLaneIndex, 'report4 stem lane');
    assert.equal(report3.stemLaneIndex, report4.stemLaneIndex, 'same-lane pair');
    assert.equal(report3.caseDef.primaryTheme, 'fatigue');
    assert.equal(report4.caseDef.primaryTheme, 'tendency');
    assert.notEqual(
      JSON.stringify(report3.caseDef.paidAnswerSet),
      JSON.stringify(report4.caseDef.paidAnswerSet),
      'different paid answer tuples',
    );

    const r3ch2 = report3.bodies.s2_composition ?? '';
    const r4ch2 = report4.bodies.s2_composition ?? '';
    const r3ch3 = report3.bodies.s3_essence ?? '';
    const r4ch3 = report4.bodies.s3_essence ?? '';
    const r3ch4 = report3.bodies.s4_strengths ?? '';
    const r4ch4 = report4.bodies.s4_strengths ?? '';

    const r3sub2 = substanceForChapter(report3.selectors.paidChapterEmphasisIds.chapter2);
    const r4sub2 = substanceForChapter(report4.selectors.paidChapterEmphasisIds.chapter2);
    const r3sub3 = substanceForChapter(report3.selectors.paidChapterEmphasisIds.chapter3);
    const r4sub3 = substanceForChapter(report4.selectors.paidChapterEmphasisIds.chapter3);
    const r3sub4 = substanceForChapter(report3.selectors.paidChapterEmphasisIds.chapter4);
    const r4sub4 = substanceForChapter(report4.selectors.paidChapterEmphasisIds.chapter4);

    assert.notEqual(normalizeParagraphBlob(r3sub3), normalizeParagraphBlob(r4sub3));
    assert.notEqual(normalizeParagraphBlob(r3sub4), normalizeParagraphBlob(r4sub4));
    assert.notEqual(r3ch3, r4ch3);
    assert.notEqual(r3ch4, r4ch4);

    assert.ok(
      r3sub3.includes(PAID_CHAPTER_EMPHASIS_EXPLANATION_V1.paid_ch3__relation_focus_recovery!),
    );
    assert.ok(
      r4sub3.includes(PAID_CHAPTER_EMPHASIS_EXPLANATION_V1.paid_ch3__relation_focus_words!),
    );
    assert.ok(
      r3sub4.includes(PAID_CHAPTER_EMPHASIS_EXPLANATION_V1.paid_ch4__recovery_sequence_sort_materials!),
    );
    assert.ok(
      r4sub4.includes(PAID_CHAPTER_EMPHASIS_EXPLANATION_V1.paid_ch4__recovery_sequence_pause_first!),
    );

    assert.equal(
      r3ch3.includes(PRESERVED_ANSWER_COPY['paid_ch3__relation_focus_recovery']),
      false,
      'report3 ch3: no duplicate consequence tail',
    );
    assert.equal(
      r4ch3.includes(PRESERVED_ANSWER_COPY['paid_ch3__relation_focus_words']),
      false,
      'report4 ch3: no duplicate consequence tail',
    );

    if (normalizeParagraphBlob(r3sub2) !== normalizeParagraphBlob(r4sub2)) {
      assert.notEqual(r3ch2, r4ch2);
    }

    assertNoDuplicateSubstanceFamilies([
      { id: 'report3-ch3', substance: r3sub3 },
      { id: 'report4-ch3', substance: r4sub3 },
      { id: 'report3-ch4', substance: r3sub4 },
      { id: 'report4-ch4', substance: r4sub4 },
    ]);
  });
});

describe('paid editorial depth Q1 — stored_v2 display resolver', () => {
  it('deterministic stored_v2 with frozen purchase input surfaces Q1 chapter bodies', () => {
    const caseDef = Q1_CORPUS[0]!;
    const built = buildCorpusArtifacts(caseDef);
    const staleEnvelope = structuredClone(built.report.envelope_json);
    const staleMarker = 'STALE_Q1_MARKER_SHOULD_NOT_DISPLAY';
    const s1 = staleEnvelope.payload.fullSections.find((s) => s.id === 's1_identity');
    assert.ok(s1);
    s1!.body = `${s1!.body}\n${staleMarker}`;

    const row: DtrReportSnapshotReadRow = {
      reportInstanceId: 'q1-resolver-1',
      user_id: built.userId,
      product_id: DTR_CORE_LIGHT_V1,
      checkout_session_id: 'cs_q1',
      profile_snapshot: built.report.profile_snapshot,
      draft_snapshot: {
        extra_json: purchaseInputExtraJson(built.purchase, null),
      },
      envelope_json: staleEnvelope,
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: built.report.engine_context_json,
      generation_mode: null,
      quality_passed: null,
    };

    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.mode, 'stored_v2');
    assert.equal(read.rawMeta.displayNormalizeSource, 'current_dtr_engine_catalog');

    const displayedS1 = read.envelope.payload.fullSections.find((s) => s.id === 's1_identity')!.body;
    const expectedS1 = built.bodies.s1_identity ?? '';
    assert.equal(displayedS1.includes(staleMarker), false);
    assert.equal(displayedS1, expectedS1);
    assert.match(displayedS1, /重なりやすい/);

    const rawS1 = row.envelope_json.payload.fullSections.find((s) => s.id === 's1_identity')!.body;
    assert.equal(rawS1.includes(staleMarker), true);
    assert.notEqual(read.envelope, row.envelope_json);
  });

  it('stored_v2 owner mismatch uses catalog fallback without foreign Q1 substance', () => {
    const caseDef = Q1_CORPUS[2]!;
    const built = buildCorpusArtifacts(caseDef);
    const row: DtrReportSnapshotReadRow = {
      reportInstanceId: 'q1-bind-owner',
      user_id: 'foreign_owner',
      product_id: DTR_CORE_LIGHT_V1,
      checkout_session_id: 'cs_q1_bo',
      profile_snapshot: built.report.profile_snapshot,
      draft_snapshot: {
        extra_json: purchaseInputExtraJson(built.purchase, null),
      },
      envelope_json: built.report.envelope_json,
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: built.report.engine_context_json,
      generation_mode: null,
      quality_passed: null,
    };
    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    const displayedS4 = read.envelope.payload.fullSections.find((s) => s.id === 's4_strengths')!.body;
    assert.equal(
      displayedS4.includes(PAID_CHAPTER_EMPHASIS_EXPLANATION_V1.paid_ch4__recovery_sequence_sort_materials!),
      false,
    );
  });

  it('stored_v2 without purchase input preserves catalog fallback', () => {
    const caseDef = Q1_CORPUS[1]!;
    const built = buildCorpusArtifacts(caseDef);
    const row: DtrReportSnapshotReadRow = {
      reportInstanceId: 'q1-resolver-fallback',
      user_id: 'user-q1-fb',
      product_id: DTR_CORE_LIGHT_V1,
      checkout_session_id: 'cs_q1_fb',
      profile_snapshot: built.report.profile_snapshot,
      draft_snapshot: null,
      envelope_json: built.report.envelope_json,
      engine_version: ENGINE_VERSION_V2,
      engine_context_json: built.report.engine_context_json,
      generation_mode: null,
      quality_passed: null,
    };

    const read = resolveDisplayedDtrEnvelope(row);
    assert.equal(read.ok, true);
    if (!read.ok) return;
    const displayedS1 = read.envelope.payload.fullSections.find((s) => s.id === 's1_identity')!.body;
    assert.ok(displayedS1.length > 80);
    assert.equal(displayedS1.includes(PRESERVED_ANSWER_COPY['paid_ch2__work_focus_boundary']), false);
  });
});
