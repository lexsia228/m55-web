# Phase 5-6H-5Z-I-V-CORE-DTR-VERIFY-B — Counts-only preflight（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-VERIFY-B** |
| **Title** | **CORE-DTR verification counts-only preflight** |
| **Classification** | **Category 1 / Production DB counts-only / no checkout** |
| **Verdict** | **`CORE_DTR_VERIFY_B_BLOCKED_PENDING_HUMAN_COUNTS_POLL`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-VERIFY-B-001`** |
| **Date** | **2026-05-21** |
| **Environment safe label** | **`m55-soul-core`** |
| **Prior planning** | **`bd9d69a`** — CORE-DTR-VERIFY-PLANNING-COMMIT |

**Agent:** no Production DB credentials in workspace（no `.env.local`；no shell Supabase env）— **live counts not executed**.

---

## B. Live counts（Human poll required）

| Metric | Live value | Source |
|--------|------------|--------|
| `failed_fulfillments_total` | **pending** | Human runs §D SQL |
| `failed_fulfillments_24h` | **pending** | **STOP if > 0** |
| failure category counts | **pending** | GROUP BY `failure_reason` |
| `entitlements_dtr_total` | **pending** | |
| `dtr_report_snapshots_dtr_total` | **pending** | |
| `one_time_fulfillments_total` | **pending** | |
| `reply_ticket_wallets_total` | **pending** | |
| `reply_wallet_ledgers_total` | **pending** | |
| `nonnull_engine_context_json_count` | **pending** | expect **0** |
| `nonnull_engine_version_count` | **pending** | expect **0** |
| `legacy_engine_*_null_count` | **pending** | expect **= snapshot total** |

**To close GREEN:** Human runs SQL → records integers in **CORE-DTR-VERIFY-B-R**（no raw rows）.

---

## C. Stale reference only（not authoritative for VERIFY-B）

**Do not use for VERIFY-C GO** — last Human counts **2026-05-20**（AS-B1-MONITOR-R5）+ DDL postflight **2026-05-21**（B3-D-R）:

| Metric | Stale reference | Notes |
|--------|-----------------|-------|
| `failed_fulfillments_total` | **7** | MONITOR-R5 |
| `failed_fulfillments_24h` | **0** | MONITOR-R5 — **must re-poll** |
| `internal_processing_failed` | **6** | |
| `missing_client_reference_id` | **1** | |
| `other/unknown` | **0** | |
| `entitlements_dtr_total` | **10** | |
| `dtr_report_snapshots_dtr_total` | **6** | |
| `one_time_fulfillments_total` | **10** | |
| `reply_ticket_wallets_total` | **10** | |
| `reply_wallet_ledgers_total` | **17** | |
| `nonnull_engine_*` | **0 / 0** | B3-D-R post-DDL |
| `legacy null` | **6 / 6** | matches snapshot total **6** |

**Production deploy @ `6134048`（2026-05-21）** did not require snapshot mutation per EXEC/Human smoke.

---

## D. SQL artifact（Human execution）

**File:** `scripts/sql/production/m55_core_dtr_verify_b_counts_only_preflight_v1.sql`

**Rules:** SELECT aggregates only；no DML；no `SELECT *`；no paste of `raw_metadata` / user_id / session / Stripe IDs.

---

## E. STOP / pass criteria（normative）

| Check | Pass | BLOCK |
|-------|------|-------|
| `failed_fulfillments_24h` | **= 0** | **> 0** |
| New unknown `failure_reason` | none vs baseline §C | new category |
| `dtr_report_snapshots_total` | stable vs B3-D-R **6** unless explained | drop without gate |
| `nonnull_engine_*` | **0** | **> 0** without ENGINE-ENV-GO |
| Legacy NULL | **all rows NULL** on v2 columns | partial nonnull on old rows |
| v2 fulfillment flag | **off**（code default） | ON without GO |
| Snapshot mutation | none | UPDATE/DELETE suspicion |

---

## F. Agent attestation（no DB）

| Item | Status |
|------|--------|
| checkout / payment / webhook | **no** |
| Production DB write / SQL DML | **no** |
| env / flag change | **no** |
| VERIFY-C execution | **no** |
| raw ID / email / session / secret | **not recorded** |

---

## G. Result classification

| Result | When |
|--------|------|
| **GREEN** | Human poll：§E all pass |
| **BLOCKED** | **this gate** — no live poll |
| **RED** | `failed_fulfillments_24h > 0` or nonnull engine spike or snapshot count drop |

**Current:** **BLOCKED** pending Human counts.

---

## H. Next gate

| Priority | Gate |
|----------|------|
| **1** | Human runs §D SQL on **m55-soul-core** |
| **2** | **CORE-DTR-VERIFY-B-R** — record counts → **GREEN** or **RED** |
| **3** | **CORE-DTR-VERIFY-A-EXEC**（pre-purchase UI）or **VERIFY-C planning** after **B-R GREEN** |

**Not next:** VERIFY-C checkout until **B-R GREEN**.

---

## I. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Agent BLOCKED — SQL script published |
