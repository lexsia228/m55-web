/**
 * paid-v1 → paidDepth (chapterBias + hashes).
 */

import { createHash } from 'node:crypto';
import {
  PAID_DECISION_FRICTION_IDS,
  PAID_FATIGUE_SIGNAL_IDS,
  PAID_QUESTION_IDS,
  PAID_READING_STYLE_IDS,
  PAID_RECOVERY_SEQUENCE_IDS,
  PAID_RELATION_FOCUS_IDS,
  PAID_REPORT_USAGE_IDS,
  PAID_RESTART_CONDITION_IDS,
  PAID_WORK_FOCUS_IDS,
} from './answerIdMapsV1';
import type { ChapterBias, ChapterHintId, PaidDepth, Result } from './types';
import { PAID_QUESTIONNAIRE_VERSION } from './versions';

const CURRENT_ALLOWED_PAID = new Set<string>([
  ...PAID_WORK_FOCUS_IDS,
  ...PAID_DECISION_FRICTION_IDS,
  ...PAID_RELATION_FOCUS_IDS,
  ...PAID_FATIGUE_SIGNAL_IDS,
  ...PAID_RECOVERY_SEQUENCE_IDS,
  ...PAID_RESTART_CONDITION_IDS,
]);

const LEGACY_ALLOWED_PAID = new Set<string>([
  ...PAID_WORK_FOCUS_IDS,
  ...PAID_DECISION_FRICTION_IDS,
  ...PAID_RELATION_FOCUS_IDS,
  ...PAID_FATIGUE_SIGNAL_IDS,
  ...PAID_REPORT_USAGE_IDS,
  ...PAID_READING_STYLE_IDS,
]);

const LEGACY_PAID_QUESTION_IDS = [
  'paid.work_focus',
  'paid.decision_friction',
  'paid.relation_focus',
  'paid.fatigue_signal',
  'paid.report_usage',
  'paid.reading_style',
] as const;

function isLegacyPaidAnswerSet(set: Record<string, string>): boolean {
  return Boolean(set['paid.report_usage'] || set['paid.reading_style']);
}

function emptyBias(): ChapterBias {
  return { I: 0, II: 0, III: 0, IV: 0 };
}

function add(bias: ChapterBias, chapter: ChapterHintId, n = 1): void {
  bias[chapter] += n;
}

function contributeCurrent(bias: ChapterBias, answerId: string): void {
  if ((PAID_WORK_FOCUS_IDS as readonly string[]).includes(answerId)) {
    add(bias, 'II');
    return;
  }
  if (answerId === 'paid.decision_friction.too_many') {
    add(bias, 'II');
    return;
  }
  if (answerId === 'paid.decision_friction.unclear_end') {
    add(bias, 'III');
    return;
  }
  if (answerId === 'paid.decision_friction.fear_mistake') {
    add(bias, 'I');
    return;
  }
  if (answerId === 'paid.relation_focus.recovery') {
    add(bias, 'III');
    add(bias, 'IV');
    return;
  }
  if ((PAID_RELATION_FOCUS_IDS as readonly string[]).includes(answerId)) {
    add(bias, 'III');
    return;
  }
  if (answerId === 'paid.fatigue_signal.before_start') {
    add(bias, 'II');
    return;
  }
  if ((PAID_FATIGUE_SIGNAL_IDS as readonly string[]).includes(answerId)) {
    add(bias, 'IV');
    return;
  }
  if (answerId === 'paid.recovery_sequence.pause_first') {
    add(bias, 'III');
    add(bias, 'IV');
    return;
  }
  if ((PAID_RECOVERY_SEQUENCE_IDS as readonly string[]).includes(answerId)) {
    add(bias, 'IV');
    return;
  }
  if (answerId === 'paid.restart_condition.overview_first') {
    add(bias, 'II');
    add(bias, 'IV');
    return;
  }
  if (answerId === 'paid.restart_condition.shrink_scope') {
    add(bias, 'IV');
    return;
  }
  if (answerId === 'paid.restart_condition.trusted_support') {
    add(bias, 'III');
    add(bias, 'IV');
  }
}

function contributeLegacy(bias: ChapterBias, answerId: string): void {
  if ((PAID_WORK_FOCUS_IDS as readonly string[]).includes(answerId)) {
    add(bias, 'II');
    return;
  }
  if (answerId === 'paid.decision_friction.too_many') {
    add(bias, 'II');
    return;
  }
  if (answerId === 'paid.decision_friction.unclear_end') {
    add(bias, 'III');
    return;
  }
  if (answerId === 'paid.decision_friction.fear_mistake') {
    add(bias, 'I');
    return;
  }
  if (answerId === 'paid.relation_focus.recovery') {
    add(bias, 'III');
    add(bias, 'IV');
    return;
  }
  if ((PAID_RELATION_FOCUS_IDS as readonly string[]).includes(answerId)) {
    add(bias, 'III');
    return;
  }
  if (answerId === 'paid.fatigue_signal.before_start') {
    add(bias, 'II');
    return;
  }
  if ((PAID_FATIGUE_SIGNAL_IDS as readonly string[]).includes(answerId)) {
    add(bias, 'IV');
    return;
  }
  if ((PAID_REPORT_USAGE_IDS as readonly string[]).includes(answerId)) {
    add(bias, 'I');
    return;
  }
  if ((PAID_READING_STYLE_IDS as readonly string[]).includes(answerId)) {
    add(bias, 'I');
  }
}

export function hashPaidAnswerSet(paidAnswerSet: Record<string, string>): string {
  const keys = Object.keys(paidAnswerSet).sort();
  const payload = keys.map((k) => `${k}=${paidAnswerSet[k]}`).join('&');
  return createHash('sha256')
    .update(`${PAID_QUESTIONNAIRE_VERSION}|${payload}`)
    .digest('hex');
}

export function buildPaidDepthV1(input: {
  paidAnswerSet: Record<string, string> | null | undefined;
}): Result<PaidDepth | null> {
  if (input.paidAnswerSet == null) {
    return { ok: true, value: null };
  }
  const set = input.paidAnswerSet;
  const legacy = isLegacyPaidAnswerSet(set);
  const questionIds = legacy ? LEGACY_PAID_QUESTION_IDS : PAID_QUESTION_IDS;
  const allowed = legacy ? LEGACY_ALLOWED_PAID : CURRENT_ALLOWED_PAID;
  const contribute = legacy ? contributeLegacy : contributeCurrent;

  for (const qid of questionIds) {
    if (typeof set[qid] !== 'string' || set[qid]!.length === 0) {
      return { ok: false, code: 'missing_paid_answers' };
    }
    if (!allowed.has(set[qid]!)) {
      return { ok: false, code: 'unknown_answer_id' };
    }
  }

  const chapterBias = emptyBias();
  for (const qid of questionIds) {
    contribute(chapterBias, set[qid]!);
  }

  if (legacy) {
    return {
      ok: true,
      value: {
        chapterBias,
        recoverySequence: null,
        restartCondition: null,
        readingStyle: set['paid.reading_style'] ?? null,
        reportUsage: set['paid.report_usage'] ?? null,
        paidDepthHash: hashPaidAnswerSet(set),
      },
    };
  }

  return {
    ok: true,
    value: {
      chapterBias,
      recoverySequence: set['paid.recovery_sequence'] ?? null,
      restartCondition: set['paid.restart_condition'] ?? null,
      readingStyle: null,
      reportUsage: null,
      paidDepthHash: hashPaidAnswerSet(set),
    },
  };
}
