# Phase FRESH-INCLUDED-REPLY-CONSUME-SQL-R — post-consume DB read-only（2026-05-24）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **FRESH-INCLUDED-REPLY-CONSUME-SQL-R** |
| **Title** | **Verify included reply consume for launch-cohort-primary** |
| **Classification** | **Category 2 / read-only SQL / hash-bound cohort** |
| **Verdict** | **`FRESH_INCLUDED_REPLY_CONSUME_SQL_R_WAITING_HUMAN_SQL_ATTESTATION_NO_MUTATION`** |
| **Final classification (2026-05-25)** | **`FRESH_INCLUDED_REPLY_CONSUME_SQL_R_SUPERSEDED_BY_DOWNSTREAM_COMPOSITE_AND_R9_EVIDENCE_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260524-FRESH-INCLUDED-REPLY-CONSUME-SQL-R-001`** |
| **Date** | **2026-05-24** |
| **Cohort label** | **`launch-cohort-primary`** · **`M55-core-Development`** |
| **Production app** | **`23eb8a1`** (hierarchy fix deployed) |
| **Agent Production `SELECT`** | **not executed** — no local DB credential / operator hash not in repo |
| **Mutation in gate** | **no** |

---

## B. UI consume summary（Human attestation）

| Check | Result |
|-------|--------|
| **`/dtr/core` opens** | **PASS** |
| **Consult room visible** | **PASS** |
| **Initial UI** | **残数確認中** |
| **User sent one message** | **yes** |
| **Theme** | **距離と期待** |
| **M55 response generated** | **PASS** |
| **After ~30s** | **残り 0件** |
| **Additional reply CTA** | **追加相談返書 1件 500円** visible |
| **¥500 purchase clicked** | **no** |

**UI classification:** **`INCLUDED_REPLY_CONSUME_UI_OBSERVED_ONCE_REMAINING_ZERO`** — aligns with expected single consume · **not** DB proof alone.

---

## C. SQL script

**Path:** `scripts/sql/production/m55_fresh_included_reply_consume_readonly_v1.sql`

**Operator:** set `params.operator_user_hash_hex16` locally only（`hashUserIdForLedgerLog` 先頭 16 hex）· **never paste into SSOT**.

---

## D. Expected post-consume DB band（cohort-scoped）

| Metric | Expected |
|--------|----------|
| **cohort_visible_snapshot_count** | **1** |
| **cohort_scoped_active_wallet_count** | **≥ 1** |
| **cohort_scoped_available_count_max** | **0** |
| **cohort_scoped_consumed_count_max** | **≥ 1** |
| **cohort_included_grant_ledger_count** | **≥ 1** |
| **cohort_reply_consume_ledger_count** | **= 1** |
| **cohort_reply_consume_with_consult_commit_id_count** | **= 1**（consult RPC path） |
| **cohort_purchase_grant_ledger_count** | **0** |
| **cohort_consult_send_commits_succeeded** | **= 1** |
| **cohort_consult_send_commits_failed** | **0** |
| **S-5 guards** | **all 0** |

---

## E. Wallet / ledger / commit SQL summary（Agent）

| Section | Status |
|---------|--------|
| **Wallet aggregate** | **resolved_by_downstream_evidence** |
| **Ledger aggregate** | **resolved_by_downstream_evidence** |
| **consult_send_commits** | **resolved_by_downstream_evidence** |
| **S-5 guards** | **resolved_by_downstream_evidence** |

**Resolution note:** standalone Human SQL close for this original gate remained pending, but the same cohort lane was later closed by downstream evidence (composite + R9-R) without mutation.

---

## F. S-5 guard summary（expected）

| Guard | Expected |
|-------|----------|
| **wallets_null_status_active** | **0** |
| **wallets_null_active_available_gt_0** | **0** |
| **wallets_cap_violation_rows** | **0** |
| **users_with_both_null_and_scoped_wallet** | **0** |

---

## G. Hard prohibitions confirmation

checkout retry · second payment · ¥500 click · webhook replay · manual grant · repair runner · DB write · VERIFY-C · env/Stripe · Production DELETE — **all no in this gate**.

---

## H. Remaining blockers

| Blocker | Owner |
|---------|-------|
| **Standalone Human SQL close in this original gate** | **not completed in-gate** |
| **Gate status for historical record** | **kept as WAITING; superseded downstream** |

**Supersession policy:** do not rewrite this original gate as standalone GREEN; preserve historical WAITING verdict and link downstream closure.

---

## I. Recommended next gates

| Order | Gate | When |
|-------|------|------|
| 1 | **`BACKEND-COMMERCE-CONTRACT-C-FRESH-LANE-COMPOSITE-CLOSE-R`** | downstream closure evidence |
| 2 | **`RELEASE-READINESS-OPS-MONITOR-R9-R`** | post-close counts-only validation |
| 3 | **Fresh audit docs pack** | include this doc with supersession note |

---

## J. Supersession note（2026-05-25）

This gate's standalone Human SQL close was not completed inside the original gate window.
The included-consume path was later observed and validated through downstream evidence:

- **`BACKEND_COMMERCE_CONTRACT_C_FRESH_LANE_COMPOSITE_CLOSE_R_GREEN_NO_MUTATION`**
  (`M55-EVID-20260525-BACKEND-COMMERCE-CONTRACT-C-FRESH-LANE-COMPOSITE-CLOSE-R-001`)
- **`FRESH_ADDITIONAL_REPLY_500_PAYMENT_SMOKE_R_GREEN_NO_MUTATION`**
  (`M55-EVID-20260525-FRESH-ADDITIONAL-REPLY-500-PAYMENT-SMOKE-R-001`)
- **`FRESH_ADDITIONAL_REPLY_PURCHASED_TICKET_CONSUME_R_GREEN_CONTROLLED_CONSUME_EXECUTED_NO_MANUAL_MUTATION`**
  (`M55-EVID-20260525-FRESH-ADDITIONAL-REPLY-PURCHASED-TICKET-CONSUME-R-001`)
- **`RELEASE_READINESS_OPS_MONITOR_R9_R_GREEN_COUNTS_ONLY_NO_MUTATION`**
  (`M55-EVID-20260525-RELEASE-READINESS-OPS-MONITOR-R9-R-001`)

Downstream R9-R confirms S-5 global guards all 0 and ledger/artifact deltas consistent with full Fresh lane progression.
The SQL script used by this gate is now tracked on `origin/main` at commit `1cc1c21`.

No new SQL, raw identifiers, operator hash values, or invented counts are introduced in this supersession note.
