'use server';

import type {
  CompatibilityGuestInput,
  CompatibilityGuestResultOutcome,
} from '../../lib/m55/compatibility/pairReadingGuestContract';
import { buildCompatibilityPublicResult } from '../../lib/m55/compatibility/pairReadingGuestResult';
import {
  isCompleteCompatibilityCurrentContextV2,
  type CompatibilityCurrentContextAnswersV2,
} from '../../lib/m55/compatibility/currentContextContract.v2';
import type { RelationStatusId } from '../../lib/m55/compatibility/pairReadingTypes';
import { isValidCompatibilityRelationStatusId } from '../../lib/m55/compatibility/pairReadingGuestContract';

export async function buildGuestCompatibilityResult(
  input: CompatibilityGuestInput,
  relationStatusId: RelationStatusId,
  currentContext: CompatibilityCurrentContextAnswersV2,
): Promise<CompatibilityGuestResultOutcome> {
  if (!isValidCompatibilityRelationStatusId(relationStatusId)) {
    return { ok: false, message: '関係の段階を選んでください。' };
  }
  if (!isCompleteCompatibilityCurrentContextV2(currentContext, relationStatusId)) {
    return { ok: false, message: '現在の二人について、必要な回答を確認してください。' };
  }
  return buildCompatibilityPublicResult(input, relationStatusId, currentContext);
}
