/**
 * ptrm-v1: free.primary_theme → reply_theme map.
 */

import {
  FREE_PRIMARY_THEME_TO_REPLY,
  isFreePrimaryThemeAnswerId,
  PRIMARY_TO_SECONDARY_REPLY,
} from './answerIdMapsV1';
import type { PrimaryThemeMapResult, Result } from './types';

export function mapPrimaryThemeToReplyThemeV1(
  primaryThemeAnswerId: string,
): Result<PrimaryThemeMapResult> {
  if (!isFreePrimaryThemeAnswerId(primaryThemeAnswerId)) {
    return { ok: false, code: 'unknown_answer_id' };
  }
  const primaryReplyTheme = FREE_PRIMARY_THEME_TO_REPLY[primaryThemeAnswerId];
  return {
    ok: true,
    value: {
      primaryReplyTheme,
      secondaryReplyTheme: PRIMARY_TO_SECONDARY_REPLY[primaryReplyTheme],
    },
  };
}
