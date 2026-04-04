import Link from 'next/link';
import styles from '../how-it-works.module.css';

export function IntroSection() {
  return (
    <section className={styles.introSection} aria-labelledby="how-m55-intro-heading">
      <nav className={styles.breadcrumb} aria-label="パンくず">
        <Link href="/">ホーム</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>M55の仕組み</span>
      </nav>

      <p id="how-m55-intro-heading" className={styles.introLineLarge}>
        自分のことが、わからなくなることがある。
      </p>
      <p className={styles.introLine}>
        なぜこう感じるのか、なぜうまくいかないのか。
        <br />
        答えを外に求めても、しっくりこない。
      </p>
      <div className={styles.introEmphasisBlock}>
        <p className={styles.introEmphasis}>
          M55は、そんなときに立ち返れる
          <br className={styles.introBr} />
          <strong>「読み解きの型」</strong>を届けるためにあります。
        </p>
      </div>
      <div className={styles.introRule} aria-hidden />
    </section>
  );
}
