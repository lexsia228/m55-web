import Link from 'next/link';
import { STATIC_CTA } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreEntryReportCTASection() {
  return (
    <section
      className={`${styles.ctaStrip} ${styles.ctaStripV0} ${styles.coreReveal}`}
      aria-labelledby="core-saved-report-cta"
      data-core-reveal
    >
      <h2 id="core-saved-report-cta" className={styles.ctaTitle}>
        {STATIC_CTA.title}
      </h2>
      {STATIC_CTA.lines.map((line, i) => (
        <p
          key={line}
          className={i === 0 ? styles.ctaBodyLead : styles.ctaBodySupplement}
        >
          {line}
        </p>
      ))}
      <Link href="/dtr/lp" className={styles.ctaPrimaryButton}>
        {STATIC_CTA.linkLabel ?? STATIC_CTA.title}
      </Link>
    </section>
  );
}
