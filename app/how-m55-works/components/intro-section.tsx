import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;

function renderLines(text: string, keyPrefix: string) {
  return text.split('\n').map((line, index, lines) => (
    <span key={`${keyPrefix}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

export function IntroSection() {
  return (
    <section className={styles.introSection} aria-labelledby="how-m55-hero-title">
      <h1 id="how-m55-hero-title" className={styles.heroTitle}>
        {copy.heroTitleJa}
      </h1>
      <p className={styles.heroHook}>{copy.heroHookJa}</p>
      <p className={styles.heroLead}>{renderLines(copy.heroLeadJa, 'hero-lead')}</p>
      <p className={styles.heroBridge}>{renderLines(copy.heroBridgeJa, 'bridge')}</p>
      <div className={styles.introRule} aria-hidden />
    </section>
  );
}
