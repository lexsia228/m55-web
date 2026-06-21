'use client';

import Link from 'next/link';
import styles from './CoreExperience.module.css';

/**
 * /core 未保存：本質はまだ開かない。ホームの無料導線へ戻す静かな案内面。
 */
export default function CoreLockedState() {
  return (
    <div className={styles.coreLockedRoot}>
      <div className={styles.coreProfileGateShell}>
        <div className={styles.coreProfileGate} data-testid="m55-core-locked">
          <h1 className={styles.coreProfileGateTitle}>
            まずは、無料の範囲で輪郭を確認してみてください。
          </h1>
          <p className={styles.coreProfileGateSupport}>
            無料の見取り図は、プロフィール保存後に開きます。
          </p>
          <p className={styles.coreProfileGateSupport}>
            無料の見取り図はホームから確認できます。
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
