import styles from '../how-it-works.module.css';

const VERTICES: [number, number][] = [
  [100, 20],
  [180, 75],
  [155, 165],
  [45, 165],
  [20, 75],
];

export function WhatBecomesVisibleSection() {
  return (
    <section className={styles.shellWide} aria-labelledby="how-m55-visible-title">
      <p className={styles.sectionKicker}>03 — 5つの視点の見方</p>
      <h2 id="how-m55-visible-title" className={styles.visuallyHidden}>
        5つの視点の見方
      </h2>
      <p className={styles.sectionLead}>
        M55では、まず5つの固定観測軸を使って、今の自分を読みやすく整理します。
      </p>
      <p className={styles.sectionLead}>
        見るのは、人との距離・感受性・発想・協調・段取りという5つの視点です。
      </p>
      <p className={styles.sectionLead}>
        複雑で言葉にしにくい感覚を、そのまま押しつぶさず、生活の中で出やすい動き方として見える形へ整えていきます。
      </p>
      <p className={styles.sectionLead}>
        見ているのは、単なる性格のラベルではありません。動き方、疲れ方、考え方、整え方です。
      </p>
      <p className={styles.sectionLead}>
        さらに、5つの軸をあわせて見ることで、その奥にある「中心の整い方」も見えてきます。
      </p>
      <p className={styles.sectionLead}>
        どれだけ無理なく自分を扱えているか。
        <br />
        どこに負荷が集まりやすいか。
        <br />
        どの順番で整えると使いやすいか。
      </p>
      <p className={styles.sectionLead}>
        M55は、今の自分の使いやすさまで見えやすくするための読み方です。
      </p>

      <div className={`${styles.frameworkVisual} ${styles.visibleAxisFigure}`}>
        <svg className={styles.pentagonSvg} viewBox="0 0 200 200" aria-hidden>
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
            <circle key={`d-${i}`} cx={x} cy={y} r="4" fill="rgba(107,95,168,0.25)" />
          ))}
        </svg>
        <p className={styles.visualCaption}>5つの視点（抽象イメージ）</p>
      </div>
    </section>
  );
}
