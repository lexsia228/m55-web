import {
  ensureCompleteFreeAnswerSet,
  isCompleteFreeAnswerSet,
} from '../freeResult/ensureFreeAnswerSetCompleteV1';
import {
  buildFreeResultFingerprint,
  emptyPersistedFunnel,
  isValidBasicInfo,
  type SelfFunnelBasicInfo,
  type SelfFunnelPersistedV1,
} from './selfFunnelRuntimeState';

export type ApplyServerDraftFreeAnswerSetInput = {
  extraJson: unknown;
  persisted: SelfFunnelPersistedV1;
  basic: SelfFunnelBasicInfo | null;
};

export type ApplyServerDraftFreeAnswerSetResult = {
  applied: boolean;
  reason:
    | 'no_basic'
    | 'missing_set'
    | 'incomplete_set'
    | 'local_complete'
    | 'applied';
  next: SelfFunnelPersistedV1;
};

export function readFreeAnswerSetFromExtraJson(
  extraJson: unknown,
): Record<string, string> | null {
  if (!extraJson || typeof extraJson !== 'object' || Array.isArray(extraJson)) {
    return null;
  }
  const raw = (extraJson as Record<string, unknown>).freeAnswerSet;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== 'string' || value.trim().length === 0) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Restore a signed-in complete Personal Free result from server draft extraJson
 * when the device-local funnel snapshot is empty or incomplete.
 * Incomplete server sets never enter RESULT.
 */
export function applyServerDraftFreeAnswerSet(
  input: ApplyServerDraftFreeAnswerSetInput,
): ApplyServerDraftFreeAnswerSetResult {
  const persisted = input.persisted ?? emptyPersistedFunnel();
  if (!isValidBasicInfo(input.basic)) {
    return { applied: false, reason: 'no_basic', next: persisted };
  }

  const rawSet = readFreeAnswerSetFromExtraJson(input.extraJson);
  if (!rawSet) {
    return { applied: false, reason: 'missing_set', next: persisted };
  }

  const complete = ensureCompleteFreeAnswerSet(rawSet);
  if (!complete) {
    return { applied: false, reason: 'incomplete_set', next: persisted };
  }

  if (
    input.persisted.committedFreeAnswers &&
    isCompleteFreeAnswerSet(input.persisted.committedFreeAnswers)
  ) {
    return { applied: false, reason: 'local_complete', next: persisted };
  }

  return {
    applied: true,
    reason: 'applied',
    next: {
      ...persisted,
      draftFreeAnswers: complete,
      committedFreeAnswers: complete,
      freeResultFingerprint: buildFreeResultFingerprint(input.basic, complete),
      questionIndex: 4,
      generationCount: persisted.generationCount,
    },
  };
}
