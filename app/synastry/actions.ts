'use server';

import type {
  CompatibilityGuestInput,
  CompatibilityGuestResultOutcome,
} from '../../lib/m55/compatibility/pairReadingGuestContract';
import { buildCompatibilityPublicResult } from '../../lib/m55/compatibility/pairReadingGuestResult';
import {
  isCompleteCompatibilityCurrentContext,
  type CompatibilityCurrentContextAnswers,
} from '../../lib/m55/compatibility/currentContextContract.v1';

export async function buildGuestCompatibilityResult(
  input: CompatibilityGuestInput,
  currentContext: CompatibilityCurrentContextAnswers,
): Promise<CompatibilityGuestResultOutcome> {
  if (!isCompleteCompatibilityCurrentContext(currentContext)) {
    return { ok: false, message: '現在の二人について、6つの回答を確認してください。' };
  }
  return buildCompatibilityPublicResult(input, undefined, currentContext);
}
