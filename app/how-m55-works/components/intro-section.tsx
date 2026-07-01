import styles from '../how-it-works.module.css';

export function IntroSection() {
  return (
    <section className={styles.introSection} aria-labelledby="how-m55-intro-heading">
      <p id="how-m55-intro-heading" className={styles.introLineLarge}>
        自分のことが、わからなくなることがある。
      </p>
      <p className={styles.introLine}>
        なぜこう感じるのか。
        <br />
        なぜうまくいかないのか。
        <br />
        答えを外に求めても、しっくりこない。
      </p>
      <div className={styles.introEmphasisBlock}>
        <p className={styles.introEmphasis}>
          M55は、そんなときに立ち返れる
          <br className={styles.introBr} />
          <strong>自分を少し離れて見つめ直すための地図</strong>です。
        </p>
      </div>
      <div className={styles.introRule} aria-hidden />
    </section>
  );
}
