# Phase 5-6H-5Z-I-V-CORE-DTR-VERIFY-PLANNING — CORE-DTR verification restart（2026-05-21）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-CORE-DTR-VERIFY-PLANNING** |
| **Title** | **Composite v2 CORE-DTR verification restart planning** |
| **Classification** | **Category 1 / verification restart planning / docs-only / no execution** |
| **Verdict** | **`CORE_DTR_VERIFY_RESTART_PLANNING_GREEN_HOLD_LIFT_CONDITIONS_DEFINED`** |
| **Evidence ID** | **`M55-EVID-20260521-5Z-I-V-CORE-DTR-VERIFY-PLANNING-001`** |
| **Date** | **2026-05-21** |
| **CORE-DTR-VERIFY prior state** | **HOLD**（since composite v2 deploy track） |
| **Production commit（deploy）** | **`6134048`** |
| **v2 fulfillment flag** | **default OFF**（unchanged in this gate） |

**Planning only.** No checkout, payment, webhook replay, DB write, SQL, env change, or VERIFY execution.

---

## B. Preconditions satisfied（HOLD lift inputs）

| Gate / artifact | Verdict | Notes |
|-----------------|---------|-------|
| ENGINE-DEPLOY-PRODUCTION-EXECUTION | **GREEN** | `main` @ **`6134048`** |
| ENGINE-DEPLOY-PRODUCTION-R | **GREEN** | logged-out smoke |
| ENGINE-POST-DEPLOY-HUMAN-SMOKE-R | **GREEN** | H1–H4 pass；legacy stored envelope **preserved** |
| Production DDL | **applied** | `engine_context_json` / `engine_version` additive |
| GX-01 local / VERIFY-A | **GREEN** | **9 / 癸 / アナリスト** |
| Existing Production snapshots | **legacy NULL** | **6/6** preserved — Human attested on owned `/dtr/core` |
| CORE-DTR-VERIFY-A plan | **GREEN** | `…VERIFY_A_NEW_UNPAID_USER…` |

**HOLD is liftable for the VERIFY *chain*** — execution still requires ordered gates + Human GO per step（§J）.

---

## C. Two-track model（do not conflate）

| Track | Purpose | v2 flag required? |
|-------|---------|-------------------|
| **Track 1 — CORE-DTR-VERIFY** | Free `/core` vs paid `/dtr/core` **snapshot immutability**；one live purchase；counts-only ops | **NO** — flag **OFF**；new purchase uses **legacy** `runDtrEngine` fulfillment |
| **Track 2 — ENGINE v2 fulfillment** | New purchases write **`m55-composite-stem-v2`** + `engine_context_json` | **YES** — separate **`ENGINE-ENV-GO`** gate |

**VERIFY-C with flag OFF:** new snapshot gets **legacy envelope**（1983-02-28 → JDN lane **3 / 丁** on fulfillment path）while **free `/core`** may show **ANALYST / 静観分析**（TYPE_CATALOG / composite preview paths）— **not a VERIFY failure** if documented as **flag-off expected split**；**Tier B vs AC-PAY-01–02** reconciliation in VERIFY-A §I still applies.

**Track 2 is not blocking Track 1 HOLD lift** — only blocking “v2 purchase golden on new rows.”

---

## D. §1 — HOLD解除条件

| # | Condition | Status |
|---|-----------|--------|
| **L1** | Production composite v2 **code** deployed @ **`6134048`**+ | **satisfied** |
| **L2** | Production logged-out + Human smoke **GREEN** | **satisfied** |
| **L3** | Legacy owned `/dtr/core` **not broken** by deploy | **satisfied**（Human） |
| **L4** | **CORE-DTR-VERIFY-A** planning doc current | **satisfied** |
| **L5** | **VERIFY-B** preflight counts **GREEN**（`failed_fulfillments_24h = 0`） | **pending Human** |
| **L6** | **Human GO** per gate（VERIFY-C separate phrase） | **pending** |
| **L7** | Notify runtime risk accepted or **AS-B6-DISABLE-D** redeploy | **recommended**（§F VERIFY-A） |

**HOLD lift declaration:** effective when **L5 + L6** for the target gate.** **L1–L4** already met.

---

## E. §2 — 新規v2購入検証の対象ユーザー・入力

| Field | Value |
|-------|--------|
| **Cohort** | **New unpaid** Clerk user（no prior DTR entitlement） |
| **Notebook label only** | **`human-test-19830228-new-user`** |
| **Profile input** | **`birthDate = 1983-02-28`**；nickname任意 |
| **v2 profile fields** | **birthTime** or **時刻不明** + **country JP** before checkout（B5 gate） |
| **Timezone** | Resolved **Asia/Tokyo** on save |
| **Do not use** | Existing owned **`human-ui-current-user`** for VERIFY-C（confounds +1 count） |

**Pre-purchase UI（VERIFY-A exec / pre-VERIFY-C）：** §H of VERIFY-A doc.

---

## F. §3 — v2 fulfillment flag をいつ ON にするか

| When | Gate | Prerequisite |
|------|------|--------------|
| **Not in CORE-DTR-VERIFY chain** | **`ENGINE-ENV-GO`**（dedicated） | Human ops approval |
| **After** | Staging one-shot purchase + webhook（optional） | Shadow/staging DB |
| **Production ON** | **Separate** from VERIFY-C default | **Track 1 complete** OR explicit parallel GO |

| Rule | Detail |
|------|--------|
| **Default now** | **`M55_COMPOSITE_ENGINE_V2_FULFILLMENT_WRITE_ENABLED` unset / not `true`** |
| **VERIFY-C default plan** | **flag OFF** — validates legacy fulfillment + snapshot firewall |
| **Production ON timing** | Only after **`ENGINE-ENV-GO`** + redeploy attestation |

---

## G. §4 — checkout / payment を1回だけ行う条件

| # | Condition |
|---|-----------|
| **C1** | **VERIFY-B** GREEN（§H preflight） |
| **C2** | **Human GO:** **`CORE-DTR-VERIFY-C go`**（exact phrase — separate from EXEC GO） |
| **C3** | Pre-purchase checklist §H **pass** |
| **C4** | Production host **`m55-webv2.vercel.app`** only |
| **C5** | **Exactly one** ¥1,000 live checkout — **`DTR_CORE_STATIC_V1`** |
| **C6** | Profile **v2 complete** at checkout（else **400** `composite_profile_incomplete`） |
| **C7** | **No** second charge；**no** refund in same session unless abort gate |
| **C8** | Webhook W1–W4（VERIFY-A §E）pass |

**Forbidden in VERIFY-C:** webhook replay；manual entitlement insert；snapshot UPDATE/DELETE.

---

## H. §5 — webhook 観察条件

| # | Observation | Record in SSOT |
|---|-------------|----------------|
| **W-O1** | Stripe Dashboard → event **`checkout.session.completed`** | **status code only**（e.g. 200） |
| **W-O2** | No manual replay | **yes/no** |
| **W-O3** | Vercel function log | **event class only** — no raw payload |
| **W-O4** | Latency | optional safe label（`< 60s`） |
| **W-O5** | Failure | **stop** → do not proceed to VERIFY-D；open ops gate |

**Code path（read-only）：** `app/api/stripe/webhook/route.ts` → `fulfillDtrCoreFromCheckoutSessionId` → INSERT snapshot.

---

## I. §6 — counts-only preflight / postflight

**Template:** VERIFY-A §G（copy unchanged）.

| Phase | Gate | Timing |
|-------|------|--------|
| **Preflight** | **CORE-DTR-VERIFY-B** | Before VERIFY-C |
| **Postflight（15m）** | **CORE-DTR-VERIFY-D** | After webhook + UI open |
| **Postflight（24h）** | **CORE-DTR-VERIFY-E** | AS-B1 cadence style |

**Global counts only** — not filtered by test user ID in SSOT.

**Delta slots:** `entitlements_dtr_total_after`；`dtr_report_snapshots_dtr_total_after`；`failed_fulfillments_24h_after` — expect **+1** / **+1** / **0** on success.

---

## J. §7 — failed_fulfillments stop条件

| Condition | Action |
|-----------|--------|
| **`failed_fulfillments_24h > 0`** at preflight | **STOP** — no VERIFY-C |
| **New failure after VERIFY-C** | **STOP** VERIFY-D GREEN — ops gate |
| **`failed_fulfillments_total` spike** without explanation | **STOP** — Human judgment |
| **Active bleed**（paid-but-not-unlocked） | **STOP** |

**No repair via snapshot DELETE** in VERIFY chain.

---

## K. §8 — snapshot / engine_context_json / engine_version 確認方法

| Mode | `engine_version` | `engine_context_json` | Read path |
|------|------------------|-------------------------|-----------|
| **Legacy（existing 6 + flag-off new）** | **NULL** | **NULL** | `resolveStoredEnvelopeRead` → **legacy** `envelope_json` |
| **v2（flag-on future）** | **`m55-composite-stem-v2`** | populated | **v2** envelope + context stem match |

**Human confirmation（no raw row paste）：**

| Check | Method |
|-------|--------|
| Snapshot exists | counts **+1**；UI **保存版** opens |
| `birthDate` in snapshot | UI meta / edit-after-purchase test（AC-SNP-03） |
| v2 columns on new row（flag off） | Expect **NULL** — confirm via counts-only optional column tally gate |
| v2 columns（post ENGINE-ENV-GO） | Separate gate — expect non-NULL + stem **9** |

**Forbidden:** `SELECT *`；paste `envelope_json` / `profile_snapshot` into SSOT.

---

## L. §9 — legacy snapshot 保護

| Rule | VERIFY chain |
|------|--------------|
| **6 existing rows** | **no UPDATE / DELETE** |
| **Owned Human smoke** | legacy envelope **preserved** @ deploy |
| **Code** | INSERT-only；existing snapshot early return in `dtrDraftDb` |
| **Repair** | **no** “fix stem” UPDATE on legacy rows in VERIFY |
| **AC-SNP-06** | **mandatory pass** |

---

## M. §10 — rollback / stop条件

| Trigger | Action |
|---------|--------|
| VERIFY-C payment wrong user / double charge | **refund gate**（separate）；document incident |
| Fulfillment failure | **stop**；counts + ops；**no** snapshot delete |
| Paid UI regression on **existing** owned | **Vercel rollback** to pre-`6134048`；flag stays off |
| Accidental **flag ON** | **env gate** revert + redeploy |
| CORE-DTR policy violation（live profile overwrites paid body） | **RED** VERIFY-D — code fix gate，not snapshot delete |

**V2 deploy rollback does not require DB rollback**（additive DDL）.

---

## N. Execution gate chain（ordered）

| Order | Gate | Mutation |
|-------|------|----------|
| **0** | **本条 PLANNING** | none |
| **1** | **CORE-DTR-VERIFY-B** | none — counts preflight |
| **2** | **AS-B6-DISABLE-D**（recommended） | redeploy only |
| **3** | **CORE-DTR-VERIFY-A-EXEC**（optional） | Human pre-purchase UI |
| **4** | **CORE-DTR-VERIFY-C** | **one checkout** |
| **5** | **CORE-DTR-VERIFY-D** | none — 15m |
| **6** | **CORE-DTR-VERIFY-E** | none — 24h |
| **7** | **ENGINE-ENV-GO** | env + redeploy（Track 2） |

**HOLD status after this plan:** **liftable for step 1** — VERIFY execution **not started** until **VERIFY-B** Human completes.

---

## O. No-mutation statement

- **No** checkout / payment / webhook replay / DB write / SQL / env / Stripe / Clerk / Slack  
- **No** snapshot UPDATE / DELETE  
- **No** CORE-DTR-VERIFY execution in this gate  
- **No** raw user_id / email / session / secret in SSOT

---

## P. Next gates

| Priority | Gate |
|----------|------|
| **1** | **CORE-DTR-VERIFY-B** — Human counts-only preflight |
| **2** | **CORE-DTR-VERIFY-B-R** — result commit（docs） |
| **3** | **CORE-DTR-VERIFY-A-EXEC** or pre-C checklist |
| **4** | **CORE-DTR-VERIFY-C** — after **`CORE-DTR-VERIFY-C go`** |

**Optional:** **CORE-DTR-VERIFY-PLANNING-COMMIT** — commit this doc.

---

## Q. Evidence registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-VERIFY-PLANNING-001`** | **本条** |
| **`M55-EVID-20260521-5Z-I-V-CORE-DTR-VERIFY-A-…-001`** | Detailed VERIFY-A plan |
| **`M55-EVID-20260521-5Z-I-V-ENGINE-POST-DEPLOY-HUMAN-SMOKE-R-001`** | Human smoke GREEN |

---

## R. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-21 | Restart planning after v2 Production + Human smoke |
