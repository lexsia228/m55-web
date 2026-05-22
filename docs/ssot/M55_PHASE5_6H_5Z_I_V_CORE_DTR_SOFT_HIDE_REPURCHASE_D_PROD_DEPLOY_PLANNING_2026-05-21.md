# Phase 5-6H-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DEPLOY-PLANNING — Production deploy planning（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DEPLOY-PLANNING** |
| **Title** | **Soft-hide repurchase Production deployment planning** |
| **Classification** | **Category 1 / docs-only / no-deploy** |
| **Verdict** | **`CORE_DTR_SOFT_HIDE_REPURCHASE_D_PROD_DEPLOY_PLANNING_GREEN_READY_FOR_EXECUTION_PENDING_HUMAN_GO`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DEPLOY-PLANNING-001`** |
| **Date** | **2026-05-21** |
| **Prerequisite** | **D-PREVIEW-FINAL GREEN** @ **`cc73af1`** · DB schema **C-D-R GREEN** |

**No Production deploy · no `main` push · no live checkout · no payment · no DB write · no env change · no VERIFY-C in this gate.**

---

## B. Recommended deploy route（選定 1 本）

| Option | Verdict |
|--------|---------|
| **A — Vercel Preview → Production promote** | **not recommended** — Production branch SSOT is **`main`**；promote alone does not align `main` history with preview evidence |
| **B — `work/home-cluster` → `main` merge + Vercel Git Production deploy** | **recommended（canonical）** |

### B.1 Execution sequence（EXECUTION gate — explicit Human GO required）

| Step | Action |
|------|--------|
| **1** | `git fetch origin` |
| **2** | On **`work/home-cluster`**: `git merge origin/main`（integrate **`2e05724`** audit chore；resolve conflicts if any） |
| **3** | Preflight tests @ integration tip（§D） |
| **4** | On **`main`**: `git merge --ff-only work/home-cluster` |
| **5** | `git push origin main` → Vercel **Production** auto-deploy |
| **6** | `git push origin work/home-cluster`（align branch to same tip） |
| **7** | Post-deploy smoke（§F）— **no live checkout** unless separate GO |

**Do not** use preview promotion as sole Production path.

---

## C. Commit targets

| Label | SHA / note |
|-------|------------|
| **Preview GREEN tip（planning anchor）** | **`cc73af1`** — D-PREVIEW-FINAL docs |
| **UX fix（hidden-only redirect）** | **`a081259`**（in ancestry） |
| **Hide API middleware** | **`56691d6`** |
| **Soft-hide code track** | **`61a1a9d`** D-READ → **`a85942d`** D-API → **`750d7c8`** D-MY → **`285e963`** D-CHECKOUT → **`c4c7f31`** D-FULFILL |
| **Current `origin/main`（pre-deploy Production）** | **`2e05724`** — `chore(audit): refresh repo asset index` |
| **Last shared merge-base** | **`6134048`** |
| **Target Production commit（post EXECUTION）** | **integration tip after step 1–4** — **must include `cc73af1` ancestry**；record actual SHA in EXECUTION SSOT |

**Production today does not include soft-hide app code**（main @ `2e05724` only；branch ahead **20+** commits）。

---

## D. Production preflight checklist（EXECUTION 前 — Human / agent）

| # | Check | Method | Pass criteria |
|---|-------|--------|---------------|
| **P1** | **Current Production commit** | Vercel UI / `git log origin/main -1` | **`2e05724`** until EXECUTION；record post-deploy SHA |
| **P2** | **Target includes `cc73af1`** | `git merge-base --is-ancestor cc73af1 <integration-tip>` | **yes** after step 2 |
| **P3** | **Vercel env** | Dashboard read-only | **No new env keys** for soft-hide（Clerk · Supabase · Stripe existing） |
| **P4** | **DB schema** | C-D-R SSOT + optional counts | **`user_hidden_*` = 1** · partial unique **1** · **no apply in EXECUTION** |
| **P5** | **`failed_fulfillments_24h`** | `scripts/sql/production/m55_core_dtr_verify_b_counts_only_preflight_v1.sql` §A（optional） | **0** preferred；non-zero → Human risk call before GO |
| **P6** | **Tests** | `npx tsx --test` soft-hide bundle + `npx tsc --noEmit` | **pass** @ integration tip |
| **P7** | **VERIFY-C** | Policy | **HOLD** — do not resume in deploy gate |

---

## E. Production deploy execution criteria

| # | Criterion |
|---|-----------|
| **E1** | GitHub / Vercel **build success** on **`main`** |
| **E2** | Vercel deployment **Ready** · **environment = Production** |
| **E3** | Build log **`Branch: main, Commit: <post-deploy SHA>`** matches pushed tip |
| **E4** | Canonical host **`https://m55-webv2.vercel.app`** serves new deployment |
| **E5** | **No** env change · **no** DB migration apply in EXECUTION |

---

## F. Post-deploy smoke checklist（no-mutation default）

### F.1 Logged-out（agent HTTP OK）

| # | Check | Expected |
|---|-------|----------|
| **S1** | `GET /` | **200** · no fatal |
| **S2** | `GET /core` | **200** · no fatal |
| **S3** | `GET /dtr` | **200** · no fatal |
| **S4** | `GET /dtr/lp` | **200** · no fatal |
| **S5** | `GET /my` | **200** · no fatal |
| **S6** | `GET /dtr/core`（unauth） | **307 → `/dtr/lp`**（fail-closed） |
| **S7** | `POST /api/dtr/report-snapshot/hide`（unauth） | **401 JSON** `{ code: 'unauthorized' }` · not 404 HTML |

### F.2 Signed-in — no production delete in smoke

| # | Check | Expected |
|---|-------|----------|
| **S8** | `/my` opens | **yes** |
| **S9** | **削除** button on **visible** saved report | **display check only** |
| **S10** | Delete dialog open + **cancel** | **allowed** · **no confirm / no delete** |
| **S11** | **Production delete execution** | **separate Human GO** — **not in EXECUTION smoke** |

### F.3 Owned visible user（if safe test account exists）

| # | Check | Expected |
|---|-------|----------|
| **S12** | `/dtr/core` | Opens saved report normally |

### F.4 Hidden-only user（if exists post prior delete — no new delete）

| # | Check | Expected |
|---|-------|----------|
| **S13** | `/dtr/core` | **Redirect `/dtr/lp`** · **no** indefinite loader |
| **S14** | LP purchase CTA | **visible** · **do not click** |
| **S15** | live checkout / payment / webhook | **no** |

### F.5 API / privacy

| # | Check | Expected |
|---|-------|----------|
| **S16** | No raw snapshot id / `hiddenAt` in UI or public API responses | **yes** |
| **S17** | Hidden-only second delete | **UI absent** or **409** if probed — **no intentional second delete** |

---

## G. Rollback plan

| Trigger | Action |
|---------|--------|
| **R1** Production build fail | **Do not** route traffic；fix on branch · re-EXECUTION |
| **R2** `/my` or `/dtr/core` fatal for logged-out or signed-in shell | Vercel **instant rollback** to prior Production deployment @ **`2e05724`** · open incident SSOT |
| **R3** Visible saved report cannot open on `/dtr/core` | Rollback + **HOLD** repurchase lane |
| **R4** Hidden-only shows **old** envelope body | Rollback — data not deleted；app read-path regression |
| **R5** Loader loop on `/dtr/processing?recovery=owned` after hide | Rollback — FIX-C regression |
| **R6** Unauth hide API not **401 JSON** | Rollback — FIX-B regression |
| **R7** Accidental live checkout / payment in smoke | Stop smoke · **no** further clicks · document in EXECUTION |
| **R8** raw id / hiddenAt / secret in logs or HTML | Rollback + security review |

**Rollback command pattern（Human）：** redeploy previous Production deployment or `git revert` on `main` + push — **separate GO**；**no** DB rollback（soft-hide columns retained).

---

## H. Explicitly out of scope until separate GO

| Item | Status |
|------|--------|
| **Live repurchase checkout** | **not in EXECUTION smoke** |
| **Production delete（本番削除）** | **not in EXECUTION smoke** |
| **VERIFY-C** | **HOLD** |
| **Entitlement revoke / hard DELETE** | **forbidden** |

---

## I. No-mutation（this gate）

| Action | Status |
|--------|--------|
| Production deploy | **no** |
| `main` push | **no** |
| live checkout / payment / webhook | **no** |
| manual DB SQL / write | **no** |
| env change | **no** |
| VERIFY-C | **no** |

---

## J. Next gates

| Gate | Requirement |
|------|-------------|
| **D-PROD-DEPLOY-PLANNING-COMMIT** | Commit this SSOT + `M55_SYSTEM_SSOT.md` |
| **D-PROD-DEPLOY-EXECUTION** | **`CORE-DTR-SOFT-HIDE-REPURCHASE-D-PROD-DEPLOY-EXECUTION go`** — perform §B.1 only |

---

## K. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Planning GREEN — merge-to-main route @ `cc73af1` anchor |
