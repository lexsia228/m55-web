# Phase 5-6H-5Z-I-V-R — Product / right / snapshot read-only SELECT gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-R Product / right / snapshot read-only SELECT gate**

本条は **`5Z-I-V-Q`** 後の **Human-local Production `SELECT` read-only** 証跡固定。**DB write・runner・env 変更・redeploy・code 変更・OTF cleanup・entitlement/snapshot mutation なし**。**通常開発フロー解放なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-Q`** | **`OWNERSHIP_GATE_READONLY_DIAGNOSTIC_GREEN_DB_KEY_CONFIRMATION_REQUIRED`** |
| **UI user** | **`human-ui-current-user`** — suffix **`user_****1M65`** |
| **Artifacts（`5Z-I-V-O` row_count）** | entitlements **1** / rights **1** / snapshots **1** / OTF **4** |
| **UI unlock** | **still blocked**（Human UI observation — prior gates） |
| **本条** | **Human-local SELECT evidence checkpoint** |

**Work anchor：** **`993cd4a9a5e26e6596376f0edad2d878c2a3f52a`** — **`docs: diagnose ownership gate read path readonly`**（**`5Z-I-V-Q`**）。

**Agent caveat（本条 commit）：** **Agent は Production Supabase に接続せず `SELECT` を実行しない。** **本条コミット時点で chat に product/right/snapshot/OTF の redacted matched/mismatch 結果は未提出** → **§5 は pending / `unclear`**。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-R-PRODUCT-RIGHT-SNAPSHOT-READONLY-SELECT-001`** | **本条** |
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
| **SELECT executed by Human** | **not evidenced in this gate submission** |
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
| **row_count** | **1**（from **`5Z-I-V-O`** — not re-measured本条） |
| **`product_id` matched** | **unclear** — Human SELECT not submitted |
| **`status` values** | **unclear** |
| **`grant_type` / `source` summary** | **unclear** |
| **`active` status matched** | **unclear** |

### B. `entitlement_rights`（UI user）

| Check | Result |
|-------|--------|
| **row_count** | **1**（from **`5Z-I-V-O`**） |
| **`right_key` includes `m55_p:core_origin`** | **unclear** |
| **`right_value` safe summary** | **unclear** |

### C. `dtr_report_snapshots`（UI user / `DTR_CORE_STATIC_V1`）

| Check | Result |
|-------|--------|
| **row_count** | **1**（from **`5Z-I-V-O`**） |
| **exactly one row** | **yes**（row_count **1** — not re-counted本条） |
| **`product_id` matched** | **unclear** |
| **`id` valid-looking** | **unclear** |
| **snapshot / envelope presence** | **unclear** |
| **parse safety（SQL-only）** | **unclear** |

### D. `one_time_fulfillments`（UI user）

| Check | Result |
|-------|--------|
| **row_count** | **4**（from **`5Z-I-V-O`**） |
| **latest row `product_id` = `DTR_CORE_STATIC_V1`** | **unclear** |
| **latest row status / fulfilled marker** | **unclear** |
| **multiple rows** | **yes** — **no mutation** |

### E. Gate simulation（which step would fire）

| Step | Would fire? |
|------|-------------|
| **1 snapshot → owned** | **unclear**（snapshot read success not confirmed） |
| **2 rights + backing → owned** | **unclear** |
| **2c rights orphan → locked** | **unclear** |
| **3 active ent → repair + owned** | **unclear** |
| **4 else locked** | **unclear** |

---

## 6. Root cause classification

| Field | Value |
|-------|--------|
| **primary** | **`PRODUCT_RIGHT_SNAPSHOT_SELECT_INCONCLUSIVE`** |
| **secondary（hypothesis — not confirmed）** | **`OWNERSHIP_GATE_RIGHT_KEY_MISMATCH`**（per **`5Z-I-V-Q`**） |
| **secondary（hypothesis）** | **`SNAPSHOT_LOOKUP_CONDITION_MISMATCH`** |
| **secondary（hypothesis）** | **`OTF_MULTIPLE_ROWS_AFFECT_OWNERSHIP`**（latest row product/status unknown） |
| **rejected primary** | **`USER_ID_MISMATCH`**（**`5Z-I-V-O` row_count**） |

**Cannot confirm at this gate：** `PRODUCT_RIGHT_SNAPSHOT_SELECT_GREEN_*` tokens — **no matched/mismatch evidence submitted**.

---

## 7. Recommended next action

| Field | Value |
|-------|--------|
| **recommended** | **`MORE_READONLY_EVIDENCE_REQUIRED`** |
| **human action** | Re-run **§9 SELECT protocol** locally；submit **redacted matched/mismatch only**（same Evidence ID 追認可） |
| **after keys confirmed matched + UI still locked** | **`READY_FOR_SNAPSHOT_LOOKUP_OR_ROUTE_READ_PATH_CODE_FIX_PLANNING_GATE`** |
| **if right_key mismatch** | **`READY_FOR_RIGHT_KEY_REPAIR_OR_CODE_ALIGNMENT_PLANNING_GATE`** |
| **if entitlement status mismatch** | **`READY_FOR_ENTITLEMENT_STATUS_DIAGNOSTIC_PLANNING_GATE`** |
| **if OTF latest mismatch** | **`READY_FOR_OTF_LATEST_BACKING_DIAGNOSTIC_PLANNING_GATE`** |

---

## 8. 判定

| Field | Value |
|-------|--------|
| **Gate verdict** | **`PRODUCT_RIGHT_SNAPSHOT_SELECT_INCONCLUSIVE`** |
| **Reason** | **Human-local SELECT matched/mismatch results not submitted with this gate execution** |

---

## 9. Human-local SELECT protocol（re-submit — redacted only）

**Preconditions：** read-only `SELECT` only；full `user_id` human-local only；**no safe label as SQL literal**.

| # | Target | Record in SSOT |
|---|--------|----------------|
| **1** | **entitlements** `product_id` / `status` / `grant_type` / `source` | **matched / mismatch / unclear** per field |
| **2** | **entitlement_rights** `right_key` / `right_value` | **`m55_p:core_origin` yes/no**；value summary if non-sensitive |
| **3** | **dtr_report_snapshots** | `product_id` matched；`id` valid-looking；envelope present yes/no |
| **4** | **one_time_fulfillments** | row_count；**latest** row `product_id` / status / fulfilled marker |
| **5** | **gate simulation** | which ownership step would apply |

**Prohibited in SSOT：** full `user_id`, `checkout_session_id`, `event_id`, email, session, raw keys.

---

## 10. Next

**Immediate：**

- Human submits **§9** redacted results → **same Evidence** 追認更新 or **`5Z-I-V-R-A`** sub-checkpoint（explicit GO）

**After evidence GREEN：**

- One of **`READY_FOR_*_PLANNING_GATE`** per §7 classification tokens

**Still blocked：** normal dev flow full release／production auth compliance／OTF cleanup／entitlement mutation.

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

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-R-PRODUCT-RIGHT-SNAPSHOT-READONLY-SELECT-001`** |
| **Verdict** | **`PRODUCT_RIGHT_SNAPSHOT_SELECT_INCONCLUSIVE`** |
| **Next** | **`MORE_READONLY_EVIDENCE_REQUIRED`** — Human §9 SELECT |
