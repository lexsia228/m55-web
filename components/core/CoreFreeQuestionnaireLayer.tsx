'use client';

import { useEffect, useId, useState } from 'react';
import {
  FREE_FIVE_QUESTION_COUNT,
  FREE_AXIS_EYEBROW_SUFFIX_JA,
  FREE_FIVE_QUESTIONS_COPY_V1,
  FREE_QUESTION_HELPER_COMPACT_JA,
  FREE_QUESTION_HELPER_JA,
  type FreeQuestionId,
} from '../../lib/m55/freeResult/questionnaireCopyV1';
import { REANSWER_CONFIRM_COPY_V1 } from '../../lib/m55/freeResult/guestFreeJourneyCopyV1';
import CoreFreeContinuousFlowProgress from './CoreFreeContinuousFlowProgress';
import styles from './CoreExperience.module.css';

type Props = {
  answers: Record<string, string>;
  onChange: (questionId: FreeQuestionId, answerId: string) => void;
  onComplete: () => void;
  isReanswerFlow?: boolean;
  onIndexChange?: (index: number) => void;
  /** Opens the shared profile intake modal — not a duplicate DOB step. */
  onRequestProfileEdit?: () => void;
  /** 1-based resume index into the five questions. */
  initialIndex?: number;
  /** Disable generate / next while a result flight is pending. */
  completing?: boolean;
  /** Visible DOB summary, e.g. 1983年2月28日を使用中 */
  dobSummaryJa?: string;
};

export default function CoreFreeQuestionnaireLayer({
  answers,
  onChange,
  onComplete,
  isReanswerFlow = false,
  onIndexChange,
  onRequestProfileEdit,
  initialIndex = 0,
  completing = false,
  dobSummaryJa,
}: Props) {
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(initialIndex, 0), FREE_FIVE_QUESTION_COUNT - 1),
  );
  const headingId = useId();
  const current = FREE_FIVE_QUESTIONS_COPY_V1[index]!;
  const selected = answers[current.questionId] ?? '';
  const isLast = index >= FREE_FIVE_QUESTION_COUNT - 1;
  /** Clue visual: basic info = clue 1 done; questions = clues 2–6. */
  const clueStep = index + 2;
  const completedClues = selected ? index + 2 : index + 1;

  function setIndexAndNotify(next: number) {
    setIndex(next);
    onIndexChange?.(next);
  }

  function goNext() {
    if (!selected || completing) return;
    if (isLast) {
      onComplete();
      return;
    }
    setIndexAndNotify(Math.min(index + 1, FREE_FIVE_QUESTION_COUNT - 1));
  }

  useEffect(() => {
    onIndexChange?.(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- notify resume index once on mount
  }, []);

  function goBack() {
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
          stepNumber={clueStep}
          completedCount={completedClues}
          questionIndex={index}
        />
      </div>

      <div className={styles.freeGuidedFormCol}>
        {!isReanswerFlow && (dobSummaryJa || onRequestProfileEdit) ? (
          <div className={styles.freeDobCompactBar}>
            {dobSummaryJa ? (
              <p className={styles.freeDobSummary} data-testid="m55-free-dob-summary">
                {dobSummaryJa}
              </p>
            ) : null}
            {onRequestProfileEdit ? (
              <button
                type="button"
                className={styles.freeDobCompactChange}
                onClick={onRequestProfileEdit}
                data-testid="m55-free-profile-edit"
              >
                基本情報を変更
              </button>
            ) : null}
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

        <div className={styles.freeQuestionnaireActions} data-m55-print-hide>
          <button
            type="button"
            className={styles.freeQuestionnaireSecondaryBtn}
            onClick={goBack}
            disabled={index === 0}
          >
            戻る
          </button>
          <button
            type="button"
            className={styles.freeQuestionnairePrimaryBtn}
            onClick={goNext}
            disabled={!selected || completing}
            aria-busy={completing || undefined}
            data-testid={isLast ? 'm55-free-generate-result' : 'm55-free-next-question'}
          >
            {isLast ? completeLabel : '次の質問へ'}
          </button>
        </div>
      </div>
    </section>
  );
}
