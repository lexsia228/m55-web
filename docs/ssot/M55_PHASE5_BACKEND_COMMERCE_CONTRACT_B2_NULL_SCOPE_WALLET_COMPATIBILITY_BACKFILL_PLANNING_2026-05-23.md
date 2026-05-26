# Phase BACKEND-COMMERCE-CONTRACT-B2 — Null-scope wallet compatibility / backfill planning（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-B2** |
| **Title** | **Null-scope wallet compatibility / backfill planning（Contract-B S-5 remediation design）** |
| **Classification** | **Category 1 / read-only repo + aggregate SQL draft / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_B2_NULL_SCOPE_WALLET_COMPATIBILITY_BACKFILL_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B2-NULL-SCOPE-WALLET-COMPATIBILITY-BACKFILL-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **`main`** @ **`6ce7002`** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_B_HUMAN_R_BLOCKED_S5_ACTIVE_NULL_SCOPE_WALLETS_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B-HUMAN-R-001`** |
| **Contract-C** | **HOLD** |
| **VERIFY-C** | **HOLD** |
| **Production B2 Human SQL** | **CLOSED** — **`BACKEND-COMMERCE-CONTRACT-B2-R`** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B2-R-001`** |

**Planning GREEN.** **No backfill apply.** **S-5 remains STOP** until **`BACKEND-COMMERCE-CONTRACT-B2-R`**（Human counts）+ **`BACKEND-COMMERCE-CONTRACT-B3-*`**（execution split · separate GO）.

---

## B. Pre-check

| # | Check | Result |
|---|-------|--------|
| 1 | `git status` | SSOT untracked · **`M55_SYSTEM_SSOT.md` modified** · no app code touched |
| 2 | DB write / backfill apply | **no** |
| 3 | commit / push / deploy | **no** |
| 4 | live checkout / webhook / VERIFY-C | **HOLD** |

---

## C. Inspected files（read-only）

| Area | Files / SSOT |
|------|----------------|
| **B-HUMAN-R result** | `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B_HUMAN_R_PRODUCTION_PREFLIGHT_RESULT_2026-05-23.md` |
| **Contract-B planning** | `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B_READONLY_PREFLIGHT_2026-05-23.md` |
| **Contract-A P0** | `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_A_1000_DTR_500_REPLY_PLANNING_2026-05-23.md` |
| **Legacy wallet backfill design** | `docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_BACKFILL_DESIGN_REVIEW_v1.md` · `M55_REPLY_WALLET_REPORT_INSTANCE_SCOPE_ADR_v1.md` · `M55_REPLY_TICKET_NULL_WALLET_POLICY_v1.md` |
| **Production SQL refs** | `scripts/sql/production/m55_reply_wallet_phase_b1_wallet_preflight.sql` · `m55_reply_wallet_phase_b_backfill_candidate_diagnostic.sql` |
| **Live grant path（legacy user scope）** | `lib/m55/reply/walletGrants.ts` |
| **DTR fulfillment link order** | `lib/m55/dtrCoreCheckoutFulfillment.ts`（grant **before** snapshot · bulk link active wallets by `user_id`） |
| **¥500 lane（scoped）** | `lib/m55/reply/replyTicketWebhookLane.ts` · RPC **`m55_reply_ticket_fulfill_checkout_event`** |
| **Live consume（unscoped today）** | `app/api/room/core/send/route.ts` · `lib/m55/reply/readReplyWalletProbe.ts` |
| **B2 SQL draft（本条）** | `scripts/sql/production/m55_backend_commerce_contract_b2_null_scope_wallet_readonly_preflight_v1.sql` |

---

## D. Null-scope wallet interpretation（B-HUMAN-R anchored）

### D.1 Observed Production inventory（counts only · 2026-05-23 Human-R）

| Metric | Value | Reading |
|--------|------:|---------|
| **reply_ticket_wallets_total** | **10** | Small cohort · full-table classification feasible |
| **wallets_null_report_instance_id_total** | **5** | **S-5 STOP** cohort |
| **wallets_with_report_instance_id_total** | **5** | Post-migration / post-link scoped rows coexist |
| **wallets_null … available_gt_0** | **3** | **Active spendable legacy balance** without report scope |
| **wallets_null … initial_gt_0** | **5** | All null rows show **included_grant** shape |
| **wallets_null … purchased_gt_0** | **0** | **No ¥500 purchase_grant on null-scope** |
| **wallets_null … consumed_gt_0** | **2** | Partially consumed legacy included wallets |
| **wallets_cap_violation_rows** | **0** | Cap invariant OK · not a repair emergency |

### D.2 Classification model（planning）

| Class | Rule（aggregate SQL） | Likely meaning |
|-------|----------------------|----------------|
| **Legacy included-only** | `report_instance_id IS NULL` · `purchased_count = 0` · `initial_included_count > 0` | **`grantInitialIncludedReplyIfNeeded`** created **user-global** row **before** snapshot link / scoped column era |
| **Unconsumed legacy** | above · `available_count > 0` | User may still see spendable credit on Live path（**user_id** lookup） |
| **Partially consumed legacy** | above · `consumed_count > 0` | Live **`room/core/send`** or early consume without **`reply_consume` ledger** |
| **Not purchase-backed null** | `purchased_count = 0` on all 5 | **Not** ¥500 RPC failure artifact |
| **Scoped coexistence unknown until B2-R** | needs **`users_with_both_null_and_scoped_wallet`** | If **> 0** → prefer **quarantine null row**, not backfill |

### D.3 Root cause（repo + Human-R synthesis）

1. **Historical order:** DTR fulfillment calls **`grantInitialIncludedReplyIfNeeded`** **before** snapshot upsert; insert path omits **`report_instance_id`**. Link UPDATE runs **after** snapshot only when upsert succeeds — **legacy rows can remain NULL** if link skipped or predates link code.
2. **`walletGrants.ts`** still resolves wallet by **`user_id` `.maybeSingle()`** — matches **legacy global row** semantics.
3. **¥500 RPC** requires **`report_instance_id`** — null-scope rows are **not** ¥500 targets; **Live send** still debits via **unscoped** route logic (**BC-P0-001〜004**).
4. **Not interpreted as:** active bleeding · data loss · cap breach.

---

## E. Compatibility strategy options

| Option | Summary | Pros | Cons | Contract-C fit |
|--------|---------|------|------|----------------|
| **A — Backfill before Contract-C** | Human-verified **`UPDATE reply_ticket_wallets.report_instance_id`** for **strict eligible** rows only; ambiguous → HOLD | Clean scoped RPC · single wallet authority · aligns with **ADR v1** · reuses **Phase B1** design | Requires **B3 execution GO** · ledger **`report_instance_id`** inherit is **separate phase（B2 ledger）** | **Best** if **`strict_backfill_eligible_count`** covers all spendable null rows |
| **B — Compatibility layer in app/RPC** | Consume/checkout reads **null OR scoped** wallet with fallback rules | Avoids immediate Production UPDATE | **Dual authority** · easy double-spend if user has **two rows** · violates Contract-C **C-7** simplicity | **Not recommended** as primary |
| **C — Dual-read then migrate** | Temporary read merge + later backfill | Phased | **Highest complexity** · prolongs **BC-P0-004** two-path problem | **Defer** — use only if B2-R proves zero eligible backfill **and** non-zero **`available > 0`** on dual-wallet users |
| **D — Block ¥500 until scoped wallet exists** | Checkout gate only | Already partially true（RPC metadata） | **Does not fix Live send** on null-scope **`available_count`** | **Necessary adjunct**, **insufficient alone** |

---

## F. Recommended path（planning decision）

**Primary: Option A（selective backfill）+ quarantine for conflicts + code fix in Contract-C（not B2 apply）**

| Step | Action | Gate |
|------|--------|------|
| **1** | Human runs **§L B2 read-only SQL** · paste **counts only** | **`BACKEND-COMMERCE-CONTRACT-B2-R`** |
| **2a** | If **`strict_backfill_eligible_count > 0`** → plan **wallet-only UPDATE**（one visible snapshot · no dual-wallet · included-only） | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING`** then **`…-D-EXEC`** with explicit GO |
| **2b** | If **`bucket_dual_wallet_scoped_conflict > 0`** → plan **`status = closed`** on null row（**quarantine** · no delete） per **`M55_REPLY_TICKET_NULL_WALLET_POLICY_v1`** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING`** |
| **2c** | If **`bucket_no_visible_snapshot_quarantine > 0`** → HOLD / manual mapping · **no auto UUID** | ops review |
| **3** | After wallet scope cleared · optional **ledger `report_instance_id` inherit** | legacy **Phase B2 ledger** pattern · **separate GO** |
| **4** | **`UNIQUE (user_id)` → `(user_id, report_instance_id)`** DDL | **After** null cohort remediated · **not in B2** |
| **5** | **Contract-C** starts only when **`wallets_null_report_instance_id_active_owned = 0`**（or documented quarantine of all remaining null rows with **`available = 0`**) | **`BACKEND-COMMERCE-CONTRACT-C`** |

**Reject as primary:** Option **B/C** dual-read in Contract-C consume RPC.

**Adjunct:** Option **D** remains enforced at ¥500 checkout; add Live send guard in **Contract-C**（reject consume when scoped wallet missing for active report context）.

---

## G. Safe backfill eligibility criteria（automated UPDATE candidate · planning）

**Target column:** `reply_ticket_wallets.report_instance_id` ← **`dtr_report_snapshots.id`**（visible row · **`DTR_CORE_STATIC_V1`** only）

**ALL must hold:**

| # | Criterion |
|---|-----------|
| **E-1** | `report_instance_id IS NULL` |
| **E-2** | `status = 'active'` |
| **E-3** | `purchased_count = 0` |
| **E-4** | `initial_included_count > 0`（included-only legacy） |
| **E-5** | Owner has **exactly 1** **visible** DTR core snapshot（`user_hidden_at IS NULL` when column exists） |
| **E-6** | Owner has **no** other **active** wallet with **`report_instance_id IS NOT NULL`**（no dual-wallet conflict） |
| **E-7** | Owner is **not** smoke test pattern（`smoke_user%`） |
| **E-8** | Post-apply cap invariant still **`wallets_cap_violation_rows = 0`** |

**Value source:** earliest visible snapshot by **`created_at ASC, id ASC`**（same tie-break as Phase B1）.

**Explicit exclusions（→ HOLD / quarantine / manual):**

| Exclusion | Action |
|-----------|--------|
| **0 visible snapshots** | **quarantine** · no fabricated UUID |
| **> 1 visible snapshots** | **manual** |
| **dual null + scoped wallet same user** | **close null row** · do **not** backfill |
| **`purchased_count > 0` on null row** | **manual**（unexpected on current Human-R） |
| **ledger/session UPDATE in same transaction as wallet backfill** | **forbidden in B3 wallet-only phase** |

---

## H. Stop conditions（B2 planning + B2-R Human）

| # | Condition | Action |
|---|-----------|--------|
| **B2-S-1** | **`wallets_null_report_instance_id_total`** drifts from B-HUMAN-R baseline without documented ops event | **STOP** · re-run B-HUMAN-R cadence |
| **B2-S-2** | **`wallets_null_purchased_gt_0 > 0`** | **STOP** auto backfill · manual commerce review |
| **B2-S-3** | **`wallets_cap_violation_rows > 0`** | **STOP** · repair planning |
| **B2-S-4** | **`strict_backfill_eligible_count + ambiguous_or_hold_total ≠ wallets_null_total`**（classification incoherence） | **STOP** · fix SQL / re-run |
| **B2-S-5** | **`bucket_dual_wallet_scoped_conflict > 0`** with **`available > 0` on those null rows** | **STOP** naive backfill · require **quarantine plan** first |
| **B2-S-6** | Attempt **UPDATE / quarantine apply** inside B2 gate | **STOP** · gate violation |
| **B2-S-7** | **`reply_ticket_wallets_user_id_only_unique_count = 1`** while **`users_with_both_null_and_scoped_wallet > 0`** | **STOP** DDL assumption · schema contradiction — ops review |

**Contract-B S-5 remains STOP** until B3 execution postflight shows **`wallets_with_null_report_instance_id = 0`** OR all remaining null rows are **closed** with **`available_count = 0`**.

---

## I. Contract-C dependency update

### I.1 Contract-C entry criteria（revised）

| # | Requirement | Source |
|---|-------------|--------|
| **CC-0** | **S-5 cleared** — no active null-scope wallet with **`available_count > 0`** unless explicitly quarantined and excluded from Live debit | B3 postflight |
| **CC-1** | B-HUMAN-R **S-1〜S-4** remain PASS | unchanged |
| **CC-2** | B2-R Human SQL attestation recorded | **`BACKEND-COMMERCE-CONTRACT-B2-R`** |
| **CC-3** | B3 wallet remediation **GO + postflight** if eligible cohort **> 0** | separate gate |
| **CC-4** | Env-name checklist **S-6**（optional parallel） | Contract-B |

### I.2 Contract-C target list additions（from Contract-B §I）

| # | Target | Notes |
|---|--------|-------|
| **C-0** | **Null-scope remediation complete** | B3 · blocks all other C work |
| **C-7** | Report-scoped wallet in consume RPC | **requires CC-0** |
| **C-10** | **Fix grant order** — create/link wallet with **`report_instance_id`** at DTR fulfillment **before** included grant ledger finality | `dtrCoreCheckoutFulfillment.ts` · `walletGrants.ts` |
| **C-11** | **Live send guard** — refuse scoped consume when wallet row missing for **`report_instance_id`**（no silent fallback to null-scope row） | `room/core/send` · RPC |
| **C-12** | **Optional:** ledger **`report_instance_id`** inherit for rows tied to remediated wallets | post-B3 · Phase B2 ledger pattern |

**Still HOLD:** live ¥500 checkout smoke · VERIFY-C · webhook replay.

---

## J. B3 execution split（recommended · planning only）

| Gate | Scope | Mutation |
|------|-------|----------|
| **`BACKEND-COMMERCE-CONTRACT-B2-R`** | Human runs §L SQL · attestation | **no** |
| **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING`** | UPDATE packet design · rollback · postflight SQL | **no** |
| **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-D-EXEC`** | Wallet-only **`report_instance_id` UPDATE** | **yes** · explicit Human GO |
| **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-D-EXEC`** | Close conflicting / orphan null rows | **yes** · explicit Human GO |
| **`BACKEND-COMMERCE-CONTRACT-B3-POSTFLIGHT-R`** | Re-run B + B2 SQL · confirm **S-5 clear** | **no** |
| **`BACKEND-COMMERCE-CONTRACT-C`** | P0 implementation | after **B3-POSTFLIGHT-R PASS** |

---

## K. Risk interpretation

| Risk | Level | Mitigation |
|------|-------|------------|
| **Double spend（null + scoped rows）** | **High** if dual-wallet users exist | B2-R **`users_with_both_null_and_scoped_wallet`** · quarantine null |
| **Wrong snapshot mapping** | **Medium** | Visible-only · exactly-one rule · manual for **> 1** |
| **User loses included credit** | **Medium** if quarantine without UI sync | Close only after **`available`** reconciled · Contract-C display from wallet SSOT |
| **Ledger audit gap** | **Low–Med** | Wallet backfill first · ledger inherit later · no silent delete |
| **Legacy UNIQUE(user_id) blocks multi-row** | **Ops** | §9 SQL inventory before scoped DDL |

---

## L. Human read-only SQL draft

**File:** `scripts/sql/production/m55_backend_commerce_contract_b2_null_scope_wallet_readonly_preflight_v1.sql`

**Run:** section-by-section · **`m55-soul-core`** · paste **count/boolean columns only**.

**Key outputs for B2-R:**

| Section | Metrics |
|---------|---------|
| **§1** | B-HUMAN-R reconciliation |
| **§2** | Legacy included shape |
| **§3** | Visible vs all snapshot buckets |
| **§4** | Dual-wallet user counts |
| **§5** | **`bucket_*` classification** |
| **§6** | **`strict_backfill_eligible_*`** |
| **§7** | **`ambiguous_or_hold_total`** |
| **§8** | Ledger alignment |
| **§9** | UNIQUE constraint inventory |
| **§10** | Cap violation re-check |

**Also valid（legacy deep dive · hash rows in §1 of that file — avoid pasting row output in chat):** `m55_reply_wallet_phase_b1_wallet_preflight.sql`

---

## M. No-mutation（this gate）

| Action | Status |
|--------|--------|
| code edit | **no** |
| commit | **no**（unless explicit Human GO） |
| push / deploy | **no** |
| Production DB write / backfill apply | **no** |
| env / Stripe change | **no** |
| live checkout / payment / webhook replay | **no** |
| VERIFY-C | **HOLD** |
| Production delete | **no** |
| raw ID / secret / email / session | **not recorded** |
| SELECT * / row-level paste | **no** |

---

## N. Recommended next gate

| Priority | Gate | Status |
|----------|------|--------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-B2-R`** | **CLOSED** GREEN · see B2-R SSOT |
| **2** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING`** | **CLOSED** GREEN |
| **3** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING`** | **CLOSED** GREEN |
| **4** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-D-EXEC`** | **COMPLETE** |
| **5** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R`** | **CLOSED** GREEN |
| **6** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING`** | **CLOSED** GREEN |
| **7** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING-001`** |
| **8** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-D-EXEC`** | **COMPLETE** |
| **9** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R-001`** |
| **10** | **`BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R`** | **CLOSED** GREEN · **S-5 CLOSED** |
| **11** | **`BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING`** | **CLOSED** GREEN |
| **12** | **`BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING`** | **CLOSED** GREEN |
| **13** | **`BACKEND-COMMERCE-CONTRACT-C-HUMAN-R`** | **CLOSED** GREEN |
| **14** | **`BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING`** | **CLOSED** GREEN |
| **15** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING`** | **CLOSED** GREEN |
| **16** | **`BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION`** | **NEXT** |
| **17** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-DB`** | **HOLD** · **`C-D-EXEC go`** |

---

## O. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B2-NULL-SCOPE-WALLET-COMPATIBILITY-BACKFILL-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B2-R-001`** | B2-R Human counts · backfill **1** · quarantine **4** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING-001`** | B3 wallet backfill planning |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING-001`** | B3 wallet backfill EXEC-PLANNING |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R-001`** | B3 wallet backfill POSTFLIGHT-R · 1 row |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING-001`** | B3 quarantine planning |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING-001`** | B3 quarantine EXEC-PLANNING |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R-001`** | B3 quarantine POSTFLIGHT-R · 1 row closed |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R-001`** | S-5 combined POSTFLIGHT-R · **S-5 CLOSED** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING-001`** | Contract-C READONLY-PREFLIGHT-PLANNING |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING-001`** | Contract-C IMPLEMENTATION-PLANNING |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`** | C-HUMAN-R Production preflight |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING-001`** | C migration planning |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** | C D-EXEC-PLANNING |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B-HUMAN-R-001`** | S-5 STOP origin |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B-READONLY-PREFLIGHT-PLANNING-001`** | Contract-B |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-A-1000-DTR-500-REPLY-PLANNING-001`** | P0 list |

---

## P. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | B2 planning @ **`6ce7002`** · Option A + quarantine hybrid |
