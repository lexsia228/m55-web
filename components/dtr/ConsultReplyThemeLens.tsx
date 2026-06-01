'use client';

import type { ConsultReplyLensInfo } from '../../lib/m55/consult/consultReplyThemePartMap';
import styles from './ConsultRoom.module.css';

type Props = {
  lens: ConsultReplyLensInfo;
};

export default function ConsultReplyThemeLens({ lens }: Props) {
  if (lens.visualKind === 'balance' || lens.lensRows.length === 0) {
    return null;
  }

  const kindClass =
    lens.visualKind === 'communication'
      ? styles.replyLensKindCommunication
      : lens.visualKind === 'strain'
        ? styles.replyLensKindStrain
        : styles.replyLensKindStability;

  return (
    <section
      className={styles.replyLensPanel}
      aria-label={lens.lensTitle}
    >
      <p className={styles.replyLensTitle}>{lens.lensTitle}</p>
      <p className={styles.replyLensCaption}>{lens.lensCaption}</p>
      <ol className={`${styles.replyLensList} ${kindClass}`}>
        {lens.lensRows.map((row) => (
          <li key={row.label} className={styles.replyLensRow}>
            <span className={styles.replyLensRowLabel}>{row.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
