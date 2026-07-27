'use client';

import { useEffect, useState } from 'react';
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

function useStepperColumns(): number {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const sync = () => {
      const w = window.innerWidth;
      setColumns(w >= 900 ? 3 : 2);
    };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return columns;
}

export default function CoreFreeJourneyStepper({ currentStep, questionLabel }: Props) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const columns = useStepperColumns();

  return (
    <nav className={styles.freeJourneyStepper} aria-label="無料結果までの進行">
      <ol
        className={styles.freeJourneyStepperList}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
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
              style={{ minHeight: '2.75rem' }}
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
