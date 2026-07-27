'use client';

import type { PrivacySafeShareCardV1 } from '../../lib/m55/freeResult/privacySafeShareCardV1';
import styles from './CoreExperience.module.css';

type Props = {
  card: PrivacySafeShareCardV1;
};

/**
 * Privacy-safe visual card for share preview — branding + trait only.
 */
export default function CoreFreeShareableResultCard({ card }: Props) {
  return (
    <article
      className={styles.shareCard}
      data-testid="m55-shareable-result-card"
      aria-label={`M55の共有カード：${card.traitNameJa}`}
    >
      <p className={styles.shareCardBrand}>M55</p>
      <div className={styles.shareCardBody}>
        <div className={styles.shareCardText}>
          <p className={styles.shareCardTrait}>{card.traitNameJa}</p>
          <p className={styles.shareCardPhrase}>{card.traitPhraseJa}</p>
          <p className={styles.shareCardStatement}>{card.safeStatementJa}</p>
          <p className={styles.shareCardInvite}>{card.inviteJa}</p>
        </div>
        {/* Decorative mark — not the private full-result screenshot */}
        <div className={styles.shareCardMark} aria-hidden>
          <img src={card.imagePath} alt="" width={96} height={96} decoding="async" />
        </div>
      </div>
    </article>
  );
}
