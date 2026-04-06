'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BirthProfileIntakeLayer from '../profile/BirthProfileIntakeLayer';
import styles from './CoreExperience.module.css';

type Props = {
  ownerId: string | null;
  nicknameHint?: string;
};

/**
 * /core 未保存：常時フォームは出さず、案内＋ Home と同一の保存モーダルへ誘導する。
 */
export default function CoreLockedState({ ownerId, nicknameHint = '' }: Props) {
  const [layerOpen, setLayerOpen] = useState(false);

  useEffect(() => {
    const onOpenRequest = () => setLayerOpen(true);
    window.addEventListener('m55:open_profile_gate', onOpenRequest);
    return () => window.removeEventListener('m55:open_profile_gate', onOpenRequest);
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.coreProfileGate} data-testid="m55-core-locked">
        <p className={styles.coreProfileGateLead}>
          ニックネームと生年月日を端末に保存すると、本質ページの輪郭が開きます。入力はホームと同じ画面で行えます。
        </p>
        <div className={styles.coreProfileGateActions}>
          <button
            type="button"
            className={styles.coreProfileGatePrimary}
            onClick={() => setLayerOpen(true)}
          >
            プロフィールを保存して開く
          </button>
          <Link href="/my" className={styles.coreProfileGateLink}>
            マイページで入力・保存する
          </Link>
        </div>
      </div>
      <BirthProfileIntakeLayer
        open={layerOpen}
        ownerId={ownerId}
        nicknameHint={nicknameHint}
        onClose={() => setLayerOpen(false)}
        onSaved={() => {}}
        dataTestId="m55-core-birth-intake-layer"
      />
    </div>
  );
}
