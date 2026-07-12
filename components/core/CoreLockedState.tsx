'use client';

import Link from 'next/link';
import styles from './CoreExperience.module.css';

export default function CoreLockedState() {
  return (
    <div className={styles.coreLockedRoot}>
      <div className={styles.coreProfileGateShell}>
        <div className={styles.coreProfileGate} data-testid="m55-core-locked">
          <h1 className={styles.coreProfileGateTitle}>
            まずは、無料の見取り図から始められます。
          </h1>
          <p className={styles.coreProfileGateSupport}>
            基本情報のあと、5つの問いと今の関心を選ぶと、無料の見取り図を開けます。
          </p>
          <p className={styles.coreProfileGateSupport}>
            ログインは、あとから結果を保存するときに使えます。
          </p>
          <div className={styles.coreProfileGateActions}>
            <Link
              href="/home"
              className={styles.coreProfileGatePrimary}
              data-testid="m55-core-locked-home-link"
            >
              ホームへ戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
