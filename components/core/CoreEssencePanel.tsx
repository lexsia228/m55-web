'use client';

import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProfileRepository, promoteGuestProfileToClerkUser } from '../../lib/soul/profile';
import { queueDtrDraftSync } from '../../lib/m55/dtrDraftClientSync';
import { ensureSealedCoreResult, promoteGuestCoreSnapshotToClerkUser } from '../../lib/m55/coreResult/store';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import { coreHeroSelfLanguageForResult } from '../../lib/m55/coreHeroSelfLanguage';
import {
  buildFreeFiveViewCompositionV1,
  type FreeFiveViewComposition,
} from '../../lib/m55/freeResult/buildFreeFiveViewCompositionV1';
import {
  isQuestionnaireCompleteForComposition,
  resolveInitialUxPhase,
  shouldHideResultDuringQuestionnaire,
  shouldShowHero,
  shouldShowIntro,
  shouldShowQuestionnaire,
  shouldShowReanswerFinalize,
  shouldShowRevealing,
  shouldShowResultSections,
  transitionOnIntroStart,
  transitionOnQuestionnaireComplete,
  transitionOnReanswerEditStart,
  transitionOnRevealComplete,
  type FreeRevealUxPhase,
} from '../../lib/m55/freeResult/coreFreeRevealUxState';
import { REANSWER_CONFIRM_COPY_V1 } from '../../lib/m55/freeResult/guestFreeJourneyCopyV1';
import { FREE_QUESTION_IDS } from '../../lib/m55/individualization/answerIdMapsV1';
import type { FreeQuestionId } from '../../lib/m55/freeResult/questionnaireCopyV1';
import CoreAiChatExplainerSection from './CoreAiChatExplainerSection';
import CoreAlignFlowSection from './CoreAlignFlowSection';
import CoreClosingSummarySection from './CoreClosingSummarySection';
import CoreEntryReportCTASection from './CoreEntryReportCTASection';
import CoreFiveViewResultSection from './CoreFiveViewResultSection';
import CoreFreeIntroSection from './CoreFreeIntroSection';
import CoreFreeJourneyStepper from './CoreFreeJourneyStepper';
import CoreFreeQuestionnaireLayer from './CoreFreeQuestionnaireLayer';
import CoreFreeResultSummaryHub from './CoreFreeResultSummaryHub';
import CoreFreeRevealTransition from './CoreFreeRevealTransition';
import CoreFreeSavedBoundarySection from './CoreFreeSavedBoundarySection';
import CoreGuestSaveResultCTA from './CoreGuestSaveResultCTA';
import CoreExperienceStyles from './CoreExperience.module.css';
import CoreHeroSection from './CoreHeroSection';
import CoreHowM55ReadsSection from './CoreHowM55ReadsSection';
import CoreLockedState from './CoreLockedState';
import CoreObservationListSection from './CoreObservationListSection';
import CoreRadarSection from './CoreRadarSection';
import CoreScrollReveal from './CoreScrollReveal';
import CoreTendencyLoadSection from './CoreTendencyLoadSection';
import CoreTypeEaseSection from './CoreTypeEaseSection';

type SealedState =
  | { kind: 'loading' }
  | { kind: 'locked' }
  | { kind: 'ready'; result: CoreResult; profile: NonNullable<ReturnType<typeof ProfileRepository.get>> }
  | { kind: 'error'; message: string };

function isCompleteFreeAnswerSet(answers: Record<string, string>): boolean {
  return FREE_QUESTION_IDS.every((id) => Boolean(answers[id]));
}

function formatBirthDateLabelJa(isoDate: string): string {
  const parsed = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!parsed) return isoDate;
  const year = parsed[1];
  const month = Number(parsed[2]);
  const day = Number(parsed[3]);
  return `${year}年${month}月${day}日`;
}

export default function CoreEssencePanel() {
  const { user, isLoaded, isSignedIn } = useUser();
  const ownerId = user?.id ?? null;
  const [profileEpoch, setProfileEpoch] = useState(0);
  const [uxPhase, setUxPhase] = useState<FreeRevealUxPhase>(resolveInitialUxPhase);
  const [questionnaireFlowKey, setQuestionnaireFlowKey] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [committedAnswers, setCommittedAnswers] = useState<Record<string, string>>({});
  const [isReanswerFlow, setIsReanswerFlow] = useState(false);
  const [showReanswerConfirm, setShowReanswerConfirm] = useState(false);
  const [compositionError, setCompositionError] = useState<string | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

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
      setCompositionError('見取り図を組み立てられませんでした。もう一度答え直してください。');
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
    return <CoreLockedState />;
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
  const nickname = profile.nickname.trim();
  const birthDateLabelJa = formatBirthDateLabelJa(profile.birthDate);
  const hideResult = shouldHideResultDuringQuestionnaire(uxPhase);
  const heroLanguage = coreHeroSelfLanguageForResult(result);

  function handleAnswerChange(questionId: FreeQuestionId, answerId: string) {
    setDraftAnswers((prev) => ({ ...prev, [questionId]: answerId }));
  }

  function handleIntroStart() {
    setUxPhase(transitionOnIntroStart());
  }

  function handleQuestionnaireComplete() {
    if (!isCompleteFreeAnswerSet(draftAnswers)) return;
    setUxPhase(transitionOnQuestionnaireComplete(isReanswerFlow));
  }

  function handleRevealComplete() {
    setCommittedAnswers({ ...draftAnswers });
    persistAnswersForCheckout(draftAnswers);
    setIsReanswerFlow(false);
    setUxPhase(transitionOnRevealComplete());
  }

  function handleRequestReanswer() {
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
    if (!isCompleteFreeAnswerSet(draftAnswers)) return;
    setUxPhase('REVEALING');
  }

  function handleReanswerFinalizeCancel() {
    setUxPhase(transitionOnReanswerEditStart());
  }

  const currentExpressionSummary =
    composition?.synthesis.currentExpressionSummaryJa ??
    composition?.views[0]?.tendencyLabelJa ??
    '5つの答えから見える、いまの表れ方です。';

  return (
    <div className={CoreExperienceStyles.page}>
      <CoreScrollReveal />

      {uxPhase === 'RESULT' ? (
        <CoreFreeJourneyStepper currentStep="result" />
      ) : null}

      {shouldShowIntro(uxPhase) ? (
        <CoreFreeIntroSection birthDateLabelJa={birthDateLabelJa} onStart={handleIntroStart} />
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
              <CoreHeroSection result={result} nickname={nickname} />
            </div>
          ) : null}

          {shouldShowResultSections(uxPhase) && composition ? (
            <>
              <nav className={CoreExperienceStyles.freeResultSectionNav} aria-label="見取り図のセクション">
                <a href="#core-summary">概要</a>
                <a href="#core-five-views">5つの視点</a>
                <a href="#core-daily">日常での出方</a>
                <a href="#core-paid">保存版</a>
              </nav>

              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreFreeResultSummaryHub
                  composition={composition}
                  stableSummaryJa={heroLanguage.primary}
                  currentExpressionSummaryJa={currentExpressionSummary}
                />
              </div>

              <div
                className={`${CoreExperienceStyles.freeResultRevealItem} ${CoreExperienceStyles.freeStableBaselineLead}`}
                id="core-stable"
              >
                <span className={CoreExperienceStyles.tierAOverline}>変わりにくい土台</span>
                <h2 className={CoreExperienceStyles.sectionTitle}>生年月日から見る傾向</h2>
                <p className={CoreExperienceStyles.sectionLead}>
                  登録中の生年月日から読み取れる、変わりにくい土台の輪郭です。
                </p>
              </div>

              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreRadarSection result={result} nickname={nickname} />
              </div>

              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreFiveViewResultSection
                  composition={composition}
                  onRequestReanswer={handleRequestReanswer}
                />
              </div>

              {!isSignedIn ? (
                <div className={CoreExperienceStyles.freeResultRevealItem}>
                  <CoreGuestSaveResultCTA />
                </div>
              ) : null}

              <div className={CoreExperienceStyles.freeResultRevealItem} id="core-paid">
                <CoreFreeSavedBoundarySection />
              </div>
              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreEntryReportCTASection />
              </div>

              <div className={CoreExperienceStyles.freeResultRevealItem} id="core-daily">
                <div
                  className={`${CoreExperienceStyles.section} ${CoreExperienceStyles.coreSectionSurface}`}
                  aria-labelledby="core-free-detail-outline"
                >
                  <span className={CoreExperienceStyles.tierAOverline}>詳しい読み方</span>
                  <h2 id="core-free-detail-outline" className={CoreExperienceStyles.sectionTitle}>
                    無料で読める詳細
                  </h2>
                  <p className={CoreExperienceStyles.sectionLead}>
                    要約のあとにも、自分を客観的に見るための読み方が続きます。
                  </p>
                  <ul className={CoreExperienceStyles.freeIntroMetaList}>
                    <li>傾向と負荷</li>
                    <li>場面ごとに、こう出やすい</li>
                    <li>まず整えるとよいこと</li>
                    <li>いま見えていること</li>
                    <li>まとめ</li>
                  </ul>
                </div>
                <button
                  type="button"
                  className={CoreExperienceStyles.freeDetailsToggle}
                  aria-expanded={detailsExpanded}
                  onClick={() => setDetailsExpanded((v) => !v)}
                >
                  {detailsExpanded ? '詳しく読むを閉じる' : '詳しく読む'}
                </button>
                {detailsExpanded ? (
                  <div className={CoreExperienceStyles.freeDetailsPanel}>
                    <CoreHowM55ReadsSection nickname={nickname} />
                    <CoreTendencyLoadSection result={result} />
                    <CoreTypeEaseSection result={result} />
                    <CoreAlignFlowSection result={result} />
                    <CoreObservationListSection result={result} />
                    <CoreClosingSummarySection result={result} nickname={nickname} />
                    <CoreAiChatExplainerSection nickname={nickname} />
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
