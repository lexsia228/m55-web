# Phase 5-6H-5Z-I-V-AX-DRYRUN-R — Human-side non-Production migration dry-run replay gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AX-DRYRUN-R** |
| **Title** | **Human-side m55_user_identity_mappings non-Production migration dry-run replay** |
| **Classification** | **Category 2 / Human-side non-Production dry-run replay / no Production apply** |
| **Verdict** | **`M55_USER_IDENTITY_MAPPINGS_MIGRATION_DRYRUN_REPLAY_BLOCKED_NO_PRODUCTION_APPLY`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AX-DRYRUN-R-HUMAN-NONPRODUCTION-MIGRATION-DRYRUN-REPLAY-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`**（**not used**） |

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AX-DRYRUN** | **`M55_USER_IDENTITY_MAPPINGS_MIGRATION_DRYRUN_BLOCKED_NO_PRODUCTION_APPLY`** | **`M55-EVID-20260519-5Z-I-V-AX-DRYRUN-…-001`** | **`79e86de`** |
| **AX-FILE** | **`M55_USER_IDENTITY_MAPPINGS_MIGRATION_FILE_CREATION_ONLY_GREEN_NO_APPLY`** | **`M55-EVID-20260519-5Z-I-V-AX-FILE-…-001`** | **`db63cce`** |
| **Migration file** | **`supabase/migrations/20260519000000_m55_user_identity_mappings.sql`** | | |

---

## C. Target confirmation（replay session）

| Field | Value |
|-------|--------|
| **target_type** | **not_confirmed** |
| **target safe label** | **`not_confirmed`** |
| **Production target used** | **no** |
| **m55-soul-core used** | **no** |
| **raw credentials shared in SSOT** | **no** |
| **raw credentials used for apply** | **no** |

### Preflight（agent / Human-machine session）

| Check | Result |
|-------|--------|
| Migration file exists | **yes** |
| App code pending changes | **no**（docs-only delta） |
| **`DATABASE_URL` / `DIRECT_URL` / `SHADOW_DATABASE_URL`** | **unset** in execution shell |
| **Docker** | **missing** |
| **`psql`** | **missing** |
| **`supabase` CLI on PATH** | **missing**（`npx supabase@2.20.12` available） |
| **`.supabase` project link** | **absent** |
| **`.env.local` present** | **yes** — contains Supabase URL keys only；**no** Postgres connection string；**project ref not on non-Production allowlist**（not **`jonlynrbfveaprncyrmv`** / shadow；not confirmed **local Supabase**） |
| **Non-Production target confirmed before apply** | **no** — **STOP** |

**Safe error summary:** Replay gate could not apply migration because no **confirmed** shadow (`m55-soul-shadow`) or local Supabase target was available to the executor, and no direct DB URL was set. **No connection was opened to `m55-soul-core`.**

---

## D. Dry-run result

| Field | Value |
|-------|--------|
| **migration applied** | **no** |
| **apply method** | **not run** |
| **Production apply** | **no** |

---

## E. Verification matrix（not executed — pending confirmed Human replay）

### A. Migration result

| Field | Value |
|-------|--------|
| **migration applied** | **not_run** |
| **Production apply** | **no** |

### B. Table verification

| Field | Value |
|-------|--------|
| **`public.m55_user_identity_mappings` exists** | **not_run** |
| **row count** | **not_run** |
| **expected row count** | **0** |

### C. Column verification

All columns **not_run** — expected present per migration file:

`id`, `canonical_owner_slot`, `namespace_type`, `user_ref_hash_or_internal_ref`, `user_safe_label`, `mapping_status`, `mapping_confidence`, `evidence_source`, `verified_at`, `created_by_gate`, `updated_by_gate`, `notes_safe`, `created_at`, `updated_at`

### D. Constraint / index verification

| Check | Status |
|-------|--------|
| owner_slot CHECK | **not_run** |
| namespace_type CHECK | **not_run** |
| mapping_status CHECK | **not_run** |
| mapping_confidence CHECK | **not_run** |
| evidence_source CHECK | **not_run** |
| namespace + ref uniqueness | **not_run** |
| slot + namespace + ref uniqueness | **not_run** |
| active partial uniqueness | **not_run** |
| indexes present | **not_run** |

### E. RLS / access verification

| Check | Status |
|-------|--------|
| RLS enabled | **not_run** |
| anon direct read denied | **not_run** |
| authenticated direct read denied | **not_run** |
| service_role/admin read possible | **not_run** |
| client direct access prohibited | **not_run**（expected **yes** by design） |

### F. Existing artifact safety

| Table group | Changed by migration? |
|-------------|----------------------|
| **overall** | **not_run** |
| entitlements | **not_run** |
| entitlement_rights | **not_run** |
| dtr_report_snapshots | **not_run** |
| reply_ticket_wallets | **not_run** |
| reply_wallet_ledgers | **not_run** |
| one_time_fulfillments | **not_run** |
| stripe_events | **not_run** |
| failed_fulfillments | **not_run** |

**Expected:** **no** change to any artifact table DDL or row counts from this migration.

### G. App impact

| Field | Value |
|-------|--------|
| **app code changed** | **no** |
| **resolver implementation exists** | **no** |
| **resolver uses mapping table** | **no** |
| **expected app impact** | **none** |

---

## F. Human replay procedure（for GREEN re-classification — not executed in this gate）

**Before apply — Human must confirm in writing (separate evidence or follow-up gate):**

| Field | Required |
|-------|----------|
| **target_type** | **`shadow`** or **`local`** only |
| **target safe label** | e.g. **`shadow_supabase`**（`m55-soul-shadow` / ref **`jonlynrbfveaprncyrmv`）or **`local_supabase`** |
| **Production target used** | **no** |
| **Dashboard shows NOT `m55-soul-core`** | **yes** |

**Apply（non-Production only）:**

1. Link or connect CLI to **shadow** or **local** only.
2. Run official migration flow（e.g. `npx supabase db push` against shadow, or paste migration file in shadow SQL Editor once）.
3. Run **counts-only** verification below — record **yes/no** and integers only in a new evidence row.

**Counts-only verification SQL（shadow/local SQL Editor — no raw rows in SSOT）:**

```sql
-- B: table
SELECT count(*) AS mapping_row_count FROM public.m55_user_identity_mappings;
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'm55_user_identity_mappings'
) AS table_exists;

-- D: constraints (yes/no from pg_constraint / pg_indexes — counts only in notes)
-- E: RLS
SELECT relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'm55_user_identity_mappings';

-- F: artifact safety (compare before/after counts — integers only)
SELECT 'entitlements' AS t, count(*)::bigint AS c FROM public.entitlements
UNION ALL SELECT 'entitlement_rights', count(*) FROM public.entitlement_rights
UNION ALL SELECT 'dtr_report_snapshots', count(*) FROM public.dtr_report_snapshots
UNION ALL SELECT 'reply_ticket_wallets', count(*) FROM public.reply_ticket_wallets
UNION ALL SELECT 'reply_wallet_ledgers', count(*) FROM public.reply_wallet_ledgers
UNION ALL SELECT 'one_time_fulfillments', count(*) FROM public.one_time_fulfillments
UNION ALL SELECT 'stripe_events', count(*) FROM public.stripe_events
UNION ALL SELECT 'failed_fulfillments', count(*) FROM public.failed_fulfillments;
```

**Do not paste:** connection strings, service_role keys, anon keys, full `user_id`, email, session, Stripe IDs.

---

## G. No Production statement

- **No** Production DB connection in this replay session
- **No** Production apply
- **No** Production DB write
- **No** Production table creation
- **No** `m55-soul-core` use
- **No** Production artifact change

---

## H. No-mutation outside dry-run statement

- No raw key / secret / password / connection string recorded in SSOT
- No full **user_id** / email / session / Stripe ID recorded
- No Clerk Production instance creation；no Vercel env change；no redeploy
- No app code change；no resolver implementation
- No user migration；no auth mutation；no AL / AL-PRE

---

## I. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Full normal dev flow** | **NOT released** |
| **AX-DRYRUN-R authorizes AX-PROD or AL** | **no** |

---

## J. Next phase

| Priority | Gate |
|----------|------|
| **1** | Human executes replay on **confirmed shadow** with Dashboard double-check；then **`5Z-I-V-AX-DRYRUN-R2`** or amend this evidence with counts-only results |
| **2** | If DDL fails on shadow → **migration DDL correction planning** |
| **3** | After **GREEN** replay → **`5Z-I-V-AX-PROD-PRE`**（planning only — no Production apply） |

---

## Blocker summary

| ID | Blocker |
|----|---------|
| **R1** | No **`DATABASE_URL`** / shadow DB URL in execution environment |
| **R2** | **Docker** / **local Supabase** stack not available |
| **R3** | **Target identity not confirmed** on non-Production allowlist before apply |
| **R4** | Human replay results（counts-only）not supplied with this gate request |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AX-DRYRUN-R-HUMAN-NONPRODUCTION-MIGRATION-DRYRUN-REPLAY-001`** | **本条** |
