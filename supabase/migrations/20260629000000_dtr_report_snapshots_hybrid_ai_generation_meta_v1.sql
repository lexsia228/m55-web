-- HYBRID-AI-DB-SCHEMA-REV1 — dtr_report_snapshots hybrid AI generation metadata columns
-- Gate: CATEGORY-2-M55-PAID-DTR-HYBRID-AI-DB-SCHEMA-REV1
--
-- Purpose:
--   Store SnapshotGenerationMeta alongside each saved DTR report snapshot.
--   Enables audit, analytics, and future routing based on how the snapshot
--   body was produced (deterministic / hybrid_ai / hybrid_ai_fallback).
--
-- Design principles:
--   - All new columns are NULL (existing rows remain untouched).
--   - No backfill, no UPDATE, no NOT NULL, no DROP, no trigger changes.
--   - Fully backward-compatible: INSERT paths that omit these columns continue to work.
--   - generation_mode / quality_passed are columns for analytics query access.
--   - Provider / model / version details live in generation_meta_json (future-extensible).
--   - paidIndVersion and catalogVersion are already captured in engine_context_json;
--     not duplicated here.
--   - Access: service_role only (same as all other dtr_report_snapshots access).
--     No RLS change needed (table has no client-facing policy).
--
-- Rollback: DROP COLUMN IF EXISTS (non-destructive; existing data unaffected).
-- Apply via: Human GO gate only. Do not auto-apply.
-- Forbidden in this file: UPDATE, DELETE, TRUNCATE, NOT NULL, backfill, RPC, trigger.

-- ── 1. generation_mode — discriminant for analytics and future routing ────────

ALTER TABLE public.dtr_report_snapshots
  ADD COLUMN IF NOT EXISTS generation_mode text NULL;

ALTER TABLE public.dtr_report_snapshots
  DROP CONSTRAINT IF EXISTS dtr_report_snapshots_generation_mode_check;

ALTER TABLE public.dtr_report_snapshots
  ADD CONSTRAINT dtr_report_snapshots_generation_mode_check
    CHECK (
      generation_mode IS NULL
      OR generation_mode IN ('deterministic', 'hybrid_ai', 'hybrid_ai_fallback')
    );

COMMENT ON COLUMN public.dtr_report_snapshots.generation_mode IS
  'How the report body was produced: deterministic | hybrid_ai | hybrid_ai_fallback. NULL = pre-hybrid rows (deterministic assumed).';

-- ── 2. quality_passed — quick filter for AI quality verdict ──────────────────

ALTER TABLE public.dtr_report_snapshots
  ADD COLUMN IF NOT EXISTS quality_passed boolean NULL;

COMMENT ON COLUMN public.dtr_report_snapshots.quality_passed IS
  'True = AI quality validator passed. False = rejected / fallback used. NULL = deterministic (no AI gate applied).';

-- ── 3. generation_meta_json — extensible provider / version / reason bag ─────
--
-- Stores:
--   ai_model_provider   text   e.g. "openai" | "gemini" | "mock" | null
--   ai_model_name       text   e.g. "gpt-4o" | "gemini-1.5-pro" | null
--   ai_prompt_version   text   e.g. "hybrid-prompt-v1-2026-07"
--   quality_version     text   e.g. "hybrid-quality-v1-2026-07"
--   fallback_reason     text   e.g. "provider_throw: ..." | "quality_fail: ..."
--   source_material_version  text  e.g. "dob-v2.1-2026-07"
--   quality_fail_codes  text[] validator fail codes (no free text / body excerpt)
--   tokens_used         int    approximate token count if available
--
-- Intentionally NOT stored (privacy boundary):
--   - raw body text / excerpt / text_fragment
--   - raw prompt or response
--   - user_id / dob / PII

ALTER TABLE public.dtr_report_snapshots
  ADD COLUMN IF NOT EXISTS generation_meta_json jsonb NULL;

COMMENT ON COLUMN public.dtr_report_snapshots.generation_meta_json IS
  'Hybrid AI generation metadata bag: provider, model, prompt_version, quality_version, fallback_reason, source_material_version. No PII, no raw body.';

-- ── 4. Index for analytics queries ───────────────────────────────────────────
--
-- Sparse index: only rows where generation_mode IS NOT NULL (i.e. AI-era rows).
-- Does not affect legacy deterministic-only rows.

CREATE INDEX IF NOT EXISTS idx_dtr_report_snapshots_generation_mode
  ON public.dtr_report_snapshots (generation_mode)
  WHERE (generation_mode IS NOT NULL);

-- ── 5. PostgREST schema cache reload ─────────────────────────────────────────

NOTIFY pgrst, 'reload schema';
