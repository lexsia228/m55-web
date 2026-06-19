'use client';

import LightToFullUpgradeButton from './LightToFullUpgradeButton';
import { DTR_LIGHT_TO_FULL_UPGRADE_NOTE } from '../../lib/m55/dtrProductLabels';
import styles from './LightToFullUpgradeCta.module.css';

export type LightToFullUpgradeCtaProps = {
  reportInstanceId: string;
  variant?: 'default' | 'subtle';
  className?: string;
};

export default function LightToFullUpgradeCta({
  reportInstanceId,
  variant = 'default',
  className,
}: LightToFullUpgradeCtaProps) {
  const rootClass =
    variant === 'subtle'
      ? `${styles.subtle} ${className ?? ''}`.trim()
      : `${styles.block} ${className ?? ''}`.trim();

  return (
    <div className={rootClass} data-testid="m55-light-to-full-upgrade-block">
      <LightToFullUpgradeButton
        reportInstanceId={reportInstanceId}
        className={variant === 'subtle' ? styles.subtleBtn : styles.btn}
      />
      <p className={styles.note}>{DTR_LIGHT_TO_FULL_UPGRADE_NOTE}</p>
    </div>
  );
}
