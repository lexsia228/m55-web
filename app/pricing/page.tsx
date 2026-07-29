import { PublicShell } from '../_components/PublicShell';
import { PLAN_COMPARISON } from '../../lib/m55/commercialUx/planComparison';
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../../lib/m55/commercialUx/terminology';
import { PRODUCT_PRICING_PAGE_CONTENT as C } from '../../lib/m55/commercialUx/experience/pageContent/productPricingCopy';
import Link from 'next/link';
import M55MethodTrustLink from '../../components/pages/M55MethodTrustLink';
import styles from './pricing.module.css';

export const metadata = { title: '料金とプラン | M55' };

export default function PricingPage() {
  const plan = PLAN_COMPARISON;

  return (
    <PublicShell>
      <main className={`${styles.root} m55-exp-reading`} data-m55-experience-surface="PRODUCT_DECISION">
        <h1 className={styles.title} data-testid="m55-pricing-headline">
          {C.titleJa}
        </h1>

        <p className={styles.lead}>
          {C.leadPrefixJa}
          {T.premiumProduct}
          {C.leadMidJa}
          {plan.light.publicName}
          {C.leadJoinJa}
          {plan.full.publicName}
          {C.leadSuffixJa}
        </p>

        <p className={styles.note}>{plan.oneTimeNoteJa}</p>
        <p className={styles.note}>{plan.sameFourChaptersNoteJa}</p>

        <section className={styles.planGrid} aria-label={C.planCompareAriaJa}>
          <article className={styles.planCard} data-testid="m55-pricing-plan-light">
            <h2 className={styles.planName}>{plan.light.publicName}</h2>
            <p className={styles.planPrice}>{plan.light.priceLabelJa}</p>
            <p className={styles.planOneTime}>{plan.oneTimeLabelJa}</p>
            <p className={styles.planIncludedHeading}>{plan.includedHeadingJa}</p>
            <ul className={styles.planIncludedList}>
              {plan.light.includedItemsJa.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={styles.planAudience}>{plan.light.audienceJa}</p>
          </article>
          <article className={`${styles.planCard} ${styles.planCardFeatured}`} data-testid="m55-pricing-plan-full">
            <span className={styles.planBadge}>{plan.fullRecommendBadgeJa}</span>
            <h2 className={styles.planName}>{plan.full.publicName}</h2>
            <p className={styles.planPrice}>{plan.full.priceLabelJa}</p>
            <p className={styles.planOneTime}>{plan.oneTimeLabelJa}</p>
            <p className={styles.planIncludedHeading}>{plan.includedHeadingJa}</p>
            <ul className={styles.planIncludedList}>
              {plan.full.includedItemsJa.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={styles.planUpgrade}>{plan.fullDeltaNoteJa}</p>
            <p className={styles.planAudience}>{plan.full.audienceJa}</p>
          </article>
        </section>

        <M55MethodTrustLink />

        <section className={styles.upgradeSection}>
          <h2 className={styles.sectionTitle}>{C.upgradeHeadingJa}</h2>
          <p className={styles.lead}>{plan.upgradeNoteJa}</p>
        </section>

        <p className={styles.linkRow}>
          <Link href="/dtr/lp">
            {T.premiumProduct}
            {C.viewPlansSuffixJa}
          </Link>
        </p>
        <p className={styles.linkRow}>
          <Link href="/support">{C.supportLinkJa}</Link>
        </p>

        <p className={styles.disclaimer}>{C.disclaimerJa}</p>
      </main>
    </PublicShell>
  );
}
