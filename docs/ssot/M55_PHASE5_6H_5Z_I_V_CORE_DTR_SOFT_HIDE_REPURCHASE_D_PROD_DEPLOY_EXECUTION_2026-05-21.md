# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DEPLOY-EXECUTION — Production deploy（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DEPLOY-EXECUTION** |
| **Human GO** | **`CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DEPLOY-EXECUTION go`** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_PROD_DEPLOY_EXECUTION_GREEN_NO_LIVE_CHECKOUT`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DEPLOY-EXECUTION-001`** |
| **Date** | **2026-05-21** |
| **Classification** | **Category 2 / main merge + Production deploy / no checkout** |

**No live checkout · no payment · no webhook replay · no Production delete · no DB write · no env change · no VERIFY-C.**

---

## B. Git integration

| Step | Result |
|------|--------|
| **Pre-deploy `work/home-cluster` tip** | **`36cca28`** |
| **`git merge origin/main`** | **ok** — audit index only (`2e05724`) |
| **Integration tip** | **`00fe280`** → test fix **`0e9597c`** |
| **`git merge --ff-only work/home-cluster` → `main`** | **ok** |
| **Pre-push Production `main`** | **`2e05724`** |
| **Post-push Production `main`** | **`0e9597c`** |
| **`git push origin main`** | **ok**（`2e05724..0e9597c`） |
| **`git push origin work/home-cluster`** | **ok**（aligned **`0e9597c`**） |

**Ancestry confirmed:** `cc73af1` · `15d8eb1` · `a081259` · soft-hide code track.

**Preflight tests @ `0e9597c`:** **37/37** pass · `npx tsc --noEmit` pass · `git diff --check` pass.

**Test fix in deploy:** `dtrDraftDb.visible.test.ts` — allow `dtrShelfAccess` hidden-only imports（FIX-C）.

---

## C. Vercel Production

| Field | Value |
|-------|--------|
| **Canonical host** | **`https://m55-webv2.vercel.app`** |
| **target** | **production** |
| **GitHub Vercel check @ `0e9597c`** | **success** |
| **status** | **Ready** |
| **deployed commit** | **`0e9597c`** |
| **DB migration in gate** | **no**（schema @ C-D-R pre-applied） |
| **env change** | **no** |

**Note:** Immediate post-push smoke saw hide API **404** (~30s)；after propagation **401 JSON** — not rolled back.

---

## D. Post-deploy smoke（agent logged-out）

| Check | Result |
|-------|--------|
| `GET /` | **200** · no fatal |
| `GET /core` | **200** · no fatal |
| `GET /dtr` | **200** · no fatal |
| `GET /dtr/lp` | **200** · no fatal |
| `GET /my` | **200** · no fatal |
| unauth `GET /dtr/core` | **307 → `/dtr/lp`** |
| unauth `POST …/hide` | **401 JSON** `{ code: 'unauthorized' }` · `x-matched-path: /api/dtr/report-snapshot/hide` |

---

## E. Signed-in / Human（EXECUTION scope）

| Check | Status |
|-------|--------|
| `/my` opens · 削除 display · dialog cancel-only | **deferred → D-PROD-DEPLOY-R** |
| visible owned `/dtr/core` | **deferred → D-PROD-DEPLOY-R** |
| hidden-only `/dtr/core` → `/dtr/lp` | **deferred → D-PROD-DEPLOY-R**（preview FIX-C-R confirmed） |
| live checkout / payment | **no** |
| Production delete | **no** |

---

## F. No-mutation

| Action | Status |
|--------|--------|
| live checkout / payment / webhook | **no** |
| Production delete | **no** |
| manual DB SQL | **no** |
| env change | **no** |
| VERIFY-C | **no** |
| raw user_id / email / session / secret in SSOT | **no** |

---

## G. Rollback

| Item | Value |
|------|--------|
| **Triggered** | **no** |
| **Prior Production commit** | **`2e05724`** |
| **DB rollback** | **not performed**（`user_hidden_*` retained） |

---

## H. Next gate

| Gate | Action |
|------|--------|
| **D-PROD-DEPLOY-R** | Production signed-in no-mutation smoke |
| **Live repurchase checkout** | **separate Human GO** |

---

## I. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | EXECUTION GREEN @ `0e9597c` |
