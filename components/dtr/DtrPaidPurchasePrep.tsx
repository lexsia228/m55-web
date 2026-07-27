'use client';

import { useEffect, useState } from 'react';
import DtrPaidQuestionnaireLayer from './DtrPaidQuestionnaireLayer';
import DtrNeedFreeResultGate from './DtrNeedFreeResultGate';
import PurchaseButton from '../PurchaseButton';
import { CheckoutTrustRow } from '../checkout/CheckoutTrustRow';
import { PAID_DTR_LP } from '../../lib/m55/paidDtrProductCopy';
import { DTR_CORE_FULL_V1, DTR_CORE_LIGHT_V1 } from '../../lib/oneTimeCheckout';
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

type Props = {
  children: React.ReactNode;
};

type GatePhase = 'need_free' | 'questionnaire' | 'plans' | 'checkout';
type PlanKey = 'light' | 'full';

function resolveInitialGate(): GatePhase {
  const stage = readSelfFunnelStage(null);
  const gate = resolveDtrLpGate(stage);
  if (gate === 'need_free') return 'need_free';
  if (gate === 'plan_selection' || paidAnswersAreComplete()) return 'plans';
  return 'questionnaire';
}

export default function DtrPaidPurchasePrep({ children: _children }: Props) {
  const [gate, setGate] = useState<GatePhase>('need_free');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [hydrated, setHydrated] = useState(false);

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
        freeResultReady
        onComplete={() => {
          setSelectedPlan(null);
          setGate('plans');
        }}
      />
    );
  }

  const light = PAID_DTR_LP.tiers.light;
  const full = PAID_DTR_LP.tiers.full;

  if (gate === 'checkout' && selectedPlan) {
    const plan = selectedPlan === 'light' ? light : full;
    const productId = selectedPlan === 'light' ? DTR_CORE_LIGHT_V1 : DTR_CORE_FULL_V1;
    const included =
      selectedPlan === 'light'
        ? `${light.savedReportValueJa} + 追加読み解き${light.consultReplyValueJa}`
        : `${full.savedReportValueJa} + 追加読み解き ${full.consultReplyValueJa}`;

    return (
      <section className={styles.shell} data-m55-paid-phase="checkout" aria-label="支払い前の確認">
        <p className={styles.overline}>プレミアムレポート</p>
        <h3 className={styles.title}>支払い画面へ進む前に</h3>
        <div className={styles.confirmCard}>
          <div className={styles.confirmRow}>
            <span>選択したプラン</span>
            <strong>{plan.planNameJa}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>価格</span>
            <strong>{plan.priceLabelJa}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>お支払い</span>
            <strong>{plan.oneTimeLabelJa}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>含まれる内容</span>
            <strong>{included}</strong>
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
            <span>支払い画面へ進む</span>
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
      <h3 className={styles.title}>{PAID_DTR_LP.tiers.sectionTitleJa}</h3>
      <p className={styles.planLead}>{PAID_DTR_LP.tiers.sectionLeadJa}</p>
      <div className={styles.planStack}>
        <article
          className={`${styles.planCard}${selectedPlan === 'light' ? ` ${styles.planCardSelected}` : ''}`}
        >
          <div className={styles.planHeader}>
            <span className={styles.planName}>{light.planNameJa}</span>
            <span className={styles.planPrice}>{light.priceLabelJa}</span>
          </div>
          <div className={styles.planMeta}>
            <div>{light.oneTimeLabelJa}</div>
            <div>
              {light.savedReportLabelJa} {light.savedReportValueJa}
            </div>
            <div>
              {light.consultReplyLabelJa} {light.consultReplyValueJa}
            </div>
            <div>あとからFULL化可能</div>
          </div>
          <p className={styles.planAudience}>{light.bodyJa}</p>
          <p className={styles.planNote}>{light.upgradeNoteJa}</p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setSelectedPlan('light');
              trackFunnelAction(M55_FUNNEL_EVENTS.premiumPlanSelected, 'dtr_paid_plan');
              trackFunnelAction(M55_FUNNEL_EVENTS.paidPlanSelected, 'dtr_paid_plan');
              setGate('checkout');
            }}
          >
            {light.ctaLabelJa}
          </button>
        </article>

        <article
          className={`${styles.planCard}${selectedPlan === 'full' ? ` ${styles.planCardSelected}` : ''}`}
        >
          <div className={styles.planHeader}>
            <span className={styles.planName}>{full.planNameJa}</span>
            <span className={styles.planPrice}>{full.priceLabelJa}</span>
          </div>
          <div className={styles.planMeta}>
            <div>{full.oneTimeLabelJa}</div>
            <div>
              {full.savedReportLabelJa} {full.savedReportValueJa}
            </div>
            <div>
              {full.consultReplyLabelJa} {full.consultReplyValueJa}
            </div>
          </div>
          <p className={styles.planAudience}>{full.bodyJa}</p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              setSelectedPlan('full');
              trackFunnelAction(M55_FUNNEL_EVENTS.premiumPlanSelected, 'dtr_paid_plan');
              trackFunnelAction(M55_FUNNEL_EVENTS.paidPlanSelected, 'dtr_paid_plan');
              setGate('checkout');
            }}
          >
            {full.ctaLabelJa}
          </button>
        </article>
      </div>
    </section>
  );
}
