import { PLAN_COMPARISON } from '../../lib/m55/commercialUx/planComparison';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import styles from './HomePrintSummary.module.css';

const PRODUCTION_URL = 'https://m-55.jp';

/**
 * Dedicated two-page A4 print summary for /home.
 * Screen-hidden; print CSS reveals this and hides interactive home chrome.
 */
export default function HomePrintSummary() {
  const home = TOP_FREE_ENTRY_PUBLIC_COPY.home;
  const plan = PLAN_COMPARISON;

  return (
    <div
      className={styles.root}
      data-testid="m55-home-print-summary"
      data-m55-home-print-summary
      aria-hidden="true"
    >
      <section className={styles.pageBlock} data-m55-print-page="1">
        <p className={styles.brand}>M55</p>
        <h1 className={styles.headline}>
          {home.heroTitleLine1Ja}
          {home.heroTitleLine2Ja}
        </h1>
        <p className={styles.lead}>{home.heroPosterSupportJa.replace(/\n/g, '')}</p>

        <h2 className={styles.sectionTitle}>無料結果で分かること</h2>
        <ul className={styles.list}>
          {home.outcomeBridgeItemsJa.map((item) => (
            <li key={item.titleJa}>
              <strong>{item.titleJa}</strong>
              <span>{item.bodyJa}</span>
            </li>
          ))}
        </ul>

        <h2 className={styles.sectionTitle}>無料とプレミアムの違い</h2>
        <div className={styles.twoCol}>
          <div>
            <p className={styles.colLabel}>無料結果</p>
            <ul className={styles.compactList}>
              {home.premiumValueBridgeFreeItemsJa.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className={styles.colLabel}>プレミアムレポート</p>
            <ul className={styles.compactList}>
              {home.premiumValueBridgePremiumItemsJa.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className={styles.url}>{PRODUCTION_URL}</p>
      </section>

      <section className={styles.pageBlock} data-m55-print-page="2">
        <p className={styles.brand}>M55</p>
        <h2 className={styles.sectionTitle}>プレミアムレポートの内容</h2>
        <p className={styles.lead}>{plan.sameFourChaptersNoteJa}</p>

        <div className={styles.twoCol}>
          <article className={styles.planCard}>
            <p className={styles.planName}>{plan.light.publicName}</p>
            <p className={styles.planPrice}>{plan.light.priceLabelJa}</p>
            <p className={styles.planMeta}>{plan.oneTimeLabelJa}</p>
            <ul className={styles.compactList}>
              {plan.light.includedItemsJa.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={styles.planAudience}>{plan.light.audienceJa}</p>
          </article>
          <article className={styles.planCard}>
            <p className={styles.badge}>{plan.fullRecommendBadgeJa}</p>
            <p className={styles.planName}>{plan.full.publicName}</p>
            <p className={styles.planPrice}>{plan.full.priceLabelJa}</p>
            <p className={styles.planMeta}>{plan.oneTimeLabelJa}</p>
            <ul className={styles.compactList}>
              {plan.full.includedItemsJa.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={styles.planAudience}>{plan.full.audienceJa}</p>
            <p className={styles.planDelta}>{plan.fullDeltaNoteJa}</p>
          </article>
        </div>

        <p className={styles.upgrade}>{plan.upgradeNoteJa}</p>
        <p className={styles.safety}>
          医療・法律・投資等の助言、診断、未来や結果の保証ではありません。購入前の確認はサポートと利用規約をご参照ください。
        </p>
        <p className={styles.footerRefs}>
          サポート / 利用規約 / プライバシー — {PRODUCTION_URL}
        </p>
        <p className={styles.copyright}>© {new Date().getFullYear()} M55</p>
      </section>
    </div>
  );
}
