'use client';

import { useId, useState } from 'react';
import {
  FREE_QUESTIONNAIRE_COPY_V1,
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
};

export default function CoreFreeQuestionnaireLayer({
  answers,
  onChange,
  onComplete,
  isReanswerFlow = false,
  onIndexChange,
}: Props) {
  const [index, setIndex] = useState(0);
  const headingId = useId();
  const total = FREE_QUESTIONNAIRE_COPY_V1.length;
  const current = FREE_QUESTIONNAIRE_COPY_V1[index]!;
  const selected = answers[current.questionId] ?? '';
  const progressLabel = `${index + 1}/${total}`;

  function setIndexAndNotify(next: number) {
    setIndex(next);
    onIndexChange?.(next);
  }

  function goNext() {
    if (!selected) return;
    if (index >= total - 1) {
      onComplete();
      return;
    }
    setIndexAndNotify(Math.min(index + 1, total - 1));
  }

  function goBack() {
    setIndexAndNotify(Math.max(index - 1, 0));
  }

  const completeLabel = isReanswerFlow
    ? REANSWER_CONFIRM_COPY_V1.finalizeJa
    : '答えをそろえる';

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeQuestionnaireSection}`}
      aria-labelledby={headingId}
    >
      <CoreFreeJourneyStepper currentStep="questions" questionLabel={progressLabel} />
      <span className={styles.tierAOverline}>6つの問い</span>
      <h2 id={headingId} className={styles.sectionTitle}>
        いまの感じ方を、1問ずつ選びます
      </h2>
      <p className={styles.sectionLead}>
        正解はありません。いちばん近い感じを選んでください。
      </p>

      <div className={styles.freeQuestionnaireProgress} aria-live="polite">
        <span className={styles.freeQuestionnaireProgressLabel}>{progressLabel}</span>
        <div
          className={styles.freeQuestionnaireProgressNodes}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-label={`質問 ${progressLabel}`}
        >
          {FREE_QUESTIONNAIRE_COPY_V1.map((item, nodeIndex) => {
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
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <p className={styles.freeQuestionnaireShortLabel}>{current.shortLabelJa}</p>
      <p className={styles.freeQuestionnaireScene}>{current.sceneContextJa}</p>
      <h3 className={styles.freeQuestionnaireQuestion}>{current.questionJa}</h3>

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
          disabled={index === 0}
        >
          戻る
        </button>
        <button
          type="button"
          className={styles.freeQuestionnairePrimaryBtn}
          onClick={goNext}
          disabled={!selected}
        >
          {index >= total - 1 ? completeLabel : '次へ'}
        </button>
      </div>
    </section>
  );
}
