# Phase 5-6H-5Z-I-V-T — Entitlement discrepancy / ownership fallback read-only SELECT gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-T Entitlement discrepancy / ownership fallback read-only SELECT gate**

本条は **`5Z-I-V-S` 計画**に基づく **Human-local Production `SELECT` read-only** 証跡固定。**DB write・entitlement 付与・snapshot 修正・OTF cleanup・runner・env 変更・redeploy・code 変更なし**。**通常開発フロー解放なし**。

**Evidence update（追認）：** 初回 **`ENTITLEMENT_DISCREPANCY_SELECT_INCONCLUSIVE`**（commit **`c82cd2c`**）→ **Human final confirmation SELECT 提出後** 同一 Evidence ID で更新。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-S`** | planning complete |
| **O/R discrepancy** | **resolved** — active entitlement row found（same user_id + consistent query） |
| **ownership fallback artifacts** | **all matched** |
| **UI unlock** | **still blocked**（prior observation）→ **snapshot/route/snapshotReady primary suspect** |
| **本条** | **Human-local SELECT submitted — verdict GREEN** |

**Work anchors：**

| Commit | Role |
|--------|------|
| **`c82cd2ca951337ad1b0cf84a3ffc4d5cb33681fb`** | initial **INCONCLUSIVE** |
| **（本条追認 commit）** | Human final confirmation |

**Agent：** Production **`SELECT` 未実行**（Human-local only）。

**Scope note：** DB-side ownership prerequisites **present** for current UI user under **`TEMPORARY_CURRENT_CLERK_INSTANCE_USER_MAPPING_EXCEPTION`**。**Production auth compliance** remains **unresolved**（separate track）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-T-ENTITLEMENT-DISCREPANCY-OWNERSHIP-FALLBACK-READONLY-SELECT-001`** | **本条**（追認更新） |
| **`M55-EVID-20260518-5Z-I-V-S-ENTITLEMENT-ROW-DISCREPANCY-OWNERSHIP-FALLBACK-DIAGNOSTIC-PLAN-001`** | plan |
| **`M55-EVID-20260518-5Z-I-V-R-PRODUCT-RIGHT-SNAPSHOT-READONLY-SELECT-001`** | prior partial SELECT |
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
| **Human final confirmation SELECT** | **yes** |
| **Agent Production SELECT** | **no** |

### same-ID consistency

| Check | Result |
|-------|--------|
| **same full user_id used for all SELECTs** | **yes** |
| **safe label not used as DB value** | **yes** |
| **suffix evidence only** | **`user_****1M65`** |

---

## 5. Entitlement discrepancy result（final confirmation）

### 1. `entitlements` without product filter

| Check | Result |
|-------|--------|
| **row_count** | **1** |
| **product_ids** | **`DTR_CORE_STATIC_V1`** |
| **statuses** | **`active`** |
| **active row exists** | **yes** |

### 2. `entitlements` `product_id = DTR_CORE_STATIC_V1`

| Check | Result |
|-------|--------|
| **row_count** | **1** |
| **product_ids** | **`DTR_CORE_STATIC_V1`** — **matched** |
| **statuses** | **`active`** |
| **active matched** | **yes** |

### O/R discrepancy resolution

| Gate | ent `DTR_CORE_STATIC_V1` row_count | Notes |
|------|--------------------------------------|-------|
| **`5Z-I-V-O`** | **1** | row_count only |
| **`5Z-I-V-R`** | **0** | product-filtered query — **likely filter/query drift** |
| **`5Z-I-V-T`（final）** | **1** | **same user_id** + consistent protocol |

| Token | Status |
|-------|--------|
| **`V_O_V_R_ENTITLEMENT_ROWCOUNT_DISCREPANCY_REQUIRES_CONFIRMATION`** | **resolved** → **`ENTITLEMENT_ROWCOUNT_DISCREPANCY_RESOLVED_ACTIVE_ROW_FOUND`** |
| **H1 different user_id** | **rejected**（same-ID **yes**） |
| **H2 different SQL filter** | **likely** for O vs R delta — **not blocking** after T |

### 3. `entitlement_rights`

| Check | Result |
|-------|--------|
| **row_count** | **1** |
| **right_keys** | **`m55_p:core_origin`** |
| **includes `m55_p:core_origin`** | **yes** — **matched** |

### 4. `dtr_report_snapshots`

| Check | Result |
|-------|--------|
| **row_count** | **1** |
| **product_ids** | **`DTR_CORE_STATIC_V1`** — **matched** |
| **exactly one** | **yes** |
| **id valid-looking** | **unclear**（not collected） |
| **envelope/snapshot presence** | **unclear**（not collected） |

### 5. `one_time_fulfillments` latest

| Check | Result |
|-------|--------|
| **row_count for user** | **4** |
| **latest `DTR_CORE_STATIC_V1`** | **yes** — **matched** |
| **latest `fulfilled_at` present** | **yes** |

---

## 6. Ownership fallback result

| Artifact | Result | Gate path |
|----------|--------|-----------|
| **active entitlement** | **yes** | step **3** repair + step **2a** backing |
| **rights `m55_p:core_origin`** | **matched** | step **2** |
| **snapshot DTR exactly one** | **matched** | step **1** → **`owned`** |
| **OTF latest DTR backing** | **matched** | step **2b** → **`owned`** if snapshot read fails |

| Finding | Status |
|---------|--------|
| **ownership fallback artifacts matched** | **yes** |
| **gate should return `owned`**（same runtime `user_id`） | **yes** — snapshot path **or** rights+OTF **or** active ent |
| **UI still locked** | **snapshot lookup / route read-path / `snapshotReady` consumption** — **primary suspect** |

**Do not conclude：** entitlement missing is the runtime blocker for this user after本条.

---

## 7. Root classification

| Field | Value |
|-------|--------|
| **primary** | **`ENTITLEMENT_DISCREPANCY_SELECT_GREEN_ACTIVE_ROW_FOUND`** |
| **secondary** | **`OWNERSHIP_FALLBACK_ARTIFACTS_MATCHED_ROUTE_READ_PATH_SUSPECT`** |
| **next suspicion** | **`SNAPSHOT_LOOKUP_ROUTE_READ_PATH_SNAPSHOTREADY_CONSUMPTION_PRIMARY`** |
| **O/R resolution** | **`ENTITLEMENT_ROWCOUNT_DISCREPANCY_RESOLVED_ACTIVE_ROW_FOUND`** |

---

## 8. Recommended next

| Field | Value |
|-------|--------|
| **recommended** | **`READY_FOR_SNAPSHOT_LOOKUP_ROUTE_READ_PATH_CODE_FIX_PLANNING_GATE`** |
| **next phase** | **`Phase 5-6H-5Z-I-V-U` Snapshot lookup / route read-path / snapshotReady consumption code-fix planning gate** |
| **deferred** | entitlement repair / OTF cleanup / snapshot mutation — **no GO** |

---

## 9. 判定

| Field | Value |
|-------|--------|
| **Gate verdict（updated）** | **`ENTITLEMENT_DISCREPANCY_SELECT_GREEN_ACTIVE_ROW_FOUND`** |
| **Prior verdict** | **`ENTITLEMENT_DISCREPANCY_SELECT_INCONCLUSIVE`** |

---

## 10. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-U` Snapshot lookup / route read-path / snapshotReady consumption code-fix planning gate**
  - **`getDtrReportSnapshot`** runtime null vs DB row
  - **`/dtr` / `/dtr/core` / `/dtr/lp`** + **`snapshotReady`** split
  - **no code change until explicit GO**

**Still blocked：** normal dev flow full release／production auth compliance／entitlement grant／OTF cleanup.

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

### 本条サマリー（追認後）

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-T-ENTITLEMENT-DISCREPANCY-OWNERSHIP-FALLBACK-READONLY-SELECT-001`** |
| **Verdict** | **`ENTITLEMENT_DISCREPANCY_SELECT_GREEN_ACTIVE_ROW_FOUND`** |
| **Next** | **`5Z-I-V-U`** snapshot/route/snapshotReady planning |
