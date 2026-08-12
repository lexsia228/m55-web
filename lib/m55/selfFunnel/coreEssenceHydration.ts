import {
  resolveInitialUxPhase,
  type FreeRevealUxPhase,
} from '../freeResult/coreFreeRevealUxState';
import { readBasicInfo, readPersistedFunnel } from './selfFunnelClientStore';
import {
  resolveCoreRouteView,
  resolveResumeQuestionIndex,
  resolveSelfFunnelStage,
} from './selfFunnelRuntimeState';

export type CoreEssenceHydration = {
  uxPhase: FreeRevealUxPhase;
  draftAnswers: Record<string, string>;
  committedAnswers: Record<string, string>;
  questionIndex: number;
  generationCount: number;
};

/**
 * Hydrates /core with the same owner identity used by profile intake.
 * A null owner intentionally preserves the device-local guest profile path.
 */
export function hydrateCoreEssenceFromStore(
  ownerId?: string | null,
): CoreEssenceHydration {
  const basic = readBasicInfo(ownerId);
  const persisted = readPersistedFunnel();
  if (!basic) {
    return {
      uxPhase: 'INTRO',
      draftAnswers: {},
      committedAnswers: {},
      questionIndex: 0,
      generationCount: 0,
    };
  }

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
