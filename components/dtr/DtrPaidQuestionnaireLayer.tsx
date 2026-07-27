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
  /** When false, entry must not claim free result completion. */
  freeResultReady?: boolean;
};

type Phase = 'entry' | 'question' | 'complete';

function isCompletePaidAnswerSet(answers: Record<string, string>): boolean {
  return PAID_QUESTION_IDS.every((id) => Boolean(answers[id]));
}

function labelForAnswer(questionId: PaidQuestionId, answerId: string): string {
  const q = PAID_QUESTIONNAIRE_COPY_V1.find((item) => item.questionId === questionId);
  return q?.choices.find((c) => c.answerId === answerId)?.labelJa ?? '';
}

export default function DtrPaidQuestionnaireLayer({
  onComplete,
  freeResultReady = false,
}: Props) {
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
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.paidQuestionsCompleted,
      'dtr_paid_questionnaire',
      'dtr-paid-questions-completed',
    );
    setPhase('complete');
  }

  function startQuestionnaire() {
    if (!startFiredRef.current) {
      startFiredRef.current = true;
      trackFunnelAction(M55_FUNNEL_EVENTS.paidQuestionnaireStart, 'dtr_paid_questionnaire');
      trackFunnelAction(M55_FUNNEL_EVENTS.paidQuestionsStarted, 'dtr_paid_questionnaire');
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
        <p className={styles.overline}>プレミアムレポートの質問</p>
        <h2 id={headingId} className={styles.title}>
          あなた向けの4章レポートに仕上げます
        </h2>
        <p className={styles.lead}>
          {freeResultReady
            ? '無料結果を土台に、ここからの6つの回答で次の内容をあなた向けに重ねます。'
            : 'ここからの6つの回答で、次の内容をあなた向けに重ねます。'}
        </p>
        <ul className={styles.metaList}>
          <li>力が出やすい条件</li>
          <li>負担が重なる順番</li>
          <li>人との距離の取り方</li>
          <li>戻しやすい整え方</li>
        </ul>
        <p className={styles.lead}>あと6問・約1〜2分。質問のあと、プランを選んで決済へ進みます。</p>
        <ol className={styles.progressSequence} aria-label="これからの流れ">
          {freeResultReady ? <li>無料結果 完了</li> : <li>無料結果を確認</li>}
          <li>追加6問</li>
          <li>プラン選択・決済</li>
          <li>プレミアムレポート</li>
        </ol>
        <ul className={styles.metaList}>
          <li>正解はありません</li>
          <li>あとで回答を確認できます</li>
        </ul>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={startQuestionnaire}>
            プレミアムレポートの6問を始める
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
        <p className={styles.overline}>プレミアムレポートの質問</p>
        <h2 id={headingId} className={styles.title}>
          6つの回答がそろいました
        </h2>
        <p className={styles.lead}>回答済み 6件。内容を確認してから、プレミアムレポートのプランへ進めます。</p>
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
            プラン選択へ進む
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
        <p className={styles.overline}>プレミアムレポートの質問</p>
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
        この答えは、プレミアムレポートで場面ごとの出方を整理するために使います。
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
