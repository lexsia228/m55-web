import styles from '../how-it-works.module.css';

const SITUATIONS = [
  {
    text: '自分をうまく説明できない',
    subtext: '言葉にしようとすると、いつも曖昧になる',
  },
  {
    text: '同じ悩みを繰り返している',
    subtext: '気づくと、また同じところで躓いている',
  },
  {
    text: '人と比べて疲れやすい',
    subtext: '周りと同じようにできない自分に疲れる',
  },
  {
    text: '日々の観測軸がほしい',
    subtext: 'いまの自分を眺めるための、安定した視点が欲しい',
  },
  {
    text: '自分の傾向を静かに整理したい',
    subtext: '大げさな診断ではなく、淡々と確認したい',
  },
] as const;

export function SuitableForSection() {
  return (
    <section className={styles.shellNarrow} aria-labelledby="how-m55-suitable-title">
      <p className={styles.sectionKicker}>05 — こんなときに</p>
      <h2 id="how-m55-suitable-title" className={styles.sectionTitle}>
        M55が向いている場面。
      </h2>

      <ul className={styles.suitableList}>
        {SITUATIONS.map((s) => (
          <li key={s.text} className={styles.suitableItem}>
            <div className={styles.suitableItemInner}>
              <div className={styles.suitableDot} aria-hidden>
                <div className={styles.suitableDotInner} />
              </div>
              <div>
                <p className={styles.suitableTitle}>{s.text}</p>
                <p className={styles.suitableSub}>{s.subtext}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className={styles.suitableFootnote}>
        M55は、派手な結果を出したり、劇的な変化を約束したりするものではありません。
        <br />
        静かに、自分を眺めるための整理の道具です。
      </p>
    </section>
  );
}
