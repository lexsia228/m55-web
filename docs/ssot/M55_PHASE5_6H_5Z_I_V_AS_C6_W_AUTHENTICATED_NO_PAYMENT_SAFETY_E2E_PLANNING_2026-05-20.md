# Phase 5-6H-5Z-I-V-AS-C6-W — Authenticated no-payment safety E2E planning gate（2026-05-20 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AS-C6-W** |
| **Title** | **Authenticated no-payment safety E2E planning** |
| **Classification** | **Category 1 / docs-only / no external mutation** |
| **Verdict** | **`AUTHENTICATED_NO_PAYMENT_SAFETY_E2E_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260520-5Z-I-V-AS-C6-W-AUTHENTICATED-NO-PAYMENT-SAFETY-E2E-PLAN-001`** |
| **Date** | **2026-05-20** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Production deployed SHA** | **`4efd4af`** |

**Execution in AS-C6-W:** **none** — planning only.

---

## B. Prior gate reference

| Phase | Verdict | Evidence | Commit |
|-------|---------|----------|--------|
| **AS-C6-V** | **`PROMPT_SAFETY_OUTPUT_SANITIZER_POST_DEPLOY_NO_PAYMENT_VERIFICATION_PARTIAL_GREEN`** | **`M55-EVID-20260520-5Z-I-V-AS-C6-V-POST-DEPLOY-NO-PAYMENT-SAFETY-VERIFICATION-RESULT-001`** | **`16eb4e1`** |
| **AS-C6-D-R** | **`PROMPT_SAFETY_OUTPUT_SANITIZER_IMPORT_FIX_REDEPLOY_GREEN_NO_ENV_NO_DB`** | **`M55-EVID-20260520-5Z-I-V-AS-C6-D-R-…-001`** | **`4efd4af`** |

**Reason for AS-C6-W:** **AS-C6-V** left **consult / reply / output sanitizer runtime / authenticated owned DTR** as **not_tested** due to auth + DB/LLM/ticket risk.

| **AS-C2 / AS-C5-B on Production** | **yes** in build **`4efd4af`** |

---

## C. Planning principle

| Rule | Requirement |
|------|-------------|
| **no-payment only** | No checkout；no live charge |
| **no-checkout only** | Do not open Stripe checkout session |
| **no DB mutation intent** | No intentional writes；no repair |
| **no ticket / wallet consumption** | Consult credits / reply tickets must not decrement in tests |
| **no repair** | Historical artifacts untouched |
| **no Stripe / webhook / payment** | Out of scope |
| **no env / auth change** | Clerk settings frozen |
| **safe labels only** | yes/no/pass/fail/not_tested；no raw user_id/email/session |
| **fail-safe default** | If mutation risk cannot be ruled out → **not_tested** |

---

## D. Test surface matrix

| # | Surface | Goal | Safe precondition | Allowed test | Expected result | Mutation risk | Stop condition | Result field |
|---|---------|------|-------------------|--------------|-----------------|----------------|----------------|--------------|
| 1 | **Authenticated owned DTR** | Owned shelf opens；no false unpaid | Human **already-owned** account；Production **`4efd4af`** | Browser GET **`/dtr`**；optional **`/dtr/core`** **without checkout click** | Saved/open affordance；no purchase CTA dominance；no fatal error | Low（read UI）；ownership reads may occur server-side | Checkout opens；payment prompt | `authenticated_owned_dtr_path` |
| 2 | **Signed-in unpaid DTR** | Unpaid shelf correct | Human **known-unpaid** account if available | GET **`/dtr`** only；**no CTA click** | Purchase CTA visible；no **保存済み** false positive | Low | Checkout；owned false positive | `signed_in_unpaid_dtr_path` |
| 3 | **Consult high-risk input block** | Input guard before LLM/DB write | Owned user；**one** high-risk string ≥10 chars（medical/legal/financial category） | **Single** authenticated POST **`/api/room/core/send`** only if Human confirms block path | **422** `{ error: 'blocked', safeMessage }`；**no** assistant message persisted；**no** credit consume | **Medium** — `resolveEntryReportOwnership` reads DB **before** block（L79–93）；block at L118–128 **before** `getSupabaseAdmin` thread path | LLM invoked；insert succeeds；credits decrement | `consult_high_risk_block` |
| 4 | **Reply high-risk input block** | Block before session/RPC/ticket | Authenticated user；high-risk theme/subquestions | **Single** POST **`/api/reply/generate`** with idempotency key **not** reused from paid success | **422** `SAFETY_BLOCKED`；**before** wallet RPC | **Low–medium** — block at L228–244 **before** `getSupabaseAdmin` session insert（L246+） | Session created + RPC；wallet decrements | `reply_high_risk_block` |
| 5 | **Output sanitizer runtime** | Live output safety | Production path without LLM/DB | **Do not execute** on Production consult（LLM → insert → consume） | Output block at L217–225 only after LLM | **High** — LLM + `consult_messages.insert` + wallet | Any message insert or ticket consume | `output_sanitizer_runtime` |
| 6 | **Public disclaimer / terms** | Post-deploy copy stable | Signed-out or signed-in | GET **`/legal/terms`**；optional footer page | **200** + medical/legal/investment disclaimer | **None** | N/A | `public_disclaimer_visible` |
| 7 | **Signed-out unpaid regression** | AC-P6 shelf unchanged | Incognito / signed-out | Repeat **AS-C6-V** checks on **`/dtr`**, **`/dtr/core` HEAD** | CTA yes；307 to LP；no payment | **None** | Regression vs AS-C6-V | `signed_out_unpaid_regression` |

### Repo read-only anchors（W planning）

| Route / module | Block point | W-R implication |
|----------------|-------------|-----------------|
| **`send/route.ts` L118–128** | Input safety **before** thread DB (L130+) | Consult high-risk **may** be testable with ownership read-only side effect |
| **`send/route.ts` L217–225** | Output safety **after** OpenAI | **not_tested** unless non-Production harness |
| **`reply/generate` L228–244** | Input safety **before** session insert (L246+) | Reply high-risk **may** be testable without ticket if 422 |
| **`reply/generate` L422+** | Output sanitizer on **stub** only | Runtime output test **not_tested** on Production without passing input + session path |
| **`m55AiOutputSanitizer.ts`** | Stateless | Relies on **AS-C5-C** when runtime unsafe |

---

## E. Safe test design

### 1. Authenticated owned DTR path

- Use **already-owned** Human account only（no new purchase）.
- Observe **`/dtr`** and optionally **`/dtr/core`**（navigation only）.
- **Do not** click **1,000円で入手** or checkout.
- Record: **yes / no / not_tested** + safe label（e.g. `owned-shelf-observed`）.

### 2. Signed-in unpaid DTR path

- Use **known-unpaid** account **only if** Human confirms safe non-owned state.
- **Do not** click purchase CTA.
- Record: **yes / no / not_tested**.

### 3. Consult high-risk block

- Fixture examples（≥10 chars）：medical diagnosis request；investment advice；jailbreak attempt（pick **one** per run）.
- **Pre-check:** confirm response is **422** with **`blocked`** and **no** new assistant row（Human verifies thread UI or API body only）.
- **Stop** if OpenAI call would proceed（503/200 with AI text）.
- If Human cannot confirm zero credit consume → **not_tested**.

### 4. Reply high-risk block

- Fixture: off-scope theme or medical/legal combined theme + subquestions.
- Expect **`SAFETY_BLOCKED`** @ **422** before success payload.
- Use **fresh idempotency key** per attempt；**do not** chain into successful generation.
- **Stop** if `ok: true` or wallet fields change.

### 5. Output sanitizer runtime

- **Production consult:** **not_tested** — requires LLM + DB insert.
- **Production reply:** stub path still creates session after input allow — unsafe for “output only” probe.
- **Fallback evidence:** **AS-C5-C** O1–O12 + deploy SHA **`4efd4af`**.

### 6–7. Public / signed-out regression

- Repeat **AS-C6-V** matrix（HTTP read-only）.

---

## F. Human execution result template

**Gate label:** **`5Z-I-V-AS-C6-W-R`** — Authenticated no-payment safety E2E result

```
Raw ID / email / session / Stripe ID / secret:
  shared: no

Target:
  environment: Production
  domain: m55-webv2.vercel.app
  deployed SHA: 4efd4af
  no-payment: yes
  checkout started: no
  DB/SQL intentionally used: no
  env/auth changed: no

Verification:
  authenticated_owned_dtr_path:     yes / no / not_tested
  signed_in_unpaid_dtr_path:        yes / no / not_tested
  consult_high_risk_block:            pass / fail / not_tested
  reply_high_risk_block:              pass / fail / not_tested
  output_sanitizer_runtime:           pass / fail / not_tested
  public_disclaimer_visible:          yes / no / not_tested
  signed_out_unpaid_regression:       pass / fail / not_tested

Mutation confirmation:
  checkout/payment: no
  webhook replay: no
  DB write intentionally performed: no
  ticket/wallet consumed: no
  raw IDs/secrets shared: no

Result:
  GREEN / PARTIAL_GREEN / BLOCKED / RED

Next action:
  no action / focused replan / repair planning / rollback planning
```

---

## G. Verdict criteria for future AS-C6-W-R

| Verdict | Criteria |
|---------|----------|
| **GREEN** | Owned DTR path **pass**；**≥1** of consult or reply high-risk block **pass** without mutation；no checkout/payment/DB write intent；no raw IDs |
| **PARTIAL_GREEN** | UI checks **pass**；route guards **not_tested** for valid mutation-risk reasons；**AS-C5-C** remains valid；no mutation |
| **BLOCKED** | No safe authenticated target；SHA unclear；insufficient evidence |
| **RED** | Checkout/payment triggered；unsafe answer；ticket/wallet consumed；owned/unpaid regression；raw IDs；env/DB/Stripe/Clerk mutation |

---

## H. Stop conditions

Stop **immediately** if:

| Condition |
|-----------|
| Checkout page would open |
| Payment or Stripe session required |
| DB write cannot be ruled out（message insert；session insert；wallet update） |
| Ticket / consult credit / reply wallet decrement observed |
| Raw IDs / secrets would need to be pasted into SSOT |
| Support / paid user impact appears |
| Route returns **200** with unsafe medical/legal/financial concrete advice |
| Production target SHA ≠ **`4efd4af`** without replan |
| LLM generation triggered for consult output sanitizer test |

---

## I. No-mutation statement

- **No** checkout / payment / webhook replay
- **No** env / model / provider change
- **No** Production DB connection for gate planning
- **No** DB write / SQL / repair in **AS-C6-W**
- **No** Stripe / payment mutation
- **No** Clerk / auth change
- **No** notification integration
- **No** raw key / secret / user_id / email / session / Stripe ID in SSOT
- **No** **AL / AL-PRE** / **AX-PROD**
- **No** full normal dev flow release
- **No** POST / authenticated route execution in **AS-C6-W**

---

## J. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** — **W-R** may recheck no-payment UI only |
| **AC-P6 unpaid** | **GREEN** — **W-R** may recheck signed-in unpaid if safe user exists |
| **Production auth compliance** | **RED** under **AS** |
| **AX-PROD** | **BLOCKED** |
| **AS-B1** | **Monitored historical finding** — **AS-B1-MONITOR** at paid-test |
| **Automated notification** | **AS-B2/B3** later |
| **Full normal dev flow** | **NOT released** |

---

## K. Next phase

| Priority | Gate | When |
|----------|------|------|
| **Recommended** | **`5Z-I-V-AS-C6-W-R`** | Human executes no-payment tests within §H stop conditions |
| **Alternative** | **`AS-B1-MONITOR`** | Paid-test / traffic checkpoint near |
| **Alternative** | Thread handoff | Heavy session |

**AS-C6-W does not authorize execution.**

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260520-5Z-I-V-AS-C6-W-AUTHENTICATED-NO-PAYMENT-SAFETY-E2E-PLAN-001`** | **本条** |
