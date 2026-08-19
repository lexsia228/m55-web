'use client';

import styles from './CoreExperience.module.css';

const PRIVACY_SAFE_FOUNDATION_JA =
  'この読みは、生年月日から見える基調と、今回の回答の重なりから組み立てています。';

type Props = {
  outcomeJa: string;
  typeLabelJa: string;
  supportingTraitJa: string;
  imagePath: string;
};

/**
 * RESULT first viewport — image-led editorial hero with readable trait lockup.
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
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeResultHero}`}
      aria-labelledby="core-free-result-lead-title"
      data-testid="m55-free-result-lead"
      id="core-lead"
    >
      <div className={styles.freeResultHeroArt} aria-hidden data-testid="m55-free-result-hero-art">
        <img
          className={styles.freeResultHeroImage}
          src={imagePath}
          alt=""
          decoding="async"
          data-testid="m55-free-result-trait-image"
        />
        <div className={styles.freeResultHeroArtVeil} />
      </div>
      <div className={styles.freeResultHeroLockup}>
        <span className={styles.tierAOverline}>個人無料読み解き</span>
        {typeLabel ? (
          <p className={styles.freeResultHeroTraitBadge}>
            <span className={styles.freeResultLeadIdentityKind}>資質</span>
            <span className={styles.freeResultHeroTraitName}>{typeLabel}</span>
          </p>
        ) : null}
        <h1 id="core-free-result-lead-title" className={styles.freeResultHeroTitle}>
          {outcome}
        </h1>
        {trait ? <p className={styles.freeResultHeroSupport}>{trait}</p> : null}
        <p className={styles.freeResultLeadPrivacy}>{PRIVACY_SAFE_FOUNDATION_JA}</p>
      </div>
    </section>
  );
}
