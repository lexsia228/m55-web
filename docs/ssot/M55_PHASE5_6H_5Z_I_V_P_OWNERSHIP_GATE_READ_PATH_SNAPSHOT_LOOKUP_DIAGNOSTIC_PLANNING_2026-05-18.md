# Phase 5-6H-5Z-I-V-P — Ownership gate / read path / snapshot lookup diagnostic planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-P Ownership gate / read path / snapshot lookup diagnostic planning gate**

本条は **`5Z-I-V-O`** 以降、**UI が owned/unlocked と判定しない理由**を **ownership gate / read path / snapshot lookup** 観点で **read-only 診断計画化**。**DB write・runner・env 変更・redeploy・削除・code 変更・OTF cleanup・entitlement/snapshot 変更なし**。**通常開発フロー解放なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-O`** | **`UI_USER_ROWCOUNT_READONLY_SELECT_GREEN_ARTIFACTS_FOUND_OWNERSHIP_READ_PATH_DIAGNOSTIC_REQUIRED`** |
| **UI user DTR artifacts** | **found**（row_count evidence） |
| **`USER_ID_MISMATCH` primary** | **rejected** |
| **UI unlock** | **still locked** |
| **Temporary exception** | **scoped** — read-only mapping/ownership diagnosis only |
| **Production auth compliance** | **unresolved** |
| **本条** | **planning only — no mutation** |

**Work anchor：** **`e7686cffac34aa426bf8301034ccd43d1c5b2b8f`** — **`docs: record ui user rowcount readonly select`**（**`5Z-I-V-O`**）。

**Registry：** `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md` §2l

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-P-OWNERSHIP-GATE-READ-PATH-SNAPSHOT-LOOKUP-DIAGNOSTIC-PLAN-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-O-HUMAN-UI-USER-ROWCOUNT-READONLY-SELECT-001`** | row_count |
| **`M55-EVID-20260518-5Z-I-V-N-TEMPORARY-CURRENT-CLERK-INSTANCE-USER-MAPPING-EXCEPTION-PLAN-001`** | exception |
| **`M55-EVID-20260518-5Z-I-V-M-CLERK-PRODUCTION-INSTANCE-CAPABILITY-MIGRATION-IMPACT-001`** | capability |

**Full `user_id`／email／session／raw keys：** **記録しない**。

---

## 4. Input evidence summary（`5Z-I-V-O`）

| Field | Value |
|-------|--------|
| **safe label** | **`human-ui-current-user`** |
| **suffix evidence** | **`user_****1M65`** |
| **entitlements DTR_CORE_STATIC_V1** | **row_count 1** |
| **entitlement_rights** | **row_count 1** |
| **dtr_report_snapshots DTR_CORE_STATIC_V1** | **row_count 1** |
| **one_time_fulfillments** | **row_count 4** |
| **reply_ticket_wallets** | **row_count 1** |
| **reply_wallet_ledgers** | **row_count 1** |

---

## 5. Non-conclusions（固定）

| Statement | Status |
|-----------|--------|
| **`USER_ID_MISMATCH` is primary cause** | **do not conclude** |
| **Artifacts missing for UI user** | **do not conclude** |
| **Delete OTF duplicate rows** | **prohibited** |
| **Mutate entitlement / snapshot / wallet** | **prohibited** |
| **Normal dev flow full release** | **prohibited** |

---

## 6. A. Ownership gate condition（repo read-only targets）

| Target（repo） | Path hint |
|--------------|-----------|
| **`resolveEntryReportOwnership`** | `lib/m55/dtrOwnershipGate` |
| **`dtrOwnershipGate`** | `lib/m55/dtrOwnershipGate` |
| **Saved report access** | report routes + gate callers |
| **`/dtr/lp` purchase CTA** | `app/dtr/lp/page.tsx` |
| **Report page loader** | `app/dtr/page.tsx`, `app/dtr/core/page.tsx` |
| **Report shelf** | `components/dtr/DtrShelfPanel.tsx` |
| **API: snapshot-ready** | `app/api/dtr/report-snapshot-ready/route.ts` |
| **Checkout gate** | `app/api/purchase/checkout/route.ts` |

**Confirm（read-only）：**

| Check | Detail |
|-------|--------|
| **owned / locked / processing / error** | return conditions per state |
| **Tables read** | entitlements / entitlement_rights / one_time_fulfillments / dtr_report_snapshots |
| **Expected `product_id`** | **`DTR_CORE_STATIC_V1`** vs aliases |
| **`right_key` / `right_value`** | UI vs DB |
| **Snapshot exists but locked** | gate branches when `row_count ≥ 1` |
| **OTF ×4 handling** | first / latest / status filter / aggregate |
| **Purchase CTA** | exact condition when shown |

---

## 7. B. Product ID / right key consistency

| Check | Method |
|-------|--------|
| **UI expected `product_id`** | code constants + gate |
| **DB `product_id`** | Human-local redacted SELECT（**`5Z-I-V-Q` or sub-gate**） |
| **`entitlement_rights` keys** | `right_key` / `right_value` vs code expectations |
| **Key alias drift** | `DTR_CORE_STATIC_V1` / `DTR_CORE` / `m55_p:core_origin` etc. |

---

## 8. C. Snapshot lookup

| Target（repo） | Path hint |
|--------------|-----------|
| **`getDtrReportSnapshot`** | `lib/m55/dtrDraftDb` |
| **Snapshot loaders** | `app/dtr/page.tsx`, `app/dtr/core/page.tsx`, APIs |
| **Lookup keys** | `user_id`, `product_id`, `report_instance_id`, `checkout_session_id` |

**Confirm：**

| Check | Detail |
|-------|--------|
| **`row_count 1` but UI null** | filter / parse / envelope failure |
| **Payload shape / envelope parse** | archetype / type keys present |
| **ID mismatch** | product_id / user_id / report_instance_id |
| **Shelf vs saved report** | which path consumes snapshot |

---

## 9. D. Report shelf / product page / route read path

| Route / component | Notes |
|-------------------|--------|
| **`DtrShelfPanel`** | `ownershipState`, `snapshotReady` props |
| **`/dtr/lp`** | purchase CTA context |
| **`/dtr`, `/dtr/core`** | shelf + ownership |
| **`/dtr/processing`** | processing state |
| **APIs / server actions** | auth + server client |

**Confirm：**

| Check | Detail |
|-------|--------|
| **Shelf source** | entitlement vs profile fallback |
| **Product page** | how `ownership` drives UI |
| **Same gate on saved route** | yes/no |
| **Cache / session stale** | possible |
| **RLS / server-client / auth** | mismatch possible |

---

## 10. E. OTF multiple rows（row_count 4）

| Check | Policy |
|-------|--------|
| **4 rows normal vs duplicate** | read-only classify |
| **Gate picks which row** | code trace |
| **Unstable owned判定** | hypothesis only |
| **Cleanup / delete** | **prohibited** |
| **Next gate SELECT** | optional breakdown by status/source（redacted） |

---

## 11. F. Read-only SELECT plan（`5Z-I-V-Q` execution — not this gate）

**Human-local only.** SSOT: **row_count / matched / mismatch / unclear** only.

| Candidate | Redacted fields |
|-----------|-----------------|
| **entitlements** | `product_id`, `status`, `grant_type`, `source` summary |
| **entitlement_rights** | `right_key`, `right_value` summary |
| **dtr_report_snapshots** | `product_id`, envelope safe keys, parse status |
| **one_time_fulfillments** | count by `product` / `status` / `source` if available |
| **ownership gate keys** | required keys **matched / mismatch** per check |
| **Prohibited in SSOT** | full `user_id`, `checkout_session_id`, `event_id`, email |

---

## 12. Hypothesis tokens（`5Z-I-V-Q` classifies）

| Token | Scope |
|-------|--------|
| **`OWNERSHIP_GATE_PRODUCT_ID_MISMATCH`** | product_id |
| **`OWNERSHIP_GATE_RIGHT_KEY_MISMATCH`** | rights |
| **`SNAPSHOT_LOOKUP_CONDITION_MISMATCH`** | lookup filters |
| **`SNAPSHOT_PAYLOAD_SHAPE_OR_PARSE_MISMATCH`** | envelope |
| **`REPORT_SHELF_PRODUCT_PAGE_READ_PATH_MISMATCH`** | UI path |
| **`RLS_OR_SERVER_CLIENT_READ_MISMATCH`** | read layer |
| **`CACHE_OR_SESSION_STALE`** | session |
| **`OTF_MULTIPLE_ROWS_AFFECT_OWNERSHIP`** | OTF ×4 |
| **`OWNERSHIP_GATE_CODE_PATH_BUG`** | logic |
| **`INCONCLUSIVE`** | fallback |

---

## 13. Recommended next action

| Field | Value |
|-------|--------|
| **primary** | **`READY_FOR_OWNERSHIP_GATE_READONLY_DIAGNOSTIC_EXECUTION`** |
| **phase** | **`5Z-I-V-Q`** Ownership gate / read path read-only diagnostic execution |

**Deferred tokens：** `READY_FOR_PRODUCT_RIGHT_KEY_READONLY_SELECT_GATE`／`READY_FOR_SNAPSHOT_LOOKUP_READONLY_SELECT_GATE`／`READY_FOR_REPORT_READ_PATH_CODE_FIX_PLANNING_GATE`（after Q findings）

---

## 14. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`READY_FOR_OWNERSHIP_GATE_READONLY_DIAGNOSTIC_EXECUTION`** |

---

## 15. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-Q` Ownership gate / read path read-only diagnostic execution gate**
  - repo read-only trace of **`dtrOwnershipGate`** + callers
  - optional Human-local SELECT per §11
  - **no write**

---

## 16. 未実行事項

- **DB write / runner / env / redeploy / deletion**
- **code change**（planning only — Q may trace, not fix）
- **OTF cleanup / entitlement / snapshot mutation**
- **full IDs / email / session in SSOT**
- **normal dev flow release**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_P_OWNERSHIP_GATE_READ_PATH_SNAPSHOT_LOOKUP_DIAGNOSTIC_PLANNING_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-P-OWNERSHIP-GATE-READ-PATH-SNAPSHOT-LOOKUP-DIAGNOSTIC-PLAN-001`** |
| **Verdict** | **`READY_FOR_OWNERSHIP_GATE_READONLY_DIAGNOSTIC_EXECUTION`** |
| **Next** | **`5Z-I-V-Q`** read-only diagnostic execution |
