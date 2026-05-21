# Phase 5-6H-5Z-I-V-CORE-DTR-UI-GUARD-DEPLOY-PRECHECK — Notice deploy readiness（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-UI-GUARD-DEPLOY-PRECHECK** |
| **Title** | **Saved report notice deploy precheck** |
| **Classification** | **Category 1 / deploy precheck / docs-only** |
| **Verdict** | **`CORE_DTR_UI_GUARD_DEPLOY_PRECHECK_READY_FOR_PREVIEW_FIRST`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-UI-GUARD-DEPLOY-PRECHECK-001`** |
| **Date** | **2026-05-21** |
| **Branch tip** | **`6a97efb`**（`feat: add saved report snapshot notice`） |
| **Production runtime SHA** | **`6134048`**（notice **not** on Production yet） |

**Precheck only.** No deploy, main push, checkout, DB, or env change.

---

## B. Deploy readiness classification

| Tier | Label | Status |
|------|-------|--------|
| **Code on `origin/work/home-cluster`** | **GREEN** | **`6a97efb`** includes GUARD-B |
| **Local verify（GUARD-B）** | **GREEN** | tsc OK · storedEnvelopeRead **7/7** |
| **Production notice runtime** | **NOT DEPLOYED** | Prod @ **`6134048`** |
| **Composite v2 Production base** | **GREEN** | Prior ENGINE deploy + Human smoke |
| **Overall** | **`READY_FOR_PREVIEW_FIRST`** | Preview smoke → then Production micro-deploy |

**Scope:** UI-only delta（1 feat commit + docs）— **no** engine / DB / flag / checkout path changes.

---

## C. Deploy route decision

### C1. Options

| Option | Verdict | Notes |
|--------|---------|-------|
| **A — Branch preview @ `6a97efb`** | **SELECTED first** | Host: `m55-webv2-git-work-home-cluster-m55-official.vercel.app`；isolates notice；no `main` merge required for first look |
| **B — Production @ `m55-webv2.vercel.app`** | **After preview GREEN** | Requires **`main` push**（§C2） |
| **C — Promote preview to Production** | **NO** | Breaks SHA attestation；use `main` push |
| **D — CLI-only Production deploy** | **NO** | Same as ENGINE deploy policy |

### C2. Production path（after preview GREEN）

| Step | Action |
|------|--------|
| **1** | **`git checkout main`** |
| **2** | **`git merge --ff-only work/home-cluster`**（expected **ok** — `main` @ **`6134048`**, branch +4） |
| **3** | **`git push origin main`** → Vercel Production auto-deploy |
| **4** | Confirm Vercel **Ready** @ SHA **`6a97efb`** |
| **5** | **CORE-DTR-UI-GUARD-PRODUCTION-R** Human smoke |

**Commits on `main..6a97efb`:**

```text
6a97efb feat: add saved report snapshot notice   ← runtime delta
1de29dc docs: production deploy result
e28b1de docs: human smoke result
bd9d69a docs: core dtr verify planning
```

**Runtime-critical:** **`6a97efb` only** — others docs-only.

### C3. Target commit fixation

| Gate | Recorded SHA |
|------|----------------|
| **GUARD-DEPLOY-PREVIEW** | **`6a97efb`** |
| **GUARD-PRODUCTION-EXECUTION** | **`6a97efb`**（must match preview-tested tip） |
| **Rollback reference** | Production Ready @ **`6134048`**（Vercel instant rollback） |

**main push required for Production?** **yes** — Vercel Production tracks **`main`**.

**Preview without main push?** **yes** — push **`work/home-cluster`** already at **`6a97efb`** triggers / refreshes branch preview.

---

## D. Runtime smoke checklist

### D1. Preview（`CORE-DTR-UI-GUARD-DEPLOY-PREVIEW`）

**Host:** branch preview alias only.** **Auth:** Human owned session.

| # | Check | Pass criterion |
|---|-------|----------------|
| **P-01** | Vercel build | **Ready** @ **`6a97efb`** |
| **P-02** | owned **`/dtr/core`** opens | no fatal |
| **P-03** | **Notice visible** between hero and body | DOM present |
| **P-04** | Copy exact | §E |
| **P-05** | **資質 / {publicTitle}** hero | not clipped / overlapped |
| **P-06** | Mobile viewport（≤390px） | notice wraps；hero type card readable |
| **P-07** | No checkout CTA in notice | text-only |
| **P-08** | No bell / unread / counter UI | editorial strip only |
| **P-09** | Legacy envelope read | report body non-empty |

### D2. Production（`CORE-DTR-UI-GUARD-PRODUCTION-R` — after main deploy）

Repeat **P-02–P-09** on **`https://m55-webv2.vercel.app`**.

**Anonymous sanity（agent-allowed）：** `/dtr/core` → **307 `/dtr/lp`** unchanged.

---

## E. Canonical copy

```text
この保存版は、購入時点のプロフィールをもとに作成・保存されています。
```

**Source:** `lib/m55/dtrSavedReportCopy.ts` → `SAVED_SNAPSHOT_NOTICE_PRIMARY`

---

## F. Stop conditions

| ID | Condition | Action |
|----|-----------|--------|
| **SD-01** | Deploy SHA **≠ `6a97efb`** | abort |
| **SD-02** | Vercel build **failure** | **ENGINE-FIX-*** or GUARD-FIX |
| **SD-03** | `/dtr/core` **fatal** | rollback / fix |
| **SD-04** | Hero **資質/クリエイター** layout break | fix CSS before Production |
| **SD-05** | Notice copy **mismatch** | fix `dtrSavedReportCopy.ts` |
| **SD-06** | Notice becomes **checkout CTA** | reject implementation |
| **SD-07** | Notification-style UI introduced | reject |
| **SD-08** | Checkout/payment needed to verify | use owned account only |
| **SD-09** | DB / env / flag change suggested | out of scope — stop |
| **SD-10** | **CORE-DTR-VERIFY-C** bundled by mistake | keep HOLD |

---

## G. Parallel tracks（do not block）

| Track | Status |
|-------|--------|
| **CORE-DTR-VERIFY-B-R** | Human counts poll — **independent** |
| **CORE-DTR-VERIFY-C** | **HOLD** — not required for notice deploy |
| **ENGINE-ENV-GO** | **not** required for notice |

---

## H. No-mutation statement

| Action | Status |
|--------|--------|
| deploy / main push | **no**（this gate） |
| checkout / payment | **no** |
| DB / SQL / env / flag | **no** |
| snapshot mutation | **no** |

---

## I. Next gate

| Priority | Gate | When |
|----------|------|------|
| **1** | **`CORE-DTR-UI-GUARD-DEPLOY-PREVIEW`** | **Now** — branch preview @ **`6a97efb`** |
| **2** | **`CORE-DTR-UI-GUARD-PRODUCTION-PLANNING`** | After preview GREEN（optional thin doc） |
| **3** | **`CORE-DTR-UI-GUARD-PRODUCTION-EXECUTION`** | Human GO + `main` push |
| **4** | **`CORE-DTR-UI-GUARD-PRODUCTION-R`** | Post-Production smoke |

**Skip preview?** **Not recommended** — hero adjacency is layout-sensitive.

---

## J. Evidence registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-UI-GUARD-DEPLOY-PRECHECK-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-UI-GUARD-B-001`** | Implementation |

---

## K. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Precheck after **`6a97efb`** commit |
