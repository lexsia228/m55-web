# Phase 5-6H-5Z-I-V-AS — Temporary auth compliance exception governance gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS** |
| **Title** | **Temporary auth compliance exception governance** |
| **Classification** | **Category 3 separate track / temporary exception governance / docs-only / no-mutation** |
| **Verdict** | **`TEMPORARY_AUTH_COMPLIANCE_EXCEPTION_GOVERNANCE_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AS-TEMPORARY-AUTH-COMPLIANCE-EXCEPTION-GOVERNANCE-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |

**AS governs a temporary exception only.** It does **not** close Production auth compliance, does **not** authorize correction execution, and does **not** release full normal dev flow.

---

## B. Why this gate exists

| Factor | Status |
|--------|--------|
| **Production auth compliance** | **RED** — canonical Production uses Clerk **development/test** environment signals（**`pk_test_`** class confirmed in **AJ-R**） |
| **Corrective path** | Requires **identity mapping** / **migration** support before safe Clerk Production correction |
| **Shadow dry-run** | **GREEN**（**AX-DRYRUN-R2** on **`m55-soul-shadow`**) |
| **Production migration apply** | **BLOCKED**（**AX-PROD-BLOCKED** — Supabase **Free Plan** no project backups） |
| **AX-PROD-PRE backup prerequisite** | **Unmet** — Production DB backup prepared outside SSOT **not available** |
| **Risk if ungoverned** | Team might **silently treat** auth as resolved while **RED** persists |

**Prior blocker evidence:** **`M55-EVID-20260519-5Z-I-V-AX-PROD-BLOCKED-SUPABASE-FREE-PLAN-BACKUP-LIMITATION-001`**（commit **`ea338d6`**）

**Approved migration file（staged, Production not applied）:** `supabase/migrations/20260519000000_m55_user_identity_mappings.sql`

---

## C. Exception statement

| Statement | Value |
|-----------|--------|
| **This is a temporary exception** | **yes** — **not** compliance GREEN |
| **Production auth compliance** | **remains RED** |
| **Clerk Development namespace** | **remains in temporary use** on canonical Production UI |
| **AX-PROD authorized** | **no** |
| **AL authorized** | **no** |
| **Clerk Production instance creation** | **not authorized** |
| **Vercel env replacement** | **not authorized** |
| **Redeploy for auth correction** | **not authorized** |
| **Full normal dev flow** | **NOT released** |

**Exception ID:** **`EX-AS-AUTH-COMPLIANCE-DEV-NAMESPACE-2026-05-19`**

---

## D. Exception owner / review cadence / expiry

| Field | Value |
|-------|--------|
| **Exception owner** | **Human / M55 owner** |
| **Review cadence** | Every **major auth / payment / DB gate**, or **at least weekly** while unresolved |
| **Tentative governance review date** | **`2026-06-19`**（review checkpoint — **not** automatic expiry） |

### Proposed expiry triggers（whichever comes first）

| # | Trigger |
|---|---------|
| 1 | **Supabase paid backup** becomes available after monetization |
| 2 | Human explicitly approves **`5Z-I-V-AX-PROD-FREE-FALLBACK-GOVERNANCE`**（no-project-backup risk accepted） |
| 3 | **Before broader public launch** or **increased paid traffic** — exception must be **re-reviewed or closed** |

---

## E. Allowed work during exception

### Category 1（default allowed — no separate GO）

| Work type |
|-----------|
| Docs / SSOT |
| Copy polish |
| Non-auth / non-payment / non-DB UI polish |
| Read-only audit |
| Planning gates |
| Local / static review |
| Safety prompt / content policy planning |
| Release readiness triage docs |

### Category 2（requires separate explicit Human GO each time）

| Work type |
|-----------|
| Non-Production dry-runs |
| Migration planning |
| Backup planning |
| Resolver planning |
| Future Production migration after backup |
| Any **DB / env / auth / deploy / Stripe** action |

**AS does not substitute for Category 2 GO.**

---

## F. Prohibited during exception

| Prohibition |
|-------------|
| Production DB schema changes |
| Clerk Production instance creation |
| Vercel env changes |
| Redeploy for auth correction |
| Live payment / checkout retry |
| Webhook changes |
| Mapping row creation |
| Resolver implementation without separate gate |
| **AL / AL-PRE** |
| Full normal dev flow release |
| Claim that **auth compliance is GREEN** |
| Direct Production SQL differing from approved migration file |
| Unapproved **`old_user_id` / `new_user_id`** schema |
| **DROP TABLE** as substitute for backup |

---

## G. Exit criteria

Exception closes only when **one** path completes:

### Path 1 — Compliant correction（preferred）

| Step | Requirement |
|------|-------------|
| 1 | Supabase **backup** or **approved equivalent** available |
| 2 | **AX-PROD** or later migration path completes safely |
| 3 | Resolver / mapping readiness verified if needed |
| 4 | Clerk Production auth correction in **separate Category 2 gate** |
| 5 | Post-correction auth / UI verification passes |
| 6 | **DTR owned** and **AC-P6** remain **GREEN** |

### Path 2 — Explicit governance waiver（high risk）

| Step | Requirement |
|------|-------------|
| 1 | **`5Z-I-V-AX-PROD-FREE-FALLBACK-GOVERNANCE`** — Human accepts no-project-backup risk |
| 2 | **Approved migration file only** |
| 3 | Logical rollback / pre-counts / risk owner / exit criteria fixed |
| 4 | **Separate Human GO** for any Production apply |

### Path 3 — Defer

| Step | Requirement |
|------|-------------|
| 1 | Continue **limited Category 1** work only |
| 2 | **No** compliance closure |

---

## H. Risk register

| ID | Risk | Mitigation |
|----|------|------------|
| **R-AS-01** | Canonical Production auth on **Clerk Development/test** namespace | Exception tracked；**RED** visible in registry |
| **R-AS-02** | Future Clerk Production namespace may **not preserve user_id** | Dual-namespace mapping design（**AV**）；**AR-R separate** |
| **R-AS-03** | Paid artifacts are **user_id-bound** | **AT** preservation rules；no migration without backup |
| **R-AS-04** | Production migration **blocked** by backup limitation | **AX-PROD-BLOCKED**；wait for paid plan or governance waiver |
| **R-AS-05** | Free Plan **no project backup** increases recovery risk | No **AX-PROD** until backup path or waiver |
| **R-AS-06** | Direct SQL fallback with **different schema** | **Prohibited** — approved file only |
| **R-AS-07** | Full normal dev flow **not released** | **AS** does not release |

---

## I. Current safe state

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Shadow migration dry-run** | **GREEN**（**R2**） |
| **Production migration applied** | **no** |
| **Migration file in repo** | **yes** — staged only |
| **Production auth compliance** | **RED** |
| **AL authorized** | **no** |
| **AX-PROD authorized** | **no** |
| **Full normal dev flow** | **NOT released** |

---

## J. Recommended next work while exception is active

| Priority | Gate / work | Notes |
|----------|-------------|-------|
| **1（recommended）** | **`5Z-I-V-AS-A`** — Release readiness immediate guardrail triage planning | Category 1 |
| **2** | Minimum error notification planning | Category 1 |
| **3** | AI prompt safety guard planning | Category 1 |
| **4** | Type-label mismatch diagnostic planning | Separate track |
| **5** | **`npm run audit` Background NoTouch** planning | Separate track |
| **6** | **`5Z-I-V-AX-PROD-FREE-FALLBACK-GOVERNANCE`** | **Only** if Human explicitly accepts no-project-backup risk |

**Default:** **Do not** use no-project-backup fallback now. Proceed with **release-readiness guardrail triage** and safe **Category 1** work until **Supabase paid backup** is available.

**Do not mix** these with auth correction execution.

---

## K. No-mutation statement

- **No** Production DB connection
- **No** Production apply
- **No** Production DB write
- **No** backup execution
- **No** SQL execution
- **No** table creation
- **No** RLS / policy application
- **No** **DROP TABLE**
- **No** mapping rows
- **No** resolver implementation
- **No** code change
- **No** raw key / secret / fragment recorded
- **No** full **user_id** / email / session recorded
- **No** Stripe IDs recorded
- **No** Clerk / Vercel / env / redeploy
- **No** auth / user migration
- **No** checkout / payment
- **No** **AL / AL-PRE**
- **No** full normal dev flow release

---

## L. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** under exception |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Stripe / webhook / payment** | **separate** |
| **Full normal dev flow** | **NOT released** |

---

## M. Next phase

| Priority | Gate |
|----------|------|
| **Recommended** | **`5Z-I-V-AS-A`** — Release readiness immediate guardrail triage planning |
| **Alternative** | **`5Z-I-V-AX-PROD-FREE-FALLBACK-GOVERNANCE`** — only if Human accepts no-project-backup risk |

---

## Files reviewed（read-only）

| Path |
|------|
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AX_PROD_BLOCKED_*.md` |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AX_PROD_PRE_*.md` |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AX_DRYRUN_R2_*.md` |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AJ_R_*.md` |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AO_*.md` |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AT_*.md` |
| `docs/ssot/M55_SYSTEM_SSOT.md` |
| `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md` |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AS-TEMPORARY-AUTH-COMPLIANCE-EXCEPTION-GOVERNANCE-001`** | **本条** |
