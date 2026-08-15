'use client';

import { useEffect } from 'react';
import {
  SHARED_ENTRY_COPY_V1,
  type PrivacySafeShareCardV1,
} from '../../lib/m55/freeResult/privacySafeShareCardV1';
import type { PublicShareSpecV1 } from '../../lib/m55/narrative/publicShareSpecV1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelActionOnce,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import PublicShareCardPreview from '../narrative/PublicShareCardPreview';
import styles from './SharedEntry.module.css';

type Props = {
  card: PrivacySafeShareCardV1 | null;
  narrative?: PublicShareSpecV1 | null;
};

function SharedEntryCta({
  copyLabel,
  actionKey,
}: {
  copyLabel: string;
  actionKey: string;
}) {
  return (
    <a
      href="/core"
      className={styles.cta}
      data-testid="m55-shared-entry-cta"
      onClick={() => {
        trackFunnelActionOnce(
          M55_FUNNEL_EVENTS.sharedEntryCtaClicked,
          'shared_entry',
          actionKey,
        );
      }}
    >
      {copyLabel}
    </a>
  );
}

const NARRATIVE_LANDING = {
  overlineJa: 'この人には、こんな読みが出ました。',
  ctaJa: '無料で自分の取扱説明書を見る',
  askJa: 'あなたの場合は？',
  privacyNoteJa: '共有リンクには、相手の生年月日や回答は含まれていません。',
} as const;

export default function SharedEntryPanel({ card, narrative = null }: Props) {
  const copy = SHARED_ENTRY_COPY_V1;

  useEffect(() => {
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.sharedEntryOpened,
      'shared_entry',
      narrative
        ? `shared-entry-${narrative.token}`
        : card
          ? `shared-entry-${card.token}`
          : 'shared-entry-fallback',
    );
  }, [card, narrative]);

  if (narrative) {
    return (
      <div
        className={`${styles.shell} m55-exp-reading`}
        data-testid="m55-shared-entry"
        data-m55-experience-surface="SHARED_SOCIAL_ENTRY"
      >
        <p className={styles.brand}>M55</p>
        <p className={styles.overline}>{NARRATIVE_LANDING.overlineJa}</p>
        <PublicShareCardPreview
          spec={narrative}
          premiumMark={narrative.surface === 'personal_premium'}
        />
        <p className={styles.body}>{NARRATIVE_LANDING.askJa}</p>
        <p className={styles.privacy}>{NARRATIVE_LANDING.privacyNoteJa}</p>
        <SharedEntryCta
          copyLabel={NARRATIVE_LANDING.ctaJa}
          actionKey={`shared-entry-cta-${narrative.token}`}
        />
      </div>
    );
  }

  if (!card) {
    return (
      <div className={`${styles.shell} m55-exp-reading`} data-testid="m55-shared-entry-fallback" data-m55-experience-surface="SHARED_SOCIAL_ENTRY">
        <h1 className={styles.title}>{copy.fallbackTitleJa}</h1>
        <p className={styles.body}>{copy.fallbackBodyJa}</p>
        <SharedEntryCta copyLabel={NARRATIVE_LANDING.ctaJa} actionKey="shared-entry-cta-fallback" />
      </div>
    );
  }

  return (
    <div className={`${styles.shell} m55-exp-reading`} data-testid="m55-shared-entry" data-m55-experience-surface="SHARED_SOCIAL_ENTRY">
      <p className={styles.overline}>{copy.overlineJa}</p>
      <h1 className={styles.title} data-testid="m55-shared-entry-trait">
        {card.traitNameJa}
      </h1>
      <p className={styles.phrase}>{card.traitPhraseJa}</p>
      <p className={styles.body}>{card.safeStatementJa}</p>
      <div className={styles.mark} aria-hidden>
        <img src={card.imagePath} alt="" width={120} height={120} decoding="async" />
      </div>
      <p className={styles.privacy}>{copy.privacyNoteJa}</p>
      <SharedEntryCta
        copyLabel={NARRATIVE_LANDING.ctaJa}
        actionKey={`shared-entry-cta-${card.token}`}
      />
    </div>
  );
}
