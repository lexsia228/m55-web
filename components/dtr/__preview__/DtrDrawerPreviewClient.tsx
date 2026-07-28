'use client';

import DtrFullReader from '../DtrFullReader';
import type { ComponentProps } from 'react';
import upgradeStyles from '../LightToFullUpgradeCta.module.css';

type DtrFullReaderProps = ComponentProps<typeof DtrFullReader>;

export default function DtrDrawerPreviewClient({
  showLightUpgrade = false,
  ...props
}: DtrFullReaderProps & { showLightUpgrade?: boolean }) {
  return (
    <>
      <DtrFullReader {...props} devPreviewFixtureReady />
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
