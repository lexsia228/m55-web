# Phase BACKEND-COMMERCE-CONTRACT-C-FRESH-VALIDATION-PATH-PLANNING — Fresh cohort path（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-FRESH-VALIDATION-PATH-PLANNING** |
| **Title** | **Post-cutover launch_validation_cohort — fresh validation sequence · proof boundaries · gate chain** |
| **Classification** | **Category 1 / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_FRESH_VALIDATION_PATH_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-VALIDATION-PATH-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Cutoff anchor** | **`post_cutover_baseline`** @ **`4dcd856`** · **C-POSTFLIGHT-R GREEN** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_LEGACY_TEST_DATA_CUTOFF_POLICY_PLANNING_GREEN_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-LEGACY-TEST-DATA-CUTOFF-POLICY-PLANNING-001`** |
| **Mutation in this gate** | **no** |

**Fresh validation path GREEN.** **`launch_validation_cohort`** definition · proof checklist · gate chain frozen · **no execution in this gate**.

---

## B. Current state（inherited）

| Field | Status |
|-------|--------|
| Contract-C @ **`4dcd856`** | **LIVE** |
| C-POSTFLIGHT-R | **GREEN** |
| S-5 | **PASS** |
| Legacy owner smoke | **ABANDONED** |
| **`legacy_test_inventory`** | **audit-only · not_launch_proof** |
| Fresh cohort consult smoke | **HOLD** |
| VERIFY-C / checkout / webhook | **HOLD** |

---

## C. Fresh validation cohort definition

### C.1 `launch_validation_cohort`（canonical）

| Criterion | Required |
|-----------|----------|
| **Account origin** | **New Production Clerk signup after cutoff** OR **intentionally designated ops Production account** with Human ticket label only |
| **Legacy dependency** | **none** — must not require **`legacy_test_inventory`** row match |
| **Prior DTR ownership** | **none at cohort start** — **`GET /api/room/core` → Not owned** before purchase path |
| **Namespace** | **Production Clerk** instance matching **`m55-webv2.vercel.app`** |
| **Raw identity in SSOT** | **prohibited** — use safe labels only |

### C.2 Safe labels（SSOT / public tickets）

| Label | Use |
|-------|-----|
| **`launch-cohort-primary`** | Default fresh validation account for gate chain |
| **`launch-cohort-secondary`** | Optional backup if primary blocked |
| **`ops-intentional-account`** | Deliberate ops account · must be declared **post-cutover** in private ticket |
| **`legacy_test_inventory`** | **Excluded** from cohort |

### C.3 Cohort start attestation（no-payment · before purchase）

| Check | Expected at cohort start |
|-------|--------------------------|
| **`GET /api/room/core`** | **403 Not owned** OR route unreachable until post-purchase |
| **`GET /api/dtr` shelf** | **unpaid_locked** / purchase CTA visible |
| **SQL hash match vs legacy band** | **0** visible snapshots for cohort hash（private SQL §4 pattern） |
| **Legacy inventory counts** | **ignored** for pass/fail |

**SQL reference:** `scripts/sql/production/m55_dtr_owner_identity_reconciliation_readonly_v1.sql` §4（operator hash · local param only）

---

## D. Fresh validation path（sequence · gate chain）

```
post_cutover_baseline (4dcd856 + C-POSTFLIGHT-R)
  ↓
[FVP-0] Cohort designation (launch-cohort-primary) — no payment
  ↓
[FVP-1] FRESH-ACCOUNT-NO-PAYMENT-R — signed-in state · Not owned confirmed
  ↓
[FVP-2] FRESH-CHECKOUT-E2E-PLANNING — packet only
  ↓ HOLD until payment GO
[FVP-3] FRESH-CHECKOUT-D-EXEC — live checkout · explicit GO only
  ↓
[FVP-4] FRESH-FULFILLMENT-R — webhook/OTF attestation · read-only counts
  ↓
[FVP-5] FRESH-DTR-UNLOCK-R — visible snapshot · scoped wallet · included reply
  ↓
[FVP-6] FRESH-CONSULT-SEND-SMOKE-PLANNING — reuse Contract-C smoke packet on cohort
  ↓
[FVP-7] FRESH-CONSULT-SEND-SMOKE — 1 send + idempotency replay · explicit GO
  ↓
[FVP-8] FRESH-CONSULT-SEND-SMOKE-R — post-send SQL attestation
  ↓
[FVP-9] Contract-C D-EXEC window close + release readiness update
```

| Step | Gate | Mutation | Human GO |
|------|------|----------|----------|
| **FVP-0** | Cohort designation | **no** | — |
| **FVP-1** | **FRESH-ACCOUNT-NO-PAYMENT-R** | **no** | — |
| **FVP-2** | **FRESH-CHECKOUT-E2E-PLANNING** | **no** | — |
| **FVP-3** | **FRESH-CHECKOUT-D-EXEC** | **yes** · payment | **`FRESH-CHECKOUT-D-EXEC go`** |
| **FVP-4** | **FRESH-FULFILLMENT-R** | **no** · observe webhook result | — |
| **FVP-5** | **FRESH-DTR-UNLOCK-R** | **no** | — |
| **FVP-6** | **FRESH-CONSULT-SEND-SMOKE-PLANNING** | **no** | — |
| **FVP-7** | **FRESH-CONSULT-SEND-SMOKE** | **yes** · 1 consult consume | **`FRESH-CONSULT-SEND-SMOKE go`** |
| **FVP-8** | **FRESH-CONSULT-SEND-SMOKE-R** | **no** | — |
| **FVP-9** | **Contract-C D-EXEC close** | **no** | — |

**Supersedes for launch path:** legacy **`CONTROLLED-CONSULT-SEND-SMOKE`** on **`controlled_smoke_ready_users`** · technical packet **reused** under **`FRESH-CONSULT-SEND-SMOKE-*`** on **`launch_validation_cohort`**.

---

## E. Proof checklist（boundaries）

### E.1 What proves DTR purchase

| Proof layer | Evidence | Gate |
|-------------|----------|------|
| **Stripe** | **`checkout.session.completed`** for DTR SKU（Human-private · hash/metadata only in ticket） | **FRESH-CHECKOUT-D-EXEC** |
| **DB** | **`one_time_fulfillments`** row count **+1** for cohort hash band（aggregate SQL） | **FRESH-FULFILLMENT-R** |
| **App** | Purchase success UI / redirect without fatal error | **FRESH-CHECKOUT-D-EXEC** |

**Not proof:** legacy **`legacy_test_inventory`** snapshots · manual grants · preview payments.

### E.2 What proves wallet grant

| Proof layer | Evidence | Gate |
|-------------|----------|------|
| **DB** | Scoped **`reply_ticket_wallets`** row **`status=active`** · **`report_instance_id` NOT NULL** · linked to cohort snapshot | **FRESH-DTR-UNLOCK-R** |
| **Included grant** | **`initial_included_count ≥ 1`** · **`available_count ≥ 1`**（counts only） | **FRESH-DTR-UNLOCK-R** |
| **Ledger** | Optional **`included_grant`** ledger row（if present in band） | **FRESH-FULFILLMENT-R** |
| **App** | **`GET /api/room/core`** · **`has_wallet_row=true`** · **`effective_credits_remaining ≥ 1`** | **FRESH-DTR-UNLOCK-R** |

**Not proof:** null-scope wallets · legacy smoke-ready band · manual SQL grant.

### E.3 What proves consult send consume

| Proof layer | Evidence | Gate |
|-------------|----------|------|
| **HTTP** | **`POST /api/room/core/send` → 200** · **`consumption_applied=true`** | **FRESH-CONSULT-SEND-SMOKE** |
| **DB** | **`consult_send_commits_succeeded +1`** for cohort window | **FRESH-CONSULT-SEND-SMOKE-R** |
| **Wallet** | Scoped **`available_count -1`** · **`consumed_count +1`**（app GET + aggregate SQL） | **FRESH-CONSULT-SEND-SMOKE-R** |
| **Messages** | **+2** consult messages on thread（count delta · no row dump） | **FRESH-CONSULT-SEND-SMOKE-R** |

**Not proof:** pre-C direct wallet UPDATE path · legacy owner send without cohort attestation.

### E.4 What proves ledger `consult_commit_id`

| Proof layer | Evidence | Gate |
|-------------|----------|------|
| **DB** | **`ledger_reply_consume_with_consult_commit_id +1`** vs cohort pre-send baseline | **FRESH-CONSULT-SEND-SMOKE-R** |
| **DB** | **`ledger_reply_consume_total +1`** with post-C RPC path | **FRESH-CONSULT-SEND-SMOKE-R** |
| **RPC** | **`m55_consult_reply_commit`** succeeded commit row exists（aggregate **`consult_send_commits_succeeded`**） | **FRESH-CONSULT-SEND-SMOKE-R** |

**SQL reference:** `scripts/sql/production/m55_backend_commerce_contract_c_controlled_consult_send_smoke_readonly_v1.sql` · `m55_backend_commerce_contract_c_postflight_v1.sql`

### E.5 What proves replay does not double-consume

| Proof layer | Evidence | Gate |
|-------------|----------|------|
| **HTTP** | Retry same **`X-Idempotency-Key`** → **200** · **`consumption_applied=false`** · **`mode=replay`** | **FRESH-CONSULT-SEND-SMOKE** |
| **DB** | Post-replay SQL §3 counts **identical** to post-first-send | **FRESH-CONSULT-SEND-SMOKE-R** |
| **Wallet** | **`available_count` unchanged** on replay | **FRESH-CONSULT-SEND-SMOKE-R** |

---

## F. Old data exclusion policy（reaffirmed）

| Rule | Policy |
|------|--------|
| **`legacy_test_inventory`** | Pre-cutoff rows · **audit-only** |
| **`not_launch_proof`** | Legacy counts **must not** satisfy any fresh gate |
| **No DELETE** | All legacy rows **retained** |
| **No remap / grant / migration** | **prohibited** |
| **`controlled_smoke_ready_users=5`** | **deprecated** as launch/smoke prerequisite |
| **Mandatory sentence** | See **`LEGACY-TEST-DATA-CUTOFF-POLICY-PLANNING`** §C.Q6 |

---

## G. HOLD list

| Item | Status | Opens in gate |
|------|--------|---------------|
| **Live checkout / payment** | **HOLD** | **FRESH-CHECKOUT-D-EXEC** + **`FRESH-CHECKOUT-D-EXEC go`** |
| **Webhook replay** | **HOLD** | **never** in normal path · observe only via live checkout |
| **VERIFY-C** | **HOLD** | after **FVP-8** · separate launch readiness gate |
| **Stripe / env mutation** | **HOLD** | never without named ops gate |
| **Legacy owner smoke** | **ABANDONED** | — |
| **Manual entitlement grant** | **prohibited** | — |
| **Production DELETE** | **prohibited** | — |
| **Fresh consult send** | **HOLD** | **FRESH-CONSULT-SEND-SMOKE go** after **FRESH-DTR-UNLOCK-R** |

---

## H. Stop conditions

| # | Condition | Action |
|---|-----------|--------|
| **FVP-S-1** | Cohort matched **`legacy_test_inventory`** hash | **STOP** · select **`launch-cohort-primary`** fresh account |
| **FVP-S-2** | Checkout executed without **`FRESH-CHECKOUT-D-EXEC go`** | **STOP** · gate violation |
| **FVP-S-3** | Consult send before **`FRESH-DTR-UNLOCK-R` PASS** | **STOP** |
| **FVP-S-4** | Send success but SQL deltas ≠ exactly **+1** | **STOP** · ops review |
| **FVP-S-5** | Idempotency replay changes SQL counts | **STOP** |
| **FVP-S-6** | S-5 metrics regress during window | **STOP** |
| **FVP-S-7** | Manual grant / remap attempted for convenience | **STOP** · policy violation |
| **FVP-S-8** | **`legacy_test_inventory`** used as pass evidence | **STOP** · **`not_launch_proof`** |
| **FVP-S-9** | Execution inside **PLANNING** gate | **STOP** |

---

## I. Human GO phrases（execution gates · not authorized here）

```text
FRESH-CHECKOUT-D-EXEC go
FRESH-CONSULT-SEND-SMOKE go
```

---

## J. No-mutation confirmation（planning gate）

| Action | Status |
|--------|--------|
| DB write / DDL / DML | **no** |
| identity mapping / manual grant / user migration | **no** |
| Clerk / env / Stripe mutation | **no** |
| checkout / payment / webhook replay / VERIFY-C | **no** |
| Production delete | **no** |
| raw ID / email / session / Stripe ID in SSOT | **no** |
| SELECT * | **no** |

---

## K. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-ACCOUNT-NO-PAYMENT-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-ACCOUNT-NO-PAYMENT-R-001`** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING-001`** |
| **3** | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-D-EXEC`** | **HOLD** · blocked by **`…PREVIEW-CONSISTENCY-R-001`** |
| **4** | **`FRESH-FULFILLMENT-R` → `FRESH-DTR-UNLOCK-R` → `FRESH-CONSULT-SEND-SMOKE-*`** | per gate |
| **5** | **Contract-C D-EXEC window close** | **no** |
| **6** | **Release readiness update** | **no** |

---

## L. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-VALIDATION-PATH-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-LEGACY-TEST-DATA-CUTOFF-POLICY-PLANNING-001`** | Cutoff policy |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R-001`** | **`post_cutover_baseline`** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-ACCOUNT-NO-PAYMENT-R-001`** | Cohort start · Not owned attestation |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-CHECKOUT-E2E-PLANNING-001`** | Checkout E2E execution packet |

---

## M. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | FRESH-VALIDATION-PATH GREEN · gate chain frozen |
