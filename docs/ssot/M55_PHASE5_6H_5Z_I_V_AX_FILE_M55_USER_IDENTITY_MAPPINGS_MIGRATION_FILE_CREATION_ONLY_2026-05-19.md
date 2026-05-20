# Phase 5-6H-5Z-I-V-AX-FILE — m55_user_identity_mappings migration file creation only gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AX-FILE** |
| **Title** | **m55_user_identity_mappings migration file creation only** |
| **Classification** | **Category 2 / explicit Human GO / migration file creation only / no DB apply** |
| **Verdict** | **`M55_USER_IDENTITY_MAPPINGS_MIGRATION_FILE_CREATION_ONLY_GREEN_NO_APPLY`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AX-FILE-M55-USER-IDENTITY-MAPPINGS-MIGRATION-FILE-CREATION-ONLY-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |

---

## B. Human GO

| Field | Recorded |
|-------|----------|
| **Human authorization** | **yes** — explicit **AX-FILE migration file creation only** GO |
| **Scope included** | Create **one** file under **`supabase/migrations/`** |
| **Scope excluded** | DB apply；dry-run；Production apply；resolver；**AL** |

---

## C. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AX-PRE** | **`M55_USER_IDENTITY_MAPPINGS_MIGRATION_FILE_CREATION_DRY_RUN_PLANNING_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AX-PRE-…-001`** | **`6d7caf0`** |
| **AW-R** | **`M55_USER_IDENTITY_MAPPINGS_MIGRATION_SQL_DRAFT_REVIEW_GREEN_NO_MUTATION`** | **`M55-EVID-20260519-5Z-I-V-AW-R-…-001`** | **`1d88077`** |

---

## D. File created

| Field | Value |
|-------|--------|
| **Migration filename** | **`supabase/migrations/20260519000000_m55_user_identity_mappings.sql`** |
| **Previous migration count** | **9** |
| **New migration count** | **10** |
| **Other `supabase/migrations/` changes** | **none** |
| **App code changes** | **none** |

---

## E. Migration content summary

| Item | Value |
|------|--------|
| **Table** | **`public.m55_user_identity_mappings`** |
| **Columns** | **id**, **canonical_owner_slot**, **namespace_type**, **user_ref_hash_or_internal_ref**, **user_safe_label**, **mapping_status**, **mapping_confidence**, **evidence_source**, **verified_at**, **created_by_gate**, **updated_by_gate**, **notes_safe**, **created_at**, **updated_at** |
| **CHECK constraints** | **owner_slot_001–010**；namespace / status / confidence / evidence enums |
| **UNIQUE** | **(slot, namespace, ref)** constraint + **(namespace, ref)** unique index |
| **Partial UNIQUE** | **active** per **(namespace, ref)** and per **(slot, namespace)** |
| **Indexes** | **owner_slot**；**(namespace_type, mapping_status)**；active partial lookup |
| **RLS** | **ENABLED** |
| **anon/authenticated policies** | **none** |
| **Explicit REVOKE** | **yes** — **anon**, **authenticated**（**service_role** not revoked） |
| **Seed rows** | **0** |
| **Existing artifact tables** | **untouched**（DDL is **CREATE TABLE** only） |
| **updated_at trigger** | **omitted** — v1 app/explicit UPDATE managed |

### Index redundancy note

**`m55_user_identity_mappings_ns_ref_uq`** already limits one row per **(namespace_type, user_ref_hash_or_internal_ref)**. **`m55_user_identity_mappings_active_ns_ref_uq`** is **partially redundant** but retained per **AW-R / AX-PRE** intent for explicit active-state documentation.

---

## F. Open items for AX-DRYRUN

| # | Verify in **5Z-I-V-AX-DRYRUN**（non-Production） |
|---|--------------------------------------------------|
| 1 | **`gen_random_uuid()`** applies without extension error |
| 2 | **RLS + REVOKE** — anon/authenticated cannot read |
| 3 | **service_role** / admin client can read empty table |
| 4 | **Active partial uniqueness** behaves as intended |
| 5 | **Row count = 0** after migration |
| 6 | **entitlements / snapshots / wallets / OTF / stripe_events / failed_fulfillments** row counts unchanged |
| 7 | **No app impact** while resolver does not reference table |
| 8 | **`active_slot_ns_uq`** does not block intended multi-ref history（deprecated rows） |

---

## G. No-apply statement

**Confirmed for AX-FILE:**

- **No** DB connection
- **No** SQL execution
- **No** dry-run
- **No** Production apply
- **No** table creation **in any database**（file exists in repo only until apply gate）
- **No** RLS/policy application **in DB**
- **No** mapping rows
- **No** resolver implementation
- **No** app code change beyond migration file
- **No** **AL / AL-PRE**

---

## H. No-mutation statement

**Confirmed:**

- No raw key / secret / fragment recorded
- No full **user_id** / email / session recorded
- No Stripe IDs recorded
- No Clerk / Vercel / redeploy / auth / user migration / Stripe / runner DB apply
- **No** DB write via this gate

---

## I. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Full normal dev flow** | **NOT released** |
| **AX-FILE authorizes AX-DRYRUN or AL** | **no** |

---

## J. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended）** | **`5Z-I-V-AX-DRYRUN`** — non-Production migration apply + verify |
| **Requirements** | Explicit Human GO；non-Production target；no Production apply |
| **Alternative** | **`5Z-I-V-AS`** — defer correction |

**AX-DRYRUN must verify:** table + RLS + **0 rows** + artifact tables unchanged.

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AX-FILE-M55-USER-IDENTITY-MAPPINGS-MIGRATION-FILE-CREATION-ONLY-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AX-PRE-M55-USER-IDENTITY-MAPPINGS-MIGRATION-FILE-CREATION-DRY-RUN-PLAN-001`** | planning |

---

## 未実行事項（AX-FILE）

- **AX-DRYRUN / AX-PROD** not executed
- Migration **not applied** to any database
