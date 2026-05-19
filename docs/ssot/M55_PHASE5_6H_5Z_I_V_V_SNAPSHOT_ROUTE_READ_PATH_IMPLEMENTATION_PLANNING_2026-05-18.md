# Phase 5-6H-5Z-I-V-V — Snapshot lookup / route read-path implementation planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-V Snapshot lookup / route read-path implementation planning gate**

本条は **`5Z-I-V-U` code-fix 方針**を **file-level change list / test plan / rollback plan** に落とす **docs-only 実装直前計画**。**コード実装・DB write・runner・env 変更・redeploy なし**。**通常開発フロー解放なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-T`** | DB owned prerequisites **matched** |
| **`5Z-I-V-U`** | **`SNAPSHOT_LOOKUP_ROUTE_READ_PATH_CODE_FIX_PLANNING_GREEN_NO_IMPLEMENTATION`** |
| **Preferred fix** | **Option 2 + 4**（recovery UX + route unification） |
| **本条** | **implementation plan only** |

**Work anchor：** **`bff5e958f4e3b0bb121d98083d4bed9885d3b45d`** — **`docs: plan snapshot route read path fix`**（**`5Z-I-V-U`**）。

**Out of scope：** production auth compliance；**type-label mismatch**（INFLUENCER vs GLOBAL LEADER）；included reply-ticket flow；**`/home` freeze**。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-V-SNAPSHOT-ROUTE-READ-PATH-IMPLEMENTATION-PLAN-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-U-SNAPSHOT-LOOKUP-ROUTE-READ-PATH-SNAPSHOTREADY-CODE-FIX-PLAN-001`** | code-fix plan |
| **`M55-EVID-20260518-5Z-I-V-T-ENTITLEMENT-DISCREPANCY-OWNERSHIP-FALLBACK-READONLY-SELECT-001`** | Human SELECT |
| **`M55-EVID-20260518-5Z-I-V-Q-OWNERSHIP-GATE-READ-PATH-READONLY-DIAGNOSTIC-001`** | gate trace |

**Full `user_id`／email／session／raw keys／secrets：** **記録しない**。

---

## 4. Input evidence summary

| Field | Value |
|-------|--------|
| **safe label** | **`human-ui-current-user`** / suffix **`user_****1M65`** |
| **same-ID** | **yes** |
| **active entitlement** | **matched** |
| **right_key** | **`m55_p:core_origin` matched** |
| **snapshot** | **exactly one** |
| **OTF latest** | **DTR matched** |
| **DB mutation for confirmed user** | **not required** |

---

## 5. File-level change list（repo read-only）

| File | Role | Planned change | Req / Opt / Inspect | Risk |
|------|------|----------------|---------------------|------|
| **`lib/m55/dtrOwnershipGate.ts`** | Layer1 **`owned`/`locked`** | **inspect-only** — preserve semantics unless runtime bug proven | **inspect** | accidental entitlement policy change |
| **`lib/m55/dtrDraftDb.ts`** | **`getDtrReportSnapshot`** | **optional** — safer null reason / envelope validation hook（Option 3） | **optional** | parse false negatives |
| **`lib/m55/dtrShelfAccess.ts`**（**new**） | Shared **`resolveDtrShelfAccessState`** | **required** — unify `ownershipState` + `snapshotReady` + shelf UX taxonomy | **required** | new abstraction scope creep |
| **`app/dtr/page.tsx`** | Shelf server loader | **required** — call shared resolver；pass extended shelf state | **required** | regression on anonymous |
| **`components/dtr/DtrShelfPanel.tsx`** | Shelf card CTA | **required** — `owned`+!`snapshotReady` → **recovery/processing** not **`/dtr/lp`** purchase context | **required** | CSS/copy only touch |
| **`components/dtr/DtrShelfPanel.module.css`** | Shelf styles | **optional** — recovery CTA styling | **optional** | visual only |
| **`app/dtr/lp/page.tsx`** | Product LP CTA modes | **required** — **`pending`** must not render purchase block；owned never **`purchase`** | **required** | LP layout |
| **`app/dtr/core/page.tsx`** | Saved report reader | **required** — `owned`+!snap → **`/dtr/processing`** or recovery（not LP） | **required** | redirect loop |
| **`app/dtr/processing/page.tsx`** | Post-checkout wait | **required** — **owned recovery path** without `checkout_session_id` when artifacts matched | **required** | widen processing scope |
| **`components/dtr/DtrProcessingClient.tsx`** | Client poll | **optional** — poll **`report-snapshot-ready`** for owned recovery | **optional** | polling noise |
| **`app/api/dtr/report-snapshot-ready/route.ts`** | Ready API | **required** — align JSON with shelf taxonomy；no purchase signal | **required** | API contract |
| **`app/api/purchase/checkout/route.ts`** | Checkout gate | **inspect-only** — ensure **`locked` only** gets checkout | **inspect** | payment regression |
| **`components/dtr/DtrFullReader.tsx`** | Reader body | **inspect-only** | **inspect** | type-label out of scope |
| **`components/dtr/DtrCatalogStrip.tsx`** | Catalog | **inspect-only** | **inspect** | — |
| **`app/reply/page.tsx`** | Reply room | **inspect-only** — do not touch | **inspect** | reply regression |

**Not in v1 file list：** global header/footer；**`/home`**；Stripe webhooks；entitlement tables.

---

## 6. Implementation strategy（sequence — no execution本条）

| Step | Action |
|------|--------|
| **1** | Add **`lib/m55/dtrShelfAccess.ts`** — server-only resolver returning **`DtrShelfUxState`** |
| **2** | Wire **`app/dtr/page.tsx`** to shared resolver |
| **3** | Update **`DtrShelfPanel`** CTA map per taxonomy（§7） |
| **4** | Update **`app/dtr/lp/page.tsx`** — hard block **`purchase`** when `unlockState === 'owned'` |
| **5** | Update **`app/dtr/core/page.tsx`** redirect target for !snap |
| **6** | Extend **`app/dtr/processing/page.tsx`** for owned recovery（no Stripe session） |
| **7** | Align **`report-snapshot-ready` API** |
| **8** | **If** snap row exists but `getDtrReportSnapshot` null → **`5Z-I-V-W` parser sub-gate** before envelope fix |

**Principles：**

1. **Preserve `resolveEntryReportOwnership`** unless proven bug.
2. **`ownershipState` ≠ `snapshotReady`** — separate props / taxonomy.
3. **`owned` + `snapshotReady`** → open **`/dtr/core`**.
4. **`owned` + !`snapshotReady`** → **no unpaid purchase CTA**；recovery/processing.
5. **`locked`** → purchase CTA unchanged.
6. **No DB / entitlement / snapshot mutation.**

---

## 7. UI state taxonomy

| State token | Condition | UI / route |
|-------------|-----------|------------|
| **`auth_required`** | no `userId` | sign-in / generic shelf |
| **`unpaid_locked`** | `unlockState === 'locked'` | purchase CTA → **`/dtr/lp`** purchase mode |
| **`owned_snapshot_ready`** | `owned` + snap non-null |「レポートを開く」→ **`/dtr/core`** |
| **`owned_snapshot_not_ready`** | `owned` + snap null（no parse error flag） |「準備中」→ **`/dtr/processing?recovery=1`**（planned） |
| **`owned_snapshot_lookup_error`** | `owned` + snap null + diagnostic parse/DB error | support/retry；**no purchase** |
| **`processing_or_recovery`** | processing route active | poll ready API；no checkout |
| **`expired`** | `unlockState === 'expired'` | support / expired LP |
| **`error_unknown`** | resolver throw | safe fallback；**no purchase if `owned` proven** |

**Mapping today vs target：**

| Today | Target |
|-------|--------|
| `owned`+!ready → **`/dtr/lp`** | → **processing/recovery** |
| LP **`pending`** mixed with product chrome | **dedicated recovery copy** |

---

## 8. Snapshot parser / read-path fallback（plan only）

| Scenario | Plan |
|----------|------|
| Row exists；`getDtrReportSnapshot` **null** | Classify **`owned_snapshot_lookup_error`** vs **`owned_snapshot_not_ready`** |
| **`envelope_json` cast failure** | Option 3 — parser alignment gate（**`5Z-I-V-W` branch** if needed） |
| **`maybeSingle` error** | readonly log + Human SELECT re-check |
| **No DB mutation** | fixed |

---

## 9. Test plan

### Manual（Human — confirmed user + synthetic）

| # | Check |
|---|--------|
| **T1** | Confirmed owned user：**no** unpaid purchase CTA on **`/dtr`** / **`/dtr/lp`** |
| **T2** | **`owned` + snapshotReady** → **`/dtr/core`** opens |
| **T3** | Simulate **`owned` + !snapshotReady**（or staging）→ recovery UI；**no** duplicate payment |
| **T4** | Logged-out / **locked** → purchase CTA still visible |
| **T5** | Rights-only orphan（if test user exists）→ **locked** not false ready |
| **T6** | OTF ×4 user — latest DTR backing — gate stable |
| **T7** | Parser failure path — owned user **no** purchase CTA |
| **T8** | Mobile/narrow — recovery readable |
| **T9** | Stripe checkout for **locked** user still works |
| **T10** | Reply-ticket / **`/reply`** — **no regression**（smoke only） |

### Automated（if added in execution gate）

| Target | Suggestion |
|--------|------------|
| **`dtrShelfAccess` unit** | state matrix for unlock × snap |
| **Playwright smoke** | shelf CTA href by state（no full IDs in CI logs） |

---

## 10. Rollback plan

| Item | Plan |
|------|------|
| **Trigger** | unpaid purchase CTA broken；owned users blocked worse |
| **Action** | **single revert commit** on `work/home-cluster` |
| **DB rollback** | **none**（no DB mutation） |
| **Env rollback** | **none** |
| **SSOT** | preserve **`5Z-I-V-V`** checkpoint；append rollback note in next doc if needed |
| **If owned still blocked post-revert** | **`READY_FOR_SNAPSHOT_PARSER_ENVELOPE_READONLY_TRACE_GATE`** |

---

## 11. Acceptance criteria（G — fixed）

| ID | Criterion |
|----|-----------|
| **AC-1** | Already-owned user **never** shown unpaid purchase CTA |
| **AC-2** | **`owned` + snapshotReady** → saved paid report opens |
| **AC-3** | **`owned` + !snapshotReady** → recovery/processing — **not** purchase |
| **AC-4** | Unpaid user still sees purchase CTA |
| **AC-5** | No duplicate payment encouragement |
| **AC-6** | No DB mutation required |
| **AC-7** | No entitlement/snapshot repair |
| **AC-8** | Type-label mismatch **separate** |
| **AC-9** | Production auth compliance **separate unresolved** |

---

## 12. Implementation gate boundary

| Field | Value |
|-------|--------|
| **本条 stops before** | any `.ts` / `.tsx` / CSS implementation |
| **explicit GO required** | **`5Z-I-V-W` execution gate** |

---

## 13. 判定

| Field | Value |
|-------|--------|
| **Gate verdict** | **`SNAPSHOT_ROUTE_READ_PATH_IMPLEMENTATION_PLANNING_GREEN_NO_CODE_CHANGE`** |

---

## 14. Recommended next

| Field | Value |
|-------|--------|
| **recommended** | **`READY_FOR_SNAPSHOT_ROUTE_READ_PATH_IMPLEMENTATION_EXECUTION_GATE`** |
| **phase** | **`Phase 5-6H-5Z-I-V-W` Snapshot route read-path implementation execution gate** |
| **alternate** | **`READY_FOR_SNAPSHOT_PARSER_ENVELOPE_READONLY_TRACE_GATE`** if execution finds snap null with row present |

**Parser uncertainty：** plan is **sufficient** for execution start；parser branch **conditional** during W.

---

## 15. 未実行事項

- **code change / DB write / runner / env / redeploy**
- **OTF cleanup / entitlement / snapshot mutation**
- **full IDs / secrets / session**
- **normal dev flow release**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_V_SNAPSHOT_ROUTE_READ_PATH_IMPLEMENTATION_PLANNING_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-V-SNAPSHOT-ROUTE-READ-PATH-IMPLEMENTATION-PLAN-001`** |
| **Verdict** | **`SNAPSHOT_ROUTE_READ_PATH_IMPLEMENTATION_PLANNING_GREEN_NO_CODE_CHANGE`** |
| **Next** | **`5Z-I-V-W` execution**（explicit GO） |
