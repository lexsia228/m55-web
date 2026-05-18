# Phase 5-6H-5Z-I-V-R — Product / right / snapshot read-only SELECT gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-R Product / right / snapshot read-only SELECT gate**

本条は **`5Z-I-V-Q`** 後の **Human-local Production `SELECT` read-only** 証跡固定。**DB write・runner・env 変更・redeploy・code 変更・OTF cleanup・entitlement/snapshot mutation なし**。**通常開発フロー解放なし**。

**Evidence update（追認）：** 初回 **`PRODUCT_RIGHT_SNAPSHOT_SELECT_INCONCLUSIVE`**（commit **`0ad7e8e`**）→ 本条 **Human SELECT 提出後** 同一 Evidence ID で更新。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-Q`** | **`OWNERSHIP_GATE_READONLY_DIAGNOSTIC_GREEN_DB_KEY_CONFIRMATION_REQUIRED`** |
| **UI user** | **`human-ui-current-user`** — suffix **`user_****1M65`** |
| **UI unlock** | **still blocked**（Human UI observation — prior gates） |
| **本条** | **Human-local SELECT submitted — verdict updated** |

**Work anchors：**

| Commit | Role |
|--------|------|
| **`0ad7e8e6635514f465bd38ff16f2f6abc0973175`** | initial **INCONCLUSIVE** |
| **（本条追認 commit）** | Human SELECT **GREEN with caveat** |

**Agent：** Production **`SELECT` 未実行**（Human-local only）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-R-PRODUCT-RIGHT-SNAPSHOT-READONLY-SELECT-001`** | **本条**（追認更新） |
| **`M55-EVID-20260518-5Z-I-V-Q-OWNERSHIP-GATE-READ-PATH-READONLY-DIAGNOSTIC-001`** | repo gate trace |
| **`M55-EVID-20260518-5Z-I-V-O-HUMAN-UI-USER-ROWCOUNT-READONLY-SELECT-001`** | row_count baseline |

**Full `user_id`／email／session／raw keys／secrets：** **記録しない**。

---

## 4. Human-local SELECT summary（redacted）

| Field | Value |
|-------|--------|
| **safe label** | **`human-ui-current-user`** |
| **suffix evidence only** | **`user_****1M65`** |
| **full user_id in SSOT** | **no** |
| **full IDs / secrets / session shared** | **no** |
| **SELECT executed by Human** | **yes**（本条追認） |
| **Agent Production SELECT** | **no** |

---

## 5. Product / right / snapshot / OTF result（matched / mismatch）

**Gate constants（repo — `5Z-I-V-Q`）：**

| Constant | Expected |
|----------|----------|
| **`product_id`** | **`DTR_CORE_STATIC_V1`** |
| **`right_key`** | **`m55_p:core_origin`** |
| **`entitlements.status`** | **`active`**（payment backing / repair path） |

### A. `entitlements`（UI user / `DTR_CORE_STATIC_V1`）

| Check | Result |
|-------|--------|
| **row_count（`5Z-I-V-R`）** | **0** |
| **`product_ids`** | **null** |
| **`statuses`** | **null** |
| **`grant_types`** | **null** |
| **`sources`** | **null** |
| **`active` status matched** | **no** |

### B. `entitlement_rights`（UI user）

| Check | Result |
|-------|--------|
| **row_count** | **1** |
| **`right_keys`** | **`m55_p:core_origin`** |
| **includes `m55_p:core_origin`** | **yes** — **matched** |
| **`right_value` safe summary** | **not collected / unclear** |

### C. `dtr_report_snapshots`（UI user / `DTR_CORE_STATIC_V1`）

| Check | Result |
|-------|--------|
| **row_count** | **1** |
| **`product_ids`** | **`DTR_CORE_STATIC_V1`** — **matched** |
| **exactly one row** | **yes** |
| **snapshot row present** | **yes** |
| **`id` valid-looking** | **unclear**（not collected） |
| **envelope parse safety** | **unclear**（SQL-only） |

### D. `one_time_fulfillments`（UI user）

| Check | Result |
|-------|--------|
| **row_count** | **4** |
| **`product_ids`（aggregate）** | **`DTR_CORE_STATIC_V1`** |
| **latest row `product_id` = `DTR_CORE_STATIC_V1`** | **yes** — **matched** |
| **latest `fulfilled_at` presence** | **present** |
| **multiple rows** | **yes** — **no mutation** |

### E. Gate simulation（repo order — `5Z-I-V-Q`）

| Step | Would fire? | Notes |
|------|-------------|-------|
| **1 snapshot → owned** | **should apply** if runtime `getDtrReportSnapshot` succeeds | DB row **present** |
| **2 rights + ent active backing** | **no** | **no active entitlement row** |
| **2 rights + OTF backing** | **should apply** | **right_key matched** + **latest OTF DTR** |
| **2c rights orphan → locked** | **no**（if OTF backing visible to gate） | OTF latest **matched** |
| **3 active ent → repair + owned** | **no** | **entitlements row_count 0** |
| **4 else locked** | **only if** snapshot read fails **and** OTF path not reached | — |

**Interpretation（固定）：**

| Finding | Status |
|---------|--------|
| **`right_key` matched** | **yes** |
| **snapshot row exists（exactly one）** | **yes** |
| **OTF latest backing matched** | **yes** |
| **active entitlement for `DTR_CORE_STATIC_V1`** | **not found**（**`5Z-I-V-R` query**） |
| **UI still locked** | **snapshot lookup / route read-path remains suspect** even if DB artifacts suggest gate **should** reach **owned** via snapshot or rights+OTF |

---

## 6. Evidence caveat — `5Z-I-V-O` vs `5Z-I-V-R` entitlement discrepancy

| Gate | **entitlements** `DTR_CORE_STATIC_V1` **row_count** |
|------|-----------------------------------------------------|
| **`5Z-I-V-O`** | **1** |
| **`5Z-I-V-R`** | **0** |

| Token | Applied |
|-------|---------|
| **`V_O_V_R_ENTITLEMENT_ROWCOUNT_DISCREPANCY_REQUIRES_CONFIRMATION`** | **yes** |

**Policy：** **repair・entitlement 付与・mutation 禁止** until discrepancy **confirmed**（filter difference / timing / subject scope — **Human follow-up in `5Z-I-V-S`**）。

**Do not conclude：** missing entitlement is definitively the sole runtime blocker **without** reconciling O vs R.

---

## 7. Root cause classification

| Field | Value |
|-------|--------|
| **primary** | **`PRODUCT_RIGHT_SNAPSHOT_SELECT_GREEN_ENTITLEMENT_STATUS_MISMATCH_CONFIRMED`** |
| **secondary** | **`SNAPSHOT_LOOKUP_OR_ROUTE_READ_PATH_STILL_SUSPECT`** |
| **evidence caveat** | **`V_O_V_R_ENTITLEMENT_ROWCOUNT_DISCREPANCY_REQUIRES_CONFIRMATION`** |
| **rejected primary** | **`OWNERSHIP_GATE_RIGHT_KEY_MISMATCH`**（**`m55_p:core_origin` present**） |
| **rejected primary** | **`OTF_LATEST_BACKING_MISMATCH`**（latest OTF **matched**） |
| **rejected primary** | **`USER_ID_MISMATCH`**（**`5Z-I-V-O`** row_count basis） |

---

## 8. Recommended next action

| Field | Value |
|-------|--------|
| **recommended** | **`Phase 5-6H-5Z-I-V-S` Entitlement row discrepancy / ownership fallback diagnostic planning gate** |
| **`5Z-I-V-S` must** | confirm **O=1 vs R=0**；inspect **rights + OTF + snapshot** fallback；**no DB write / no repair / no OTF cleanup** |
| **if snapshot/route confirmed after S** | **`READY_FOR_SNAPSHOT_LOOKUP_OR_ROUTE_READ_PATH_CODE_FIX_PLANNING_GATE`** |
| **deferred until O/R reconciled** | any **entitlement repair / grant** |

---

## 9. 判定

| Field | Value |
|-------|--------|
| **Gate verdict（updated）** | **`PRODUCT_RIGHT_SNAPSHOT_SELECT_GREEN_ENTITLEMENT_STATUS_MISMATCH_CONFIRMED_WITH_EVIDENCE_CAVEAT`** |
| **Prior verdict** | **`PRODUCT_RIGHT_SNAPSHOT_SELECT_INCONCLUSIVE`** |

---

## 10. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-S` Entitlement row discrepancy / ownership fallback diagnostic planning gate**
  - why **`5Z-I-V-O`** ent **1** vs **`5Z-I-V-R`** ent **0**
  - ownership fallback with **right_key + OTF + snapshot** present
  - decide: entitlement missing vs snapshot lookup failure vs route/read-path logic
  - **no mutation until explicit GO**

**Still blocked：** normal dev flow full release／production auth compliance／entitlement grant／OTF cleanup.

---

## 11. 未実行事項

- **DB write / runner / env / redeploy / deletion / code change**
- **OTF cleanup / entitlement / snapshot mutation**
- **full IDs / secrets / session in SSOT**
- **normal dev flow release**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_R_PRODUCT_RIGHT_SNAPSHOT_READONLY_SELECT_2026-05-18.md`

---

### 本条サマリー（追認後）

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-R-PRODUCT-RIGHT-SNAPSHOT-READONLY-SELECT-001`** |
| **Verdict** | **`PRODUCT_RIGHT_SNAPSHOT_SELECT_GREEN_ENTITLEMENT_STATUS_MISMATCH_CONFIRMED_WITH_EVIDENCE_CAVEAT`** |
| **Caveat** | **`V_O_V_R_ENTITLEMENT_ROWCOUNT_DISCREPANCY_REQUIRES_CONFIRMATION`** |
| **Next** | **`5Z-I-V-S`** planning gate |
