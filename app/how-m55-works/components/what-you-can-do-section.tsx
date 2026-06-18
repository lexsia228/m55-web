import { TOP_FREE_ENTRY_PUBLIC_COPY } from '../../../lib/m55/topFreeEntryPublicCopy';
import styles from '../how-it-works.module.css';

const copy = TOP_FREE_ENTRY_PUBLIC_COPY.howM55Works;

export function WhatYouCanDoSection() {
  return (
    <section className={`${styles.shellNarrow} ${styles.foldAlt}`} aria-labelledby="how-m55-receive-title">
      <p className={styles.sectionKicker}>04 — M55で受け取れるもの</p>
      <h2 id="how-m55-receive-title" className={styles.visuallyHidden}>
        M55で受け取れるもの
      </h2>

      <p className={styles.sectionLead}>{copy.receiveFreeLeadJa}</p>
      <p className={styles.sectionLead}>
        本質ポスター、傾向の輪郭、M55の読み方、傾向と負荷、このタイプはどう出やすいか、まず整えるとよいこと、観測までを通して、今の自分がどう出やすいかをつかんでいきます。
      </p>
      <p className={styles.sectionLead}>
        ここで渡すのは、すべての答えではなく、まず見取り図です。
      </p>

      <p className={styles.sectionLead}>{copy.receiveSavedLeadJa}</p>
      <p className={styles.sectionLead}>{copy.receiveContrastJa}</p>
      <p className={styles.sectionLead}>{copy.receiveConsultJa}</p>
      <p className={styles.sectionLead}>
        見えている傾向を前提に、
        <br />
        人間関係、疲れやすさ、動き方の迷いなどを、
        <br />
        その人の流れに沿って整理し直せます。
      </p>
      <p className={styles.sectionLead}>
        その場の入力だけを広げるのではなく、
        <br />
        すでに見えている傾向や組み合わせを踏まえて、
        <br />
        今のテーマを読み直していきます。
      </p>

      <div className={`${styles.depthDiagram} ${styles.receiveFlowBlock}`}>
        <p className={styles.depthDiagramKicker}>{copy.flowKickerJa}</p>
        <p className={`${styles.sectionLead} ${styles.receiveFlowNote}`}>
          {copy.flowNoteJa}
        </p>
      </div>
    </section>
  );
}
