# Phase BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL — Planning（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING** |
| **Title** | **Null-scope wallet — strict single-row `report_instance_id` backfill planning** |
| **Classification** | **Category 1 / read-only repo + SQL draft / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **`main`** @ **`6ce7002`** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_B2_R_GREEN_COUNTS_ATTESTED_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B2-R-001`** |
| **Cohort size** | **`strict_backfill_eligible_count = 1`** · **`strict_backfill_eligible_available_gt_0 = 1`** |
| **S-5** | **UNRESOLVED**（full clear requires **B3 quarantine（4）** + this backfill + postflight） |
| **Contract-C** | **HOLD** |
| **VERIFY-C** | **HOLD** |

**Planning GREEN.** **No UPDATE / backfill apply in this gate.**

---

## B. Pre-check

| # | Check | Result |
|---|-------|--------|
| 1 | B2-R attestation | **GREEN** · eligible **1** · dual conflict **0** · cap **0** |
| 2 | DB write / UPDATE | **no** |
| 3 | commit / push / deploy | **no** |
| 4 | live checkout / VERIFY-C | **HOLD** |

---

## C. Inspected files（read-only）

| Area | Files |
|------|-------|
| **B2-R result** | `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B2_R_PRODUCTION_PREFLIGHT_RESULT_2026-05-23.md` |
| **B2 planning** | `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B2_NULL_SCOPE_WALLET_COMPATIBILITY_BACKFILL_PLANNING_2026-05-23.md` |
| **Contract-B / S-5** | `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B_READONLY_PREFLIGHT_2026-05-23.md` |
| **Legacy B1 design** | `docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_BACKFILL_DESIGN_REVIEW_v1.md` · `M55_REPLY_WALLET_REPORT_INSTANCE_SCOPE_ADR_v1.md` |
| **Legacy UPDATE draft** | `scripts/sql/production/m55_reply_wallet_phase_b1_wallet_update_candidate.sql` |
| **B2 classification SQL** | `scripts/sql/production/m55_backend_commerce_contract_b2_null_scope_wallet_readonly_preflight_v1.sql` |
| **本条 SQL drafts** | `scripts/sql/production/m55_backend_commerce_contract_b3_wallet_backfill_preflight_v1.sql` · `m55_backend_commerce_contract_b3_wallet_backfill_update_candidate_v1.sql` · `m55_backend_commerce_contract_b3_wallet_backfill_postflight_v1.sql` |

---

## D. Strict backfill invariant（apply-time · all required）

Target: **exactly one** `reply_ticket_wallets` row on Production at preflight instant.

| # | Invariant |
|---|-----------|
| **I-1** | `report_instance_id IS NULL` |
| **I-2** | `status = 'active'` |
| **I-3** | `purchased_count = 0` |
| **I-4** | `initial_included_count > 0` |
| **I-5** | **Visible** DTR core snapshot count **`= 1`**（`product_id = 'DTR_CORE_STATIC_V1'` · `user_hidden_at IS NULL` when column exists） |
| **I-6** | **No** other **`active`** wallet for same owner with **`report_instance_id IS NOT NULL`** |
| **I-7** | Owner **not** smoke pattern（`smoke_user%` / `smoke\_user\_%`） |
| **I-8** | Cap invariant holds: `(initial+purchased) ≤ 5` · `purchased ≤ 4` · `available = initial+purchased-consumed` |
| **I-9** | Preflight aggregate **`strict_backfill_eligible_count = 1`** immediately before UPDATE |

**Value source:** sole visible row’s **`dtr_report_snapshots.id`**（tie-break if ever needed: **`created_at ASC, id ASC`** — should not run with count > 1).

---

## E. Future UPDATE guard design

**Table:** **`reply_ticket_wallets` only**

**Sets:** **`report_instance_id`** ← **`dtr_report_snapshots.id`**

**Does not mutate:** `initial_included_count` · `purchased_count` · `consumed_count` · `available_count` · `status` · ledger · sessions · entitlements

**Does not:** DELETE · INSERT · ALTER

**Draft file:** `scripts/sql/production/m55_backend_commerce_contract_b3_wallet_backfill_update_candidate_v1.sql`

**Guard summary（WHERE clause）:**

1. Wallet row matches **§D I-1〜I-4, I-7**
2. Join snapshot **`s`** on **`s.user_id = w.user_id`** · **`s.product_id = 'DTR_CORE_STATIC_V1'`** · **`s.user_hidden_at IS NULL`**
3. Visible snapshot count subquery **`= 1`**
4. **`NOT EXISTS`** active scoped wallet for same **`user_id`**（**I-6**）
5. **Expected rowcount:** **`1`** — if preflight or **`RETURNING`** hash count ≠ 1 → **STOP** · treat as partial/wrong apply

**Enhancement vs legacy B1 UPDATE:** adds **visible-only snapshot** · **commerce strict shape** · **dual-wallet exclusion** · aligns with B2-R **`strict_backfill_eligible`** definition.

---

## F. Ledger backfill decision

| Option | Decision |
|--------|----------|
| **Include ledger `report_instance_id` in same B3 wallet apply** | **no** |
| **Defer ledger inherit** | **yes** → **`BACKEND-COMMERCE-CONTRACT-B3-LEDGER-INHERIT-PLANNING`** or **Contract-C C-12** |

**Rationale:**

1. **Phase B1 precedent:** wallet-only backfill · ledger/session **out of scope** for first DML.
2. **B2-R cohort:** **7** ledger rows span **5** null wallets — only **1** wallet backfilled here; ledger UPDATE requires **`wallet_id`-scoped** guard, separate postflight, not mixed with quarantine cohort.
3. **S-5 / Contract-C unblock priority:** scoped **wallet** row is authority for consume RPC · ledger inherit is **audit completeness**, not blocking for **`m55_consult_reply_commit`** if wallet is scoped.
4. **Post-wallet gate:** after **B3-WALLET-BACKFILL-POSTFLIGHT-R PASS**, plan ledger inherit for rows **`WHERE wallet_id`** matches the backfilled wallet only（counts-only preflight · separate GO）.

**No ledger mutation in B3 wallet planning or wallet EXEC gate.**

---

## G. Idempotency and safety

| Control | Rule |
|---------|------|
| **Pre-apply** | Run **`m55_backend_commerce_contract_b3_wallet_backfill_preflight_v1.sql`** · **`strict_backfill_eligible_count = 1`** |
| **Re-run B2 §6** | Optional cross-check · must still be **1** |
| **Apply** | Single **`UPDATE`** statement only · separate Human GO phrase |
| **Rowcount** | **`RETURNING`** yields **1** hashed wallet pk only · no raw UUID in tickets |
| **Idempotency** | Second run: eligible **0** · **`report_instance_id` already set** → no-op |
| **Post-apply** | Run postflight SQL · see **§H** |
| **Dual-wallet** | Postflight **`users_with_both_null_and_scoped_wallet = 0`** |
| **Cap** | Postflight **`wallets_cap_violation_rows = 0`** |

---

## H. Postflight SQL design（counts only）

**File:** `scripts/sql/production/m55_backend_commerce_contract_b3_wallet_backfill_postflight_v1.sql`

| Metric | Expected after successful apply |
|--------|--------------------------------|
| **`strict_backfill_eligible_count`** | **0** |
| **`wallets_null_report_instance_id_total`** | **4**（was **5**） |
| **`wallets_with_report_instance_id_total`** | **6**（was **5**） |
| **`wallets_cap_violation_rows`** | **0** |
| **`users_with_both_null_and_scoped_wallet`** | **0** |
| **`bucket_safe_backfill_candidate`** | **0** |
| **`ledger_null_scope_wallet_report_instance_id_null`** | **unchanged or reduced only via future ledger gate** — wallet apply alone does not require ledger delta |

**Partial S-5:** backfill alone **does not** clear S-5 — **4** null-scope rows remain until **B3-QUARANTINE** exec + combined postflight.

---

## I. Stop conditions

| # | Condition | Action |
|---|-----------|--------|
| **B3-WB-S-1** | **`strict_backfill_eligible_count ≠ 1`** at pre-apply | **STOP** · re-run B2-R cadence |
| **B3-WB-S-2** | **`bucket_dual_wallet_scoped_conflict > 0`** | **STOP** |
| **B3-WB-S-3** | **`wallets_cap_violation_rows > 0`** | **STOP** |
| **B3-WB-S-4** | **`wallets_null_purchased_gt_0 > 0`** on null cohort | **STOP** |
| **B3-WB-S-5** | UPDATE **`RETURNING`** count **≠ 1** | **STOP** · rollback planning · no silent continue |
| **B3-WB-S-6** | Visible snapshot count **≠ 1** for target owner at apply instant | **STOP** |
| **B3-WB-S-7** | Attempt UPDATE inside **planning** gate | **STOP** · gate violation |
| **B3-WB-S-8** | Wrong snapshot risk（hidden row chosen · multiple visible） | **STOP** before apply |

---

## J. Execution gate split

| Gate | Scope | Mutation |
|------|-------|----------|
| **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING`** | **本条** — invariant · SQL drafts | **no** |
| **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING`** | Human runbook · GO phrase · window · rollback ticket template | **no** |
| **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-D-EXEC`** | Run preflight → **`UPDATE`** once → postflight same session | **yes** · explicit **`B3-WALLET-BACKFILL go`** |
| **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R`** | Human attestation of postflight counts | **no** |
| **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING`** | **Parallel** — **4** row cohort | **no** |
| **Combined S-5 postflight** | After wallet + quarantine exec | **no** |

**Order recommendation:** wallet backfill **may** run **before or after** quarantine on **disjoint rows** — preflight must prove **zero row overlap** between eligible backfill and quarantine cohorts（B2-R: **1** vs **4** · disjoint by classification).

---

## K. Rollback / support boundary

| Rule | Status |
|------|--------|
| **DELETE** | **prohibited** |
| **Rollback** | Separate explicit GO · **`report_instance_id = NULL`** on affected wallet only · mirror forward guards · **raw IDs human-private** |
| **Wrong `report_instance_id` risk** | **STOP before apply** if preflight ≠ 1 or visible count ambiguous |
| **Balance rollback** | Not applicable — apply does not touch balances |
| **Support** | Ops ticket with hashed **`RETURNING`** only |

---

## L. Contract-C dependency update

| Item | After B3 wallet backfill only | After full S-5 remediation |
|------|------------------------------|----------------------------|
| **Scoped wallet for 1 owner** | **yes** | all spendable null cleared |
| **S-5 STOP** | **still active**（**4** null rows） | cleared post quarantine + postflight |
| **Contract-C CC-0** | **not satisfied** alone | satisfied |
| **C-7 consume RPC** | still blocked on remaining null-scope Live paths | unblocked planning |
| **C-12 ledger inherit** | optional follow-up for **1** wallet’s ledger rows | broader if needed |

---

## M. No-mutation（this gate）

| Action | Status |
|--------|--------|
| Production UPDATE / backfill apply | **no** |
| quarantine apply | **no** |
| code edit | **no** |
| commit | **no**（unless explicit Human GO） |
| push / deploy / env / Stripe | **no** |
| live checkout / webhook / VERIFY-C | **HOLD** |
| raw ID in SSOT | **no** |

---

## N. Recommended next gate

| Priority | Gate |
|----------|------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING-001`** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-D-EXEC`** | **COMPLETE** · 1 row UPDATE |
| **3** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R-001`** |
| **4** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING`** | **CLOSED** GREEN |
| **5** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING`** | **NEXT** |

---

## O. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING-001`** | EXEC-PLANNING · Human packet |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R-001`** | POSTFLIGHT-R · 1 row scoped |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B2-R-001`** | Eligible **1** anchor |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B-HUMAN-R-001`** | S-5 origin |

---

## P. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | Planning @ **`6ce7002`** · wallet-only · ledger deferred |
