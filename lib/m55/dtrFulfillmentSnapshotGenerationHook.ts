/**
 * Fulfillment-side hook for Hybrid AI snapshot generation metadata.
 *
 * Connects checkout fulfillment → generationDbPayload → dtr_report_snapshots.
 *
 * Production runtime (this gate):
 * - DTR_HYBRID_AI_FULFILLMENT_RUNTIME_ACTIVATED is hardcoded false.
 * - resolveFulfillmentSnapshotGenerationDbPayload() always returns undefined.
 * - Legacy deterministic fulfillment is unchanged; generation columns stay NULL.
 *
 * Future activation gate will flip the constant and wire provider selection.
 * No env vars, no fetch, no real provider in this module's default path.
 */
import type { EngineContextJson } from './compositeStem/buildV2FulfillmentSnapshot';
import type { PaidDtrIndividualization } from './dtrPaidIndividualization';
import type { HybridAiProvider } from './dtrHybridAiProvider';
import { runHybridAiSnapshotGeneration } from './dtrHybridAiSnapshotGeneration';
import {
  buildDtrSnapshotGenerationDbPayload,
  type DtrSnapshotGenerationDbPayload,
} from './dtrSnapshotGenerationMeta';

/**
 * Hardcoded off until a dedicated activation gate enables Hybrid AI fulfillment.
 * Intentionally not env-driven — avoids accidental production activation.
 */
export const DTR_HYBRID_AI_FULFILLMENT_RUNTIME_ACTIVATED = false;

export function isDtrHybridAiFulfillmentRuntimeActivated(): boolean {
  return DTR_HYBRID_AI_FULFILLMENT_RUNTIME_ACTIVATED;
}

/** Context required when Hybrid AI fulfillment is activated (future gate / tests). */
export type FulfillmentSnapshotGenerationContext = {
  engineContextJson: EngineContextJson;
  fallbackInd: PaidDtrIndividualization;
  provider: HybridAiProvider;
};

/**
 * Run Hybrid AI orchestration and map result to DB-safe generation payload.
 * Used by tests and future activation — not called in production runtime (this gate).
 */
export async function buildHybridFulfillmentGenerationDbPayload(
  ctx: FulfillmentSnapshotGenerationContext,
): Promise<DtrSnapshotGenerationDbPayload> {
  const candidate = await runHybridAiSnapshotGeneration(
    ctx.engineContextJson,
    ctx.fallbackInd,
    ctx.provider,
  );
  return buildDtrSnapshotGenerationDbPayload(candidate.meta);
}

/**
 * Resolve optional generationDbPayload for upsertDtrReportSnapshotAtFulfillment.
 *
 * When runtime is inactive (default): returns undefined immediately — no provider,
 * no engine build, no metadata written. Legacy path preserved.
 *
 * When runtime is active (future gate): requires ctx with engineContext + provider.
 */
export async function resolveFulfillmentSnapshotGenerationDbPayload(
  ctx?: FulfillmentSnapshotGenerationContext,
): Promise<DtrSnapshotGenerationDbPayload | undefined> {
  if (!DTR_HYBRID_AI_FULFILLMENT_RUNTIME_ACTIVATED) {
    return undefined;
  }
  if (!ctx) {
    return undefined;
  }
  return buildHybridFulfillmentGenerationDbPayload(ctx);
}
