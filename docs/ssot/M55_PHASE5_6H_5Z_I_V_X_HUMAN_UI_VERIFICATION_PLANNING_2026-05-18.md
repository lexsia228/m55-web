# Phase 5-6H-5Z-I-V-X — Human UI verification planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-X Human UI verification planning gate**

本条は **`5Z-I-V-W`** で実装した snapshot route read-path fix の **Human UI 実機確認手順を計画する docs-only gate**。**UI 実機確認の実行・コード変更・DB write・runner・env 変更・redeploy・OTF cleanup・entitlement/snapshot mutation は行わない。**

---

## 2. 現在地

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-W`** | **`SNAPSHOT_ROUTE_READ_PATH_IMPLEMENTATION_GREEN_CODE_CHANGE`** |
| **Implementation commit** | **`98bcd58c70f451c16572d68a157a0514be748e04`** |
| **Human UI verification** | **not yet run** |
| **本条** | **verification plan only** |
| **Out of scope** | production auth compliance closure；type-label mismatch；reply-ticket flow；live payment / checkout retry |

**Work anchor：** **`98bcd58c70f451c16572d68a157a0514be748e04`** — **`fix: route owned dtr users away from purchase fallback`**

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-X-HUMAN-UI-VERIFICATION-PLAN-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-W-SNAPSHOT-ROUTE-READ-PATH-IMPLEMENTATION-EXECUTION-001`** | implementation execution |
| **`M55-EVID-20260518-5Z-I-V-V-SNAPSHOT-ROUTE-READ-PATH-IMPLEMENTATION-PLAN-001`** | implementation plan |
| **`M55-EVID-20260518-5Z-I-V-T-ENTITLEMENT-DISCREPANCY-OWNERSHIP-FALLBACK-READONLY-SELECT-001`** | DB owned prerequisites SELECT |

**Full `user_id`／email／session／raw keys／secrets：** **記録しない**。

---

## 4. Input — `5Z-I-V-W` implementation summary（検証対象）

| Area | Change |
|------|--------|
| **Helper** | **`lib/m55/dtrShelfAccess.ts`** — taxonomy + **`DTR_OWNED_RECOVERY_PROCESSING_PATH`** = **`/dtr/processing?recovery=owned`** |
| **Shelf** | **`app/dtr/page.tsx`** + **`components/dtr/DtrShelfPanel.tsx`** — server **`shelfCta`** |
| **LP** | **`app/dtr/lp/page.tsx`** — owned: no purchase CTA；**`recovery`** mode |
| **Core** | **`app/dtr/core/page.tsx`** — owned + no snap → recovery path not unpaid LP |
| **Processing** | **`app/dtr/processing/page.tsx`** + **`DtrProcessingClient`** — **`recovery=owned`** without checkout **`session_id`** |
| **API** | **`app/api/dtr/report-snapshot-ready/route.ts`** — **`uxState` / `showPurchaseCta` / ownership semantics** |

**Automated checks at W：** **`tsc` PASS**；**`build` PASS**；**`audit` FAIL**（既存 **`globals.css` Background NoTouch** — W 起因ではない）。

---

## 5. Verification plan

### A. Preconditions（Human-local）

| Item | Requirement |
|------|-------------|
| **Login** | **`canonical-normal-login`**（**`5Z-I-W`** 文脈）— **not** `previous-private-login` unless explicitly retesting |
| **Subject label** | **`human-ui-current-user`** |
| **Suffix evidence only** | **`user_****1M65`**（full ID **記録しない**） |
| **DB artifacts**（**`5Z-I-V-T` matched — read-only prior evidence**） | active entitlement **`DTR_CORE_STATIC_V1`**；**`m55_p:core_origin`**；**`dtr_report_snapshots` ×1**；latest OTF **`DTR_CORE_STATIC_V1`** |
| **Deploy** | W commit **deployed** to target UI host before execution（**`5Z-I-V-Y`** — not this gate） |
| **Prohibited during verify** | new payment；checkout retry；DB write；env change；redeploy；runner；OTF cleanup；entitlement/snapshot mutation |

### B. Routes to verify

| # | Route | Expected result | Notes |
|---|-------|-----------------|-------|
| **1** | **`/dtr`** | Shelf **does not** show unpaid purchase CTA（**「1,000円で入手する」** toward unpaid LP）for confirmed owned user | If **`snapshotReady` true**: CTA **「レポートを開く」** → **`/dtr/core`**. If **false**: **「準備状況を確認する」** → **`/dtr/processing?recovery=owned`** |
| **2** | **`/dtr/lp`** | **No** primary **「購入する」** / Stripe purchase CTA as unpaid | Price/trust row **hidden** when owned/open/recovery/expired per W logic. **No** duplicate-payment copy |
| **3** | **`/dtr/core`** | If snapshot readable: **FULL report opens**. If lookup still fails while owned: redirect to **recovery/processing** — **not** unpaid LP purchase funnel | Do **not** expect unpaid LP as fallback |
| **4** | **`/dtr/processing?recovery=owned`** | Page readable；preparing/recovery copy；**no** checkout retry as primary action；**no** fatal runtime error | Poll may promote to **`/dtr/core`** when API **`ready: true`** |
| **5** | **`GET /api/dtr/report-snapshot-ready`**（optional manual） | **`hasOwnership` / `hasPurchaseSnapshot` / `ready` / `uxState` / `showPurchaseCta`** align with on-screen state | Record **yes/no only** in execution gate — **no** response body with IDs in SSOT |

### C. Device / browser checks

| Check | Action |
|-------|--------|
| **Desktop** | Primary pass — navigate routes **1–4** in order |
| **Mobile / narrow** | If feasible: recovery copy readable；CTA tappable；no horizontal overflow on processing |
| **Cache** | Hard reload / super reload **after deploy** if stale shelf/LP observed |
| **Screenshots** | **Human-local only** unless redacted — **no** private IDs in shared artifacts |

### D. Not-to-do（execution gateでも継続）

- Live Stripe checkout / additional payment
- Reply-ticket flow smoke（**out of scope** — **untouched** only）
- Unpaid user regression（**optional** — see AC-4）
- Production auth compliance closure declaration
- Normal dev flow release
- Code / env / DB mutation

---

## 6. Acceptance criteria（execution gate で判定）

| ID | Criterion | Planning status |
|----|-----------|-----------------|
| **AC-1** | Confirmed owned user **not** shown unpaid purchase CTA | **planned** — routes **1–2** |
| **AC-2** | Owned + **`snapshotReady` true** → saved report opens | **planned** — routes **1, 3** |
| **AC-3** | Owned + **`snapshotReady` false** → recovery/processing UX | **planned** — routes **1–4** |
| **AC-4** | Unpaid user still sees purchase CTA | **not-run in X** — mark **not-run** at **Y** unless Human safely tests separate account |
| **AC-5** | No duplicate purchase encouragement | **planned** — routes **1–2, 4** |
| **AC-6** | No runtime / fatal error on DTR routes | **planned** — all routes |
| **AC-7** | No DB / env / redeploy / code mutation during verify | **required** |
| **AC-8** | Production auth compliance remains unresolved | **required** |
| **AC-9** | Type-label mismatch remains separate | **required** |
| **AC-10** | Reply-ticket flow untouched | **required** — no formal reply test in plan |

---

## 7. Failure classification（`5Z-I-V-Y` execution で記録）

| Token | Condition | Recommended next |
|-------|-----------|------------------|
| **`UI_VERIFICATION_GREEN_SAVED_REPORT_UNLOCKED`** | Owned user opens saved report；no unpaid purchase CTA | Close CONTROL-30 / W-36；assess normal-dev release only via later gate |
| **`UI_VERIFICATION_PARTIAL_RECOVERY_PATH_WORKS_SNAPSHOT_STILL_NOT_READY`** | Recovery/processing works；report still not opening | **Snapshot parser/envelope read-only trace gate** |
| **`UI_VERIFICATION_BLOCKED_PURCHASE_CTA_STILL_VISIBLE`** | Owned user still sees unpaid purchase CTA | Implementation fix planning or **revert `98bcd58`** assessment |
| **`UI_VERIFICATION_BLOCKED_RUNTIME_ERROR`** | Fatal error on **`/dtr`** family | Hotfix or **revert `98bcd58`** |
| **`UI_VERIFICATION_INCONCLUSIVE_MORE_HUMAN_EVIDENCE_REQUIRED`** | Deploy/cache/login ambiguity | Redeploy confirm + super reload + identity re-check（**no env/DB mutation**） |

---

## 8. Rollback criteria

Revert implementation commit **`98bcd58c70f451c16572d68a157a0514be748e04`** when **any** of:

| Trigger | Action |
|---------|--------|
| Unpaid purchase CTA **broken** for locked users | **Revert** |
| **Runtime error** on public DTR routes traced to W | **Revert** |
| Owned user experience **worse** than pre-W（purchase CTA + blocked report） | **Revert** |
| Deploy/build failure **traced to W** diff | **Revert** |

**No DB rollback. No env rollback.**

---

## 9. 判定

| Field | Value |
|-------|--------|
| **Gate verdict** | **`HUMAN_UI_VERIFICATION_PLANNING_GREEN_NO_EXECUTION`** |
| **Recommended next** | **`READY_FOR_HUMAN_UI_VERIFICATION_EXECUTION_GATE`** |

---

## 10. Next gate

**Phase 5-6H-5Z-I-V-Y Human UI verification execution gate**

- Human performs routes **1–4**（+ optional API check **5**）
- Records verdict token from §7
- **No mutation** unless rollback explicitly authorized

---

## 11. 未実行事項

- UI verification execution **not run** in X
- no DB write / runner / env change / redeploy / code change
- no OTF cleanup / entitlement / snapshot mutation
- no raw IDs / secrets / email / session in this doc
- no production auth compliance closure
- no normal dev flow release
