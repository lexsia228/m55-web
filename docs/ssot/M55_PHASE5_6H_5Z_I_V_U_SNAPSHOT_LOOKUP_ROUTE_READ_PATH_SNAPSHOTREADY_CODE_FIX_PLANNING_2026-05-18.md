# Phase 5-6H-5Z-I-V-U — Snapshot lookup / route read-path / snapshotReady consumption code-fix planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-U Snapshot lookup / route read-path / snapshotReady consumption code-fix planning gate**

本条は **`5Z-I-V-T`** 後の **code-fix planning only**。**DB write・entitlement 付与・snapshot 修正・OTF cleanup・runner・env 変更・redeploy・code 変更（実装）なし**。**通常開発フロー解放なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-T`** | **`ENTITLEMENT_DISCREPANCY_SELECT_GREEN_ACTIVE_ROW_FOUND`** |
| **DB owned prerequisites** | **present**（active ent / rights / snap ×1 / OTF latest） |
| **same-ID consistency** | **yes** |
| **UI** | **still suspected locked / purchase-like CTA** |
| **本条** | **docs-only code-fix plan** — **no implementation** |

**Work anchor：** **`4c7c2fdba330feea1da743fe9dcca40d8981921f`** — **`docs: update entitlement fallback readonly select result`**（**`5Z-I-V-T`** 追認）。

**Separate tracks（触らない）：** production auth compliance **unresolved**；report **type label** mismatch（INFLUENCER vs GLOBAL LEADER）— **explicit scope まで統合しない**。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-U-SNAPSHOT-LOOKUP-ROUTE-READ-PATH-SNAPSHOTREADY-CODE-FIX-PLAN-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-T-ENTITLEMENT-DISCREPANCY-OWNERSHIP-FALLBACK-READONLY-SELECT-001`** | Human SELECT GREEN |
| **`M55-EVID-20260518-5Z-I-V-Q-OWNERSHIP-GATE-READ-PATH-READONLY-DIAGNOSTIC-001`** | repo gate trace |
| **`M55-EVID-20260518-5Z-I-V-O-HUMAN-UI-USER-ROWCOUNT-READONLY-SELECT-001`** | row_count baseline |

**Full `user_id`／email／session／raw keys／secrets：** **記録しない**。

---

## 4. Input evidence summary（`5Z-I-V-T`）

| Field | Value |
|-------|--------|
| **safe label** | **`human-ui-current-user`** |
| **suffix evidence** | **`user_****1M65`** |
| **same full user_id all SELECTs** | **yes** |
| **safe label not used as DB value** | **yes** |
| **entitlements** | **1** / **`DTR_CORE_STATIC_V1`** / **active** |
| **entitlement_rights** | **1** / **`m55_p:core_origin`** |
| **dtr_report_snapshots** | **1** / exactly one **yes** |
| **one_time_fulfillments** | **4** / latest DTR **yes** / **`fulfilled_at` present** |
| **O/R discrepancy** | **resolved** — active row found |

---

## 5. Non-conclusions（固定）

| Statement | Status |
|-----------|--------|
| **Repair DB / grant entitlement / fix snapshot** | **prohibited** |
| **OTF cleanup** | **prohibited** |
| **Production auth compliance resolved** | **no** |
| **Normal dev flow full release** | **prohibited** |
| **Merge type-label mismatch into this fix** | **no** unless explicit scope |
| **Implement code in this gate** | **prohibited** |

---

## 6. Root suspicion

| Field | Value |
|-------|--------|
| **primary** | **`SNAPSHOT_LOOKUP_ROUTE_READ_PATH_SNAPSHOTREADY_CONSUMPTION_PRIMARY`** |

**Rationale：** DB prerequisites **matched**；gate **should** return **`owned`** via snapshot or rights+OTF。UI **locked / purchase CTA** → **runtime read-path** or **`ownershipState` vs `snapshotReady` split** more likely than missing entitlements.

---

## 7. Planning targets（repo read-only）

### A. Snapshot lookup path

| Target | Path |
|--------|------|
| **`getDtrReportSnapshot`** | `lib/m55/dtrDraftDb.ts` |
| **Gate snapshot branch** | `lib/m55/dtrOwnershipGate.ts` |
| **`snapshotReady` computation** | `app/dtr/page.tsx`（and callers） |

| Finding | Detail |
|---------|--------|
| **Query** | `.eq(user_id).eq(product_id).maybeSingle()` |
| **Returns null if** | DB error；no row；**multiple rows**（PGRST116）；**`id` invalid type**；**catch-all** |
| **`envelope_json` cast** | cast to `DtrEnvelope` — **invalid shape may not throw until consumer** |
| **Human SELECT** | row **1** — **maybeSingle OK** if truly one |
| **`snapshotReady`** | `snap != null` on **`/dtr`** only when **`ownershipState === 'owned'`** |

**Planning checks（next implementation gate）：**

- Log-safe diagnostic: gate **`owned`** but **`getDtrReportSnapshot` null**（no secrets）
- Verify **`envelope_json`** keys vs `DtrEnvelope` type at read time
- Confirm **`id`** column type in Production matches `String(idRaw)` path

### B. Ownership state vs `snapshotReady` consumption

| Surface | Behavior（repo） |
|---------|------------------|
| **`/dtr` + `DtrShelfPanel`** | **`owned` + `snapshotReady`** → CTA **`/dtr/core`**「レポートを開く」 |
| | **`owned` + !`snapshotReady`** → CTA **`/dtr/lp`**「レポートの準備中」 |
| **`/dtr/lp`** | **`owned` + snap** → `open`；**`owned` + !snap** → **`pending`**（price hidden） |
| **`/dtr/core`** | **`owned` + !snap** → **`redirect("/dtr/lp")`** |

| Risk | Detail |
|------|--------|
| **Purchase-like UX** | **`owned` + !`snapshotReady`** still links to **`/dtr/lp`** — LP may feel like product/purchase context |
| **Dual fetch** | **`resolveEntryReportOwnership`** and **`getDtrReportSnapshot`** called **separately** — transient null on second call possible（low） |
| **Shelf card type** | **`ProfileRepository`** for card image — **not snapshot**（separate issue — **5Z-I-U type track**） |

### C. Route read-path

| Route / component | Uses same gate? | Notes |
|-------------------|-----------------|-------|
| **`/dtr`** | yes | passes **`ownershipState` + `snapshotReady`** |
| **`/dtr/lp`** | yes | **`lpCtaMode`** purchase / open / pending |
| **`/dtr/core`** | yes | redirect LP if no snap |
| **`/dtr/processing`** | yes | snap check |
| **`/api/dtr/report-snapshot-ready`** | yes | API poll path |
| **`DtrShelfPanel`** | props only | client personalization |

**All routes use `resolveEntryReportOwnership` + `getDtrReportSnapshot`** — **no alternate ownership source** confirmed.

**If UI shows `locked`：** runtime **`userId`** ≠ Human SELECT user **or** gate returns **`locked`** despite DB rows — **server logs / readonly trace gate** may be needed before code fix.

### D. CTA / UX classification

| State | Current UX（repo） | Planning intent |
|-------|-------------------|-----------------|
| **unpaid / locked** | purchase CTA OK | keep |
| **owned + snapshotReady** | open report | keep |
| **owned + !snapshotReady** | LP /「準備中」 | **must not resemble unpaid purchase** |
| **duplicate payment** | checkout on LP when **`lpCtaMode=purchase` only** | **block purchase for `owned`** |

---

## 8. Code-fix options（planning only）

| Option | Summary | Risk |
|--------|---------|------|
| **1** | Gate returns **`owned`** when snapshot row + backing detected；**`snapshotReady` separate** | owned without readable body if parse fails |
| **2** | Routes: **`owned` + !`snapshotReady`** → **processing/retry/recovery** — not LP purchase | UX copy/layout work |
| **3** | Fix **`getDtrReportSnapshot`** parser / envelope keys vs DB payload | needs payload schema proof |
| **4** | Unify **`ownershipState` / `snapshotReady` / `lpCtaMode`** across routes | multi-file touch |
| **5** | Minimal hotfix: hide purchase CTA when artifacts matched | may mask root cause |

| Field | Value |
|-------|--------|
| **preferred minimal path** | **Option 2 + Option 4**（UX branch + read-path unification）with **Option 3** investigation if **`getDtrReportSnapshot` returns null** despite row |
| **defer** | **Option 5** alone — insufficient as sole fix |
| **explicit GO required** | any implementation |

---

## 9. Acceptance criteria

| # | Criterion |
|---|-----------|
| **AC-1** | UI user with **active ent + right + snapshot + latest OTF** is **never** shown **unpaid purchase CTA** |
| **AC-2** | **`owned` + `snapshotReady` true** → saved paid report **opens**（`/dtr/core` or equivalent） |
| **AC-3** | **`owned` + `snapshotReady` false** → **no duplicate purchase CTA**；**recovery / processing / retry** UX |
| **AC-4** | **Free / unpaid** user → purchase CTA **remains** |
| **AC-5** | **No second payment** encouraged for already-owned user |
| **AC-6** | Fix requires **no DB mutation** for confirmed user |
| **AC-7** | **No entitlement / snapshot repair** required for confirmed user |
| **AC-8** | **Type label mismatch**（INFLUENCER vs GLOBAL LEADER）**out of scope** unless explicit GO |

---

## 10. Regression risks

| Risk | Mitigation |
|------|------------|
| **Unpaid users lose purchase CTA** | gate **`locked`** unchanged |
| **False owned without body** | keep **`snapshotReady`** for reader routes |
| **LP behavior change** | test **`pending` vs `purchase`** modes |
| **Processing route** | preserve checkout-session-only rules |

---

## 11. 判定

| Field | Value |
|-------|--------|
| **Gate verdict** | **`SNAPSHOT_LOOKUP_ROUTE_READ_PATH_CODE_FIX_PLANNING_GREEN_NO_IMPLEMENTATION`** |

---

## 12. Recommended next

| Field | Value |
|-------|--------|
| **recommended** | **`READY_FOR_SNAPSHOT_LOOKUP_ROUTE_READ_PATH_IMPLEMENTATION_PLANNING_GATE`** |
| **phase id** | **`5Z-I-V-V`**（or next letter）— **file-level change list + test plan** — **explicit GO only** |
| **optional** | **`READY_FOR_SNAPSHOT_LOOKUP_ROUTE_READ_PATH_READONLY_CODE_TRACE_GATE`** if runtime **`locked`** persists with matched DB |

---

## 13. Registry / CONTROL（本条）

See **`M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md`** — **W-32–34**；**CONTROL-27–28**。

---

## 14. 未実行事項

- **DB write / runner / env / redeploy / code change（実装）**
- **OTF cleanup / entitlement / snapshot mutation**
- **full IDs / secrets / session in SSOT**
- **normal dev flow release**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_U_SNAPSHOT_LOOKUP_ROUTE_READ_PATH_SNAPSHOTREADY_CODE_FIX_PLANNING_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-U-SNAPSHOT-LOOKUP-ROUTE-READ-PATH-SNAPSHOTREADY-CODE-FIX-PLAN-001`** |
| **Verdict** | **`SNAPSHOT_LOOKUP_ROUTE_READ_PATH_CODE_FIX_PLANNING_GREEN_NO_IMPLEMENTATION`** |
| **Next** | **Implementation planning gate**（explicit GO） |
