import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;

export function WhatYouCanDoSection() {
  return (
    <section className={styles.shellNarrow} aria-labelledby="how-m55-composite-title">
      <p className={styles.sectionKicker}>{copy.section05KickerJa}</p>
      <h2 id="how-m55-composite-title" className={styles.sectionTitle}>
        {copy.section05TitleJa}
      </h2>

      <h3 className={styles.compositeBlockTitle}>{copy.section05FreeMapTitleJa}</h3>
      <p className={styles.sectionLead}>
        {copy.section05FreeMapBodyJa.split('\n').map((line, index, lines) => (
          <span key={`free-${index}`}>
            {line}
            {index < lines.length - 1 ? (
              <>
                <br />
                {line === '' ? <br /> : null}
              </>
            ) : null}
          </span>
        ))}
      </p>

      <div className={styles.compositeHighlight}>
        <p className={styles.compositeHook}>{copy.section05CompositeHookJa}</p>
        <p className={styles.sectionLead}>
          {copy.section05CompositeBodyJa.split('\n').map((line, index, lines) => (
            <span key={`comp-${index}`}>
              {line}
              {index < lines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>
        <p className={styles.sectionLead}>
          {copy.section05CompositeExperienceJa.split('\n').map((line, index, lines) => (
            <span key={`exp-${index}`}>
              {line}
              {index < lines.length - 1 ? (
                <>
                  <br />
                  {line === '' ? <br /> : null}
                </>
              ) : null}
            </span>
          ))}
        </p>
      </div>

      <p className={`${styles.sectionLead} ${styles.compositeAddOn}`}>
        {copy.section05AddOnJa.split('\n').map((line, index, lines) => (
          <span key={`add-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>

      <p className={`${styles.sectionLead} ${styles.sectionLanding}`}>
        {copy.section05LandingJa.split('\n').map((line, index, lines) => (
          <span key={`land-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    </section>
  );
}
