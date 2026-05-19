# Phase 5-6H-5Z-I-V-AR — Clerk production-instance user_id continuity official / dashboard-safe confirmation planning gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AR** |
| **Title** | **Clerk production-instance user_id continuity official / dashboard-safe confirmation planning** |
| **Classification** | **Category 2 planning / dashboard-safe confirmation design / docs-only / no-mutation** |
| **Verdict** | **`CLERK_PRODUCTION_INSTANCE_USER_ID_CONTINUITY_CONFIRMATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AR-CLERK-PRODUCTION-INSTANCE-USER-ID-CONTINUITY-CONFIRMATION-PLAN-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production domain** | **`m55-webv2.vercel.app`** |
| **Prior AQ commit** | **`6927728`** |

**AR is design-only.** No Clerk Production instance creation, no AR-replay evidence recorded in this gate unless Human submits separately in **`5Z-I-V-AR-replay`**.

---

## B. Why this gate exists

| Fact | Implication |
|------|-------------|
| **Production auth compliance** | **RED** |
| **Supabase aggregate inventory** | **GREEN**（**`5Z-I-V-AP-S-R`**）— paid artifacts exist |
| **M55 paid access** | **Strongly `user_id`-bound**（entitlements, rights, snapshots, wallets, OTF） |
| **Clerk Production instance** | **Does not exist**（**`M55-Official`** Development only） |
| **Development → Production `user_id` continuity** | **`not_confirmed`** |
| **`5Z-I-V-AQ`** | Recommended **Option B** — official/dashboard-safe confirmation **before** creation |
| **Risk** | Creating/enabling Production instance without continuity proof may **orphan paid DTR / wallet access** |

**AR defines how to confirm continuity without mutation** — not the confirmation result itself.

---

## C. Current risk inventory（counts / safe labels only）

### Clerk

| Item | Value |
|------|--------|
| **Clerk app safe label** | **`M55-Official`** |
| **Current instance** | **Development** |
| **Total users** | **5** |
| **Active users** | **5** |
| **Production instance exists** | **no** |
| **`user_id` continuity** | **`not_confirmed`** |

### Supabase paid artifacts（**`5Z-I-V-AP-S-R`**）

| Artifact | Count |
|----------|-------|
| **entitlements** | **10** / distinct users **10** |
| **entitlement_rights** | **7** / distinct **7** |
| **dtr_report_snapshots** | **6** / distinct **6** |
| **reply_ticket_wallets** | **10** / distinct **10** |
| **reply_wallet_ledgers** | **17** / distinct **10** |
| **one_time_fulfillments** | **10** / distinct **7** |

### Risk summary

| Risk | Level |
|------|-------|
| **`user_id` change on namespace switch** | **high** |
| **AL authorized** | **no** |

### Code dependency（read-only — why continuity matters）

| Path | Role |
|------|------|
| **`lib/m55/dtrOwnershipGate.ts`** | Ownership resolves via **`.eq('user_id', userId)`** on snapshots, rights, entitlements, OTF |
| **`lib/m55/dtrShelfAccess.ts`** | Shelf access calls **`resolveEntryReportOwnership(userId)`** + snapshot by **`userId`** |
| **`lib/m55/dtrCoreCheckoutFulfillment.ts`** | Fulfillment writes all paid rows under **`expectedUserId`** from session |
| **`lib/m55/reply/replyTicketCheckoutValidate.ts`** | Wallets / snapshots keyed by **`user_id`** |

**If `auth()` returns a different Clerk ID after Production switch → fail-closed for prior paid users unless DB remap（`5Z-I-V-AT`）.**

---

## D. Confirmation methods to evaluate（non-mutating only）

| Method | Description | Allowed in AR? | Notes |
|--------|-------------|----------------|-------|
| **Method 1** | **Clerk official documentation / support answer** — does enabling Production under same app **preserve** Development **`user_id`**? | **yes** — **preferred** | Record **safe summary only**；no raw IDs/emails |
| **Method 2** | **Dashboard-safe pre-creation text review** — Human reads warning/preview **before** “Create Production” | **yes** | **Do not click create**；record **yes / no / unclear** only |
| **Method 3** | **Dedicated Human support inquiry** — ticket/chat with **`M55-Official`** safe label | **yes** | Support reply **summarized safely** in AR-replay |
| **Method 4** | **Create Production instance to observe** | **no in AR** | Requires **separate Category 2 execution gate**；rollback + mapping ready first |

### Method comparison

| Dimension | Method 1 | Method 2 | Method 3 | Method 4 |
|-----------|----------|----------|----------|----------|
| **Mutation risk** | **none** | **none**（if no click） | **none** | **high** |
| **Evidence strength** | **high** if official | **medium** | **high** if written answer | **observational** |
| **SSOT-safe** | **yes** | **yes** | **yes** | **only via execution gate** |
| **AR planning recommendation** | **primary** | **secondary** | **primary** | **deferred** |

---

## E. Human confirmation template（for **`5Z-I-V-AR-replay`**）

```
5Z-I-V-AR-replay Clerk user_id continuity confirmation

Raw ID / email / session / secret:
- shared: no

Source:
- official_docs / clerk_support / dashboard_precreation_text / unclear

Question:
- Does creating/enabling a Clerk Production instance under M55-Official preserve current Development user IDs?

Answer:
- yes / no / unclear

Safe source label:
-

If answer is yes:
- continuity confirmed without creating Production instance:
  yes / no / unclear
- caveats:
  none / unclear / summary only

If answer is no:
- user mapping/migration required:
  yes / no / unclear
- support/export/import path available:
  yes / no / unclear

If answer is unclear:
- reason:
  docs_ambiguous / dashboard_ambiguous / support_not_contacted / support_unclear / other

Mutation performed:
- no
```

**Forbidden in replay paste:** full **`user_…`** strings, emails, session tokens, API keys, screenshots containing PII.

---

## F. Decision rules for future AR-replay

### AR-replay GREEN（`CLERK_PRODUCTION_INSTANCE_USER_ID_CONTINUITY_CONFIRMATION_REPLAY_GREEN_NO_MUTATION`）

**All required:**

| Criterion | Required |
|-----------|----------|
| **Source** | **`official_docs`** OR **`clerk_support`** OR **`dashboard_precreation_text`** |
| **Answer** | **`yes`** — Development → Production **`user_id`** preserved |
| **Production instance created** | **no** |
| **Raw IDs / emails / secrets recorded** | **no** |
| **Mutation** | **no** |

**Does not authorize AL directly** — next is **AL-PRE revalidation**, rollback check, live-key availability, post-correction verify-without-payment.

### AR-replay BLOCKED（`…_BLOCKED_NO_MUTATION`）

| Trigger |
|---------|
| **Answer** = **`unclear`** |
| **Source** insufficient（e.g. forum guess, stale third-party blog only） |
| Confirmation **requires** creating Production instance |
| **Raw IDs** would be needed to proceed |
| Dashboard **cannot** confirm before mutation |

**Next:** **`5Z-I-V-AS`** exception governance **or** Method 3 support inquiry **or** refined docs search — **AL blocked**.

### AR-replay RED（`…_RED_NO_MUTATION`）

| Trigger |
|---------|
| Official/source confirms Development → Production **`user_id` NOT preserved** |
| **Mapping/migration required** before any env correction |

**Next:** **`5Z-I-V-AT`** user mapping / entitlement preservation planning — **AL blocked**.

---

## G. Branching after AR-replay

| AR-replay outcome | Next gate | AL |
|-------------------|-----------|-----|
| **GREEN** | **AL-PRE revalidation**（not **AL** directly）；rollback + **`pk_live_`** path + verify-without-payment | **still no** until chain complete |
| **BLOCKED** | **`5Z-I-V-AS`**（defer compliance）**or** renewed support/docs inquiry | **no** |
| **RED** | **`5Z-I-V-AT`** mapping / preservation planning | **no** |

**AR planning gate（本条）:** Human evidence **not** submitted in AR — **no AR-replay verdict** recorded here.

---

## H. No-mutation statement

**Explicitly confirmed — none performed in AR:**

- No raw key / secret / suffix / fragment recorded
- No full **user_id** / email / session recorded
- No full checkout session / payment intent / Stripe event ID recorded
- No Clerk Production instance creation
- No Clerk setting change
- No key generation or replacement
- No Vercel env change
- No redeploy / deploy / promote
- No code change
- No Production DB write
- No auth mutation
- No user creation or migration
- No Stripe / webhook / checkout / payment
- No runner execution

---

## I. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Type-label mismatch** | **separate** |
| **`npm run audit` Background NoTouch** | **separate** |
| **Full normal dev flow** | **NOT released** |
| **AR authorizes AL** | **no** |

---

## J. Next phase

| Priority | Gate | Note |
|----------|------|------|
| **1（recommended）** | **`5Z-I-V-AR-replay`** | Human submits **§E** template only — **no** instance creation |
| **Alternative** | **`5Z-I-V-AS`** | If Human defers auth compliance resolution |
| **Not in AR** | AR-replay execution | **Do not** record replay result in AR unless Human evidence already supplied（none in this gate） |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AR-CLERK-PRODUCTION-INSTANCE-USER-ID-CONTINUITY-CONFIRMATION-PLAN-001`** | **本条（planning）** |
| **`M55-EVID-20260519-5Z-I-V-AQ-PRODUCTION-CLERK-PRODUCTION-INSTANCE-FEASIBILITY-USER-ID-CONTINUITY-PLAN-001`** | prior feasibility |
| *Future:* **`M55-EVID-…-AR-REPLAY-…`** | AR-replay result（separate gate） |

---

## Prior gate reference

| Phase | Verdict |
|-------|---------|
| **AQ** | **`PRODUCTION_CLERK_PRODUCTION_INSTANCE_FEASIBILITY_USER_ID_CONTINUITY_PLANNING_GREEN_NO_MUTATION`** |
| **AR** | **`CLERK_PRODUCTION_INSTANCE_USER_ID_CONTINUITY_CONFIRMATION_PLANNING_GREEN_NO_MUTATION`** |
| **Continuity status** | Still **`not_confirmed`** until **AR-replay** |

---

## 未実行事項（AR）

- **AR-replay** not executed（no Human evidence in this gate）
- No Clerk Production instance
- No mutation
