# Phase BACKEND-COMMERCE-CONTRACT-C-LEGACY-TEST-DATA-CUTOFF-POLICY-PLANNING — Cutoff policy（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-LEGACY-TEST-DATA-CUTOFF-POLICY-PLANNING** |
| **Title** | **Legacy/test Production owner inventory cutoff — release baseline after Contract-C** |
| **Classification** | **Category 1 / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_LEGACY_TEST_DATA_CUTOFF_POLICY_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-LEGACY-TEST-DATA-CUTOFF-POLICY-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor / cutoff** | **`4dcd856`** · **C-POSTFLIGHT-R GREEN** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R-001`** |
| **Prior gates** | Identity reconciliation BLOCKED · smoke planning HOLD |
| **Mutation in this gate** | **no** |

**Cutoff policy GREEN.** Legacy owner inventory **retained but demoted** · release validation **starts post-cutover** · old owner chase **abandoned** unless external obligation emerges.

---

## B. Current situation summary

| Fact | Status |
|------|--------|
| Contract-C deploy | **LIVE** @ **`4dcd856`** |
| C-POSTFLIGHT-R | **GREEN** · S-5 PASS · C objects LIVE |
| Controlled smoke pre-smoke SQL | **PASS** |
| Current browser Clerk/Google session | **`/api/room/core` → Not owned** |
| Known login accounts | appear **fresh / no prior draft state** |
| Production DB inventory | **`controlled_smoke_ready_users = 5`** · **`dtr_owner_users = 10`** |
| Namespace alignment | **LOW** — legacy rows likely **prior test/validation Clerk namespace** |
| External customer obligation | **none known** at planning time |

**Primary decision:** **Do not chase legacy test owner identity** for Contract-C smoke or launch proof.

---

## C. Planning questions — answers

### Q1. Are old Production owner rows considered test/validation data?

| Answer | **YES — policy default** |
|--------|---------------------------|
| **Basis** | Human operator attestation: rows originate from **Stripe-review / validation / internal smoke** eras · not documented as launch-customer cohort |
| **Counts** | **`dtr_owner_users = 10`** · **`visible = 6`** · **`smoke_ready = 5`** — treated as **legacy/test inventory band** |
| **Exception** | Only if **external customer/support obligation** is later documented in a **separate Human attestation gate** |

### Q2. Are there any real external customers in those rows?

| Answer | **No known external customers** |
|--------|----------------------------------|
| **Policy** | Absent support ticket / billing dispute / contractual retention claim → **assume validation-only** |
| **Prohibited inference** | Do not identify individuals from DB · no row-level investigation in public SSOT |

### Q3. Should controlled consult send smoke using old owner be abandoned?

| Answer | **YES — abandoned as prerequisite** |
|--------|-------------------------------------|
| **Rationale** | Cannot bind current login namespace · chasing legacy Clerk IDs contradicts release baseline |
| **Replacement** | **Post-cutover fresh validation path** §F · optional **internal-only** legacy smoke only with explicit legacy GO（out of launch path） |

### Q4. What is the new release validation path?

| Phase | Gate chain（post-cutover） |
|-------|---------------------------|
| **1** | **Release baseline frozen** @ **`4dcd856` + C-POSTFLIGHT-R**（本条） |
| **2** | **Fresh account path** — new or intentionally selected Production Clerk account |
| **3** | **No-payment gates** — ownership UI · GET routes · S-5 SQL cadence |
| **4** | **Payment gates（separate Human GO）** — checkout · webhook · fulfillment |
| **5** | **DTR unlock** — visible snapshot · scoped wallet grant |
| **6** | **Consult send** — idempotency · **`m55_consult_reply_commit`** · ledger **`consult_commit_id`** |
| **7** | **Post-send attestation** — aggregate SQL deltas · smoke-R close |

### Q5. Should fresh post-C Production purchase E2E be the future final proof?

| Answer | **YES — future final proof path** |
|--------|-----------------------------------|
| **Scope** | **VERIFY-C / live checkout** remain **HOLD** until dedicated payment E2E gate with explicit Human GO |
| **Not in this gate** | no checkout · no webhook · no payment execution here |
| **Ordering** | Contract-C **technical** proof（RPC/ledger/idempotency）may precede full payment E2E · **commercial launch proof** requires fresh purchase E2E |

### Q6. SSOT wording to prevent future confusion

**Canonical labels（use in all Contract-C / commerce gates）：**

| Label | Meaning |
|-------|---------|
| **`legacy_test_inventory`** | Pre-cutoff Production rows in **`dtr_report_snapshots` / wallets / ledgers** not tied to current launch namespace |
| **`post_cutover_baseline`** | State after **`4dcd856` deploy + C-POSTFLIGHT-R GREEN** |
| **`launch_validation_cohort`** | Accounts created **after cutoff** via intentional fresh signup + optional purchase E2E |
| **`not_launch_proof`** | Legacy inventory counts **must not** satisfy launch-readiness or Contract-C smoke prerequisites |

**Mandatory sentence（append to commerce gate checklists）：**

> **Legacy Production owner/wallet/snapshot rows are audit-only test inventory; they are not launch customers and must not be used as controlled smoke prerequisites unless a separate external-obligation gate explicitly reopens legacy identity work.**

### Q7. What data must remain retained as audit artifacts?

| Category | Retention | Mutation |
|----------|-----------|----------|
| **`dtr_report_snapshots`**（legacy owners） | **retain** | **no DELETE** |
| **`reply_ticket_wallets`**（scoped + null closed） | **retain** | **no DELETE** |
| **`reply_wallet_ledgers`** | **retain** | **no DELETE** |
| **`consult_send_commits`** post-C | **retain** | append-only via RPC |
| **`one_time_fulfillments` / `entitlements`** | **retain** | audit trail |
| **Contract-B S-5 quarantine null rows（4 closed）** | **retain** | audit-only |
| **SSOT evidence chain** | **retain** | docs-only |

**Purpose:** commerce contract remediation history · S-5 audit · Stripe-review era evidence · **not** active user servicing.

### Q8. What actions remain prohibited?

| Action | Status |
|--------|--------|
| DELETE legacy rows | **prohibited** |
| Manual remap legacy owner → current Clerk user | **prohibited** |
| Manual entitlement / wallet grant for smoke convenience | **prohibited** |
| Identity mapping table population for legacy rescue | **prohibited** without separate GO |
| Using legacy owner as launch-readiness proof | **prohibited** |
| Chasing legacy Clerk accounts for Contract-C smoke | **prohibited**（本条 policy） |
| checkout / payment / webhook / VERIFY-C in planning gate | **prohibited** |

---

## D. Decision on old owner search

| Decision | Detail |
|----------|--------|
| **Old owner identity search** | **ABANDONED** for Contract-C controlled smoke and launch validation |
| **Exception trigger** | Documented **external customer/support obligation** only |
| **Supersedes** | **`DTR_OWNER_IDENTITY_RECONCILIATION`** “try smoke-candidate-first-match” path for launch work |
| **Legacy SQL inventory** | Remains valid for **S-5 / cap / Contract-B** audit · **not** for session matching |

---

## E. Legacy/test data policy（frozen）

| Rule | Policy |
|------|--------|
| **L-1 Retain** | Legacy rows **stay in DB** · **no Production DELETE** |
| **L-2 Demote** | Classify as **`legacy_test_inventory`** · **`not_launch_proof`** |
| **L-3 No rescue** | **No** manual remap · grant · user_id migration to current browser user |
| **L-4 No smoke prerequisite** | **`controlled_smoke_ready_users = 5`** **does not** unblock Contract-C smoke |
| **L-5 Count semantics** | Aggregate counts may appear in ops SQL · **must not** be interpreted as live customer base |
| **L-6 Smoke user patterns** | Rows matching internal smoke patterns remain **audit-only**（existing B3 quarantine logic unchanged） |
| **L-7 Support boundary** | Future real customer issues handled via **support gate** · not legacy inventory chase |

---

## F. Release baseline definition

**Cutoff anchor:**

```text
post_cutover_baseline := main @ 4dcd856
  AND C-POSTFLIGHT-R GREEN (M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R-001)
  AND Contract-C objects LIVE on m55-soul-core
  AND S-5 non-regression PASS
```

**Forward-only validation:**

| Before cutoff | After cutoff |
|---------------|--------------|
| Legacy test inventory | **not launch proof** |
| Identity reconciliation chase | **closed for launch path** |
| Contract-C technical deploy proof | **C-POSTFLIGHT-R** ✓ |
| Consult consume proof | requires **post-cutover send** on **launch_validation_cohort** |
| Commercial proof | requires **fresh purchase E2E** gate（VERIFY-C family · separate GO） |

---

## G. Fresh validation path（recommended sequence）

| Step | Gate / action | Mutation | Human GO |
|------|---------------|----------|----------|
| **1** | **Cutoff policy** | **no** | —（本条） |
| **2** | **Fresh account selection** — new Production Clerk signup or intentional ops account | **no** | ops label only |
| **3** | **No-payment path** — `/dtr` · `/dtr/core` ownership UI · GET wallet | **no** | — |
| **4** | **`FRESH-CHECKOUT-PLANNING`** | **no** | — |
| **5** | **Live checkout E2E**（future） | **yes** | explicit payment GO |
| **6** | **Webhook fulfillment attestation** | observe | payment GO window |
| **7** | **DTR unlock verify** — visible snapshot · scoped wallet **`available_count ≥ 1`** | **no** | — |
| **8** | **Consult send smoke** — safe prompt · idempotency · ledger **`consult_commit_id`** | **yes** · 1 ticket | consult smoke GO |
| **9** | **Post-send SQL attestation** | **no** | — |
| **10** | **VERIFY-C / launch readiness**（future） | per gate | **HOLD** until chain complete |

**Note:** Steps **4–6** are **future** · **HOLD** in Contract-C window unless Human explicitly opens payment gates.

---

## H. Risks if old data is ignored

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Hidden real customer in legacy rows** | **LOW** at planning time | Support obligation trigger · no DELETE |
| **Ops confusion reading counts** | **MEDIUM** | **`legacy_test_inventory` / `not_launch_proof` labels** §G6 |
| **S-5 regression masked by legacy rows** | **LOW** | Continue **read-only SQL cadence** · S-5 metrics unchanged |
| **Stripe-review audit gap** | **LOW** | **Retain** all rows · SSOT evidence chain |
| **Skipping consult RPC proof** | **MEDIUM** | Require **post-cutover send** on fresh cohort · do not defer indefinitely |
| **Accidental legacy smoke** | **MEDIUM** | **HOLD list** §J · abandon legacy owner prerequisite |

---

## I. Safeguards to prevent contamination

| # | Safeguard |
|---|-----------|
| **S-1** | All commerce gates declare **`legacy_test_inventory not_launch_proof`** |
| **S-2** | **`controlled_smoke_ready_users`** metric **deprecated** as smoke prerequisite in gate checklists |
| **S-3** | Identity reconciliation **closed** for launch path · reopen only via external-obligation gate |
| **S-4** | No manual grants / mapping / migration without **named Human GO gate** |
| **S-5** | Payment E2E isolated to **VERIFY-C / checkout** gates · not mixed into planning gates |
| **S-6** | Post-cutover attestation records **cutoff anchor** in every new evidence ID |
| **S-7** | Aggregate SQL only · **no SELECT *** · **no raw IDs** in SSOT |

---

## J. HOLD list（unchanged / reinforced）

| Item | Status |
|------|--------|
| **Controlled consult send smoke（legacy owner path）** | **ABANDONED** |
| **Controlled consult send smoke（fresh cohort）** | **HOLD** until fresh account + optional purchase path |
| **VERIFY-C / live checkout / payment / webhook** | **HOLD** |
| **Legacy identity mapping rescue** | **HOLD / prohibited** |
| **Production DELETE on legacy rows** | **HOLD / prohibited** |
| **Manual entitlement grant** | **HOLD / prohibited** |

---

## K. No-mutation confirmation（planning gate）

| Action | Status |
|--------|--------|
| DB write / DDL / DML | **no** |
| identity mapping / manual grant / user migration | **no** |
| Clerk / env / Stripe mutation | **no** |
| checkout / payment / webhook / VERIFY-C | **no** |
| Production delete | **no** |
| raw ID recording | **no** |

---

## L. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-VALIDATION-PATH-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-VALIDATION-PATH-PLANNING-001`** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-ACCOUNT-NO-PAYMENT-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-ACCOUNT-NO-PAYMENT-R-001`** |
| **3** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING-001`** |
| **4** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-D-EXEC`** | **NEXT** · **`FRESH-CHECKOUT-D-EXEC go`** |
| **5** | **`FRESH-FULFILLMENT-R` → `FRESH-DTR-UNLOCK-R` → `FRESH-CONSULT-SEND-SMOKE-*`** | per **`FRESH-VALIDATION-PATH-PLANNING`** §D |
| **6** | **Contract-C D-EXEC window close** | **no** · after fresh-path chain |

**Supersedes for launch path:** `DTR_OWNER_IDENTITY_RECONCILIATION` smoke-candidate chase · **`controlled_smoke_ready_users`** as smoke gate input · legacy **`CONTROLLED-CONSULT-SEND-SMOKE`** execution.

---

## M. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-LEGACY-TEST-DATA-CUTOFF-POLICY-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-DTR-OWNER-IDENTITY-RECONCILIATION-READONLY-001`** | Prior BLOCKED session |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R-001`** | Cutoff anchor |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-ACCOUNT-NO-PAYMENT-R-001`** | Cohort start · Not owned attestation |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING-001`** | Checkout E2E execution packet |

---

## N. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | Cutoff policy GREEN @ **`4dcd856`** · legacy inventory demoted |
