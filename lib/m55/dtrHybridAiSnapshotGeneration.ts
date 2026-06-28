/**
 * Hybrid AI snapshot generation orchestration.
 *
 * Orchestrates: materialPack → prompt → AI provider → quality validation → snapshot candidate.
 * Fail-closed: any failure path returns deterministic fallback.
 *
 * This module is a scaffold for future production integration.
 * In this gate:
 * - No real AI provider is connected.
 * - No DB write occurs.
 * - buildV2FulfillmentSnapshot fulfillment path is unchanged.
 * - Existing snapshot display is unchanged.
 */
import type { EngineContextJson } from './compositeStem/buildV2FulfillmentSnapshot';
import type { PaidDtrIndividualization } from './dtrPaidIndividualization';
import { buildPaidDtrChapterMaterialPack } from './dtrPaidChapterMaterialPack';
import { buildHybridAiPromptPayload, HYBRID_AI_PROMPT_VERSION } from './dtrHybridAiPrompt';
import type { HybridAiProvider, HybridAiProviderOutput } from './dtrHybridAiProvider';
import { validateHybridAiOutput } from './dtrHybridAiQualityValidator';
import type { HybridQualityValidationResult } from './dtrHybridAiQualityValidator';

// ── Snapshot metadata types ───────────────────────────────────────────────────

/**
 * Generation mode recorded in the snapshot.
 * deterministic: v2 or v2.1 corpus, no AI.
 * hybrid_ai: AI generation passed quality check.
 * hybrid_ai_fallback: AI attempted but failed; fell back to deterministic.
 */
export type SnapshotGenerationMode =
  | 'deterministic'
  | 'hybrid_ai'
  | 'hybrid_ai_fallback';

/**
 * Snapshot generation metadata.
 * Intended to be stored alongside the snapshot for audit/analytics.
 * DB schema extension is a separate gate — this type defines the contract only.
 */
export type SnapshotGenerationMeta = {
  paidIndVersion: string;
  catalogVersion: string;
  generationMode: SnapshotGenerationMode;
  aiModelProvider?: string;
  aiModelName?: string;
  aiPromptVersion?: string;
  qualityVersion: string;
  qualityPassed: boolean;
  fallbackReason?: string;
  sourceMaterialVersion: string;
};

// ── Candidate output type ─────────────────────────────────────────────────────

/**
 * The candidate output of the hybrid generation pipeline.
 * ok=true: AI generation passed quality; sections ready for snapshot.
 * ok=false (fallback): deterministic individualization should be used instead.
 *
 * In both cases, meta documents the outcome for analytics.
 */
export type HybridSnapshotCandidate =
  | {
      ok: true;
      mode: 'hybrid_ai';
      sections: HybridAiProviderOutput;
      meta: SnapshotGenerationMeta;
    }
  | {
      ok: false;
      mode: 'hybrid_ai_fallback' | 'deterministic';
      fallbackInd: PaidDtrIndividualization;
      meta: SnapshotGenerationMeta;
      failReason: string;
      qualityResult?: HybridQualityValidationResult;
    };

// ── Quality version constant ──────────────────────────────────────────────────

export const HYBRID_AI_QUALITY_VERSION = 'hybrid-quality-v1-2026-07' as const;

// ── Orchestrator ──────────────────────────────────────────────────────────────

/**
 * Run the hybrid AI snapshot generation pipeline.
 *
 * Steps:
 * 1. Build materialPack from engineContext + deterministic fallback ind.
 * 2. Build prompt payload (pure function).
 * 3. Call provider.generate(payload).
 * 4. Validate AI output with quality validator.
 * 5a. If quality PASS → return hybrid_ai candidate.
 * 5b. If quality FAIL or provider throws → return fallback.
 *
 * Fail-closed in all error paths.
 * No partial/bad snapshot is ever returned as ok=true.
 */
export async function runHybridAiSnapshotGeneration(
  ctx: EngineContextJson,
  fallbackInd: PaidDtrIndividualization,
  provider: HybridAiProvider,
): Promise<HybridSnapshotCandidate> {
  const catalogVersion = fallbackInd.dobPersonalizationCatalogVersion ?? 'dob-v2-2026-06';
  const baseMeta: Omit<SnapshotGenerationMeta, 'generationMode' | 'qualityPassed' | 'fallbackReason'> = {
    paidIndVersion: fallbackInd.version ?? 'v1',
    catalogVersion,
    aiModelProvider: provider.providerId,
    aiPromptVersion: HYBRID_AI_PROMPT_VERSION,
    qualityVersion: HYBRID_AI_QUALITY_VERSION,
    sourceMaterialVersion: catalogVersion,
  };

  // Step 1 + 2: Build materialPack + prompt
  const materialPack = buildPaidDtrChapterMaterialPack(ctx, fallbackInd);
  const promptPayload = buildHybridAiPromptPayload(materialPack, fallbackInd);

  // Step 3: Call provider
  let providerOutput: HybridAiProviderOutput;
  try {
    providerOutput = await provider.generate(promptPayload);
  } catch (e) {
    return {
      ok: false,
      mode: 'hybrid_ai_fallback',
      fallbackInd,
      meta: {
        ...baseMeta,
        generationMode: 'hybrid_ai_fallback',
        qualityPassed: false,
        fallbackReason: `provider_throw: ${String(e)}`,
      },
      failReason: `provider_throw: ${String(e)}`,
    };
  }

  // Step 4: Validate output
  const qualityResult = validateHybridAiOutput(providerOutput);
  if (!qualityResult.pass) {
    return {
      ok: false,
      mode: 'hybrid_ai_fallback',
      fallbackInd,
      meta: {
        ...baseMeta,
        aiModelName: providerOutput.providerMeta?.modelName,
        generationMode: 'hybrid_ai_fallback',
        qualityPassed: false,
        fallbackReason: `quality_fail: ${qualityResult.overallFailCodes.join(',')}`,
      },
      failReason: `quality_fail: ${qualityResult.overallFailCodes.join(',')}`,
      qualityResult,
    };
  }

  // Step 5a: Quality passed — return hybrid_ai candidate
  return {
    ok: true,
    mode: 'hybrid_ai',
    sections: providerOutput,
    meta: {
      ...baseMeta,
      aiModelName: providerOutput.providerMeta?.modelName,
      generationMode: 'hybrid_ai',
      qualityPassed: true,
    },
  };
}

/**
 * Build a deterministic-only snapshot candidate (no AI attempt).
 * Used when AI generation is not yet activated for the current fulfillment path.
 */
export function buildDeterministicSnapshotCandidate(
  fallbackInd: PaidDtrIndividualization,
): HybridSnapshotCandidate {
  const catalogVersion = fallbackInd.dobPersonalizationCatalogVersion ?? 'dob-v2-2026-06';
  return {
    ok: false,
    mode: 'deterministic',
    fallbackInd,
    meta: {
      paidIndVersion: fallbackInd.version ?? 'v1',
      catalogVersion,
      generationMode: 'deterministic',
      qualityVersion: HYBRID_AI_QUALITY_VERSION,
      qualityPassed: true,
      sourceMaterialVersion: catalogVersion,
    },
    failReason: 'deterministic_path_selected',
  };
}
