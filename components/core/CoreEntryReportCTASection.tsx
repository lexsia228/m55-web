import Link from 'next/link';
import { STATIC_CTA } from './corePublicCopy';
import styles from './CoreExperience.module.css';

export default function CoreEntryReportCTASection() {
  return (
    <section className={`${styles.ctaStrip} ${styles.ctaStripV0}`} aria-labelledby="core-saved-report-cta">
      <h2 id="core-saved-report-cta" className={styles.ctaTitle}>
        {STATIC_CTA.title}
      </h2>
      {STATIC_CTA.lines.map((line) => (
        <p key={line} className={styles.ctaBody}>
          {line}
        </p>
      ))}
      <Link href="/dtr/lp" className={styles.ctaPrimaryButton}>
        {STATIC_CTA.linkLabel ?? STATIC_CTA.title}
      </Link>
    </section>
  );
}
