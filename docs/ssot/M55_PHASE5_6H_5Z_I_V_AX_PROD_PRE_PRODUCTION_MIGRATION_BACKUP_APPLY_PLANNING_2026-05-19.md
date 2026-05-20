# Phase 5-6H-5Z-I-V-AX-PROD-PRE — Production migration backup / apply planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AX-PROD-PRE** |
| **Title** | **Production migration backup / apply planning** |
| **Classification** | **Category 2 / Production migration backup + apply planning-only / docs-only / no Production apply** |
| **Verdict** | **`M55_USER_IDENTITY_MAPPINGS_PRODUCTION_MIGRATION_BACKUP_APPLY_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AX-PROD-PRE-PRODUCTION-MIGRATION-BACKUP-APPLY-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |

**AX-PROD-PRE is planning-only.** No Production DB connection, no backup execution, no SQL execution, no Production apply in this gate.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AX-DRYRUN-R2** | **`M55_USER_IDENTITY_MAPPINGS_MIGRATION_DRYRUN_REPLAY_GREEN_NO_PRODUCTION_APPLY`** | **`M55-EVID-20260519-5Z-I-V-AX-DRYRUN-R2-HUMAN-SHADOW-MIGRATION-DRYRUN-GREEN-RESULT-001`** | **`7829f92`** |
| **AX-FILE** | **`M55_USER_IDENTITY_MAPPINGS_MIGRATION_FILE_CREATION_ONLY_GREEN_NO_APPLY`** | **`M55-EVID-20260519-5Z-I-V-AX-FILE-…-001`** | **`db63cce`** |

| Field | Value |
|-------|--------|
| **Migration file** | **`supabase/migrations/20260519000000_m55_user_identity_mappings.sql`** |
| **Shadow dry-run target** | **`m55-soul-shadow`** / ref **`jonlynrbfveaprncyrmv`** |
| **m55-soul-core used in R2** | **no** |
| **Production used in R2** | **no** |
| **Shadow migration applied** | **yes** |
| **Shadow mapping_row_count** | **0** |
| **Production apply to date** | **no** |
| **AL authorized** | **no** |

---

## C. AX-PROD-PRE scope

### Allowed

| Item |
|------|
| Docs-only planning |
| Production backup checklist planning |
| Production apply checklist planning |
| Rollback checklist planning |
| Verification matrix planning |
| Human GO wording planning |
| Safe labels only — **no secrets** |

### Not allowed

| Item |
|------|
| Production DB connection |
| Backup execution |
| Production apply |
| SQL execution |
| DB write |
| Table creation in Production |
| RLS / policy application in Production |
| Mapping row creation |
| Resolver implementation |
| App code change |
| **AL / AL-PRE** restart |

---

## D. Production migration target definition（planning only — not applied）

| Field | Planned value |
|-------|----------------|
| **target_type** | **Production** |
| **project safe label** | **`m55-soul-core`** |
| **apply target** | **`public` schema** |
| **migration file** | **`supabase/migrations/20260519000000_m55_user_identity_mappings.sql`** |
| **expected new table** | **`public.m55_user_identity_mappings`** |
| **expected initial row count** | **0** |
| **existing artifact rows** | **must remain unchanged** |
| **resolver after apply** | **unused**（no code reads table until later gates） |

**Do not apply to this target in AX-PROD-PRE.**

### Repo migration inventory（read-only）

| Count | Detail |
|-------|--------|
| **10** | Files under **`supabase/migrations/`** |
| **Latest** | **`20260519000000_m55_user_identity_mappings.sql`** |
| **DDL scope** | **CREATE TABLE** + indexes + RLS + **REVOKE** on mapping table only |
| **Artifact tables** | **Not modified** by migration file |

---

## E. Backup prerequisites for future AX-PROD

Future Production apply **must not begin** until Human confirms **all** of the following outside SSOT:

| # | Prerequisite | Human confirms |
|---|--------------|----------------|
| 1 | **Production DB backup prepared** outside SSOT | **yes** |
| 2 | **backup method safe label** recorded | **`dashboard_backup`** / **`pg_dump`** / **`platform_snapshot`** / **`other_safe_label`** |
| 3 | **backup timestamp safe label** recorded（no secrets） | e.g. **`2026-05-19T12:00Z-prod-pre-ax`** |
| 4 | **restore / rollback route known** | **yes** |
| 5 | **current schema snapshot or migration history confirmed** | **yes** |
| 6 | **current Production artifact counts captured**（counts-only） | **yes** |
| 7 | **no raw DB credentials shared** in chat or SSOT | **yes** |

---

## F. Production pre-apply counts-only checklist

Before future **`5Z-I-V-AX-PROD`**, Human collects **integers only** on **`m55-soul-core`**（Dashboard SQL Editor or approved CLI — **no raw rows in SSOT**）:

| Field | Record as |
|-------|-----------|
| **entitlements_total** | integer |
| **entitlement_rights_total** | integer |
| **dtr_report_snapshots_total** | integer |
| **reply_ticket_wallets_total** | integer |
| **reply_wallet_ledgers_total** | integer |
| **one_time_fulfillments_total** | integer |
| **stripe_events_total** | integer |
| **failed_fulfillments_total** | integer |
| **`m55_user_identity_mappings` exists before apply** | **yes** / **no** / **unclear** |

**Expected before apply:** table **does not exist**（**no**）, or exists with **documented safe reason** in AX-PROD gate only.

**Reference shape:** AP-S-R aggregate inventory replay（**`5Z-I-V-AP-S-R`**）— use as **baseline comparison** after apply; do not paste full user rows.

**Counts-only SQL template（Production — Human executes, not AX-PROD-PRE）:**

```sql
SELECT 'entitlements' AS t, count(*)::bigint AS c FROM public.entitlements
UNION ALL SELECT 'entitlement_rights', count(*) FROM public.entitlement_rights
UNION ALL SELECT 'dtr_report_snapshots', count(*) FROM public.dtr_report_snapshots
UNION ALL SELECT 'reply_ticket_wallets', count(*) FROM public.reply_ticket_wallets
UNION ALL SELECT 'reply_wallet_ledgers', count(*) FROM public.reply_wallet_ledgers
UNION ALL SELECT 'one_time_fulfillments', count(*) FROM public.one_time_fulfillments
UNION ALL SELECT 'stripe_events', count(*) FROM public.stripe_events
UNION ALL SELECT 'failed_fulfillments', count(*) FROM public.failed_fulfillments;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'm55_user_identity_mappings'
) AS mapping_table_exists_before_apply;
```

---

## G. Future AX-PROD apply plan

Future **`5Z-I-V-AX-PROD`** must:

| Rule | Requirement |
|------|-------------|
| **Human GO** | **Explicit** — see §K template |
| **Scope wording** | **`GO for AX-PROD Production apply of m55_user_identity_mappings migration only`** |
| **Single migration file** | **`supabase/migrations/20260519000000_m55_user_identity_mappings.sql`** only |
| **Mapping rows** | **No INSERT** |
| **Artifact tables** | **No ALTER** on entitlements / snapshots / wallets / ledgers / OTF / stripe_events |
| **App deploy** | **no** |
| **Resolver** | **not enabled** |
| **Clerk / Vercel / Stripe** | **no changes** |
| **Checkout / payment** | **no** |
| **AL** | **not authorized** |
| **Dry-run link** | **AX-DRYRUN-R2 GREEN** required |

**Apply method（planning — Human chooses one at AX-PROD）:**

1. Official Supabase migration flow against **`m55-soul-core`** only, **or**
2. SQL Editor paste of **exact migration file content** once — after Dashboard project name / ref double-check

**Pre-apply Human double-check:**

- Dashboard project name **`m55-soul-core`** — **not** **`m55-soul-shadow`**
- Branch / environment label **Production** / **main** where applicable

---

## H. Future post-apply verification matrix

After future Production apply, record **yes/no** and **counts only**:

| Check | Expected |
|-------|----------|
| **table exists** | **yes** |
| **mapping_row_count** | **0** |
| **expected row count 0** | **yes** |
| **columns present** | **yes** |
| **constraints / indexes present** | **yes** |
| **RLS enabled** | **yes** |
| **anon read denied** | **yes** |
| **authenticated read denied** | **yes** |
| **service_role / admin read possible** | **yes** |
| **existing artifact counts unchanged** | **yes**（match §F pre-apply integers） |
| **app code changed** | **no** |
| **resolver implemented / used** | **no** |
| **DTR owned unlock remains GREEN** | **yes** / **not_checked** |
| **AC-P6 unpaid non-owned remains GREEN** | **yes** / **not_checked** |
| **Production auth compliance** | **RED** until later Clerk correction gates |

**Post-apply counts-only SQL（mirror shadow R2 + §F）:**

```sql
SELECT count(*) AS mapping_row_count FROM public.m55_user_identity_mappings;
-- repeat §F UNION for after-apply comparison
```

---

## I. Rollback / corrective migration plan

| Principle | Detail |
|-----------|--------|
| **Forward-only** | Supabase repo migrations are **forward-only** by convention |
| **No ad-hoc DROP** | Do not drop table manually in Production |
| **Corrective path** | Separate **corrective migration planning gate** if DDL rollback required |
| **0-row unused table** | Safest rollback if no security defect: **leave table in place**；resolver **off** |
| **Security defect** | If RLS / REVOKE unsafe → **STOP**；plan corrective migration |
| **Backup required** | Production backup **must exist** before any AX-PROD apply |

### Rollback levels（from AX-PRE / AW — reaffirmed）

| Level | Action |
|-------|--------|
| **L1** | Resolver feature **off**（default — table unused） |
| **L2** | Deprecate mapping rows — **no delete**（future; not in initial apply） |
| **L3** | Governance-gated **`DROP TABLE`** corrective migration |

---

## J. Stop conditions for future AX-PROD

Future Production apply **must STOP** if any of the following:

| # | Stop condition |
|---|----------------|
| 1 | **Backup not prepared** |
| 2 | **Restore route unclear** |
| 3 | **Exact Production target not confirmed** |
| 4 | **`m55-soul-core` / Production identity unclear** |
| 5 | **Migration history unclear** on Production |
| 6 | **Pre-apply artifact counts cannot be captured safely** |
| 7 | **Raw credentials would need to be pasted** into AI / SSOT |
| 8 | **Dry-run evidence cannot be linked** to **AX-DRYRUN-R2** |
| 9 | **Unexpected additional migration file** in repo |
| 10 | **App code changes pending** |
| 11 | **Resolver implementation bundled** with apply |
| 12 | **Human GO wording ambiguous** |
| 13 | **Production auth compliance correction attempted** in same gate |
| 14 | **AL / AL-PRE attempted** |
| 15 | **Wrong project**（shadow ref **`jonlynrbfveaprncyrmv`** or unknown ref） |

---

## K. Human GO template for future AX-PROD

```
5Z-I-V-AX-PROD Human GO

Raw credentials / raw ID / email / session / Stripe ID:
- shared: no

Backup:
- Production DB backup prepared outside SSOT:
- backup safe label:
- rollback route known:
- pre-apply artifact counts captured:
- restore route confirmed:

Target:
- target type: Production
- project safe label: m55-soul-core
- migration file:
  supabase/migrations/20260519000000_m55_user_identity_mappings.sql

Scope:
- apply migration only:
- insert mapping rows:
  no
- app code deploy:
  no
- resolver implementation:
  no
- Clerk/Vercel/Stripe changes:
  no
- AL authorized:
  no

Explicit GO:
- GO for AX-PROD Production apply of m55_user_identity_mappings migration only:
  yes / no
```

**Default:** **no Production apply** without **`yes`** on explicit GO line and all backup prerequisites §E satisfied.

---

## L. No-mutation statement（AX-PROD-PRE session）

- **No** Production DB connection
- **No** Production apply
- **No** Production DB write
- **No** backup execution
- **No** SQL execution
- **No** table creation
- **No** RLS / policy application
- **No** mapping rows
- **No** resolver implementation
- **No** code change
- **No** raw key / secret / fragment recorded
- **No** full **user_id** / email / session recorded
- **No** Stripe IDs recorded
- **No** Clerk Production instance creation
- **No** Clerk setting change
- **No** key generation / replacement
- **No** Vercel env change
- **No** redeploy
- **No** auth mutation
- **No** user creation / user migration
- **No** Stripe / webhook / checkout / payment
- **No** runner applying Production changes
- **No** AL / AL-PRE

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
| **AX-PROD-PRE authorizes AX-PROD or AL** | **no** |

---

## N. Next phase

| Priority | Gate | Notes |
|----------|------|-------|
| **1（recommended）** | **`5Z-I-V-AX-PROD`** | Human backup + explicit GO collection + Production apply **only** after §E–§K satisfied |
| **2（alternative）** | **`5Z-I-V-AS`** | Temporary auth compliance exception governance — defer Production DB migration |

**Do not perform AX-PROD in AX-PROD-PRE.**

### Gate chain status

| Phase | Status |
|-------|--------|
| **AX-FILE** | GREEN — file in repo |
| **AX-DRYRUN / R / R2** | R2 **GREEN** shadow |
| **AX-PROD-PRE** | **GREEN** planning（本条） |
| **AX-PROD** | **not authorized** |
| **AL** | **not authorized** |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AX-PROD-PRE-PRODUCTION-MIGRATION-BACKUP-APPLY-PLAN-001`** | **本条** |

---

## Files reviewed（read-only）

| Path | Role |
|------|------|
| `supabase/migrations/20260519000000_m55_user_identity_mappings.sql` | Target DDL |
| `supabase/migrations/*.sql`（10 files） | Repo migration chain |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AX_DRYRUN_R2_*.md` | Shadow GREEN evidence |
| `docs/ssot/M55_PHASE5_6H_5Z_I_V_AX_*` chain | Prior gates |
| `docs/ssot/M55_SYSTEM_SSOT.md` | System checkpoint |
| `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md` | Environment registry |

**No code edits. No DB commands.**
