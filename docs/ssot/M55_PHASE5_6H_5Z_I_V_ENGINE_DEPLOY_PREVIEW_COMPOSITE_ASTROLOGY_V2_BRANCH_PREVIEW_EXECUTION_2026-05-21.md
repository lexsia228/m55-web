# Phase 5-6H-5Z-I-V-ENGINE-DEPLOY-PREVIEW — Branch preview execution（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-DEPLOY-PREVIEW** |
| **Title** | **Composite v2 branch preview deploy and smoke** |
| **Classification** | **Category 2 / preview deploy + HTTP smoke / no Production** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_DEPLOY_PREVIEW_PARTIAL_RED`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-DEPLOY-PREVIEW-001`** |
| **Date** | **2026-05-21** |
| **Branch** | **`work/home-cluster`** |
| **Target commit (git)** | **`a6ddc5e`** |
| **Production deploy** | **no** |
| **main push** | **no** |

---

## B. Deploy target attestation

| Check | Result |
|-------|--------|
| Vercel target | **Preview**（not Production） |
| Project safe label | **`m55-webv2`** |
| Git branch | **`work/home-cluster`** |
| Intended git SHA | **`a6ddc5e`** |
| Production domain promotion | **not executed** |

---

## C. Build result（two paths）

### C1. GitHub / Vercel integration @ `a6ddc5e`

| Field | Value |
|-------|--------|
| GitHub Deployment ID | **4768839140** |
| Environment | **Preview** |
| Ref / SHA | **`a6ddc5e`** |
| Status | **failure** |
| Failure URL (safe label) | **`m55-webv2-16lokvc9a-m55-official.vercel.app`** |
| Root cause (build log class) | Client bundle pulled **`loadCalendarBundle`** (`node:fs` / `node:path`) via **`birthProfileV2` → `profile` → client components** |

### C2. Agent CLI preview deploy（workspace with build fix — uncommitted）

| Field | Value |
|-------|--------|
| Command | `npx vercel deploy --yes` |
| Vercel status | **Ready** |
| Preview URL (safe label) | **`https://m55-webv2-r32d6z2xc-m55-official.vercel.app`** |
| Alias (safe label) | **`https://m55-webv2-lexsia228-m55-official.vercel.app`** |
| Deployment ID | **`dpl_228gbQSWAdEHMqBQycQys6QVhTbj`** |
| Includes uncommitted fix | **`lib/m55/calendar/countryTimezone.ts`** + import split（see §H） |

**Local `npm run build`:** webpack **compile success** after fix；prerender requires Clerk env locally（expected on Vercel with env).

---

## D. Runtime HTTP smoke（logged-out / anonymous）

**Target:** preview URL **`m55-webv2-r32d6z2xc-m55-official.vercel.app`**（§C2 Ready deployment）

| Path | HTTP | Notes |
|------|------|--------|
| `/` | **200** | no fatal page |
| `/my` | **200** | Clerk **サインイン** shell（signed-out expected） |
| `/core` | **200** | no server fatal |
| `/dtr` | **200** | **マイ** text present in HTML |
| `/dtr/lp` | **200** | storefront OK |
| `/dtr/core` | **200** → **`/dtr/lp`** | **fail-closed redirect** when unauthenticated — **expected** |

**Fatal check:** no standalone **Application error** page on above paths.

---

## E. not_run（Human / auth required）

| Item | Reason |
|------|--------|
| My Page v2 fields (`mp-country`, 出生時刻は不明, etc.) | **Signed-out** — SSR HTML shows **サインイン** only；v2 intake requires **Human Clerk session** |
| `/dtr/core` stored envelope read (owned + snapshot) | **No auth** + **no checkout/DB** in this gate |
| Checkout / payment / webhook | **forbidden** — not executed |
| `M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED` | **not enabled** — not verified ON |
| Production `m55-webv2.vercel.app` promotion | **not run** |

---

## F. Flag / env

| Item | Status |
|------|--------|
| Fulfillment v2 flag | **not enabled**（no env change in gate） |
| Env values / secrets | **not recorded** |
| Stripe / Clerk / Slack env | **unchanged** by this gate |

---

## G. Stop conditions

| ID | Triggered? |
|----|------------|
| Preview pointed at Production | **no** |
| Source commit mismatch for GH deploy | **no**（GH used `a6ddc5e`） |
| Build failed @ `a6ddc5e` | **yes** → **PARTIAL RED** |
| `/my` `/core` `/dtr` server fatal | **no** on §C2 URL |
| Checkout executed | **no** |
| Flag accidentally ON | **no** |
| CORE-DTR-VERIFY resumed | **no** |

---

## H. Blocker fix（workspace — not yet on `a6ddc5e`）

| File | Change |
|------|--------|
| `lib/m55/calendar/countryTimezone.ts` | **new** — client-safe static JSON TZ lookup |
| `lib/soul/birthProfileV2.ts` | import from `countryTimezone.ts` not `loadCalendarBundle` |
| `lib/m55/calendar/loadCalendarBundle.ts` | delegate `lookupCountryTimezone` to shared module |

**Required before GREEN @ git `a6ddc5e` lineage:** commit + push + Vercel preview rebuild.

---

## I. No-mutation boundary

| Boundary | Status |
|----------|--------|
| Production deploy | **no** |
| main push | **no** |
| checkout / payment / webhook | **no** |
| Production DB / SQL | **no** |
| env change | **no** |
| snapshot UPDATE/DELETE | **no** |
| CORE-DTR-VERIFY restart | **no** |

---

## J. Next gate

| Priority | Gate |
|----------|------|
| **1** | **ENGINE-FIX-CLIENT-BUNDLE-COMMIT**（or combined fix commit）— `countryTimezone` split |
| **2** | **ENGINE-DEPLOY-PREVIEW-R** — after GH preview @ fix commit is **Ready** |
| **3** | Human signed-in smoke for `/my` v2 fields + optional owned `/dtr/core` stored envelope |

**Do not** proceed to Production planning until preview build **GREEN** on pushed commit.
