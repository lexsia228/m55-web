# Phase 5-6H-5Z-I-V-AW-R — m55_user_identity_mappings migration SQL draft review gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AW-R** |
| **Title** | **m55_user_identity_mappings migration SQL draft review** |
| **Classification** | **Category 2 migration SQL draft review / docs-only / no-apply / no-mutation** |
| **Verdict** | **`M55_USER_IDENTITY_MAPPINGS_MIGRATION_SQL_DRAFT_REVIEW_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AW-R-M55-USER-IDENTITY-MAPPINGS-MIGRATION-SQL-DRAFT-REVIEW-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Prior AW commit** | **`e932dd3`** |

**AW-R reviews draft SQL in this document only.** No file under **`supabase/migrations/`**, no execution.

---

## B. Prior gate reference

| Field | Value |
|-------|--------|
| **Prior phase** | **5Z-I-V-AW** |
| **Prior verdict** | **`M55_USER_IDENTITY_MAPPINGS_DB_MIGRATION_PLANNING_GREEN_NO_MUTATION`** |
| **Prior evidence** | **`M55-EVID-20260519-5Z-I-V-AW-M55-USER-IDENTITY-MAPPINGS-DB-MIGRATION-PLAN-001`** |
| **AW defined** | Table purpose；lifecycle；constraints；RLS server-only；**seed 0**；artifact rows immutable |
| **AW-R** | **Does not apply** or create migration file |

---

## C. Draft review scope

### Allowed

| Item |
|------|
| Draft SQL **in this SSOT only** |
| Naming / constraints / RLS / indexes / comments review |
| Rollback and dry-run requirement notes |

### Not allowed

| Item |
|------|
| **`supabase/migrations/`** file creation |
| SQL execution / DB connection |
| Table / policy / row creation |
| Any mutation |

---

## D. Proposed future migration filename（planning only — not created）

```
supabase/migrations/YYYYMMDDHHMMSS_m55_user_identity_mappings.sql
```

**Example shape（timestamp placeholder）：** `20260519120000_m55_user_identity_mappings.sql`

Exact timestamp and filename chosen in **`5Z-I-V-AX-PRE`** or **`5Z-I-V-AX`** migration creation gate.

---

## E. SQL draft — review only（DO NOT RUN）

```sql
-- ═══════════════════════════════════════════════════════════════════
-- REVIEW DRAFT ONLY — M55 Phase 5Z-I-V-AW-R
-- DO NOT RUN IN AW-R
-- DO NOT APPLY IN PRODUCTION FROM THIS DOC
-- NO RAW CLERK user_id / email IN SSOT
-- Seed: 0 rows in initial migration
-- Existing paid artifact tables: UNCHANGED by this migration
-- ═══════════════════════════════════════════════════════════════════

-- ── m55_user_identity_mappings
-- Bridges Clerk namespace identities to canonical M55 owner slots.
-- Server-only access via service role / getSupabaseAdmin(); no client direct reads.

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

  -- Internal ref only (hash or opaque id). NOT full Clerk user_id in SSOT docs.
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

-- At most one ACTIVE mapping per namespace identity
CREATE UNIQUE INDEX IF NOT EXISTS m55_user_identity_mappings_active_ns_ref_uq
  ON public.m55_user_identity_mappings (namespace_type, user_ref_hash_or_internal_ref)
  WHERE mapping_status = 'active';

-- At most one ACTIVE primary mapping per owner slot per namespace (optional tighten — review in AX)
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
  'M55 identity bridge: Clerk namespace refs to canonical owner_slot. Server-only; no client direct access.';

COMMENT ON COLUMN public.m55_user_identity_mappings.user_ref_hash_or_internal_ref IS
  'Opaque internal ref or hash — not exposed in public SSOT.';

COMMENT ON COLUMN public.m55_user_identity_mappings.user_safe_label IS
  'Human/dashboard-safe label only — no email.';

-- RLS: enabled, no anon/authenticated policies — service role / server resolver only
ALTER TABLE public.m55_user_identity_mappings ENABLE ROW LEVEL SECURITY;

-- Intentionally NO policies for anon or authenticated roles in v1 draft.
-- REVOKE default grants if project baseline grants public access (verify in AX-PRE):
-- REVOKE ALL ON public.m55_user_identity_mappings FROM anon, authenticated;

-- updated_at: no trigger in v1 draft — app/service updates updated_at on write (align with many M55 tables)
-- Optional future: CREATE TRIGGER ... SET updated_at = now()

-- SEED: intentionally zero INSERT statements in initial migration
```

---

## F. Draft SQL review considerations

| Topic | AW-R assessment |
|-------|-----------------|
| **`gen_random_uuid()`** | **Available** — used in **`reply_system_data_layer_v1`**, **`phase1_entitlements_ssot`**, **`dtr_drafts`** migrations |
| **owner_slot CHECK** | **Explicit IN list** for **`owner_slot_001`–`010`** — matches AU scale；prefer over regex for clarity |
| **`updated_at` trigger** | **Omitted in v1 draft** — consistent with tables that default **`now()`** without triggers；resolver/app sets on UPDATE in **AZ** |
| **`user_ref` uniqueness scope** | **Per `namespace_type`** — same hash may not repeat within namespace；cross-namespace allowed |
| **Active partial uniqueness** | **Per `(namespace_type, user_ref)`** — prevents duplicate active bridge for one Clerk identity |
| **Active per `(slot, namespace)`** | **Added** — prevents two active rows for same slot in same namespace；may block intentional multi-ref — **review at AX** if one human needs two refs |
| **RLS no client policy** | **Sufficient** for server-only design — **verify** project default GRANTs in **AX-PRE** |
| **Seed 0 rows** | **Safe** — empty table；resolver must handle **no mapping** → fail-closed or legacy direct key（feature flag） |
| **`product_scope` / `artifact_scope`** | **Deferred** — not in v1 draft；add only if **AV** scope split required |

**Blockers found:** **none** for draft-review GREEN.

---

## G. Risk review

| Risk | Mitigation |
|------|------------|
| **Storing raw Clerk `user_id` in DB later** | Operational column may be required human-local；**never** SSOT；hash/ref preferred in draft |
| **Hash strategy vs lookup** | Resolver must use **same hash function** as insert path — document in **AY** |
| **Empty mapping table** | Feature flag off → legacy direct **`user_id`** path until rows seeded |
| **Over-strict UNIQUE** | **`active_slot_ns_uq`** may need relax — test in staging **AX** dry-run |
| **Under-strict UNIQUE** | **`ns_ref_uq`** + partial active index — primary guard |
| **RLS misconfiguration** | **REVOKE** review in **AX-PRE**；no permissive policies |
| **Row rewrite on artifacts** | **Prohibited** — this migration **CREATE TABLE only** |
| **Duplicate entitlements/wallets** | Out of scope for DDL — **BA/BB** verify |

---

## H. Recommended draft decision

| Decision | Value |
|----------|--------|
| **Draft acceptable?** | **yes** — for future dedicated migration file creation |
| **Create file in AW-R?** | **no** |
| **Next gate（conservative）** | **`5Z-I-V-AX-PRE`** — migration file creation + dry-run **planning** |
| **Then** | **`5Z-I-V-AX`** — execution only after backup + dry-run GREEN + explicit Human GO |
| **Alternative** | **`5Z-I-V-AS`** if deferring correction |

---

## I. Future acceptance criteria before any apply

| Criterion | Required |
|-----------|----------|
| Production DB **backup** planned | **yes** |
| **Dry-run** target identified | **yes** |
| Migration file **reviewed**（post **AX-PRE**） | **yes** |
| **RLS** + **GRANT/REVOKE** reviewed | **yes** |
| **Rollback** documented | **yes** |
| **Seed rows** | **0** unless separate gate |
| **No raw IDs in SSOT** | **yes** |
| **Explicit Human GO** | **yes** |
| **Post-migration verification** plan | **yes** |
| **Resolver implementation** | **separate**（**AY/AZ**） |

---

## J. No-mutation statement

**Explicitly confirmed — none performed in AW-R:**

- No raw key / secret / suffix / fragment recorded
- No full **user_id** / email / session recorded
- No full checkout session / payment intent / Stripe event ID recorded
- No DB connection / SQL execution / DB write
- No migration file under **`supabase/migrations/`**
- No table / RLS policy / mapping row creation
- No resolver implementation / code change
- No Clerk / Vercel / redeploy / auth / migration / Stripe / runner
- **AL / AL-PRE not restarted**

---

## K. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Full normal dev flow** | **NOT released** |
| **AW-R authorizes AL or AX execution** | **no** |

---

## L. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended）** | **`5Z-I-V-AX-PRE`** — Migration file creation + dry-run planning |
| **2** | **`5Z-I-V-AX`** — Execution（after **AX-PRE** + Human GO） |
| **Alternative** | **`5Z-I-V-AS`** |

---

## Draft SQL review summary

| Item | Status |
|------|--------|
| **Table DDL** | Reviewed — aligns with **AW** / **AV** |
| **CHECK constraints** | Explicit enums + **10** owner slots |
| **Indexes** | Global + partial active uniqueness |
| **RLS** | Enable only；no client policies in v1 |
| **Seed** | **0 rows** |
| **Artifact tables** | **Untouched** by draft |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AW-R-M55-USER-IDENTITY-MAPPINGS-MIGRATION-SQL-DRAFT-REVIEW-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AW-M55-USER-IDENTITY-MAPPINGS-DB-MIGRATION-PLAN-001`** | planning |

---

## 未実行事項（AW-R）

- No migration file in repo
- **AX-PRE / AX** not executed
- No mutation
