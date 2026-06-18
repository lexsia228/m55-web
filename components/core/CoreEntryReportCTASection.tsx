import Link from 'next/link';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../lib/m55/topFreeEntryPublicCopy';
import { STATIC_CTA, withNickname } from './corePublicCopy';
import styles from './CoreExperience.module.css';

interface Props {
  nickname?: string;
}

function CheckIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
      className={`${styles.ctaStripTeaser} ${styles.coreReveal}`}
      aria-labelledby="core-saved-report-cta"
      data-core-reveal
    >
      <span className={styles.tierAOverline}>{TOP_FREE_ENTRY_PUBLIC_COPY.coreCta.overlineJa}</span>
      <h2 id="core-saved-report-cta" className={styles.ctaTitle}>
        {STATIC_CTA.title}
      </h2>

      <p className={styles.ctaPurchaseIntro}>{renderLine(STATIC_CTA.intro)}</p>

      <h3 className={styles.ctaBenefitsHeading}>{STATIC_CTA.benefitsHeading}</h3>

      <ul className={styles.ctaBenefitCard}>
        {STATIC_CTA.benefits.map((line, i) => (
          <li key={i} className={styles.ctaBenefitRow}>
            <CheckIcon className={styles.ctaBenefitIcon} />
            <span className={styles.ctaBenefitText}>{renderLine(line)}</span>
          </li>
        ))}
      </ul>

      <p className={styles.ctaBundleNote} style={{ marginTop: 16 }}>{STATIC_CTA.bundleNote}</p>

      <Link href={TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansHref} className={styles.ctaTeaserCta}>
        {TOP_FREE_ENTRY_PUBLIC_COPY.cta.viewSavedPlansJa} →
      </Link>
    </section>
  );
}
