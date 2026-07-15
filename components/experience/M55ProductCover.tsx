import styles from './M55ExperienceSystem.module.css';

export function M55ProductCover({
  kind,
  depth,
}: {
  kind: 'personal' | 'compatibility';
  depth: 'free' | 'paid';
}) {
  const label =
    kind === 'personal'
      ? depth === 'paid'
        ? '自分の保存版を表す、中心から広がる層と軸'
        : '自分の無料読み解きを表す、中心から広がる線'
      : depth === 'paid'
        ? '二人の保存版を表す、二つの中心と交差する経路'
        : '二人の無料読み解きを表す、二つの中心を結ぶ線';

  return (
    <div className={`${styles.cover} ${styles[`cover-${kind}`]} ${styles[`cover-${depth}`]}`}>
      <svg viewBox="0 0 480 320" role="img" aria-label={label}>
        {kind === 'personal' ? (
          <>
            <circle className={styles.coverLineSoft} cx="240" cy="160" r="112" />
            <circle className={styles.coverLine} cx="240" cy="160" r="72" />
            <circle className={styles.coverCore} cx="240" cy="160" r="20" />
            <path className={styles.coverLine} d="M240 26v268M106 160h268M146 66l188 188M334 66 146 254" />
            {depth === 'paid' ? (
              <path className={styles.coverLineSoft} d="M78 110c72-96 252-96 324 0M78 210c72 96 252 96 324 0" />
            ) : null}
          </>
        ) : (
          <>
            <circle className={styles.coverCore} cx="160" cy="160" r="22" />
            <circle className={styles.coverCoreAlt} cx="320" cy="160" r="22" />
            <circle className={styles.coverLineSoft} cx="160" cy="160" r="76" />
            <circle className={styles.coverLineSoft} cx="320" cy="160" r="76" />
            <path className={styles.coverLine} d="M86 98c100 22 208 102 308 124M86 222c100-22 208-102 308-124" />
            <path className={styles.coverLine} d="M160 160c38-48 122-48 160 0-38 48-122 48-160 0Z" />
            {depth === 'paid' ? (
              <path className={styles.coverLineSoft} d="M54 160c54-132 318-132 372 0-54 132-318 132-372 0Z" />
            ) : null}
          </>
        )}
      </svg>
    </div>
  );
}
