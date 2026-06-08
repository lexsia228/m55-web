-- M55 failed_fulfillments user_ref_hash identifiability (2026-06-07)
-- Account deletion lookup lane. No backfill. Existing rows remain NULL.

ALTER TABLE public.failed_fulfillments
  ADD COLUMN IF NOT EXISTS user_ref_hash text NULL;

ALTER TABLE public.failed_fulfillments
  ADD CONSTRAINT failed_fulfillments_user_ref_hash_format_check
  CHECK (
    user_ref_hash IS NULL
    OR user_ref_hash ~ '^[0-9a-f]{16}$'
  );

CREATE INDEX IF NOT EXISTS idx_failed_fulfillments_user_ref_hash
  ON public.failed_fulfillments (user_ref_hash)
  WHERE user_ref_hash IS NOT NULL;

REVOKE SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.failed_fulfillments
  FROM anon, authenticated;
