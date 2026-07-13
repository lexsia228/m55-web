'use client';

import { useId, useRef, useState } from 'react';
import {
  PAID_QUESTIONNAIRE_COPY_V1,
  type PaidQuestionId,
} from '../../lib/m55/paidResult/questionnaireCopyV1';
import { PAID_QUESTION_IDS } from '../../lib/m55/individualization/answerIdMapsV1';
import { queueDtrDraftSync } from '../../lib/m55/dtrDraftClientSync';
import { ProfileRepository } from '../../lib/soul/profile';
import { useAuth } from '@clerk/nextjs';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import styles from './DtrPaidDecisionUx.module.css';

type Props = {
  onComplete?: () => void;
};

type Phase = 'entry' | 'question' | 'complete';

function isCompletePaidAnswerSet(answers: Record<string, string>): boolean {
  return PAID_QUESTION_IDS.every((id) => Boolean(answers[id]));
}

function labelForAnswer(questionId: PaidQuestionId, answerId: string): string {
  const q = PAID_QUESTIONNAIRE_COPY_V1.find((item) => item.questionId === questionId);
  return q?.choices.find((c) => c.answerId === answerId)?.labelJa ?? '';
}

export default function DtrPaidQuestionnaireLayer({ onComplete }: Props) {
  const { userId } = useAuth();
  const [phase, setPhase] = useState<Phase>('entry');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);
  const startFiredRef = useRef(false);
  const headingId = useId();
  const total = PAID_QUESTIONNAIRE_COPY_V1.length;
  const current = PAID_QUESTIONNAIRE_COPY_V1[index]!;
  const selected = answers[current.questionId] ?? '';
  const progressLabel = `${index + 1} / ${total}`;

  function persistAndComplete(merged: Record<string, string>) {
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
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.paidQuestionnaireComplete,
      'dtr_paid_questionnaire',
      'dtr-paid-questionnaire-complete',
    );
    setPhase('complete');
  }

  function startQuestionnaire() {
    if (!startFiredRef.current) {
      startFiredRef.current = true;
      trackFunnelAction(M55_FUNNEL_EVENTS.paidQuestionnaireStart, 'dtr_paid_questionnaire');
    }
    setPhase('question');
  }

  function goNext() {
    if (!selected) return;
    if (index >= total - 1) {
      const merged = { ...answers, [current.questionId]: selected };
      persistAndComplete(merged);
      return;
    }
    setIndex((n) => Math.min(n + 1, total - 1));
  }

  function goBack() {
    setIndex((n) => Math.max(n - 1, 0));
  }

  function goToPlans() {
    onComplete?.();
  }

  if (phase === 'entry') {
    return (
      <section
        className={styles.shell}
        data-m55-paid-phase="entry"
        aria-labelledby={headingId}
      >
        <p className={styles.overline}>保存版の質問</p>
        <h2 id={headingId} className={styles.title}>
          保存版の6問を始める前に
        </h2>
        <p className={styles.lead}>
          保存版では、無料の見取り図に6つの答えを重ね、4章の中で出やすい場面や戻し方を整理します。
        </p>
        <ul className={styles.metaList}>
          <li>質問は6問です（約1〜2分）</li>
          <li>正解はありません</li>
          <li>あとで回答を確認できます</li>
          <li>生年月日と回答をもとに、保存版を構成します</li>
        </ul>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={startQuestionnaire}>
            保存版の6問を始める
          </button>
        </div>
      </section>
    );
  }

  if (phase === 'complete') {
    return (
      <section
        className={styles.shell}
        data-m55-paid-phase="complete"
        aria-labelledby={headingId}
      >
        <p className={styles.overline}>保存版の質問</p>
        <h2 id={headingId} className={styles.title}>
          6つの回答がそろいました
        </h2>
        <p className={styles.lead}>回答済み 6件。内容を確認してから、保存版のプランへ進めます。</p>
        <ul className={styles.answerList}>
          {PAID_QUESTIONNAIRE_COPY_V1.map((q) => {
            const answerId = answers[q.questionId] ?? '';
            const open = openReviewId === q.questionId;
            return (
              <li key={q.questionId} className={styles.answerItem}>
                <button
                  type="button"
                  className={styles.answerSummary}
                  aria-expanded={open}
                  onClick={() =>
                    setOpenReviewId((prev) => (prev === q.questionId ? null : q.questionId))
                  }
                >
                  <span className={styles.answerQ}>{q.shortLabelJa}</span>
                  <span className={styles.answerA}>{labelForAnswer(q.questionId, answerId)}</span>
                </button>
                {open ? (
                  <p className={styles.answerDetail}>{q.questionJa}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              setIndex(0);
              setPhase('question');
            }}
          >
            回答を見直す
          </button>
          <button type="button" className={styles.primaryBtn} onClick={goToPlans}>
            保存版のプランを見る
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={styles.shell}
      data-m55-paid-phase="question"
      aria-labelledby={headingId}
    >
      <div className={styles.progressRow}>
        <p className={styles.overline}>保存版の質問</p>
        <span className={styles.progressLabel} aria-live="polite">
          {progressLabel}
        </span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-label={`質問 ${progressLabel}`}
      >
        <span
          className={styles.progressFill}
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      <p className={styles.questionLabel}>{current.shortLabelJa}</p>
      <h2 id={headingId} className={styles.questionTitle}>
        {current.questionJa}
      </h2>
      <p className={styles.hint}>
        この答えは、保存版で場面ごとの出方を整理するために使います。
      </p>

      <div className={styles.choices} role="radiogroup" aria-label={current.questionJa}>
        {current.choices.map((choice) => {
          const isSelected = selected === choice.answerId;
          return (
            <button
              key={choice.answerId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.choice}${isSelected ? ` ${styles.choiceSelected}` : ''}`}
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

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={goBack}
          disabled={index === 0}
        >
          戻る
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={goNext}
          disabled={!selected}
        >
          {index >= total - 1 ? '回答を確認する' : '次へ'}
        </button>
      </div>
    </section>
  );
}
