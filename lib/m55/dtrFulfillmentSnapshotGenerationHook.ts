/**
 * Fulfillment-side hook for Hybrid AI snapshot generation.
 *
 * Connects checkout fulfillment → generatedChapterBodies + generationDbPayload
 * → dtr_report_snapshots, with body/metadata consistency enforced.
 *
 * Default (env unset): inactive — no provider call, no metadata, legacy deterministic path.
 * Activation: DTR_HYBRID_AI_ENABLED=preview|production (set in a later gate; not configured here).
 *
 * No real AI provider, no fetch, no DB writes in this module.
 *
 * resolveRealDtrHybridAiProvider() is defined here for wiring in a later gate.
 * It reads DTR_HYBRID_AI_PROVIDER / DTR_HYBRID_AI_MODEL from env at call time.
 * It does NOT activate the runtime — only isDtrHybridAiFulfillmentEnabled() controls that.
 */
import type { EngineContextJson } from './compositeStem/buildV2FulfillmentSnapshot';
import type { PaidDtrIndividualization } from './dtrPaidIndividualization';
import type { PaidDtrGeneratedChapterBodies } from './dtrEngine';
import {
  createMockHybridAiProvider,
  type HybridAiProvider,
} from './dtrHybridAiProvider';
import { createOpenAiHybridAiProvider } from './dtrOpenAiHybridAiProvider';
import { runHybridAiSnapshotGeneration } from './dtrHybridAiSnapshotGeneration';
import {
  buildDtrSnapshotGenerationDbPayload,
  type DtrSnapshotGenerationDbPayload,
} from './dtrSnapshotGenerationMeta';

/** Env var name for Hybrid AI fulfillment activation (Preview/Production set in later gates). */
export const DTR_HYBRID_AI_ENABLED_ENV = 'DTR_HYBRID_AI_ENABLED' as const;

/**
 * @deprecated Use isDtrHybridAiFulfillmentEnabled() — env-driven guard replaces hardcoded flag.
 * Kept false for backward-compatible source assertions during transition.
 */
export const DTR_HYBRID_AI_FULFILLMENT_RUNTIME_ACTIVATED = false;

/**
 * Returns true only when DTR_HYBRID_AI_ENABLED is exactly `preview` or `production`.
 * Unset, blank, or unknown values → false (fail-closed legacy path).
 */
export function isDtrHybridAiFulfillmentEnabled(): boolean {
  const val = (process.env[DTR_HYBRID_AI_ENABLED_ENV] ?? '').trim().toLowerCase();
  return val === 'preview' || val === 'production';
}

/** @deprecated Use isDtrHybridAiFulfillmentEnabled() */
export function isDtrHybridAiFulfillmentRuntimeActivated(): boolean {
  return isDtrHybridAiFulfillmentEnabled();
}

/** Context required to run Hybrid AI orchestration at fulfillment time. */
export type FulfillmentSnapshotGenerationContext = {
  engineContextJson: EngineContextJson;
  fallbackInd: PaidDtrIndividualization;
  provider: HybridAiProvider;
};

/**
 * Resolution contract: metadata and saved chapter bodies must stay consistent.
 * - hybrid success: both generationDbPayload (hybrid_ai) and generatedChapterBodies
 * - hybrid fallback: generationDbPayload (hybrid_ai_fallback) only — deterministic body
 * - inactive: empty resolution — legacy deterministic, NULL generation columns
 */
export type FulfillmentSnapshotGenerationResolution = {
  generationDbPayload?: DtrSnapshotGenerationDbPayload;
  generatedChapterBodies?: PaidDtrGeneratedChapterBodies;
};

/** Mock/noop provider for local tests and pre-real-provider activation gates. */
export function resolveMockDtrHybridAiProvider(): HybridAiProvider {
  return createMockHybridAiProvider();
}

/**
 * Resolve the real AI provider from env at call time.
 * Reads DTR_HYBRID_AI_PROVIDER (default: 'openai') and DTR_HYBRID_AI_MODEL (default: 'gpt-4.1-mini').
 * Does NOT activate the fulfillment runtime — isDtrHybridAiFulfillmentEnabled() controls that.
 * OPENAI_API_KEY is read lazily inside the provider's generate() call, not here.
 * For wiring in a later gate when DTR_HYBRID_AI_ENABLED=preview|production.
 */
export function resolveRealDtrHybridAiProvider(): HybridAiProvider {
  const providerName = (process.env['DTR_HYBRID_AI_PROVIDER'] ?? 'openai').trim().toLowerCase();
  const modelName = (process.env['DTR_HYBRID_AI_MODEL'] ?? 'gpt-4.1-mini').trim();

  if (providerName === 'openai') {
    return createOpenAiHybridAiProvider({ model: modelName });
  }

  // Unknown provider name: fall back to mock (safe; env guard controls actual activation)
  return createMockHybridAiProvider();
}

function mapHybridSectionsToGeneratedBodies(
  sections: {
    s1_identity: string;
    s2_composition: string;
    s3_essence: string;
    s4_strengths: string;
  },
): PaidDtrGeneratedChapterBodies {
  return {
    s1_identity: sections.s1_identity,
    s2_composition: sections.s2_composition,
    s3_essence: sections.s3_essence,
    s4_strengths: sections.s4_strengths,
  };
}

/**
 * Run Hybrid AI orchestration and return body + metadata resolution.
 * Does not check env — for tests and explicit activation paths only.
 */
export async function buildFulfillmentSnapshotGenerationResolution(
  ctx: FulfillmentSnapshotGenerationContext,
): Promise<FulfillmentSnapshotGenerationResolution> {
  const candidate = await runHybridAiSnapshotGeneration(
    ctx.engineContextJson,
    ctx.fallbackInd,
    ctx.provider,
  );
  const generationDbPayload = buildDtrSnapshotGenerationDbPayload(candidate.meta);

  if (candidate.ok) {
    return {
      generationDbPayload,
      generatedChapterBodies: mapHybridSectionsToGeneratedBodies(candidate.sections),
    };
  }

  // Fallback: metadata documents AI attempt; body stays deterministic (no generatedChapterBodies).
  return { generationDbPayload };
}

/**
 * Env-gated resolver for upsertDtrReportSnapshotAtFulfillment.
 * Returns {} when inactive — no provider call, no metadata, legacy path.
 */
export async function resolveFulfillmentSnapshotGenerationResolution(
  ctx: FulfillmentSnapshotGenerationContext,
): Promise<FulfillmentSnapshotGenerationResolution> {
  if (!isDtrHybridAiFulfillmentEnabled()) {
    return {};
  }
  return buildFulfillmentSnapshotGenerationResolution(ctx);
}

/**
 * @deprecated Use buildFulfillmentSnapshotGenerationResolution — metadata-only helper.
 * Returns DB payload without generatedChapterBodies (may be inconsistent for hybrid success).
 */
export async function buildHybridFulfillmentGenerationDbPayload(
  ctx: FulfillmentSnapshotGenerationContext,
): Promise<DtrSnapshotGenerationDbPayload> {
  const resolution = await buildFulfillmentSnapshotGenerationResolution(ctx);
  if (!resolution.generationDbPayload) {
    throw new Error('buildHybridFulfillmentGenerationDbPayload: resolution missing generationDbPayload');
  }
  return resolution.generationDbPayload;
}

/**
 * @deprecated Use resolveFulfillmentSnapshotGenerationResolution.
 */
export async function resolveFulfillmentSnapshotGenerationDbPayload(
  ctx?: FulfillmentSnapshotGenerationContext,
): Promise<DtrSnapshotGenerationDbPayload | undefined> {
  if (!ctx) {
    return undefined;
  }
  const resolution = await resolveFulfillmentSnapshotGenerationResolution(ctx);
  return resolution.generationDbPayload;
}
