/**
 * Canonical Self free→Premium funnel runtime state (client presentation).
 * Fail-closed on corrupt / incomplete / schema-incompatible payloads.
 */

import {
  FREE_AXIS_QUESTION_IDS,
  PAID_QUESTION_IDS,
} from '../individualization/answerIdMapsV1';
import {
  ensureCompleteFreeAnswerSet,
  isCoreFiveAnswersComplete,
} from '../freeResult/ensureFreeAnswerSetCompleteV1';
import { resolveExperienceCtaLabel } from '../commercialUx/experience/experienceCtaState';

export const SELF_FUNNEL_SCHEMA_VERSION = 1 as const;
export const SELF_FUNNEL_SESSION_KEY = 'm55_self_funnel_v1' as const;
export const FREE_ANSWERS_SESSION_KEY = 'm55_free_answers_v1' as const;
export const PAID_ANSWERS_SESSION_KEY = 'm55_paid_answers_v1' as const;

export type SelfFunnelStage =
  | 'EMPTY'
  | 'BASIC_INFO_COMPLETE'
  | 'FREE_QUESTIONS_IN_PROGRESS'
  | 'FREE_RESULT_READY'
  | 'PAID_QUESTIONS_IN_PROGRESS'
  | 'PAID_QUESTIONS_COMPLETE'
  | 'PLAN_SELECTION'
  | 'PURCHASED';

export type SelfFunnelBasicInfo = {
  nickname: string;
  birthDate: string; // YYYY-MM-DD
};

export type SelfFunnelPersistedV1 = {
  schemaVersion: typeof SELF_FUNNEL_SCHEMA_VERSION;
  draftFreeAnswers: Record<string, string>;
  committedFreeAnswers: Record<string, string> | null;
  freeResultFingerprint: string | null;
  questionIndex: number;
  generationCount: number;
};

const DOB_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const CORE_FIVE_IDS = [
  FREE_AXIS_QUESTION_IDS.start,
  FREE_AXIS_QUESTION_IDS.decision,
  FREE_AXIS_QUESTION_IDS.recovery,
  FREE_AXIS_QUESTION_IDS.distance,
  FREE_AXIS_QUESTION_IDS.change,
] as const;

export function isValidCivilBirthDate(birthDate: string): boolean {
  const m = birthDate.trim().match(DOB_RE);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1900 || year > 2100) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

/** Require valid nickname + valid DOB payload — never a bare boolean. */
export function isValidBasicInfo(
  profile: { nickname?: string | null; birthDate?: string | null } | null | undefined,
): profile is SelfFunnelBasicInfo {
  if (!profile) return false;
  const nickname = typeof profile.nickname === 'string' ? profile.nickname.trim() : '';
  const birthDate = typeof profile.birthDate === 'string' ? profile.birthDate.trim().slice(0, 10) : '';
  return nickname.length > 0 && isValidCivilBirthDate(birthDate);
}

export function formatBirthDateJa(birthDate: string): string {
  const m = birthDate.trim().match(DOB_RE);
  if (!m) return birthDate;
  return `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日`;
}

export function formatActiveDobSummaryJa(birthDate: string): string {
  return `${formatBirthDateJa(birthDate)}を使用中`;
}

/** Deterministic fingerprint (browser-safe, no node:crypto). */
export function buildFreeResultFingerprint(
  basic: SelfFunnelBasicInfo,
  freeAnswerSet: Record<string, string>,
): string {
  const complete = ensureCompleteFreeAnswerSet(freeAnswerSet);
  const set = complete ?? freeAnswerSet;
  const keys = Object.keys(set).sort();
  const payload = keys.map((k) => `${k}=${set[k]}`).join('&');
  return `ffp1|${basic.nickname.trim()}|${basic.birthDate.trim().slice(0, 10)}|${payload}`;
}

export function countCoreFiveAnswers(answers: Record<string, string>): number {
  return CORE_FIVE_IDS.reduce((n, id) => n + (answers[id] ? 1 : 0), 0);
}

export function resolveResumeQuestionIndex(answers: Record<string, string>): number {
  for (let i = 0; i < CORE_FIVE_IDS.length; i += 1) {
    if (!answers[CORE_FIVE_IDS[i]!]) return i;
  }
  return CORE_FIVE_IDS.length - 1;
}

export function isPaidAnswerSetComplete(answers: Record<string, string>): boolean {
  return PAID_QUESTION_IDS.every((id) => Boolean(answers[id]));
}

export function countPaidAnswers(answers: Record<string, string>): number {
  return PAID_QUESTION_IDS.reduce((n, id) => n + (answers[id] ? 1 : 0), 0);
}

export type ResolveStageInput = {
  basicInfo: SelfFunnelBasicInfo | null;
  draftFreeAnswers: Record<string, string>;
  committedFreeAnswers: Record<string, string> | null;
  freeResultFingerprint: string | null;
  paidAnswers: Record<string, string>;
  purchased?: boolean;
};

/**
 * Reject impossible combinations. Mismatched fingerprints fail closed
 * (treat committed result as invalid).
 */
export function resolveSelfFunnelStage(input: ResolveStageInput): SelfFunnelStage {
  if (input.purchased) return 'PURCHASED';

  if (!input.basicInfo || !isValidBasicInfo(input.basicInfo)) {
    return 'EMPTY';
  }

  const committed = input.committedFreeAnswers;
  const committedComplete = committed ? isCoreFiveAnswersComplete(committed) : false;
  const fingerprintOk =
    committedComplete &&
    typeof input.freeResultFingerprint === 'string' &&
    input.freeResultFingerprint.length > 0 &&
    input.freeResultFingerprint === buildFreeResultFingerprint(input.basicInfo, committed!);

  if (fingerprintOk) {
    if (isPaidAnswerSetComplete(input.paidAnswers)) {
      return 'PAID_QUESTIONS_COMPLETE';
    }
    if (countPaidAnswers(input.paidAnswers) > 0) {
      return 'PAID_QUESTIONS_IN_PROGRESS';
    }
    return 'FREE_RESULT_READY';
  }

  const draftCount = countCoreFiveAnswers(input.draftFreeAnswers);
  if (draftCount > 0) {
    return 'FREE_QUESTIONS_IN_PROGRESS';
  }

  return 'BASIC_INFO_COMPLETE';
}

/** Alias used when paid complete and user is on plan UI. */
export function stageForPlanSelection(stage: SelfFunnelStage): SelfFunnelStage {
  if (stage === 'PLAN_SELECTION') return 'PLAN_SELECTION';
  if (stage === 'PAID_QUESTIONS_COMPLETE') return 'PLAN_SELECTION';
  return stage;
}

export function resolveFreeCtaLabel(stage: SelfFunnelStage): string {
  // Experience Control Plane — home/header free CTA only (not Premium bridge).
  return resolveExperienceCtaLabel({ stage, surface: 'home' });
}

export const EXPLICIT_RERUN_CTA_JA = '回答を変えて、もう一度見る' as const;

export type CoreRouteView = 'intake' | 'questionnaire' | 'result';

export function resolveCoreRouteView(stage: SelfFunnelStage): CoreRouteView {
  switch (stage) {
    case 'EMPTY':
      return 'intake';
    case 'FREE_RESULT_READY':
    case 'PAID_QUESTIONS_IN_PROGRESS':
    case 'PAID_QUESTIONS_COMPLETE':
    case 'PLAN_SELECTION':
    case 'PURCHASED':
      return 'result';
    case 'BASIC_INFO_COMPLETE':
    case 'FREE_QUESTIONS_IN_PROGRESS':
      return 'questionnaire';
    default:
      return 'intake';
  }
}

export type DtrLpGate =
  | 'need_free'
  | 'paid_questions'
  | 'plan_selection'
  | 'owned_report';

export function resolveDtrLpGate(stage: SelfFunnelStage): DtrLpGate {
  switch (stage) {
    case 'PURCHASED':
      return 'owned_report';
    case 'PLAN_SELECTION':
    case 'PAID_QUESTIONS_COMPLETE':
      return 'plan_selection';
    case 'FREE_RESULT_READY':
    case 'PAID_QUESTIONS_IN_PROGRESS':
      return 'paid_questions';
    default:
      return 'need_free';
  }
}

export function emptyPersistedFunnel(): SelfFunnelPersistedV1 {
  return {
    schemaVersion: SELF_FUNNEL_SCHEMA_VERSION,
    draftFreeAnswers: {},
    committedFreeAnswers: null,
    freeResultFingerprint: null,
    questionIndex: 0,
    generationCount: 0,
  };
}

/** Fail-closed parse — corrupt / wrong version → empty. */
export function parsePersistedFunnel(raw: unknown): SelfFunnelPersistedV1 {
  if (!raw || typeof raw !== 'object') return emptyPersistedFunnel();
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion !== SELF_FUNNEL_SCHEMA_VERSION) return emptyPersistedFunnel();

  const draft =
    o.draftFreeAnswers && typeof o.draftFreeAnswers === 'object' && !Array.isArray(o.draftFreeAnswers)
      ? (o.draftFreeAnswers as Record<string, string>)
      : {};
  const committedRaw = o.committedFreeAnswers;
  let committed: Record<string, string> | null = null;
  if (committedRaw && typeof committedRaw === 'object' && !Array.isArray(committedRaw)) {
    committed = committedRaw as Record<string, string>;
  }
  const fingerprint =
    typeof o.freeResultFingerprint === 'string' && o.freeResultFingerprint.length > 0
      ? o.freeResultFingerprint
      : null;
  const questionIndex =
    typeof o.questionIndex === 'number' && Number.isFinite(o.questionIndex)
      ? Math.max(0, Math.min(4, Math.floor(o.questionIndex)))
      : 0;
  const generationCount =
    typeof o.generationCount === 'number' && Number.isFinite(o.generationCount)
      ? Math.max(0, Math.floor(o.generationCount))
      : 0;

  return {
    schemaVersion: SELF_FUNNEL_SCHEMA_VERSION,
    draftFreeAnswers: draft,
    committedFreeAnswers: committed,
    freeResultFingerprint: fingerprint,
    questionIndex,
    generationCount,
  };
}

/** Invalidate free (+ paid) results when basic info identity changes. */
export function invalidateDependentResults(
  persisted: SelfFunnelPersistedV1,
): SelfFunnelPersistedV1 {
  return {
    ...persisted,
    committedFreeAnswers: null,
    freeResultFingerprint: null,
    generationCount: persisted.generationCount,
    questionIndex: resolveResumeQuestionIndex(persisted.draftFreeAnswers),
  };
}

export function commitFreeResult(
  persisted: SelfFunnelPersistedV1,
  basic: SelfFunnelBasicInfo,
  answerSet: Record<string, string>,
): SelfFunnelPersistedV1 | null {
  const complete = ensureCompleteFreeAnswerSet(answerSet);
  if (!complete || !isValidBasicInfo(basic)) return null;
  return {
    ...persisted,
    draftFreeAnswers: complete,
    committedFreeAnswers: complete,
    freeResultFingerprint: buildFreeResultFingerprint(basic, complete),
    questionIndex: CORE_FIVE_IDS.length - 1,
    generationCount: persisted.generationCount + 1,
  };
}
