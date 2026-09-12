'use client';

import type { ManualSpecV1 } from '../../lib/m55/narrative/m55NarrativeSpecV1';
import styles from './NarrativeShare.module.css';

const PAID_MANUAL_SLOT_IDS = new Set(['return_path', 'pair_talk_hint']);

export default function PairManualBlock({
  manual,
  compact = false,
  mode,
}: {
  manual: ManualSpecV1;
  compact?: boolean;
  mode?: 'free-depth';
}) {
  const freeDepth = mode === 'free-depth';
  const entry = manual.slots.find((slot) => slot.id === 'mismatch_entry');
  const one = manual.slots.find((slot) => slot.id === 'one_tends');
  const other = manual.slots.find((slot) => slot.id === 'other_tends');
  const ret = manual.slots.find((slot) => slot.id === 'return_path');
  const rest = manual.slots.filter(
    (slot) =>
      slot.id !== 'mismatch_entry' &&
      slot.id !== 'one_tends' &&
      slot.id !== 'other_tends' &&
      slot.id !== 'return_path' &&
      (!freeDepth || !PAID_MANUAL_SLOT_IDS.has(slot.id)),
  );
  const showRecognitionDepth = freeDepth || !compact;
  const showPaidReturn = !compact && !freeDepth && Boolean(ret);
  const showSideIntro = !freeDepth;

  return (
    <section
      className={styles.manual}
      aria-labelledby="pair-manual-title"
      data-testid="m55-pair-manual"
      data-m55-pair-manual-mode={freeDepth ? 'free-depth' : 'default'}
    >
      <h3 id="pair-manual-title" className={styles.headline}>
        {freeDepth ? '読み返すときの目安' : manual.titleJa}
      </h3>
      <div className={styles.relation}>
        {showSideIntro && one ? (
          <div className={styles.relationSide}>
            <span className={styles.relationLabel}>一方</span>
            <p className={styles.relationBody}>{one.bodyJa}</p>
          </div>
        ) : null}
        {showSideIntro && one && other ? (
          <p className={styles.mirrorVs} aria-hidden>
            →
          </p>
        ) : null}
        {showSideIntro && other ? (
          <div className={styles.relationSide}>
            <span className={styles.relationLabel}>もう一方</span>
            <p className={styles.relationBody}>{other.bodyJa}</p>
          </div>
        ) : null}
        {showRecognitionDepth && entry ? (
          <div className={styles.relationSide}>
            <span className={styles.relationLabel}>{entry.labelJa}</span>
            <p className={styles.relationBody}>{entry.bodyJa}</p>
          </div>
        ) : null}
        {showPaidReturn && ret ? (
          <div className={styles.relationReturn}>
            <span className={styles.relationLabel}>{ret.labelJa}</span>
            <p className={styles.relationBody}>{ret.bodyJa}</p>
          </div>
        ) : null}
      </div>
      {showRecognitionDepth && rest.length > 0 ? (
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
