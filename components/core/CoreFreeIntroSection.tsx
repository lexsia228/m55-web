'use client';

import CoreFreeJourneyStepper from './CoreFreeJourneyStepper';
import styles from './CoreExperience.module.css';

type Props = {
  birthDateLabelJa: string;
  onStart: () => void;
};

export default function CoreFreeIntroSection({ birthDateLabelJa, onStart }: Props) {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeIntroSection}`}
      aria-labelledby="core-free-intro-title"
    >
      <CoreFreeJourneyStepper currentStep="questions" />
      <span className={styles.tierAOverline}>無料解析・6つの質問</span>
      <h2 id="core-free-intro-title" className={styles.sectionTitle}>
        自分の強みと、いつものパターンを知る
      </h2>
      <p className={styles.sectionLead}>
        生年月日と6つの質問から、自然に力を発揮しやすい場面、
        <br />
        自分らしい考え方、迷いや疲れが始まりやすい場面を解析します。
      </p>

      <div className={styles.freeIntroDobCard}>
        <p className={styles.freeIntroDobLabel}>登録中の生年月日</p>
        <p className={styles.freeIntroDobValue}>{birthDateLabelJa}</p>
      </div>

      <ul className={styles.freeIntroMetaList}>
        <li>無料・6つの質問</li>
        <li>正解はありません</li>
      </ul>

      <button type="button" className={styles.freeIntroPrimaryBtn} onClick={onStart}>
        6つの質問を始める
      </button>
    </section>
  );
}
