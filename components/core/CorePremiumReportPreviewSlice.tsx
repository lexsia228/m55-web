import { HOME_PREMIUM_PREVIEW_FIXTURE } from '../../lib/m55/homePreviewFixtures';
import styles from './CoreExperience.module.css';

type Props = {
  headingJa: string;
  bodyJa: string;
};

/**
 * Sanitized Premium Report preview for the conversion bridge.
 * Uses existing fixture copy — no live report, wallet, or fabricated claims.
 */
export default function CorePremiumReportPreviewSlice({ headingJa, bodyJa }: Props) {
  const fixture = HOME_PREMIUM_PREVIEW_FIXTURE;

  return (
    <div className={styles.bridgePremiumPreview} data-testid="m55-premium-report-preview">
      <h3 className={styles.conversionBridgeChaptersHeading}>{headingJa}</h3>
      <p className={styles.conversionBridgeLayerBody}>{bodyJa}</p>
      <article className={styles.bridgePremiumPreviewSheet} aria-label="プレミアムレポートの画面イメージ">
        <p className={styles.bridgePremiumPreviewProduct}>{fixture.productTitleJa}</p>
        <div className={styles.bridgePremiumPreviewTabs} aria-hidden>
          {fixture.chapters.map((ch) => (
            <span
              key={ch.roman}
              className={`${styles.bridgePremiumPreviewTab}${
                ch.roman === fixture.activeChapterRoman
                  ? ` ${styles.bridgePremiumPreviewTabActive}`
                  : ''
              }`}
            >
              {ch.roman} {ch.titleJa}
            </span>
          ))}
        </div>
        <h4 className={styles.bridgePremiumPreviewChapter}>
          {fixture.activeChapterRoman} {fixture.activeChapterTitleJa}
        </h4>
        <p className={styles.bridgePremiumPreviewBody}>{fixture.chapterBodyJa}</p>
      </article>
    </div>
  );
}
