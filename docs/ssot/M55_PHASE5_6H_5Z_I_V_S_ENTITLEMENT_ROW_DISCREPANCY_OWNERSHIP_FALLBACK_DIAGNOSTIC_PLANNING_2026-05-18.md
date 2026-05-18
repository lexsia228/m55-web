# Phase 5-6H-5Z-I-V-S — Entitlement row discrepancy / ownership fallback diagnostic planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-S Entitlement row discrepancy / ownership fallback diagnostic planning gate**

本条は **`5Z-I-V-R` 追認後**の **O/R entitlement row_count 差分**と **ownership fallback** の **docs-only 診断計画**。**DB write・entitlement 付与・snapshot 修正・OTF cleanup・runner・env 変更・redeploy・code 変更なし**。**通常開発フロー解放なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-R`** | **`PRODUCT_RIGHT_SNAPSHOT_SELECT_GREEN_ENTITLEMENT_STATUS_MISMATCH_CONFIRMED_WITH_EVIDENCE_CAVEAT`** |
| **matched** | **`right_key`** / **snapshot row** / **OTF latest backing** |
| **mismatch** | **active entitlement row absent**（R query） |
| **caveat** | **`5Z-I-V-O` ent 1** vs **`5Z-I-V-R` ent 0** |
| **UI** | **still locked**（prior Human observation） |
| **本条** | **planning only — no mutation** |

**Work anchor：** **`75d0de246dc366f0c5f56a9cf43abde9a6ce8b23`** — **`docs: update product right snapshot select result`**（**`5Z-I-V-R`** 追認）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-S-ENTITLEMENT-ROW-DISCREPANCY-OWNERSHIP-FALLBACK-DIAGNOSTIC-PLAN-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-R-PRODUCT-RIGHT-SNAPSHOT-READONLY-SELECT-001`** | Human SELECT（追認） |
| **`M55-EVID-20260518-5Z-I-V-Q-OWNERSHIP-GATE-READ-PATH-READONLY-DIAGNOSTIC-001`** | repo gate trace |
| **`M55-EVID-20260518-5Z-I-V-O-HUMAN-UI-USER-ROWCOUNT-READONLY-SELECT-001`** | row_count baseline |

**Full `user_id`／email／session／raw keys／secrets：** **記録しない**。

---

## 4. Input evidence（`5Z-I-V-R` summary）

| Field | Value |
|-------|--------|
| **safe label** | **`human-ui-current-user`** |
| **suffix evidence** | **`user_****1M65`** |
| **entitlements（R）** | row_count **0**；active matched **no** |
| **entitlement_rights** | row_count **1**；**`m55_p:core_origin` yes** |
| **dtr_report_snapshots** | row_count **1**；**`DTR_CORE_STATIC_V1`**；exactly one **yes** |
| **one_time_fulfillments** | row_count **4**；latest **DTR_CORE_STATIC_V1**；**`fulfilled_at` present** |
| **O/R caveat token** | **`V_O_V_R_ENTITLEMENT_ROWCOUNT_DISCREPANCY_REQUIRES_CONFIRMATION`** |

| Gate | entitlements `DTR_CORE_STATIC_V1` row_count |
|------|---------------------------------------------|
| **`5Z-I-V-O`** | **1** |
| **`5Z-I-V-R`** | **0** |

**Root classification（`5Z-I-V-R`）：**

| Role | Token |
|------|--------|
| **primary** | **`PRODUCT_RIGHT_SNAPSHOT_SELECT_GREEN_ENTITLEMENT_STATUS_MISMATCH_CONFIRMED`** |
| **secondary** | **`SNAPSHOT_LOOKUP_OR_ROUTE_READ_PATH_STILL_SUSPECT`** |

---

## 5. Non-conclusions（固定）

| Statement | Status |
|-----------|--------|
| **Repair / grant entitlement now** | **prohibited** |
| **Delete OTF duplicate rows** | **prohibited** |
| **Modify snapshot** | **prohibited** |
| **`USER_ID_MISMATCH` as primary** | **do not conclude** until same-ID inconsistency confirmed |
| **Normal dev flow full release** | **prohibited** |
| **Production auth compliance resolved** | **no** |

---

## 6. A. O/R entitlement discrepancy hypotheses（H1–H6）

| ID | Hypothesis | Check in **`5Z-I-V-T`** |
|----|------------|-------------------------|
| **H1** | **Different full `user_id` between O and R** — O used correct UI user；R used suffix label or wrong ID | **same full UI user for all SELECTs yes/no** |
| **H2** | **Different SQL filters** — O without `product_id` / R with `product_id = DTR_CORE_STATIC_V1`；status filter difference | **document filter used**；unfiltered vs filtered row_count |
| **H3** | **Entitlement exists under product alias** — `DTR_CORE` / other vs `DTR_CORE_STATIC_V1` | **product_id list**（unfiltered ent query） |
| **H4** | **Entitlement exists but `status` ≠ active** — R product filter returns 0；row exists under other status/product | **status list**；active matched yes/no |
| **H5** | **Temporary current-Clerk-instance context confusion** — UI session / Supabase `user_id` / queried `user_id` drift | **same-ID consistency**；exception scope review |
| **H6** | **Timing / cache / replica**（low priority） | **O vs R timestamp note** if available |

**Safe label rule：** **`human-ui-current-user`** / **`user_****1M65`** are **labels only** — **never SQL literals**.

---

## 7. B. Ownership fallback interpretation（repo — `5Z-I-V-Q` / `dtrOwnershipGate`)

**Evaluation order（`resolveEntryReportOwnership`）：**

| Step | Path | Condition | Result |
|------|------|-----------|--------|
| **1** | **Snapshot** | `getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1)` succeeds | **`owned`** |
| **2a** | **Rights + ent active** | `entitlement_rights` + `entitlements.status = active` | **`owned`** |
| **2b** | **Rights + OTF** | `entitlement_rights` + latest `one_time_fulfillments` row | **`owned`** |
| **2c** | **Rights orphan** | rights without payment backing | **`locked`** |
| **3** | **Active ent repair** | active `entitlements` → upsert rights | **`owned`** |
| **4** | **Else** | — | **`locked`** |

**Applied to `5Z-I-V-R` DB evidence（if same `user_id` at runtime）：**

| Path | DB support | Expected gate |
|------|------------|---------------|
| **Snapshot** | snap row **1** / product matched | **should → owned** if `getDtrReportSnapshot` returns row |
| **Rights + OTF** | rights **yes** + latest OTF **DTR** | **should → owned** if snapshot path fails but OTF query succeeds |
| **Rights orphan** | **not expected** — OTF backing present | **should not apply** |
| **Active ent repair** | ent **0** in R | **does not apply** |

**UI locked implication（planning）：**

| If | Then suspect |
|----|--------------|
| **Same user_id + DB rows as R** | **snapshot lookup failure**（runtime null despite row） |
| | **route / read-path** does not consume **`owned`** correctly |
| | **`snapshotReady`** split（`owned` but LP CTA — **`5Z-I-V-Q` W-29**） |
| **O/R different user_id confirmed** | return to **identity / same-ID SELECT** before ownership fix |

**Entitlement absence alone** does **not** explain **locked** if snapshot or rights+OTF paths succeed — **unless** runtime read differs from Human SELECT.

---

## 8. C. Next SELECT protocol（`5Z-I-V-T` only — not executed本条）

**Preconditions：**

| # | Rule |
|---|------|
| **1** | **Same full UI `user_id`** for **all** queries — human-local only |
| **2** | **No safe label as DB value** |
| **3** | **Read-only `SELECT`** |
| **4** | SSOT: **row_count / matched / mismatch / safe summary only** |
| **5** | **No DB write** |

| # | Target | Record |
|---|--------|--------|
| **1** | **entitlements**（**no product filter**） | row_count；product_id list；status list；active row exists yes/no |
| **2** | **entitlements** `product_id = DTR_CORE_STATIC_V1` | row_count；active matched yes/no |
| **3** | **entitlement_rights** | **`m55_p:core_origin` exists yes/no** |
| **4** | **dtr_report_snapshots** `DTR_CORE_STATIC_V1` | exactly one yes/no；id valid-looking；envelope presence if safe |
| **5** | **one_time_fulfillments** latest | latest `product_id` DTR yes/no；`fulfilled_at` present yes/no |
| **6** | **same-ID consistency** | same full user_id all SELECTs yes/no；suffix **`user_****1M65`** evidence only |

**Prohibited in SSOT：** full `user_id`, email, session, checkout_session_id, event_id, raw keys.

---

## 9. D. Diagnostic classifications（`5Z-I-V-T`）

| Token | When |
|-------|------|
| **`ENTITLEMENT_ROWCOUNT_DISCREPANCY_CONFIRMED_DIFFERENT_QUERY_OR_USER`** | H1/H2 confirmed |
| **`ENTITLEMENT_ROWCOUNT_DISCREPANCY_RESOLVED_ACTIVE_ROW_FOUND`** | active ent row found on reconciled query |
| **`ENTITLEMENT_ROWCOUNT_DISCREPANCY_RESOLVED_ACTIVE_ROW_ABSENT`** | same user + filters；still no DTR ent |
| **`OWNERSHIP_FALLBACK_SHOULD_BE_OWNED_SNAPSHOT_OR_ROUTE_SUSPECT`** | rights+snap+OTF present；UI/gate still locked |
| **`SNAPSHOT_LOOKUP_OR_ROUTE_READ_PATH_PRIMARY`** | same user；snapshot row present；runtime suspect |
| **`INCONCLUSIVE_MORE_READONLY_EVIDENCE_REQUIRED`** | fallback |

---

## 10. E. Recommended path after `5Z-I-V-T`

| Outcome | Next |
|---------|------|
| **Active entitlement row found** | **snapshot lookup / route read-path code fix planning** |
| **Ent absent but rights + snap + OTF latest present** | **ownership fallback should be owned** → **snapshot/route primary** |
| **Same user ID inconsistency** | **user identity SELECT confirmation**（exception scope） |
| **Product alias mismatch** | **product key alignment planning**（no mutation until GO） |
| **Any repair / grant / OTF delete** | **blocked** until discrepancy resolved + explicit GO |

---

## 11. 判定

| Field | Value |
|-------|--------|
| **Gate verdict** | **`READY_FOR_ENTITLEMENT_DISCREPANCY_AND_FALLBACK_READONLY_SELECT_GATE`** |

---

## 12. Recommended next

| Field | Value |
|-------|--------|
| **phase** | **`Phase 5-6H-5Z-I-V-T` Entitlement discrepancy / ownership fallback read-only SELECT gate** |
| **execution** | Human-local §8 protocol only |
| **deferred** | code fix / entitlement repair / OTF cleanup |

---

## 13. 未実行事項

- **DB write / runner / env / redeploy / deletion / code change**
- **OTF cleanup / entitlement / snapshot mutation**
- **full IDs / secrets / session in SSOT**
- **normal dev flow release**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_S_ENTITLEMENT_ROW_DISCREPANCY_OWNERSHIP_FALLBACK_DIAGNOSTIC_PLANNING_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-S-ENTITLEMENT-ROW-DISCREPANCY-OWNERSHIP-FALLBACK-DIAGNOSTIC-PLAN-001`** |
| **Verdict** | **`READY_FOR_ENTITLEMENT_DISCREPANCY_AND_FALLBACK_READONLY_SELECT_GATE`** |
| **Next** | **`5Z-I-V-T`** read-only SELECT |
