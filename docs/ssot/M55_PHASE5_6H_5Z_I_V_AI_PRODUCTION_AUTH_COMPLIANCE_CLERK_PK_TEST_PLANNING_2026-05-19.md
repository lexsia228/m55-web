# Phase 5-6H-5Z-I-V-AI — Production auth compliance / Clerk pk_test planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AI** |
| **Title** | **Production auth compliance / Clerk pk_test planning** |
| **Classification** | **Category 3 separate track / planning-only** |
| **Verdict** | **`PRODUCTION_AUTH_COMPLIANCE_CLERK_PK_TEST_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AI-PRODUCTION-AUTH-COMPLIANCE-CLERK-PK-TEST-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Prior AH commit** | **`cbc42b0`** |

---

## B. Why this gate exists

| Fact | Implication |
|------|-------------|
| DTR **owned** unlock Production UI | **GREEN / closed**（**`5Z-I-V-AC`**） |
| **AC-P6** unpaid non-owned smoke | **GREEN**（**`5Z-I-V-AH`** — logged-out scope） |
| Neither closes auth compliance | **DTR GREEN ≠ auth compliance GREEN** |
| **Production auth compliance / Clerk `pk_test_`** | **unresolved separate track** |
| Prior diagnostics（**`5Z-I-V-K`–`M`**） | **`pk_test_` class on Production** suspected；duplicate Clerk app **conflict**；**`pk_live_` not visible** |
| Need dashboard confirmation before any correction | **AJ** = read-only Human prefix check；**no env change in AI or AJ** |

---

## C. Scope

### Allowed in AI（this gate）

- docs / SSOT
- read-only repo review
- planning
- future Human **Vercel + Clerk dashboard** read-only confirmation plan
- safe labels only
- prefix classification only（**`pk_test_` / `pk_live_` / `sk_test_` / `sk_live_`**）
- yes / no / unclear only

### Not allowed in AI

- raw key / secret recording
- full `user_id` / email / session recording
- env change / Vercel setting change / Clerk setting change
- redeploy / deploy / promote
- auth mutation / user creation / login operations
- Production DB write
- Stripe / webhook / checkout / payment
- runner execution
- code changes

---

## D. Current known state

| Item | Status |
|------|--------|
| **DTR owned unlock** | **GREEN / closed**（**`5Z-I-V-AC`**） |
| **AC-P6 unpaid non-owned** | **GREEN**（**`5Z-I-V-AH`** — **`logged-out-incognito-observation`**） |
| **Authenticated locked unpaid** | **NOT_RUN** optional |
| **Production auth compliance** | **unresolved** |
| **Full normal dev flow** | **NOT released** |
| **DTR unlock GREEN** | **must not** imply auth compliance GREEN |
| **Prior registry signal** | Vercel Production publishable **prefix class `pk_test_`**（**`5Z-I-V-K`** — redacted evidence only） |
| **Clerk winner** | **conflict / unresolved**（dual-app publishable match — **`5Z-I-V-I`/`G`**） |
| **`pk_live_` visible** | **no**（prior **`5Z-I-V-M`**） |

---

## E. Read-only repo findings

**Method:** ripgrep + file read only；**no env dump**；**no Production env values printed**.

### Files referencing Clerk env names

| Area | Files（representative） |
|------|-------------------------|
| **Diagnostics** | `app/api/diagnostics/env/route.ts` — lists **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**, **`CLERK_SECRET_KEY`**；returns **`len=`** only |
| **Root auth shell** | `app/layout.tsx` — **`ClerkProvider`**（no inline publishable prop — **env-driven**） |
| **Middleware** | `middleware.ts` — **`clerkMiddleware`** + **`auth.protect()`** on non-public routes |
| **DTR / purchase** | `app/dtr/page.tsx`, `app/dtr/core/page.tsx`, `app/dtr/lp/page.tsx`, `app/api/purchase/checkout/route.ts`, … |
| **API auth** | `app/api/me/entitlements/route.ts`, `app/api/dtr/report-snapshot-ready/route.ts`, `app/api/reply-tickets/checkout/route.ts`, … |
| **Client** | `components/dtr/DtrShelfPanel.tsx`, `components/shell/PublicHeader.tsx`, `app/sign-in/[[...sign-in]]/page.tsx`, … |
| **SSOT / audit** | `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md`, `docs/ssot/M55_PHASE5_6H_5Z_I_V_*` Clerk track |

### Dependency summary

| Question | Finding |
|----------|---------|
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` dependency** | **yes** — Clerk Next.js SDK reads publishable key from env at build/runtime（**`ClerkProvider`** + client components） |
| **`CLERK_SECRET_KEY` dependency** | **yes** — server **`auth()`**, **`currentUser()`**, middleware, protected API routes |
| **Literal `pk_test_` / `pk_live_` / `sk_*` in app source** | **no**（`.ts`/`.tsx` — keys not hardcoded） |
| **Code change required in AI** | **no** — compliance posture is **env + Clerk dashboard binding**；not an application-code defect from this review |
| **Ambiguity** | **unclear** whether current Production prefix class still **`pk_test_`** without fresh dashboard confirmation（**AJ** required） |

---

## F. Future human dashboard confirmation plan — **`5Z-I-V-AJ`**（not executed in AI）

**Next gate:** **Phase 5-6H-5Z-I-V-AJ — Production auth compliance / Clerk dashboard read-only confirmation gate**

**Human performs** Vercel + Clerk dashboard inspection **without pasting raw keys** into chat or SSOT.

| # | Check | Record only |
|---|--------|-------------|
| **1** | Vercel **Production** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` prefix class | **`pk_test_` / `pk_live_` / unclear** |
| **2** | Vercel **Production** `CLERK_SECRET_KEY` prefix class | **`sk_test_` / `sk_live_` / unclear** |
| **3** | Vercel **Preview** publishable prefix class（if safely visible） | **`pk_test_` / `pk_live_` / unclear** |
| **4** | Vercel **Preview** secret prefix class（if safely visible） | **`sk_test_` / `sk_live_` / unclear** |
| **5** | Clerk dashboard app **environment label** | **development / production / unclear** |
| **6** | Canonical domain **`m55-webv2.vercel.app`** association | **configured / not configured / unclear** |
| **7** | Publishable + secret **same Clerk app** | **yes / no / unclear** |
| **8** | Raw key in SSOT | **forbidden** |
| **9** | Key copy to AI | **forbidden** |

**AJ hygiene:** no env edit；no redeploy；no Clerk app delete；no user creation.

---

## G. Decision tree for future AJ

### AJ GREEN only if

- Production env prefix class is **compliant** **or** **intentionally accepted** and documented（Human policy decision — **not** auto-correct in AJ）
- Publishable + secret **same-app: yes**
- Canonical production domain association **confirmed** or **not required** with documented rationale
- **no** raw key/secret recorded
- **no** env change performed in AJ

### AJ BLOCKED if

- Human cannot inspect dashboard without exposing raw keys
- Prefix class **unclear**
- Same-app status **unclear**
- Domain association **unclear** and required for compliance decision

### AJ RED if

- Production **confirmed** non-compliant test-mode keys where production keys are required
- Publishable + secret **confirmed** cross-app mismatch
- Canonical production auth **confirmed** bound to wrong Clerk environment

**On RED:** still **no correction inside AJ** — escalate to Category **2** correction gate with explicit Human GO.

---

## H. Important distinction（diagnosis vs correction）

| Rule | Requirement |
|------|-------------|
| **`pk_test_` found on Production in AJ** | **Do not correct in AJ** |
| **Env / key correction** | Later **Category 2** gate + explicit Human GO（e.g. **`5Z-I-V-L`** lineage correction execution — **separate**） |
| **Redeploy after correction** | **Separate gate** |
| **Post-correction UI/auth verification** | **Separate gate** after any env change |
| **DTR unlock re-test** | Only if auth instance change risks **`user_id` orphan** — plan per **`5Z-I-V-M`** |

---

## I. Acceptance criteria for AI

| ID | Criterion | Result |
|----|-----------|--------|
| **AI-1** | Planning SSOT created | **pass** |
| **AI-2** | **`M55_SYSTEM_SSOT.md`** updated | **pass** |
| **AI-3** | Registry updated（auth compliance tracking） | **pass** |
| **AI-4** | Repo review read-only | **pass** |
| **AI-5** | No code changes | **pass** |
| **AI-6** | No env/redeploy | **pass** |
| **AI-7** | No Clerk/auth changes | **pass** |
| **AI-8** | No DB writes | **pass** |
| **AI-9** | No Stripe/webhook/checkout/payment | **pass** |
| **AI-10** | No raw keys/secrets/user/session recorded | **pass** |
| **AI-11** | Next gate **AJ** defined；**not executed** | **pass** |

---

## J. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN**（AH scope） |
| **Authenticated locked unpaid** | **NOT_RUN** optional |
| **Production auth compliance** | **unresolved** — **this track** |
| **Type-label mismatch** | **separate / open** |
| **`npm run audit` Background NoTouch** | **separate / open** |
| **Full normal dev flow** | **NOT released** |

---

## K. Next phase

| Field | Value |
|-------|--------|
| **Recommended next** | **Phase 5-6H-5Z-I-V-AJ — Production auth compliance / Clerk dashboard read-only confirmation gate** |
| **Not in AI** | env correction；redeploy；Clerk migration；login/user creation |
| **Optional parallel** | Type-label diagnostic planning；audit NoTouch planning；authenticated locked unpaid Human smoke |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AI-PRODUCTION-AUTH-COMPLIANCE-CLERK-PK-TEST-PLAN-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AH-UNPAID-PATH-NO-PAYMENT-SMOKE-EXECUTION-001`** | prior unpaid smoke |
| **`M55-EVID-20260518-5Z-I-V-K-DUPLICATE-CLERK-APP-CONFIG-READONLY-DIAGNOSTIC-001`** | prior **`pk_test_` on Production** signal |
| **`M55-EVID-20260518-5Z-I-V-AC-CANONICAL-PRODUCTION-UI-VERIFICATION-EXECUTION-001`** | DTR owned（must not conflate） |

---

## 未実行事項（AI）

- **AJ** dashboard confirmation **not run**
- no env / Clerk / Vercel / redeploy / DB / payment / auth mutation
- no raw identifiers recorded
