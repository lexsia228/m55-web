# Phase 5-6H-5Z-I-V-Z — Canonical Production UI verification / deployment decision planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-Z Canonical Production UI verification / deployment decision planning gate**

本条は **`5Z-I-V-Y`** branch preview GREEN を **canonical Production** へ進めるための **deployment / verification decision を docs-only で計画する gate**。**merge / redeploy / promotion / env 変更 / DB write / runner / code 変更 / checkout retry / 新規決済は行わない。**

---

## 2. 現在地

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-W`** | **`SNAPSHOT_ROUTE_READ_PATH_IMPLEMENTATION_GREEN_CODE_CHANGE`**（**`98bcd58`**） |
| **`5Z-I-V-Y`** | **`HUMAN_UI_VERIFICATION_GREEN_SAVED_REPORT_UNLOCKED_BRANCH_PREVIEW`**（**`4ab8e4e`**） |
| **Branch preview DTR unlock** | **GREEN** |
| **Canonical Production UI** | **not verified** |
| **Production auth compliance** | **unresolved**（**`pk_test_` / Clerk production instance** — separate track） |
| **Normal dev flow** | **not released** |
| **本条** | **planning only** |

**Implementation commit（W）：** **`98bcd58c70f451c16572d68a157a0514be748e04`**

**Planning anchor（Y）：** **`4ab8e4e129ba9ad3bb28ea5ece537095f20f89a5`**

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-Z-CANONICAL-PRODUCTION-UI-VERIFICATION-DEPLOYMENT-DECISION-PLAN-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-Y-HUMAN-UI-VERIFICATION-EXECUTION-001`** | branch preview UI execution |
| **`M55-EVID-20260518-5Z-I-V-W-SNAPSHOT-ROUTE-READ-PATH-IMPLEMENTATION-EXECUTION-001`** | implementation |
| **`M55-EVID-20260518-5Z-I-V-T-ENTITLEMENT-DISCREPANCY-OWNERSHIP-FALLBACK-READONLY-SELECT-001`** | DB prerequisites |

**Full `user_id`／email／session／raw keys／secrets：** **記録しない**。

---

## 4. Branch preview GREEN summary（`5Z-I-V-Y`）

| Check | Result |
|-------|--------|
| **Environment** | **branch preview**（not canonical Production） |
| **Subject** | **`human-ui-current-user`**（suffix **`user_****1M65`** only） |
| **`/dtr` owned message** | **yes** |
| **Unpaid purchase CTA** | **no** |
| **Saved badge** | **yes** |
| **Fatal error** | **no** |
| **「レポートを開く」** | → **`/dtr/core`** |
| **Saved report opened** | **yes** |
| **Recovery/processing** | **no**（snapshot ready path） |
| **Checkout retry / new payment** | **no** |
| **Classification** | **`UI_VERIFICATION_GREEN_SAVED_REPORT_UNLOCKED`** |

**Interpretation：** **`98bcd58`** works for verified owned user on **branch preview**. Does **not** prove canonical Production behavior.

---

## 5. Production caveat

| Item | Status |
|------|--------|
| Canonical Production domain UI verification | **pending** |
| Production auth compliance | **unresolved** — **do not GREEN-declare** |
| Clerk **`pk_test_` on Production** / duplicate app conflict | **separate** — **`5Z-I-V-G`–`M`** track |
| Normal dev flow release | **blocked** until explicit gate |
| Production UI GREEN **≠** auth compliance closed |

---

## 6. Deployment decision options（実行なし）

### Option 1 — Production already includes **`98bcd58`**

| Field | Value |
|-------|--------|
| **Action** | Canonical Production Human UI verification **only** |
| **Risk** | **low** if deployment status **confirmed** |
| **Redeploy** | **not needed** |
| **Next** | **`5Z-I-V-AA`** Canonical Production UI verification **execution** |

### Option 2 — Production does **not** include **`98bcd58`**

| Field | Value |
|-------|--------|
| **Action** | Plan merge / promotion / Production deploy in **later explicit GO** gate |
| **Risk** | **medium** |
| **Verification** | **Do not** claim Production UI GREEN until deployed |
| **Next** | **`5Z-I-V-AA`** Production deployment / promotion **planning** |

### Option 3 — Defer Production verification

| Field | Value |
|-------|--------|
| **Action** | Keep branch preview GREEN only |
| **Risk** | Normal dev flow **remains blocked** |
| **Use when** | Auth compliance / **`pk_test_`** must be prioritized first |

### Option 4 — Read-only canonical Production behavior check first

| Field | Value |
|-------|--------|
| **Action** | Human visits **canonical Production domain**；observe **`/dtr`** without mutation |
| **Risk** | **none**（no deploy） |
| **Use when** | Unknown whether Production already has fix or still shows purchase CTA |

---

## 7. Canonical Production verification plan（future execution — `5Z-I-V-AA`）

### Preconditions

- **`canonical-normal-login`** + **`human-ui-current-user`**
- **No** new payment / checkout retry / DB write / env change
- Record **yes/no only** — **no** full URLs with tokens in SSOT

### Canonical domain（redacted）

| Label | Value |
|-------|--------|
| **Primary Production UI host** | **`m55-webv2.vercel.app`**（registry **`vercel.domain.primary-ui`**） |
| **Assigned secondary** | **`m55-web.vercel.app`**（if used — confirm Human-local） |

### Routes

| # | Route | Expected（owned user） |
|---|--------|------------------------|
| **1** | **`/dtr`** | Owned state；**no** unpaid purchase CTA；saved indicator |
| **2** | **`/dtr/lp`** | **No** primary purchase CTA as unpaid |
| **3** | **`/dtr/core`** | Saved report opens when snapshot ready |
| **4** | **`/dtr/processing?recovery=owned`** | Readable recovery if snap not ready（**not-run** if snap ready） |
| **5** | **`GET /api/dtr/report-snapshot-ready`** | Optional — taxonomy aligns（**no** response body in SSOT） |

### Prohibited during verification

- merge / redeploy / promote / env change
- live payment / checkout retry
- code / DB / runner mutation

---

## 8. Deployment status read-only checklist（Human / Vercel dashboard — redacted）

| Item | Record as |
|------|-----------|
| Canonical Production URL | **`m55-webv2.vercel.app`**（label only） |
| Production deployment includes **`98bcd58`** | **yes / no / unclear** |
| Branch preview used in Y | **preview only** — not Production proof |
| Vercel Production deployment status | **ready / error / unclear** |
| Env values | **not shared** |
| Deploy / promote action taken in Z | **no** |

**Z gate does not submit this checklist** — first submission at **`5Z-I-V-AA`** or status-confirmation sub-gate.

---

## 9. Go / no-go decision table

| Condition | Recommended next |
|-----------|----------------|
| Production includes **`98bcd58`** **confirmed** | **`READY_FOR_CANONICAL_PRODUCTION_UI_VERIFICATION_EXECUTION_GATE`** → **`5Z-I-V-AA`** UI execution |
| Production **lacks** **`98bcd58`** **confirmed** | **`READY_FOR_PRODUCTION_DEPLOYMENT_PROMOTION_PLANNING_GATE`** → **`5Z-I-V-AA`** deployment planning |
| Production commit status **unclear** | **`READY_FOR_VERCEL_PRODUCTION_DEPLOYMENT_STATUS_READONLY_CONFIRMATION_GATE`** → **`5Z-I-V-AA`** status confirmation |
| Production UI verification **already passes**（Human reports） | Record **`PRODUCTION_UI_VERIFICATION_GREEN`** at AA — **still do not** close production auth compliance |
| Defer chosen | Remain branch-preview-only until explicit replan |

---

## 10. Acceptance criteria — future Production UI verification（AC-P）

| ID | Criterion |
|----|-----------|
| **AC-P1** | Canonical Production owned user **not** shown unpaid purchase CTA |
| **AC-P2** | **「レポートを開く」** routes to **`/dtr/core`** |
| **AC-P3** | Saved report opens |
| **AC-P4** | No checkout retry / new payment |
| **AC-P5** | No fatal runtime error on DTR routes |
| **AC-P6** | Unpaid path **not-run** unless separate safe account |
| **AC-P7** | Production auth compliance **remains separate** |
| **AC-P8** | No DB / env / code mutation in verification gate |

---

## 11. Rollback / revert planning

| Trigger | Action |
|---------|--------|
| Production deploy of **`98bcd58`** breaks unpaid purchase CTA | **Revert** implementation commit |
| DTR route fatal error on Production | **Revert** or hotfix branch |
| Owned user worse than pre-W on Production | **Revert** **`98bcd58`** |
| **No DB rollback** | No DB mutation in W/Y/Z |
| **No env rollback** | Unless later env gate explicitly changes env |

---

## 12. 判定

| Field | Value |
|-------|--------|
| **Gate verdict** | **`CANONICAL_PRODUCTION_UI_VERIFICATION_DEPLOYMENT_DECISION_PLANNING_GREEN_NO_MUTATION`** |

---

## 13. Recommended next（branching）

| Branch | Token |
|--------|--------|
| Production has **`98bcd58`** | **`READY_FOR_CANONICAL_PRODUCTION_UI_VERIFICATION_EXECUTION_GATE`** |
| Production lacks **`98bcd58`** | **`READY_FOR_PRODUCTION_DEPLOYMENT_PROMOTION_PLANNING_GATE`** |
| Status unclear | **`READY_FOR_VERCEL_PRODUCTION_DEPLOYMENT_STATUS_READONLY_CONFIRMATION_GATE`** |

**Unified execution phase label：** **Phase 5-6H-5Z-I-V-AA**（sub-track per table above）

---

## 14. 未実行事項

- no merge / redeploy / promotion / env change
- no DB write / runner / code change
- no checkout retry / new payment
- no raw IDs / secrets / email / session
- no production auth compliance closure
- no normal dev flow release
- canonical Production UI verification **not executed in Z**
