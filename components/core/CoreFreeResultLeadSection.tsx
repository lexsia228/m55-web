'use client';

import styles from './CoreExperience.module.css';

const PRIVACY_SAFE_FOUNDATION_JA =
  '生年月日の土台と、いまの5つの回答から見える傾向です';

type Props = {
  outcomeJa: string;
  typeLabelJa: string;
  supportingTraitJa: string;
  imagePath: string;
};

/**
 * RESULT first viewport — outcome-first, no exact DOB, compact visual.
 * Replaces frozen poster hero on the free→Premium path (does not edit CoreHeroSection).
 */
export default function CoreFreeResultLeadSection({
  outcomeJa,
  typeLabelJa,
  supportingTraitJa,
  imagePath,
}: Props) {
  const outcome = outcomeJa.trim() || 'いまの自分に表れやすい輪郭が見えました。';
  const typeLabel = typeLabelJa.trim();
  const trait = supportingTraitJa.trim();

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeResultLead}`}
      aria-labelledby="core-free-result-lead-title"
      data-testid="m55-free-result-lead"
      id="core-lead"
    >
      <div className={styles.freeResultLeadGrid}>
        <div className={styles.freeResultLeadCopy}>
          <span className={styles.tierAOverline}>今回わかったこと</span>
          <h1 id="core-free-result-lead-title" className={styles.freeResultLeadTitle}>
            {outcome}
          </h1>
          {typeLabel ? (
            <p className={styles.freeResultLeadIdentity}>
              <span className={styles.freeResultLeadIdentityKind}>資質</span>
              <span className={styles.freeResultLeadIdentityName}>{typeLabel}</span>
            </p>
          ) : null}
          {trait ? <p className={styles.freeResultLeadSupport}>{trait}</p> : null}
          <p className={styles.freeResultLeadPrivacy}>{PRIVACY_SAFE_FOUNDATION_JA}</p>
        </div>
        <div className={styles.freeResultLeadVisual} aria-hidden>
          <img className={styles.freeResultLeadImage} src={imagePath} alt="" decoding="async" />
        </div>
      </div>
    </section>
  );
}
