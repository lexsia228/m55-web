'use client';

import type { FreeJourneyStep } from '../../lib/m55/freeResult/coreFreeRevealUxState';
import styles from './CoreExperience.module.css';

type Props = {
  currentStep: FreeJourneyStep;
  questionLabel?: string;
};

const STEPS: readonly { id: FreeJourneyStep; labelJa: string }[] = [
  { id: 'profile', labelJa: '基本情報' },
  { id: 'questions', labelJa: '5つの問い' },
  { id: 'result', labelJa: '無料結果' },
];

export default function CoreFreeJourneyStepper({ currentStep, questionLabel }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <nav
      className={styles.freeJourneyStepper}
      aria-label="無料結果までの進行"
      data-testid="m55-free-journey-stepper"
      data-m55-print-hide
    >
      <ol className={styles.freeJourneyStepperList}>
        {STEPS.map((step, index) => {
          const completed = index < currentIndex;
          const current = step.id === currentStep;
          const status = completed ? '完了' : current ? '現在' : '未完了';
          return (
            <li
              key={step.id}
              className={`${styles.freeJourneyStepperItem}${
                completed ? ` ${styles.freeJourneyStepperItemDone}` : ''
              }${current ? ` ${styles.freeJourneyStepperItemCurrent}` : ''}`}
              aria-current={current ? 'step' : undefined}
            >
              <span className={styles.freeJourneyStepperMarker} aria-hidden>
                {completed ? '✓' : index + 1}
              </span>
              <span className={styles.freeJourneyStepperLabel}>
                {step.labelJa}
                {current && step.id === 'questions' && questionLabel ? (
                  <span className={styles.freeJourneyStepperSub}> {questionLabel}</span>
                ) : null}
              </span>
              <span className={styles.visuallyHidden}>{status}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
