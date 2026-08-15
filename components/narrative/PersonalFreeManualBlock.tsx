'use client';

import type { ManualSpecV1 } from '../../lib/m55/narrative/m55NarrativeSpecV1';
import styles from './NarrativeShare.module.css';

export default function PersonalFreeManualBlock({
  manual,
  titleId = 'personal-free-manual-title',
}: {
  manual: ManualSpecV1;
  titleId?: string;
}) {
  return (
    <section
      className={styles.manual}
      aria-labelledby={titleId}
      data-testid="m55-personal-manual"
    >
      <h2 id={titleId} className={styles.headline}>
        {manual.titleJa}
      </h2>
      <ul className={styles.slotList}>
        {manual.slots.map((slot) => (
          <li key={slot.id} className={styles.slot}>
            <span className={styles.slotLabel}>{slot.labelJa}</span>
            <p className={styles.slotBody}>{slot.bodyJa}</p>
          </li>
        ))}
      </ul>
      {manual.hiddenSpecJa ? (
        <p className={styles.hiddenSpec} data-testid="m55-personal-hidden-spec">
          自分でも知らなかった仕様：{manual.hiddenSpecJa}
        </p>
      ) : null}
    </section>
  );
}
