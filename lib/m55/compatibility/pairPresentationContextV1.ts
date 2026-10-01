/**
 * Pair presentation context v1 — external to PairCentralInferenceV1.
 * Presentation-only authority (axis/focus) kept outside central semantic model.
 */

import type { CompatibilityFocusAnswer } from './currentContextContract.v1';
import type { PairAxisId } from './pairReadingTypes';

export const PAIR_PRESENTATION_CONTEXT_VERSION = 'pair_presentation_context_v1' as const;

export type PairPresentationContextV1 = {
  version: typeof PAIR_PRESENTATION_CONTEXT_VERSION;
  pair_axis_id?: PairAxisId;
  focus_id?: CompatibilityFocusAnswer;
};
