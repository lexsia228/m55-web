/**
 * Per-mount premium_lp_viewed emit plan.
 * Local Strict Mode dedupe only — must NOT use a process-global impression key.
 */

import type { M55FunnelPayloadExtras } from '../privacySafeFunnelAnalytics';

export type PremiumLpViewedEmitPlan =
  | { shouldEmit: false }
  | { shouldEmit: true; extras?: Pick<M55FunnelPayloadExtras, 'entrySource'> };

/**
 * Decide whether this LP mount should emit premium_lp_viewed.
 * Consumes the Free marker only when this mount will emit.
 */
export function planPremiumLpViewedEmit(args: {
  alreadyEmittedThisMount: boolean;
  consumeFreeMarker: () => boolean;
}): PremiumLpViewedEmitPlan {
  if (args.alreadyEmittedThisMount) {
    return { shouldEmit: false };
  }
  const fromFree = args.consumeFreeMarker();
  return {
    shouldEmit: true,
    extras: fromFree ? { entrySource: 'free_result' } : undefined,
  };
}
