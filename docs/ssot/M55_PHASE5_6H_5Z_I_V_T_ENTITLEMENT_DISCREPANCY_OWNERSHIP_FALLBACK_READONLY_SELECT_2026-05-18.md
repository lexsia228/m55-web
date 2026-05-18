# Phase 5-6H-5Z-I-V-T — Entitlement discrepancy / ownership fallback read-only SELECT gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-T Entitlement discrepancy / ownership fallback read-only SELECT gate**

本条は **`5Z-I-V-S` 計画**に基づく **Human-local Production `SELECT` read-only** 実行枠。**DB write・entitlement 付与・snapshot 修正・OTF cleanup・runner・env 変更・redeploy・code 変更なし**。**通常開発フロー解放なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-S`** | **`READY_FOR_ENTITLEMENT_DISCREPANCY_AND_FALLBACK_READONLY_SELECT_GATE`** |
| **O/R caveat** | **O ent 1** vs **R ent 0** — unresolved until本条 |
| **本条** | **Human-local SELECT execution checkpoint** |

**Work anchor（planning）：** **`b7428e39b29b3f92208b4b6ed5d15eb35b9ba72f`** — **`docs: plan entitlement discrepancy fallback diagnostic`**（**`5Z-I-V-S`**）。

**Agent caveat（本条 commit）：** **Agent は Production Supabase に接続せず `SELECT` を実行しない。** **本条コミット時点で chat に `5Z-I-V-T` プロトコル（§5）の redacted 結果が未提出** → **判定は `INCONCLUSIVE`**。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-T-ENTITLEMENT-DISCREPANCY-OWNERSHIP-FALLBACK-READONLY-SELECT-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-S-ENTITLEMENT-ROW-DISCREPANCY-OWNERSHIP-FALLBACK-DIAGNOSTIC-PLAN-001`** | plan |
| **`M55-EVID-20260518-5Z-I-V-R-PRODUCT-RIGHT-SNAPSHOT-READONLY-SELECT-001`** | prior SELECT（partial） |
| **`M55-EVID-20260518-5Z-I-V-O-HUMAN-UI-USER-ROWCOUNT-READONLY-SELECT-001`** | row_count baseline |

**Full `user_id`／email／session／raw keys／secrets：** **記録しない**。

---

## 4. Human-local SELECT summary（redacted）

| Field | Value |
|-------|--------|
| **safe label** | **`human-ui-current-user`** |
| **suffix evidence only** | **`user_****1M65`** |
| **full user_id in SSOT** | **no** |
| **`5Z-I-V-T` protocol executed by Human** | **not evidenced in this gate submission** |
| **Agent Production SELECT** | **no** |

### 6. same-ID consistency

| Check | Result |
|-------|--------|
| **same full user_id used for all SELECTs** | **unclear** |
| **safe label not used as DB value** | **unclear** |
| **suffix evidence only** | **`user_****1M65`** |

---

## 5. Entitlement discrepancy result（`5Z-I-V-T` protocol — pending）

### 1. `entitlements` without product filter

| Check | Result |
|-------|--------|
| **row_count** | **unclear** |
| **product_id list** | **unclear** |
| **status list** | **unclear** |
| **active row exists** | **unclear** |

### 2. `entitlements` `product_id = DTR_CORE_STATIC_V1`

| Check | Result |
|-------|--------|
| **row_count（本条 T）** | **unclear** |
| **active matched** | **unclear** |
| **row_count（prior O）** | **1**（**not re-verified本条**） |
| **row_count（prior R）** | **0**（**not re-verified本条**） |
| **O/R discrepancy resolved** | **no** — still **`V_O_V_R_ENTITLEMENT_ROWCOUNT_DISCREPANCY_REQUIRES_CONFIRMATION`** |

### 3. `entitlement_rights`

| Check | Result |
|-------|--------|
| **row_count（本条 T）** | **unclear** |
| **includes `m55_p:core_origin`** | **unclear** |
| **prior R** | row_count **1**；**yes**（reference only） |

### 4. `dtr_report_snapshots`

| Check | Result |
|-------|--------|
| **row_count（本条 T）** | **unclear** |
| **`DTR_CORE_STATIC_V1` matched** | **unclear** |
| **exactly one** | **unclear** |
| **id valid-looking** | **unclear** |
| **envelope/snapshot presence** | **unclear** |
| **prior R** | **1** / matched / exactly one **yes**（reference only） |

### 5. `one_time_fulfillments` latest

| Check | Result |
|-------|--------|
| **row_count（本条 T）** | **unclear** |
| **latest `DTR_CORE_STATIC_V1`** | **unclear** |
| **latest `fulfilled_at` present** | **unclear** |
| **prior R** | **4** / latest DTR **yes** / fulfilled_at **present**（reference only） |

---

## 6. Ownership fallback result

| Artifact | `5Z-I-V-T` | Prior **`5Z-I-V-R`**（reference） | Fallback implication |
|----------|------------|-----------------------------------|----------------------|
| **rights `m55_p:core_origin`** | **unclear** | **matched** | — |
| **snapshot DTR row** | **unclear** | **present** | step **1** should **`owned`** if runtime read OK |
| **OTF latest DTR backing** | **unclear** | **matched** | step **2b** should **`owned`** if snapshot fails |
| **active entitlement** | **unclear** | **absent**（R） | step **3** repair path **N/A** in R |
| **fallback should be owned** | **unclear** | **likely yes** if same user_id | **UI lock → snapshot/route suspect**（**`5Z-I-V-S`**） |

**Cannot confirm本条：** **`OWNERSHIP_FALLBACK_SHOULD_BE_OWNED_SNAPSHOT_OR_ROUTE_SUSPECT`** until **same-ID consistency** and **§5 T measurements** submitted.

---

## 7. Root classification

| Field | Value |
|-------|--------|
| **primary** | **`INCONCLUSIVE_MORE_READONLY_EVIDENCE_REQUIRED`** |
| **secondary（unresolved prior）** | **`V_O_V_R_ENTITLEMENT_ROWCOUNT_DISCREPANCY_REQUIRES_CONFIRMATION`** |
| **hypothesis（not confirmed）** | **`OWNERSHIP_FALLBACK_SHOULD_BE_OWNED_SNAPSHOT_OR_ROUTE_SUSPECT`**（per **`5Z-I-V-R`**） |

**Not applied（no T evidence）：** `ENTITLEMENT_ROWCOUNT_DISCREPANCY_CONFIRMED_*`／`SNAPSHOT_LOOKUP_OR_ROUTE_READ_PATH_PRIMARY`／`SAME_ID_CONSISTENCY_FAILED`／`PRODUCT_ALIAS_OR_STATUS_MISMATCH_CONFIRMED`

---

## 8. Recommended next

| Field | Value |
|-------|--------|
| **recommended** | **`MORE_READONLY_EVIDENCE_REQUIRED`** |
| **human action** | Execute **`5Z-I-V-S` §8 protocol** with **same full UI user_id**；submit redacted §5 results（same Evidence ID 追認可） |
| **after GREEN fallback artifacts + same-ID yes** | **`READY_FOR_OWNERSHIP_FALLBACK_ROUTE_READ_PATH_DIAGNOSTIC_GATE`** or **`READY_FOR_SNAPSHOT_LOOKUP_ROUTE_READ_PATH_CODE_FIX_PLANNING_GATE`** |
| **if same-ID failed** | **`READY_FOR_USER_ID_QUERY_CONSISTENCY_RECHECK_GATE`** |
| **if product alias/status mismatch** | **`READY_FOR_PRODUCT_ALIAS_ENTITLEMENT_ALIGNMENT_PLANNING_GATE`** |

---

## 9. 判定

| Field | Value |
|-------|--------|
| **Gate verdict** | **`ENTITLEMENT_DISCREPANCY_SELECT_INCONCLUSIVE`** |
| **Reason** | **`5Z-I-V-T` Human-local SELECT redacted results not submitted with this gate execution** |

**Verdict matrix（追認時に適用）：**

| Condition | Verdict |
|-----------|---------|
| **active entitlement found** | **`ENTITLEMENT_DISCREPANCY_SELECT_GREEN_ACTIVE_ROW_FOUND`** |
| **active absent + fallback artifacts matched** | **`ENTITLEMENT_DISCREPANCY_SELECT_GREEN_FALLBACK_ARTIFACTS_MATCHED_ROUTE_READ_PATH_SUSPECT`** |
| **same-ID failed** | **`ENTITLEMENT_DISCREPANCY_SELECT_BLOCKED_SAME_ID_INCONSISTENCY`** |
| **no submission** | **`ENTITLEMENT_DISCREPANCY_SELECT_INCONCLUSIVE`**（**本条**） |

---

## 10. Next

- Human submits **§5** redacted results → **same Evidence** 追認更新
- **No repair / no entitlement grant / no OTF cleanup** until discrepancy resolved + explicit GO
- **Still blocked：** normal dev flow full release／production auth compliance

---

## 11. 未実行事項

- **DB write / runner / env / redeploy / deletion / code change**
- **OTF cleanup / entitlement / snapshot mutation**
- **full IDs / secrets / session in SSOT**
- **normal dev flow release**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_T_ENTITLEMENT_DISCREPANCY_OWNERSHIP_FALLBACK_READONLY_SELECT_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-T-ENTITLEMENT-DISCREPANCY-OWNERSHIP-FALLBACK-READONLY-SELECT-001`** |
| **Verdict** | **`ENTITLEMENT_DISCREPANCY_SELECT_INCONCLUSIVE`** |
| **Next** | **`MORE_READONLY_EVIDENCE_REQUIRED`** — Human §5 SELECT |
