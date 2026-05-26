# Phase BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING — Fresh DTR checkout E2E plan（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING** |
| **Title** | **launch-cohort-primary ¥1,000 DTR checkout · fulfillment · unlock · wallet grant — execution packet (planning only)** |
| **Classification** | **Category 1 / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_CHECKOUT_E2E_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **`4dcd856`** · **`post_cutover_baseline`** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_ACCOUNT_NO_PAYMENT_R_GREEN_NOT_OWNED_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-ACCOUNT-NO-PAYMENT-R-001`** |
| **Mutation in this gate** | **no** |

**Fresh checkout E2E plan GREEN.** Route · payment boundary · fulfillment proof · post-payment SQL · DTR unlock verification frozen · **no checkout execution in this gate**.

---

## B. Current state（inherited）

| Field | Status |
|-------|--------|
| **`launch-cohort-primary`** | signed-in · **`Not owned`** · no-payment |
| **`/dtr/core`** | **307 → `/dtr/lp`** |
| **`/dtr/lp`** | purchase path entry |
| Legacy inventory | **`legacy_test_inventory` / not_launch_proof** |
| Contract-C | **LIVE** @ **`4dcd856`** · C-POSTFLIGHT-R **GREEN** |
| Live checkout / payment | **HOLD** — blocked by **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R-001`** |
| VERIFY-C | **HOLD** |

---

## C. Checkout E2E plan（exact route）

### C.1 Product · cohort · pre-state

| Field | Value |
|-------|--------|
| **Product** | **DTR保存版** · **`DTR_CORE_STATIC_V1`** |
| **Display price** | **¥1,000** |
| **Stripe env** | **`STRIPE_PRICE_DTR_CORE_STATIC_V1`**（value not in SSOT） |
| **Cohort** | **`launch-cohort-primary`** only |
| **Pre-state** | **`GET /api/room/core` → 403 Not owned** |
| **Legacy proof** | **prohibited** — do not use **`legacy_test_inventory`** counts |

### C.2 Pre-execution prerequisites（D-EXEC gate · before payment）

| # | Prerequisite | Gate |
|---|--------------|------|
| **PRE-1** | **`FRESH-ACCOUNT-NO-PAYMENT-R` GREEN** | attested |
| **PRE-2** | Human **`FRESH-CHECKOUT-D-EXEC go`** | required |
| **PRE-3** | Signed in as **`launch-cohort-primary`** on **`m55-webv2.vercel.app`** | required |
| **PRE-4** | **`/api/room/core` → Not owned** reconfirmed | required |
| **PRE-5** | **Composite profile complete** on **`/my`**（nickname · birth date · birth time or unknown · country per **`validateDtrCheckoutProfile`**) | required |
| **PRE-6** | Pre-payment SQL baseline recorded（§G） | required |
| **PRE-7** | No concurrent consult send / unrelated DML window | required |
| **PRE-8** | **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** configured on Vercel（Human attestation · name only） | required |

**Profile incomplete → `POST /api/purchase/checkout` returns 400 `composite_profile_incomplete`** · fix on **`/my`** before retry.

### C.3 Human execution sequence（single window · **`FRESH-CHECKOUT-D-EXEC`**）

| Step | Action | Mutation |
|------|--------|----------|
| **0** | Confirm deploy **`4dcd856`** · cohort **`launch-cohort-primary`** · **Not owned** | **no** |
| **1** | Run pre-payment SQL §3–§4 · record cohort counts（hash-bound locally） | **no** |
| **2** | Open **`/dtr/lp`** · click **`PurchaseButton`**（`productId=DTR_CORE_STATIC_V1`） | triggers checkout create |
| **3** | **`POST /api/purchase/checkout`** `{ productId: "DTR_CORE_STATIC_V1", profile? }` | **yes** · Stripe session create |
| **4** | Expect **200** + `{ url }` · redirect to Stripe Checkout | observe |
| **5** | Complete **exactly one** live payment（see §D） | **yes** · payment |
| **6** | Success redirect **`/dtr/processing?session_id={CHECKOUT_SESSION_ID}`** | observe |
| **7** | Wait for processing page + webhook fulfillment（do not replay） | observe |
| **8** | **`FRESH-FULFILLMENT-R`** — post-payment SQL §3–§4 | **no** |
| **9** | **`FRESH-DTR-UNLOCK-R`** — app unlock checks §H | **no** |

**Repo path summary:**

```
/dtr/lp → PurchaseButton
  → POST /api/purchase/checkout (DTR_CORE_STATIC_V1)
  → stripe.checkout.sessions.create (mode=payment, client_reference_id=userId)
  → success_url /dtr/processing?session_id=...
  → webhook checkout.session.completed → fulfillDtrCoreFromCheckoutSessionId
  → /dtr/processing may also invoke fulfill (idempotent)
```

**Cancel path:** **`/dtr/lp?checkout=cancelled`** · **STOP** · do not retry without new GO.

---

## D. Payment execution boundary

| Rule | Policy |
|------|--------|
| **Attempts** | **Exactly one** checkout + payment attempt per **`FRESH-CHECKOUT-D-EXEC`** window unless **STOP** |
| **Retries** | **No** repeated payment attempts in same window |
| **Live mode** | **No test card** if Production Stripe account is **live mode** |
| **Test mode** | Only if Human explicitly documents **test-mode GO** in private ticket（out of default launch path） |
| **Webhook replay** | **Prohibited** — observe natural webhook from live checkout only |
| **Manual fulfillment** | **Prohibited** without separate repair gate |
| **Raw Stripe IDs in SSOT** | **Prohibited** |
| **Private ticket recording** | Safe labels / booleans only · optional session **last-4 suffix** in private ticket **only** if operator policy allows |

### D.1 Safe Human record fields（private ticket · not SSOT body）

| Field | Type |
|-------|------|
| **`cohort_label`** | **`launch-cohort-primary`** |
| **`checkout_attempted_bool`** | boolean |
| **`checkout_session_created_bool`** | boolean |
| **`payment_completed_bool`** | boolean |
| **`stripe_mode_label`** | **`live`** or **`test`**（label only） |
| **`processing_page_reached_bool`** | boolean |
| **`fulfillment_observed_bool`** | boolean |
| **`checkout_error_code_label`** | e.g. **`composite_profile_incomplete`** · **`already_purchased`** · **`none`** |
| **`session_suffix_last4`** | optional · private ticket only |

### D.2 Human GO phrase（not authorized here）

```text
FRESH-CHECKOUT-D-EXEC go
```

---

## E. Fulfillment proof checklist

### E.1 Stripe / webhook layer

| Proof | Expected | Gate |
|-------|----------|------|
| **Event type** | **`checkout.session.completed`** · **`mode=payment`** | **FRESH-FULFILLMENT-R** |
| **Payment status** | **`paid`** | **FRESH-FULFILLMENT-R** |
| **Product metadata** | **`productId=DTR_CORE_STATIC_V1`** | **FRESH-FULFILLMENT-R** |
| **Webhook route** | **`/api/stripe/webhook` → 2xx** | **FRESH-FULFILLMENT-R** |
| **Dedupe** | **`stripe_events` / event id idempotent** | **FRESH-FULFILLMENT-R** |

**Fn:** **`fulfillDtrCoreFromCheckoutSessionId`** · **`lib/m55/dtrCoreCheckoutFulfillment.ts`**

### E.2 DB fulfillment layer（cohort band · counts only）

| Artifact | Expected delta（cohort hash band） | Gate |
|----------|-------------------------------------|------|
| **`one_time_fulfillments`** | **+1** · **`product_id=DTR_CORE_STATIC_V1`** | **FRESH-FULFILLMENT-R** |
| **`entitlements`** | **active +1** · **`grant_type=one_time`** | **FRESH-FULFILLMENT-R** |
| **`entitlement_rights`** | **`m55_p:core_origin` +1** | **FRESH-FULFILLMENT-R** |
| **`dtr_report_snapshots`** | **visible +1** · **`user_hidden_at IS NULL`** | **FRESH-DTR-UNLOCK-R** |
| **`reply_ticket_wallets`** | **scoped active** · **`report_instance_id NOT NULL`** | **FRESH-DTR-UNLOCK-R** |
| **`available_count`** | **≥ 1** | **FRESH-DTR-UNLOCK-R** |
| **`reply_wallet_ledgers`** | **`included_grant` +1** · **`source_of_grant=INCLUDED`** | **FRESH-FULFILLMENT-R** |
| **S-5** | **`wallets_null_status_active=0`** · **`wallets_cap_violation_rows=0`** | **FRESH-FULFILLMENT-R** |

**Not proof:** legacy **`legacy_test_inventory`** rows · manual grant · **`controlled_smoke_ready_users`**.

### E.3 Fulfillment order（repo SSOT）

1. **`one_time_fulfillments` insert**（idempotent by **`checkout_session_id`**）
2. **`entitlements` upsert** active
3. **`entitlement_rights` upsert** **`m55_p:core_origin`**
4. **`grantInitialIncludedReplyIfNeeded`** → wallet + **`included_grant`** ledger
5. **`upsertDtrReportSnapshotAtFulfillment`** → visible snapshot
6. **Wallet `report_instance_id` link** to new snapshot

---

## F. Post-payment SQL plan

**Script:** `scripts/sql/production/m55_backend_commerce_contract_c_fresh_checkout_fulfillment_readonly_v1.sql`

| Section | Purpose | When |
|---------|---------|------|
| **§0** | Database name confirm | pre + post |
| **§1** | Global DTR fulfillment totals（context only） | optional |
| **§2** | S-5 guard | pre + post |
| **§3** | Cohort band counts（hash param · local only） | pre + post |
| **§4** | Cohort wallet + **`included_grant`** counts | pre + post |

### F.1 Pre-payment expected（cohort band）

| Metric | Expected |
|--------|----------|
| **`cohort_visible_snapshot_count`** | **0** |
| **`cohort_one_time_fulfillments_count`** | **0** |
| **`cohort_active_entitlements_count`** | **0** |
| **`cohort_entitlement_rights_core_origin_count`** | **0** |
| **`cohort_scoped_active_wallet_count`** | **0** |
| **`cohort_included_grant_ledger_count`** | **0** |

### F.2 Post-payment expected（cohort band）

| Metric | Expected |
|--------|----------|
| **`cohort_one_time_fulfillments_count`** | **1** |
| **`cohort_active_entitlements_count`** | **1** |
| **`cohort_entitlement_rights_core_origin_count`** | **1** |
| **`cohort_visible_snapshot_count`** | **1** |
| **`cohort_scoped_active_wallet_count`** | **≥ 1** |
| **`cohort_scoped_available_count_max`** | **≥ 1** |
| **`cohort_included_grant_ledger_count`** | **≥ 1** |
| **S-5 metrics** | **0** / **0** |

**Forbidden in SQL output:** raw **`user_id`** · email · session id · payment intent id · **`SELECT *`**.

---

## G. DTR unlock verification plan（`FRESH-DTR-UNLOCK-R`）

| # | Check | Expected post-fulfillment |
|---|-------|---------------------------|
| **U-1** | **`GET /api/room/core`**（signed-in） | **200** · wallet fields present · **`effective_credits_remaining ≥ 1`** |
| **U-2** | **`GET /api/room/core` error** | **not** **`Not owned`** |
| **U-3** | **`/dtr/core`** | **200** · owned consult room renders |
| **U-4** | **`/dtr/core` redirect** | **not** **307 → `/dtr/lp`** |
| **U-5** | **`/my`** | purchased / saved-report state visible if applicable |
| **U-6** | **`/dtr/processing`** | completes to owned path or stable processing success |
| **U-7** | Post-payment SQL §3–§4 | matches §F.2 |

**Unlock chain:** visible snapshot + entitlement right → **`resolveEntryReportOwnership` → owned** → consult room accessible.

---

## H. STOP conditions

| # | Condition | Action |
|---|-----------|--------|
| **FCE-S-1** | Checkout create error（4xx/5xx on **`POST /api/purchase/checkout`**） | **STOP** · no payment retry without diagnosis |
| **FCE-S-2** | **`composite_profile_incomplete`** | **STOP** · complete **`/my`** profile · new GO for retry |
| **FCE-S-3** | Stripe price / account / mode mismatch | **STOP** · env gate · no ad-hoc payment |
| **FCE-S-4** | Payment succeeds · webhook/fulfillment not observed within ops window | **STOP** · **`FRESH-FULFILLMENT-R`** BLOCKED · no manual grant |
| **FCE-S-5** | Fulfillment rows present · DTR still **Not owned** | **STOP** · snapshot / entitlement repair gate |
| **FCE-S-6** | Wallet exists but **`report_instance_id IS NULL`** post-fulfillment | **STOP** · scoped link failure |
| **FCE-S-7** | **`included_grant`** missing or **`available_count < 1`** | **STOP** |
| **FCE-S-8** | Duplicate fulfillment / cap violation（S-5 regress） | **STOP** |
| **FCE-S-9** | Second payment attempt in same window | **STOP** |
| **FCE-S-10** | Raw ID / session / email recorded in SSOT | **STOP** · redact |
| **FCE-S-11** | Checkout in **PLANNING** gate | **STOP** · policy violation |
| **FCE-S-12** | **`already_purchased`** on fresh cohort | **STOP** · cohort contamination · select new cohort |

---

## I. HOLD list

| Item | Status | Opens in |
|------|--------|----------|
| **Live checkout / payment** | **HOLD** | **`FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-R BLOCKED`** · prior **`FRESH-CHECKOUT-D-EXEC go` consumed by STOP** |
| **Webhook replay** | **HOLD** | never in normal path |
| **VERIFY-C** | **HOLD** | after fresh consult chain |
| **Stripe / env mutation** | **HOLD** | separate ops gate |
| **Manual grant / remap** | **prohibited** | — |
| **Fresh consult send** | **HOLD** | **`FRESH-CONSULT-SEND-SMOKE go`** after unlock |
| **Legacy inventory as proof** | **prohibited** | — |

---

## J. No-mutation confirmation（planning gate）

| Action | Status |
|--------|--------|
| checkout / payment execution | **no** |
| DB write / DDL / DML | **no** |
| webhook replay | **no** |
| VERIFY-C | **no** |
| env / Stripe mutation | **no** |
| Production DELETE | **no** |
| raw ID / email / session / Stripe ID in SSOT | **no** |
| SELECT * | **no** |

---

## K. Next gate chain

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-PLANNING-001`** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-PRECHECKOUT-PREVIEW-CONSISTENCY-FIX-IMPLEMENTATION`** | **NEXT** · repo only |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-D-EXEC`** | **HOLD** |
| **3** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-FULFILLMENT-R`** | **no** · post-payment SQL |
| **4** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-DTR-UNLOCK-R`** | **no** · app unlock attestation |
| **5** | **`FRESH-CONSULT-SEND-SMOKE-PLANNING`** | **no** |
| **6** | **`FRESH-CONSULT-SEND-SMOKE`** | **yes** · separate GO |
| **7** | **`FRESH-CONSULT-SEND-SMOKE-R`** | **no** |

---

## L. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-ACCOUNT-NO-PAYMENT-R-001`** | Cohort start · Not owned |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-VALIDATION-PATH-PLANNING-001`** | Gate chain |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-A-1000-DTR-500-REPLY-PLANNING-001`** | Commerce contract reference |

---

## M. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | FRESH-CHECKOUT-E2E-PLANNING GREEN · execution packet frozen |
