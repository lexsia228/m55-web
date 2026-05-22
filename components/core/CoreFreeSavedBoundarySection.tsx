import styles from './CoreExperience.module.css';

/**
 * Free preview vs paid 保存版 boundary — placed after hero, not inside hero block.
 */
export default function CoreFreeSavedBoundarySection() {
  return (
    <section
      className={`${styles.coreFreeSavedBoundary} ${styles.coreSectionSurface}`}
      aria-labelledby="core-free-saved-boundary"
    >
      <h2 id="core-free-saved-boundary" className={styles.coreFreeSavedBoundaryTitle}>
        このページと保存版の違い
      </h2>
      <p className={styles.coreFreeSavedBoundaryLead}>
        いま見ているのは<strong className={styles.coreFreeSavedBoundaryEm}>無料の見取り図</strong>
        です。仕事や人との距離など、いまの傾向の輪郭を読む入口として使えます。
      </p>
      <p className={styles.coreFreeSavedBoundaryLead}>
        <strong className={styles.coreFreeSavedBoundaryEm}>保存版（本質の読み解き）</strong>
        は有料の章立てレポートです。読み返せる形で整理され、相談返書も付いています。下の案内から内容を確認できます。
      </p>
    </section>
  );
}
