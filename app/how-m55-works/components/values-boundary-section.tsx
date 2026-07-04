import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;

export function ValuesBoundarySection() {
  return (
    <section
      className={`${styles.shellNarrow} ${styles.foldAlt}`}
      aria-labelledby="how-m55-values-title"
    >
      <p className={styles.sectionKicker}>{copy.section06KickerJa}</p>
      <h2 id="how-m55-values-title" className={styles.sectionTitle}>
        {copy.section06TitleJa}
      </h2>
      {copy.section06ParagraphsJa.map((paragraph) => (
        <p key={paragraph.slice(0, 24)} className={styles.sectionLead}>
          {paragraph.split('\n').map((line, index, lines) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      ))}
      <p className={`${styles.sectionLead} ${styles.sectionLanding}`}>
        {copy.section06LandingJa.split('\n').map((line, index, lines) => (
          <span key={`${line}-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    </section>
  );
}
