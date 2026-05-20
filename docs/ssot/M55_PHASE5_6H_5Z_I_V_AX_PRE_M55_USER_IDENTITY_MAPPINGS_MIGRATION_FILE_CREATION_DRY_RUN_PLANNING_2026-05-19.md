# Phase 5-6H-5Z-I-V-AX-PRE — m55_user_identity_mappings migration file creation + dry-run planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AX-PRE** |
| **Title** | **m55_user_identity_mappings migration file creation + dry-run planning** |
| **Classification** | **Category 2 migration file creation + dry-run planning-only / docs-only / no-apply / no-mutation** |
| **Verdict** | **`M55_USER_IDENTITY_MAPPINGS_MIGRATION_FILE_CREATION_DRY_RUN_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AX-PRE-M55-USER-IDENTITY-MAPPINGS-MIGRATION-FILE-CREATION-DRY-RUN-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Prior AW-R commit** | **`1d88077`** |

**AX-PRE plans only.** No migration file, no DB apply, no AX execution.

---

## B. Prior gate reference

| Field | Value |
|-------|--------|
| **Prior phase** | **5Z-I-V-AW-R** |
| **Prior verdict** | **`M55_USER_IDENTITY_MAPPINGS_MIGRATION_SQL_DRAFT_REVIEW_GREEN_NO_MUTATION`** |
| **Prior evidence** | **`M55-EVID-20260519-5Z-I-V-AW-R-M55-USER-IDENTITY-MAPPINGS-MIGRATION-SQL-DRAFT-REVIEW-001`** |
| **AW-R** | SQL draft in SSOT；**no DDL blockers**；**no** `supabase/migrations/` file |
| **AX-PRE** | **Does not** create migration file |

---

## C. AX-PRE scope

### Allowed

| Item |
|------|
| Docs-only planning |
| Filename / dry-run / backup / Human GO checklists |
| Repo migration convention review |

### Not allowed

| Item |
|------|
| Migration file creation |
| SQL execution / DB connection |
| Table / RLS / mapping rows |
| Code / resolver |
| Any mutation |

---

## D. Proposed future migration filename（planning only — not created）

```
supabase/migrations/20260519000000_m55_user_identity_mappings.sql
```

| Note | Detail |
|------|--------|
| **Repo latest** | **`20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql`** |
| **Convention** | `YYYYMMDDHHMMSS_snake_description.sql` |
| **Conflict** | If branch adds migrations before **AX-FILE**, pick **next** timestamp in that gate |
| **AX-PRE** | **File not created** |

---

## E. Future migration content checklist

Future **`AX-FILE`** file must include（from **AW-R** §E draft）:

| # | Item |
|---|------|
| 1 | `CREATE TABLE IF NOT EXISTS public.m55_user_identity_mappings` |
| 2 | `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` |
| 3 | `canonical_owner_slot text NOT NULL` + CHECK **`owner_slot_001`–`010`** |
| 4 | `namespace_type text NOT NULL` + CHECK enum |
| 5 | `user_ref_hash_or_internal_ref text NOT NULL` |
| 6 | `user_safe_label text NOT NULL` |
| 7 | `mapping_status text NOT NULL DEFAULT 'pending'` |
| 8 | `mapping_confidence text NOT NULL DEFAULT 'unclear'` |
| 9 | `evidence_source text NOT NULL DEFAULT 'migration_review'` |
| 10 | `verified_at timestamptz NULL` |
| 11 | `created_by_gate text NOT NULL` |
| 12 | `updated_by_gate text NULL` |
| 13 | `notes_safe text NULL` |
| 14 | `created_at` / `updated_at timestamptz NOT NULL DEFAULT now()` |
| 15 | TABLE + column **CHECK** constraints |
| 16 | **UNIQUE** `(canonical_owner_slot, namespace_type, user_ref_hash_or_internal_ref)` |
| 17 | **UNIQUE INDEX** `(namespace_type, user_ref_hash_or_internal_ref)` |
| 18 | **Partial UNIQUE** active per `(namespace_type, user_ref_hash_or_internal_ref)` |
| 19 | **Partial UNIQUE** active per `(canonical_owner_slot, namespace_type)` — **review §F.4** |
| 20 | Indexes on slot / namespace+status / active partial |
| 21 | `ALTER TABLE … ENABLE ROW LEVEL SECURITY` |
| 22 | **No** anon/authenticated policies in v1 |
| 23 | `COMMENT ON TABLE/COLUMN` |
| 24 | **Seed: 0 INSERT** rows |
| 25 | **No** changes to entitlements / snapshots / wallets / OTF tables |

---

## F. Open review items before actual migration file creation

| # | Item | AX-PRE planning position |
|---|------|--------------------------|
| **1** | **`gen_random_uuid()` available?** | **Likely yes** — all **9** repo migrations use it **without** `CREATE EXTENSION` |
| **2** | **`pgcrypto` extension required?** | **Probably no** — match repo；**verify in AX-FILE** against target Supabase if apply fails |
| **3** | **`updated_at` trigger?** | **Omit in v1** — align with most M55 tables（app sets on write）；revisit in **AY** if needed |
| **4** | **`active_slot_ns_uq` intent** | **Keep both** partial uniques：**(a)** one active per namespace identity ref；**(b)** one active per slot+namespace — document in **AX-FILE** header comment；relax only if dry-run blocks legitimate case |
| **5** | **GRANT defaults** | Repo has **no table RLS** pattern；**RPC-only** REVOKE/GRANT on functions — **add explicit** `REVOKE ALL ON TABLE … FROM anon, authenticated` in **AX-FILE** if Supabase dashboard shows default grants |
| **6** | **`user_ref` uniqueness scope** | **Namespace-scoped**（`(namespace_type, user_ref)`）— not global |
| **7** | **Comments in migration** | **Acceptable** — reply/DTR migrations use header comments |
| **8** | **Rollback style** | **Forward-only** Supabase migrations — rollback = **disable resolver** + optional **DROP TABLE** corrective migration with governance；**no down** in v1 file |

**Blockers for AX-PRE:** **none** — items are **verify-at-AX-FILE/AX-DRYRUN**, not planning blockers.

---

## G. Dry-run plan

| Rule | Requirement |
|------|-------------|
| **Production first** | **Forbidden** |
| **Preferred target** | Local Supabase CLI / **shadow** or **staging** project |
| **Apply method** | `supabase db push` or migration apply on non-Production only |

### Dry-run verification checklist（**`5Z-I-V-AX-DRYRUN`**）

| # | Check |
|---|--------|
| 1 | Migration applies **without error** |
| 2 | Table **`m55_user_identity_mappings`** exists |
| 3 | **No** UPDATE/DELETE on existing paid artifact tables |
| 4 | **RLS enabled** on mapping table |
| 5 | **anon** / **authenticated** cannot **SELECT** mapping rows（test with restricted role） |
| 6 | **service_role** / admin client **can** SELECT（empty table） |
| 7 | **Row count = 0** after migration |
| 8 | Existing app paths **unchanged**（resolver flag **off** — no code reads table yet） |
| 9 | DTR owned / unpaid behavior **unchanged** on dry-run env smoke if deployed |

---

## H. Backup / rollback plan for future execution

### Before Production apply（**`5Z-I-V-AX-PROD`** only）

| Step | Action |
|------|--------|
| 1 | **Production DB backup**（Human-local — not in SSOT） |
| 2 | Schema snapshot / migration history note |
| 3 | **Rollback L1:** resolver feature flag **off** |
| 4 | **Rollback L2:** deprecate mapping rows — **no delete** |
| 5 | **Rollback L3:** corrective migration `DROP TABLE` — governance only |
| 6 | **No seed rows** on initial apply |
| 7 | **Resolver disabled** until **AZ** + **BA/BB** |
| 8 | Post-migration counts-only verify（AP-S shape） |

---

## I. Human GO checklist for future AX gates

| Prerequisite | Required |
|--------------|----------|
| **AW-R** | **GREEN** |
| **AX-PRE** | **GREEN** |
| **Migration file** | Reviewed（post **AX-FILE**） |
| **Dry-run target** | Named |
| **Backup** | Ready（before **AX-PROD** only） |
| **Rollback** | Documented |

### Explicit Human GO text templates

**AX-FILE:**
```
GO for 5Z-I-V-AX-FILE m55_user_identity_mappings migration file creation only.
Scope: create supabase/migrations file only. No DB apply.
```

**AX-DRYRUN:**
```
GO for 5Z-I-V-AX-DRYRUN identity mappings migration dry-run.
Scope: non-Production only. No Production apply.
```

**AX-PROD:**
```
GO for 5Z-I-V-AX-PROD identity mappings Production migration apply.
Scope: Production apply only after AX-DRYRUN GREEN and backup ready.
```

**Default:** **do not apply to Production** without **AX-PROD** GO.

---

## J. Future gate split recommendation

| Phase | Purpose | Risk if skipped |
|-------|---------|-----------------|
| **`5Z-I-V-AX-FILE`** | Add migration SQL file to repo **only** | Mixing file + apply obscures review |
| **`5Z-I-V-AX-DRYRUN`** | Apply on **non-Production** only | Production-first = **high** |
| **`5Z-I-V-AX-PROD`** | Production apply after dry-run GREEN | Single **AX** gate = **not recommended** |

**Default recommendation:** **split**（three gates）.

**Legacy `5Z-I-V-AX`:** Treat as **umbrella** superseded by **AX-FILE / AX-DRYRUN / AX-PROD** unless Human collapses with documented risk acceptance.

---

## K. Acceptance criteria for AX-PRE

| Criterion | Met? |
|-----------|------|
| Planning SSOT created | **yes** |
| SYSTEM_SSOT updated | **yes** |
| Registry updated | **yes** |
| No migration file | **yes** |
| No DB / SQL / code | **yes** |
| Next gate defined | **yes** — **AX-FILE** |

---

## L. No-mutation statement

**Explicitly confirmed — none performed in AX-PRE:**

- No raw key / secret / suffix / fragment recorded
- No full **user_id** / email / session recorded
- No Stripe IDs recorded
- No DB connection / SQL execution / DB write
- No migration file creation / table / RLS / mapping rows
- No resolver / code change
- No Clerk / Vercel / redeploy / auth / migration / Stripe / runner
- **AL / AL-PRE not restarted**

---

## M. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Full normal dev flow** | **NOT released** |
| **AX-PRE authorizes AL or migration execution** | **no** |

---

## N. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended）** | **`5Z-I-V-AX-FILE`** — migration file creation **only** |
| **2** | **`5Z-I-V-AX-DRYRUN`** |
| **3** | **`5Z-I-V-AX-PROD`** |
| **Alternative** | **`5Z-I-V-AS`** — defer correction |

**Do not perform AX-FILE inside AX-PRE.**

---

## Dry-run plan summary

| Item | Plan |
|------|------|
| **Target** | Non-Production first |
| **Prove** | Table + RLS + 0 rows + no artifact touch |
| **Block** | Production until **AX-PROD** + backup |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AX-PRE-M55-USER-IDENTITY-MAPPINGS-MIGRATION-FILE-CREATION-DRY-RUN-PLAN-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AW-R-M55-USER-IDENTITY-MAPPINGS-MIGRATION-SQL-DRAFT-REVIEW-001`** | SQL draft |

---

## 未実行事項（AX-PRE）

- **AX-FILE / AX-DRYRUN / AX-PROD** not executed
- No migration file in repo
- No mutation
