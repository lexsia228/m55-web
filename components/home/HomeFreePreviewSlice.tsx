import { HOME_FREE_PREVIEW_FIXTURE } from '../../lib/m55/homePreviewFixtures';
import styles from './HomePanel.module.css';

type Props = {
  previewLabelJa: string;
};

export default function HomeFreePreviewSlice({ previewLabelJa }: Props) {
  const fixture = HOME_FREE_PREVIEW_FIXTURE;

  return (
    <div className={styles.previewFrameIvory} data-testid="m55-home-free-preview-slice">
      <p className={styles.previewMetaLabel}>{previewLabelJa}</p>
      <div className={styles.freePreviewInner}>
        <div className={styles.freePreviewPlate}>
          <p className={styles.freePreviewEyebrow}>資質</p>
          <p className={styles.freePreviewPersona}>{fixture.personaNameJa}</p>
          <p className={styles.freePreviewQuality}>{fixture.qualityLabelJa}</p>
        </div>
        <p className={styles.freePreviewSummary}>{fixture.summaryJa}</p>
      </div>
    </div>
  );
}
