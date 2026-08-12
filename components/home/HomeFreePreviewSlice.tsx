import { HOME_FREE_PREVIEW_FIXTURE } from '../../lib/m55/homePreviewFixtures';
import styles from './HomePanel.module.css';

type Props = {
  previewLabelJa: string;
};

/**
 * Sample of the free result. Content is verbatim engine output for a fixed
 * sample profile (see HOME_FREE_PREVIEW_SOURCE) so HOME cannot promise less
 * than /core delivers. Always labelled as a sample — never a live reading.
 */
export default function HomeFreePreviewSlice({ previewLabelJa }: Props) {
  const fixture = HOME_FREE_PREVIEW_FIXTURE;

  return (
    <div className={styles.freePreviewFragment} data-testid="m55-home-free-preview-slice">
      <p className={styles.previewAnnotation}>{previewLabelJa}</p>
      <article className={styles.freePreviewSheet}>
        <p className={styles.freePreviewPersona}>{fixture.personaNameJa}</p>
        <p className={styles.freePreviewQuality}>{fixture.qualityLabelJa}</p>
        <p className={styles.freePreviewHeadline}>{fixture.headlineJa}</p>

        <div className={styles.freePreviewScene}>
          <p className={styles.freePreviewSceneLabel}>{fixture.sceneLabelJa}</p>
          <p className={styles.freePreviewSummary}>{fixture.sceneBodyJa}</p>
        </div>

        <div className={styles.freePreviewConditionGrid}>
          <div className={styles.freePreviewConditionBlock}>
            <p className={styles.freePreviewConditionTitle}>{fixture.strengthHeadingJa}</p>
            <ul className={styles.freePreviewConditionList}>
              {fixture.strengthConditionsJa.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </div>
          <div className={styles.freePreviewConditionBlock}>
            <p className={styles.freePreviewConditionTitle}>{fixture.loadHeadingJa}</p>
            <ul className={styles.freePreviewConditionList}>
              {fixture.loadConditionsJa.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className={styles.freePreviewOpenQuestion}>{fixture.openQuestionJa}</p>
      </article>
    </div>
  );
}
