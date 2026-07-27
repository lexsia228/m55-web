'use client';

import {
  FREE_CONTINUOUS_FLOW_STEPS_JA,
  FREE_CONTINUOUS_FLOW_TOTAL,
  FREE_QUESTION_FLOW_TOTAL,
} from '../../lib/m55/freeResult/segmentedDobInputV1';
import CoreFreeClueProgressVisual from './CoreFreeClueProgressVisual';
import styles from './CoreExperience.module.css';

type Props = {
  /** 1-based clue index within the 6-clue motif (basic info = 1, questions = 2–6). */
  stepNumber: number;
  /** Filled clue count (completed). */
  completedCount?: number;
  /** When set, progress text shows question count (1/5) instead of clue step (2/6). */
  questionIndex?: number;
  /** Show compact visual (mobile-friendly). Default true. */
  showVisual?: boolean;
};

/**
 * Card-level progress: `1 / 5` + remaining + six-clue visual.
 * Stage label ("5つの問い") lives only in the top stepper — not repeated here.
 */
export default function CoreFreeContinuousFlowProgress({
  stepNumber,
  completedCount,
  questionIndex,
  showVisual = true,
}: Props) {
  const clamped = Math.min(Math.max(stepNumber, 1), FREE_CONTINUOUS_FLOW_TOTAL);
  const filled =
    typeof completedCount === 'number'
      ? Math.min(Math.max(completedCount, 0), FREE_CONTINUOUS_FLOW_TOTAL)
      : Math.max(clamped - 1, 0);
  const axis = FREE_CONTINUOUS_FLOW_STEPS_JA[clamped - 1] ?? '';

  const inQuestionnaire =
    typeof questionIndex === 'number' && questionIndex >= 0 && questionIndex < FREE_QUESTION_FLOW_TOTAL;
  const questionNumber = inQuestionnaire ? questionIndex + 1 : null;
  const questionRemaining =
    questionNumber !== null ? Math.max(FREE_QUESTION_FLOW_TOTAL - questionNumber, 0) : null;

  const countLabel = inQuestionnaire
    ? `${questionNumber} / ${FREE_QUESTION_FLOW_TOTAL}`
    : `${clamped} / ${FREE_CONTINUOUS_FLOW_TOTAL}`;

  const remainingLabel =
    questionRemaining !== null && questionRemaining > 0
      ? `あと${questionRemaining}問`
      : inQuestionnaire
        ? '最後の問い'
        : clamped >= FREE_CONTINUOUS_FLOW_TOTAL
          ? '最終の手がかり'
          : `あと${Math.max(FREE_CONTINUOUS_FLOW_TOTAL - clamped, 0)}つ`;

  return (
    <div
      className={styles.freeContinuousProgress}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={inQuestionnaire ? FREE_QUESTION_FLOW_TOTAL : FREE_CONTINUOUS_FLOW_TOTAL}
      aria-valuenow={inQuestionnaire ? questionNumber! : clamped}
      aria-label={
        inQuestionnaire
          ? `質問 ${countLabel}${questionRemaining ? ` ${remainingLabel}` : ''}`
          : `進行 ${countLabel} ${axis} ${remainingLabel}`
      }
      data-testid="m55-free-continuous-progress"
    >
      <div className={styles.freeContinuousProgressTop}>
        <span className={styles.freeContinuousProgressCount}>{countLabel}</span>
        <span className={styles.freeContinuousProgressRemaining}>{remainingLabel}</span>
      </div>
      {showVisual ? (
        <CoreFreeClueProgressVisual completedCount={filled} currentStep={clamped} />
      ) : null}
    </div>
  );
}
