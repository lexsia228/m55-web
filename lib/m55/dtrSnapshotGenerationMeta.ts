/**
 * Generation metadata contract for dtr_report_snapshots.
 *
 * Defines DB-safe write payload for generation_mode, quality_passed, generation_meta_json.
 * Allowlist-only builder: prohibited keys (PII, raw prompt/response/body) are rejected.
 * Pure function — no DB, no network, no AI, no process.env.
 */

// ── Generation mode ───────────────────────────────────────────────────────────

export type DtrSnapshotGenerationMode =
  | 'deterministic'
  | 'hybrid_ai'
  | 'hybrid_ai_fallback';

export const VALID_GENERATION_MODES: readonly DtrSnapshotGenerationMode[] = [
  'deterministic',
  'hybrid_ai',
  'hybrid_ai_fallback',
];

export function isValidDtrSnapshotGenerationMode(
  value: unknown,
): value is DtrSnapshotGenerationMode {
  return (
    typeof value === 'string' &&
    (VALID_GENERATION_MODES as readonly string[]).includes(value)
  );
}

// ── DB-safe meta JSON ─────────────────────────────────────────────────────────

/**
 * DB-safe payload for generation_meta_json column.
 * All values are primitives or small arrays — no nested objects, no PII.
 */
export type DtrSnapshotGenerationMetaJson = {
  schemaVersion: '1';
  catalogVersion?: string;
  paidIndVersion?: string;
  promptVersion?: string;
  qualityValidatorVersion?: string;
  materialPackVersion?: string;
  providerKind?: string;
  selectedMode?: DtrSnapshotGenerationMode;
  fallbackReasonCode?: string;
  qualityFailureCodes?: readonly string[];
  retryCount?: number;
  elapsedMs?: number;
  estimatedTokenClass?: string;
  generatedAtIso?: string;
};

/** Complete DB write payload for generation columns (all nullable in schema). */
export type DtrSnapshotGenerationDbPayload = {
  generation_mode: DtrSnapshotGenerationMode;
  quality_passed: boolean;
  generation_meta_json: DtrSnapshotGenerationMetaJson;
};

// ── Prohibited key guard ──────────────────────────────────────────────────────

/**
 * Keys that must never appear in generation_meta_json.
 * Covers: raw prompt/response/body, PII, user data.
 */
export const PROHIBITED_META_KEYS: ReadonlySet<string> = new Set([
  'rawPrompt', 'prompt', 'systemPrompt', 'userPrompt',
  'rawResponse', 'responseText', 'rawBody', 'fullBody', 'body',
  'reportText', 'snapshotBody', 'chapterBody',
  'user_id', 'userId', 'email', 'nickname', 'name',
  'birth_date', 'birthDate', 'dob', 'dateOfBirth',
  'consultationText', 'userInput', 'userMessage',
]);

/**
 * Throw if any prohibited key is present in the input object (shallow check).
 * Call this before building the meta to fail fast.
 */
export function assertNoProhibitedMetaKeys(input: Record<string, unknown>): void {
  for (const key of Object.keys(input)) {
    if (PROHIBITED_META_KEYS.has(key)) {
      throw new Error(`Prohibited key in generation meta: "${key}"`);
    }
  }
}

// ── String / value sanitizers ─────────────────────────────────────────────────

const MAX_STRING_LENGTH = 200;
const MAX_SHORT_STRING = 50;
const MAX_ARRAY_LENGTH = 20;
const MAX_ARRAY_ITEM_LENGTH = 100;

function safeTruncate(s: string, max = MAX_STRING_LENGTH): string {
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

function safeFiniteInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// ── Allowlist builder ─────────────────────────────────────────────────────────

/**
 * Build a DB-safe `generation_meta_json` value from an arbitrary input object.
 *
 * Only allowlisted keys are written. Unknown keys are silently dropped.
 * Prohibited keys throw immediately.
 * All string values are truncated. Nested objects are not stored.
 */
export function buildDtrSnapshotGenerationMetaJson(
  input: Record<string, unknown>,
): DtrSnapshotGenerationMetaJson {
  assertNoProhibitedMetaKeys(input);

  const meta: DtrSnapshotGenerationMetaJson = { schemaVersion: '1' };

  if (typeof input.catalogVersion === 'string') {
    meta.catalogVersion = safeTruncate(input.catalogVersion);
  }
  if (typeof input.paidIndVersion === 'string') {
    meta.paidIndVersion = safeTruncate(input.paidIndVersion, MAX_SHORT_STRING);
  }
  if (typeof input.promptVersion === 'string') {
    meta.promptVersion = safeTruncate(input.promptVersion);
  }
  if (typeof input.qualityValidatorVersion === 'string') {
    meta.qualityValidatorVersion = safeTruncate(input.qualityValidatorVersion);
  }
  if (typeof input.materialPackVersion === 'string') {
    meta.materialPackVersion = safeTruncate(input.materialPackVersion);
  }
  if (typeof input.providerKind === 'string') {
    meta.providerKind = safeTruncate(input.providerKind, MAX_SHORT_STRING);
  }
  if (isValidDtrSnapshotGenerationMode(input.selectedMode)) {
    meta.selectedMode = input.selectedMode;
  }
  if (typeof input.fallbackReasonCode === 'string') {
    meta.fallbackReasonCode = safeTruncate(input.fallbackReasonCode);
  }
  if (Array.isArray(input.qualityFailureCodes)) {
    meta.qualityFailureCodes = (input.qualityFailureCodes as unknown[])
      .slice(0, MAX_ARRAY_LENGTH)
      .map((item) =>
        typeof item === 'string'
          ? safeTruncate(item, MAX_ARRAY_ITEM_LENGTH)
          : safeTruncate(String(item), MAX_ARRAY_ITEM_LENGTH),
      );
  }
  if (typeof input.retryCount === 'number') {
    meta.retryCount = safeFiniteInt(input.retryCount, 0, 100);
  }
  if (typeof input.elapsedMs === 'number') {
    meta.elapsedMs = safeFiniteInt(input.elapsedMs, 0, 600_000);
  }
  if (typeof input.estimatedTokenClass === 'string') {
    meta.estimatedTokenClass = safeTruncate(input.estimatedTokenClass, MAX_SHORT_STRING);
  }
  if (typeof input.generatedAtIso === 'string') {
    meta.generatedAtIso = safeTruncate(input.generatedAtIso, 35);
  }

  return meta;
}

// ── High-level builder (from SnapshotGenerationMeta) ─────────────────────────

/**
 * Map a `SnapshotGenerationMeta` (from dtrHybridAiSnapshotGeneration.ts) to
 * the DB write payload for generation columns.
 *
 * This is the primary entry point for the Hybrid AI orchestration → DB path.
 */
export function buildDtrSnapshotGenerationDbPayload(meta: {
  generationMode: DtrSnapshotGenerationMode;
  qualityPassed: boolean;
  catalogVersion?: string;
  paidIndVersion?: string;
  aiPromptVersion?: string;
  qualityVersion?: string;
  sourceMaterialVersion?: string;
  aiModelProvider?: string;
  aiModelName?: string;
  fallbackReason?: string;
  qualityFailureCodes?: readonly string[];
  retryCount?: number;
  elapsedMs?: number;
  generatedAtIso?: string;
}): DtrSnapshotGenerationDbPayload {
  if (!isValidDtrSnapshotGenerationMode(meta.generationMode)) {
    throw new Error(`Invalid generation mode: "${String(meta.generationMode)}"`);
  }

  // Map SnapshotGenerationMeta fields → allowlist input
  const input: Record<string, unknown> = {};

  if (meta.catalogVersion !== undefined) input.catalogVersion = meta.catalogVersion;
  if (meta.paidIndVersion !== undefined) input.paidIndVersion = meta.paidIndVersion;
  if (meta.aiPromptVersion !== undefined) input.promptVersion = meta.aiPromptVersion;
  if (meta.qualityVersion !== undefined) input.qualityValidatorVersion = meta.qualityVersion;
  if (meta.sourceMaterialVersion !== undefined) input.materialPackVersion = meta.sourceMaterialVersion;
  if (meta.aiModelProvider !== undefined) input.providerKind = meta.aiModelProvider;
  else if (meta.aiModelName !== undefined) input.providerKind = meta.aiModelName;
  input.selectedMode = meta.generationMode;
  if (meta.fallbackReason !== undefined) input.fallbackReasonCode = meta.fallbackReason;
  if (meta.qualityFailureCodes !== undefined) input.qualityFailureCodes = meta.qualityFailureCodes;
  if (meta.retryCount !== undefined) input.retryCount = meta.retryCount;
  if (meta.elapsedMs !== undefined) input.elapsedMs = meta.elapsedMs;
  input.generatedAtIso = meta.generatedAtIso ?? new Date().toISOString();

  const metaJson = buildDtrSnapshotGenerationMetaJson(input);

  return {
    generation_mode: meta.generationMode,
    quality_passed: meta.qualityPassed,
    generation_meta_json: metaJson,
  };
}
