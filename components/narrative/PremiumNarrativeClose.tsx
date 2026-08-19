'use client';

import { useMemo } from 'react';
import type { DtrPayload } from '../../lib/m55/dtrEngine';
import { projectPersonalPremiumNarrativeV1 } from '../../lib/m55/narrative/projectPersonalPremiumNarrativeV1';
import type { PremiumPurchasedSemanticProjectionV1 } from '../../lib/m55/narrative/buildPremiumPurchasedSemanticProjectionV1';
import { PREMIUM_SHARE_IDENTITY_PERSISTENCE, projectPremiumPublicShareV1 } from '../../lib/m55/narrative/projectPublicShareV1';
import type { ConsultWalletDisplaySnapshot } from '../../lib/m55/reply/consultWalletDisplaySnapshot';
import { isConsultWalletDisplaySnapshotUsable } from '../../lib/m55/reply/consultWalletDisplaySnapshot';
import PublicShareCardPreview from './PublicShareCardPreview';
import NarrativeShareActions from './NarrativeShareActions';
import PersonalFreeManualBlock from './PersonalFreeManualBlock';
import styles from './NarrativeShare.module.css';

export default function PremiumNarrativeClose({
  payload,
  nickname,
  stemLaneIndex,
  projection,
  consultWalletSnapshot,
  onOpenConsult,
}: {
  payload: DtrPayload;
  nickname?: string;
  stemLaneIndex: number;
  projection?: PremiumPurchasedSemanticProjectionV1 | null;
  consultWalletSnapshot?: ConsultWalletDisplaySnapshot | null;
  onOpenConsult?: () => void;
}) {
  const narrative = useMemo(
    () =>
      projectPersonalPremiumNarrativeV1({
        payload,
        nickname,
        stemLaneIndex,
        projection: projection ?? undefined,
      }),
    [payload, nickname, projection, stemLaneIndex],
  );
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const spec = useMemo(() => {
    if (projection) {
      return projectPremiumPublicShareV1({
        stemLaneIndex: projection.stemLaneIndex,
        answerAxes: projection.axes,
        birthAxes: projection.birthAxes,
        hingeAxisId: projection.hingeAxisId,
        origin,
      });
    }
    return projectPremiumPublicShareV1({ stemLaneIndex, origin });
  }, [origin, projection, stemLaneIndex]);

  const walletUsable = isConsultWalletDisplaySnapshotUsable(consultWalletSnapshot);
  const hasAdditionalReading = walletUsable && consultWalletSnapshot.availableCount > 0;
  const nextAction = narrative.actions[0]?.text ?? null;

  return (
    <section
      className={styles.chooser}
      aria-labelledby="premium-narrative-close-title"
      data-testid="m55-premium-narrative-close"
    >
      <span className={styles.optionLabel}>プレミアムレポート</span>
      <h2 id="premium-narrative-close-title" className={styles.headline}>
        読みのまとめ
      </h2>
      <PersonalFreeManualBlock manual={narrative.manualSpec} titleId="premium-complete-manual" />
      {nextAction ? (
        <div className={styles.slot} data-testid="m55-premium-next-action">
          <span className={styles.slotLabel}>次の一歩</span>
          <p className={styles.slotBody}>{nextAction}</p>
          {hasAdditionalReading && onOpenConsult ? (
            <button type="button" className={styles.shareBtn} onClick={onOpenConsult}>
              追加読み解きを使う
            </button>
          ) : (
            <p className={styles.mark}>読み返すときは、上の章から開き直せます。</p>
          )}
        </div>
      ) : null}
      <h3 className={styles.headline}>今のあなたへ残しておく一文</h3>
      <p className={styles.body} data-testid="m55-premium-takeaway">
        {narrative.takeaway?.text}
      </p>
      <p className={styles.mark} data-premium-share-persistence={PREMIUM_SHARE_IDENTITY_PERSISTENCE}>
        公開カードには生年月日や回答は含まれません。
      </p>
      <p className={styles.chooserLead}>本文は共有されません。残す一文だけを渡せます。</p>
      <PublicShareCardPreview spec={spec} premiumMark />
      <NarrativeShareActions spec={spec} surface="dtr_saved_report" />
    </section>
  );
}
