'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  PAID_QUESTIONNAIRE_COPY_V1,
  type PaidQuestionId,
} from '../../lib/m55/paidResult/questionnaireCopyV1';
import { PAID_QUESTION_IDS } from '../../lib/m55/individualization/answerIdMapsV1';
import { queueDtrDraftSync } from '../../lib/m55/dtrDraftClientSync';
import { ProfileRepository } from '../../lib/soul/profile';
import { useAuth } from '@clerk/nextjs';
import { PAID_ANSWERS_SESSION_KEY } from '../../lib/m55/selfFunnel/selfFunnelRuntimeState';
import { sanitizeInProgressPaidAnswers } from '../../lib/m55/commercialUx/assetLedger/legacyPaidQuestionAdapter';
import { STATIC_FREE_TO_PAID_BRIDGE } from '../core/corePublicCopy';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import DtrPaidResultContextStrip from './DtrPaidResultContextStrip';
import PremiumExperienceSurface from '../experience/PremiumExperienceSurface';
import styles from './DtrPaidDecisionUx.module.css';

type Props = {
  onComplete?: () => void;
};

type Phase = 'question' | 'complete';

function isCompletePaidAnswerSet(answers: Record<string, string>): boolean {
  return PAID_QUESTION_IDS.every((id) => Boolean(answers[id]));
}

function readStoredPaidAnswers(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(PAID_ANSWERS_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
}

function resolveResumeIndex(answers: Record<string, string>): number {
  for (let i = 0; i < PAID_QUESTIONNAIRE_COPY_V1.length; i++) {
    const q = PAID_QUESTIONNAIRE_COPY_V1[i]!;
    if (!answers[q.questionId]) return i;
  }
  return Math.max(PAID_QUESTIONNAIRE_COPY_V1.length - 1, 0);
}

function labelForAnswer(questionId: PaidQuestionId, answerId: string): string {
  const q = PAID_QUESTIONNAIRE_COPY_V1.find((item) => item.questionId === questionId);
  return q?.choices.find((c) => c.answerId === answerId)?.labelJa ?? '';
}

export default function DtrPaidQuestionnaireLayer({ onComplete }: Props) {
  const { userId } = useAuth();
  const [phase, setPhase] = useState<Phase>('question');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [openReviewId, setOpenReviewId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const startFiredRef = useRef(false);
  const headingId = useId();
  const total = PAID_QUESTIONNAIRE_COPY_V1.length;
  const current = PAID_QUESTIONNAIRE_COPY_V1[index]!;
  const selected = answers[current.questionId] ?? '';
  const progressLabel = `${index + 1} / ${total}`;
  const helperJa = STATIC_FREE_TO_PAID_BRIDGE.ctaSupportJa;

  useEffect(() => {
    const raw = readStoredPaidAnswers();
    const { answers: stored, clearedLegacy } = sanitizeInProgressPaidAnswers(raw);
    if (clearedLegacy && Object.keys(stored).length > 0) {
      try {
        sessionStorage.setItem(PAID_ANSWERS_SESSION_KEY, JSON.stringify(stored));
      } catch {
        /* ignore */
      }
    }
    if (isCompletePaidAnswerSet(stored)) {
      setAnswers(stored);
      setPhase('complete');
    } else if (Object.keys(stored).length > 0) {
      setAnswers(stored);
      setIndex(resolveResumeIndex(stored));
    }
    if (!startFiredRef.current) {
      startFiredRef.current = true;
      trackFunnelAction(M55_FUNNEL_EVENTS.paidQuestionnaireStart, 'dtr_paid_questionnaire');
      trackFunnelAction(M55_FUNNEL_EVENTS.paidQuestionsStarted, 'dtr_paid_questionnaire');
    }
    setHydrated(true);
  }, []);

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
      sessionStorage.setItem(PAID_ANSWERS_SESSION_KEY, JSON.stringify(merged));
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

  if (!hydrated) {
    return (
      <section className={styles.shell} data-m55-paid-phase="loading" aria-busy="true">
        <p className={styles.lead}>読み込み中…</p>
      </section>
    );
  }

  if (phase === 'complete') {
    return (
      <PremiumExperienceSurface stateId="premium.lp.answer_review" testId="m55-premium-experience-review">
      <section
        className={styles.shell}
        data-m55-paid-phase="complete"
        aria-labelledby={headingId}
      >
        <p className={styles.overline}>プレミアムレポートの質問</p>
        <h2 id={headingId} className={styles.title}>
          回答内容を確認しました
        </h2>
        <p className={styles.lead}>
          6つの回答をもとに、プレミアムレポートの内容をあなた向けに整えます。
        </p>
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
          <button type="button" className={styles.commercialPrimaryBtn} onClick={goToPlans}>
            プランを選ぶ
          </button>
        </div>
      </section>
      </PremiumExperienceSurface>
    );
  }

  return (
    <PremiumExperienceSurface stateId="premium.lp.questions" testId="m55-premium-experience-questions">
    <section
      className={styles.shell}
      data-m55-paid-phase="question"
      data-testid="m55-paid-questionnaire-active"
      aria-labelledby={headingId}
    >
      {index === 0 ? <DtrPaidResultContextStrip /> : null}
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

      <p className={styles.hint}>{helperJa}</p>
      <p className={styles.questionLabel}>{current.shortLabelJa}</p>
      <h2 id={headingId} className={styles.questionTitle}>
        {current.questionJa}
      </h2>

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
    </PremiumExperienceSurface>
  );
}
