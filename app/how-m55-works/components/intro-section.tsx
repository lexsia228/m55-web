import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;

export function IntroSection() {
  return (
    <section className={styles.introSection} aria-labelledby="how-m55-hero-title">
      <h1 id="how-m55-hero-title" className={styles.heroTitle}>
        {copy.heroTitleJa}
      </h1>
      <p className={styles.heroHook}>{copy.heroHookJa}</p>
      <p className={styles.heroLead}>{copy.heroLeadJa.replace(/\n/g, ' ')}</p>
      <div className={styles.introRule} aria-hidden />
    </section>
  );
}
