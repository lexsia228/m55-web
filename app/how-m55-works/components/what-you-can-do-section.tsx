import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;

const TIER_PILL_CLASS = [styles.depthFree, styles.depthEntry, styles.depthRoom] as const;

export function WhatYouCanDoSection() {
  return (
    <section className={`${styles.shellNarrow} ${styles.foldAlt}`} aria-labelledby="how-m55-receive-title">
      <p className={styles.sectionKicker}>04 — M55で受け取れるもの</p>
      <h2 id="how-m55-receive-title" className={styles.visuallyHidden}>
        M55で受け取れるもの
      </h2>

      <p className={styles.sectionLead}>{copy.threeTierIntroJa}</p>

      <div className={styles.actionList} aria-labelledby="how-m55-three-tier-title">
        <h3 id="how-m55-three-tier-title" className={styles.visuallyHidden}>
          {copy.threeTierSectionTitleJa}
        </h3>
        {copy.threeTierItemsJa.map((item, index) => (
          <article key={item.titleJa} className={styles.actionRow}>
            <div className={styles.actionBody}>
              <div className={styles.actionTitleRow}>
                <p className={styles.actionTitle}>{item.titleJa}</p>
                <span className={`${styles.depthPill} ${TIER_PILL_CLASS[index]}`}>
                  {item.subLabelJa}
                </span>
              </div>
              <p className={styles.actionDesc}>{item.descJa}</p>
            </div>
          </article>
        ))}
      </div>

      <p className={styles.sectionLead}>{copy.receiveFreeLeadJa}</p>
      <p className={styles.sectionLead}>{copy.receiveFreeExperienceJa}</p>
      <p className={styles.sectionLead}>{copy.receiveFreeClosingJa}</p>

      <p className={styles.sectionLead}>{copy.receiveSavedLeadJa}</p>
      <p className={styles.sectionLead}>{copy.receiveContrastJa}</p>

      <p className={styles.sectionLead}>{copy.receiveConsultJa}</p>
      <p className={styles.sectionLead}>{copy.receiveConsultDetailLeadJa}</p>
      <p className={styles.sectionLead}>{copy.receiveConsultDetailClosingJa}</p>

      <div className={`${styles.depthDiagram} ${styles.receiveFlowBlock}`}>
        <p className={styles.depthDiagramKicker}>{copy.commercialFlowKickerJa}</p>
        <p className={`${styles.sectionLead} ${styles.receiveFlowNote}`}>
          {copy.flowLayerBridgeJa}
        </p>
        <p className={styles.depthDiagramKicker}>{copy.operationalFlowKickerJa}</p>
        <p className={`${styles.sectionLead} ${styles.receiveFlowNote}`}>{copy.flowNoteJa}</p>
      </div>

      <div className={styles.visibleNote}>
        <div className={styles.visibleNoteBar} aria-hidden />
        <div>
          <p className={styles.visibleNoteText}>{copy.boundaryJa}</p>
        </div>
      </div>
    </section>
  );
}
