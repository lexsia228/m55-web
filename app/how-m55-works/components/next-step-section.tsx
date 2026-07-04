import Link from 'next/link';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import { BackToPreviousButton } from './back-to-previous-button';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;
const cta = TOP_FREE_ENTRY_PUBLIC_COPY.cta;

export function NextStepSection() {
  return (
    <section
      className={`${styles.shellNarrow} ${styles.nextSection}`}
      aria-labelledby="how-m55-next-title"
    >
      <p className={styles.sectionKicker}>{copy.section07KickerJa}</p>
      <h2 id="how-m55-next-title" className={styles.visuallyHidden}>
        {copy.section07TitleJa}
      </h2>
      <p className={styles.nextLead}>
        {copy.nextLeadJa.split('\n').map((line, index, lines) => (
          <span key={`lead-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
      <p className={styles.nextSub}>
        {copy.nextSubJa.split('\n').map((line, index, lines) => (
          <span key={`sub-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>

      <div className={styles.ctaStack}>
        <Link href={cta.coreFreeHref} className={styles.primaryCta}>
          {copy.primaryCtaJa}
        </Link>
        <Link href={cta.viewSavedPlansHref} className={styles.secondaryCta}>
          {copy.secondaryCtaJa}
        </Link>
        <BackToPreviousButton labelJa={copy.backButtonJa} fallbackHref={cta.homeHref} />
      </div>

      <div className={styles.nextFoot}>
        <p className={styles.nextFootText}>
          {copy.nextFootJa.split('\n').map((line, index, lines) => (
            <span key={`foot-${index}`}>
              {line}
              {index < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
        <p className={styles.nextFootText}>
          {copy.nextClosingJa.split('\n').map((line, index, lines) => (
            <span key={`close-${index}`}>
              {line}
              {index < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
