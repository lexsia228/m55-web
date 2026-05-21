# Phase 5-6H-5Z-I-V-ENGINE-IMPL-B3-C — Production migration apply planning（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-IMPL-B3-C** |
| **Title** | **Composite astrology v2 additive migration Production apply planning** |
| **Classification** | **Category 2 / Production apply planning-only / docs-only / no apply** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_PRODUCTION_MIGRATION_APPLY_PLANNING_GREEN_NO_APPLY`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-IMPL-B3-C-PRODUCTION-MIGRATION-APPLY-PLANNING-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Prior** | **ENGINE-IMPL-B3-B-R** GREEN |

**B3-C is planning-only.** No Production DB connection, no backup execution, no DDL apply in this gate.

---

## B. Prior shadow proof（B3-B-R）

| metric | shadow value |
|--------|-------------:|
| snapshot row count | **2** |
| `engine_context_json` exists post-apply | **1** |
| `engine_version` exists post-apply | **1** |
| nullable | **YES / YES** |
| legacy NULL count | **2 / 2** |
| nonnull v2 count | **0 / 0** |

**Shadow target:** `m55-soul-shadow` / ref `jonlynrbfveaprncyrmv` — **not** used in Production apply.

---

## C. Production target definition（planning — not applied）

| Field | Value |
|-------|--------|
| **target safe label** | **`m55-soul-core`** |
| **environment** | **PRODUCTION / main** |
| **schema** | **`public`** |
| **table** | **`dtr_report_snapshots`** |
| **migration file** | `supabase/migrations/20260601000000_dtr_report_snapshots_engine_context.sql` |
| **apply SQL file（B3-D）** | `scripts/sql/production/m55_engine_v2_dtr_report_snapshots_engine_context_production_apply_verify_v1.sql` |
| **preflight-only file** | `scripts/sql/production/m55_engine_v2_dtr_report_snapshots_engine_context_production_preflight_v1.sql` |

**Forbidden apply target:** `m55-soul-shadow`, ref `jonlynrbfveaprncyrmv`, Preview-only DB mislabel.

---

## D. Apply SQL confirmation（normative）

Executable DDL **must equal** repo migration:

```sql
ALTER TABLE public.dtr_report_snapshots
  ADD COLUMN IF NOT EXISTS engine_context_json jsonb NULL,
  ADD COLUMN IF NOT EXISTS engine_version text NULL;
-- + COMMENT ON COLUMN (both)
-- + NOTIFY pgrst, 'reload schema';
```

| Rule | Status |
|------|--------|
| Additive `ADD COLUMN IF NOT EXISTS` only | **yes** |
| Both columns **NULL** allowed | **yes** |
| No `DEFAULT` on columns | **yes** |
| No `NOT NULL` | **yes** |
| No `UPDATE` / `DELETE` / `DROP` / `TRUNCATE` | **yes** |
| No triggers altering rows | **yes** |
| Mixed DML in same session | **forbidden** |

**Do not use** `scripts/sql/staging/m55_engine_v2_*_shadow_*.sql` on Production.

---

## E. Production preflight template

**File:** `scripts/sql/production/m55_engine_v2_dtr_report_snapshots_engine_context_production_preflight_v1.sql`

**Human records metrics only**（no raw rows）:

| metric | Pre-apply PASS |
|--------|----------------|
| `PREFLIGHT_dtr_report_snapshots_table_exists` | **1** |
| `PREFLIGHT_engine_context_json_exists` | **0** |
| `PREFLIGHT_engine_version_exists` | **0** |
| `PREFLIGHT_snapshot_row_count` | **N**（integer を記録） |
| `PREFLIGHT_entitlements_count` | baseline integer |
| `PREFLIGHT_entitlement_rights_count` | baseline integer |
| `PREFLIGHT_reply_ticket_wallets_count` | baseline integer |

**Re-run preflight immediately before B3-D apply**（当日ベースライン）。

---

## F. Expected post-apply metrics（B3-D）

Let **N** = `PREFLIGHT_snapshot_row_count` recorded at apply time.

| metric | Expected |
|--------|----------|
| `POSTFLIGHT_snapshot_row_count` | **= N** |
| `POSTFLIGHT_engine_context_json_exists` | **1** |
| `POSTFLIGHT_engine_version_exists` | **1** |
| `POSTFLIGHT_engine_context_json_nullable` | **YES** |
| `POSTFLIGHT_engine_version_nullable` | **YES** |
| `POSTFLIGHT_legacy_engine_context_json_null_count` | **= N** |
| `POSTFLIGHT_legacy_engine_version_null_count` | **= N** |
| `POSTFLIGHT_nonnull_engine_context_json_count` | **0** |
| `POSTFLIGHT_nonnull_engine_version_count` | **0** |

**Interpretation:** same as shadow — legacy fork intact until v2 fulfillment writes new rows.

---

## G. STOP conditions（apply 中止）

| # | Condition | Action |
|---|-----------|--------|
| **S1** | Dashboard project is **`m55-soul-shadow`** or ref **`jonlynrbfveaprncyrmv`** | **STOP** |
| **S2** | `PREFLIGHT_engine_*_exists` **= 1** without approved recovery gate | **STOP** |
| **S3** | `dtr_report_snapshots` table missing | **STOP** |
| **S4** | Preflight not re-run same day as apply | **STOP** |
| **S5** | Backup safe label / timestamp not recorded outside SSOT | **STOP** |
| **S6** | SQL session mixes other DDL/DML | **STOP** |
| **S7** | Any `UPDATE`/`DELETE` on `dtr_report_snapshots` planned in same window | **STOP** |
| **S8** | `POSTFLIGHT_snapshot_row_count` ≠ **N** | **STOP** — incident |
| **S9** | `POSTFLIGHT_nonnull_*` > 0 immediately after DDL-only apply | **STOP** — unexpected write |
| **S10** | `POSTFLIGHT_legacy_*_null_count` < **N** | **STOP** |
| **S11** | Column exists but `is_nullable` ≠ YES | **STOP** |
| **S12** | B3-C / B3-B-R not GREEN | **STOP** |
| **S13** | Production adequacy cutover requested in same window | **STOP** — schema-only gate |

---

## H. Rollback plan（read-path first）

| Tier | Action |
|------|--------|
| **R1（preferred）** | **No column drop.** App continues legacy fork: `engine_version IS NULL` → provisional reader. |
| **R2** | If v2 rows exist（nonnull > 0）: **do not DROP** without data migration gate. |
| **R3** | Column drop only if **zero** nonnull rows + explicit Human GO + backup restored path documented. |
| **R4** | Restore from backup if DDL corrupted schema（org policy） |

**Forbidden rollback:** mass `UPDATE` legacy snapshots to fabricate v2 metadata.

---

## I. Backup prerequisites（B3-D 前・Human 外 SSOT）

| # | Prerequisite |
|---|--------------|
| 1 | Production DB backup prepared |
| 2 | `backup_method_safe_label` recorded |
| 3 | `backup_timestamp_safe_label` recorded |
| 4 | Restore route known |
| 5 | Migration history / schema snapshot confirmed |
| 6 | §E preflight integers captured |
| 7 | No secrets in chat/SSOT |

**Note:** Supabase Free plan backup limitations per **`M55_PHASE5_6H_5Z_I_V_AX_PROD_BLOCKED_SUPABASE_FREE_PLAN_BACKUP_LIMITATION`** — Human acknowledges before GO.

---

## J. Human GO checklist（B3-D execution）

| # | Item | ☐ |
|---|------|---|
| 1 | **B3-B-R** GREEN confirmed | |
| 2 | **B3-C** planning GREEN confirmed | |
| 3 | Target Dashboard = **`m55-soul-core`**（**not** shadow） | |
| 4 | Backup completed + safe labels recorded | |
| 5 | `production_preflight_v1.sql` PASS（exists=0, table=1） | |
| 6 | **N** = snapshot row count recorded | |
| 7 | Apply file = **production_apply_verify_v1.sql** OR exact repo migration only | |
| 8 | No other SQL in session | |
| 9 | Postflight metrics recorded（§F） | |
| 10 | **No** deploy / **no** fulfillment code change in same window | |
| 11 | **No** snapshot UPDATE/DELETE | |
| 12 | **No** Stripe / Clerk / Slack changes | |
| 13 | Explicit wording: **`GO for ENGINE-IMPL-B3-D Production DDL-only apply of dtr_report_snapshots engine columns only`** | |

---

## K. Runtime impact boundary（B3-D）

| Area | B3-D DDL-only window |
|------|----------------------|
| **App code** | **unchanged** — no reader uses new columns until later IMPL gates |
| **Fulfillment** | **unchanged** — no v2 writes until B4+ |
| **`/core` / `/dtr/core`** | **unchanged** |
| **Production adequacy** | **remains BLOCKED** |
| **CORE-DTR-VERIFY** | **remains HOLD** |

---

## L. No-mutation（B3-C gate）

| Boundary | Status |
|----------|--------|
| Production apply | **no** |
| Production DB write | **no** |
| shadow DB | **no touch** |
| snapshot UPDATE/DELETE | **no** |
| deploy / env / payment | **no** |

---

## M. Next gate

**ENGINE-IMPL-B3-D** — execution packet（Human apply）→ **B3-D-R** metrics → GREEN
