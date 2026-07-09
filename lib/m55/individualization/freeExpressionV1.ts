/**
 * free-v1 → freeExpression (axes + theme map + hash).
 */

import { createHash } from 'node:crypto';
import {
  FREE_AXIS_QUESTION_IDS,
  FREE_CHANGE_ANSWER_TO_TENDENCY,
  FREE_DECISION_ANSWER_TO_TENDENCY,
  FREE_DISTANCE_ANSWER_TO_TENDENCY,
  FREE_QUESTION_IDS,
  FREE_RECOVERY_ANSWER_TO_TENDENCY,
  FREE_START_ANSWER_TO_TENDENCY,
  isFreePrimaryThemeAnswerId,
} from './answerIdMapsV1';
import { mapPrimaryThemeToReplyThemeV1 } from './primaryThemeReplyMapV1';
import type { ExpressionAxes, FreeExpression, Result } from './types';
import { FREE_QUESTIONNAIRE_VERSION } from './versions';

function stableAnswerHash(version: string, answerSet: Record<string, string>): string {
  const keys = Object.keys(answerSet).sort();
  const payload = keys.map((k) => `${k}=${answerSet[k]}`).join('&');
  return createHash('sha256').update(`${version}|${payload}`).digest('hex');
}

export function hashFreeAnswerSet(freeAnswerSet: Record<string, string>): string {
  return stableAnswerHash(FREE_QUESTIONNAIRE_VERSION, freeAnswerSet);
}

export function buildFreeExpressionV1(input: {
  freeAnswerSet: Record<string, string>;
}): Result<FreeExpression> {
  const set = input.freeAnswerSet;
  for (const qid of FREE_QUESTION_IDS) {
    if (typeof set[qid] !== 'string' || set[qid]!.length === 0) {
      return { ok: false, code: 'missing_free_answers' };
    }
  }

  const startId = set['free.start_style']!;
  const decisionId = set['free.decision_style']!;
  const recoveryId = set['free.recovery_style']!;
  const distanceId = set['free.distance_style']!;
  const changeId = set['free.change_style']!;
  const themeId = set['free.primary_theme']!;

  const start = FREE_START_ANSWER_TO_TENDENCY[startId];
  const decision = FREE_DECISION_ANSWER_TO_TENDENCY[decisionId];
  const recovery = FREE_RECOVERY_ANSWER_TO_TENDENCY[recoveryId];
  const distance = FREE_DISTANCE_ANSWER_TO_TENDENCY[distanceId];
  const change = FREE_CHANGE_ANSWER_TO_TENDENCY[changeId];

  if (!start || !decision || !recovery || !distance || !change) {
    return { ok: false, code: 'unknown_answer_id' };
  }
  if (!isFreePrimaryThemeAnswerId(themeId)) {
    return { ok: false, code: 'unknown_answer_id' };
  }

  const mapped = mapPrimaryThemeToReplyThemeV1(themeId);
  if (!mapped.ok) return mapped;

  const axes: ExpressionAxes = { start, decision, recovery, distance, change };
  const freeExpressionHash = stableAnswerHash(FREE_QUESTIONNAIRE_VERSION, {
    [FREE_AXIS_QUESTION_IDS.start]: startId,
    [FREE_AXIS_QUESTION_IDS.decision]: decisionId,
    [FREE_AXIS_QUESTION_IDS.recovery]: recoveryId,
    [FREE_AXIS_QUESTION_IDS.distance]: distanceId,
    [FREE_AXIS_QUESTION_IDS.change]: changeId,
    'free.primary_theme': themeId,
  });

  return {
    ok: true,
    value: {
      axes,
      primaryThemeAnswerId: themeId,
      primaryReplyTheme: mapped.value.primaryReplyTheme,
      secondaryReplyTheme: mapped.value.secondaryReplyTheme,
      freeExpressionHash,
    },
  };
}
