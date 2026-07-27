'use client';

import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProfileRepository, promoteGuestProfileToClerkUser } from '../../lib/soul/profile';
import { queueDtrDraftSync } from '../../lib/m55/dtrDraftClientSync';
import { ensureSealedCoreResult, promoteGuestCoreSnapshotToClerkUser } from '../../lib/m55/coreResult/store';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import { coreHeroSelfLanguageForResult } from '../../lib/m55/coreHeroSelfLanguage';
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
import CoreEntryReportCTASection from './CoreEntryReportCTASection';
import CoreFreeJourneyStepper from './CoreFreeJourneyStepper';
import CoreFreeQuestionnaireLayer from './CoreFreeQuestionnaireLayer';
import CoreFreeResultLeadSection from './CoreFreeResultLeadSection';
import CoreFreeResultScenesSection from './CoreFreeResultScenesSection';
import CoreFreeResultShareCTA from './CoreFreeResultShareCTA';
import CoreFreeResultSummaryHub from './CoreFreeResultSummaryHub';
import CoreFreeRevealTransition from './CoreFreeRevealTransition';
import CoreGuestSaveResultCTA from './CoreGuestSaveResultCTA';
import CoreExperienceStyles from './CoreExperience.module.css';
import CoreLockedState from './CoreLockedState';
import BirthProfileIntakeLayer from '../profile/BirthProfileIntakeLayer';
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

export default function CoreEssencePanel() {
  const { user, isLoaded, isSignedIn } = useUser();
  const ownerId = user?.id ?? null;
  const [profileEpoch, setProfileEpoch] = useState(0);
  const [uxPhase, setUxPhase] = useState<FreeRevealUxPhase>(() => resolveInitialUxPhase(true));
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [questionnaireFlowKey, setQuestionnaireFlowKey] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [committedAnswers, setCommittedAnswers] = useState<Record<string, string>>({});
  const [isReanswerFlow, setIsReanswerFlow] = useState(false);
  const [showReanswerConfirm, setShowReanswerConfirm] = useState(false);
  const [compositionError, setCompositionError] = useState<string | null>(null);

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

  const sealed: SealedState = useMemo(() => {
    if (!isLoaded) return { kind: 'loading' };
    const profile = ProfileRepository.get(ownerId);
    if (!profile?.birthDate || !profile.nickname?.trim()) {
      return { kind: 'locked' };
    }
    try {
      const result = ensureSealedCoreResult(ownerId, profile);
      return { kind: 'ready', result, profile };
    } catch (e) {
      const message = e instanceof Error ? e.message : '読み取りに失敗しました。';
      return { kind: 'error', message };
    }
  }, [isLoaded, ownerId, profileEpoch]);

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
      M55_FUNNEL_EVENTS.freeResultView,
      'core_free_result',
      'core-free-result-view',
    );
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
    }
  }, [committedAnswers, committedComplete, composition, questionnaireDone]);

  const persistAnswersForCheckout = useCallback(
    (answerSet: Record<string, string>) => {
      if (sealed.kind !== 'ready') return;
      const { profile } = sealed;
      if (!profile.birthDate || !profile.nickname?.trim()) return;
      queueDtrDraftSync(ownerId, {
        nickname: profile.nickname.trim(),
        birthDate: profile.birthDate,
        extraJson: { freeAnswerSet: answerSet },
      });
      try {
        sessionStorage.setItem('m55_free_answers_v1', JSON.stringify(answerSet));
      } catch {
        /* no-op */
      }
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
  const heroLanguage = coreHeroSelfLanguageForResult(result);
  const stemDisplay = resolveCorePublicStemDisplay(result);

  function handleAnswerChange(questionId: FreeQuestionId, answerId: string) {
    setDraftAnswers((prev) => ({ ...prev, [questionId]: answerId }));
  }

  function handleRequestProfileEdit() {
    setProfileEditOpen(true);
  }

  function handleProfileSaved() {
    setProfileEpoch((n) => n + 1);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('m55:profile_updated'));
    }
  }

  function handleQuestionnaireComplete() {
    const complete = ensureCompleteFreeAnswerSet(draftAnswers);
    if (!complete) return;
    setDraftAnswers(complete);
    trackFunnelAction(M55_FUNNEL_EVENTS.coreQuestionsCompleted, 'core_free_entry');
    setUxPhase(transitionOnQuestionnaireComplete(isReanswerFlow));
  }

  function handleRevealComplete() {
    const complete = ensureCompleteFreeAnswerSet(draftAnswers) ?? draftAnswers;
    setCommittedAnswers({ ...complete });
    persistAnswersForCheckout(complete);
    setIsReanswerFlow(false);
    setUxPhase(transitionOnRevealComplete());
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
  }

  function handleReanswerFinalizeConfirm() {
    const complete = ensureCompleteFreeAnswerSet(draftAnswers);
    if (!complete) return;
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

  return (
    <div className={CoreExperienceStyles.page}>
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
        <CoreFreeJourneyStepper
          currentStep="questions"
          questionLabel={`${questionIndex + 1}/${FREE_FIVE_QUESTION_COUNT}`}
        />
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
          />
          {compositionError ? (
            <div className={CoreExperienceStyles.errorBox} role="alert">
              {compositionError}
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
            >
              {REANSWER_CONFIRM_COPY_V1.cancelJa}
            </button>
            <button
              type="button"
              className={CoreExperienceStyles.freeQuestionnairePrimaryBtn}
              onClick={handleReanswerFinalizeConfirm}
            >
              {REANSWER_CONFIRM_COPY_V1.finalizeJa}
            </button>
          </div>
        </section>
      ) : null}

      {shouldShowRevealing(uxPhase) ? (
        <CoreFreeRevealTransition onComplete={handleRevealComplete} />
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
                supportingTraitJa={heroLanguage.displayTrait}
                imagePath={stemDisplay.imagePath}
              />
            </div>
          ) : null}

          {shouldShowResultSections(uxPhase) && composition ? (
            <>
              <nav className={CoreExperienceStyles.freeResultSectionNav} aria-label="無料結果のセクション">
                <a href="#core-lead">結果</a>
                <a href="#core-summary">背景</a>
                <a href="#core-scenes">場面</a>
                <a href="#core-paid">プレミアム</a>
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
                  <div className={CoreExperienceStyles.freeResultRevealItem}>
                    <CoreEntryReportCTASection depth={depthAnalysis} />
                  </div>
                </>
              ) : null}

              {!isSignedIn ? (
                <div className={CoreExperienceStyles.freeResultRevealItem}>
                  <CoreGuestSaveResultCTA />
                </div>
              ) : null}

              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreFreeResultShareCTA />
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
