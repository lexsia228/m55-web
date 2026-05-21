-- ENGINE-IMPL-B3 — additive DDL (shadow: B3-B-R GREEN; Production: B3-C planned, apply via B3-D on m55-soul-core only)
-- Target: public.dtr_report_snapshots
-- Purpose: store v2 composite engine metadata at fulfillment (INSERT-only for new rows)
-- Rollback strategy: application read-path fallback — NULL engine_version => legacy fork
-- Forbidden in this file: UPDATE, DELETE, DROP, NOT NULL, row-level triggers

-- Denormalized engine id for read fork (legacy rows remain NULL)
ALTER TABLE public.dtr_report_snapshots
  ADD COLUMN IF NOT EXISTS engine_context_json jsonb NULL,
  ADD COLUMN IF NOT EXISTS engine_version text NULL;

COMMENT ON COLUMN public.dtr_report_snapshots.engine_context_json IS
  'Immutable composite engine context at purchase (normalizedBirthContext + boundaryMetadata). NULL = legacy row.';

COMMENT ON COLUMN public.dtr_report_snapshots.engine_version IS
  'Denormalized engine version for read fork (e.g. m55-composite-stem-v2). NULL = legacy dtr-v1-jdn-day-stem-provisional fork.';

-- PostgREST schema cache reload after apply (B3-B only)
NOTIFY pgrst, 'reload schema';
