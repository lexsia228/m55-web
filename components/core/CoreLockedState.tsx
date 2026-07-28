'use client';

import Link from 'next/link';
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../../lib/m55/commercialUx/terminology';
import styles from './CoreExperience.module.css';

type Props = {
  onStartIntake: () => void;
};

export default function CoreLockedState({ onStartIntake }: Props) {
  return (
    <div className={styles.coreLockedRoot}>
      <div className={styles.coreProfileGateShell}>
        <div className={styles.coreProfileGate} data-testid="m55-core-locked">
          <h1 className={styles.coreProfileGateTitle}>
            まずは、無料結果から始められます。
          </h1>
          <p className={styles.coreProfileGateSupport}>
            ニックネームと生年月日のあと、5つの問いを選ぶと、無料結果を開けます。
          </p>
          <p className={styles.coreProfileGateSupport}>
            ログインは、あとから結果を開くときに使えます。
          </p>
          <div className={styles.coreProfileGateActions}>
            <button
              type="button"
              className={styles.coreProfileGatePrimary}
              data-testid="m55-core-start-intake"
              onClick={onStartIntake}
            >
              {T.freeStart}
            </button>
            <Link
              href="/home"
              className={styles.coreProfileGateSecondaryLink}
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
