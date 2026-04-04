import Link from 'next/link';
import styles from '../how-it-works.module.css';

export function NextStepSection() {
  return (
    <section
      className={`${styles.shellNarrow} ${styles.foldAlt} ${styles.nextSection}`}
      aria-labelledby="how-m55-next-title"
    >
      <p className={styles.sectionKicker}>07 — 次のステップ</p>
      <h2 id="how-m55-next-title" className={styles.visuallyHidden}>
        次のステップ
      </h2>
      <p className={styles.nextLead}>
        まずは、無料の範囲で輪郭を確認してみてください。
      </p>
      <p className={styles.nextSub}>
        その先に進むかどうかは、ご自身のタイミングで決めていただければと思います。
      </p>

      <div className={styles.ctaStack}>
        <Link href="/home" className={styles.primaryCta}>
          無料で輪郭を確認する
        </Link>
        <Link href="/dtr/lp" className={styles.secondaryCta}>
          Entry Report を見る
        </Link>
      </div>

      <div className={styles.nextFoot}>
        <p className={styles.nextFootText}>
          M55は、一貫したルールで、静かに読み解きを届けます。
          <br />
          順位をつけず、自己観察のための補助線として使ってください。
        </p>
      </div>
    </section>
  );
}
