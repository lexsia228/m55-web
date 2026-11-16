-- M55 Pair P5-1 dedicated target-binding receipt one-use consumption ledger (draft; NOT applied by Cursor gate).
-- Version 20261008200000 sorts after R7 D5 20261008000000 and before frozen P5-1 20261009000000.
-- Human Preview pre-apply: run PAIR_P5_LEDGER_PREVIEW_PRE_APPLY_CLASSIFIER_SQL in SQL Editor (SELECT only).
--   ABSENT          => normal pre-apply candidate; apply THIS migration once under Human GO.
--   PRESENT_EXACT   => do NOT re-run CREATE; verify privileges/RLS policy only.
--   PRESENT_MISMATCH=> STOP; do not apply P5-1 or ledger until drift is resolved.

CREATE TABLE public.m55_pair_p5_dedicated_receipt_consumption_v1 (
  receipt_identifier_sha256 char(64) NOT NULL
    CHECK (receipt_identifier_sha256 ~ '^[0-9a-f]{64}$'),
  preview_project_ref text NOT NULL
    CHECK (length(btrim(preview_project_ref)) > 0),
  selected_step text NOT NULL
    CHECK (length(btrim(selected_step)) > 0),
  operation_purpose text NOT NULL
    CHECK (operation_purpose IN ('LIVE_MUTATION', 'LIVE_FRESH_READONLY')),
  attestation_identity_digest_sha256 char(64) NOT NULL
    CHECK (attestation_identity_digest_sha256 ~ '^[0-9a-f]{64}$'),
  human_authorization_identity_digest_sha256 char(64) NOT NULL
    CHECK (human_authorization_identity_digest_sha256 ~ '^[0-9a-f]{64}$'),
  consumed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT m55_pair_p5_dedicated_receipt_consumption_v1_pkey
    PRIMARY KEY (receipt_identifier_sha256)
);

COMMENT ON TABLE public.m55_pair_p5_dedicated_receipt_consumption_v1 IS
  'Pair P5-1 dedicated receipt one-use ledger; atomic consume via INSERT ON CONFLICT DO NOTHING RETURNING.';

ALTER TABLE public.m55_pair_p5_dedicated_receipt_consumption_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.m55_pair_p5_dedicated_receipt_consumption_v1 FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.m55_pair_p5_dedicated_receipt_consumption_v1 FROM PUBLIC;
REVOKE ALL ON TABLE public.m55_pair_p5_dedicated_receipt_consumption_v1 FROM anon, authenticated;

ALTER TABLE public.m55_pair_p5_dedicated_receipt_consumption_v1 OWNER TO postgres;

-- Human apply-time (separate GO): grant INSERT only to the approved Preview Session-pooler DB role and one RLS INSERT policy.
