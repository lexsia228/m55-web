'use client';

import { useMemo } from 'react';
import type { DtrPayload } from '../../lib/m55/dtrEngine';
import { projectPersonalPremiumNarrativeV1 } from '../../lib/m55/narrative/projectPersonalPremiumNarrativeV1';
import type { PremiumPurchasedSemanticProjectionV1 } from '../../lib/m55/narrative/buildPremiumPurchasedSemanticProjectionV1';
import { PREMIUM_SHARE_IDENTITY_PERSISTENCE, projectPremiumPublicShareV1 } from '../../lib/m55/narrative/projectPublicShareV1';
import { normalizeDisplaySentenceForDedupe } from '../../lib/m55/dtrPaidModules';
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
  const takeawayText = narrative.takeaway?.text ?? null;
  const hiddenSpecText = narrative.manualSpec.hiddenSpecJa.trim();
  const showStandaloneTakeaway =
    Boolean(takeawayText) &&
    normalizeDisplaySentenceForDedupe(takeawayText ?? '') !==
      normalizeDisplaySentenceForDedupe(hiddenSpecText);

  return (
    <section
      className={`${styles.chooser} ${styles.premiumClose}`}
      aria-labelledby="premium-narrative-close-title"
      data-testid="m55-premium-narrative-close"
      data-m55-semantic-role="global_summary"
    >
      <span className={styles.optionLabel} data-testid="m55-premium-overline">
        プレミアムレポート
      </span>
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
      {showStandaloneTakeaway ? (
        <p className={styles.body} data-testid="m55-premium-takeaway">
          {takeawayText}
        </p>
      ) : null}
      <p className={styles.mark} data-premium-share-persistence={PREMIUM_SHARE_IDENTITY_PERSISTENCE}>
        公開カードには生年月日や回答は含まれません。
      </p>
      <p className={styles.chooserLead} data-testid="m55-premium-share-guidance">
        本文は共有されません。残す一文だけを渡せます。
      </p>
      <PublicShareCardPreview spec={spec} />
      <NarrativeShareActions spec={spec} surface="dtr_saved_report" />
    </section>
  );
}
