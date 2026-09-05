'use client';

import type { ManualSpecV1 } from '../../lib/m55/narrative/m55NarrativeSpecV1';
import styles from './NarrativeShare.module.css';

export default function PairManualBlock({
  manual,
  compact = false,
}: {
  manual: ManualSpecV1;
  compact?: boolean;
}) {
  const entry = manual.slots.find((slot) => slot.id === 'mismatch_entry');
  const one = manual.slots.find((slot) => slot.id === 'one_tends');
  const other = manual.slots.find((slot) => slot.id === 'other_tends');
  const ret = manual.slots.find((slot) => slot.id === 'return_path');
  const rest = manual.slots.filter(
    (slot) =>
      slot.id !== 'mismatch_entry' &&
      slot.id !== 'one_tends' &&
      slot.id !== 'other_tends' &&
      slot.id !== 'return_path',
  );

  return (
    <section
      className={styles.manual}
      aria-labelledby="pair-manual-title"
      data-testid="m55-pair-manual"
    >
      <h3 id="pair-manual-title" className={styles.headline}>
        {manual.titleJa}
      </h3>
      <div className={styles.relation}>
        {one ? (
          <div className={styles.relationSide}>
            <span className={styles.relationLabel}>一方</span>
            <p className={styles.relationBody}>{one.bodyJa}</p>
          </div>
        ) : null}
        {one && other ? (
          <p className={styles.mirrorVs} aria-hidden>
            →
          </p>
        ) : null}
        {other ? (
          <div className={styles.relationSide}>
            <span className={styles.relationLabel}>もう一方</span>
            <p className={styles.relationBody}>{other.bodyJa}</p>
          </div>
        ) : null}
        {!compact && entry ? (
          <div className={styles.relationSide}>
            <span className={styles.relationLabel}>{entry.labelJa}</span>
            <p className={styles.relationBody}>{entry.bodyJa}</p>
          </div>
        ) : null}
        {!compact && ret ? (
          <div className={styles.relationReturn}>
            <span className={styles.relationLabel}>{ret.labelJa}</span>
            <p className={styles.relationBody}>{ret.bodyJa}</p>
          </div>
        ) : null}
      </div>
      {!compact && rest.length > 0 ? (
        <ul className={styles.slotList}>
          {rest.map((slot) => (
            <li key={slot.id} className={styles.slot}>
              <span className={styles.slotLabel}>{slot.labelJa}</span>
              <p className={styles.slotBody}>{slot.bodyJa}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
