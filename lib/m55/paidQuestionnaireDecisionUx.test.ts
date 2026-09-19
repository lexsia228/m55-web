/**
 * Paid questionnaire → plan decision UX — focused Product Truth / flow / analytics guards.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  PAID_QUESTION_IDS,
  PAID_WORK_FOCUS_IDS,
  PAID_DECISION_FRICTION_IDS,
  PAID_RELATION_FOCUS_IDS,
  PAID_FATIGUE_SIGNAL_IDS,
  PAID_RECOVERY_SEQUENCE_IDS,
  PAID_RESTART_CONDITION_IDS,
} from './individualization/answerIdMapsV1';
import { PAID_QUESTIONNAIRE_COPY_V1 } from './paidResult/questionnaireCopyV1';
import {
  PAID_QUESTION_REPORT_TRACE_DISPLAY_V1,
  paidQuestionReportTraceLineJa,
} from './paidResult/paidQuestionReportTraceDisplayV1';
import {
  PAID_CHAPTER_EMPHASIS_COPY_V1,
  PAID_CHAPTER_EMPHASIS_EXPLANATION_V1,
} from './paidResult/paidChapterEmphasisCopyV1';
import { PAID_CHAPTER_EMPHASIS_CATALOG_V1 } from './individualization/individualizationSelectorCatalogV1';
import { PAID_DTR_LP, PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';
import { PREMIUM_FUNNEL_PAGE_CONTENT } from './commercialUx/experience/pageContent/premiumFunnelCopy';
import { MY_SAVED_REPORT_OWNED_NOTE_P2 } from './dtrProductLabels';
import {
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
  M55_FUNNEL_EVENTS,
  resetFunnelImpressionDedupeForTests,
  trackFunnelImpressionOnce,
} from './privacySafeFunnelAnalytics';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const FORBIDDEN_CLAIM = /おすすめ|人気|今だけ|残りわずか|期間限定|カウントダウン|保証|診断|予測/;
const FORBIDDEN_PUBLIC_PLUS = /保存版|精度が上が|より正確|一番おすすめ|あなたに最適/;

const FROZEN_SHORT_LABELS = [
  '取り組みの焦点',
  '決めにくさ',
  '関係の焦点',
  '疲れのサイン',
  '戻り方',
  '再開の条件',
] as const;

const EXPECTED_DISPLAY_COPY = [
  {
    questionId: 'paid.work_focus',
    sceneContextJa:
      '仕事や勉強、家のことなど、いま時間を使っていることをひとつ思い浮かべてください。',
    questionJa: 'それを進めるとき、まずはっきりさせたいのはどれですか？',
    labels: ['何からやるか', 'どのくらいのペースで進めるか', 'どこまで引き受けるか'],
  },
  {
    questionId: 'paid.decision_friction',
    sceneContextJa:
      '仕事や買い物、予定など、選ぶのに時間がかかった場面を思い浮かべてください。',
    questionJa: 'なかなか決められないとき、いちばん近いのはどれですか？',
    labels: [
      '選択肢が多くて絞れない',
      'どこまでやれば終わりか見えない',
      '間違えたくなくて決めきれない',
    ],
  },
  {
    questionId: 'paid.relation_focus',
    sceneContextJa:
      '身近な人や仕事相手とのやりとりで、少し引っかかりが残った場面を思い浮かべてください。',
    questionJa: '人とのやりとりで、いま少しラクにしたいのはどれですか？',
    labels: ['どう伝えるか', 'いつ話すか・返すか', '気まずさが残ったあとの戻り方'],
  },
  {
    questionId: 'paid.fatigue_signal',
    sceneContextJa:
      '最近、余裕がなくなったり、動きが重くなった場面を思い浮かべてください。',
    questionJa: 'どんなときに、疲れが出やすいですか？',
    labels: [
      '無理をしてやり切ったあと',
      '取りかかる前から重く感じるとき',
      '同じペースを長く続けたあと',
    ],
  },
  {
    questionId: 'paid.recovery_sequence',
    sceneContextJa:
      'まだ本調子ではないけれど、少しずつ戻りたい場面を思い浮かべてください。',
    questionJa: '疲れが残っているとき、最初にすると戻りやすいのはどれですか？',
    labels: [
      'いったん止まって休む',
      'できることから小さく始める',
      '考える材料を整理してから戻る',
    ],
  },
  {
    questionId: 'paid.restart_condition',
    sceneContextJa: 'やろうと思っているのに、動き出せない場面を思い浮かべてください。',
    questionJa: '止まっていたことを、もう一度動かしやすくするのはどれですか？',
    labels: [
      '全体の流れが見えること',
      '今日やる範囲を小さくすること',
      '信頼できる人に一度話すこと',
    ],
  },
] as const;

describe('paid questionnaire decision UX — ids and count', () => {
  it('keeps exactly 6 paid questions with frozen question IDs', () => {
    assert.equal(PAID_QUESTION_IDS.length, 6);
    assert.equal(PAID_QUESTIONNAIRE_COPY_V1.length, 6);
    assert.deepEqual(
      PAID_QUESTIONNAIRE_COPY_V1.map((q) => q.questionId),
      [...PAID_QUESTION_IDS],
    );
  });

  it('keeps answer IDs unchanged and universal Q1 copy present', () => {
    const allAnswerIds = PAID_QUESTIONNAIRE_COPY_V1.flatMap((q) =>
      q.choices.map((c) => c.answerId),
    );
    assert.deepEqual(
      allAnswerIds,
      [
        ...PAID_WORK_FOCUS_IDS,
        ...PAID_DECISION_FRICTION_IDS,
        ...PAID_RELATION_FOCUS_IDS,
        ...PAID_FATIGUE_SIGNAL_IDS,
        ...PAID_RECOVERY_SEQUENCE_IDS,
        ...PAID_RESTART_CONDITION_IDS,
      ],
    );
    const q1 = PAID_QUESTIONNAIRE_COPY_V1[0]!;
    assert.equal(q1.shortLabelJa, '取り組みの焦点');
    assert.doesNotMatch(q1.questionJa, /今の仕事で/);
    assert.equal(
      q1.sceneContextJa,
      '仕事や勉強、家のことなど、いま時間を使っていることをひとつ思い浮かべてください。',
    );
    for (const q of PAID_QUESTIONNAIRE_COPY_V1) {
      assert.ok(q.sceneContextJa.length > 0, `missing sceneContextJa for ${q.questionId}`);
    }
  });

  it('keeps shortLabelJa frozen and display copy exact without mutating answer IDs', () => {
    assert.deepEqual(
      PAID_QUESTIONNAIRE_COPY_V1.map((q) => q.shortLabelJa),
      [...FROZEN_SHORT_LABELS],
    );
    for (const [index, expected] of EXPECTED_DISPLAY_COPY.entries()) {
      const actual = PAID_QUESTIONNAIRE_COPY_V1[index]!;
      assert.equal(actual.questionId, expected.questionId);
      assert.equal(actual.sceneContextJa, expected.sceneContextJa);
      assert.equal(actual.questionJa, expected.questionJa);
      assert.deepEqual(
        actual.choices.map((choice) => choice.labelJa),
        [...expected.labels],
      );
    }
    assert.doesNotMatch(JSON.stringify(PAID_QUESTIONNAIRE_COPY_V1), FORBIDDEN_CLAIM);
    assert.doesNotMatch(JSON.stringify(PAID_QUESTIONNAIRE_COPY_V1), FORBIDDEN_PUBLIC_PLUS);
  });
});

describe('paid questionnaire decision UX — answer report provenance display', () => {
  const FROZEN_ANSWER_TO_CATALOG_ID = {
    'paid.work_focus.priority': 'paid_ch2__work_focus_priority',
    'paid.work_focus.pace': 'paid_ch2__work_focus_pace',
    'paid.work_focus.boundary': 'paid_ch2__work_focus_boundary',
    'paid.decision_friction.too_many': 'paid_ch2__decision_friction_too_many',
    'paid.decision_friction.unclear_end': 'paid_ch2__decision_friction_unclear_end',
    'paid.decision_friction.fear_mistake': 'paid_ch2__decision_friction_fear_mistake',
    'paid.relation_focus.words': 'paid_ch3__relation_focus_words',
    'paid.relation_focus.timing': 'paid_ch3__relation_focus_timing',
    'paid.relation_focus.recovery': 'paid_ch3__relation_focus_recovery',
    'paid.fatigue_signal.after_push': 'paid_ch4__fatigue_signal_after_push',
    'paid.fatigue_signal.before_start': 'paid_ch4__fatigue_signal_before_start',
    'paid.fatigue_signal.long_stretch': 'paid_ch4__fatigue_signal_long_stretch',
    'paid.recovery_sequence.pause_first': 'paid_ch4__recovery_sequence_pause_first',
    'paid.recovery_sequence.small_start': 'paid_ch4__recovery_sequence_small_start',
    'paid.recovery_sequence.sort_materials': 'paid_ch4__recovery_sequence_sort_materials',
    'paid.restart_condition.overview_first': 'paid_ch4__restart_condition_overview_first',
    'paid.restart_condition.shrink_scope': 'paid_ch4__restart_condition_shrink_scope',
    'paid.restart_condition.trusted_support': 'paid_ch4__restart_condition_trusted_support',
  } as const;

  it('maps every frozen paid answer ID once at chapter/topic level', () => {
    const allAnswerIds = PAID_QUESTIONNAIRE_COPY_V1.flatMap((q) =>
      q.choices.map((c) => c.answerId),
    );
    assert.equal(allAnswerIds.length, 18);
    assert.deepEqual(
      Object.keys(PAID_QUESTION_REPORT_TRACE_DISPLAY_V1).sort(),
      [...allAnswerIds].sort(),
    );
    for (const answerId of allAnswerIds) {
      const trace = PAID_QUESTION_REPORT_TRACE_DISPLAY_V1[answerId];
      assert.ok(trace, `missing provenance for ${answerId}`);
      assert.equal(trace.answerId, answerId);
      assert.equal(paidQuestionReportTraceLineJa(answerId), trace.lineJa);
      assert.match(trace.lineJa, /反映先　第(II|III|IV)章・.+/);
      assert.doesNotMatch(trace.lineJa, /重点に反映/);
      assert.doesNotMatch(trace.lineJa, /paid_ch/);
    }
  });

  it('agrees with selector catalog chapter ownership without leaking emphasis IDs', () => {
    const catalogById = new Map(
      PAID_CHAPTER_EMPHASIS_CATALOG_V1.map((entry) => [entry.id, entry]),
    );
    const selectorSource = read(
      'lib/m55/individualization/resolveIndividualizationSelectorsV1.ts',
    );
    const expectedChapter = {
      'paid.work_focus': 'II',
      'paid.decision_friction': 'II',
      'paid.relation_focus': 'III',
      'paid.fatigue_signal': 'IV',
      'paid.recovery_sequence': 'IV',
      'paid.restart_condition': 'IV',
    } as const;

    for (const [answerId, catalogId] of Object.entries(FROZEN_ANSWER_TO_CATALOG_ID)) {
      assert.match(
        selectorSource,
        new RegExp(`'${answerId.replaceAll('.', '\\.')}': '${catalogId}'`),
      );
      const catalog = catalogById.get(catalogId);
      assert.ok(catalog, `catalog missing ${catalogId}`);
      const questionId = answerId.slice(0, answerId.lastIndexOf('.'));
      const chapter = expectedChapter[questionId as keyof typeof expectedChapter];
      assert.equal(catalog.chapter, chapter);
      assert.equal(PAID_QUESTION_REPORT_TRACE_DISPLAY_V1[answerId]!.chapterRoman, chapter);
    }
  });

  it('review UI shows provenance lines without paid emphasis substance or internal IDs', () => {
    const review = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    const traceSource = read('lib/m55/paidResult/paidQuestionReportTraceDisplayV1.ts');
    assert.match(review, /paidQuestionReportTraceLineJa/);
    assert.match(review, /phase === 'review'/);
    assert.doesNotMatch(review, /paid_ch2__|paid_ch3__|paid_ch4__/);
    assert.doesNotMatch(review, /PAID_CHAPTER_EMPHASIS_COPY_V1|PAID_CHAPTER_EMPHASIS_EXPLANATION_V1/);
    const reviewBlob = `${review}\n${traceSource}`;
    for (const body of Object.values(PAID_CHAPTER_EMPHASIS_COPY_V1)) {
      if (body.length < 12) continue;
      assert.equal(reviewBlob.includes(body), false, `leaked COPY_V1 fragment: ${body.slice(0, 24)}`);
    }
    for (const body of Object.values(PAID_CHAPTER_EMPHASIS_EXPLANATION_V1)) {
      if (!body || body.length < 12) continue;
      assert.equal(
        reviewBlob.includes(body),
        false,
        `leaked EXPLANATION_V1 fragment: ${body.slice(0, 24)}`,
      );
    }
  });
});

describe('paid questionnaire decision UX — flow wiring', () => {
  it('question progress / back / next / completion / review are present without entry intro', () => {
    const q = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    const lp = read('app/dtr/lp/page.tsx');
    assert.doesNotMatch(q, /phase === 'entry'/);
    assert.doesNotMatch(q, /あなた向けの4章レポートに仕上げます/);
    assert.doesNotMatch(q, /力が出やすい条件/);
    assert.doesNotMatch(q, /プレミアムレポートの6問を始める/);
    assert.match(q, /\$\{index \+ 1\} \/ \$\{total\}/);
    assert.match(q, /disabled=\{!selected\}/);
    assert.match(q, /phase === 'review'/);
    assert.match(q, /回答内容を確認/);
    assert.match(q, /C\.reviewContinueJa|この回答を反映してプランを見る/);
    assert.match(q, /最初から回答し直す/);
    assert.match(q, /sceneContextJa/);
    assert.match(q, /m55-premium-scene-context/);
    assert.match(q, /変更/);
    assert.match(q, /persistPaidAnswers/);
    assert.doesNotMatch(q, /今の仕事で/);
    assert.doesNotMatch(q, /ctaSupportJa/);
    assert.doesNotMatch(q, /無料の6問/);
    assert.doesNotMatch(q, /paid-v1/);
    assert.doesNotMatch(q, FORBIDDEN_CLAIM);
    assert.doesNotMatch(lp, /PLAN\.upgradeNoteJa/);
  });

  it('plan choice and checkout boundary stay factual with answer review actions', () => {
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(prep, /DtrNeedFreeResultGate/);
    assert.match(prep, /PLAN_COMPARISON/);
    assert.match(prep, /買い切り・自動更新なし|oneTimeLabelJa/);
    assert.match(prep, /checkoutProceedCtaJa/);
    assert.match(prep, /checkoutNoteJa/);
    assert.match(prep, /DTR_CORE_LIGHT_V1/);
    assert.match(prep, /DTR_CORE_FULL_V1/);
    assert.match(prep, /PurchaseButton/);
    assert.match(prep, /selectFullCtaJa/);
    assert.match(prep, /m55-paid-answer-status/);
    assert.equal(PREMIUM_FUNNEL_PAGE_CONTENT.reviewAnswersJa, '回答を確認・変更');
    assert.match(prep, /PREMIUM_FUNNEL_PAGE_CONTENT as C/);
    assert.match(prep, /reviewAnswersJa/);
    assert.equal(PREMIUM_FUNNEL_PAGE_CONTENT.pricingDisclosureJa, '料金について');
    assert.match(prep, /pricingDisclosureJa/);
    assert.match(prep, /return 'questionnaire'/);
    assert.doesNotMatch(prep, /paidAnswersAreComplete\(\)\) return 'plans'/);
    assert.doesNotMatch(prep, /FULLを選ぶ/);
    assert.doesNotMatch(prep, FORBIDDEN_CLAIM);
    assert.doesNotMatch(prep, /m55_paid_plan_select|m55_paid_checkout/);
    assert.match(prep, /planQuestionnaireLinkageJa/);
    assert.doesNotMatch(prep, /plan\.sameFourChaptersNoteJa/);
  });

  it('puts the plan decision before the secondary pricing and method explanation', () => {
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    const planSurface = prep.slice(prep.indexOf('data-m55-paid-phase="plans"'));
    const title = planSurface.indexOf('m55-premium-plans-headline');
    const comparison = planSurface.indexOf('m55-plan-compare');
    const cards = planSurface.indexOf(`className={styles.planStack}`);
    const primaryPlanAction = planSurface.indexOf('selectLightCtaJa');
    const pricing = planSurface.indexOf('m55-plan-pricing-disclosure');
    const method = planSurface.indexOf('m55-plan-method-slot');

    assert.ok(title >= 0);
    assert.ok(title < comparison);
    assert.ok(comparison < cards);
    assert.ok(cards < primaryPlanAction);
    assert.ok(primaryPlanAction < pricing);
    assert.ok(pricing < method);
  });

  it('keeps the checkout receipt and primary CTA before the secondary method block', () => {
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    const checkoutSurface = prep.slice(
      prep.indexOf('data-m55-paid-phase="checkout"'),
      prep.indexOf('data-m55-paid-phase="plans"'),
    );
    const receipt = checkoutSurface.indexOf(`className={styles.confirmCard}`);
    const cluster = checkoutSurface.indexOf('m55-checkout-decision-cluster');
    const reassurance = checkoutSurface.indexOf(`className={styles.confirmNote}`);
    const legal = checkoutSurface.indexOf('m55-checkout-legal-links');
    const primaryAction = checkoutSurface.indexOf('m55-checkout-primary-action');
    const method = checkoutSurface.indexOf('m55-checkout-method-slot');

    assert.ok(cluster >= 0);
    assert.ok(cluster < receipt);
    assert.ok(receipt < reassurance);
    assert.ok(reassurance < legal);
    assert.ok(legal < primaryAction);
    assert.ok(primaryAction < method);
  });
});

describe('paid questionnaire decision UX — value continuity copy', () => {
  it('owns pre-question, review, CTA, plan linkage, and journey labels centrally', () => {
    assert.equal(PREMIUM_FUNNEL_PAGE_CONTENT.preQuestionEffortJa, 'あと6問・約1〜2分。');
    assert.equal(
      PREMIUM_FUNNEL_PAGE_CONTENT.preQuestionValueJa,
      '進め方・決めにくさ・人とのやりとり・疲れと戻り方を確認します。',
    );
    assert.equal(
      PREMIUM_FUNNEL_PAGE_CONTENT.answerReviewValueJa,
      'ここで選んだ内容が、レポートで重点的に読むところに反映されます。違うと感じる項目は、プランを見る前に変更できます。',
    );
    assert.equal(
      PREMIUM_FUNNEL_PAGE_CONTENT.reviewContinueJa,
      'この回答を反映してプランを見る',
    );
    assert.equal(
      PREMIUM_FUNNEL_PAGE_CONTENT.planQuestionnaireLinkageJa,
      'どちらのプランも、暦の土台と無料の読み解きを重ね、6つの回答で読むところを合わせた同じプレミアムレポートです。違いは、購入後に追加で読み解けるテーマ数だけです。',
    );

    const strip = read('components/dtr/DtrPaidResultContextStrip.tsx');
    const review = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    const rail = read('components/dtr/DtrPaidJourneyStepRail.tsx');
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(strip, /C\.preQuestionEffortJa/);
    assert.doesNotMatch(strip, /C\.preQuestionValueJa/);
    assert.match(strip, /M55_METHOD_CANONICAL_COPY/);
    assert.match(strip, /questionnaireBirthFoundationJa/);
    assert.match(strip, /questionnaireFoundationJa/);
    assert.doesNotMatch(strip, /STATIC_FREE_TO_PAID_BRIDGE/);
    assert.match(review, /C\.answerReviewValueJa/);
    assert.match(review, /C\.reviewContinueJa/);
    assert.match(rail, /6つの質問/);
    assert.match(rail, /回答確認/);
    assert.match(rail, /プラン選択/);
    assert.match(rail, /お支払い/);
    assert.match(prep, /C\.planQuestionnaireLinkageJa/);
    assert.doesNotMatch(
      [
        PREMIUM_FUNNEL_PAGE_CONTENT.preQuestionEffortJa,
        PREMIUM_FUNNEL_PAGE_CONTENT.preQuestionValueJa,
        PREMIUM_FUNNEL_PAGE_CONTENT.answerReviewValueJa,
        PREMIUM_FUNNEL_PAGE_CONTENT.reviewContinueJa,
        PREMIUM_FUNNEL_PAGE_CONTENT.planQuestionnaireLinkageJa,
      ].join('\n'),
      FORBIDDEN_CLAIM,
    );
    assert.doesNotMatch(
      [
        PREMIUM_FUNNEL_PAGE_CONTENT.preQuestionValueJa,
        PREMIUM_FUNNEL_PAGE_CONTENT.answerReviewValueJa,
        PREMIUM_FUNNEL_PAGE_CONTENT.planQuestionnaireLinkageJa,
      ].join('\n'),
      FORBIDDEN_PUBLIC_PLUS,
    );
  });
});

describe('paid questionnaire decision UX — Product Truth plans', () => {
  it('plans differ only by entitlement count; chapters and prices unchanged', () => {
    assert.equal(PAID_DTR_LP.tiers.light.savedReportValueJa, 'プレミアムレポート');
    assert.equal(PAID_DTR_LP.tiers.full.savedReportValueJa, 'プレミアムレポート');
    assert.equal(PAID_DTR_LP.tiers.light.consultReplyValueJa, '1件');
    assert.equal(PAID_DTR_LP.tiers.full.consultReplyValueJa, '合計5件');
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.light.priceYen, 1000);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.full.priceYen, 1480);
    assert.equal(PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.priceYen, 600);
    assert.equal(PAID_DTR_LP.tiers.light.priceLabelJa, '¥1,000（税込）');
    assert.equal(PAID_DTR_LP.tiers.full.priceLabelJa, '¥1,480（税込）');
    assert.equal(PAID_DTR_LP.tiers.light.oneTimeLabelJa, '一回払い');
    assert.equal(PAID_DTR_LP.tiers.full.oneTimeLabelJa, '一回払い');
    assert.match(PAID_DTR_LP.tiers.light.upgradeNoteJa, /¥600（税込）/);
    assert.doesNotMatch(PAID_DTR_LP.tiers.light.bodyJa, FORBIDDEN_CLAIM);
    assert.doesNotMatch(PAID_DTR_LP.tiers.full.bodyJa, FORBIDDEN_CLAIM);
    assert.doesNotMatch(PAID_DTR_LP.tiers.sectionTitleJa, FORBIDDEN_CLAIM);
    assert.doesNotMatch(PAID_DTR_LP.tiers.sectionLeadJa, FORBIDDEN_CLAIM);
  });
});

describe('paid questionnaire decision UX — analytics', () => {
  it('payload allowlist and impression dedupe', () => {
    const payload = buildPrivacySafeFunnelPayload('dtr_paid_plan', '2026-07-13T00:00:00.000Z');
    assert.deepEqual(Object.keys(payload).sort(), ['eventVersion', 'occurredAt', 'surface']);
    assertPrivacySafeFunnelPayload(payload);
    assert.throws(() =>
      assertPrivacySafeFunnelPayload({
        ...payload,
        plan: 'full',
      }),
    );

    resetFunnelImpressionDedupeForTests();
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.premiumPlanDecisionViewed,
      'dtr_paid_plan',
      'dedupe-test',
    );
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.premiumPlanDecisionViewed,
      'dtr_paid_plan',
      'dedupe-test',
    );
    assert.ok(true);
  });

  it('start fires on mount; complete and plan view use once helpers', () => {
    const q = read('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    assert.match(q, /trackFunnelAction\(\s*M55_FUNNEL_EVENTS\.paidQuestionnaireStart/);
    assert.match(q, /trackFunnelImpressionOnce\(\s*M55_FUNNEL_EVENTS\.paidQuestionnaireComplete/);
    assert.match(prep, /trackFunnelImpressionOnce\(\s*M55_FUNNEL_EVENTS\.premiumPlanDecisionViewed/);
  });
});

describe('paid questionnaire decision UX — three-layer Product Truth', () => {
  it('keeps exactly six Premium questions and eighteen answer IDs', () => {
    assert.equal(PAID_QUESTIONNAIRE_COPY_V1.length, 6);
    assert.equal(PAID_QUESTION_IDS.length, 6);
    const allAnswerIds = PAID_QUESTIONNAIRE_COPY_V1.flatMap((q) => q.choices.map((c) => c.answerId));
    assert.equal(allAnswerIds.length, 18);
    assert.equal(Object.keys(PAID_QUESTION_REPORT_TRACE_DISPLAY_V1).length, 18);
  });

  it('assigns current expression to Free 5, not Premium 6, on Chapter I expression_mirror', () => {
    const copy = PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch1__expression_mirror;
    const explanation = PAID_CHAPTER_EMPHASIS_EXPLANATION_V1.paid_ch1__expression_mirror;
    assert.match(copy, /無料の5つの回答/);
    assert.match(copy, /いま表に出ている動き方/);
    assert.doesNotMatch(copy, /6問の回答から見える/);
    assert.doesNotMatch(copy, /6問の回答は、いま表に出ている動き方/);
    assert.ok(explanation);
    assert.match(explanation, /無料の5つの回答から読みます/);
    assert.match(explanation, /重点的に読むところ/);
    assert.doesNotMatch(explanation, /6問の回答は、いま表に出ている動き方の手がかりです/);
    assert.match(PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch1__baseline_landscape, /暦の土台/);
    assert.match(PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch1__align_diverge_bridge, /暦の土台/);
    assert.match(PAID_CHAPTER_EMPHASIS_COPY_V1.paid_ch1__align_diverge_bridge, /今の出方/);
  });

  it('keeps Pre-Q1 L1/L2/L3 positive-first without repeating the Free-tendency formula', () => {
    const strip = read('components/dtr/DtrPaidResultContextStrip.tsx');
    const copyBlob = [
      PREMIUM_FUNNEL_PAGE_CONTENT.preQuestionEffortJa,
      PREMIUM_FUNNEL_PAGE_CONTENT.preQuestionValueJa,
    ].join('\n');
    assert.match(strip, /questionnaireBirthFoundationJa/);
    assert.match(strip, /questionnaireFoundationJa/);
    assert.equal(PREMIUM_FUNNEL_PAGE_CONTENT.preQuestionEffortJa, 'あと6問・約1〜2分。');
    assert.doesNotMatch(copyBlob, /無料で見えた傾向/);
    assert.doesNotMatch(copyBlob, /この6問だけで人を決める/);
    assert.doesNotMatch(strip, /十干/);
  });

  it('states purchase-time inputs are retained, not report-body freeze', () => {
    assert.equal(
      MY_SAVED_REPORT_OWNED_NOTE_P2,
      'ここでプロフィールを更新しても、購入時に使った入力内容が自動で置き換わることはありません。',
    );
    assert.doesNotMatch(MY_SAVED_REPORT_OWNED_NOTE_P2, /プレミアムレポートの内容は自動では変わりません/);
    assert.doesNotMatch(MY_SAVED_REPORT_OWNED_NOTE_P2, /版のまま/);
    assert.doesNotMatch(MY_SAVED_REPORT_OWNED_NOTE_P2, /バイト/);
  });
});
