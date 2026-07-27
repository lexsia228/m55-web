import type { FreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import { HOME_PREMIUM_PREVIEW_FIXTURE } from '../../lib/m55/homePreviewFixtures';
import styles from './CoreExperience.module.css';

type Props = {
  headingJa: string;
  bodyJa: string;
  lockedHeadingsJa: readonly string[];
  openLoopJa: string;
};

/**
 * Personalized Premium preview — deterministic headings from free result; details locked.
 */
export default function CorePremiumReportPreviewSlice({
  headingJa,
  bodyJa,
  lockedHeadingsJa,
  openLoopJa,
}: Props) {
  const fixture = HOME_PREMIUM_PREVIEW_FIXTURE;

  return (
    <div className={styles.bridgePremiumPreview} data-testid="m55-premium-report-preview">
      <p className={styles.conversionBridgeOpenLoop}>{openLoopJa}</p>
      <h3 className={styles.conversionBridgeChaptersHeading}>{headingJa}</h3>
      <p className={styles.conversionBridgeLayerBody}>{bodyJa}</p>
      <ul className={styles.bridgeLockedHeadingsList} data-testid="m55-premium-locked-headings">
        {lockedHeadingsJa.map((heading) => (
          <li key={heading} className={styles.bridgeLockedHeadingItem}>
            <span className={styles.bridgeLockedHeadingIcon} aria-hidden>
              ◆
            </span>
            <span>{heading}</span>
          </li>
        ))}
      </ul>
      <article
        className={styles.bridgePremiumPreviewSheet}
        aria-label="プレミアムレポートの画面イメージ"
      >
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
