import { HOME_PREMIUM_PREVIEW_FIXTURE } from '../../lib/m55/homePreviewFixtures';
import styles from './HomePanel.module.css';

type Props = {
  previewLabelJa: string;
};

export default function HomePremiumPreviewSlice({ previewLabelJa }: Props) {
  const fixture = HOME_PREMIUM_PREVIEW_FIXTURE;

  return (
    <div className={styles.premiumPreviewStage} data-testid="m55-home-premium-preview-slice">
      <p className={styles.premiumPreviewAnnotation}>{previewLabelJa}</p>
      <article className={styles.premiumPreviewProductSheet}>
        <p className={styles.premiumPreviewProduct}>{fixture.productTitleJa}</p>
        <div className={styles.premiumChapterRow} aria-label="章ラベル">
          {fixture.chapters.map((ch) => (
            <span
              key={ch.roman}
              className={`${styles.premiumChapterTab}${
                ch.roman === fixture.activeChapterRoman ? ` ${styles.premiumChapterTabActive}` : ''
              }`}
            >
              {ch.roman} {ch.titleJa}
            </span>
          ))}
        </div>
        <h3 className={styles.premiumChapterHeading}>
          {fixture.activeChapterRoman} {fixture.activeChapterTitleJa}
        </h3>
        <div className={styles.premiumChapterBodyClip}>
          <p className={styles.premiumChapterBody}>{fixture.chapterBodyJa}</p>
        </div>
      </article>
    </div>
  );
}
