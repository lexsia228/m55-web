-- M55 Shadow-only one-time fulfillment contract repair
-- Date: 2026-05-11
BEGIN;
-- fulfilled_at 列の不足を解消 [cite: 46]
ALTER TABLE public.one_time_fulfillments ADD COLUMN IF NOT EXISTS fulfilled_at timestamptz DEFAULT now();
-- 失敗ログ用の列を補強 [cite: 50]
ALTER TABLE public.failed_fulfillments ADD COLUMN IF NOT EXISTS event_id text, ADD COLUMN IF NOT EXISTS failure_reason text, ADD COLUMN IF NOT EXISTS raw_metadata jsonb;
COMMIT;
NOTIFY pgrst, 'reload schema';
