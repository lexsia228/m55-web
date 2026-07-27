'use client';

import {
  FREE_CONTINUOUS_FLOW_STEPS_JA,
  FREE_CONTINUOUS_FLOW_TOTAL,
} from '../../lib/m55/freeResult/segmentedDobInputV1';
import CoreFreeClueProgressVisual from './CoreFreeClueProgressVisual';
import styles from './CoreExperience.module.css';

type Props = {
  /** 1-based step index within the continuous 6-step flow. */
  stepNumber: number;
  /** Filled clue count (completed). Defaults to stepNumber - 1. */
  completedCount?: number;
  /** Show compact visual (mobile-friendly). Default true. */
  showVisual?: boolean;
};

/**
 * Single progress system for DOB + five questions (text + abstract clue visual).
 */
export default function CoreFreeContinuousFlowProgress({
  stepNumber,
  completedCount,
  showVisual = true,
}: Props) {
  const clamped = Math.min(Math.max(stepNumber, 1), FREE_CONTINUOUS_FLOW_TOTAL);
  const filled =
    typeof completedCount === 'number'
      ? Math.min(Math.max(completedCount, 0), FREE_CONTINUOUS_FLOW_TOTAL)
      : Math.max(clamped - 1, 0);
  const remaining = Math.max(FREE_CONTINUOUS_FLOW_TOTAL - clamped, 0);
  const axis = FREE_CONTINUOUS_FLOW_STEPS_JA[clamped - 1] ?? '';

  return (
    <div
      className={styles.freeContinuousProgress}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={FREE_CONTINUOUS_FLOW_TOTAL}
      aria-valuenow={clamped}
      aria-label={`進行 ${clamped} / ${FREE_CONTINUOUS_FLOW_TOTAL} ${axis}${
        remaining > 0 ? ` あと${remaining}つ` : ''
      }`}
      data-testid="m55-free-continuous-progress"
    >
      <div className={styles.freeContinuousProgressTop}>
        <span className={styles.freeContinuousProgressCount}>
          {clamped} / {FREE_CONTINUOUS_FLOW_TOTAL}
        </span>
        {remaining > 0 ? (
          <span className={styles.freeContinuousProgressRemaining}>あと{remaining}つ</span>
        ) : (
          <span className={styles.freeContinuousProgressRemaining}>最終の手がかり</span>
        )}
      </div>
      {showVisual ? (
        <CoreFreeClueProgressVisual completedCount={filled} currentStep={clamped} />
      ) : null}
    </div>
  );
}
