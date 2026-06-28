/**
 * M55 Generation Quality Analytics — Privacy-Safe Event Builder
 *
 * Gate: CATEGORY-2-M55-GENERATION-QUALITY-ANALYTICS-LEDGER-IMPLEMENTATION-REV1
 * Design freeze: CATEGORY-2-M55-GENERATION-QUALITY-ANALYTICS-LEDGER-DESIGN-FREEZE-REV1
 *
 * Privacy boundary (enforced by type design):
 *   - No raw body text accepted anywhere in this module.
 *   - No raw user message / consult reply / paid report body.
 *   - No excerpt / text_fragment / sentence_sample / debug_sample / raw_payload.
 *   - No direct user_id / DOB date / payment / session / Stripe / Clerk identifiers.
 *   - No scoped_anon_user_id in initial implementation.
 *
 * Consult reply hard boundary:
 *   - consult_reply generation_kind is present in the type as a valid enum value
 *     for observe-only future use (Priority 3, separate gate).
 *   - No consult reply body field exists anywhere in this module.
 *   - No mutation / rewrite / repair / backfill / regeneration of consult replies.
 *
 * Surfaces covered in this gate (Priority 1 only):
 *   - paid_dtr_chapter_body
 *   - dob_v2_visible_copy
 *   - paid_dtr_snapshot
 *   - naturalness guardrail result metrics
 */

import type { NaturalnessResult } from './dtrVisibleCopyNaturalness';
import type { ChapterBodyJudgeResult } from './dtrPaidChapterBodyJudge';

// ── Enums ──────────────────────────────────────────────────────────────────

export type GenerationKind =
  | 'paid_dtr_chapter_body'
  | 'dob_v2_visible_copy'
  | 'paid_dtr_snapshot'
  | 'consult_reply'   // observe-only; Priority 3 / separate gate
  | 'note_draft';     // Priority 2 / separate gate

export type ContentSurface =
  | 'paid_report'
  | 'consult_reply'
  | 'lp'
  | 'note'
  | 'sns';

export type ProviderId =
  | 'fake_deterministic'
  | 'openai_gpt4o'
  | 'gemini_pro';

export type FinalStatus =
  | 'accepted'
  | 'rejected'
  | 'failed_guardrail'
  | 'failed_provider'
  | 'fallback_used';

// ── Dob-v2 context (bucket flags only; no DOB date) ───────────────────────

export type DobV2Flags = {
  /** e.g. "winter" | "spring" | "summer" | "autumn" */
  season_group: string | null;
  /** e.g. "early" | "mid" | "late" */
  lunar_phase_bucket: string | null;
  birth_time_unknown: boolean;
};

// ── Naturalness metrics (counts only; no text) ────────────────────────────

export type NaturalnessMetrics = {
  naturalness_pass: boolean;
  forbidden_term_hits: number;
  mechanical_phrase_hits: number;
  raw_computation_phrase_hits: number;
  internal_analysis_term_hits: number;
  cold_evaluation_phrase_hits: number;
  system_framing_hits: number;
  duplicate_sentence_count: number;
  /** Guardrail rule names only — not generated text, not user input */
  reject_reason_codes: string[];
};

// ── Text metrics (lengths and counts only; no text) ───────────────────────

export type TextMetrics = {
  output_length: number;
  sentence_count: number;
  avg_sentence_length: number;
  long_sentence_count: number;
};

// ── Quality scores ────────────────────────────────────────────────────────

export type QualityScores = {
  naturalness_score?: number;
  actionability_score?: number;
  lifestyle_language_score?: number;
  personalization_signal_score?: number;
  abstractness_score?: number;
};

// ── Main event type ───────────────────────────────────────────────────────
//
// IMPORTANT: This type intentionally has NO field that accepts raw text.
// Any field that could carry body text / user message / consult content
// is absent from this type by design.

export type GenerationQualityEvent = {
  // Identity
  generation_kind: GenerationKind;
  content_surface: ContentSurface;
  provider_id: ProviderId;
  prompt_version?: string;
  production_sha?: string;
  feature_flag_snapshot?: Record<string, boolean | string | number>;

  // Context (no PII)
  stem_lane_index?: number;
  chapter_id?: string;
  theme_id?: string;         // consult theme ID only; not theme text
  dob_v2_flags?: DobV2Flags;

  // Metrics
  text_metrics?: TextMetrics;
  naturalness?: NaturalnessMetrics;
  quality_scores?: QualityScores;

  // Process
  repair_attempted?: boolean;
  repair_count?: number;
  latency_ms?: number;

  // Verdict
  final_status: FinalStatus;
  reject_reason_codes?: string[];   // enum/catalog keys only; not free text

  user_visible_surface_version?: string;

  // ── Prohibited fields (documented absence) ──
  // raw_body: PROHIBITED
  // raw_user_message: PROHIBITED
  // raw_consult_reply: PROHIBITED
  // raw_paid_report_body: PROHIBITED
  // excerpt: PROHIBITED
  // text_fragment: PROHIBITED
  // sentence_sample: PROHIBITED
  // debug_sample: PROHIBITED
  // raw_payload: PROHIBITED
  // prompt_raw: PROHIBITED
  // response_raw: PROHIBITED
  // user_id: PROHIBITED
  // scoped_anon_user_id: PROHIBITED
  // dob_date: PROHIBITED
  // stripe_customer_id: PROHIBITED
  // stripe_session_id: PROHIBITED
  // payment_session_id: PROHIBITED
  // clerk_user_id: PROHIBITED
};

// ── Naturalness metrics extractor ─────────────────────────────────────────

/**
 * Convert a NaturalnessResult into privacy-safe NaturalnessMetrics.
 * Only counts and rule names are preserved — no match text from generated body.
 *
 * violation_key (rule name) is from the fixed catalog in dtrVisibleCopyNaturalness.ts:
 *   forbidden_internal_term | forbidden_mechanical_phrase | raw_computation_disclosure |
 *   forbidden_observation_term | forbidden_system_framing | forbidden_cold_evaluation |
 *   repeated_sentence_nearby
 * These are catalog keys, not generated body text.
 */
export function extractNaturalnessMetrics(result: NaturalnessResult): NaturalnessMetrics {
  const violations = result.violations;
  const ruleCount = (rule: string) =>
    violations.filter(v => v.rule === rule).length;

  return {
    naturalness_pass: result.pass,
    forbidden_term_hits:           ruleCount('forbidden_internal_term'),
    mechanical_phrase_hits:        ruleCount('forbidden_mechanical_phrase'),
    raw_computation_phrase_hits:   ruleCount('raw_computation_disclosure'),
    internal_analysis_term_hits:   ruleCount('forbidden_observation_term'),
    cold_evaluation_phrase_hits:   ruleCount('forbidden_cold_evaluation'),
    system_framing_hits:           ruleCount('forbidden_system_framing'),
    duplicate_sentence_count:      ruleCount('repeated_sentence_nearby'),
    // rule names only — the .match field (catalog key) is not included
    reject_reason_codes: [...new Set(violations.map(v => v.rule))],
  };
}

// ── Text metrics extractor ────────────────────────────────────────────────

/**
 * Derive text quality metrics from a body string.
 * The body text itself is NOT stored — only the derived counts.
 */
export function extractTextMetrics(body: string): TextMetrics {
  const sentences = body
    .split(/(?<=。)|\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  const lengths = sentences.map(s => s.length);
  const avg = lengths.length > 0
    ? lengths.reduce((a, b) => a + b, 0) / lengths.length
    : 0;
  return {
    output_length:      body.length,
    sentence_count:     sentences.length,
    avg_sentence_length: Math.round(avg * 100) / 100,
    long_sentence_count: sentences.filter(s => s.length > 60).length,
  };
}

// ── Judge result → reject reason codes ───────────────────────────────────

/**
 * Extract reject reason codes (ChapterBodyCheckId enum values) from a judge result.
 * Returns an array of check IDs — these are fixed enum values, not free text.
 */
export function extractJudgeReasonCodes(judgeResult: ChapterBodyJudgeResult): string[] {
  const codes = new Set<string>();
  for (const section of judgeResult.sections) {
    for (const fc of section.failedChecks) {
      codes.add(fc.check);
    }
  }
  return [...codes];
}

// ── Event builders ────────────────────────────────────────────────────────

/**
 * Build an analytics event for a paid_dtr_chapter_body generation.
 * Priority 1 surface.
 *
 * @param body - Generated body text (used only for metric extraction; NOT stored)
 * @param opts - All context parameters (no raw text fields accepted in type)
 */
export function buildPaidDtrChapterBodyEvent(
  body: string,
  naturalnessResult: NaturalnessResult,
  judgeResult: ChapterBodyJudgeResult,
  opts: {
    provider_id: ProviderId;
    prompt_version?: string;
    production_sha?: string;
    stem_lane_index?: number;
    chapter_id?: string;
    dob_v2_flags?: DobV2Flags;
    repair_attempted?: boolean;
    repair_count?: number;
    latency_ms?: number;
    final_status: FinalStatus;
    feature_flag_snapshot?: Record<string, boolean | string | number>;
    user_visible_surface_version?: string;
  },
): GenerationQualityEvent {
  return {
    generation_kind: 'paid_dtr_chapter_body',
    content_surface: 'paid_report',
    provider_id: opts.provider_id,
    prompt_version: opts.prompt_version,
    production_sha: opts.production_sha,
    feature_flag_snapshot: opts.feature_flag_snapshot,
    stem_lane_index: opts.stem_lane_index,
    chapter_id: opts.chapter_id,
    dob_v2_flags: opts.dob_v2_flags,
    text_metrics: extractTextMetrics(body),
    naturalness: extractNaturalnessMetrics(naturalnessResult),
    repair_attempted: opts.repair_attempted,
    repair_count: opts.repair_count,
    latency_ms: opts.latency_ms,
    final_status: opts.final_status,
    reject_reason_codes: judgeResult.verdict !== 'PASS'
      ? extractJudgeReasonCodes(judgeResult)
      : undefined,
    user_visible_surface_version: opts.user_visible_surface_version,
  };
  // body is NOT assigned to any field — only metrics derived from it are stored
}

/**
 * Build an analytics event for a dob_v2_visible_copy generation.
 * Priority 1 surface.
 */
export function buildDobV2VisibleCopyEvent(
  body: string,
  naturalnessResult: NaturalnessResult,
  opts: {
    provider_id: ProviderId;
    prompt_version?: string;
    production_sha?: string;
    stem_lane_index?: number;
    chapter_id?: string;
    dob_v2_flags?: DobV2Flags;
    latency_ms?: number;
    final_status: FinalStatus;
    feature_flag_snapshot?: Record<string, boolean | string | number>;
    user_visible_surface_version?: string;
  },
): GenerationQualityEvent {
  return {
    generation_kind: 'dob_v2_visible_copy',
    content_surface: 'paid_report',
    provider_id: opts.provider_id,
    prompt_version: opts.prompt_version,
    production_sha: opts.production_sha,
    feature_flag_snapshot: opts.feature_flag_snapshot,
    stem_lane_index: opts.stem_lane_index,
    chapter_id: opts.chapter_id,
    dob_v2_flags: opts.dob_v2_flags,
    text_metrics: extractTextMetrics(body),
    naturalness: extractNaturalnessMetrics(naturalnessResult),
    latency_ms: opts.latency_ms,
    final_status: opts.final_status,
    user_visible_surface_version: opts.user_visible_surface_version,
  };
}

/**
 * Build an analytics event for a paid_dtr_snapshot save path.
 * Priority 1 surface.
 * Called before snapshot is persisted; body text is NOT stored.
 */
export function buildPaidDtrSnapshotEvent(
  bodyForMetrics: string,
  naturalnessResult: NaturalnessResult,
  opts: {
    provider_id: ProviderId;
    prompt_version?: string;
    production_sha?: string;
    stem_lane_index?: number;
    dob_v2_flags?: DobV2Flags;
    latency_ms?: number;
    final_status: FinalStatus;
    reject_reason_codes?: string[];
    feature_flag_snapshot?: Record<string, boolean | string | number>;
    user_visible_surface_version?: string;
  },
): GenerationQualityEvent {
  return {
    generation_kind: 'paid_dtr_snapshot',
    content_surface: 'paid_report',
    provider_id: opts.provider_id,
    prompt_version: opts.prompt_version,
    production_sha: opts.production_sha,
    feature_flag_snapshot: opts.feature_flag_snapshot,
    stem_lane_index: opts.stem_lane_index,
    dob_v2_flags: opts.dob_v2_flags,
    text_metrics: extractTextMetrics(bodyForMetrics),
    naturalness: extractNaturalnessMetrics(naturalnessResult),
    latency_ms: opts.latency_ms,
    final_status: opts.final_status,
    reject_reason_codes: opts.reject_reason_codes,
    user_visible_surface_version: opts.user_visible_surface_version,
  };
}

// ── Emit (fire-and-forget; does not block main flow) ─────────────────────

/**
 * Emit a quality analytics event.
 *
 * In the initial implementation this logs to console (no DB write performed).
 * A real DB writer (service_role Supabase insert) will be wired in a separate
 * implementation sub-gate after DB migration is applied.
 *
 * Design contract:
 *   - MUST NOT throw or reject in a way that blocks the calling production path.
 *   - MUST NOT accept raw body text (enforced by the event type).
 *   - MUST NOT perform DB operations until migration is applied.
 */
export function emitGenerationQualityEvent(event: GenerationQualityEvent): void {
  try {
    // Placeholder: replace with Supabase service_role insert after migration apply gate.
    console.info('[m55/generationQualityAnalytics]', JSON.stringify({
      generation_kind: event.generation_kind,
      content_surface: event.content_surface,
      provider_id:     event.provider_id,
      final_status:    event.final_status,
      naturalness_pass: event.naturalness?.naturalness_pass,
      output_length:   event.text_metrics?.output_length,
      stem_lane_index: event.stem_lane_index,
      chapter_id:      event.chapter_id,
    }));
  } catch {
    // Intentionally swallowed: analytics must never break production flow.
  }
}
