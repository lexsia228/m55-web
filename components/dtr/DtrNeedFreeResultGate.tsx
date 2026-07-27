'use client';

import Link from 'next/link';
import styles from './DtrPaidDecisionUx.module.css';

/**
 * Clean /dtr/lp entry when free result is not ready.
 * Must not claim that the free result is already complete.
 */
export default function DtrNeedFreeResultGate() {
  return (
    <section
      className={styles.shell}
      data-m55-paid-phase="need-free"
      data-testid="m55-dtr-need-free"
      aria-labelledby="m55-dtr-need-free-title"
    >
      <p className={styles.overline}>プレミアムレポート</p>
      <h2 id="m55-dtr-need-free-title" className={styles.title}>
        先に無料結果を開いてください
      </h2>
      <p className={styles.lead}>
        プレミアムレポートは、無料結果のあとで追加の6問に答えてから作れます。まだ無料結果がない場合は、こちらから始めてください。
      </p>
      <ul className={styles.metaList}>
        <li>ニックネームと生年月日を1回だけ入力</li>
        <li>いまの状態についての5つの問い</li>
        <li>無料結果のあと、プレミアムへ進めます</li>
      </ul>
      <div className={styles.actions}>
        <Link href="/core" className={styles.primaryBtn} data-testid="m55-dtr-need-free-start">
          無料結果を始める
        </Link>
        <Link href="/home" className={styles.secondaryBtn}>
          ホームへ戻る
        </Link>
      </div>
    </section>
  );
}
