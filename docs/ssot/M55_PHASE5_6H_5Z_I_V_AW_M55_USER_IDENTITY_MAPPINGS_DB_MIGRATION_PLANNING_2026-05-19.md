# Phase 5-6H-5Z-I-V-AW — m55_user_identity_mappings DB migration planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AW** |
| **Title** | **m55_user_identity_mappings DB migration planning** |
| **Classification** | **Category 2 DB migration planning-only / docs-only / no-mutation** |
| **Verdict** | **`M55_USER_IDENTITY_MAPPINGS_DB_MIGRATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AW-M55-USER-IDENTITY-MAPPINGS-DB-MIGRATION-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Prior AV commit** | **`bf64a0e`** |

**AW plans migration only.** No migration file, no SQL execution, no table creation.

---

## B. Why this gate exists

| Fact | Implication |
|------|-------------|
| **`5Z-I-V-AV`** | Dual-namespace resolver **GREEN** — conceptual table only |
| **AR-R** | Development / Production **separate** namespaces |
| **Paid artifacts** | **`user_id`-bound** — up to **10** distinct DB users |
| **Gap** | Need **DDL / constraints / RLS / rollback / dry-run** plan before **AX** execution |
| **AW does not** | Authorize migration execution, resolver code, or **AL** |

---

## C. Migration planning scope

### Allowed in AW

| Item |
|------|
| Conceptual schema design |
| Future migration ordering |
| Future dry-run / rollback plan |
| RLS / access control **design notes** |
| Test and verification plan |
| **Safe labels only** |

### Not allowed in AW

| Item |
|------|
| Migration file creation |
| SQL execution / DB connection |
| DB write / table creation |
| Code / resolver implementation |
| Raw identifiers in SSOT |

---

## D. Proposed table purpose

**`m55_user_identity_mappings`** maps **multiple Clerk namespace identities** to **one canonical M55 owner slot** so that:

- Existing **paid artifacts** stay associated with the correct **human owner**
- New **Production Clerk** identities can be introduced **without** rewriting artifact rows by default
- **`resolveCanonicalOwner(session)`**（AV）bridges session → slot → **legacy artifact key**（human-local）

| Principle | Rule |
|-----------|------|
| **Artifact immutability** | Existing rows **unchanged** by default |
| **Resolver bridge** | Mapping table supports read path to legacy owner |
| **SSOT** | **No raw IDs** |

---

## E. Conceptual schema proposal（planning only）

### Table: `public.m55_user_identity_mappings`

| Column | Type（conceptual） | SSOT records? | Notes |
|--------|------------------|---------------|-------|
| **id** | uuid PK | id only as “uuid PK” | `gen_random_uuid()` |
| **canonical_owner_slot** | text NOT NULL | **yes** — `owner_slot_001` … `010` | Human bucket |
| **namespace_type** | text NOT NULL | **yes** | `clerk_development` / `clerk_production` / `legacy` / `unknown` |
| **user_ref_hash_or_internal_ref** | text NOT NULL | **field name only** | Future **hashed** or internal ref — **not** full Clerk ID in SSOT |
| **user_safe_label** | text NOT NULL | **yes** | Dashboard-safe label |
| **mapping_status** | text NOT NULL | **yes** | `pending` / `active` / `blocked` / `deprecated` |
| **mapping_confidence** | text NOT NULL | **yes** | `confirmed` / `likely` / `unclear` / `blocked` |
| **evidence_source** | text NOT NULL | **yes** | See AV §E |
| **verified_at** | timestamptz nullable | **yes** | Set when Human confirms slot |
| **created_by_gate** | text NOT NULL | **yes** | e.g. `5Z-I-V-AX` |
| **updated_by_gate** | text nullable | **yes** | |
| **notes_safe** | text nullable | **yes** | No PII |
| **created_at** | timestamptz | **yes** | `now()` default |
| **updated_at** | timestamptz | **yes** | trigger or app-maintained |

### Optional columns（evaluate in **AW-R** / **AX** review）

| Column | Purpose |
|--------|---------|
| **product_scope** | Narrow mapping to DTR vs reply-only |
| **artifact_scope** | entitlements / wallet / all |
| **rollback_group** | Batch rollback tag |
| **supersedes_mapping_id** | uuid FK to prior row |
| **is_primary_for_namespace** | One primary active row per namespace identity |

### Human-local column（not in SSOT）

| Column | Storage |
|--------|---------|
| **legacy_artifact_user_key** | Maps slot → DB **`user_id`** in entitlements/snapshots/wallets — **never** pasted to SSOT |

**If production table stores full Clerk `user_id`:** decide only in **AW-R** SQL draft review or **AX** with **service-role-only** access and **no SSOT exposure**.

---

## F. Constraints and indexes planning

| Constraint / index | Purpose |
|--------------------|---------|
| **UNIQUE (canonical_owner_slot, namespace_type, user_ref_hash_or_internal_ref)** | One row per namespace identity ref |
| **Partial UNIQUE** — one **`active`** per `(namespace_type, user_ref_hash_or_internal_ref)` | Prevent duplicate active bridges |
| **CHECK mapping_status** | Enum whitelist |
| **CHECK namespace_type** | Enum whitelist |
| **CHECK mapping_confidence** | Enum whitelist |
| **INDEX (canonical_owner_slot)** | Resolver lookup by slot |
| **INDEX (namespace_type, mapping_status)** | Active mapping queries |
| **INDEX (mapping_status) WHERE active** | Hot path partial index |

**Note:** Exact DDL reviewed in **`5Z-I-V-AW-R`**（recommended before **AX**）— **not executed in AW**.

### Repo migration convention（read-only）

Existing migrations under **`supabase/migrations/`** use:

- Timestamp-prefixed SQL files
- **`CREATE TABLE IF NOT EXISTS`**
- **`CREATE INDEX IF NOT EXISTS`**
- **`user_id text`** on paid tables（**`20260306000000_phase1_entitlements_ssot.sql`**, reply layer, DTR snapshots）
- **Server RPC / GRANT service_role** for sensitive ops（**`m55_reply_generate_commit`**）

**AW proposes next file name pattern（planning only）:** `YYYYMMDDHHMMSS_m55_user_identity_mappings_v1.sql` — **file not created in AW**.

---

## G. RLS / access control planning

| Design decision | Recommendation |
|-----------------|----------------|
| **Primary access** | **Service role / server-only**（align with **`getSupabaseAdmin()`** in `lib/m55/*`） |
| **Client direct SELECT** | **Deny** on mapping table |
| **Resolver** | **Server-side only** — never expose mapping rows to browser |
| **Enumeration risk** | RLS **deny all** for `authenticated` / `anon` unless narrow SECURITY DEFINER function added later |
| **Cross-user leakage** | Policies must **not** allow reading other users' mappings |
| **RLS enable** | **`ALTER TABLE … ENABLE ROW LEVEL SECURITY`** + **no permissive policies** for client roles |

**Align with M55 pattern:** Paid tables are queried via **admin client** in ownership gate — mapping table should follow **same trust boundary**.

---

## H. Resolver integration planning

| Integration group | Read dependency | Future change | Risk | Test |
|-------------------|-----------------|---------------|------|------|
| **`resolveCanonicalOwner`** | New | **Read mapping table** | **High** | Known session → correct slot |
| **`dtrOwnershipGate`** | **user_id** | **legacy key** via resolver | **High** | Owned → **owned** |
| **`dtrShelfAccess`** | ownership + snapshot | resolver injection | **High** | Saved report visible |
| **`dtr_report_snapshots`** | **user_id** | legacy key | **High** | Snapshot row found |
| **entitlements / rights** | **user_id** | legacy key | **High** | Active DTR row |
| **reply_ticket_wallets** | **user_id** | legacy key | **High** | Balance unchanged |
| **reply_wallet_ledgers** | **user_id** | legacy key | **Medium** | Ledger count stable |
| **one_time_fulfillments** | **user_id** | legacy key | **Medium** | Fallback ownership |
| **checkout fulfillment write** | **expectedUserId** | canonical mapping on write | **High** | No duplicate entitlements |
| **wallet grant write** | **userId** | canonical mapping | **High** | No duplicate wallet |
| **reply ticket validate** | **user_id** | legacy key | **High** | Validation pass |
| **dtr_guest_drafts** | optional **user_id** | legacy key on link | **Low–medium** | Link if in scope |

**Feature flag（planning）:** `M55_IDENTITY_RESOLVER_ENABLED` — default **off** until **AZ** + **BA** GREEN.

---

## I. Migration ordering plan（future — no execution）

| Step | Action |
|------|--------|
| **1** | **AW-R**（recommended）— SQL draft review；no apply |
| **2** | Human GO for **AX** |
| **3** | **Backup** Production DB |
| **4** | **AX** — apply migration（empty table or structure only） |
| **5** | **Zero seed rows** in AX unless separate mapping evidence gate |
| **6** | **AY** — resolver implementation plan |
| **7** | **AZ** — code + feature flag |
| **8** | Read-only verification（counts unchanged on artifacts） |
| **9** | Separate gated **mapping row insert**（per owner_slot evidence） |
| **10** | **BA** / **BB** — verify without payment |
| **11** | **BC** — Clerk correction re-preflight |
| **12** | Only then **AL-PRE / AL** chain |

---

## J. Dry-run / rollback planning

### Future dry-run must prove

| Check |
|-------|
| Migration applies cleanly in **staging** / shadow |
| **No** existing paid artifact rows **UPDATE**d |
| **No** duplicate entitlements |
| **No** duplicate wallets |
| Resolver can be **disabled** via flag |
| **Rollback:** drop/disable resolver → app uses direct **user_id** again；**do not DELETE** artifact audit rows |
| **Backup** exists before Production **AX** |

### Rollback layers

| Layer | Action |
|-------|--------|
| **L1 — Resolver off** | Feature flag **false** — immediate |
| **L2 — Mapping deprecated** | Set rows **`deprecated`** — no delete |
| **L3 — Table drop** | Only with explicit governance；**after** backup |

---

## K. Mapping seed policy

| Rule | Detail |
|------|--------|
| **AW creates rows** | **no** |
| **Per-slot evidence** | Required for any future insert |
| **owner_slot_001–010** | **Planning slots only** |
| **No auto-map from counts** | AP-S-R counts **do not** seed rows |
| **Human-local evidence** | **Never** paste into SSOT |

---

## L. Future gates

| Phase | Purpose | Category |
|-------|---------|----------|
| **`5Z-I-V-AW-R`**（recommended） | Migration **SQL draft review** — still no apply | 2 planning |
| **`5Z-I-V-AX`** | DB migration **execution** — dry-run first；Human GO | 2 execution |
| **`5Z-I-V-AY`** | Resolver implementation **planning** | 2 planning |
| **`5Z-I-V-AZ`** | Resolver **implementation** | 2 execution |
| **`5Z-I-V-BA`** | Post-resolver DTR owned verify — **no payment** | 2 verify |
| **`5Z-I-V-BB`** | Post-resolver unpaid verify | 2 verify |
| **`5Z-I-V-BC`** | Clerk correction **re-preflight** | 2 planning |
| **`5Z-I-V-AS`**（alt） | Exception governance if deferring | 2 governance |

**Sequence matches AV §I** — **AW-R** inserted before **AX** per safety.

---

## M. Stop conditions

| Stop condition |
|----------------|
| Raw user IDs must be pasted into AI/SSOT |
| **mapping_confidence** unclear for paid owner |
| Backup / rollback not ready |
| Dry-run not **GREEN** |
| Resolver implementation not planned (**AY**) |
| RLS / access controls unclear |
| Paid DTR verify without payment impossible |
| Wallet preservation unclear |
| Entitlement duplication risk unresolved |
| Production Clerk identity unavailable |
| Migration would **rewrite** artifact rows without separate approval |

---

## N. No-mutation statement

**Explicitly confirmed — none performed in AW:**

- No raw key / secret / suffix / fragment recorded
- No full **user_id** / email / session recorded
- No full checkout session / payment intent / Stripe event ID recorded
- No DB connection / SQL execution / DB write
- No migration file creation / table creation / RLS policy creation
- No mapping row creation
- No resolver implementation / code change
- No Clerk Production instance / setting change
- No Vercel env change / redeploy
- No auth mutation / user migration
- No Stripe / webhook / checkout / payment / runner
- **AL / AL-PRE not restarted**

---

## O. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Full normal dev flow** | **NOT released** |
| **AW authorizes AL** | **no** |

---

## P. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended）** | **`5Z-I-V-AW-R`** — Migration SQL **draft review**（no apply） |
| **2** | **`5Z-I-V-AX`** — Execution only after **AW-R** + Human GO + backup + dry-run |
| **Alternative** | **`5Z-I-V-AS`** — Defer correction |

**AX cannot execute** until concrete migration SQL is separately authorized via **AW-R**.

---

## Schema planning summary

| Item | Plan |
|------|------|
| **Table** | `m55_user_identity_mappings` |
| **Key** | `canonical_owner_slot` + `namespace_type` + internal ref |
| **Status lifecycle** | `pending` → `active` → `deprecated` / `blocked` |
| **Access** | Server-only；RLS deny client |
| **Seeding** | Separate gated inserts per slot |
| **Artifacts** | Unchanged until resolver + mappings proven |

---

## RLS / access summary

| Layer | Policy |
|-------|--------|
| **Application** | `getSupabaseAdmin()` only |
| **Database** | RLS enabled；no anon/authenticated policies |
| **Client** | No direct mapping reads |
| **SSOT** | Safe labels and slot IDs only |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AW-M55-USER-IDENTITY-MAPPINGS-DB-MIGRATION-PLAN-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AV-MAPPING-SCHEMA-DUAL-NAMESPACE-RESOLVER-DESIGN-001`** | resolver design |

---

## 未実行事項（AW）

- **AW-R / AX** not executed
- No migration file
- No mutation
