import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import styles from './CoreExperience.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.coreBoundary;

/**
 * Free preview vs paid 保存版 boundary — placed after hero, not inside hero block.
 */
export default function CoreFreeSavedBoundarySection() {
  return (
    <section
      className={`${styles.coreFreeSavedBoundary} ${styles.coreSectionSurface}`}
      aria-labelledby="core-free-saved-boundary"
    >
      <h2 id="core-free-saved-boundary" className={styles.coreFreeSavedBoundaryTitle}>
        {copy.titleJa}
      </h2>
      <p className={styles.coreFreeSavedBoundaryLead}>
        {copy.freeLeadJa.split('\n').map((line, index) => (
          <span key={line}>
            {index > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
      <p className={styles.coreFreeSavedBoundaryLead}>
        {copy.savedLeadJa.split('\n').map((line, index) => (
          <span key={line}>
            {index > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </p>
    </section>
  );
}
