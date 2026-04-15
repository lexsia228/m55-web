import Link from 'next/link';
import { STATIC_CTA, withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

interface Props {
  nickname?: string;
}

export default function CoreEntryReportCTASection({ nickname }: Props) {
  const nick = nickname?.trim() ?? '';
  const renderLine = (line: string) => {
    if (!nick) {
      return line.replace(/\btさん\b/g, '').replace(/\bt\b/g, '');
    }
    return withNickname(line, nick);
  };

  return (
    <section
      className={`${styles.ctaStrip} ${styles.ctaStripV0} ${styles.coreReveal}`}
      aria-labelledby="core-saved-report-cta"
      data-core-reveal
    >
      <h2 id="core-saved-report-cta" className={styles.ctaTitle}>
        {STATIC_CTA.title}
      </h2>
      
      <div className={styles.ctaLines}>
        {STATIC_CTA.lines.map((line, i) => (
          <p
            key={i}
            className={i === 0 ? styles.ctaBodyLead : styles.ctaBodySupplement}
          >
            {renderLine(line)}
          </p>
        ))}
      </div>

      <Link href="/dtr/lp" className={styles.ctaPrimaryButton}>
        {STATIC_CTA.linkLabel ?? STATIC_CTA.title}
      </Link>
    </section>
  );
}