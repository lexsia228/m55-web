import Link from 'next/link';
import styles from '../how-it-works.module.css';

export function NextStepSection() {
  return (
    <section
      className={`${styles.shellNarrow} ${styles.foldAlt} ${styles.nextSection}`}
      aria-labelledby="how-m55-next-title"
    >
      <p className={styles.sectionKicker}>06 — 次のステップ</p>
      <h2 id="how-m55-next-title" className={styles.visuallyHidden}>
        次のステップ
      </h2>
      <p className={styles.nextLead}>まずは、無料 /core で自分の輪郭を確認してみてください。</p>
      <p className={styles.nextSub}>
        その先で必要になったら、Entry Report で構造を読み返し、含まれている相談返書で今の悩みへつなげていけます。
      </p>

      <div className={styles.ctaStack}>
        <Link href="/core" className={styles.primaryCta}>
          無料 /core で輪郭を確認する
        </Link>
        <Link href="/dtr/lp" className={styles.secondaryCta}>
          Entry Report を見る
        </Link>
      </div>

      <div className={styles.nextFoot}>
        <p className={styles.nextFootText}>
          M55は、今の自分を読みやすくし、扱いやすくするためにあります。
        </p>
      </div>
    </section>
  );
}
