# Phase 5-6H-5Z-I-V-Q — Ownership gate / read path read-only diagnostic execution gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-Q Ownership gate / read path read-only diagnostic execution gate**

本条は **`5Z-I-V-P` 計画**に基づく **repo read-only 診断実行**。**修正・DB write・runner・env 変更・redeploy・削除・code 変更・OTF cleanup なし**。**通常開発フロー解放なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-O`** | UI user DTR artifacts **found**（row_count） |
| **`USER_ID_MISMATCH` primary** | **rejected** |
| **`5Z-I-V-P`** | planning complete |
| **UI** | **locked / purchase 導線**（Human 観測） |
| **本条** | **repo read-only trace** — no mutation |

**Work anchor：** **`2c260319e4db66dd08ab0f37f85ac11f3b2d88b7`** — **`docs: plan ownership gate read path diagnostic`**

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-Q-OWNERSHIP-GATE-READ-PATH-READONLY-DIAGNOSTIC-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-P-OWNERSHIP-GATE-READ-PATH-SNAPSHOT-LOOKUP-DIAGNOSTIC-PLAN-001`** | plan |
| **`M55-EVID-20260518-5Z-I-V-O-HUMAN-UI-USER-ROWCOUNT-READONLY-SELECT-001`** | row_count |
| **`M55-EVID-20260518-5Z-I-V-N-TEMPORARY-CURRENT-CLERK-INSTANCE-USER-MAPPING-EXCEPTION-PLAN-001`** | exception |

---

## 4. Input evidence summary（`5Z-I-V-O`）

| Field | Value |
|-------|--------|
| **safe label** | **`human-ui-current-user`** |
| **suffix** | **`user_****1M65`** |
| **entitlements DTR_CORE** | **1** |
| **entitlement_rights** | **1** |
| **dtr_report_snapshots** | **1** |
| **one_time_fulfillments** | **4** |
| **reply_ticket_wallets / ledgers** | **1 / 1** |

---

## 5. A. Ownership gate trace（repo）

**Source:** `lib/m55/dtrOwnershipGate.ts` — `resolveEntryReportOwnership(userId)`

### Evaluation order（fail-closed → `locked` on error）

| Step | Condition | Result |
|------|-----------|--------|
| **1** | `getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1)` row valid | **`owned`**（`grantSource: dtr_report_snapshots`） |
| **2** | `entitlement_rights` row for **`right_key = m55_p:core_origin`** (`DTR_CORE_RIGHT_KEY`) | if expired → **`expired`** |
| **2b** | rights + **`entitlements` active** OR **`one_time_fulfillments`** row（`product_id`, latest `fulfilled_at`） | **`owned`** |
| **2c** | rights **without** payment backing | **`locked`** — **`entitlement_rights_orphan`** |
| **3** | `entitlements` **`status = active`** + `product_id = DTR_CORE_STATIC_V1` | repair rights + **`owned`** |
| **4** | else | **`locked`** |

### Key constants（repo）

| Constant | Value |
|----------|--------|
| **`DTR_CORE_STATIC_V1`** | `DTR_CORE_STATIC_V1`（`lib/oneTimeCheckout.ts`） |
| **`DTR_CORE_RIGHT_KEY`** | **`m55_p:core_origin`**（`lib/m55/dtrCoreCheckoutFulfillment.ts`） |

### Policy findings

| Finding | Detail |
|---------|--------|
| **`entitlement_rights` alone** | **never `owned`** — requires snapshot OR payment backing |
| **OTF read** | `.eq(product_id).order(fulfilled_at desc).limit(1).maybeSingle()` — **not** multi-row `maybeSingle` without limit |
| **Runtime repair** | active `entitlements` path may **`upsert` entitlement_rights`** on read（existing code — **not executed this gate**） |

**Callers traced:** `app/dtr/page.tsx`, `app/dtr/lp/page.tsx`, `app/dtr/core/page.tsx`, `app/api/purchase/checkout/route.ts`, `app/api/dtr/report-snapshot-ready/route.ts`, `app/api/room/core/send/route.ts`

---

## 6. B. Product ID / right key consistency（repo expectation vs DB TBD）

| Check | Repo expectation | Human DB row_count | Match status |
|-------|------------------|-------------------|--------------|
| **`product_id`** | **`DTR_CORE_STATIC_V1`** | entitlements **1** | **confirm via SELECT** |
| **`right_key`** | **`m55_p:core_origin`** | rights **1** | **confirm via SELECT** |
| **`entitlements.status`** | **`active`** required（step 3 / 2b ent branch） | unknown | **confirm via SELECT** |
| **Alias drift** | no `DTR_CORE` alias in gate | — | **no repo alias in gate** |

**Can cause `locked` with row_count ≥1:**

| Scenario | Mechanism |
|----------|-----------|
| **`right_key` ≠ `m55_p:core_origin`** | step 2 skipped → depends on ent **active** only |
| **`entitlements.status` ≠ `active`** | step 2b ent branch fails; step 3 fails if no rights |
| **`rights` + inactive ent + OTF rows wrong `product_id`** | **`entitlement_rights_orphan`** → **locked** |

---

## 7. C. Snapshot lookup trace（repo）

**Source:** `lib/m55/dtrDraftDb.ts` — `getDtrReportSnapshot(userId, productId)`

| Check | Behavior |
|-------|----------|
| **Query** | `.eq(user_id).eq(product_id).maybeSingle()` |
| **Returns null if** | DB error; **multiple rows** without unique constraint（PGRST116）; **`id` invalid**; catch-all |
| **Multiple snapshot rows** | **`maybeSingle` fails** → null → **snapshot path skipped**（Human reported **row_count 1** — OK if truly one） |

**`/dtr/core`:** `owned` but `snap` null → **`redirect("/dtr/lp")`**（line 53–54）

**Shelf `snapshotReady`:** same `getDtrReportSnapshot` — `owned` + `!snapshotReady` → CTA **`/dtr/lp`**, not **`/dtr/core`**

---

## 8. D. Report shelf / product page / read path（repo）

| Surface | Ownership source | Unlock UX |
|---------|------------------|-----------|
| **`/dtr`** | server `resolveEntryReportOwnership` + `getDtrReportSnapshot` | `ownershipState` + **`snapshotReady`** separate |
| **`DtrShelfPanel`** | props only | **`owned` + !`snapshotReady`** → hint「本文の準備が完了すると開けます」；CTA **`/dtr/lp`** |
| **`/dtr/lp`** | same gate | **`locked`** → purchase；**`owned` + snap** → open；**`owned` + !snap** → **pending** |
| **`/dtr/core`** | gate then snap | **`locked`/`expired`** → redirect LP；**no snap** → redirect LP |

| Finding | Classification |
|---------|----------------|
| **Dual-axis UI** | **`owned` ≠ unlocked UX** — requires **`snapshotReady`** |
| **Same gate function** | `/dtr`, `/dtr/lp`, `/dtr/core` — **no alternate ownership source** |
| **Client `ProfileRepository`** | card personalization only — **not ownership** |
| **Cache/session** | possible but **not primary** from repo trace |

---

## 9. E. OTF multiple rows（row_count 4）

| Check | Repo behavior | Risk |
|-------|---------------|------|
| **Gate OTF query** | **latest 1 row** by `fulfilled_at` | **low** for `maybeSingle` failure |
| **4 rows all same `product_id`** | one row satisfies step 2b | **likely OK** if any match |
| **4 rows mixed `product_id`** | latest may be **non-DTR** | **could block** step 2b if no ent active |
| **Cleanup** | **prohibited** | diagnostic only |

**Classification:** **`OTF_MULTIPLE_ROWS_AFFECT_OWNERSHIP`** — **unclear / secondary** — confirm **`product_id` / `status` breakdown** on 4 rows

---

## 10. Root cause classification

| Field | Value |
|-------|--------|
| **primary** | **`OWNERSHIP_GATE_RIGHT_KEY_MISMATCH`**（if `right_key` or `status` ≠ expected — **DB confirm pending**） |
| **secondary** | **`SNAPSHOT_LOOKUP_CONDITION_MISMATCH`**（row_count 1 but server `getDtrReportSnapshot` may return null） |
| **secondary** | **`REPORT_SHELF_PRODUCT_PAGE_READ_PATH_MISMATCH`**（**`owned` + !`snapshotReady`** presents as purchase/LP path） |
| **secondary** | **`OWNERSHIP_GATE_CODE_PATH_BUG`** — **not applied**（orphan policy is **intentional**） |
| **rejected primary** | **`USER_ID_MISMATCH`**（per `5Z-I-V-O` row_count） |

**Consolidated hypothesis:** Artifacts exist, but **gate may return `locked`** if snapshot read fails **and** **`entitlement_rights` lacks payment backing**（inactive ent / wrong right_key / OTF product filter miss）. UI may also show **purchase-like UX** when **`owned` but `snapshotReady=false`**.

---

## 11. Next human-local SELECT plan（`5Z-I-V-R` — redacted only）

| Check | Record in SSOT |
|-------|---------------|
| **entitlements** | `product_id` matched/mismatch；`status` matched/mismatch（expect **active**） |
| **entitlement_rights** | `right_key` matched/mismatch（expect **`m55_p:core_origin`**） |
| **dtr_report_snapshots** | `product_id` matched/mismatch；`envelope_json` present yes/no；parse would succeed unclear |
| **one_time_fulfillments** | **row_count by `product_id`**；latest row `product_id` matched/mismatch |
| **gate simulation** | which step would fire: snapshot / rights+backing / orphan / ent-repair |

**Prohibited in SSOT:** full `user_id`, `checkout_session_id`, `event_id`, email

---

## 12. Recommended next action

| Field | Value |
|-------|--------|
| **recommended** | **`READY_FOR_PRODUCT_RIGHT_KEY_READONLY_SELECT_GATE`** |
| **also** | **`READY_FOR_SNAPSHOT_LOOKUP_READONLY_SELECT_GATE`**（if envelope/product_id mismatch） |
| **also** | **`READY_FOR_OTF_MULTIPLE_ROWS_READONLY_SELECT_GATE`**（breakdown of 4 rows） |
| **deferred** | **`READY_FOR_OWNERSHIP_GATE_CODE_FIX_PLANNING_GATE`** until DB keys confirmed |

---

## 13. 判定

| Field | Value |
|-------|--------|
| **Gate verdict** | **`OWNERSHIP_GATE_READONLY_DIAGNOSTIC_GREEN_DB_KEY_CONFIRMATION_REQUIRED`** |

---

## 14. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-R` Product / right / snapshot read-only SELECT gate**（Human-local, redacted matched/mismatch）
  - may include OTF 4-row breakdown
  - **no write / no fix until explicit GO**

**If after R keys match but snap parse fails:**

- snapshot envelope / `product_id` diagnostic sub-gate

**If code UX split (`owned` + !`snapshotReady`) confirmed as blocker:**

- **`5Z-I-V-R` branch:** report read-path / snapshotReady planning（separate from DB key gate）

---

## 15. 未実行事項

- **DB write / runner / env / redeploy / deletion / code change**
- **OTF cleanup / entitlement / snapshot mutation**
- **full IDs / email / session in SSOT**
- **normal dev flow release**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_Q_OWNERSHIP_GATE_READ_PATH_READONLY_DIAGNOSTIC_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-Q-OWNERSHIP-GATE-READ-PATH-READONLY-DIAGNOSTIC-001`** |
| **Verdict** | **`OWNERSHIP_GATE_READONLY_DIAGNOSTIC_GREEN_DB_KEY_CONFIRMATION_REQUIRED`** |
| **Next** | **`5Z-I-V-R` product/right/snapshot SELECT** |
