-- M55 Account Deletion — clerk webhook ledger (2026-06-08)
-- LOCAL only until Human apply gate. No raw Clerk ID or event body storage.

CREATE TABLE public.clerk_webhook_events (
  svix_id text PRIMARY KEY,
  event_type text NOT NULL,
  deletion_subject_id text NULL,
  status text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  error_code text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  CONSTRAINT clerk_webhook_events_status_check
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  CONSTRAINT clerk_webhook_events_deletion_subject_id_check
    CHECK (
      deletion_subject_id IS NULL
      OR deletion_subject_id ~ '^m55-del:[0-9a-f]{32}$'
    ),
  CONSTRAINT clerk_webhook_events_attempt_count_check
    CHECK (attempt_count >= 0),
  CONSTRAINT clerk_webhook_events_error_code_check
    CHECK (
      error_code IS NULL
      OR error_code IN (
        'INVALID_PROCESSING_STATE',
        'CLEANUP_FAILED',
        'VERIFICATION_FAILED'
      )
    )
);

ALTER TABLE public.clerk_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.clerk_webhook_events FROM PUBLIC;
REVOKE ALL ON TABLE public.clerk_webhook_events FROM anon;
REVOKE ALL ON TABLE public.clerk_webhook_events FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.clerk_webhook_events TO service_role;

COMMENT ON TABLE public.clerk_webhook_events IS
  'Account deletion webhook ledger. Pseudonymous deletion_subject_id only; no raw Clerk ID storage.';
