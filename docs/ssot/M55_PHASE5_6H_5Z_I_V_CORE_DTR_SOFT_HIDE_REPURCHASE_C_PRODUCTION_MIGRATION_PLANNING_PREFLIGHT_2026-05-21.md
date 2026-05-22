# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C — Production migration planning + preflight（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C** |
| **Title** | **Production soft-hide migration planning and preflight** |
| **Classification** | **Category 2 / Production planning + preflight protocol / no-apply** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_C_PRODUCTION_PREFLIGHT_PLANNING_GREEN_NO_APPLY_PENDING_HUMAN_COUNTS`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-C-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **B3-R-COMMIT** @ **`04f466b`** — shadow apply GREEN |
| **Production apply** | **not authorized** in this gate |
| **VERIFY-C** | **HOLD**（orthogonal） |

**Agent:** no **m55-soul-core** credentials — Production counts **pending Human** run of preflight SQL → **C-R** gate.

---

## B. Prior shadow proof（B3-R — not Production）

| Check | Shadow value |
|-------|-------------:|
| **target** | **m55-soul-shadow** |
| **user_hidden_* post-apply** | **1 / 1 / 1** |
| **partial_unique_index_exists** | **1** |
| **total_snapshot_rows** | **2**（limited fixture） |
| **legacy_duplicate** | **0** |
| **user_hidden_at_nonnull_count** | **0** |

**Shadow success does not authorize Production apply without this gate’s Production preflight + separate Human GO.**

---

## C. Production target（planning only）

| Field | Value |
|-------|--------|
| **safe label** | **m55-soul-core** |
| **environment** | **Production** |
| **table** | **`public.dtr_report_snapshots`** |
| **migration file** | `supabase/migrations/20260615000000_dtr_report_snapshots_soft_hide_repurchase.sql` |
| **preflight SQL** | `scripts/sql/production/m55_soft_hide_repurchase_b1_preflight_v1.sql` |
| **future apply script（C-D）** | Adapt `scripts/sql/staging/m55_soft_hide_repurchase_b3_shadow_apply_verify_v1.sql` → Production packet（Human GO） |

**Forbidden target:** m55-soul-shadow, Preview DB, wrong project ref.

---

## D. Human preflight procedure

| Step | Action |
|------|--------|
| **1** | Supabase Dashboard → **m55-soul-core** only |
| **2** | SQL Editor → run **entire** `m55_soft_hide_repurchase_b1_preflight_v1.sql` |
| **3** | Copy **metric / value** rows only into **C-R** SSOT（no raw rows） |
| **4** | Classify readiness per §F |
| **5** | **Do not** run migration DDL in C gate |

---

## E. Production preflight metrics（Human — fill in C-R）

| Metric | Value（C gate） | PASS heuristic（pre-apply） |
|--------|-----------------|---------------------------|
| **total_snapshot_rows** | **pending** | record only |
| **dtr_core_snapshot_rows** | **pending** | record only |
| **legacy_duplicate_user_product_pairs** | **pending** | **must be 0** |
| **unique_constraint_or_index_detected** | **pending** | **must be ≥ 1** |
| **user_hidden_at_exists** | **pending** | **0**（not yet applied） |
| **user_hidden_source_exists** | **pending** | **0** |
| **user_hidden_reason_exists** | **pending** | **0** |
| **partial_unique_index_exists** | **pending** | **0** pre-apply |
| **product_label_exists** | **pending** | informational |
| **engine_context_json_exists** | **pending** | informational |
| **engine_version_exists** | **pending** | informational |
| **engine_context_json_nonnull_count** | **pending** | informational |
| **engine_version_nonnull_count** | **pending** | informational |
| **engine_context_json_null_count** | **pending** | informational |
| **engine_version_null_count** | **pending** | informational |

**Stale reference（VERIFY-B planning 2026-05-21 — reconcile in C-R）：** Production **`dtr_report_snapshots_dtr_total`** historically **6**；**`failed_fulfillments_24h`** must be **0** before apply（ops policy）.

---

## F. Apply readiness classification（post-preflight）

| Class | Conditions | Next |
|-------|------------|------|
| **`READY_FOR_PRODUCTION_APPLY_PENDING_HUMAN_GO`** | `legacy_duplicate=0` · `unique_constraint≥1` · `user_hidden_*=0` · `partial_unique=0` · ops failed_24h=0 | **C-D** apply after explicit **`CORE-DTR-SOFT-HIDE-REPURCHASE-C-APPLY go`** |
| **`ALREADY_APPLIED_NOOP`** | `user_hidden_at_exists=1` · `partial_unique_index_exists=1` | **STOP** re-apply；verify post-state only |
| **`BLOCKED_DUPLICATE_PAIRS`** | `legacy_duplicate_user_product_pairs > 0` | **STOP** — remediate before DDL |
| **`BLOCKED_NO_LEGACY_UNIQUE`** | `unique_constraint_or_index_detected = 0` | **STOP** — schema drift；investigate |
| **`BLOCKED_INCONSISTENT_HIDE_STATE`** | partial `user_hidden_*` exists（e.g. at=1, source=0） | **STOP** — manual ops review |
| **`BLOCKED_OPS_BLEED`** | `failed_fulfillments_24h > 0` | **STOP** — per ops policy |

**This C gate verdict:** planning GREEN；readiness class **pending** until C-R metrics filed.

---

## G. STOP conditions（absolute）

| ID | Condition |
|----|-----------|
| **S1** | `legacy_duplicate_user_product_pairs > 0` |
| **S2** | `unique_constraint_or_index_detected = 0`（pre-apply） |
| **S3** | Inconsistent `user_hidden_*` column presence |
| **S4** | `SELECT *` or raw row export in ticket |
| **S5** | Execute Production migration in **C** or **C-R** gate |
| **S6** | checkout / payment / webhook / env / deploy / main |
| **S7** | Conflate with **CORE-DTR-VERIFY-C** |
| **S8** | `failed_fulfillments_24h > 0`（Human ops check） |

---

## H. Production apply DDL（reference — C-D only）

**Normative:** identical to shadow B3 PART 2 / repo migration:

- `ADD COLUMN` ×3（`user_hidden_at`, `user_hidden_source`, `user_hidden_reason`）
- `DROP CONSTRAINT` legacy `(user_id, product_id)` unique
- `CREATE UNIQUE INDEX … WHERE (user_hidden_at IS NULL)`
- `NOTIFY pgrst, 'reload schema'`
- **No** `UPDATE` envelope/profile/engine columns

---

## I. No-mutation statement（C gate）

| Action | Status |
|--------|--------|
| Production migration apply | **no** |
| Production DB write（agent） | **no** |
| m55-soul-core connection（agent） | **no** |
| checkout / payment / webhook | **no** |
| deploy / main / env | **no** |
| **VERIFY-C** | **no** |

---

## J. Next gates

| Priority | Gate |
|----------|------|
| **1** | **CORE-DTR-SOFT-HIDE-REPURCHASE-C-R** — Human Production preflight counts → readiness class |
| **2** | **CORE-DTR-SOFT-HIDE-REPURCHASE-C-COMMIT** — commit C + C-R SSOT |
| **3** | **CORE-DTR-SOFT-HIDE-REPURCHASE-C-D** — Production apply + verify（separate **`…C-APPLY go`**） |
| **4** | **SOFT-HIDE-D+** — app code after Production schema GREEN |

---

## K. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | C planning；metrics pending Human C-R |
