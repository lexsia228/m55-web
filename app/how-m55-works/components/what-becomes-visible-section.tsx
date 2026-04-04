import styles from '../how-it-works.module.css';

const ITEMS = [
  {
    label: '資質の組み合わせ',
    description: 'あなたに関わる資質と、その重なり方',
  },
  {
    label: '強く出やすい傾向',
    description: '意識しなくても表に出やすい出方',
  },
  {
    label: '抑えられやすい傾向',
    description: '普段は表に出にくい、内側の出方',
  },
  {
    label: '5つの解析軸で見たバランス',
    description: '5つの解析軸から見た、傾向の出方の違いや調和',
  },
  {
    label: '繰り返しやすいパターン',
    description: '無意識に繰り返しやすい思考や行動の癖',
  },
] as const;

export function WhatBecomesVisibleSection() {
  return (
    <section className={styles.shellWide} aria-labelledby="how-m55-visible-title">
      <p className={styles.sectionKicker}>03 — M55で見えてくるもの</p>
      <div className={styles.visibleIntro}>
        <h2 id="how-m55-visible-title" className={styles.sectionTitle}>
          自分を観察するための、
          <br />
          具体的な視点。
        </h2>
        <p className={styles.sectionLead}>
          M55を通じて、次のような傾向を観察できます。
          これらは「正解」ではなく、自分を眺めるための補助線です。
        </p>
      </div>

      <div className={styles.visibleGrid}>
        {ITEMS.map((item) => (
          <article key={item.label} className={styles.visibleCard}>
            <h3 className={styles.visibleCardTitle}>{item.label}</h3>
            <p className={styles.visibleCardDesc}>{item.description}</p>
          </article>
        ))}
      </div>

      <div className={styles.visibleNote}>
        <div className={styles.visibleNoteBar} aria-hidden />
        <div>
          <p className={styles.visibleNoteTitle}>今日 / 今週の観測視点</p>
          <p className={styles.visibleNoteText}>
            M55は、固定的な「あなたはこういう人」という結論を出すものではありません。
            日々の観測軸として、いまの自分を眺めるために使うこともできます。
          </p>
        </div>
      </div>
    </section>
  );
}
