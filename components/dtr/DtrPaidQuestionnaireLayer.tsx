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
import { PAID_DTR_SAVED_REPORT_PRICING } from '../../lib/m55/paidDtrProductCopy';
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

function oneTimePrice(label: string): string {
  return label.replace('（税込）', '（税込・買い切り）');
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
        <p className={styles.overline}>M55 個人解析レポート</p>
        <h2 id={headingId} className={styles.title}>
          無料解析の続きを、4章の詳しい個人解析で
        </h2>
        <p className={styles.lead}>
          強み、仕事や人との関わり、迷いや疲れにつながりやすい流れを、
          無料解析では扱わない場面まで詳しく読み解きます。
        </p>
        <div className={styles.priceSummary} aria-label="個人解析レポートの価格と内容">
          <p>
            <strong>個人解析ライト</strong>
            <span>{oneTimePrice(PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa)}</span>
            <small>4章の個人解析＋追加読み解き1件</small>
          </p>
          <p>
            <strong>個人解析FULL</strong>
            <span>{oneTimePrice(PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa)}</span>
            <small>4章の個人解析＋追加読み解き合計5件</small>
          </p>
        </div>
        <div className={styles.purchaseFacts} aria-label="個人解析レポートの購入条件">
          <p><strong>商品：</strong>M55 個人解析レポート</p>
          <p><strong>内容：</strong>強み、仕事や人との関わり、迷いや疲れにつながりやすい流れを詳しく読めるデジタルレポート</p>
          <p><strong>価格：</strong>各プランに税込価格を表示</p>
          <p><strong>通貨：</strong>日本円（JPY）</p>
          <p><strong>支払い：</strong>買い切り・自動更新なし</p>
          <p><strong>提供：</strong>支払い確認後、購入したアカウントのマイページへ表示</p>
          <p><strong>境界：</strong>未来予測、吉凶判定、相手の本心の断定、医療・心理診断、結果保証ではありません。</p>
        </div>
        <ul className={styles.metaList}>
          <li>購入前の質問は6問です</li>
          <li>正解はありません</li>
          <li>あとで回答を確認できます</li>
          <li>生年月日と回答をもとに、4章の個人解析を組み立てます</li>
        </ul>
        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={startQuestionnaire}>
            個人解析の6問を始める
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
        <p className={styles.overline}>個人解析の質問</p>
        <h2 id={headingId} className={styles.title}>
          6つの回答がそろいました
        </h2>
        <p className={styles.lead}>回答済み6問。内容を確認してから、個人解析レポートのプランへ進めます。</p>
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
            個人解析レポートのプランを見る
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
        <p className={styles.overline}>個人解析の質問</p>
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
        この回答は、個人解析レポートで場面ごとの特徴を整理するために使います。
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
