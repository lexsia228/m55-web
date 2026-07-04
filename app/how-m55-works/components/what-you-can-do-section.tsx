import Link from 'next/link';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;
const cta = TOP_FREE_ENTRY_PUBLIC_COPY.cta;

function renderLines(text: string, keyPrefix: string) {
  const lines = text.split('\n');
  return lines.map((line, index) => (
    <span key={`${keyPrefix}-${index}`}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

export function WhatYouCanDoSection() {
  return (
    <section className={styles.shellNarrow} aria-labelledby="how-m55-composite-title">
      <p className={styles.sectionKicker}>{copy.section04KickerJa}</p>
      <h2 id="how-m55-composite-title" className={styles.sectionTitle}>
        {copy.section04TitleJa}
      </h2>

      <p className={styles.sectionLead}>{copy.section04FreeIntroJa}</p>
      <p className={styles.sectionLead}>{renderLines(copy.section04FreeMapBodyJa, 'free-map')}</p>

      <div className={styles.compositeHighlight}>
        <p className={styles.compositeHook}>{copy.section04CompositeHookJa}</p>
        <p className={styles.sectionLead}>{renderLines(copy.section04CompositeBodyJa, 'composite')}</p>
      </div>

      <div className={styles.valueCardGrid} aria-label="M55複合暦解析で見えること">
        {copy.section04ValueCardsJa.map((card) => (
          <article key={card.cardId} className={styles.valueCard}>
            <h3 className={styles.valueCardTitle}>{card.titleJa}</h3>
            <p className={styles.valueCardBody}>{card.bodyJa}</p>
          </article>
        ))}
      </div>

      <p className={`${styles.sectionLead} ${styles.compositeClosing}`}>
        {renderLines(copy.section04ClosingJa, 'closing')}
      </p>

      <div className={styles.midFlowWrap}>
        <Link href={cta.viewSavedPlansHref} className={styles.midFlowLink}>
          {copy.secondaryCtaJa}
        </Link>
      </div>
    </section>
  );
}
