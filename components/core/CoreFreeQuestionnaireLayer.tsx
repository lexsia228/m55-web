'use client';

import { useEffect, useId, useState } from 'react';
import {
  FREE_AXIS_EYEBROW_SUFFIX_JA,
  FREE_FIVE_QUESTION_COUNT,
  FREE_FIVE_QUESTIONS_COPY_V1,
  FREE_QUESTION_HELPER_COMPACT_JA,
  FREE_QUESTION_HELPER_JA,
  type FreeQuestionId,
} from '../../lib/m55/freeResult/questionnaireCopyV1';
import { FREE_CONTINUOUS_FLOW_TOTAL } from '../../lib/m55/freeResult/segmentedDobInputV1';
import { REANSWER_CONFIRM_COPY_V1 } from '../../lib/m55/freeResult/guestFreeJourneyCopyV1';
import CoreFreeContinuousFlowProgress from './CoreFreeContinuousFlowProgress';
import styles from './CoreExperience.module.css';

type Props = {
  answers: Record<string, string>;
  onChange: (questionId: FreeQuestionId, answerId: string) => void;
  onComplete: () => void;
  isReanswerFlow?: boolean;
  onIndexChange?: (index: number) => void;
  onRequestDobChange?: () => void;
};

export default function CoreFreeQuestionnaireLayer({
  answers,
  onChange,
  onComplete,
  isReanswerFlow = false,
  onIndexChange,
  onRequestDobChange,
}: Props) {
  const [index, setIndex] = useState(0);
  const headingId = useId();
  const current = FREE_FIVE_QUESTIONS_COPY_V1[index]!;
  const selected = answers[current.questionId] ?? '';
  const isLast = index >= FREE_FIVE_QUESTION_COUNT - 1;
  /** Continuous flow: DOB is 1/6, questions are 2/6–6/6. */
  const continuousStep = index + 2;
  const completedCount = selected ? continuousStep : continuousStep - 1;
  const remainingAfterComplete = Math.max(FREE_CONTINUOUS_FLOW_TOTAL - continuousStep, 0);

  function setIndexAndNotify(next: number) {
    setIndex(next);
    onIndexChange?.(next);
  }

  function goNext() {
    if (!selected) return;
    if (isLast) {
      onComplete();
      return;
    }
    setIndexAndNotify(Math.min(index + 1, FREE_FIVE_QUESTION_COUNT - 1));
  }

  function goBack() {
    if (index === 0 && onRequestDobChange) {
      onRequestDobChange();
      return;
    }
    setIndexAndNotify(Math.max(index - 1, 0));
  }

  function selectByOrdinal(ordinal: number) {
    const choice = current.choices[ordinal];
    if (!choice) return;
    onChange(current.questionId, choice.answerId);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      if (event.key === '1' || event.key === '2' || event.key === '3') {
        event.preventDefault();
        selectByOrdinal(Number(event.key) - 1);
        return;
      }
      if (event.key === 'Enter') {
        if (!selected) return;
        event.preventDefault();
        goNext();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind to current question/selection
  }, [current.questionId, selected, index, isLast]);

  const completeLabel = isReanswerFlow
    ? REANSWER_CONFIRM_COPY_V1.finalizeJa
    : '無料結果を見る';

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeGuidedShell}`}
      aria-labelledby={headingId}
      data-testid="m55-free-questionnaire"
    >
      <div className={styles.freeGuidedVisualCol}>
        <CoreFreeContinuousFlowProgress
          stepNumber={continuousStep}
          completedCount={completedCount}
        />
      </div>

      <div className={styles.freeGuidedFormCol}>
        {!isReanswerFlow && onRequestDobChange ? (
          <div className={styles.freeDobCompactBar}>
            <button
              type="button"
              className={styles.freeDobCompactChange}
              onClick={onRequestDobChange}
            >
              入力内容を変更
            </button>
          </div>
        ) : null}

        <p className={styles.freeContinuousEyebrow}>
          {current.shortLabelJa}
          {FREE_AXIS_EYEBROW_SUFFIX_JA}
        </p>
        <h1 id={headingId} className={styles.freeContinuousQuestionTitle}>
          {current.questionJa}
        </h1>
        {index === 0 ? (
          <p className={styles.freeContinuousHelper}>{FREE_QUESTION_HELPER_JA}</p>
        ) : (
          <p className={styles.freeContinuousHelperCompact}>{FREE_QUESTION_HELPER_COMPACT_JA}</p>
        )}

        <div
          className={styles.freeQuestionnaireChoices}
          role="radiogroup"
          aria-labelledby={headingId}
        >
          {current.choices.map((choice, choiceIndex) => {
            const isSelected = selected === choice.answerId;
            return (
              <button
                key={choice.answerId}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`${choiceIndex + 1}. ${choice.labelJa}`}
                className={`${styles.freeQuestionnaireChoice}${
                  isSelected ? ` ${styles.freeQuestionnaireChoiceSelected}` : ''
                }`}
                onClick={() => onChange(current.questionId, choice.answerId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onChange(current.questionId, choice.answerId);
                  }
                }}
              >
                <span
                  className={`${styles.freeQuestionnaireChoiceCheck}${
                    isSelected ? ` ${styles.freeQuestionnaireChoiceCheckOn}` : ''
                  }`}
                  aria-hidden
                >
                  {isSelected ? '✓' : ''}
                </span>
                <span className={styles.freeQuestionnaireChoiceLabel}>{choice.labelJa}</span>
              </button>
            );
          })}
        </div>

        {selected ? (
          <p
            className={styles.freeClueAck}
            role="status"
            aria-live="polite"
            data-testid="m55-free-clue-ack"
          >
            <span className={styles.freeClueAckPrimary}>
              {continuousStep} / {FREE_CONTINUOUS_FLOW_TOTAL} 完了
            </span>
            {remainingAfterComplete > 0 ? (
              <span className={styles.freeClueAckSecondary}>
                あと{remainingAfterComplete}つです
              </span>
            ) : null}
          </p>
        ) : (
          <p className={styles.freeClueAckPlaceholder} aria-hidden>
            {'\u00a0'}
          </p>
        )}

        <div className={styles.freeQuestionnaireActions}>
          <button
            type="button"
            className={styles.freeQuestionnaireSecondaryBtn}
            onClick={goBack}
          >
            戻る
          </button>
          <button
            type="button"
            className={styles.freeQuestionnairePrimaryBtn}
            onClick={goNext}
            disabled={!selected}
          >
            {isLast ? completeLabel : '次の質問へ'}
          </button>
        </div>
      </div>
    </section>
  );
}
