'use server';

import type {
  CompatibilityGuestInput,
  CompatibilityGuestResultOutcome,
} from '../../lib/m55/compatibility/pairReadingGuestContract';
import { buildCompatibilityPublicResult } from '../../lib/m55/compatibility/pairReadingGuestResult';

export async function buildGuestCompatibilityResult(
  input: CompatibilityGuestInput,
): Promise<CompatibilityGuestResultOutcome> {
  return buildCompatibilityPublicResult(input);
}
