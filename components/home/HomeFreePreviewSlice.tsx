import { HOME_FREE_PREVIEW_FIXTURE } from '../../lib/m55/homePreviewFixtures';
import styles from './HomePanel.module.css';

type Props = {
  previewLabelJa: string;
};

export default function HomeFreePreviewSlice({ previewLabelJa }: Props) {
  const fixture = HOME_FREE_PREVIEW_FIXTURE;

  return (
    <div className={styles.freePreviewFragment} data-testid="m55-home-free-preview-slice">
      <p className={styles.previewAnnotation}>{previewLabelJa}</p>
      <article className={styles.freePreviewSheet}>
        <p className={styles.freePreviewPersona}>{fixture.personaNameJa}</p>
        <p className={styles.freePreviewQuality}>{fixture.qualityLabelJa}</p>
        <p className={styles.freePreviewSummary}>{fixture.summaryJa}</p>
      </article>
    </div>
  );
}
