import { PublicShell } from '../_components/PublicShell';
import { PLAN_COMPARISON } from '../../lib/m55/commercialUx/planComparison';
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../../lib/m55/commercialUx/terminology';
import Link from 'next/link';
import styles from './pricing.module.css';

export const metadata = { title: '料金とプラン | M55' };

export default function PricingPage() {
  const plan = PLAN_COMPARISON;

  return (
    <PublicShell>
      <main className={styles.root}>
        <h1 className={styles.title}>料金とプラン</h1>

        <p className={styles.lead}>
          M55の{T.premiumProduct}は、{plan.light.publicName}と{plan.full.publicName}から選べます。
          詳しい違いと購入前の確認は、プレミアムレポートの案内ページで確認できます。
        </p>

        <p className={styles.note}>{plan.oneTimeNoteJa}</p>
        <p className={styles.note}>{plan.sameFourChaptersNoteJa}</p>

        <section className={styles.planGrid} aria-label="プラン比較">
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

        <section className={styles.upgradeSection}>
          <h2 className={styles.sectionTitle}>アップグレード</h2>
          <p className={styles.lead}>{plan.upgradeNoteJa}</p>
        </section>

        <p className={styles.linkRow}>
          <Link href="/dtr/lp">{T.premiumProduct}のプランを見る</Link>
        </p>
        <p className={styles.linkRow}>
          <Link href="/support">サポートを確認する</Link>
        </p>

        <p className={styles.disclaimer}>
          本ページは料金とサポート導線の案内です。医療・法律・投資等の助言ではありません。
        </p>
      </main>
    </PublicShell>
  );
}
