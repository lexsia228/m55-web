'use client';

import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProfileRepository, promoteGuestProfileToClerkUser } from '../../lib/soul/profile';
import { queueDtrDraftSync } from '../../lib/m55/dtrDraftClientSync';
import { ensureSealedCoreResult, promoteGuestCoreSnapshotToClerkUser } from '../../lib/m55/coreResult/store';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import {
  buildFreeDepthAnalysisV1,
  type FreeDepthAnalysisV1,
} from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import {
  buildFreeFiveViewCompositionV1,
  type FreeFiveViewComposition,
} from '../../lib/m55/freeResult/buildFreeFiveViewCompositionV1';
import {
  isQuestionnaireCompleteForComposition,
  resolveInitialUxPhase,
  shouldHideResultDuringQuestionnaire,
  shouldShowHero,
  shouldShowQuestionnaire,
  shouldShowReanswerFinalize,
  shouldShowRevealing,
  shouldShowResultSections,
  transitionOnQuestionnaireComplete,
  transitionOnReanswerEditStart,
  transitionOnRevealComplete,
  type FreeRevealUxPhase,
} from '../../lib/m55/freeResult/coreFreeRevealUxState';
import { REANSWER_CONFIRM_COPY_V1 } from '../../lib/m55/freeResult/guestFreeJourneyCopyV1';
import {
  ensureCompleteFreeAnswerSet,
  isCompleteFreeAnswerSet,
} from '../../lib/m55/freeResult/ensureFreeAnswerSetCompleteV1';
import { FREE_FIVE_QUESTION_COUNT, type FreeQuestionId } from '../../lib/m55/freeResult/questionnaireCopyV1';
import {
  exposeFunnelDebug,
  onBasicInfoIdentityChanged,
  readPersistedFunnel,
  syncDraftAnswers,
  writePersistedFunnel,
} from '../../lib/m55/selfFunnel/selfFunnelClientStore';
import {
  commitFreeResult,
  formatActiveDobSummaryJa,
  isValidBasicInfo,
  resolveCoreRouteView,
  resolveResumeQuestionIndex,
  resolveSelfFunnelStage,
} from '../../lib/m55/selfFunnel/selfFunnelRuntimeState';
import CoreEntryReportCTASection from './CoreEntryReportCTASection';
import CoreMethodCompact from './CoreMethodCompact';
import ExperienceArchetypeSync from '../shell/ExperienceArchetypeSync';
import CoreFreeJourneyStepper from './CoreFreeJourneyStepper';
import CoreFreeQuestionnaireLayer from './CoreFreeQuestionnaireLayer';
import CoreFreeResultLeadSection from './CoreFreeResultLeadSection';
import CoreFreeResultScenesSection from './CoreFreeResultScenesSection';
import CoreFreeResultShareCTA from './CoreFreeResultShareCTA';
import CoreFreeResultSummaryHub from './CoreFreeResultSummaryHub';
import CoreFreeRevealTransition from './CoreFreeRevealTransition';
import CoreGuestSaveResultCTA from './CoreGuestSaveResultCTA';
import CorePremiumStickyCta from './CorePremiumStickyCta';
import CoreExperienceStyles from './CoreExperience.module.css';
import CoreLockedState from './CoreLockedState';
import BirthProfileIntakeLayer from '../profile/BirthProfileIntakeLayer';
import { buildPrivacySafeShareCardV1 } from '../../lib/m55/freeResult/privacySafeShareCardV1';
import {
  M55_FUNNEL_EVENTS,
  trackFunnelAction,
  trackFunnelImpressionOnce,
} from '../../lib/m55/privacySafeFunnelAnalytics';
import { resolveCorePublicStemDisplay } from '../../lib/m55/publicStemDisplay';
import CoreScrollReveal from './CoreScrollReveal';

type SealedState =
  | { kind: 'loading' }
  | { kind: 'locked' }
  | { kind: 'ready'; result: CoreResult; profile: NonNullable<ReturnType<typeof ProfileRepository.get>> }
  | { kind: 'error'; message: string };

function hydrateFromStore(): {
  uxPhase: FreeRevealUxPhase;
  draftAnswers: Record<string, string>;
  committedAnswers: Record<string, string>;
  questionIndex: number;
  generationCount: number;
} {
  const profile = ProfileRepository.get(null);
  const persisted = readPersistedFunnel();
  if (!isValidBasicInfo(profile)) {
    return {
      uxPhase: 'INTRO',
      draftAnswers: {},
      committedAnswers: {},
      questionIndex: 0,
      generationCount: 0,
    };
  }
  const basic = {
    nickname: profile.nickname.trim(),
    birthDate: profile.birthDate.trim().slice(0, 10),
  };
  const stage = resolveSelfFunnelStage({
    basicInfo: basic,
    draftFreeAnswers: persisted.draftFreeAnswers,
    committedFreeAnswers: persisted.committedFreeAnswers,
    freeResultFingerprint: persisted.freeResultFingerprint,
    paidAnswers: {},
  });
  const view = resolveCoreRouteView(stage);
  if (view === 'result' && persisted.committedFreeAnswers) {
    return {
      uxPhase: 'RESULT',
      draftAnswers: persisted.committedFreeAnswers,
      committedAnswers: persisted.committedFreeAnswers,
      questionIndex: resolveResumeQuestionIndex(persisted.committedFreeAnswers),
      generationCount: persisted.generationCount,
    };
  }
  const draft = persisted.draftFreeAnswers;
  return {
    uxPhase: resolveInitialUxPhase(true),
    draftAnswers: draft,
    committedAnswers: {},
    questionIndex: resolveResumeQuestionIndex(draft),
    generationCount: persisted.generationCount,
  };
}

export default function CoreEssencePanel() {
  const { user, isLoaded, isSignedIn } = useUser();
  const ownerId = user?.id ?? null;
  const [profileEpoch, setProfileEpoch] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [uxPhase, setUxPhase] = useState<FreeRevealUxPhase>('QUESTIONNAIRE');
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [questionnaireFlowKey, setQuestionnaireFlowKey] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [committedAnswers, setCommittedAnswers] = useState<Record<string, string>>({});
  const [isReanswerFlow, setIsReanswerFlow] = useState(false);
  const [showReanswerConfirm, setShowReanswerConfirm] = useState(false);
  const [compositionError, setCompositionError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const generationFlightRef = useRef(false);
  const analyticsCompletionRef = useRef(0);
  const previousProfileRef = useRef<ReturnType<typeof ProfileRepository.get>>(null);

  useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1);
    window.addEventListener('m55:profile_updated', bump);
    return () => window.removeEventListener('m55:profile_updated', bump);
  }, []);

  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    promoteGuestProfileToClerkUser(user.id);
    promoteGuestCoreSnapshotToClerkUser(user.id);
    setProfileEpoch((n) => n + 1);
  }, [isLoaded, user?.id]);

  useEffect(() => {
    if (!isLoaded) return;
    const snap = hydrateFromStore();
    setUxPhase(snap.uxPhase);
    setDraftAnswers(snap.draftAnswers);
    setCommittedAnswers(snap.committedAnswers);
    setQuestionIndex(snap.questionIndex);
    setGenerationCount(snap.generationCount);
    setQuestionnaireFlowKey((n) => n + 1);
    setHydrated(true);
    previousProfileRef.current = ProfileRepository.get(ownerId);
  }, [isLoaded, ownerId, profileEpoch]);

  const sealed: SealedState = useMemo(() => {
    if (!isLoaded || !hydrated) return { kind: 'loading' };
    const profile = ProfileRepository.get(ownerId);
    if (!isValidBasicInfo(profile)) {
      return { kind: 'locked' };
    }
    try {
      const result = ensureSealedCoreResult(ownerId, profile);
      return { kind: 'ready', result, profile };
    } catch (e) {
      const message = e instanceof Error ? e.message : '読み取りに失敗しました。';
      return { kind: 'error', message };
    }
  }, [hydrated, isLoaded, ownerId, profileEpoch]);

  const committedComplete = isCompleteFreeAnswerSet(committedAnswers);
  const questionnaireDone = isQuestionnaireCompleteForComposition(uxPhase, committedComplete);

  const composition: FreeFiveViewComposition | null = useMemo(() => {
    if (sealed.kind !== 'ready' || !questionnaireDone) return null;
    const built = buildFreeFiveViewCompositionV1({
      birthDate: sealed.profile.birthDate,
      stemLaneIndex: sealed.result.stemLaneIndex,
      freeAnswerSet: committedAnswers,
    });
    if (!built.ok) return null;
    return built.value;
  }, [committedAnswers, questionnaireDone, sealed]);

  const depthAnalysis: FreeDepthAnalysisV1 | null = useMemo(() => {
    if (sealed.kind !== 'ready' || !questionnaireDone) return null;
    const built = buildFreeDepthAnalysisV1({
      birthDate: sealed.profile.birthDate,
      stemLaneIndex: sealed.result.stemLaneIndex,
      freeAnswerSet: committedAnswers,
    });
    if (!built.ok) return null;
    return built.value;
  }, [committedAnswers, questionnaireDone, sealed]);

  useEffect(() => {
    if (shouldShowQuestionnaire(uxPhase)) {
      trackFunnelImpressionOnce(
        M55_FUNNEL_EVENTS.selfEntryStarted,
        'core_free_entry',
        'core-self-entry-started',
      );
    }
  }, [uxPhase]);

  useEffect(() => {
    if (!shouldShowResultSections(uxPhase) || !composition) return;
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.freeResultViewed,
      'core_free_result',
      'core-free-result-viewed',
    );
  }, [uxPhase, composition]);

  useEffect(() => {
    if (!questionnaireDone) {
      setCompositionError(null);
      return;
    }
    if (composition) {
      setCompositionError(null);
      return;
    }
    if (committedComplete) {
      setCompositionError('無料結果を組み立てられませんでした。もう一度答え直してください。');
      generationFlightRef.current = false;
      setCompleting(false);
    }
  }, [committedAnswers, committedComplete, composition, questionnaireDone]);

  useEffect(() => {
    if (sealed.kind !== 'ready') return;
    const stage = resolveSelfFunnelStage({
      basicInfo: {
        nickname: sealed.profile.nickname.trim(),
        birthDate: sealed.profile.birthDate.trim().slice(0, 10),
      },
      draftFreeAnswers: draftAnswers,
      committedFreeAnswers: committedComplete ? committedAnswers : null,
      freeResultFingerprint: readPersistedFunnel().freeResultFingerprint,
      paidAnswers: {},
    });
    exposeFunnelDebug({
      generationCount,
      stage,
      analyticsCompletionCount: analyticsCompletionRef.current,
    });
  }, [committedAnswers, committedComplete, draftAnswers, generationCount, sealed, uxPhase]);

  const persistAnswersForCheckout = useCallback(
    (answerSet: Record<string, string>) => {
      if (sealed.kind !== 'ready') return;
      const { profile } = sealed;
      if (!isValidBasicInfo(profile)) return;
      queueDtrDraftSync(ownerId, {
        nickname: profile.nickname.trim(),
        birthDate: profile.birthDate,
        extraJson: { freeAnswerSet: answerSet },
      });
    },
    [ownerId, sealed],
  );

  if (sealed.kind === 'loading') {
    return (
      <div className={CoreExperienceStyles.page}>
        <p className={CoreExperienceStyles.muted}>読み込み中…</p>
      </div>
    );
  }

  if (sealed.kind === 'locked') {
    return (
      <>
        <CoreLockedState onStartIntake={() => setIntakeOpen(true)} />
        <BirthProfileIntakeLayer
          open={intakeOpen}
          ownerId={ownerId}
          onClose={() => setIntakeOpen(false)}
          onSaved={() => {
            setProfileEpoch((n) => n + 1);
            setUxPhase('QUESTIONNAIRE');
            setQuestionIndex(0);
            setDraftAnswers({});
            setCommittedAnswers({});
          }}
          dataTestId="m55-core-birth-intake-layer"
        />
      </>
    );
  }

  if (sealed.kind === 'error') {
    return (
      <div className={CoreExperienceStyles.page}>
        <div className={CoreExperienceStyles.errorBox} role="alert">
          {sealed.message}
        </div>
      </div>
    );
  }

  const { result, profile } = sealed;
  const hideResult = shouldHideResultDuringQuestionnaire(uxPhase);
  const stemDisplay = resolveCorePublicStemDisplay(result);
  const shareCard = buildPrivacySafeShareCardV1({ stemLaneIndex: stemDisplay.stemLaneIndex });
  const traitIdentityLine =
    shareCard?.traitPhraseJa ?? stemDisplay.displayOneLine;
  const dobSummaryJa = formatActiveDobSummaryJa(profile.birthDate);

  function handleAnswerChange(questionId: FreeQuestionId, answerId: string) {
    setDraftAnswers((prev) => {
      const next = { ...prev, [questionId]: answerId };
      syncDraftAnswers(next, questionIndex);
      return next;
    });
  }

  function handleRequestProfileEdit() {
    previousProfileRef.current = ProfileRepository.get(ownerId);
    setProfileEditOpen(true);
  }

  function handleProfileSaved() {
    const next = ProfileRepository.get(ownerId);
    onBasicInfoIdentityChanged(previousProfileRef.current, next ?? { nickname: '', birthDate: '' });
    previousProfileRef.current = next;
    setCommittedAnswers({});
    setDraftAnswers({});
    setUxPhase('QUESTIONNAIRE');
    setQuestionIndex(0);
    setQuestionnaireFlowKey((k) => k + 1);
    setProfileEpoch((n) => n + 1);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('m55:profile_updated'));
    }
  }

  function handleQuestionnaireComplete() {
    if (generationFlightRef.current || completing) return;
    const complete = ensureCompleteFreeAnswerSet(draftAnswers);
    if (!complete) return;

    // Idempotent: same answers + existing result → reopen without new generation
    if (!isReanswerFlow && committedComplete) {
      const current = readPersistedFunnel();
      const basic = {
        nickname: profile.nickname.trim(),
        birthDate: profile.birthDate.trim().slice(0, 10),
      };
      const next = commitFreeResult(current, basic, complete);
      if (
        next &&
        current.freeResultFingerprint &&
        next.freeResultFingerprint === current.freeResultFingerprint
      ) {
        setCommittedAnswers({ ...complete });
        setUxPhase('RESULT');
        return;
      }
    }

    setDraftAnswers(complete);
    syncDraftAnswers(complete, FREE_FIVE_QUESTION_COUNT - 1);
    trackFunnelAction(M55_FUNNEL_EVENTS.coreQuestionsCompleted, 'core_free_entry');
    analyticsCompletionRef.current += 1;

    // Reanswer confirms before generation — do not lock the generate button yet.
    if (isReanswerFlow) {
      setUxPhase('REANSWER_FINAL');
      return;
    }

    generationFlightRef.current = true;
    setCompleting(true);
    setUxPhase(transitionOnQuestionnaireComplete(false));
  }

  function handleRevealComplete() {
    const complete = ensureCompleteFreeAnswerSet(draftAnswers) ?? draftAnswers;
    const basic = {
      nickname: profile.nickname.trim(),
      birthDate: profile.birthDate.trim().slice(0, 10),
    };
    const current = readPersistedFunnel();
    const next = commitFreeResult(current, basic, complete);
    if (next) {
      writePersistedFunnel(next);
      setGenerationCount(next.generationCount);
    }
    setCommittedAnswers({ ...complete });
    persistAnswersForCheckout(complete);
    setIsReanswerFlow(false);
    setCompleting(false);
    generationFlightRef.current = false;
    setUxPhase(transitionOnRevealComplete());
    trackFunnelImpressionOnce(
      M55_FUNNEL_EVENTS.resultRevealCompleted,
      'core_free_result',
      'core-result-reveal-completed',
    );
  }

  function handleRequestReanswer() {
    trackFunnelAction(M55_FUNNEL_EVENTS.resultRerunStarted, 'core_free_result');
    setShowReanswerConfirm(true);
  }

  function handleReanswerCancel() {
    setShowReanswerConfirm(false);
  }

  function handleReanswerConfirm() {
    setShowReanswerConfirm(false);
    setIsReanswerFlow(true);
    setDraftAnswers({ ...committedAnswers });
    setUxPhase(transitionOnReanswerEditStart());
    setQuestionnaireFlowKey((n) => n + 1);
    setQuestionIndex(0);
    setCompleting(false);
    generationFlightRef.current = false;
  }

  function handleReanswerFinalizeConfirm() {
    if (generationFlightRef.current || completing) return;
    const complete = ensureCompleteFreeAnswerSet(draftAnswers);
    if (!complete) return;
    generationFlightRef.current = true;
    setCompleting(true);
    setDraftAnswers(complete);
    setUxPhase('REVEALING');
  }

  function handleReanswerFinalizeCancel() {
    setUxPhase(transitionOnReanswerEditStart());
  }

  const currentExpressionSummary =
    depthAnalysis?.headlineJa ??
    composition?.synthesis.currentExpressionSummaryJa ??
    '生年月日の土台と、いまの五つの答えの関係が見えています。';

  const archetypePhase =
    uxPhase === 'RESULT'
      ? 'RESULT'
      : shouldShowQuestionnaire(uxPhase)
        ? 'QUESTIONNAIRE'
        : 'INTAKE';

  return (
    <div
      className={CoreExperienceStyles.page}
      data-testid="m55-core-essence"
      data-m55-generation-count={generationCount}
      data-m55-ux-phase={uxPhase}
    >
      <ExperienceArchetypeSync coreUxPhase={archetypePhase} />
      <CoreScrollReveal />

      <BirthProfileIntakeLayer
        open={profileEditOpen}
        ownerId={ownerId}
        nicknameHint={profile.nickname}
        onClose={() => setProfileEditOpen(false)}
        onSaved={handleProfileSaved}
        dataTestId="m55-core-profile-edit-layer"
      />

      {uxPhase === 'RESULT' ? (
        <CoreFreeJourneyStepper currentStep="result" />
      ) : shouldShowQuestionnaire(uxPhase) ? (
        <CoreFreeJourneyStepper currentStep="questions" />
      ) : null}

      {shouldShowQuestionnaire(uxPhase) ? (
        <>
          <CoreFreeQuestionnaireLayer
            key={questionnaireFlowKey}
            answers={draftAnswers}
            onChange={handleAnswerChange}
            onComplete={handleQuestionnaireComplete}
            isReanswerFlow={isReanswerFlow}
            onIndexChange={setQuestionIndex}
            onRequestProfileEdit={isReanswerFlow ? undefined : handleRequestProfileEdit}
            initialIndex={questionIndex}
            completing={completing}
            dobSummaryJa={dobSummaryJa}
          />
          {compositionError ? (
            <div className={CoreExperienceStyles.errorBox} role="alert">
              {compositionError}
              <button
                type="button"
                className={CoreExperienceStyles.freeQuestionnairePrimaryBtn}
                onClick={() => {
                  setCompositionError(null);
                  generationFlightRef.current = false;
                  setCompleting(false);
                  setUxPhase('QUESTIONNAIRE');
                }}
              >
                もう一度試す
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {shouldShowReanswerFinalize(uxPhase) ? (
        <section
          className={`${CoreExperienceStyles.section} ${CoreExperienceStyles.coreSectionSurface} ${CoreExperienceStyles.freeReanswerFinalize}`}
          aria-labelledby="core-reanswer-finalize"
        >
          <h2 id="core-reanswer-finalize" className={CoreExperienceStyles.sectionTitle}>
            {REANSWER_CONFIRM_COPY_V1.finalizeTitleJa}
          </h2>
          <p className={CoreExperienceStyles.sectionLead}>{REANSWER_CONFIRM_COPY_V1.bodyJa}</p>
          <div className={CoreExperienceStyles.freeReanswerFinalizeActions}>
            <button
              type="button"
              className={CoreExperienceStyles.freeQuestionnaireSecondaryBtn}
              onClick={handleReanswerFinalizeCancel}
              disabled={completing}
            >
              {REANSWER_CONFIRM_COPY_V1.cancelJa}
            </button>
            <button
              type="button"
              className={CoreExperienceStyles.freeQuestionnairePrimaryBtn}
              onClick={handleReanswerFinalizeConfirm}
              disabled={completing}
              data-testid="m55-free-rerun-finalize"
            >
              {REANSWER_CONFIRM_COPY_V1.finalizeJa}
            </button>
          </div>
        </section>
      ) : null}

      {shouldShowRevealing(uxPhase) ? (
        <CoreFreeRevealTransition
          onComplete={handleRevealComplete}
          traitNameJa={stemDisplay.publicTitle}
        />
      ) : null}

      {showReanswerConfirm ? (
        <div className={CoreExperienceStyles.freeReanswerDialogBackdrop} role="presentation">
          <div
            className={CoreExperienceStyles.freeReanswerDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="core-reanswer-dialog-title"
          >
            <h2 id="core-reanswer-dialog-title" className={CoreExperienceStyles.sectionTitle}>
              {REANSWER_CONFIRM_COPY_V1.titleJa}
            </h2>
            <p className={CoreExperienceStyles.sectionLead}>{REANSWER_CONFIRM_COPY_V1.bodyJa}</p>
            <div className={CoreExperienceStyles.freeReanswerFinalizeActions}>
              <button
                type="button"
                className={CoreExperienceStyles.freeQuestionnaireSecondaryBtn}
                onClick={handleReanswerCancel}
              >
                {REANSWER_CONFIRM_COPY_V1.cancelJa}
              </button>
              <button
                type="button"
                className={CoreExperienceStyles.freeQuestionnairePrimaryBtn}
                onClick={handleReanswerConfirm}
                data-testid="m55-free-rerun-confirm"
              >
                {REANSWER_CONFIRM_COPY_V1.confirmJa}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {hideResult ? null : (
        <>
          {shouldShowHero(uxPhase) ? (
            <div className={CoreExperienceStyles.freeResultRevealItem}>
              <CoreFreeResultLeadSection
                outcomeJa={currentExpressionSummary}
                typeLabelJa={stemDisplay.publicTitle}
                supportingTraitJa={traitIdentityLine}
                imagePath={stemDisplay.imagePath}
              />
            </div>
          ) : null}

          {shouldShowResultSections(uxPhase) && composition ? (
            <>
              <nav
                className={CoreExperienceStyles.freeResultSectionNav}
                aria-label="個人無料読み解きのセクション"
                data-testid="m55-free-result-section-nav"
                data-m55-print-hide
              >
                <a href="#core-lead">結果</a>
                <a href="#core-summary">背景</a>
                <a href="#core-scenes">場面</a>
                <a href="#core-paid">プレミアム</a>
                <a href="#core-share">共有</a>
              </nav>

              {depthAnalysis ? (
                <>
                  <div className={CoreExperienceStyles.freeResultRevealItem}>
                    <CoreFreeResultSummaryHub depth={depthAnalysis} />
                  </div>
                  <div className={CoreExperienceStyles.freeResultRevealItem}>
                    <CoreFreeResultScenesSection
                      depth={depthAnalysis}
                      onRequestReanswer={handleRequestReanswer}
                    />
                  </div>
                </>
              ) : null}

              {!isSignedIn ? (
                <div className={CoreExperienceStyles.freeResultRevealItem}>
                  <CoreGuestSaveResultCTA />
                </div>
              ) : null}

              {shareCard ? (
                <div className={CoreExperienceStyles.freeResultRevealItem} id="core-share">
                  <CoreFreeResultShareCTA card={shareCard} />
                </div>
              ) : null}

              {depthAnalysis ? (
                <div className={CoreExperienceStyles.freeResultRevealItem}>
                  <CoreMethodCompact />
                </div>
              ) : null}

              {depthAnalysis ? (
                <div className={CoreExperienceStyles.freeResultRevealItem}>
                  <CoreEntryReportCTASection
                    depth={depthAnalysis}
                    traitName={shareCard?.traitNameJa ?? 'あなた'}
                  />
                </div>
              ) : null}

              <CorePremiumStickyCta visible />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
