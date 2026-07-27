'use client';

import {
  FREE_CONTINUOUS_FLOW_TOTAL,
} from '../../lib/m55/freeResult/segmentedDobInputV1';
import styles from './CoreExperience.module.css';

type Props = {
  /** How many clue segments are filled (0–6). Does not encode answer identity. */
  completedCount: number;
  /** 1-based current step for soft current ring. */
  currentStep: number;
};

/**
 * Abstract six-point progress metaphor — progress only, never answer-encoding.
 */
export default function CoreFreeClueProgressVisual({
  completedCount,
  currentStep,
}: Props) {
  const filled = Math.min(Math.max(completedCount, 0), FREE_CONTINUOUS_FLOW_TOTAL);
  const current = Math.min(Math.max(currentStep, 1), FREE_CONTINUOUS_FLOW_TOTAL);

  return (
    <div
      className={styles.freeClueVisual}
      aria-hidden
      data-testid="m55-free-clue-visual"
      data-completed={filled}
    >
      <svg
        className={styles.freeClueVisualSvg}
        viewBox="0 0 120 120"
        role="presentation"
        focusable="false"
      >
        <circle
          className={styles.freeClueVisualOrbit}
          cx="60"
          cy="60"
          r="44"
        />
        {Array.from({ length: FREE_CONTINUOUS_FLOW_TOTAL }, (_, index) => {
          const n = index + 1;
          const angle = (-90 + index * 60) * (Math.PI / 180);
          const cx = 60 + Math.cos(angle) * 44;
          const cy = 60 + Math.sin(angle) * 44;
          const isFilled = n <= filled;
          const isCurrent = n === current && !isFilled;
          return (
            <circle
              key={n}
              className={`${styles.freeClueVisualPoint}${
                isFilled ? ` ${styles.freeClueVisualPointFilled}` : ''
              }${isCurrent ? ` ${styles.freeClueVisualPointCurrent}` : ''}`}
              cx={cx}
              cy={cy}
              r={isFilled ? 6.5 : 5}
              data-clue-point={n}
              data-filled={isFilled ? '1' : '0'}
            />
          );
        })}
        <circle className={styles.freeClueVisualCore} cx="60" cy="60" r="10" />
      </svg>
      <p className={styles.freeClueVisualCaption}>6つの手がかり</p>
    </div>
  );
}
