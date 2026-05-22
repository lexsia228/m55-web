# Phase 5-6H-5Z-I-V-CORE-DTR-UI-GUARD-DEPLOY-PREVIEW-R — Human visual review（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-UI-GUARD-DEPLOY-PREVIEW-R** |
| **Title** | **Saved report notice — Human visual review on branch preview** |
| **Classification** | **Category 3 / Human UI attestation / docs-only** |
| **Verdict** | **`CORE_DTR_UI_GUARD_DEPLOY_PREVIEW_R_PARTIAL_PENDING_UI_POLISH`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-UI-GUARD-DEPLOY-PREVIEW-R-001`** |
| **Date** | **2026-05-21** |
| **Preview host** | **`https://m55-webv2-git-work-home-cluster-m55-official.vercel.app`** |
| **Source commit** | **`ff2af81`** |
| **Raw ID / email / session / secret** | **not shared** |

---

## B. Owned `/dtr/core`（Human）

| Check | Result |
|-------|--------|
| Opened | **yes** |
| Target identity display | **pass** |
| Observed type | **資質 / クリエイター** |
| Report body visible | **yes** |
| Recovery / processing loop | **no** |
| Fatal error | **no** |
| checkout / payment / webhook | **no** |

---

## C. Saved report notice（Human）

| Check | Result |
|-------|--------|
| Notice appears in `/dtr/core` body area | **yes**（present） |
| Placement expectation | **PremiumHero 直下 · `#dtr-core-analysis` 直前**（per GUARD-A/B） |
| Canonical copy | **この保存版は、購入時点のプロフィールをもとに作成・保存されています。** |
| Exact copy match | **assumed pass**（Human: notice present；verbatim not re-typed in SSOT） |
| **Duplicate notice consecutively** | **not conclusively proven** — **do not record as confirmed duplicate** without screenshot showing two identical strips |
| `/dtr/core` notice change | **defer** unless true duplication reproduced |

**Hero non-compression:** **pass** — **資質 / クリエイター** stable with notice present.

**This gate:** `/dtr/core` notice copy **unchanged**（§C canonical line only）.

---

## C2. Additional attestation — `/core` ANALYST vs `/dtr/core` クリエイター（same birthDate）

**Human clarification（2026-05-21 addendum）：** observed split on **1983-02-28** is **not DB corruption**.

| Surface | Source | Observed type（Human） |
|---------|--------|------------------------|
| **`/core`** | **Current profile** + **v2 / current preview** path | **ANALYST**（分析類型 lane） |
| **`/dtr/core`** | **Existing legacy stored envelope**（`engine_context_json` NULL） | **クリエイター**（`TEN_STEM_DISPLAY` from snapshot） |

| Policy | Status |
|--------|--------|
| **Do not** overwrite existing saved envelope to v2 | **mandatory** |
| Snapshot / envelope mutation for “alignment” | **forbidden** |
| User may perceive **contradiction** on same birthDate | **acknowledged** — UX disclosure needed |

### C2.1 Future `/dtr/core` disclosure（separate from `/my` POLISH-A — not this gate）

**Consider later**（frontend-only, **adjacent to** notice strip — **not** replacing §C line yet）:

| Mode | Candidate copy direction |
|------|---------------------------|
| **Generic saved** | **購入時点の算定方式で保存されています** |
| **Legacy envelope** | **旧計算方式**（or equivalent quiet label） |

**Gate:** TBD（e.g. **`CORE-DTR-UI-CALC-DISCLOSURE-PLANNING`**）— **after** GUARD notice Production path；**no** notice rewrite until Human reproduces true duplicate or approves addendum.

**Explicit deferral this session:** §C primary notice **frozen**.

---

## D. `/my` UI（Human — polish finding）

| Check | Result |
|-------|--------|
| Opened | **yes** |
| v2 profile fields visible | **yes** |
| birthDate **1983-02-28** displayed | **yes** |
| country / timezone fields visible | **yes** |
| Fatal | **no** |

### D1. Non-fatal visual issue

| Observation | Severity |
|-------------|----------|
| Card header shows **プロフィール** and **プロフィール：旧形式** close together | **redundant / polish** — not fatal |

**Recommended fix（frontend-only — `CORE-DTR-UI-POLISH-A`）：**

| Element | Suggested |
|---------|-----------|
| **Header** | **プロフィール** |
| **Status badge** | **旧形式**（not duplicated in header line） |
| **Helper** | **購入前に、出生時刻（または時刻不明）と国を追加してください。** |

**Out of scope for polish:** backend, DB, snapshot, envelope, checkout, engine logic.

---

## E. Agent attestation（preview deploy）

| Item | Result |
|------|--------|
| Preview @ **`ff2af81`** | **Ready**（prior PREVIEW gate） |
| Logged-out smoke | **pass** |
| Production deploy | **no** |

---

## F. No-mutation statement

| Action | Status |
|--------|--------|
| checkout / payment / webhook | **no** |
| Production DB write / SQL | **no** |
| env change | **no** |
| snapshot UPDATE / DELETE | **no** |
| **CORE-DTR-VERIFY-C** | **no**（HOLD） |

---

## G. Next gates

| Priority | Gate |
|----------|------|
| **1** | **`CORE-DTR-UI-POLISH-A`** — `/my` profile card label structure（frontend-only） |
| **2** | **`CORE-DTR-UI-CALC-DISCLOSURE-PLANNING`**（proposed）— `/dtr/core` 算定方式 / legacy 表示（§C2.1）；**not** notice replacement |
| **3** | **`CORE-DTR-UI-GUARD-PRODUCTION-PLANNING`** or **EXECUTION** — notice deploy；calc disclosure optional parallel |
| **4** | **`CORE-DTR-UI-GUARD-DEPLOY-PREVIEW-R-COMMIT`** — commit this SSOT |

**Note:** Notice deploy to Production may proceed in parallel with **POLISH-A** if polish is **`/my` only** and does not block notice.

---

## H. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Human visual review @ preview |
| v1.1 | 2026-05-21 | §C2 `/core` vs `/dtr/core` type split attestation；calc disclosure deferred |
