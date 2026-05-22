# Phase 5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R1 — Post soft-hide operational counts-only monitor（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R1** |
| **Title** | **Post soft-hide release readiness operational monitor** |
| **Classification** | **Category 1 / counts-only monitor / no-mutation** |
| **Verdict** | **`RELEASE_READINESS_OPS_MONITOR_R1_BLOCKED_PENDING_HUMAN_COUNTS_POLL`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R1-001`** |
| **Date** | **2026-05-21** |
| **Prior handoff** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_RELEASE_READINESS_RETURN_NOT_A_BLOCKER`** @ **`f74fec5`** |
| **Production app commit** | **`0e9597c`** |
| **Target safe label** | **`m55-soul-core`** |
| **Production used** | **yes**（intended — poll pending） |
| **Agent DB execution** | **no** — workspace has no Production DB credentials |

**Live Production counts not executed in this gate.** Human must run SQL once in Supabase SQL Editor on **`m55-soul-core`**, then open **`RELEASE-READINESS-OPS-MONITOR-R1-R`** with metric values only.

---

## B. Human execution packet

| Item | Value |
|------|--------|
| **Script** | `scripts/sql/production/m55_release_readiness_ops_monitor_r1_counts_only_v1.sql` |
| **Dashboard project** | **`m55-soul-core`** — **not** `m55-soul-shadow` |
| **Query type** | counts-only / aggregate-only |
| **`SELECT *`** | **forbidden** |
| **DML** | **forbidden** |

---

## C. Live metrics（pending Human poll）

| Metric | Value |
|--------|-------|
| **failed_fulfillments_total** | **pending** |
| **failed_fulfillments_24h** | **pending** |
| **failed_internal_processing_failed** | **pending** |
| **failed_missing_client_reference_id** | **pending** |
| **failed_other** | **pending** |
| **entitlements_dtr_total** | **pending** |
| **dtr_report_snapshots_dtr_total** | **pending** |
| **dtr_report_snapshots_visible_total** | **pending** |
| **dtr_report_snapshots_hidden_total** | **pending** |
| **user_hidden_at_nonnull_count** | **pending** |
| **one_time_fulfillments_total** | **pending** |
| **reply_ticket_wallets_total** | **pending** |
| **reply_wallet_ledgers_total** | **pending** |
| **user_hidden_at_exists** | **pending** |
| **user_hidden_source_exists** | **pending** |
| **user_hidden_reason_exists** | **pending** |
| **partial_unique_index_exists** | **pending** |
| **visible_duplicate_user_product_pairs** | **pending** |

### Operational（pending Human attestation after poll）

| Check | Value |
|-------|-------|
| **active_bleeding** | **pending** |
| **new_failure_category** | **pending** |
| **current_paid_not_unlocked** | **pending** |
| **support_visible_issue** | **pending** |
| **unintended_delete_observed** | **pending** |
| **unintended_checkout_payment_observed** | **pending** |
| **manual_mutation** | **no**（gate） |

---

## D. Stale reference only（do not use as GREEN — re-poll required）

| Metric | Reference source | Value |
|--------|------------------|------:|
| **failed_fulfillments_total** | AS-B1-R / MONITOR-R5 | **7** |
| **failed_fulfillments_24h** | AS-B1-R / C-R | **0** |
| **internal_processing_failed** | AS-B1-R | **6** |
| **missing_client_reference_id** | AS-B1-R | **1** |
| **entitlements_dtr_total** | MONITOR-R5 | **10** |
| **dtr_report_snapshots_dtr_total** | C-D-R postflight | **6** |
| **user_hidden_at_nonnull** | C-D-R postflight | **0** |
| **visible_duplicate** | C-D-R postflight | **0** |
| **user_hidden_* exists** | C-D-R postflight | **1** each |
| **partial_unique_index** | C-D-R postflight | **1** |

**Note:** Post-deploy Human smokes may have increased **hidden** snapshot counts; artifact totals may drift from MONITOR-R5. **Stale ref is not a substitute for R1 poll.**

---

## E. GREEN / STOP criteria（for R1-R）

| Condition | GREEN | STOP / RED |
|-----------|-------|------------|
| **failed_fulfillments_24h** | **= 0** | **> 0** |
| **visible_duplicate_user_product_pairs** | **= 0** | **> 0** |
| **user_hidden_* columns** | each **= 1** | any **= 0** |
| **partial_unique_index_exists** | **= 1** | **= 0** |
| **active_bleeding** | **no** | **yes** |
| **paid-not-unlocked** | **no** | **yes** |
| **unintended delete / checkout / payment** | **no** | **yes** |

---

## F. Formal HOLD（unchanged）

| Item | Status |
|------|--------|
| 本番削除実行 | **HOLD** |
| live repurchase checkout | **HOLD** |
| payment / webhook replay | **HOLD** |
| VERIFY-C | **HOLD** |
| DB SQL write / env変更 | **HOLD** unless incident |

---

## G. No-mutation（this gate）

| Action | Status |
|--------|--------|
| 本番削除実行 | **no** |
| live checkout / payment / webhook | **no** |
| manual DB SQL write | **no** |
| env change | **no** |
| deploy / main push | **no** |
| VERIFY-C | **no** |
| raw ID / email / session / secret | **no** |

---

## H. Next

| Outcome | Next gate |
|---------|-----------|
| **BLOCKED**（this gate） | Human poll → **`5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R1-R`** |
| **GREEN** @ R1-R | Continue **release readiness / AS-B1-MONITOR cadence** |
| **PARTIAL / RED** @ R1-R | Diagnostic planning only — no repair without separate Human GO |

---

## I. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Agent blocked — pending Human counts |
