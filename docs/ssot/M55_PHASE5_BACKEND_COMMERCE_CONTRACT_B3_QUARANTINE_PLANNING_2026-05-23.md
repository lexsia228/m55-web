# Phase BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE — Planning（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING** |
| **Title** | **Remaining null-scope wallet quarantine / close planning（smoke 3 + no_visible 1）** |
| **Classification** | **Category 1 / read-only repo + SQL draft / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_B3_QUARANTINE_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **`main`** @ **`6ce7002`** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_POSTFLIGHT_R_GREEN_NO_ADDITIONAL_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R-001`** |
| **Remaining null-scope** | **4**（post backfill inventory） |
| **S-5** | **UNRESOLVED** |
| **Contract-C** | **HOLD** |
| **VERIFY-C** | **HOLD** |

**Planning GREEN.** **No quarantine apply · no DELETE · no balance mutation in this gate.**

---

## B. Pre-check

| # | Check | Result |
|---|-------|--------|
| 1 | Wallet backfill POSTFLIGHT-R | **GREEN** · null **4** · scoped **6** |
| 2 | B2-R classification anchor | smoke **3** · no_visible **1** |
| 3 | DB write in this gate | **no** |
| 4 | commit / push / deploy | **no** |

---

## C. Inspected files（read-only）

| Area | Files |
|------|-------|
| **POSTFLIGHT-R** | `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_WALLET_BACKFILL_POSTFLIGHT_R_2026-05-23.md` |
| **B2-R** | `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B2_R_PRODUCTION_PREFLIGHT_RESULT_2026-05-23.md` |
| **Null wallet policy** | `docs/ssot/M55_REPLY_TICKET_NULL_WALLET_POLICY_v1.md` |
| **Legacy quarantine candidate** | `scripts/sql/staging/m55_reply_ticket_null_wallet_quarantine_candidate.sql` |
| **Live consume guards** | `app/api/room/core/send/route.ts` · `app/api/room/core/route.ts` |
| **Wallet schema** | `supabase/migrations/20260416000000_reply_system_data_layer_v1.sql`（`status IN ('active','suspended','closed')`） |
| **B2 classification SQL** | `scripts/sql/production/m55_backend_commerce_contract_b2_null_scope_wallet_readonly_preflight_v1.sql` |
| **本条 SQL drafts** | `scripts/sql/production/m55_backend_commerce_contract_b3_quarantine_readonly_preflight_v1.sql` · `m55_backend_commerce_contract_b3_quarantine_update_candidate_v1.sql` · `m55_backend_commerce_contract_b3_quarantine_postflight_v1.sql` |

---

## D. Remaining cohort summary

| Metric | POSTFLIGHT-R / B2-R anchor |
|--------|---------------------------|
| **`wallets_null_report_instance_id_total`** | **4**（was **5** pre-backfill） |
| **`bucket_smoke_quarantine`** | **3** |
| **`bucket_no_visible_snapshot_quarantine`** | **1** |
| **`strict_backfill_eligible_count`** | **0**（backfill complete） |
| **`wallets_null_purchased_gt_0`** | **0** |
| **`wallets_cap_violation_rows`** | **0** |
| **Ledger rows on null wallets** | **7**（B2-R · inherit deferred） |
| **Disjoint from backfilled row** | **yes** — backfilled row now **scoped** |

**Shape:** all **4** remain **included-only legacy**（`purchased_count = 0`）· **not** ¥500 purchase artifacts.

**Status note:** B2-R recorded **`wallets_null_status_active = 2`** at classification time — quarantine apply may affect **≤ 4** rows depending on current **`status`** distribution · preflight must count **`quarantine_apply_candidate_count`** before EXEC.

---

## E. Quarantine semantics

| Principle | Policy |
|-----------|--------|
| **DELETE** | **prohibited** — wallet + ledger history retained |
| **Audit** | **`reply_wallet_ledgers`** rows **unchanged** in quarantine apply |
| **Balances** | **`available_count` / `consumed_count` / grants** — **no mutation** in default apply |
| **Primary mutation** | **`status = 'closed'`** only（optional **`updated_at`** on apply） |
| **`report_instance_id`** | **unchanged** — remains **NULL** on quarantined rows |
| **Smoke identification** | SQL pattern only（`smoke_user%` / `smoke\_user\_%`）— **no raw user_id in SSOT** |
| **No-visible row** | **must not** auto-map to snapshot · close only |
| **User-visible impact** | Live **`room/core/send`** already rejects **`status !== 'active'`** — closed wallet **cannot debit** |
| **Support reading** | Orphan / test smoke wallets closed for commerce safety · balances preserved for audit · not data loss |

---

## F. Quarantine options

| Option | Summary | Pros | Cons |
|--------|---------|------|------|
| **A — `status = 'closed'`** | Close all **4** classified null-scope rows | Aligns with **`M55_REPLY_TICKET_NULL_WALLET_POLICY_v1`** · Live path already gates on **`active`** | Rows still **NULL** scope in DB until S-5 redefined |
| **B — Leave DB untouched** | Contract-C code ignores null-scope only | No Production DML | **Unsafe alone** — Live **`user_id`** lookup can still hit **active** null row |
| **C — Manual support-only** | Ops handles case-by-case | Maximum caution | **Not scalable** · S-5 stall |
| **D — Mixed** | **A for automated apply** + **B as Contract-C guard** + **C fallback** if preflight ≠ expected | Defense in depth | Two tracks to maintain |

---

## G. Recommended quarantine path

**Primary: Option D — automated close (A) + Contract-C hard guard (B) + manual fallback (C)**

| Cohort | Rows | Apply action | Contract-C guard |
|--------|-----:|--------------|------------------|
| **smoke_quarantine** | **3** | **`status = 'closed'`** if **`active`** | never consume null-scope / closed |
| **no_visible_snapshot_quarantine** | **1** | **`status = 'closed'`** if **`active`** | never backfill without Human map |
| **Ledger** | all | **no change** in quarantine EXEC | C-12 inherit optional later |

**S-5 clearance definition（post quarantine postflight）:**

| Rule | Target |
|------|--------|
| **`wallets_null_report_instance_id_active_count`** | **0** |
| **`wallets_null_report_instance_id_active_available_gt_0`** | **0** |
| **`quarantine_apply_candidate_count`**（pre-apply） | matches Human attestation |
| **Remaining NULL rows** | **allowed** if **`status = 'closed'`** and **not spendable** |

**Reject as sole path:** Option **B** alone · Option **C** alone for all **4**.

---

## H. Safe apply candidate logic（future EXEC · planning only）

**Target table:** **`reply_ticket_wallets` only**

**Mutates:** **`status = 'closed'`**（and optionally **`updated_at`**) · **only**

**Row must satisfy ALL:**

| # | Guard |
|---|-------|
| **Q-1** | `report_instance_id IS NULL` |
| **Q-2** | `status = 'active'` |
| **Q-3** | `purchased_count = 0` |
| **Q-4** | `initial_included_count > 0` OR included-only legacy shape |
| **Q-5** | **Either** smoke pattern **OR** visible DTR snapshot count **= 0** |
| **Q-6** | **NOT** strict backfill eligible（visible = 1 · no dual wallet · not smoke） |
| **Q-7** | Cap invariant valid |

**Explicit exclusions:**

| Exclusion | Reason |
|-----------|--------|
| Scoped wallets | backfill cohort |
| **`strict_backfill_eligible`** shape | must remain **0** candidates |
| Balance zeroing | audit policy |
| Ledger DELETE | forbidden |

**Draft UPDATE:** `scripts/sql/production/m55_backend_commerce_contract_b3_quarantine_update_candidate_v1.sql`

**Expected rowcount:** **`quarantine_apply_candidate_count`** from preflight（**≤ 4** · may be **< 4** if some already **`closed`**）

---

## I. Human read-only SQL draft

**Preflight:** `scripts/sql/production/m55_backend_commerce_contract_b3_quarantine_readonly_preflight_v1.sql`

**Key outputs:**

| Section | Metrics |
|---------|---------|
| **§1** | Inventory anchor（null **4** · scoped **6** · strict eligible **0**） |
| **§2** | Remaining cohort（smoke **3** · no_visible **1** · totals by status） |
| **§3** | Spend shape（available>0 · consumed>0 · purchased>0 · cap） |
| **§4** | **`quarantine_apply_candidate_count`** |
| **§5** | Overlap guards（backfill eligible **0** · dual wallet **0**） |

**Postflight:** `scripts/sql/production/m55_backend_commerce_contract_b3_quarantine_postflight_v1.sql`

---

## J. Future apply split

| Gate | Scope | Mutation |
|------|-------|----------|
| **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING`** | **本条** | **no** |
| **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING`** | Human GO · runbook · rollback | **no** |
| **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-D-EXEC`** | preflight → **`UPDATE status`** → postflight | **yes** · **`B3-QUARANTINE go`** |
| **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R`** | attestation | **no** |
| **`BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R`** | re-run B2 §1 + quarantine metrics · S-5 verdict | **no** |

---

## K. Stop conditions

| # | Condition | Action |
|---|-----------|--------|
| **B3-Q-S-1** | **`wallets_null_report_instance_id_total ≠ 4`** | **STOP** · drift vs POSTFLIGHT-R |
| **B3-Q-S-2** | **`strict_backfill_eligible_count > 0`** | **STOP** · backfill regression |
| **B3-Q-S-3** | **`wallets_null_purchased_gt_0 > 0`** | **STOP** · manual review |
| **B3-Q-S-4** | **`wallets_cap_violation_rows > 0`** | **STOP** |
| **B3-Q-S-5** | smoke **+** no_visible classification **≠ 4** null rows | **STOP** · re-run B2-R cadence |
| **B3-Q-S-6** | **`quarantine_apply_candidate_count = 0`** unexpectedly while **active null available > 0** | **STOP** · manual |
| **B3-Q-S-7** | APPLY rowcount **≠** preflight candidate count | **STOP** |
| **B3-Q-S-8** | DELETE attempted | **STOP** · gate violation |
| **B3-Q-S-9** | Quarantine apply inside **planning** gate | **STOP** |

---

## L. Contract-C dependency update

| Item | After quarantine planning | After quarantine EXEC + combined postflight |
|------|---------------------------|---------------------------------------------|
| **S-5 STOP** | **active** | **cleared** if **`active` null-scope = 0** |
| **CC-0** | **not met** | **met** when S-5 rules pass |
| **Contract-C start** | **HOLD** | **planning unlocked** · implementation still separate GO |
| **C-11 Live guard** | **required regardless** | forbid null-scope / non-active wallet debit |
| **¥500 checkout** | **requires `report_instance_id`** in RPC today | unchanged |
| **VERIFY-C** | **HOLD** | **HOLD** until Contract-C + env gates |

---

## M. No-mutation（this gate）

| Action | Status |
|--------|--------|
| quarantine apply / UPDATE / DELETE | **no** |
| code edit | **no** |
| commit | **no**（unless explicit Human GO） |
| push / deploy / env / Stripe | **no** |
| live checkout / webhook / VERIFY-C | **HOLD** |
| raw ID in SSOT | **no** |

---

## N. Recommended next gate

| Priority | Gate |
|----------|------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING`** | **CLOSED** GREEN |
| **2** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-D-EXEC`** | **COMPLETE** |
| **3** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R-001`** |
| **4** | **`BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R`** | **CLOSED** GREEN · **S-5 CLOSED** |
| **5** | **`BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING`** | **NEXT** |

---

## O. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING-001`** | EXEC-PLANNING · Human packet |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R-001`** | POSTFLIGHT-R · quarantine track GREEN |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R-001`** | S-5 combined POSTFLIGHT-R |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R-001`** | null **4** anchor |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B2-R-001`** | smoke **3** · no_visible **1** |

---

## P. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | Planning @ **`6ce7002`** · Option D recommended |
