# Phase BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-D-EXEC-PLANNING-REFRESH — Execution packet refresh（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-D-EXEC-PLANNING-REFRESH** |
| **Title** | **Refresh `FRESH-CHECKOUT-D-EXEC` execution conditions post preview-consistency re-run GREEN** |
| **Classification** | **Category 1 / planning refresh only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_CHECKOUT_D_EXEC_PLANNING_REFRESH_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-FRESH-CHECKOUT-D-EXEC-PLANNING-REFRESH-001`** |
| **Date** | **2026-05-23** |
| **Production anchor** | **`2ef7ae8`** · deployment **`4792824029`** · state **`success`** |
| **Prior unblock** | **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R` re-run GREEN** @ **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R-RERUN-001`** |
| **Supersedes for execution** | **`FRESH-CHECKOUT-E2E-PLANNING`** §B HOLD row · §C PRE-5 profile gate · §I checkout HOLD rationale |
| **Mutation in this gate** | **no** |
| **Checkout / payment** | **HOLD** until **fresh `FRESH-CHECKOUT-D-EXEC go`** |

**Planning refresh GREEN.** Execution packet updated for Production @ **`2ef7ae8`** · preview/profile/CTA alignment **closed** · **no payment in this gate**.

---

## B. Current state（refreshed）

| Field | Status |
|-------|--------|
| **Production** | **`2ef7ae8`** · **`success`** |
| **Preview consistency** | **GREEN** · no **`クリエイター`** · generic or **`アナリスト`** aligned |
| **Profile gate** | **`IMPLICIT_UNKNOWN_TIME_AT_CHECKOUT`** · nickname + birthDate only |
| **Human `/my`** | birthTime purchase-blocking copy **absent** · optional helper only |
| **Human `/dtr/lp`** | CTA **eligible** · **not clicked** |
| **Human `/core`** | ANALYST / 静観分析 **PASS** |
| **Cohort** | **`launch-cohort-primary`** |
| **Pre-payment ownership** | **`Not owned`** expected · **`/dtr/core` → 307 `/dtr/lp`** |
| **Legacy proof** | **`legacy_test_inventory` / not_launch_proof** — **prohibited** |
| **Prior `FRESH-CHECKOUT-D-EXEC go`** | **consumed** by original **`PREVIEW-CONSISTENCY-R` STOP** |
| **Fresh GO** | **required** — phrase **`FRESH-CHECKOUT-D-EXEC go`** |
| **P1 non-blocker** | CTA disabled-like styling · Human confirmed **clickable** |

---

## C. Refreshed execution packet

### C.1 Cohort confirmation

| Rule | Value |
|------|--------|
| **Cohort label** | **`launch-cohort-primary`** only |
| **Account type** | Post-cutover Production Clerk session |
| **Legacy dependency** | **none** · do not match **`legacy_test_inventory`** hash band |
| **Attestation start** | **`FRESH-ACCOUNT-NO-PAYMENT-R` GREEN** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-ACCOUNT-NO-PAYMENT-R-001`** |
| **Reconfirm before payment** | Signed-in · **`GET /api/room/core` → Not owned** · no prior DTR purchase on cohort |

### C.2 Pre-checkout state（Human · D-EXEC window open）

| # | Prerequisite | Expected @ **`2ef7ae8`** |
|---|--------------|--------------------------|
| **PRE-0** | Deploy **`2ef7ae8`** live on Production | **required** |
| **PRE-1** | **`FRESH-ACCOUNT-NO-PAYMENT-R` GREEN** | attested |
| **PRE-2** | **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R` re-run GREEN** | **PASS** @ rerun evidence |
| **PRE-3** | **Fresh Human `FRESH-CHECKOUT-D-EXEC go`** | **required** · prior GO **invalid** |
| **PRE-4** | Signed in as **`launch-cohort-primary`** on Production URL | **required** |
| **PRE-5** | **`/api/room/core` → Not owned** reconfirmed | **required** |
| **PRE-6** | Profile checkout-ready: **nickname + birthDate**（**`IMPLICIT_UNKNOWN_TIME_AT_CHECKOUT`** · birthTime **not** required） | **required** |
| **PRE-7** | **`/dtr/lp` CTA eligible** · preview UI aligned（no **`クリエイター`**) | **required** · Human attested |
| **PRE-8** | Pre-payment SQL §2–§4 baseline recorded（hash-bound locally） | **required** |
| **PRE-9** | No concurrent consult send / unrelated DML window | **required** |
| **PRE-10** | **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** configured on Vercel（name only · Human attestation） | **required** |

**Profile gate SSOT:** `lib/soul/birthProfileV2.ts` · `validateDtrCheckoutProfile` — failure code **`nickname_and_birthdate`** only.

### C.3 Product confirmation

| Field | Value |
|-------|--------|
| **Product ID** | **`DTR_CORE_STATIC_V1`** |
| **Display** | **DTR保存版 · ¥1,000** |
| **Stripe env key name** | **`STRIPE_PRICE_DTR_CORE_STATIC_V1`**（value not in SSOT） |
| **Checkout entry** | **`/dtr/lp`** · **`PurchaseButton`** |
| **API** | **`POST /api/purchase/checkout`** `{ productId: "DTR_CORE_STATIC_V1", profile? }` |

### C.4 Human execution sequence（single window · **`FRESH-CHECKOUT-D-EXEC`** only）

| Step | Action | Mutation |
|------|--------|----------|
| **0** | Confirm **`2ef7ae8`** · cohort · **Not owned** · CTA eligible | **no** |
| **1** | Run pre-payment SQL §2–§4 · record cohort counts（hash param local only） | **no** |
| **2** | Open **`/dtr/lp`** · click **`PurchaseButton`** once | triggers checkout create |
| **3** | Expect **`POST /api/purchase/checkout` → 200** + `{ url }` | **yes** · Stripe session |
| **4** | Redirect to Stripe Checkout | observe |
| **5** | Complete **exactly one** live payment（§D） | **yes** · payment |
| **6** | Success redirect **`/dtr/processing?session_id=…`** | observe |
| **7** | Wait natural webhook fulfillment（**no replay**） | observe |
| **8** | **`FRESH-FULFILLMENT-R`** — post-payment SQL §2–§4 | **no** |
| **9** | **`FRESH-DTR-UNLOCK-R`** — app unlock §G | **no** |

**Repo path:**

```text
/dtr/lp → PurchaseButton
  → POST /api/purchase/checkout (DTR_CORE_STATIC_V1)
  → stripe.checkout.sessions.create (mode=payment)
  → success_url /dtr/processing?session_id=...
  → webhook checkout.session.completed → fulfillDtrCoreFromCheckoutSessionId
  → /dtr/processing may also invoke fulfill (idempotent)
```

**Cancel path:** **`/dtr/lp?checkout=cancelled`** · **STOP** · no retry without new GO.

---

## D. Payment boundary

| Rule | Policy |
|------|--------|
| **Attempts** | **Exactly one** checkout + payment per **`FRESH-CHECKOUT-D-EXEC`** window |
| **Retries** | **No** repeated payment in same window · **STOP** on failure · separate gate + fresh GO for retry |
| **Live mode** | **No test card** on Production live Stripe account |
| **Test mode** | Only with explicit private **test-mode GO**（out of default launch path） |
| **Webhook replay** | **Prohibited** — natural webhook from live checkout only |
| **Manual fulfillment / grant** | **Prohibited** without separate repair gate |
| **Double payment** | **STOP** · **FCE-S-9** |
| **Raw Stripe IDs in SSOT** | **Prohibited** |
| **Private ticket** | Safe booleans / labels only · optional session suffix last-4 in private ticket only |

### D.1 Human GO phrase（not authorized in this gate）

```text
FRESH-CHECKOUT-D-EXEC go
```

---

## E. Expected fulfillment proof

### E.1 Stripe / webhook layer（`FRESH-FULFILLMENT-R`）

| Proof | Expected |
|-------|----------|
| Event | **`checkout.session.completed`** · **`mode=payment`** |
| Payment status | **`paid`** |
| Product metadata | **`productId=DTR_CORE_STATIC_V1`** |
| Webhook route | **`/api/stripe/webhook` → 2xx** |
| Dedupe | event id idempotent |

**Fn:** **`fulfillDtrCoreFromCheckoutSessionId`** · **`lib/m55/dtrCoreCheckoutFulfillment.ts`**

### E.2 DB fulfillment layer（cohort hash band · counts only）

| Artifact | Expected delta |
|----------|----------------|
| **`one_time_fulfillments`** | **+1** · **`product_id=DTR_CORE_STATIC_V1`** |
| **`entitlements`** | **active +1** |
| **`entitlement_rights`** | **`m55_p:core_origin` +1** |
| **`dtr_report_snapshots`** | **visible +1** · **`user_hidden_at IS NULL`** |
| **`reply_ticket_wallets`** | **scoped active** · **`report_instance_id NOT NULL`** |
| **`available_count`** | **≥ 1** |
| **`reply_wallet_ledgers`** | **`included_grant` +1** · **`source_of_grant=INCLUDED`** |
| **S-5** | **`wallets_null_status_active=0`** · **`wallets_cap_violation_rows=0`** |

**Not proof:** **`legacy_test_inventory`** · manual grant · preview payments · **`controlled_smoke_ready_users`**.

### E.3 Fulfillment order（unchanged）

1. **`one_time_fulfillments` insert**（idempotent by checkout session）
2. **`entitlements` upsert** active
3. **`entitlement_rights` upsert** **`m55_p:core_origin`**
4. **`grantInitialIncludedReplyIfNeeded`** → wallet + **`included_grant`**
5. **`upsertDtrReportSnapshotAtFulfillment`** → visible snapshot
6. Wallet **`report_instance_id`** link

---

## F. Post-payment SQL plan

**Script:** `scripts/sql/production/m55_backend_commerce_contract_c_fresh_checkout_fulfillment_readonly_v1.sql`

| Section | Purpose | When |
|---------|---------|------|
| **§0** | `current_database()` confirm | pre + post |
| **§1** | Global DTR totals（context only · not cohort proof） | optional |
| **§2** | S-5 guard | pre + post |
| **§3** | Cohort band counts（**`operator_user_hash_hex16`** local param only） | pre + post |
| **§4** | Cohort wallet + **`included_grant`** counts | pre + post |

### F.1 Pre-payment expected（`launch-cohort-primary` start）

| Metric | Expected |
|--------|----------|
| **`cohort_visible_snapshot_count`** | **0** |
| **`cohort_one_time_fulfillments_count`** | **0** |
| **`cohort_active_entitlements_count`** | **0** |
| **`cohort_entitlement_rights_core_origin_count`** | **0** |
| **`cohort_scoped_active_wallet_count`** | **0** |
| **`cohort_included_grant_ledger_count`** | **0** |
| **S-5** | **0** / **0** |

### F.2 Post-payment expected

| Metric | Expected |
|--------|----------|
| **`cohort_one_time_fulfillments_count`** | **1** |
| **`cohort_active_entitlements_count`** | **1** |
| **`cohort_entitlement_rights_core_origin_count`** | **1** |
| **`cohort_visible_snapshot_count`** | **1** |
| **`cohort_scoped_active_wallet_count`** | **≥ 1** |
| **`cohort_scoped_available_count_max`** | **≥ 1** |
| **`cohort_included_grant_ledger_count`** | **≥ 1** |
| **S-5** | **0** / **0** |

**Forbidden in SQL output / SSOT:** raw **`user_id`** · email · session id · payment intent id · **`SELECT *`**.

**Operator binding:** 16-hex SHA-256 prefix of Clerk user id — **local param only** · never paste into SSOT.

---

## G. DTR unlock verification（`FRESH-DTR-UNLOCK-R`）

| # | Check | Expected post-fulfillment |
|---|-------|---------------------------|
| **U-1** | **`GET /api/room/core`**（signed-in） | **200** · **`effective_credits_remaining ≥ 1`** |
| **U-2** | Error body | **not** **`Not owned`** |
| **U-3** | **`/dtr/core`** | **200** · owned consult room |
| **U-4** | Redirect | **not** **307 → `/dtr/lp`** |
| **U-5** | **`/my`** | purchased / saved-report visible if applicable |
| **U-6** | **`/dtr/processing`** | stable success / owned path |
| **U-7** | Post-payment SQL §3–§4 | matches §F.2 |

---

## H. STOP conditions（refreshed · consolidated）

| # | Condition | Action |
|---|-----------|--------|
| **FCE-S-1** | Checkout create fail（4xx/5xx on **`POST /api/purchase/checkout`**） | **STOP** · diagnose · no retry without fresh GO |
| **FCE-S-2** | **`composite_profile_incomplete`** | **STOP** · fix **`/my`** nickname/birthDate · fresh GO |
| **FCE-S-3** | Stripe price / account / mode mismatch | **STOP** · env gate |
| **FCE-S-4** | Payment success · fulfillment not observed in ops window | **STOP** · **`FRESH-FULFILLMENT-R` BLOCKED** · no manual grant |
| **FCE-S-5** | Fulfillment rows present · **`Not owned`** persists | **STOP** · repair gate |
| **FCE-S-6** | Wallet active but **`report_instance_id IS NULL`** | **STOP** · scoped link failure |
| **FCE-S-7** | **`included_grant`** missing or **`available_count < 1`** | **STOP** |
| **FCE-S-8** | S-5 regress · duplicate fulfillment · cap violation | **STOP** |
| **FCE-S-9** | Second payment in same window | **STOP** |
| **FCE-S-10** | Raw ID / session / email in SSOT | **STOP** · redact |
| **FCE-S-11** | Payment in **PLANNING** gate | **STOP** · policy violation |
| **FCE-S-12** | **`already_purchased`** on fresh cohort | **STOP** · cohort contamination |
| **FCE-S-13** | **`legacy_test_inventory`** used as pass evidence | **STOP** · **`not_launch_proof`** |
| **FCE-S-14** | Webhook replay attempted | **STOP** · policy violation |
| **FCE-S-15** | Preview regression（**`クリエイター`** on locked shelf pre-payment） | **STOP** · return to preview gate |

---

## I. Checkout HOLD confirmation

| Item | Status |
|------|--------|
| **`FRESH-CHECKOUT-D-EXEC`** | **HOLD** — planning refresh **does not** authorize payment |
| **Fresh GO** | **required** before step 2 click |
| **Webhook replay / VERIFY-C** | **HOLD** |
| **Prior GO** | **consumed** · invalid |

Preview consistency **GREEN** clears **FCE preview blockers** only · **not** a payment authorization.

---

## J. No-mutation confirmation（planning refresh gate）

| Action | Status |
|--------|--------|
| checkout / payment | **no** |
| DB write / Supabase SQL execution | **no** |
| webhook replay / VERIFY-C | **no** |
| env / Stripe mutation | **no** |
| Production DELETE | **no** |
| raw ID / email / session / Stripe ID in SSOT | **no** |
| SELECT * | **no** |

---

## K. Recommended next gate chain

| Priority | Gate | Mutation | GO required |
|----------|------|----------|-------------|
| **1** | Human issues **`FRESH-CHECKOUT-D-EXEC go`** | — | **yes** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-D-EXEC`** | **yes** · one payment | **yes** |
| **3** | **`FRESH-FULFILLMENT-R`** | **no** · SQL counts | — |
| **4** | **`FRESH-DTR-UNLOCK-R`** | **no** · app attestation | — |
| **5** | **`FRESH-CONSULT-SEND-SMOKE-PLANNING`** | **no** | — |
| **6** | **`FRESH-CONSULT-SEND-SMOKE`** | **yes** · 1 send | **`FRESH-CONSULT-SEND-SMOKE go`** |
| **7** | **`FRESH-CONSULT-SEND-SMOKE-R`** | **no** | — |
| **8** | Contract-C D-EXEC window close | **no** | — |

---

## L. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-FRESH-CHECKOUT-D-EXEC-PLANNING-REFRESH-001`** | **本条** |
| **`M55-EVID-20260523-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R-RERUN-001`** | Preview unblock |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING-001`** | Base E2E packet |
| **`M55-EVID-20260523-FRESH-PRECHECKOUT-PROFILE-GATE-RELAXATION-COMMIT-EXEC-001`** | Deploy @ **`2ef7ae8`** |

---

## M. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | D-EXEC planning refresh GREEN · preview closed · fresh GO required |
