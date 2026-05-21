# Phase 5-6H-5Z-I-V-ENGINE-POST-DEPLOY-HUMAN-SMOKE — Production Human UI smoke（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-ENGINE-POST-DEPLOY-HUMAN-SMOKE** |
| **Title** | **Composite v2 post-Production Human UI smoke** |
| **Classification** | **Category 3 / Human UI verification / no checkout / no DB write** |
| **Verdict** | **`COMPOSITE_ASTROLOGY_V2_POST_DEPLOY_HUMAN_SMOKE_PARTIAL_AGENT_NO_AUTH`**（closed by **-R** → **GREEN**） |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-ENGINE-POST-DEPLOY-HUMAN-SMOKE-001`** |
| **Date** | **2026-05-21** |
| **Human GO** | **`ENGINE-POST-DEPLOY-HUMAN-SMOKE go`**（recorded） |
| **Production host** | **`https://m55-webv2.vercel.app`** |
| **Production commit** | **`6134048`** |
| **v2 fulfillment flag** | **off**（not enabled in gate） |
| **CORE-DTR-VERIFY** | **HOLD** |

**Agent constraint:** no Clerk session — **H1–H4 not exercised** on Production.** **Human must complete §G and record in **`ENGINE-POST-DEPLOY-HUMAN-SMOKE-R`**.

---

## B. H1–H6 results

| ID | Scope | Result | Notes |
|----|-------|--------|-------|
| **H1** | signed-in `/my` v2 profile UI | **not_run** | Agent — no Human auth |
| **H2** | signed-in `/core` profile preview | **not_run** | Agent — no Human auth |
| **H3** | owned `/dtr` shelf | **not_run** | Agent — no Human auth |
| **H4** | owned `/dtr/core` stored envelope | **not_run** | Agent — no Human auth |
| **H5** | checkout safety | **pass** | No checkout / payment / webhook in gate |
| **H6** | no-mutation | **pass** | No DB / SQL / env / snapshot / CORE-DTR-VERIFY resume |

---

## C. Agent anonymous sanity（Production @ `6134048`）

| Route | HTTP | Redirect |
|-------|------|----------|
| `/my` | **200** | —（signed-out shell expected） |
| `/core` | **200** | — |
| `/dtr` | **200** | — |
| `/dtr/core` | **307** | **`/dtr/lp`** |

**Fatal（agent）:** **none** on above.

---

## D. Code attestation @ `6134048`（expected Human labels — not runtime-observed）

| Surface | Expected |
|---------|----------|
| **H1 `/my`** | `#mp-birth-time`；checkbox **出生時刻は不明**；`#mp-country` default **JP / 日本**；`#mp-birthplace` optional；`profileFormatLabel` / legacy notice copy |
| **H2 `/core`** | ProfileRepository read；no forced checkout from core page alone |
| **H3 `/dtr` owned** | **`LABEL_PRODUCT_JP`** = **本質の読み解き**；unowned **Entry Report** |
| **H4 `/dtr/core`** | `resolveStoredEnvelopeRead` only；legacy mode when `engine_context_json` NULL；fail → recovery path not infinite loop in code |

---

## E. Observed labels（agent scope only）

| Element | Observed |
|---------|----------|
| Owned `/my` v2 fields | **not_observed** |
| Owned `/core` preview | **not_observed** |
| Owned `/dtr` shelf H1 | **not_observed** |
| Owned `/dtr/core` body | **not_observed** |
| Anonymous `/dtr/core` | **307 → `/dtr/lp`** |

**Recovery loop:** **not_observed**（agent）.

**Screenshots:** **none**（agent）.

---

## F. Fatal / checkout / mutation

| Check | Status |
|-------|--------|
| Fatal error | **not_observed**（agent anonymous scope） |
| Checkout executed | **no** |
| Payment / webhook | **no** |
| Production DB write | **no** |
| env / Stripe / Clerk / Slack change | **no** |
| snapshot UPDATE / DELETE | **no** |
| raw user_id / email / session / secret | **not recorded** |

---

## G. Human execution checklist（Production — copy to Human runbook）

**Host:** `https://m55-webv2.vercel.app` only.** **Account label:** org-designated owned test account（suffix pattern e.g. **`human-ui-current-user`** — **no raw IDs in SSOT**）.

### H1 — signed-in `/my`

| # | Check | Pass? |
|---|-------|-------|
| 1 | `/my` opens | |
| 2 | birthTime input visible | |
| 3 | **出生時刻は不明** checkbox visible | |
| 4 | country shows **日本** / JP not broken | |
| 5 | birthplace optional field visible | |
| 6 | legacy notice if legacy profile | |
| 7 | no fatal error | |

### H2 — signed-in `/core`

| # | Check | Pass? |
|---|-------|-------|
| 1 | `/core` opens | |
| 2 | profile preview not broken | |
| 3 | v2 incomplete does not force checkout from core alone | |
| 4 | no fatal | |

### H3 — owned `/dtr`

| # | Check | Pass? |
|---|-------|-------|
| 1 | saved shelf display OK | |
| 2 | product label **本質の読み解き** | |
| 3 | no Entry/Full Report regression | |
| 4 | no fatal | |

### H4 — owned `/dtr/core`

| # | Check | Pass? |
|---|-------|-------|
| 1 | saved report opens | |
| 2 | no recovery/processing loop | |
| 3 | report body non-empty | |
| 4 | legacy snapshot reads legacy envelope OK | |
| 5 | no fatal | |

### H5 — safety

| # | Check | Pass? |
|---|-------|-------|
| 1 | did not press purchase / checkout | |
| 2 | no payment | |

**Record Human results in:** **`ENGINE-POST-DEPLOY-HUMAN-SMOKE-R`**.

---

## H. Next Gate

| Condition | Gate |
|-----------|------|
| Human completes §G all pass | **`ENGINE-POST-DEPLOY-HUMAN-SMOKE-R`** → **GREEN**（**recorded 2026-05-21**） |
| Any H1–H4 fail | **`ENGINE-FIX-*`** |
| **-R doc** | `M55_PHASE5_6H_5Z_I_V_ENGINE_POST_DEPLOY_HUMAN_SMOKE_R_…_RESULT_2026-05-21.md` |

---

## I. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Agent pass — Human session pending |
