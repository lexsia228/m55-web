'use client';

import DtrFullReader from '../DtrFullReader';
import type { ComponentProps } from 'react';
import upgradeStyles from '../LightToFullUpgradeCta.module.css';
import CorePairReadingCrossSell from '../../core/CorePairReadingCrossSell';
import corePage from '../../../app/dtr/core/core.module.css';

type DtrFullReaderProps = ComponentProps<typeof DtrFullReader>;

export default function DtrDrawerPreviewClient({
  showLightUpgrade = false,
  initialOpenPanel,
  ...props
}: DtrFullReaderProps & {
  showLightUpgrade?: boolean;
}) {
  return (
    <>
      <DtrFullReader
        {...props}
        devPreviewFixtureReady
        initialOpenPanel={initialOpenPanel}
      />
      <div className={corePage.upgradeAssist}>
        <CorePairReadingCrossSell tone="night" />
      </div>
      {showLightUpgrade ? (
        <div className={upgradeStyles.subtle} data-testid="m55-light-upgrade-preview">
          <button type="button" className={upgradeStyles.subtleBtn} disabled>
            FULL化を確認する
          </button>
          <p className={upgradeStyles.note}>開発プレビューでは購入処理を行いません。</p>
        </div>
      ) : null}
    </>
  );
}
