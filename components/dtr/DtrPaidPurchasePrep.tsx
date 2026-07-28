'use client';

import { useEffect, useState } from 'react';
import DtrPaidQuestionnaireLayer from './DtrPaidQuestionnaireLayer';
import DtrNeedFreeResultGate from './DtrNeedFreeResultGate';
import PurchaseButton from '../PurchaseButton';
import { CheckoutTrustRow } from '../checkout/CheckoutTrustRow';
import { DTR_CORE_FULL_V1, DTR_CORE_LIGHT_V1 } from '../../lib/oneTimeCheckout';
import {
  buildIncludedProductSummaryJa,
  PLAN_COMPARISON,
} from '../../lib/m55/commercialUx/planComparison';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import {
  paidAnswersAreComplete,
  readSelfFunnelStage,
} from '../../lib/m55/selfFunnel/selfFunnelClientStore';
import { resolveDtrLpGate } from '../../lib/m55/selfFunnel/selfFunnelRuntimeState';
import styles from './DtrPaidDecisionUx.module.css';

type GatePhase = 'need_free' | 'questionnaire' | 'plans' | 'checkout';
type PlanKey = 'light' | 'full';

function resolveInitialGate(): GatePhase {
  const stage = readSelfFunnelStage(null);
  const gate = resolveDtrLpGate(stage);
  if (gate === 'need_free') return 'need_free';
  if (gate === 'plan_selection' || paidAnswersAreComplete()) return 'plans';
  return 'questionnaire';
}

export default function DtrPaidPurchasePrep() {
  const [gate, setGate] = useState<GatePhase>('need_free');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const plan = PLAN_COMPARISON;

  useEffect(() => {
    setGate(resolveInitialGate());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (gate !== 'plans') return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.paidPlanView,
      'dtr_paid_plan',
      'dtr-paid-plan-view',
    );
  }, [gate]);

  if (!hydrated) {
    return (
      <section className={styles.shell} data-m55-paid-phase="loading" aria-busy="true">
        <p className={styles.lead}>読み込み中…</p>
      </section>
    );
  }

  if (gate === 'need_free') {
    return <DtrNeedFreeResultGate />;
  }

  if (gate === 'questionnaire') {
    return (
      <DtrPaidQuestionnaireLayer
        onComplete={() => {
          setSelectedPlan(null);
          setGate('plans');
        }}
      />
    );
  }

  if (gate === 'checkout' && selectedPlan) {
    const tier = selectedPlan === 'light' ? plan.light : plan.full;
    const productId = selectedPlan === 'light' ? DTR_CORE_LIGHT_V1 : DTR_CORE_FULL_V1;

    return (
      <section
        className={styles.shell}
        data-m55-paid-phase="checkout"
        data-m55-paid-checkout
        aria-label="支払い前の確認"
      >
        <p className={styles.overline}>プレミアムレポート</p>
        <h3 className={styles.title}>支払い画面へ進む前に</h3>
        <div className={styles.confirmCard}>
          <div className={styles.confirmRow}>
            <span>選択したプラン</span>
            <strong>{tier.publicName}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>価格</span>
            <strong>{tier.priceLabelJa}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>お支払い</span>
            <strong>{plan.oneTimeLabelJa}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>{plan.includedHeadingJa}</span>
            <strong>{buildIncludedProductSummaryJa(tier)}</strong>
          </div>
        </div>
        <p className={styles.confirmNote}>次の画面で支払い内容を確認できます。</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setGate('plans')}
          >
            プラン選択に戻る
          </button>
          <PurchaseButton productId={productId} className="m55-lp-cta-btn">
            <span>{plan.checkoutProceedCtaJa}</span>
          </PurchaseButton>
        </div>
        <div className={styles.planNote}>
          <CheckoutTrustRow />
        </div>
      </section>
    );
  }

  return (
    <section
      className={styles.shell}
      data-m55-paid-phase="plans"
      data-testid="m55-dtr-plan-selection"
      aria-label="プレミアムレポートのプラン選択"
    >
      <p className={styles.overline}>プレミアムレポート</p>
      <h3 className={styles.title}>自分に合うプランを選ぶ</h3>
      <p className={styles.planLead}>{plan.sameFourChaptersNoteJa}</p>
      <div className={styles.planStack}>
        <article
          className={`${styles.planCard}${selectedPlan === 'light' ? ` ${styles.planCardSelected}` : ''}`}
          data-testid="m55-dtr-plan-light"
        >
          <div className={styles.planHeader}>
            <span className={styles.planName}>{plan.light.publicName}</span>
            <span className={styles.planPrice}>{plan.light.priceLabelJa}</span>
          </div>
          <p className={styles.planOneTime}>{plan.oneTimeLabelJa}</p>
          <p className={styles.planIncludedHeading}>{plan.includedHeadingJa}</p>
          <ul className={styles.planIncludedList}>
            {plan.light.includedItemsJa.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={styles.planAudience}>{plan.light.audienceJa}</p>
          <button
            type="button"
            className={styles.commercialPrimaryBtn}
            onClick={() => {
              setSelectedPlan('light');
              trackFunnelAction(M55_FUNNEL_EVENTS.premiumPlanSelected, 'dtr_paid_plan');
              trackFunnelAction(M55_FUNNEL_EVENTS.paidPlanSelected, 'dtr_paid_plan');
              setGate('checkout');
            }}
          >
            {plan.selectLightCtaJa}
          </button>
        </article>

        <article
          className={`${styles.planCard}${selectedPlan === 'full' ? ` ${styles.planCardSelected}` : ''}`}
          data-testid="m55-dtr-plan-full"
        >
          <span className={styles.planRecommendBadge}>{plan.fullRecommendBadgeJa}</span>
          <div className={styles.planHeader}>
            <span className={styles.planName}>{plan.full.publicName}</span>
            <span className={styles.planPrice}>{plan.full.priceLabelJa}</span>
          </div>
          <p className={styles.planOneTime}>{plan.oneTimeLabelJa}</p>
          <p className={styles.planIncludedHeading}>{plan.includedHeadingJa}</p>
          <ul className={styles.planIncludedList}>
            {plan.full.includedItemsJa.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={styles.planNote}>{plan.fullDeltaNoteJa}</p>
          <p className={styles.planAudience}>{plan.full.audienceJa}</p>
          <button
            type="button"
            className={styles.commercialPrimaryBtn}
            onClick={() => {
              setSelectedPlan('full');
              trackFunnelAction(M55_FUNNEL_EVENTS.premiumPlanSelected, 'dtr_paid_plan');
              trackFunnelAction(M55_FUNNEL_EVENTS.paidPlanSelected, 'dtr_paid_plan');
              setGate('checkout');
            }}
          >
            {plan.selectFullCtaJa}
          </button>
        </article>
      </div>
      <p className={styles.planUpgradeNote}>{plan.upgradeNoteJa}</p>
    </section>
  );
}
