import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;

export function FrameworkSection() {
  return (
    <section className={styles.shellWide} aria-labelledby="how-m55-individual-title">
      <p className={styles.sectionKicker}>{copy.section03KickerJa}</p>
      <h2 id="how-m55-individual-title" className={styles.sectionTitle}>
        {copy.section03TitleJa}
      </h2>
      {copy.section03ParagraphsJa.map((paragraph) => (
        <p key={paragraph.slice(0, 24)} className={styles.sectionLead}>
          {paragraph.split('\n').map((line, index, lines) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      ))}

      <div className={styles.fiveViewPanel} aria-labelledby="how-m55-five-views-title">
        <p id="how-m55-five-views-title" className={styles.fiveViewLead}>
          {copy.section03FiveViewsLeadJa}
        </p>
        <ul className={styles.fiveViewGrid}>
          {copy.section03FiveViewLabelsJa.map((label) => (
            <li key={label} className={styles.fiveViewChip}>
              <span className={styles.fiveViewChipDot} aria-hidden />
              <span className={styles.fiveViewChipLabel}>{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className={`${styles.sectionLead} ${styles.sectionLanding}`}>
        {copy.section03LandingJa.split('\n').map((line, index, lines) => (
          <span key={`${line}-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    </section>
  );
}
