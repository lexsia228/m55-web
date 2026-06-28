-- M55 Generation Quality Analytics Ledger v1
-- Gate: CATEGORY-2-M55-GENERATION-QUALITY-ANALYTICS-LEDGER-IMPLEMENTATION-REV1
-- Design freeze: CATEGORY-2-M55-GENERATION-QUALITY-ANALYTICS-LEDGER-DESIGN-FREEZE-REV1 (GREEN)
-- Production apply: separate Human GO gate (do not auto-apply)
--
-- Privacy boundary (enforced by column selection):
--   NO raw_body / raw_user_message / raw_consult_reply / raw_paid_report_body
--   NO excerpt / text_fragment / sentence_sample / debug_sample / raw_payload
--   NO prompt_raw / response_raw
--   NO user_id / clerk_user_id / scoped_anon_user_id
--   NO dob_date
--   NO stripe_customer_id / stripe_session_id / payment_session_id / clerk_id
--
-- Consult reply boundary:
--   consult_reply as generation_kind is observe-only.
--   No consult reply body is stored in any column.
--   No mutation / rewrite / repair / backfill / regeneration of consult replies.
--
-- RLS: service_role only write. service_role/admin only read.
--      anon/authenticated have NO access to any of these tables.


-- ────────────────────────────────────────────────────────────────────────────
-- 1. m55_generation_quality_events
--    Raw event rows. Retention: 90 days (scheduled job / pg_cron).
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.m55_generation_quality_events (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                    timestamptz NOT NULL DEFAULT now(),

  -- Identity (no PII)
  generation_kind               text NOT NULL,   -- paid_dtr_chapter_body | dob_v2_visible_copy | paid_dtr_snapshot | consult_reply | note_draft
  content_surface               text NOT NULL,   -- paid_report | consult_reply | lp | note | sns
  provider_id                   text NOT NULL,   -- fake_deterministic | openai_gpt4o | gemini_pro
  prompt_version                text,
  production_sha                text,
  feature_flag_snapshot         jsonb,           -- e.g. { "chapter_body_gen": false }

  -- Context (no PII)
  stem_lane_index               smallint,        -- 0–9 (trait index)
  chapter_id                    text,            -- s1_identity | s2_composition | s3_essence | s4_strengths
  theme_id                      text,            -- consult theme ID only (not theme content)
  dob_v2_flags                  jsonb,           -- { lunar_phase_bucket, season_group, birth_time_unknown }

  -- Quantitative metrics
  output_length                 integer,
  sentence_count                integer,
  avg_sentence_length           numeric(6,2),
  long_sentence_count           integer,         -- sentences > 60 chars
  duplicate_sentence_count      integer,

  -- Naturalness Guardrail results
  naturalness_pass              boolean,
  forbidden_term_hits           integer,
  mechanical_phrase_hits        integer,
  raw_computation_phrase_hits   integer,
  internal_analysis_term_hits   integer,
  cold_evaluation_phrase_hits   integer,
  system_framing_hits           integer,

  -- Quality scores (0.0–1.0)
  naturalness_score             numeric(4,3),
  actionability_score           numeric(4,3),
  lifestyle_language_score      numeric(4,3),
  personalization_signal_score  numeric(4,3),
  abstractness_score            numeric(4,3),

  -- Process
  repair_attempted              boolean,
  repair_count                  integer,
  latency_ms                    integer,

  -- Verdict
  final_status                  text NOT NULL,   -- accepted | rejected | failed_guardrail | failed_provider | fallback_used
  reject_reason_codes           text[],          -- ChapterBodyCheckId enum values only (no free text)

  user_visible_surface_version  text

  -- Explicitly excluded (documented prohibition):
  -- scoped_anon_user_id        EXCLUDED (no user-level tracking in initial implementation)
  -- raw_body                   EXCLUDED (privacy boundary)
  -- raw_user_message           EXCLUDED (privacy boundary)
  -- raw_consult_reply          EXCLUDED (privacy boundary)
  -- raw_paid_report_body       EXCLUDED (privacy boundary)
  -- excerpt                    EXCLUDED (privacy boundary)
  -- text_fragment              EXCLUDED (privacy boundary)
  -- sentence_sample            EXCLUDED (privacy boundary)
  -- debug_sample               EXCLUDED (privacy boundary)
  -- raw_payload                EXCLUDED (privacy boundary)
  -- prompt_raw                 EXCLUDED (privacy boundary)
  -- response_raw               EXCLUDED (privacy boundary)
  -- user_id                    EXCLUDED (privacy boundary)
  -- clerk_user_id              EXCLUDED (privacy boundary)
  -- dob_date                   EXCLUDED (privacy boundary)
  -- stripe_customer_id         EXCLUDED (privacy boundary)
  -- stripe_session_id          EXCLUDED (privacy boundary)
  -- payment_session_id         EXCLUDED (privacy boundary)
);

ALTER TABLE public.m55_generation_quality_events ENABLE ROW LEVEL SECURITY;

-- No policies: service_role bypasses RLS. anon/authenticated have no grants.
-- Explicit deny-all for non-service roles (belt-and-suspenders):
REVOKE ALL ON public.m55_generation_quality_events FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_m55_gqe_kind_created
  ON public.m55_generation_quality_events (generation_kind, created_at);

CREATE INDEX IF NOT EXISTS idx_m55_gqe_status_created
  ON public.m55_generation_quality_events (final_status, created_at);

CREATE INDEX IF NOT EXISTS idx_m55_gqe_prompt_kind
  ON public.m55_generation_quality_events (prompt_version, generation_kind);

CREATE INDEX IF NOT EXISTS idx_m55_gqe_stem_chapter
  ON public.m55_generation_quality_events (stem_lane_index, chapter_id);


-- ────────────────────────────────────────────────────────────────────────────
-- 2. m55_generation_quality_daily_rollups
--    Aggregated daily metrics. Retention: 1 year.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.m55_generation_quality_daily_rollups (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rollup_date             date NOT NULL,
  generation_kind         text NOT NULL,
  provider_id             text NOT NULL,
  prompt_version          text,
  stem_lane_index         smallint,
  chapter_id              text,

  event_count             integer,
  accepted_count          integer,
  rejected_count          integer,
  failed_guardrail_count  integer,
  fallback_count          integer,
  repair_attempted_count  integer,

  avg_naturalness_score   numeric(4,3),
  avg_actionability_score numeric(4,3),
  avg_output_length       numeric(8,1),

  top_reject_reason_codes jsonb,   -- { "reason_code": count, ... }

  UNIQUE (rollup_date, generation_kind, provider_id, prompt_version, stem_lane_index, chapter_id)
);

ALTER TABLE public.m55_generation_quality_daily_rollups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.m55_generation_quality_daily_rollups FROM anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_m55_gqdr_date_kind
  ON public.m55_generation_quality_daily_rollups (rollup_date, generation_kind);


-- ────────────────────────────────────────────────────────────────────────────
-- 3. m55_guardrail_violation_catalog
--    Violation pattern tracking. Long-term retention (catalog keys only).
--    violation_match: MUST be a fixed catalog key from dtrVisibleCopyNaturalness.ts.
--    MUST NOT store generated body text, user input, or consult reply content.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.m55_guardrail_violation_catalog (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_seen_at    timestamptz NOT NULL,
  last_seen_at     timestamptz NOT NULL,
  violation_rule   text NOT NULL,   -- forbidden_internal_term | forbidden_mechanical_phrase | etc.
  violation_key    text NOT NULL,   -- fixed catalog key ONLY (e.g. "読み取りです。")
                                    -- MUST be from FORBIDDEN_* arrays in dtrVisibleCopyNaturalness.ts
                                    -- MUST NOT be generated body text / user input / consult content
  hit_count        integer NOT NULL DEFAULT 1,
  generation_kind  text,
  chapter_id       text,

  -- violation_match is renamed to violation_key to enforce catalog-key-only semantics.
  -- Free-text matches from generated/user/consult content are prohibited.

  UNIQUE (violation_rule, violation_key, generation_kind, chapter_id)
);

ALTER TABLE public.m55_guardrail_violation_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.m55_guardrail_violation_catalog FROM anon, authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. m55_prompt_version_quality_rollups
--    Per-prompt-version quality tracking. Long-term retention.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.m55_prompt_version_quality_rollups (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version           text NOT NULL,
  generation_kind          text NOT NULL,
  provider_id              text NOT NULL,
  rollup_window_start      timestamptz,
  rollup_window_end        timestamptz,
  event_count              integer,
  naturalness_pass_rate    numeric(5,4),
  avg_naturalness_score    numeric(4,3),
  repair_rate              numeric(5,4),
  fallback_rate            numeric(5,4),
  top_fail_reasons         jsonb,   -- { "reason_code": count, ... }

  UNIQUE (prompt_version, generation_kind, provider_id)
);

ALTER TABLE public.m55_prompt_version_quality_rollups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.m55_prompt_version_quality_rollups FROM anon, authenticated;
