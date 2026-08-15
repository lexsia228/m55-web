'use client';

import { useMemo } from 'react';
import type { DtrPayload } from '../../lib/m55/dtrEngine';
import { projectPersonalPremiumNarrativeV1 } from '../../lib/m55/narrative/projectPersonalPremiumNarrativeV1';
import { projectGenericPublicShareV1 } from '../../lib/m55/narrative/projectPublicShareV1';
import PublicShareCardPreview from './PublicShareCardPreview';
import NarrativeShareActions from './NarrativeShareActions';
import PersonalFreeManualBlock from './PersonalFreeManualBlock';
import styles from './NarrativeShare.module.css';

export default function PremiumNarrativeClose({
  payload,
  nickname,
  stemLaneIndex,
}: {
  payload: DtrPayload;
  nickname?: string;
  stemLaneIndex: number;
}) {
  const narrative = useMemo(
    () => projectPersonalPremiumNarrativeV1({ payload, nickname, stemLaneIndex }),
    [payload, nickname, stemLaneIndex],
  );
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const spec = useMemo(
    () =>
      projectGenericPublicShareV1({
        variant: 'premium_takeaway',
        stemLaneIndex,
        origin,
      }),
    [stemLaneIndex, origin],
  );

  return (
    <section
      className={styles.chooser}
      aria-labelledby="premium-narrative-close-title"
      data-testid="m55-premium-narrative-close"
    >
      <h2 id="premium-narrative-close-title" className={styles.headline}>
        今のあなたへ残しておく一文
      </h2>
      <p className={styles.body} data-testid="m55-premium-takeaway">
        {narrative.takeaway?.text}
      </p>
      {narrative.actions.length > 0 ? (
        <ul className={styles.slotList}>
          {narrative.actions.map((action) => (
            <li key={action.text} className={styles.slot}>
              <span className={styles.slotLabel}>一度だけ試すこと</span>
              <p className={styles.slotBody}>{action.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <PersonalFreeManualBlock manual={narrative.manualSpec} titleId="premium-complete-manual" />
      <p className={styles.chooserLead}>本文は共有されません。残す一文だけを渡せます。</p>
      <PublicShareCardPreview spec={spec} premiumMark />
      <NarrativeShareActions spec={spec} surface="dtr_saved_report" />
    </section>
  );
}
