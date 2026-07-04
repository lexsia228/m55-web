import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;

export function CalendarLayersSection() {
  return (
    <section
      className={`${styles.shellWide} ${styles.foldAlt}`}
      aria-labelledby="how-m55-calendar-layers-title"
    >
      <p className={styles.sectionKicker}>{copy.section02KickerJa}</p>
      <h2 id="how-m55-calendar-layers-title" className={styles.sectionTitle}>
        {copy.section02TitleJa}
      </h2>
      <p className={styles.sectionLead}>
        {copy.section02IntroJa.split('\n').map((line, index, lines) => (
          <span key={`${line}-${index}`}>
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

      <div className={styles.calendarLayerGrid} aria-label={copy.section02GridAriaLabelJa}>
        {copy.calendarLayersJa.map((layer) => (
          <article key={layer.layerId} className={styles.calendarLayerCard}>
            <div className={styles.calendarLayerHeader}>
              <h3 className={styles.calendarLayerTitle}>{layer.titleJa}</h3>
              <p className={styles.calendarLayerSub}>{layer.subLabelJa}</p>
            </div>
            <p className={styles.calendarLayerLabel}>これは何か</p>
            <p className={styles.calendarLayerBody}>
              {layer.whatJa.split('\n').map((line, index, lines) => (
                <span key={`what-${index}`}>
                  {line}
                  {index < lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
            <p className={styles.calendarLayerLabel}>{copy.calendarLayerHowLabelJa}</p>
            <p className={styles.calendarLayerBody}>
              {layer.howJa.split('\n').map((line, index, lines) => (
                <span key={`how-${index}`}>
                  {line}
                  {index < lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          </article>
        ))}
      </div>

      <p className={`${styles.sectionLead} ${styles.sectionLanding}`}>
        {copy.section02LandingJa.split('\n').map((line, index, lines) => (
          <span key={`${line}-${index}`}>
            {line}
            {index < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    </section>
  );
}
