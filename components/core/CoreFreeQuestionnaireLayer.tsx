'use client';

import { useId, useState } from 'react';
import {
  FREE_QUESTIONNAIRE_COPY_V1,
  type FreeQuestionId,
} from '../../lib/m55/freeResult/questionnaireCopyV1';
import styles from './CoreExperience.module.css';

type Props = {
  answers: Record<string, string>;
  onChange: (questionId: FreeQuestionId, answerId: string) => void;
  onComplete: () => void;
};

export default function CoreFreeQuestionnaireLayer({
  answers,
  onChange,
  onComplete,
}: Props) {
  const [index, setIndex] = useState(0);
  const headingId = useId();
  const total = FREE_QUESTIONNAIRE_COPY_V1.length;
  const current = FREE_QUESTIONNAIRE_COPY_V1[index]!;
  const selected = answers[current.questionId] ?? '';
  const progressLabel = `${index + 1}/${total}`;

  function goNext() {
    if (!selected) return;
    if (index >= total - 1) {
      onComplete();
      return;
    }
    setIndex((n) => Math.min(n + 1, total - 1));
  }

  function goBack() {
    setIndex((n) => Math.max(n - 1, 0));
  }

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeQuestionnaireSection}`}
      aria-labelledby={headingId}
    >
      <span className={styles.tierAOverline}>いまの表れ方</span>
      <h2 id={headingId} className={styles.sectionTitle}>
        6つの問い
      </h2>
      <p className={styles.sectionLead}>
        生年月日の土台に加えて、いまの感じ方を6問で見ます。1問ずつ選べます。
      </p>

      <div className={styles.freeQuestionnaireProgress} aria-live="polite">
        <span className={styles.freeQuestionnaireProgressLabel}>{progressLabel}</span>
        <div
          className={styles.freeQuestionnaireProgressTrack}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-label={`質問 ${progressLabel}`}
        >
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
              {choice.labelJa}
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
          {index >= total - 1 ? '結果を見る' : '次へ'}
        </button>
      </div>
    </section>
  );
}
