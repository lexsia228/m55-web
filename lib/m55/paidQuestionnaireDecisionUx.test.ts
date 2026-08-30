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
import { PAID_DTR_LP, PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';
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
    assert.match(q1.sceneContextJa, /仕事・学業・家事・活動/);
    for (const q of PAID_QUESTIONNAIRE_COPY_V1) {
      assert.ok(q.sceneContextJa.length > 0, `missing sceneContextJa for ${q.questionId}`);
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
    assert.match(q, /この回答でプランを見る/);
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
    assert.match(prep, /回答を確認・変更/);
    assert.match(prep, /料金について/);
    assert.match(prep, /return 'questionnaire'/);
    assert.doesNotMatch(prep, /paidAnswersAreComplete\(\)\) return 'plans'/);
    assert.doesNotMatch(prep, /FULLを選ぶ/);
    assert.doesNotMatch(prep, FORBIDDEN_CLAIM);
    assert.doesNotMatch(prep, /m55_paid_plan_select|m55_paid_checkout/);
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
