'use client';

import { useAuth } from '@clerk/nextjs';
import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { buildGuestCompatibilityResult } from '../../app/synastry/actions';
import {
  clearLastCompletedPairJourney,
  persistCompletedPairJourney,
  purgeUnownedPairGuestSession,
  readCompatibilityGuestJourneyV3FromSession,
  readLastCompletedPairJourney,
  readProfileBirthDate,
  resolvePairGuestMountBootstrap,
} from '../../lib/m55/compatibility/pairGuestClientStore';
import {
  backFromGuestQuestionnaire,
  clearGuestRelationStageAnswers,
  clearGuestSessionStorage,
  mergeGuestAnswerSelection,
  prepareGuestSubmitAnswers,
  sanitizeGuestSessionAnswers,
} from '../../lib/m55/compatibility/pairReadingGuestClientSafe';
import {
  COMPATIBILITY_GUEST_SESSION_KEY,
  isCompleteCompatibilityGuestInput,
  isValidCompatibilityRelationStatusId,
  type CompatibilityGuestInput,
  type CompatibilityGuestJourneyV3,
  type CompatibilityPublicResult,
} from '../../lib/m55/compatibility/pairReadingGuestContract';
import { RELATIONSHIP_LOOP_STEP_LABELS } from '../../lib/m55/compatibility/currentContextContract.v1';
import {
  isCompleteCompatibilityCurrentContextV2,
  questionsForRelationStage,
  RELATIONSHIP_LOOP_STEP_LABELS_V2,
  relationshipLoopStepLabelsFor,
  stagePremiumBridgeCopy,
  type CompatibilityCurrentContextAnswersV2,
  type CompatibilityCurrentQuestionIdV2,
} from '../../lib/m55/compatibility/currentContextContract.v2';
import { RELATION_STATUS_CATALOG } from '../../lib/m55/compatibility/pairReadingCatalog.v1';
import type { RelationStatusId } from '../../lib/m55/compatibility/pairReadingTypes';
import { PAIR_READING_FREE_STRUCTURE_ITEMS } from '../../lib/m55/compatibility/pairReadingPublicStructure';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import PairFreeShareCTA from './PairFreeShareCTA';
import PairResultSignature from './PairResultSignature';
import PairManualBlock from '../narrative/PairManualBlock';
import { buildPairFreeInsightSpecV2 } from '../../lib/m55/compatibility/pairFreeInsightSpecV2';
import { projectCompatibilityFreeNarrativeV1 } from '../../lib/m55/narrative/projectCompatibilityFreeNarrativeV1';
import styles from './CompatibilityGuestExperience.module.css';

const EMPTY_INPUT: CompatibilityGuestInput = { personA: '', personB: '' };

type JourneyPhase = 'dob' | 'questions' | 'result';
type PartialCurrentContext = Partial<CompatibilityCurrentContextAnswersV2>;

function restoreLegacyV2DobOnly(): CompatibilityGuestInput | null {
  try {
    const raw = sessionStorage.getItem(COMPATIBILITY_GUEST_SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { input?: Partial<CompatibilityGuestInput> };
    const input = {
      personA: typeof value.input?.personA === 'string' ? value.input.personA : '',
      personB: typeof value.input?.personB === 'string' ? value.input.personB : '',
    };
    return isCompleteCompatibilityGuestInput(input) ? input : null;
  } catch {
    return null;
  }
}

function restoreSessionJourney(): CompatibilityGuestJourneyV3 | null {
  return readCompatibilityGuestJourneyV3FromSession(
    typeof sessionStorage !== 'undefined' ? sessionStorage : null,
  );
}

export default function CompatibilityGuestExperience({
  commerceEnabled = false,
}: {
  commerceEnabled?: boolean;
}) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const profileBirthDate = useMemo(
    () => (authLoaded && userId ? readProfileBirthDate(userId) : null),
    [authLoaded, userId],
  );
  const [input, setInput] = useState<CompatibilityGuestInput>(EMPTY_INPUT);
  const [relationStatusId, setRelationStatusId] = useState<RelationStatusId | ''>('');
  const [answers, setAnswers] = useState<PartialCurrentContext>({});
  const [phase, setPhase] = useState<JourneyPhase>('dob');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [inQuestionnaire, setInQuestionnaire] = useState(false);
  const [result, setResult] = useState<CompatibilityPublicResult | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const complete = isCompleteCompatibilityGuestInput(input, today);
  const questions = useMemo(
    () => (relationStatusId ? questionsForRelationStage(relationStatusId) : []),
    [relationStatusId],
  );

  useEffect(() => {
    if (!authLoaded) return;

    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.compatibilityInputView,
      'compatibility_guest',
      'compatibility-input-view',
    );

    if (userId) {
      purgeUnownedPairGuestSession(
        typeof sessionStorage !== 'undefined' ? sessionStorage : null,
      );
    }

    const bootstrap = resolvePairGuestMountBootstrap({
      clerkUserId: userId ?? null,
      profileBirthDate,
      persistedJourney: userId ? readLastCompletedPairJourney(userId) : null,
      sessionJourney: restoreSessionJourney(),
      legacyDobInput: restoreLegacyV2DobOnly(),
    });

    if (bootstrap.kind === 'restore_result') {
      const restored = bootstrap.journey;
      setInput(restored.input);
      setRelationStatusId(restored.relationStatusId);
      setAnswers(restored.answers);
      setInQuestionnaire(true);
      startTransition(async () => {
        const outcome = await buildGuestCompatibilityResult(
          restored.input,
          restored.relationStatusId,
          restored.answers,
        );
        if (outcome.ok) {
          setResult(outcome.value);
          setPhase('result');
        }
      });
      return;
    }

    if (bootstrap.kind === 'legacy_dob') {
      setInput(bootstrap.input);
      setPhase('questions');
      return;
    }

    if (bootstrap.kind === 'profile_only') {
      setInput({ personA: bootstrap.personA, personB: '' });
    }
  }, [authLoaded, userId, profileBirthDate]);

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

  function startRelationStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!complete) {
      setError('二人分の有効な生年月日を入力してください。');
      return;
    }
    setError('');
    setInQuestionnaire(false);
    setPhase('questions');
  }

  function selectRelationStage(stageId: RelationStatusId) {
    setRelationStatusId(stageId);
    setAnswers(clearGuestRelationStageAnswers());
    setQuestionIndex(0);
    setResult(null);
    setError('');
  }

  function startQuestionnaire() {
    if (!relationStatusId) {
      setError('関係の段階を選んでください。');
      return;
    }
    setPhase('questions');
    setQuestionIndex(0);
    setInQuestionnaire(true);
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

  function selectAnswer(questionId: CompatibilityCurrentQuestionIdV2, answerId: string) {
    setAnswers((current) => mergeGuestAnswerSelection(current, questionId, answerId));
    setError('');
  }

  function goBack() {
    const next = backFromGuestQuestionnaire(inQuestionnaire, questionIndex, answers);
    setInQuestionnaire(next.inQuestionnaire);
    setQuestionIndex(next.questionIndex);
    setAnswers(next.answers);
    if (phase === 'questions' && !inQuestionnaire) {
      setPhase('dob');
    }
  }

  function goNext() {
    if (phase === 'questions' && !inQuestionnaire) {
      if (!relationStatusId) {
        setError('関係の段階を選んでください。');
        return;
      }
      startQuestionnaire();
      return;
    }
    const question = questions[questionIndex]!;
    const selected = answers[question.questionId];
    if (!selected && !question.optional) return;
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((current) => current + 1);
      return;
    }
    if (!relationStatusId || !isCompleteCompatibilityCurrentContextV2(answers, relationStatusId)) {
      setError('現在の二人について、必要な回答を確認してください。');
      return;
    }
    const completeAnswers = prepareGuestSubmitAnswers(
      answers as CompatibilityCurrentContextAnswersV2,
    );
    trackFunnelAction(
      M55_FUNNEL_EVENTS.compatibilityQuestionnaireComplete,
      'compatibility_guest',
    );
    startTransition(async () => {
      const outcome = await buildGuestCompatibilityResult(
        input,
        relationStatusId,
        completeAnswers,
      );
      if (!outcome.ok) {
        setError(outcome.message);
        return;
      }
      const journey: CompatibilityGuestJourneyV3 = {
        version: 'journey_v3',
        input,
        relationStatusId,
        answers: completeAnswers,
      };
      persistCompletedPairJourney(sessionStorage, userId, journey);
      setAnswers(completeAnswers);
      setResult(outcome.value);
      setPhase('result');
    });
  }

  function updateCurrentPair() {
    setPhase('questions');
    setInQuestionnaire(true);
    setQuestionIndex(0);
    setError('');
  }

  function startDifferentPartner() {
    try {
      clearGuestSessionStorage(sessionStorage);
    } catch {
      /* Clear visible state even when tab storage is unavailable. */
    }
    if (userId) {
      clearLastCompletedPairJourney(userId);
    }
    const ownBirth = profileBirthDate ?? input.personA;
    setInput({ personA: ownBirth, personB: '' });
    setRelationStatusId('');
    setAnswers({});
    setResult(null);
    setQuestionIndex(0);
    setInQuestionnaire(false);
    setPhase('dob');
    setError('');
  }

  function resetJourney() {
    try {
      clearGuestSessionStorage(sessionStorage);
    } catch {
      /* Reset still clears visible state when tab storage is unavailable. */
    }
    if (userId) {
      clearLastCompletedPairJourney(userId);
    }
    const ownBirth = profileBirthDate ?? '';
    setInput(ownBirth ? { personA: ownBirth, personB: '' } : EMPTY_INPUT);
    setRelationStatusId('');
    setAnswers({});
    setResult(null);
    setQuestionIndex(0);
    setInQuestionnaire(false);
    setPhase('dob');
    setError('');
  }

  const personAFromProfile = Boolean(userId && profileBirthDate && input.personA === profileBirthDate);

  const currentQuestion = questions[questionIndex];
  const selectedAnswer = currentQuestion ? answers[currentQuestion.questionId] ?? '' : '';
  const context = result?.currentContext;
  const pairInsight = useMemo(() => {
    if (phase !== 'result' || !result || !context || !relationStatusId) return null;
    if (!isCompleteCompatibilityCurrentContextV2(answers, relationStatusId)) return null;
    try {
      return buildPairFreeInsightSpecV2({
        answersV2: sanitizeGuestSessionAnswers(
          answers as CompatibilityCurrentContextAnswersV2,
        ),
        pairAxisId: 'A2',
        personABirthDate: input.personA,
        personBBirthDate: input.personB,
        personAUsesFirstPerspective: true,
        focusLabel: context.focusLabel,
        relationStatusId,
      });
    } catch {
      return null;
    }
  }, [phase, result, context, answers, input.personA, input.personB, relationStatusId]);
  const pairNarrative = pairInsight
    ? projectCompatibilityFreeNarrativeV1({ spec: pairInsight })
    : null;
  const questionTotal = questions.length;
  const loopLabels = relationStatusId
    ? relationshipLoopStepLabelsFor(relationStatusId)
    : RELATIONSHIP_LOOP_STEP_LABELS_V2;
  const premiumBridge = relationStatusId ? stagePremiumBridgeCopy(relationStatusId) : null;

  return (
    <div className={styles.page}>
      {phase === 'dob' ? (
      <section
        className={styles.intro}
        aria-labelledby="compatibility-title"
        data-testid="compatibility-dob-step"
      >
        <p className={styles.eyebrow}>二人の関係を読み解く</p>
        <h1 id="compatibility-title">二人の関係を、重なりと違いから読み解きます</h1>
        <p className={styles.lead}>
          良し悪しや点数ではなく、距離・反応・進め方の違いを確認します。
        </p>

        <form className={styles.form} onSubmit={startRelationStage} noValidate>
          <div className={styles.inputGrid}>
            <label className={styles.inputCard}>
              <span className={styles.inputRole}>あなた</span>
              <span className={styles.inputLabel}>あなたの生年月日</span>
              <input
                type="date"
                required
                max={today}
                value={input.personA}
                readOnly={personAFromProfile}
                aria-readonly={personAFromProfile}
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
            {userId
              ? 'あなたの生年月日はプロフィールから読み込んでいます。ログイン中は、この端末に前回の二人の読み解きを保存して再開できます。'
              : '入力はこの結果の組み立てにだけ使い、このタブを閉じると保持されません。'}
          </p>
          <ul
            className={styles.trustStrip}
            data-testid="compatibility-trust-strip"
            aria-label="この読み解きの進め方"
          >
            <li>回答するのはあなた一人です</li>
            <li>相手の本音や性格を当てるものではありません</li>
            <li>このあと、無料の読み解きまで進めます</li>
          </ul>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button className={styles.submit} type="submit" disabled={!complete || isPending}>
            関係の段階を選ぶ
          </button>
        </form>
      </section>
      ) : null}

      {phase === 'questions' && !inQuestionnaire ? (
        <section
          className={styles.questionnaire}
          aria-labelledby="compatibility-relation-title"
          data-testid="compatibility-relation-step"
        >
          <p className={styles.eyebrow}>今の二人の関係</p>
          <h1 id="compatibility-relation-title" className={styles.questionTitle}>
            今、あなたと関係を知りたい相手の間は、どの段階に近いですか？
          </h1>
          <p className={styles.observationNote}>
            あなた自身の観察として選んでください。相手が回答したものではありません。
          </p>
          <div className={styles.choiceList} role="radiogroup" aria-label="関係の段階">
            {RELATION_STATUS_CATALOG.map((entry) => {
              const selected = relationStatusId === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={selected ? styles.choiceSelected : styles.choice}
                  onClick={() => selectRelationStage(entry.id)}
                >
                  <span>{entry.labelJa}</span>
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
              disabled={!relationStatusId || isPending}
            >
              今の二人について答える
            </button>
          </div>
        </section>
      ) : null}

      {phase === 'questions' && inQuestionnaire && currentQuestion ? (
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
                  選んだ関係の段階に合わせて、今の二人について答えられる質問だけを出します。
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
            <span>整理 {questionIndex + 1}/{questionTotal}</span>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={questionTotal}
              aria-valuenow={questionIndex + 1}
              aria-label={`整理 ${questionIndex + 1}/${questionTotal}`}
            >
              <span style={{ width: `${((questionIndex + 1) / questionTotal) * 100}%` }} />
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
              {questionIndex === questionTotal - 1
                ? isPending
                  ? '読み解きを組み立てています'
                  : '今の二人の読み解きを見る'
                : '次へ'}
            </button>
          </div>
        </section>
      ) : null}

      {phase === 'result' && result && context ? (
        <div className={styles.result} data-testid="compatibility-personalized-result">
          <section className={styles.resultHeader} aria-labelledby="result-title">
            <p className={styles.eyebrow}>無料で見えること</p>
            <h2 id="result-title">今の二人の読み解き</h2>
            <p>この読みは、生年月日から見える基調と、今回の回答の重なりから組み立てています。</p>
          </section>

          <PairResultSignature
            overlap={result.free.overlap}
            difference={result.free.difference}
          />

          <section className={styles.baselineSection} aria-labelledby="baseline-title">
            <p className={styles.cardNumber}>{PAIR_READING_FREE_STRUCTURE_ITEMS[0].index}</p>
            <h3 id="baseline-title">{PAIR_READING_FREE_STRUCTURE_ITEMS[0].titleJa}</h3>
          <div className={styles.dynamicBlock} data-testid="compatibility-relationship-dynamic">
            <h4>この違いが、二人の間でどう動くか</h4>
            <p>{result.free.relationshipDynamic}</p>
          </div>
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
                <li key={loopLabels[index] ?? RELATIONSHIP_LOOP_STEP_LABELS[index]}>
                  <span className={styles.loopStepLabel}>
                    {loopLabels[index] ?? RELATIONSHIP_LOOP_STEP_LABELS[index]}
                  </span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </section>

          {pairNarrative ? <PairManualBlock manual={pairNarrative.manualSpec} /> : null}

          <p className={styles.contextNote}>
            土台は生年月日、表れ方と連鎖は今の回答を重ねています。
            相手本人が回答したものではありません。
          </p>

          <section
            className={styles.freeDetail}
            id="compatibility-free-detail"
            aria-labelledby="free-detail-title"
          >
            <p className={styles.eyebrow}>ここまでのまとめ</p>
            <h3 id="free-detail-title">無料で読めるのは、ここまでです</h3>
            <p>{result.freeTeaser}</p>
          </section>

          <section className={styles.paidBridge} aria-labelledby="paid-bridge-title">
            <h3 id="paid-bridge-title">この二人の続きとして読めること</h3>
            <p className={styles.deliverableLead}>
              {premiumBridge?.deliverableLead ??
                '無料では、二人の間で回りやすい基本のループまでを読みました。「二人の相性レポート」では、同じループを六つの場面に分け、あなた側と相手側の視点、すれ違いの入口、戻し方、使える一言、小さな実験、振り返りまでを一つの流れとして残します。'}
            </p>
            <ul className={styles.toolkitTiles} aria-label="レポートで受け取れるもの">
              {(premiumBridge?.toolkitTiles ?? [
                { title: '二人それぞれの動き', body: '同じ場面で、あなた側と相手側に何が起きているか' },
                { title: 'すれ違いが始まる場面', body: 'どこから連鎖に変わるのかの順番' },
                { title: '場面から戻る手順', body: 'すれ違いのあとに戻る、小さな順序' },
                { title: 'そのまま使える一言', body: '責めずに話を始めるための短い言葉' },
                { title: '今週一度だけ試すこと', body: '負担を増やさず、今の二人で試せる一歩' },
                { title: 'あとで振り返る一問', body: '何が変わったかを見直すための問い' },
              ]).map((tile) => (
                <li key={tile.title}>
                  <strong>{tile.title}</strong>
                  <span>{tile.body}</span>
                </li>
              ))}
            </ul>
            <h4 className={styles.mappedTitle}>この二人なら、最初に読む場面</h4>
            <div
              className={styles.mappedChapters}
              id="compatibility-mapped-chapters"
            >
              {result.mappedChapters.map((chapter) => (
                <article key={chapter.chapterId}>
                  <h4>{chapter.chapterTitle}</h4>
                  <p className={styles.connectionLabel}>今の二人とつながる理由</p>
                  <p>{chapter.currentConnection}</p>
                  <p className={styles.connectionLabel}>ここで受け取れるもの</p>
                  <p className={styles.concreteValue}>{chapter.concreteValue}</p>
                </article>
              ))}
            </div>

            <h4 className={styles.sixTitle} id="compatibility-six-chapters">読み返せる場面</h4>
            <div className={styles.useCases}>
              {(premiumBridge?.useCases ?? [
                '会話の前に読む',
                'すれ違った時に読む',
                '距離を戻したい時に読む',
                'あとで振り返る',
              ]).map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            {commerceEnabled ? (
              <div className={styles.commerceOffer}>
                <div>
                  <strong>二人の相性レポート</strong>
                  <span>¥1,480（税込）・買い切り</span>
                  <small>自動更新はありません。購入後はマイページから読み返せます。</small>
                </div>
                <a
                  className={styles.purchaseLink}
                  href="/synastry/purchase/confirm"
                  onClick={() => {
                    trackFunnelAction(
                      M55_FUNNEL_EVENTS.compatibilityPaidBridgeClick,
                      'compatibility_guest',
                    );
                    trackFunnelAction(
                      M55_FUNNEL_EVENTS.compatibilityPersonalizedPaidBridgeClick,
                      'compatibility_guest',
                    );
                  }}
                >
                  商品内容と価格を確認する
                </a>
              </div>
            ) : (
              <p className={styles.bridgePending}>
                このレポートは現在準備中です。無料の読み解きは、このままお使いいただけます。
              </p>
            )}
          </section>

          <PairFreeShareCTA insight={pairInsight} />

          <p className={styles.revisitNote}>
            {userId
              ? 'この端末では、ログイン中に前回の二人の読み解きを保存して再開できます。'
              : 'この結果は、タブを開いている間は同じ内容で読み返せます。'}
          </p>
          <div className={styles.questionActions}>
            <button type="button" className={styles.nextButton} onClick={updateCurrentPair}>
              今の二人を更新する
            </button>
            <button type="button" className={styles.backButton} onClick={startDifferentPartner}>
              別の相手を見る
            </button>
          </div>
          <button type="button" className={styles.resetJourney} onClick={resetJourney}>
            入力と回答を消して、最初から見る
          </button>
        </div>
      ) : null}
    </div>
  );
}
