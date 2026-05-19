# Phase 5-6H-5Z-I-V-AA — Production deployment / promotion planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-AA Production deployment / promotion planning gate**

本条は **`5Z-I-V-Z`** の deployment decision 次段として、**Vercel read-only evidence** を記録し **Production deployment / promotion を計画する docs-only gate**。**merge / redeploy / promote / env 変更 / DB write / runner / code 変更 / checkout retry / 新規決済は行わない。**

---

## 2. 現在地

| 項目 | 状態 |
|------|------|
| **Branch preview unlock** | **GREEN**（**`5Z-I-V-Y`**） |
| **`5Z-I-V-Z`** | **`CANONICAL_PRODUCTION_UI_VERIFICATION_DEPLOYMENT_DECISION_PLANNING_GREEN_NO_MUTATION`** |
| **W fix commit** | **`98bcd58c70f451c16572d68a157a0514be748e04`** |
| **Current Production commit** | **`9bbf05c`** — `chore(audit): refresh repo asset index` |
| **Production includes `98bcd58`** | **no** |
| **Canonical Production UI verification（W fix）** | **not executable until after deploy** |
| **本条** | **planning only — no deploy/promotion** |

**Planning anchor（Z）：** **`11f9f2c97f1b8d906267a871f31278f3a8ab373a`**

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-AA-PRODUCTION-DEPLOYMENT-PROMOTION-PLAN-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-Z-CANONICAL-PRODUCTION-UI-VERIFICATION-DEPLOYMENT-DECISION-PLAN-001`** | deployment decision plan |
| **`M55-EVID-20260518-5Z-I-V-Y-HUMAN-UI-VERIFICATION-EXECUTION-001`** | branch preview UI |
| **`M55-EVID-20260518-5Z-I-V-W-SNAPSHOT-ROUTE-READ-PATH-IMPLEMENTATION-EXECUTION-001`** | implementation |

**Full `user_id`／email／session／raw keys／secrets / env values：** **記録しない**。

---

## 4. Vercel read-only deployment status

| Field | Value |
|-------|--------|
| **Vercel project** | **`m55-webv2`** |
| **Canonical host label** | **`m55-webv2.vercel.app`** |
| **Preview branch** | **`work/home-cluster`** |
| **Preview deployment** | commit **`98bcd58`** — status **ready** |
| **Production branch** | **`main`** |
| **Production Current** | commit **`9bbf05c`** — status **ready** |
| **Production includes `98bcd58`** | **no** |
| **Deploy / promote action in AA** | **no** |
| **Env values shared** | **no** |

**Classification：** **`PRODUCTION_DOES_NOT_INCLUDE_SNAPSHOT_ROUTE_FIX`**

**Consequence：** **Do not** proceed to canonical Production UI verification execution for W fix until Production includes **`98bcd58`** (or later commit containing W).

---

## 5. Preview log evidence（redacted）

| Field | Value |
|-------|--------|
| **Domain context** | **preview**（not canonical Production） |
| **`dtrOwnershipGate` result** | **`owned`** |
| **`grantSource`** | **`dtr_report_snapshots`** |
| **Subject suffix only** | **`user_****1M65`** |
| **Full userId in logs** | **observed Human-local — not recorded in SSOT** |

**Interpretation：** Preview runtime confirms ownership gate path aligns with DB-backed snapshot grant on preview domain. **Does not** prove Production behavior at **`9bbf05c`**.

---

## 6. Deployment options（実行なし — explicit GO required）

### Option 1 — Promote / deploy **`work/home-cluster`** fix to Production

| Field | Value |
|-------|--------|
| **Action** | Vercel promote Preview (**`98bcd58`**) to Production **or** equivalent Production deploy under **explicit Human GO** |
| **Risk** | **medium** — Production behavior change |
| **Pre-req** | Pre-deploy checklist §7 |
| **Post** | **`5Z-I-V-AB`**（or next labeled gate）Production UI verification execution |

### Option 2 — Merge / sync to **`main`** then Production deploy

| Field | Value |
|-------|--------|
| **Action** | Merge **`work/home-cluster`** → **`main`**（separate merge gate）then Production deployment |
| **Risk** | **medium** — branch policy + merge conflict surface |
| **Note** | Aligns Production branch with canonical **`main`** track |

### Option 3 — Defer Production deployment

| Field | Value |
|-------|--------|
| **Action** | Keep preview GREEN only |
| **Risk** | Canonical Production UI verification **remains blocked** |
| **Use when** | Auth compliance / **`pk_test_`** prioritized |

---

## 7. Pre-deploy checklist（execution gate 前）

| # | Item |
|---|------|
| 1 | Git worktree **clean** on deploy source branch |
| 2 | Target commit **`98bcd58`** or later contains W fix files |
| 3 | **No** surprise **`package.json` / lockfile** change vs W evidence |
| 4 | **Build passed** on Preview deployment |
| 5 | **No env changes** required for W-only route fix（if env needed → separate env gate） |
| 6 | Rollback target documented: prior Production **`9bbf05c`** |
| 7 | **No** live payment / checkout test during deploy window |
| 8 | Human **explicit GO** for promote/merge/deploy |

---

## 8. Rollback plan

| Trigger | Action |
|---------|--------|
| Production DTR **fatal error** after deploy | Redeploy / revert to prior Production **`9bbf05c`** |
| **Unpaid purchase CTA** regression | Rollback deployment |
| Owned user **worse** than pre-deploy | Rollback or hotfix branch |
| **No DB rollback** | No DB mutation in W/Y/Z/AA |
| **No env rollback** | Unless future env gate changes env |
| **No data repair** | Route fix only |

---

## 9. Future Production UI verification（post-deploy）

Execute **after** Production includes **`98bcd58`** — separate execution gate:

| Route | Expected（`human-ui-current-user`） |
|-------|--------------------------------------|
| **`/dtr`** | Owned；**no** unpaid purchase CTA |
| **`/dtr/lp`** | **No** unpaid purchase CTA |
| **`/dtr/core`** | Saved report opens |
| **Payment** | **No** checkout retry / new payment |
| **Errors** | **No** fatal runtime error |

**Production auth compliance：** **remains separate** even if UI GREEN.

---

## 10. 判定

| Field | Value |
|-------|--------|
| **Gate verdict** | **`PRODUCTION_DEPLOYMENT_PROMOTION_PLANNING_GREEN_NO_MUTATION`** |
| **Deployment status classification** | **`PRODUCTION_DOES_NOT_INCLUDE_SNAPSHOT_ROUTE_FIX`** |

---

## 11. Recommended next

| Priority | Token |
|----------|--------|
| **Primary** | **`READY_FOR_PRODUCTION_DEPLOYMENT_PROMOTION_EXECUTION_GATE`** |
| **Optional preflight** | **`READY_FOR_PRODUCTION_DEPLOYMENT_PREFLIGHT_READONLY_GATE`** |

**Not recommended now：** **`READY_FOR_CANONICAL_PRODUCTION_UI_VERIFICATION_EXECUTION_GATE`** — blocked until Production includes W fix.

---

## 12. 未実行事項

- no merge / redeploy / promotion / env change
- no DB write / runner / code change
- no checkout retry / new payment
- no raw IDs / secrets / email / session / env values in SSOT
- no production auth compliance closure
- no normal dev flow release
- canonical Production UI verification **deferred until post-deploy**
