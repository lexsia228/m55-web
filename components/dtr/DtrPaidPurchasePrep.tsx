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
import ExperienceArchetypeSync from '../shell/ExperienceArchetypeSync';
import PremiumExperienceSync from '../shell/PremiumExperienceSync';
import { PREMIUM_FUNNEL_PAGE_CONTENT as C } from '../../lib/m55/commercialUx/experience/pageContent/premiumFunnelCopy';
import PremiumDecisionSurface from '../experience/PremiumDecisionSurface';
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

  const paidPhase =
    gate === 'need_free'
      ? 'need_free'
      : gate === 'questionnaire'
        ? 'questionnaire'
        : gate === 'plans'
          ? 'plans'
          : gate === 'checkout'
            ? 'checkout'
            : 'other';

  if (!hydrated) {
    return (
      <>
        <PremiumExperienceSync shellPremium />
        <section className={styles.shell} data-m55-paid-phase="loading" aria-busy="true">
          <ExperienceArchetypeSync paidPhase="other" />
          <p className={styles.lead}>{C.loadingJa}</p>
        </section>
      </>
    );
  }

  if (gate === 'need_free') {
    return (
      <>
        <PremiumExperienceSync shellPremium />
        <ExperienceArchetypeSync paidPhase="need_free" />
        <DtrNeedFreeResultGate />
      </>
    );
  }

  if (gate === 'questionnaire') {
    return (
      <>
        <PremiumExperienceSync shellPremium />
        <ExperienceArchetypeSync paidPhase={paidPhase} />
        <DtrPaidQuestionnaireLayer
          onComplete={() => {
            setSelectedPlan(null);
            setGate('plans');
          }}
        />
      </>
    );
  }

  if (gate === 'checkout' && selectedPlan) {
    const tier = selectedPlan === 'light' ? plan.light : plan.full;
    const productId = selectedPlan === 'light' ? DTR_CORE_LIGHT_V1 : DTR_CORE_FULL_V1;

    return (
      <>
        <PremiumExperienceSync shellPremium />
        <PremiumDecisionSurface stateId="premium.lp.checkout" testId="m55-premium-experience-checkout">
        <section
          className={`${styles.shell} m55-exp-reading`}
          data-m55-paid-phase="checkout"
          data-m55-paid-checkout
          data-m55-experience-surface="PURCHASE_CONFIRMATION"
          aria-label={C.checkoutAriaJa}
        >
          <ExperienceArchetypeSync paidPhase="checkout" />
        <p className={styles.overline}>{C.planOverlineJa}</p>
        <h3 className={styles.title}>{C.checkoutTitleJa}</h3>
        <div className={styles.confirmCard}>
          <div className={styles.confirmRow}>
            <span>{C.selectedPlanLabelJa}</span>
            <strong>{tier.publicName}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>{C.priceLabelJa}</span>
            <strong>{tier.priceLabelJa}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>{C.paymentLabelJa}</span>
            <strong>{plan.oneTimeLabelJa}</strong>
          </div>
          <div className={styles.confirmRow}>
            <span>{plan.includedHeadingJa}</span>
            <strong>{buildIncludedProductSummaryJa(tier)}</strong>
          </div>
        </div>
        <p className={styles.confirmNote}>{C.checkoutNoteJa}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setGate('plans')}
          >
            {C.backToPlansJa}
          </button>
          <PurchaseButton productId={productId} className="m55-lp-cta-btn">
            <span>{plan.checkoutProceedCtaJa}</span>
          </PurchaseButton>
        </div>
        <div className={styles.planNote}>
          <CheckoutTrustRow />
        </div>
        </section>
        </PremiumDecisionSurface>
      </>
    );
  }

  return (
    <>
      <PremiumExperienceSync shellPremium />
      <PremiumDecisionSurface stateId="premium.lp.plans" testId="m55-premium-experience-plans">
      <section
        className={`${styles.shell} m55-exp-reading`}
        data-m55-paid-phase="plans"
        data-testid="m55-dtr-plan-selection"
        data-m55-experience-surface="PRODUCT_DECISION"
        aria-label={C.planSelectAriaJa}
      >
        <ExperienceArchetypeSync paidPhase="plans" />
      <p className={styles.overline}>{C.planOverlineJa}</p>
      <h3 className={styles.title} data-testid="m55-premium-plans-headline">
        {C.planTitleJa}
      </h3>
      <p className={styles.planLead}>{plan.sameFourChaptersNoteJa}</p>
      <div className={styles.planCompare} data-testid="m55-plan-compare">
        <p className={styles.planCompareHeading}>{plan.compactDifference.headingJa}</p>
        <div className={styles.planCompareGrid}>
          <div className={styles.planCompareCell} data-testid="m55-plan-compare-light">
            <span className={styles.planCompareName}>{plan.compactDifference.light.nameJa}</span>
            <span className={styles.planComparePrice}>{plan.compactDifference.light.priceLabelJa}</span>
            <span className={styles.planCompareDelta}>{plan.compactDifference.light.differenceJa}</span>
          </div>
          <div className={styles.planCompareCell} data-testid="m55-plan-compare-full">
            <span className={styles.planCompareName}>{plan.compactDifference.full.nameJa}</span>
            <span className={styles.planComparePrice}>{plan.compactDifference.full.priceLabelJa}</span>
            <span className={styles.planCompareDelta}>{plan.compactDifference.full.differenceJa}</span>
          </div>
        </div>
        <p className={styles.planCompareShared}>{plan.compactDifference.sharedJa}</p>
      </div>
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
      </PremiumDecisionSurface>
    </>
  );
}
