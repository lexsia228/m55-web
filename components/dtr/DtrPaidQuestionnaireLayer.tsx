'use client';

import { useId, useState } from 'react';
import {
  PAID_QUESTIONNAIRE_COPY_V1,
  type PaidQuestionId,
} from '../../lib/m55/paidResult/questionnaireCopyV1';
import { PAID_QUESTION_IDS } from '../../lib/m55/individualization/answerIdMapsV1';
import { queueDtrDraftSync } from '../../lib/m55/dtrDraftClientSync';
import { ProfileRepository } from '../../lib/soul/profile';
import { useAuth } from '@clerk/nextjs';
import styles from '../core/CoreExperience.module.css';

type Props = {
  onComplete?: () => void;
};

function isCompletePaidAnswerSet(answers: Record<string, string>): boolean {
  return PAID_QUESTION_IDS.every((id) => Boolean(answers[id]));
}

export default function DtrPaidQuestionnaireLayer({ onComplete }: Props) {
  const { userId } = useAuth();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const headingId = useId();
  const total = PAID_QUESTIONNAIRE_COPY_V1.length;
  const current = PAID_QUESTIONNAIRE_COPY_V1[index]!;
  const selected = answers[current.questionId] ?? '';
  const progressLabel = `${index + 1}/${total}`;

  function goNext() {
    if (!selected) return;
    if (index >= total - 1) {
      const merged = { ...answers, [current.questionId]: selected };
      if (!isCompletePaidAnswerSet(merged)) return;
      const profile = ProfileRepository.get(userId ?? null);
      if (profile?.birthDate && profile.nickname?.trim()) {
        queueDtrDraftSync(userId ?? null, {
          nickname: profile.nickname.trim(),
          birthDate: profile.birthDate,
          extraJson: { paidAnswerSet: merged },
        });
      }
      try {
        sessionStorage.setItem('m55_paid_answers_v1', JSON.stringify(merged));
      } catch {
        /* no-op */
      }
      onComplete?.();
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
      <span className={styles.tierAOverline}>保存版の入力</span>
      <h2 id={headingId} className={styles.sectionTitle}>
        6つの問い（保存版）
      </h2>
      <p className={styles.sectionLead}>
        無料の6問に加えて、保存版の読み解きに必要な6問です。1問ずつ選べます。
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
              onClick={() =>
                setAnswers((prev) => ({
                  ...prev,
                  [current.questionId]: choice.answerId,
                }))
              }
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
          {index >= total - 1 ? '入力を完了する' : '次へ'}
        </button>
      </div>
    </section>
  );
}
