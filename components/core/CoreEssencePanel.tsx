'use client';

import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import { queueDtrDraftSync } from '../../lib/m55/dtrDraftClientSync';
import { ensureSealedCoreResult } from '../../lib/m55/coreResult/store';
import type { CoreResult } from '../../lib/m55/coreResult/types';
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
  shouldShowRevealing,
  shouldShowResultSections,
  transitionOnIntroStart,
  transitionOnQuestionnaireComplete,
  transitionOnReanswer,
  transitionOnRevealComplete,
  type FreeRevealUxPhase,
} from '../../lib/m55/freeResult/coreFreeRevealUxState';
import { FREE_QUESTION_IDS } from '../../lib/m55/individualization/answerIdMapsV1';
import type { FreeQuestionId } from '../../lib/m55/freeResult/questionnaireCopyV1';
import CoreAiChatExplainerSection from './CoreAiChatExplainerSection';
import CoreAlignFlowSection from './CoreAlignFlowSection';
import CoreClosingSummarySection from './CoreClosingSummarySection';
import CoreEntryReportCTASection from './CoreEntryReportCTASection';
import CoreFiveViewResultSection from './CoreFiveViewResultSection';
import CoreFreeIntroSection from './CoreFreeIntroSection';
import CoreFreeQuestionnaireLayer from './CoreFreeQuestionnaireLayer';
import CoreFreeRevealTransition from './CoreFreeRevealTransition';
import CoreFreeSavedBoundarySection from './CoreFreeSavedBoundarySection';
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
  const { user, isLoaded } = useUser();
  const ownerId = user?.id ?? null;
  const [profileEpoch, setProfileEpoch] = useState(0);
  const [uxPhase, setUxPhase] = useState<FreeRevealUxPhase>(resolveInitialUxPhase);
  const [questionnaireFlowKey, setQuestionnaireFlowKey] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [compositionError, setCompositionError] = useState<string | null>(null);

  useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1);
    window.addEventListener('m55:profile_updated', bump);
    return () => window.removeEventListener('m55:profile_updated', bump);
  }, []);

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

  const answersComplete = isCompleteFreeAnswerSet(answers);
  const questionnaireDone = isQuestionnaireCompleteForComposition(uxPhase, answersComplete);

  const composition: FreeFiveViewComposition | null = useMemo(() => {
    if (sealed.kind !== 'ready' || !questionnaireDone) return null;
    const built = buildFreeFiveViewCompositionV1({
      birthDate: sealed.profile.birthDate,
      stemLaneIndex: sealed.result.stemLaneIndex,
      freeAnswerSet: answers,
    });
    if (!built.ok) return null;
    return built.value;
  }, [answers, questionnaireDone, sealed]);

  useEffect(() => {
    if (!questionnaireDone) {
      setCompositionError(null);
      return;
    }
    if (composition) {
      setCompositionError(null);
      return;
    }
    if (answersComplete) {
      setCompositionError('見取り図を組み立てられませんでした。もう一度答え直してください。');
    }
  }, [answers, answersComplete, composition, questionnaireDone]);

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

  function handleAnswerChange(questionId: FreeQuestionId, answerId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));
  }

  function handleIntroStart() {
    setUxPhase(transitionOnIntroStart());
  }

  function handleQuestionnaireComplete() {
    if (!answersComplete) return;
    persistAnswersForCheckout(answers);
    setUxPhase(transitionOnQuestionnaireComplete());
  }

  function handleRevealComplete() {
    setUxPhase(transitionOnRevealComplete());
  }

  function handleReanswer() {
    setUxPhase(transitionOnReanswer());
    setAnswers({});
    setCompositionError(null);
    setQuestionnaireFlowKey((n) => n + 1);
  }

  return (
    <div className={CoreExperienceStyles.page}>
      <CoreScrollReveal />

      {shouldShowIntro(uxPhase) ? (
        <CoreFreeIntroSection birthDateLabelJa={birthDateLabelJa} onStart={handleIntroStart} />
      ) : null}

      {shouldShowQuestionnaire(uxPhase) ? (
        <>
          <CoreFreeQuestionnaireLayer
            key={questionnaireFlowKey}
            answers={answers}
            onChange={handleAnswerChange}
            onComplete={handleQuestionnaireComplete}
          />
          {compositionError ? (
            <div className={CoreExperienceStyles.errorBox} role="alert">
              {compositionError}
            </div>
          ) : null}
        </>
      ) : null}

      {shouldShowRevealing(uxPhase) ? (
        <CoreFreeRevealTransition onComplete={handleRevealComplete} />
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
              <div
                className={`${CoreExperienceStyles.freeResultRevealItem} ${CoreExperienceStyles.freeStableBaselineLead}`}
              >
                <span className={CoreExperienceStyles.tierAOverline}>変わりにくい土台</span>
                <h2 className={CoreExperienceStyles.sectionTitle}>生年月日から見る傾向</h2>
                <p className={CoreExperienceStyles.sectionLead}>
                  ここから先は、登録中の生年月日から読み取れる、変わりにくい土台の輪郭です。
                </p>
              </div>

              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreRadarSection result={result} nickname={nickname} />
              </div>

              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreFiveViewResultSection
                  composition={composition}
                  onReanswer={handleReanswer}
                />
              </div>

              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreHowM55ReadsSection nickname={nickname} />
              </div>
              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreTendencyLoadSection result={result} />
              </div>
              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreTypeEaseSection result={result} />
              </div>
              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreAlignFlowSection result={result} />
              </div>
              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreObservationListSection result={result} />
              </div>
              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreClosingSummarySection result={result} nickname={nickname} />
              </div>
              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreAiChatExplainerSection nickname={nickname} />
              </div>
              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreFreeSavedBoundarySection />
              </div>
              <div className={CoreExperienceStyles.freeResultRevealItem}>
                <CoreEntryReportCTASection />
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
