'use client';

import type { ManualSpecV1 } from '../../lib/m55/narrative/m55NarrativeSpecV1';
import styles from './NarrativeShare.module.css';

export default function PairManualBlock({ manual }: { manual: ManualSpecV1 }) {
  return (
    <section
      className={styles.manual}
      aria-labelledby="pair-manual-title"
      data-testid="m55-pair-manual"
    >
      <h3 id="pair-manual-title" className={styles.headline}>
        {manual.titleJa}
      </h3>
      <ul className={styles.slotList}>
        {manual.slots.map((slot) => (
          <li key={slot.id} className={styles.slot}>
            <span className={styles.slotLabel}>{slot.labelJa}</span>
            <p className={styles.slotBody}>{slot.bodyJa}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
