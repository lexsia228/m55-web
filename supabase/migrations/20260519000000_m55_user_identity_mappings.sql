-- M55 user identity mappings (2026-05-19)
-- Created by Phase 5Z-I-V-AX-FILE — migration file creation only; no DB apply in that gate.
-- Seed: 0 rows. Existing paid artifact tables are not modified by this migration.
-- SSOT: docs/ssot/M55_PHASE5_6H_5Z_I_V_AX_FILE_M55_USER_IDENTITY_MAPPINGS_MIGRATION_FILE_CREATION_ONLY_2026-05-19.md

-- Bridges Clerk namespace identities to canonical M55 owner slots.
-- Server-only via service role / getSupabaseAdmin(); client direct access prohibited.

CREATE TABLE IF NOT EXISTS public.m55_user_identity_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  canonical_owner_slot text NOT NULL
    CHECK (
      canonical_owner_slot IN (
        'owner_slot_001', 'owner_slot_002', 'owner_slot_003', 'owner_slot_004',
        'owner_slot_005', 'owner_slot_006', 'owner_slot_007', 'owner_slot_008',
        'owner_slot_009', 'owner_slot_010'
      )
    ),

  namespace_type text NOT NULL
    CHECK (namespace_type IN (
      'clerk_development', 'clerk_production', 'legacy', 'unknown'
    )),

  user_ref_hash_or_internal_ref text NOT NULL
    CHECK (length(btrim(user_ref_hash_or_internal_ref)) > 0),

  user_safe_label text NOT NULL
    CHECK (length(btrim(user_safe_label)) > 0),

  mapping_status text NOT NULL DEFAULT 'pending'
    CHECK (mapping_status IN ('pending', 'active', 'deprecated', 'blocked')),

  mapping_confidence text NOT NULL DEFAULT 'unclear'
    CHECK (mapping_confidence IN ('confirmed', 'likely', 'unclear', 'blocked')),

  evidence_source text NOT NULL DEFAULT 'migration_review'
    CHECK (evidence_source IN (
      'current_login_observation',
      'paid_access_observation',
      'user_self_confirmation',
      'support_safe_summary',
      'migration_review',
      'other'
    )),

  verified_at timestamptz NULL,

  created_by_gate text NOT NULL
    CHECK (length(btrim(created_by_gate)) > 0),

  updated_by_gate text NULL,

  notes_safe text NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT m55_user_identity_mappings_slot_ns_ref_uq
    UNIQUE (canonical_owner_slot, namespace_type, user_ref_hash_or_internal_ref)
);

-- One row per namespace identity ref (any status)
CREATE UNIQUE INDEX IF NOT EXISTS m55_user_identity_mappings_ns_ref_uq
  ON public.m55_user_identity_mappings (namespace_type, user_ref_hash_or_internal_ref);

-- At most one ACTIVE mapping per namespace identity (redundant with ns_ref_uq when only one row per ref; kept per AW-R / AX-PRE intent)
CREATE UNIQUE INDEX IF NOT EXISTS m55_user_identity_mappings_active_ns_ref_uq
  ON public.m55_user_identity_mappings (namespace_type, user_ref_hash_or_internal_ref)
  WHERE mapping_status = 'active';

-- At most one ACTIVE mapping per owner slot per namespace
CREATE UNIQUE INDEX IF NOT EXISTS m55_user_identity_mappings_active_slot_ns_uq
  ON public.m55_user_identity_mappings (canonical_owner_slot, namespace_type)
  WHERE mapping_status = 'active';

CREATE INDEX IF NOT EXISTS idx_m55_user_identity_mappings_owner_slot
  ON public.m55_user_identity_mappings (canonical_owner_slot);

CREATE INDEX IF NOT EXISTS idx_m55_user_identity_mappings_ns_status
  ON public.m55_user_identity_mappings (namespace_type, mapping_status);

CREATE INDEX IF NOT EXISTS idx_m55_user_identity_mappings_active_only
  ON public.m55_user_identity_mappings (canonical_owner_slot, namespace_type)
  WHERE mapping_status = 'active';

COMMENT ON TABLE public.m55_user_identity_mappings IS
  'M55 identity bridge: maps Clerk namespace identity refs to canonical_owner_slot. Server-only; no client direct access.';

COMMENT ON COLUMN public.m55_user_identity_mappings.canonical_owner_slot IS
  'Canonical human owner bucket (owner_slot_001..010). Safe label only in SSOT.';

COMMENT ON COLUMN public.m55_user_identity_mappings.namespace_type IS
  'Clerk or legacy namespace: clerk_development, clerk_production, legacy, unknown.';

COMMENT ON COLUMN public.m55_user_identity_mappings.user_ref_hash_or_internal_ref IS
  'Internal reference or hash for namespace identity — not exposed in public SSOT.';

COMMENT ON COLUMN public.m55_user_identity_mappings.user_safe_label IS
  'Human/dashboard-safe label only — no email.';

COMMENT ON COLUMN public.m55_user_identity_mappings.mapping_status IS
  'Lifecycle: pending, active, deprecated, blocked.';

COMMENT ON COLUMN public.m55_user_identity_mappings.mapping_confidence IS
  'Mapping confidence: confirmed, likely, unclear, blocked.';

COMMENT ON COLUMN public.m55_user_identity_mappings.evidence_source IS
  'How mapping was established — safe summary categories only.';

-- RLS: enabled; no anon/authenticated policies — resolver uses service role server-side
ALTER TABLE public.m55_user_identity_mappings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.m55_user_identity_mappings FROM anon;
REVOKE ALL ON TABLE public.m55_user_identity_mappings FROM authenticated;

-- updated_at: no trigger in v1 — application / explicit UPDATE sets updated_at

-- SEED: intentionally zero INSERT statements
