'use client';

import Link from 'next/link';
import styles from './CoreExperience.module.css';

export default function CoreLockedState() {
  return (
    <div className={styles.coreLockedRoot}>
      <div className={styles.coreProfileGateShell}>
        <div className={styles.coreProfileGate} data-testid="m55-core-locked">
          <h1 className={styles.coreProfileGateTitle}>
            自分の強みと、いつものパターンを無料で解析できます。
          </h1>
          <p className={styles.coreProfileGateSupport}>
            生年月日と6つの質問から、自然に力を発揮しやすい場面、
            自分らしい考え方、迷いや疲れが始まりやすい場面を解析します。
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
