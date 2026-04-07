import styles from '../how-it-works.module.css';

const SITUATIONS = [
  {
    text: 'なんとなく疲れる理由を整理したい',
    subtext: '',
  },
  {
    text: '人との距離の取り方を見直したい',
    subtext: '',
  },
  {
    text: '自分に合う動き方を理解したい',
    subtext: '',
  },
  {
    text: '迷いやすい場面の傾向をつかみたい',
    subtext: '',
  },
  {
    text: '大事な時期に、自分の整え方を思い出したい',
    subtext: '',
  },
] as const;

export function SuitableForSection() {
  return (
    <section className={styles.shellNarrow} aria-labelledby="how-m55-suitable-title">
      <p className={styles.sectionKicker}>05 — こんなときに</p>
      <h2 id="how-m55-suitable-title" className={styles.visuallyHidden}>
        こんなときに
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
                {s.subtext ? <p className={styles.suitableSub}>{s.subtext}</p> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className={styles.suitableFootnote}>
        M55が渡したいのは、ひとつの答えではありません。
        <br />
        今の自分を読みやすくし、扱いやすくするための見取り図です。
      </p>
    </section>
  );
}
