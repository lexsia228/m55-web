'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { buildGuestCompatibilityResult } from '../../app/synastry/actions';
import {
  COMPATIBILITY_GUEST_SESSION_KEY,
  isCompleteCompatibilityGuestInput,
  type CompatibilityGuestInput,
  type CompatibilityPublicResult,
} from '../../lib/m55/compatibility/pairReadingGuestContract';
import {
  COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS,
  RELATIONSHIP_LOOP_STEP_LABELS,
  isCompleteCompatibilityCurrentContext,
  type CompatibilityCurrentContextAnswers,
  type CompatibilityCurrentQuestionId,
} from '../../lib/m55/compatibility/currentContextContract.v1';
import { PAIR_READING_FREE_STRUCTURE_ITEMS } from '../../lib/m55/compatibility/pairReadingPublicStructure';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import styles from './CompatibilityGuestExperience.module.css';

const EMPTY_INPUT: CompatibilityGuestInput = { personA: '', personB: '' };

type JourneyPhase = 'dob' | 'questions' | 'result';
type PartialCurrentContext = Partial<CompatibilityCurrentContextAnswers>;

function restoreSessionJourney(): {
  input: CompatibilityGuestInput;
  answers: CompatibilityCurrentContextAnswers;
} | null {
  try {
    const raw = sessionStorage.getItem(COMPATIBILITY_GUEST_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as {
      input?: Partial<CompatibilityGuestInput>;
      answers?: unknown;
    };
    const input = {
      personA: typeof value.input?.personA === 'string' ? value.input.personA : '',
      personB: typeof value.input?.personB === 'string' ? value.input.personB : '',
    };
    return isCompleteCompatibilityGuestInput(input) &&
      isCompleteCompatibilityCurrentContext(value.answers)
      ? { input, answers: value.answers }
      : null;
  } catch {
    return null;
  }
}

export default function CompatibilityGuestExperience({
  commerceEnabled = false,
}: {
  commerceEnabled?: boolean;
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [input, setInput] = useState<CompatibilityGuestInput>(EMPTY_INPUT);
  const [answers, setAnswers] = useState<PartialCurrentContext>({});
  const [phase, setPhase] = useState<JourneyPhase>('dob');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [result, setResult] = useState<CompatibilityPublicResult | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const complete = isCompleteCompatibilityGuestInput(input, today);

  useEffect(() => {
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityInputView,
      'compatibility_guest',
      'compatibility-input-view',
    );
    const restored = restoreSessionJourney();
    if (!restored) return;
    setInput(restored.input);
    setAnswers(restored.answers);
    startTransition(async () => {
      const outcome = await buildGuestCompatibilityResult(
        restored.input,
        restored.answers,
      );
      if (outcome.ok) {
        setResult(outcome.value);
        setPhase('result');
      }
    });
  }, []);

  useEffect(() => {
    if (!result) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityPersonalizedResultView,
      'compatibility_guest',
      'compatibility-personalized-result-view',
    );
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityPersonalizedPaidBridgeView,
      'compatibility_guest',
      'compatibility-personalized-paid-bridge-view',
    );
  }, [result]);

  function updateInput(field: keyof CompatibilityGuestInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }));
    setResult(null);
    setError('');
  }

  function startQuestionnaire(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete) {
      setError('二人分の有効な生年月日を入力してください。');
      return;
    }
    setError('');
    setPhase('questions');
    setQuestionIndex(0);
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityQuestionnaireView,
      'compatibility_guest',
      'compatibility-questionnaire-view',
    );
    trackFunnelAction(
      M55_FUNNEL_EVENTS.compatibilityQuestionnaireStart,
      'compatibility_guest',
    );
  }

  function selectAnswer(questionId: CompatibilityCurrentQuestionId, answerId: string) {
    setAnswers((current) => ({ ...current, [questionId]: answerId }));
    setError('');
  }

  function goBack() {
    if (questionIndex === 0) {
      setPhase('dob');
      return;
    }
    setQuestionIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    const question = COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS[questionIndex]!;
    if (!answers[question.questionId]) return;
    if (questionIndex < COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS.length - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }
    if (!isCompleteCompatibilityCurrentContext(answers)) {
      setError('現在の二人について、6つの回答を確認してください。');
      return;
    }
    trackFunnelAction(
      M55_FUNNEL_EVENTS.compatibilityQuestionnaireComplete,
      'compatibility_guest',
    );
    startTransition(async () => {
      const outcome = await buildGuestCompatibilityResult(input, answers);
      if (!outcome.ok) {
        setError(outcome.message);
        return;
      }
      try {
        sessionStorage.setItem(COMPATIBILITY_GUEST_SESSION_KEY, JSON.stringify({ input, answers }));
      } catch {
        /* Result remains available even when tab storage is unavailable. */
      }
      setResult(outcome.value);
      setPhase('result');
    });
  }

  function resetJourney() {
    try {
      sessionStorage.removeItem(COMPATIBILITY_GUEST_SESSION_KEY);
    } catch {
      /* Reset still clears visible state when tab storage is unavailable. */
    }
    setInput(EMPTY_INPUT);
    setAnswers({});
    setResult(null);
    setQuestionIndex(0);
    setPhase('dob');
    setError('');
  }

  const currentQuestion = COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS[questionIndex]!;
  const selectedAnswer = answers[currentQuestion.questionId] ?? '';
  const context = result?.currentContext;

  return (
    <div className={styles.page}>
      {phase === 'dob' ? (
      <section
        className={styles.intro}
        aria-labelledby="compatibility-title"
        data-testid="compatibility-dob-step"
      >
        <p className={styles.eyebrow}>二人の関係の見取り図</p>
        <h1 id="compatibility-title">二人の関係を、重なりと違いから見ます</h1>
        <p className={styles.lead}>
          良し悪しや点数ではなく、距離・反応・進め方の違いを確認します。
        </p>

        <form className={styles.form} onSubmit={startQuestionnaire} noValidate>
          <div className={styles.inputGrid}>
            <label className={styles.inputCard}>
              <span className={styles.inputRole}>あなた</span>
              <span className={styles.inputLabel}>あなたの生年月日</span>
              <input
                type="date"
                required
                max={today}
                value={input.personA}
                onChange={(event) => updateInput('personA', event.target.value)}
              />
            </label>
            <label className={styles.inputCard}>
              <span className={styles.inputRole}>相手</span>
              <span className={styles.inputLabel}>相手の生年月日</span>
              <input
                type="date"
                required
                max={today}
                value={input.personB}
                onChange={(event) => updateInput('personB', event.target.value)}
              />
            </label>
          </div>
          <p className={styles.privacyNote}>
            入力はこの結果の組み立てにだけ使い、このタブを閉じると保持されません。
          </p>
          <ul
            className={styles.trustStrip}
            data-testid="compatibility-trust-strip"
            aria-label="この見取り図の進め方"
          >
            <li>回答するのはあなた一人です</li>
            <li>相手の本音や性格を当てるものではありません</li>
            <li>このあと、無料の見取り図まで進めます</li>
          </ul>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button className={styles.submit} type="submit" disabled={!complete || isPending}>
            今の二人について答える
          </button>
        </form>
      </section>
      ) : null}

      {phase === 'questions' ? (
        <section
          className={styles.questionnaire}
          aria-labelledby="compatibility-question-title"
          data-testid="compatibility-question-step"
        >
          <div
            className={
              questionIndex === 0 ? styles.questionPurpose : styles.questionPurposeCompact
            }
          >
            <p className={styles.eyebrow}>今の二人を重ねる</p>
            {questionIndex === 0 ? (
              <>
                <p>
                  今の二人の距離や会話の表れ方を重ねることで、同じ生年月日でも現在の関係に近い内容へ変わります。
                </p>
                <p className={styles.observationNote}>
                  回答するのは、あなたから観察できる二人の間の状況です。相手が回答したものではありません。
                </p>
              </>
            ) : (
              <p className={styles.questionShortLine}>
                同じ生年月日でも、今の距離や会話によって内容が変わります。
              </p>
            )}
          </div>
          <div className={styles.progressRow}>
            <span>整理 {questionIndex + 1}/6</span>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={6}
              aria-valuenow={questionIndex + 1}
              aria-label={`整理 ${questionIndex + 1}/6`}
            >
              <span style={{ width: `${((questionIndex + 1) / 6) * 100}%` }} />
            </div>
          </div>
          <h1 id="compatibility-question-title" className={styles.questionTitle}>
            {currentQuestion.question}
          </h1>
          <div
            className={styles.choiceList}
            role="radiogroup"
            aria-label={currentQuestion.question}
          >
            {currentQuestion.choices.map((choice) => {
              const selected = selectedAnswer === choice.answerId;
              return (
                <button
                  key={choice.answerId}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={selected ? styles.choiceSelected : styles.choice}
                  onClick={() => selectAnswer(currentQuestion.questionId, choice.answerId)}
                >
                  <span>{choice.label}</span>
                  {selected ? <small>選択中</small> : null}
                </button>
              );
            })}
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.questionActions}>
            <button type="button" className={styles.backButton} onClick={goBack}>
              戻る
            </button>
            <button
              type="button"
              className={styles.nextButton}
              onClick={goNext}
              disabled={!selectedAnswer || isPending}
            >
              {questionIndex === 5
                ? isPending
                  ? '見取り図を組み立てています'
                  : '今の二人の見取り図を見る'
                : '次へ'}
            </button>
          </div>
        </section>
      ) : null}

      {phase === 'result' && result && context ? (
        <div className={styles.result} data-testid="compatibility-personalized-result">
          <section className={styles.resultHeader} aria-labelledby="result-title">
            <p className={styles.eyebrow}>無料で見えること</p>
            <h2 id="result-title">現在の二人の見取り図</h2>
            <p>生年月日から見る土台と、今の回答から見える表れ方を分けて整理しました。</p>
          </section>

          <section className={styles.baselineSection} aria-labelledby="baseline-title">
            <p className={styles.cardNumber}>{PAIR_READING_FREE_STRUCTURE_ITEMS[0].index}</p>
            <h3 id="baseline-title">{PAIR_READING_FREE_STRUCTURE_ITEMS[0].titleJa}</h3>
          <div className={styles.insightGrid}>
            <article className={styles.insightCard}>
              <h3>重なりやすいところ</h3>
              <p>{result.free.overlap}</p>
            </article>
            <article className={styles.insightCard}>
              <h3>違いが出やすいところ</h3>
              <p>{result.free.difference}</p>
            </article>
          </div>
          </section>

          <section
            className={styles.expressionCard}
            data-testid="compatibility-current-expression"
          >
            <p className={styles.cardNumber}>{PAIR_READING_FREE_STRUCTURE_ITEMS[1].index}</p>
            <h3>{PAIR_READING_FREE_STRUCTURE_ITEMS[1].titleJa}</h3>
            <p className={styles.glanceLabel} data-testid="compatibility-glance-label">
              {context.glanceLabel}
            </p>
            <p className={styles.dynamicOutcome}>{context.currentExpression}</p>
          </section>

          <section className={styles.loopCard} data-testid="compatibility-current-loop">
            <p className={styles.cardNumber}>{PAIR_READING_FREE_STRUCTURE_ITEMS[2].index}</p>
            <h3>{PAIR_READING_FREE_STRUCTURE_ITEMS[2].titleJa}</h3>
            <ol className={styles.loopSteps}>
              {context.relationshipLoopSteps.map((step, index) => (
                <li key={RELATIONSHIP_LOOP_STEP_LABELS[index]}>
                  <span className={styles.loopStepLabel}>
                    {RELATIONSHIP_LOOP_STEP_LABELS[index]}
                  </span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className={styles.actionCard} aria-labelledby="action-title">
            <p className={styles.cardNumber}>{PAIR_READING_FREE_STRUCTURE_ITEMS[3].index}</p>
            <h3 id="action-title">{PAIR_READING_FREE_STRUCTURE_ITEMS[3].titleJa}</h3>
            <p className={styles.actionText}>{context.immediateAction}</p>
            <p className={styles.actionNote}>結果を決めるためではなく、二人の違いを確かめる一回分の行動です。</p>
          </section>

          <p className={styles.contextNote}>
            土台は生年月日、表れ方と連鎖は今の回答を重ねています。
            相手本人が回答したものではありません。
          </p>

          <section className={styles.paidBridge} aria-labelledby="paid-bridge-title">
            <p className={styles.eyebrow}>今のfocus：{context.focusLabel}</p>
            <h3 id="paid-bridge-title">現在の二人と直接つながる2章</h3>
            <p className={styles.deliverableLead}>
              二人の生年月日だけでなく、今の距離・会話・すれ違い方を重ねて、6つの場面を整理します。
            </p>
            <ul className={styles.toolkitTiles} aria-label="6章で受け取れる道具">
              <li>
                <strong>場面から戻る手順</strong>
                <span>すれ違いのあとに戻る、小さな順序</span>
              </li>
              <li>
                <strong>そのまま使える一言</strong>
                <span>責めずに話を始めるための短い言葉</span>
              </li>
              <li>
                <strong>今週一度だけ試すこと</strong>
                <span>負担を増やさず、今の二人で試せる一歩</span>
              </li>
              <li>
                <strong>あとで振り返る一問</strong>
                <span>何が変わったかを見直すための問い</span>
              </li>
            </ul>
            <div
              className={styles.mappedChapters}
              id="compatibility-mapped-chapters"
            >
              {result.mappedChapters.map((chapter) => (
                <article key={chapter.chapterId}>
                  <h4>{chapter.chapterTitle}</h4>
                  <p className={styles.connectionLabel}>今の二人とつながる理由</p>
                  <p>{chapter.currentConnection}</p>
                  <p className={styles.connectionLabel}>この章で得られる具体物</p>
                  <p className={styles.concreteValue}>{chapter.concreteValue}</p>
                </article>
              ))}
            </div>

            <h4 className={styles.sixTitle} id="compatibility-six-chapters">6章の使い方</h4>
            <div className={styles.useCases}>
              <span>会話の前に読む</span>
              <span>すれ違った時に読む</span>
              <span>距離を戻したい時に読む</span>
              <span>あとで振り返る</span>
            </div>
            {commerceEnabled ? (
              <div className={styles.commerceOffer}>
                <div>
                  <strong>二人の相性レポート</strong>
                  <span>6章レポート1件・¥1,480（税込）</span>
                  <small>買い切りで、自動更新はありません。購入後はマイページから読み返せます。</small>
                </div>
                <a
                  className={styles.purchaseLink}
                  href="/synastry/purchase/confirm"
                  onClick={() => trackFunnelAction(
                    M55_FUNNEL_EVENTS.compatibilityPaidBridgeClick,
                    'compatibility_guest',
                  )}
                >
                  商品内容と価格を確認する
                </a>
              </div>
            ) : null}
            <div className={styles.bridgeActions}>
              <a
                className={styles.primaryLink}
                href="#compatibility-mapped-chapters"
                onClick={() => trackFunnelAction(
                  M55_FUNNEL_EVENTS.compatibilityPersonalizedPaidBridgeClick,
                  'compatibility_guest',
                )}
              >
                今つながる2章を見る
              </a>
              <a className={styles.secondaryLink} href="#compatibility-free-detail">
                無料の詳細をこのまま読む
              </a>
            </div>
          </section>

          <section
            className={styles.freeDetail}
            id="compatibility-free-detail"
            aria-labelledby="free-detail-title"
          >
            <p className={styles.eyebrow}>無料の詳細</p>
            <h3 id="free-detail-title">この見取り図の要約</h3>
            <p>{result.freeTeaser}</p>
          </section>
          <button type="button" className={styles.resetJourney} onClick={resetJourney}>
            入力と回答を消して、最初から見る
          </button>
        </div>
      ) : null}
    </div>
  );
}
