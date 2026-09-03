'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DtrPaidQuestionnaireLayer from './DtrPaidQuestionnaireLayer';
import DtrNeedFreeResultGate from './DtrNeedFreeResultGate';
import DtrPaidJourneyStepRail from './DtrPaidJourneyStepRail';
import PurchaseButton from '../PurchaseButton';
import { CheckoutTrustRow } from '../checkout/CheckoutTrustRow';
import { DTR_CORE_FULL_V1, DTR_CORE_LIGHT_V1 } from '../../lib/oneTimeCheckout';
import { PAID_DTR_LP } from '../../lib/m55/paidDtrProductCopy';
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
import DtrMethodDifference from './DtrMethodDifference';
import M55MethodTrustLink from '../pages/M55MethodTrustLink';
import styles from './DtrPaidDecisionUx.module.css';
import { useBoundedReadiness } from '../../lib/m55/commercialUx/boundedAsync';
import BoundedRecoveryState from '../common/BoundedRecoveryState';

type GatePhase = 'need_free' | 'questionnaire' | 'plans' | 'checkout';
type PlanKey = 'light' | 'full';
type ReviewOrigin = 'plans' | 'checkout' | null;

const PURCHASE_RESTORE_KEY = 'm55_dtr_purchase_restore_v1';

function resolveInitialGate(ownerId?: string | null): GatePhase {
  const stage = readSelfFunnelStage(ownerId);
  const gate = resolveDtrLpGate(stage);
  if (gate === 'need_free') return 'need_free';
  return 'questionnaire';
}

function PaidAnswerStatusRow({ onReview }: { onReview: () => void }) {
  if (!paidAnswersAreComplete()) return null;
  return (
    <div className={styles.answerStatusRow} data-testid="m55-paid-answer-status">
      <p className={styles.answerStatusText}>{C.paidAnswersCompleteJa}</p>
      <button
        type="button"
        className={styles.answerStatusLink}
        data-testid="m55-paid-answer-review-link"
        onClick={onReview}
      >
        {C.reviewAnswersJa}
      </button>
    </div>
  );
}

export default function DtrPaidPurchasePrep() {
  const { user, isLoaded } = useUser();
  const ownerId = user?.id ?? null;
  const searchParams = useSearchParams();
  const checkoutCancelled = searchParams.get('checkout') === 'cancelled';
  const repurchaseMode = searchParams.get('repurchase') === '1';

  const [gate, setGate] = useState<GatePhase>('need_free');
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [repurchaseAcknowledged, setRepurchaseAcknowledged] = useState(false);
  const [repurchaseAckRequired, setRepurchaseAckRequired] = useState(false);
  const [reviewOrigin, setReviewOrigin] = useState<ReviewOrigin>(null);
  const checkoutShellRef = useRef<HTMLElement | null>(null);
  const prevGateRef = useRef<GatePhase | null>(null);
  const plan = PLAN_COMPARISON;
  const authReadiness = useBoundedReadiness(isLoaded);

  useEffect(() => {
    if (!isLoaded) return;
    setGate(resolveInitialGate(ownerId));
    try {
      const raw = sessionStorage.getItem(PURCHASE_RESTORE_KEY);
      if (raw) {
        const ctx = JSON.parse(raw) as { gate?: GatePhase; selectedPlan?: PlanKey };
        if (ctx.gate === 'checkout' && (ctx.selectedPlan === 'light' || ctx.selectedPlan === 'full')) {
          setSelectedPlan(ctx.selectedPlan);
          setGate('checkout');
        }
        sessionStorage.removeItem(PURCHASE_RESTORE_KEY);
      }
    } catch {
      /* no-op */
    }
    setHydrated(true);
  }, [isLoaded, ownerId]);

  useEffect(() => {
    const enteredCheckoutFromPlans =
      gate === 'checkout' && selectedPlan && prevGateRef.current === 'plans';
    prevGateRef.current = gate;

    if (!enteredCheckoutFromPlans) return;

    const shell = checkoutShellRef.current;
    if (!shell) return;

    requestAnimationFrame(() => {
      shell.scrollIntoView({ block: 'start' });
    });
  }, [gate, selectedPlan]);

  useEffect(() => {
    if (repurchaseMode) setRepurchaseAckRequired(true);
  }, [repurchaseMode]);

  useEffect(() => {
    if (gate !== 'plans') return;
    // Canonical Wave 1 decision visibility. Legacy m55_paid_plan_view constant
    // remains defined for compatibility; do not dual-emit that alias here.
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.premiumPlanDecisionViewed,
      'dtr_paid_plan',
      'dtr-premium-plan-decision-viewed',
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

  const statusBanner =
    checkoutCancelled ? (
      <p className={styles.statusBanner} role="status" data-testid="m55-checkout-cancelled-status">
        {C.checkoutCancelledStatusJa}
      </p>
    ) : null;

  const purchaseDecisionLegalLinks = PAID_DTR_LP.purchaseNotes.legalLinks.filter(
    (link) => link.href === '/legal/refund' || link.href === '/legal/tokushoho',
  );

  if (!hydrated) {
    if (authReadiness.timedOut) {
      return (
        <BoundedRecoveryState
          title={C.authRecoveryTitleJa}
          description={C.authRecoveryDescriptionJa}
          onRetry={() => window.location.reload()}
          escapeHref="/core"
          escapeLabel={C.authRecoveryEscapeLabelJa}
          support
        />
      );
    }
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
            if (reviewOrigin === 'checkout' && selectedPlan) {
              setGate('checkout');
            } else {
              setGate('plans');
            }
            setReviewOrigin(null);
          }}
        />
      </>
    );
  }

  if (gate === 'checkout' && selectedPlan) {
    const tier = selectedPlan === 'light' ? plan.light : plan.full;
    const productId = selectedPlan === 'light' ? DTR_CORE_LIGHT_V1 : DTR_CORE_FULL_V1;
    const requiresRepurchaseAck = repurchaseMode || repurchaseAckRequired;

    return (
      <>
        <PremiumExperienceSync shellPremium />
        <PremiumDecisionSurface stateId="premium.lp.checkout" testId="m55-premium-experience-checkout">
        <section
          ref={checkoutShellRef}
          className={`${styles.shell} m55-exp-reading`}
          data-m55-paid-phase="checkout"
          data-m55-paid-checkout
          data-m55-experience-surface="PURCHASE_CONFIRMATION"
          aria-label={C.checkoutAriaJa}
        >
          <ExperienceArchetypeSync paidPhase="checkout" />
        {statusBanner}
        <DtrPaidJourneyStepRail activeStep={3} />
        <PaidAnswerStatusRow
          onReview={() => {
            setReviewOrigin('checkout');
            setGate('questionnaire');
          }}
        />
        <p className={styles.overline}>{C.planOverlineJa}</p>
        <h3 className={styles.title}>{C.checkoutTitleJa}</h3>
        {requiresRepurchaseAck ? (
          <div className={styles.repurchaseNotice} data-testid="m55-repurchase-notice">
            <p className={styles.repurchaseLead}>
              {C.repurchaseLeadPrefixJa}
              <strong>{C.repurchaseLeadEmphasisJa}</strong>
              {C.repurchaseLeadSuffixJa}
            </p>
            <label className={styles.repurchaseAckLabel}>
              <input
                type="checkbox"
                checked={repurchaseAcknowledged}
                onChange={(e) => setRepurchaseAcknowledged(e.target.checked)}
              />
              <span>{C.repurchaseAckLabelJa}</span>
            </label>
          </div>
        ) : null}
        <div className={styles.checkoutDecisionCluster} data-testid="m55-checkout-decision-cluster">
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
          <p className={styles.confirmFuture} data-testid="m55-checkout-future-note">
            {PAID_DTR_LP.purchaseNotes.checkoutFutureJa}
          </p>
          <nav className={styles.legalLinks} aria-label={PAID_DTR_LP.purchaseNotes.legalLinksNavAriaLabelJa} data-testid="m55-checkout-legal-links">
            {purchaseDecisionLegalLinks.map((link) => (
              <Link key={link.href} href={link.href} className={styles.legalLink}>
                {link.labelJa}
              </Link>
            ))}
          </nav>
          <div className={styles.actions}>
            <div className={styles.primaryCtaWrap} data-testid="m55-checkout-primary-action">
              <PurchaseButton
                productId={productId}
                className="m55-lp-cta-btn"
                repurchaseAcknowledged={requiresRepurchaseAck ? repurchaseAcknowledged : undefined}
                purchaseRestoreContext={{ gate: 'checkout', selectedPlan }}
                disabled={requiresRepurchaseAck && !repurchaseAcknowledged}
                onRepurchaseAckRequired={() => setRepurchaseAckRequired(true)}
              >
                <span>{plan.checkoutProceedCtaJa}</span>
              </PurchaseButton>
            </div>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setGate('plans')}
            >
              {C.backToPlansJa}
            </button>
          </div>
        </div>
        <div className={styles.planNote}>
          <CheckoutTrustRow />
        </div>
        <div className={styles.planMethodSlot} data-testid="m55-checkout-method-slot">
          <M55MethodTrustLink surface="checkout" />
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
      {statusBanner}
      <DtrPaidJourneyStepRail activeStep={2} />
      <PaidAnswerStatusRow
        onReview={() => {
          setReviewOrigin('plans');
          setGate('questionnaire');
        }}
      />
      {repurchaseMode ? (
        <p className={styles.repurchasePlansLead} role="status" data-testid="m55-repurchase-plans-lead">
          {C.repurchasePlansLeadJa}
        </p>
      ) : null}
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
              trackFunnelAction(M55_FUNNEL_EVENTS.premiumPlanSelected, 'dtr_paid_plan', {
                planClass: 'light',
              });
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
              trackFunnelAction(M55_FUNNEL_EVENTS.premiumPlanSelected, 'dtr_paid_plan', {
                planClass: 'full',
              });
              setGate('checkout');
            }}
          >
            {plan.selectFullCtaJa}
          </button>
        </article>
      </div>
      <details className={styles.planUpgradeDisclosure} data-testid="m55-plan-pricing-disclosure">
        <summary className={styles.planUpgradeSummary}>{C.pricingDisclosureJa}</summary>
        <p className={styles.planUpgradeNote}>{plan.upgradeNoteJa}</p>
      </details>
      <div className={styles.planMethodSlot} data-testid="m55-plan-method-slot">
        <DtrMethodDifference />
      </div>
      </section>
      </PremiumDecisionSurface>
    </>
  );
}
