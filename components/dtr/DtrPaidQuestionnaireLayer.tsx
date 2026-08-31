'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  PAID_QUESTIONNAIRE_COPY_V1,
  type PaidQuestionId,
} from '../../lib/m55/paidResult/questionnaireCopyV1';
import { PAID_QUESTION_IDS } from '../../lib/m55/individualization/answerIdMapsV1';
import {
  DTR_DRAFT_SYNC_USER_COPY,
  getDtrDraftSyncState,
  queueDtrDraftSync,
  retryDtrDraftSync,
  subscribeDtrDraftSync,
} from '../../lib/m55/dtrDraftClientSync';
import { ProfileRepository } from '../../lib/soul/profile';
import { useAuth } from '@clerk/nextjs';
import { PAID_ANSWERS_SESSION_KEY } from '../../lib/m55/selfFunnel/selfFunnelRuntimeState';
import { sanitizeInProgressPaidAnswers } from '../../lib/m55/commercialUx/assetLedger/legacyPaidQuestionAdapter';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import DtrPaidResultContextStrip from './DtrPaidResultContextStrip';
import DtrPaidJourneyStepRail from './DtrPaidJourneyStepRail';
import PremiumDecisionSurface from '../experience/PremiumDecisionSurface';
import styles from './DtrPaidDecisionUx.module.css';

type Props = {
  onComplete?: () => void;
};

type Phase = 'question' | 'review' | 'edit';

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

function persistPaidAnswers(answers: Record<string, string>) {
  try {
    sessionStorage.setItem(PAID_ANSWERS_SESSION_KEY, JSON.stringify(answers));
  } catch {
    /* no-op */
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

function indexForQuestionId(questionId: PaidQuestionId): number {
  return PAID_QUESTIONNAIRE_COPY_V1.findIndex((q) => q.questionId === questionId);
}

export default function DtrPaidQuestionnaireLayer({ onComplete }: Props) {
  const { userId } = useAuth();
  const [draftSyncState, setDraftSyncState] = useState(getDtrDraftSyncState);
  const [phase, setPhase] = useState<Phase>('question');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const startFiredRef = useRef(false);
  const headingId = useId();
  const total = PAID_QUESTIONNAIRE_COPY_V1.length;
  const current = PAID_QUESTIONNAIRE_COPY_V1[index]!;
  const selected = answers[current.questionId] ?? '';
  const progressLabel = `${index + 1} / ${total}`;
  const isEditingFromReview = phase === 'edit';

  useEffect(() => subscribeDtrDraftSync(setDraftSyncState), []);

  useEffect(() => {
    const raw = readStoredPaidAnswers();
    const { answers: stored, clearedLegacy } = sanitizeInProgressPaidAnswers(raw);
    if (clearedLegacy && Object.keys(stored).length > 0) {
      persistPaidAnswers(stored);
    }
    if (isCompletePaidAnswerSet(stored)) {
      setAnswers(stored);
      setPhase('review');
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
    persistPaidAnswers(merged);
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
    setAnswers(merged);
    setPhase('review');
  }

  function mergeCurrentAnswer(): Record<string, string> {
    return { ...answers, [current.questionId]: selected };
  }

  function goNext() {
    if (!selected) return;
    const merged = mergeCurrentAnswer();
    setAnswers(merged);
    persistPaidAnswers(merged);

    if (isEditingFromReview) {
      setPhase('review');
      return;
    }

    if (index >= total - 1) {
      persistAndComplete(merged);
      return;
    }
    setIndex((n) => Math.min(n + 1, total - 1));
  }

  function goBack() {
    if (isEditingFromReview) {
      setPhase('review');
      return;
    }
    setIndex((n) => Math.max(n - 1, 0));
  }

  function openEdit(questionId: PaidQuestionId) {
    setIndex(indexForQuestionId(questionId));
    setPhase('edit');
  }

  function restartFromBeginning() {
    const confirmed = window.confirm(
      'これまでの回答を消して、最初から回答し直しますか？',
    );
    if (!confirmed) return;
    setAnswers({});
    setIndex(0);
    setPhase('question');
    try {
      sessionStorage.removeItem(PAID_ANSWERS_SESSION_KEY);
    } catch {
      /* no-op */
    }
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

  if (phase === 'review') {
    return (
      <PremiumDecisionSurface stateId="premium.lp.answer_review" testId="m55-premium-experience-review">
        <section
          className={styles.shell}
          data-m55-paid-phase="review"
          data-testid="m55-paid-answer-review"
          aria-labelledby={headingId}
        >
          <DtrPaidJourneyStepRail activeStep={1} />
          <p className={styles.overline}>プレミアムレポートの質問</p>
          <h2 id={headingId} className={styles.title}>
            回答内容を確認
          </h2>
          <p className={styles.reviewStatus} data-testid="m55-paid-review-status">
            {total} / {total} 回答済み
          </p>
          <ul className={styles.answerList}>
            {PAID_QUESTIONNAIRE_COPY_V1.map((q) => {
              const answerId = answers[q.questionId] ?? '';
              return (
                <li key={q.questionId} className={styles.answerItem}>
                  <div className={styles.answerRow}>
                    <div className={styles.answerRowBody}>
                      <span className={styles.answerQ}>{q.shortLabelJa}</span>
                      <span className={styles.answerA}>{labelForAnswer(q.questionId, answerId)}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.answerEditBtn}
                      data-testid={`m55-paid-answer-edit-${q.questionId}`}
                      onClick={() => openEdit(q.questionId)}
                    >
                      変更
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {userId && draftSyncState.status !== 'idle' ? (
            <div role="status" aria-live="polite" data-testid="m55-draft-sync-status">
              {draftSyncState.status === 'saving' ? (
                <p className={styles.hint}>{DTR_DRAFT_SYNC_USER_COPY.savingJa}</p>
              ) : null}
              {draftSyncState.status === 'saved' ? (
                <p className={styles.hint}>{DTR_DRAFT_SYNC_USER_COPY.savedJa}</p>
              ) : null}
              {draftSyncState.status === 'error' ? (
                <div>
                  <p className={styles.hint}>{DTR_DRAFT_SYNC_USER_COPY.failedJa}</p>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => retryDtrDraftSync()}
                    data-testid="m55-draft-sync-retry"
                  >
                    {DTR_DRAFT_SYNC_USER_COPY.retryJa}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.commercialPrimaryBtn}
              data-testid="m55-paid-review-continue"
              onClick={goToPlans}
            >
              この回答でプランを見る
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              data-testid="m55-paid-review-restart"
              onClick={restartFromBeginning}
            >
              最初から回答し直す
            </button>
          </div>
        </section>
      </PremiumDecisionSurface>
    );
  }

  const questionStateId = isEditingFromReview ? 'premium.lp.answer_edit' : 'premium.lp.questions';

  return (
    <PremiumDecisionSurface stateId={questionStateId} testId="m55-premium-experience-questions">
      <section
        className={styles.shell}
        data-m55-paid-phase="question"
        data-testid="m55-paid-questionnaire-active"
        data-m55-paid-answer-edit={isEditingFromReview ? 'true' : undefined}
        data-m55-questionnaire-column="true"
        aria-labelledby={headingId}
      >
        <DtrPaidJourneyStepRail activeStep={0} />
        {index === 0 && !isEditingFromReview ? <DtrPaidResultContextStrip /> : null}
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

        <p className={styles.sceneContext} data-testid="m55-premium-scene-context">
          {current.sceneContextJa}
        </p>
        <p className={styles.questionLabel}>{current.shortLabelJa}</p>
        <h2
          id={headingId}
          className={styles.questionTitle}
          data-testid="m55-premium-question-headline"
        >
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
                onClick={() => {
                  const merged = { ...answers, [current.questionId]: choice.answerId };
                  setAnswers(merged);
                  persistPaidAnswers(merged);
                }}
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
            disabled={!isEditingFromReview && index === 0}
          >
            戻る
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={goNext}
            disabled={!selected}
          >
            {isEditingFromReview
              ? '保存して確認に戻る'
              : index >= total - 1
                ? '回答を確認する'
                : '次へ'}
          </button>
        </div>
      </section>
    </PremiumDecisionSurface>
  );
}
