import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;

export function SuitableForSection() {
  return (
    <section
      className={`${styles.shellNarrow} ${styles.foldAlt}`}
      aria-labelledby="how-m55-reflect-title"
    >
      <p className={styles.sectionKicker}>{copy.section04KickerJa}</p>
      <h2 id="how-m55-reflect-title" className={styles.sectionTitle}>
        {copy.section04TitleJa}
      </h2>
      {copy.section04ParagraphsJa.map((paragraph) => (
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
        {copy.section04LandingJa.split('\n').map((line, index, lines) => (
          <span key={`${line}-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    </section>
  );
}
