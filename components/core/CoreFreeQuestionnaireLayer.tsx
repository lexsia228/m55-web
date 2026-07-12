'use client';

import { useId, useState } from 'react';
import {
  FREE_CURRENT_INTEREST_COPY_V1,
  FREE_FIVE_QUESTION_COUNT,
  FREE_FIVE_QUESTIONS_COPY_V1,
  type FreeQuestionId,
} from '../../lib/m55/freeResult/questionnaireCopyV1';
import { REANSWER_CONFIRM_COPY_V1 } from '../../lib/m55/freeResult/guestFreeJourneyCopyV1';
import CoreFreeJourneyStepper from './CoreFreeJourneyStepper';
import styles from './CoreExperience.module.css';

type Props = {
  answers: Record<string, string>;
  onChange: (questionId: FreeQuestionId, answerId: string) => void;
  onComplete: () => void;
  isReanswerFlow?: boolean;
  onIndexChange?: (index: number) => void;
  onInterestStepChange?: (active: boolean) => void;
};

export default function CoreFreeQuestionnaireLayer({
  answers,
  onChange,
  onComplete,
  isReanswerFlow = false,
  onIndexChange,
  onInterestStepChange,
}: Props) {
  const [index, setIndex] = useState(0);
  const [interestStep, setInterestStep] = useState(false);
  const headingId = useId();
  const interest = FREE_CURRENT_INTEREST_COPY_V1;
  const current = interestStep ? interest : FREE_FIVE_QUESTIONS_COPY_V1[index]!;
  const selected = answers[current.questionId] ?? '';
  const progressLabel = interestStep ? undefined : `${index + 1}/${FREE_FIVE_QUESTION_COUNT}`;

  function setIndexAndNotify(next: number, nextInterest = false) {
    setIndex(next);
    setInterestStep(nextInterest);
    onIndexChange?.(nextInterest ? FREE_FIVE_QUESTION_COUNT : next);
    onInterestStepChange?.(nextInterest);
  }

  function goNext() {
    if (!selected) return;
    if (interestStep) {
      onComplete();
      return;
    }
    if (index >= FREE_FIVE_QUESTION_COUNT - 1) {
      setIndexAndNotify(index, true);
      return;
    }
    setIndexAndNotify(Math.min(index + 1, FREE_FIVE_QUESTION_COUNT - 1));
  }

  function goBack() {
    if (interestStep) {
      setIndexAndNotify(FREE_FIVE_QUESTION_COUNT - 1, false);
      return;
    }
    setIndexAndNotify(Math.max(index - 1, 0));
  }

  const completeLabel = isReanswerFlow
    ? REANSWER_CONFIRM_COPY_V1.finalizeJa
    : '見取り図を開く';

  const stepperStep = interestStep ? 'interest' : 'questions';
  const overline = interestStep ? '今の関心' : '5つの問い';
  const sectionTitle = interestStep
    ? interest.questionJa
    : 'いまの感じ方を、1問ずつ選びます';
  const sectionLead = interestStep
    ? interest.sceneContextJa
    : '正解はありません。いちばん近い感じを選んでください。';

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeQuestionnaireSection}`}
      aria-labelledby={headingId}
    >
      <CoreFreeJourneyStepper currentStep={stepperStep} questionLabel={progressLabel} />
      <span className={styles.tierAOverline}>{overline}</span>
      <h2 id={headingId} className={styles.sectionTitle}>
        {sectionTitle}
      </h2>
      {!interestStep ? <p className={styles.sectionLead}>{sectionLead}</p> : null}
      {interestStep ? <p className={styles.sectionLead}>{sectionLead}</p> : null}

      {!interestStep ? (
        <div className={styles.freeQuestionnaireProgress} aria-live="polite">
          <span className={styles.freeQuestionnaireProgressLabel}>{progressLabel}</span>
          <div
            className={styles.freeQuestionnaireProgressNodes}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={FREE_FIVE_QUESTION_COUNT}
            aria-valuenow={index + 1}
            aria-label={`質問 ${progressLabel}`}
          >
            {FREE_FIVE_QUESTIONS_COPY_V1.map((item, nodeIndex) => {
              const answered = Boolean(answers[item.questionId]);
              const isCurrent = nodeIndex === index;
              const nodeClass = [
                styles.freeQuestionnaireProgressNode,
                answered ? styles.freeQuestionnaireProgressNodeAnswered : '',
                isCurrent ? styles.freeQuestionnaireProgressNodeCurrent : '',
              ]
                .filter(Boolean)
                .join(' ');
              return <span key={item.questionId} className={nodeClass} aria-hidden={!isCurrent} />;
            })}
          </div>
          <div className={styles.freeQuestionnaireProgressTrack} aria-hidden>
            <span
              className={styles.freeQuestionnaireProgressFill}
              style={{ width: `${((index + 1) / FREE_FIVE_QUESTION_COUNT) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {!interestStep ? (
        <p className={styles.freeQuestionnaireShortLabel}>{current.shortLabelJa}</p>
      ) : (
        <p className={styles.freeQuestionnaireShortLabel}>{interest.shortLabelJa}</p>
      )}
      {!interestStep ? (
        <p className={styles.freeQuestionnaireScene}>{current.sceneContextJa}</p>
      ) : null}
      {!interestStep ? (
        <h3 className={styles.freeQuestionnaireQuestion}>{current.questionJa}</h3>
      ) : null}

      <div
        className={styles.freeQuestionnaireChoices}
        role="radiogroup"
        aria-label={current.questionJa}
      >
        {current.choices.map((choice) => {
          const isSelected = selected === choice.answerId;
          return (
            <button
              key={choice.answerId}
              type="button"
              role="radio"
              aria-checked={isSelected}
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
              <span className={styles.freeQuestionnaireChoiceLabel}>{choice.labelJa}</span>
              {isSelected ? (
                <span className={styles.freeQuestionnaireChoiceMark} aria-hidden>
                  選択中
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className={styles.freeQuestionnaireActions}>
        <button
          type="button"
          className={styles.freeQuestionnaireSecondaryBtn}
          onClick={goBack}
          disabled={!interestStep && index === 0}
        >
          戻る
        </button>
        <button
          type="button"
          className={styles.freeQuestionnairePrimaryBtn}
          onClick={goNext}
          disabled={!selected}
        >
          {interestStep ? completeLabel : '次へ'}
        </button>
      </div>
    </section>
  );
}
