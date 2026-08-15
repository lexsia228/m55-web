'use client';

import { useMemo } from 'react';
import type { DtrPayload } from '../../lib/m55/dtrEngine';
import { projectPersonalPremiumNarrativeV1 } from '../../lib/m55/narrative/projectPersonalPremiumNarrativeV1';
import { PREMIUM_SHARE_IDENTITY_PERSISTENCE, projectPremiumPublicShareV1 } from '../../lib/m55/narrative/projectPublicShareV1';
import { buildPersonalFreeNarrativeShareContextV1 } from '../../lib/m55/narrative/projectPersonalFreeNarrativeV1';
import PublicShareCardPreview from './PublicShareCardPreview';
import NarrativeShareActions from './NarrativeShareActions';
import PersonalFreeManualBlock from './PersonalFreeManualBlock';
import styles from './NarrativeShare.module.css';

function readSessionFreeAnswers(): Record<string, string> | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('m55_free_answers_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(parsed).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    );
    return entries.length >= 5 ? Object.fromEntries(entries) : null;
  } catch {
    return null;
  }
}

export default function PremiumNarrativeClose({
  payload,
  nickname,
  stemLaneIndex,
  birthDate,
}: {
  payload: DtrPayload;
  nickname?: string;
  stemLaneIndex: number;
  birthDate?: string;
}) {
  const narrative = useMemo(
    () => projectPersonalPremiumNarrativeV1({ payload, nickname, stemLaneIndex }),
    [payload, nickname, stemLaneIndex],
  );
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const spec = useMemo(() => {
    const answers = readSessionFreeAnswers();
    if (birthDate && answers) {
      const ctx = buildPersonalFreeNarrativeShareContextV1({
        birthDate,
        stemLaneIndex,
        freeAnswerSet: answers,
      });
      if (ctx.ok) {
        return projectPremiumPublicShareV1({
          stemLaneIndex: ctx.value.stemLaneIndex,
          answerAxes: ctx.value.answerAxes,
          birthAxes: ctx.value.birthAxes,
          hingeAxisId: ctx.value.hingeAxisId,
          origin,
        });
      }
    }
    return projectPremiumPublicShareV1({ stemLaneIndex, origin });
  }, [birthDate, origin, stemLaneIndex]);

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
