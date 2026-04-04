import styles from '../how-it-works.module.css';

const VERTICES: [number, number][] = [
  [100, 20],
  [180, 75],
  [155, 165],
  [45, 165],
  [20, 75],
];

export function FrameworkSection() {
  return (
    <section className={`${styles.shellWide} ${styles.foldAlt}`} aria-labelledby="how-m55-framework-title">
      <p className={styles.sectionKicker}>02 — 読み解きの構造</p>
      <h2 id="how-m55-framework-title" className={styles.sectionTitle}>
        読み解きの構造
      </h2>

      <div className={styles.frameworkGrid}>
        <div className={styles.frameworkRow}>
          <div>
            <h3 className={styles.frameworkSubTitle}>
              10通りの資質
            </h3>
            <p className={styles.frameworkBody}>
              M55は、人の傾向を10通りの資質として捉えます。それぞれに特性があり、優劣の序列はありません。
            </p>
          </div>
          <div className={styles.frameworkVisual}>
            <div className={styles.tenMap} aria-hidden>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={styles.tenDot}>
                  <div className={styles.tenDotInner} />
                </div>
              ))}
            </div>
            <p className={styles.visualCaption}>10通りの資質（抽象イメージ）</p>
          </div>
        </div>

        <div className={styles.frameworkDivider} aria-hidden />

        <div className={styles.frameworkRow}>
          <div>
            <h3 className={styles.frameworkSubTitle}>5つの解析軸</h3>
            <p className={styles.frameworkBody}>
              資質を、5つの観点から読み解きます。ひとつのラベルを多角的に見ることで、平面的な言い換えではなく、傾向のバランスが立ち上がります。
            </p>
          </div>
          <div className={styles.frameworkVisual}>
            <svg
              className={styles.pentagonSvg}
              viewBox="0 0 200 200"
              aria-hidden
            >
              <polygon
                points="100,20 180,75 155,165 45,165 20,75"
                fill="none"
                stroke="rgba(0,0,0,0.12)"
                strokeWidth="1"
              />
              <circle cx="100" cy="100" r="3" fill="rgba(60,60,60,0.35)" />
              {VERTICES.map(([x, y], i) => (
                <line
                  key={`l-${i}`}
                  x1="100"
                  y1="100"
                  x2={x}
                  y2={y}
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
              ))}
              {VERTICES.map(([x, y], i) => (
                <circle
                  key={`d-${i}`}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="rgba(107,95,168,0.25)"
                />
              ))}
            </svg>
            <p className={styles.visualCaption}>5つの解析軸（抽象イメージ）</p>
          </div>
        </div>
      </div>

      <p className={styles.frameworkSummary}>
        入力はひとつ。読み解きは多層的に。
        <br />
        それがM55の構造です。
      </p>
    </section>
  );
}
