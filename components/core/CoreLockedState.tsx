'use client';

import Link from 'next/link';
import { M55_COMMERCIAL_TERMINOLOGY as T } from '../../lib/m55/commercialUx/terminology';
import { FREE_FUNNEL_PAGE_CONTENT as C } from '../../lib/m55/commercialUx/experience/pageContent/freeFunnelCopy';
import styles from './CoreExperience.module.css';

type Props = {
  onStartIntake: () => void;
};

export default function CoreLockedState({ onStartIntake }: Props) {
  return (
    <div className={styles.coreLockedRoot}>
      <div className={styles.coreProfileGateShell}>
        <div className={styles.coreProfileGate} data-testid="m55-core-locked">
          <p
            className={styles.coreProfileGateOverline}
            data-testid="m55-core-prerequisite-overline"
          >
            {C.lockedOverlineJa}
          </p>
          <h1
            className={styles.coreProfileGateTitle}
            data-testid="m55-core-prerequisite-headline"
          >
            {C.lockedTitleJa}
          </h1>
          <p className={styles.coreProfileGateSupport}>{C.lockedSupport1Ja}</p>
          <p className={styles.coreProfileGateSupport}>{C.lockedSupport2Ja}</p>
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
              {C.homeLinkJa}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
