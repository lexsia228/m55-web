/**
 * Client session store for Self funnel runtime (sessionStorage).
 * Profile nickname/DOB remain in ProfileRepository (localStorage).
 */

import { ProfileRepository, type BirthProfile } from '../../soul/profile';
import {
  FREE_ANSWERS_SESSION_KEY,
  PAID_ANSWERS_SESSION_KEY,
  SELF_FUNNEL_SESSION_KEY,
  buildFreeResultFingerprint,
  emptyPersistedFunnel,
  isPaidAnswerSetComplete,
  isValidBasicInfo,
  parsePersistedFunnel,
  resolveResumeQuestionIndex,
  resolveSelfFunnelStage,
  type SelfFunnelBasicInfo,
  type SelfFunnelPersistedV1,
  type SelfFunnelStage,
} from './selfFunnelRuntimeState';

function isClient(): boolean {
  return typeof window !== 'undefined';
}

export function readBasicInfo(ownerId?: string | null): SelfFunnelBasicInfo | null {
  if (!isClient()) return null;
  const profile = ProfileRepository.get(ownerId);
  if (!isValidBasicInfo(profile)) return null;
  return {
    nickname: profile.nickname.trim(),
    birthDate: profile.birthDate.trim().slice(0, 10),
  };
}

export function readPersistedFunnel(): SelfFunnelPersistedV1 {
  if (!isClient()) return emptyPersistedFunnel();
  try {
    const raw = sessionStorage.getItem(SELF_FUNNEL_SESSION_KEY);
    if (!raw) {
      return migrateLegacyFreeAnswers();
    }
    return parsePersistedFunnel(JSON.parse(raw));
  } catch {
    return emptyPersistedFunnel();
  }
}

/** One-time bridge from legacy m55_free_answers_v1 into funnel snapshot. */
function migrateLegacyFreeAnswers(): SelfFunnelPersistedV1 {
  const base = emptyPersistedFunnel();
  try {
    const freeRaw = sessionStorage.getItem(FREE_ANSWERS_SESSION_KEY);
    if (!freeRaw) return base;
    const answers = JSON.parse(freeRaw) as Record<string, string>;
    if (!answers || typeof answers !== 'object') return base;
    const basic = readBasicInfo(null);
    if (basic && Object.keys(answers).length > 0) {
      const fingerprint = buildFreeResultFingerprint(basic, answers);
      return {
        ...base,
        draftFreeAnswers: answers,
        committedFreeAnswers: answers,
        freeResultFingerprint: fingerprint,
        questionIndex: resolveResumeQuestionIndex(answers),
      };
    }
    return {
      ...base,
      draftFreeAnswers: answers,
      questionIndex: resolveResumeQuestionIndex(answers),
    };
  } catch {
    return base;
  }
}

export function writePersistedFunnel(next: SelfFunnelPersistedV1): void {
  if (!isClient()) return;
  try {
    sessionStorage.setItem(SELF_FUNNEL_SESSION_KEY, JSON.stringify(next));
    if (next.committedFreeAnswers) {
      sessionStorage.setItem(
        FREE_ANSWERS_SESSION_KEY,
        JSON.stringify(next.committedFreeAnswers),
      );
    }
  } catch {
    /* no-op */
  }
}

export function readPaidAnswers(): Record<string, string> {
  if (!isClient()) return {};
  try {
    const raw = sessionStorage.getItem(PAID_ANSWERS_SESSION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function clearPaidAnswers(): void {
  if (!isClient()) return;
  try {
    sessionStorage.removeItem(PAID_ANSWERS_SESSION_KEY);
  } catch {
    /* no-op */
  }
}

export function readSelfFunnelStage(ownerId?: string | null, purchased = false): SelfFunnelStage {
  const basicInfo = readBasicInfo(ownerId);
  const persisted = readPersistedFunnel();
  const paidAnswers = readPaidAnswers();

  // Fail closed: fingerprint mismatch → drop fabricated completion
  let effective = persisted;
  if (
    basicInfo &&
    persisted.committedFreeAnswers &&
    persisted.freeResultFingerprint &&
    persisted.freeResultFingerprint !==
      buildFreeResultFingerprint(basicInfo, persisted.committedFreeAnswers)
  ) {
    effective = {
      ...persisted,
      committedFreeAnswers: null,
      freeResultFingerprint: null,
    };
    writePersistedFunnel(effective);
  }

  // Boolean-only legacy "has profile" with invalid DOB → EMPTY
  if (!basicInfo) {
    return 'EMPTY';
  }

  return resolveSelfFunnelStage({
    basicInfo,
    draftFreeAnswers: effective.draftFreeAnswers,
    committedFreeAnswers: effective.committedFreeAnswers,
    freeResultFingerprint: effective.freeResultFingerprint,
    paidAnswers,
    purchased,
  });
}

export function syncDraftAnswers(answers: Record<string, string>, questionIndex?: number): void {
  const current = readPersistedFunnel();
  writePersistedFunnel({
    ...current,
    draftFreeAnswers: answers,
    questionIndex:
      typeof questionIndex === 'number'
        ? questionIndex
        : resolveResumeQuestionIndex(answers),
  });
}

export function onBasicInfoIdentityChanged(
  previous: BirthProfile | null,
  next: BirthProfile,
): void {
  if (!isValidBasicInfo(next)) return;
  const prevOk = isValidBasicInfo(previous);
  const identityChanged =
    !prevOk ||
    previous!.nickname.trim() !== next.nickname.trim() ||
    previous!.birthDate.trim().slice(0, 10) !== next.birthDate.trim().slice(0, 10);
  if (!identityChanged) return;

  const current = readPersistedFunnel();
  writePersistedFunnel({
    ...current,
    committedFreeAnswers: null,
    freeResultFingerprint: null,
    draftFreeAnswers: {},
    questionIndex: 0,
  });
  clearPaidAnswers();
  try {
    sessionStorage.removeItem(FREE_ANSWERS_SESSION_KEY);
  } catch {
    /* no-op */
  }
}

export function exposeFunnelDebug(payload: {
  generationCount: number;
  stage: SelfFunnelStage;
  analyticsCompletionCount?: number;
}): void {
  if (!isClient()) return;
  try {
    (window as unknown as { __m55SelfFunnelDebug?: unknown }).__m55SelfFunnelDebug = payload;
  } catch {
    /* no-op */
  }
}

export function paidAnswersAreComplete(): boolean {
  return isPaidAnswerSetComplete(readPaidAnswers());
}
