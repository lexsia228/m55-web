'use client';

import { useEffect } from 'react';
import {
  SHARED_ENTRY_COPY_V1,
  type PrivacySafeShareCardV1,
} from '../../lib/m55/freeResult/privacySafeShareCardV1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelActionOnce,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import styles from './SharedEntry.module.css';

type Props = {
  card: PrivacySafeShareCardV1 | null;
};

/** Full navigation to /core — starts a fresh free funnel for the recipient. */
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

export default function SharedEntryPanel({ card }: Props) {
  const copy = SHARED_ENTRY_COPY_V1;

  useEffect(() => {
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.sharedEntryOpened,
      'shared_entry',
      card ? `shared-entry-${card.token}` : 'shared-entry-fallback',
    );
  }, [card]);

  if (!card) {
    return (
      <div className={styles.shell} data-testid="m55-shared-entry-fallback">
        <h1 className={styles.title}>{copy.fallbackTitleJa}</h1>
        <p className={styles.body}>{copy.fallbackBodyJa}</p>
        <SharedEntryCta copyLabel={copy.ctaJa} actionKey="shared-entry-cta-fallback" />
      </div>
    );
  }

  return (
    <div className={styles.shell} data-testid="m55-shared-entry">
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
        copyLabel={copy.ctaJa}
        actionKey={`shared-entry-cta-${card.token}`}
      />
    </div>
  );
}
