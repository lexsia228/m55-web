'use client';

import CoreFreeContinuousFlowProgress from './CoreFreeContinuousFlowProgress';
import CoreFreeSegmentedDobFields from './CoreFreeSegmentedDobFields';
import styles from './CoreExperience.module.css';

type Props = {
  initialBirthDateIso: string;
  onDobConfirmed: (birthDateIso: string) => void;
};

/**
 * Guided-discovery step 1/6 — segmented DOB (same-card → question 1).
 */
export default function CoreFreeIntroSection({
  initialBirthDateIso,
  onDobConfirmed,
}: Props) {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeGuidedShell}`}
      aria-labelledby="core-free-dob-title"
      data-testid="m55-free-dob-step"
    >
      <div className={styles.freeGuidedVisualCol}>
        <CoreFreeContinuousFlowProgress stepNumber={1} completedCount={0} />
      </div>
      <div className={styles.freeGuidedFormCol}>
        <p className={styles.freeGuidedSupportLabel}>最初の手がかり</p>
        <h1 id="core-free-dob-title" className={styles.freeContinuousQuestionTitle}>
          生年月日を入力してください
        </h1>
        <p className={styles.sectionLead}>
          生年月日と5つの短い質問から、
          <br />
          動き出し方・決め方・人との距離に、
          <br />
          今どんな傾向が出ているかを整理します。
        </p>
        <CoreFreeSegmentedDobFields
          initialIsoDate={initialBirthDateIso}
          onValidSubmit={onDobConfirmed}
          submitLabelJa="無料結果づくりを始める"
        />
        <p className={styles.freeGuidedTrustRow}>約1分・正解なし</p>
        <p className={styles.freeGuidedPrivacy}>
          正確な日付は結果画面に表示しません。
        </p>
      </div>
    </section>
  );
}
