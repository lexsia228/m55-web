# Phase 5-6H-5Z-I-V-AP-S-R — Supabase aggregate inventory replay result recording gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AP-S-R** |
| **Title** | **Supabase aggregate inventory replay result** |
| **Classification** | **Category 2 read-only inventory result recording / docs-only / no-mutation** |
| **Verdict** | **`SUPABASE_AGGREGATE_INVENTORY_REPLAY_RESULT_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AP-S-R-SUPABASE-AGGREGATE-INVENTORY-REPLAY-RESULT-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production target** | **`m55-soul-core` / `public` schema**（Human-local SELECT — **recorded in AP-S-R only**） |
| **Human raw ID shared** | **no** |

---

## B. Prior gate reference

| Field | Value |
|-------|--------|
| **Prior phase (query prep)** | **5Z-I-V-AP-S** |
| **Prior verdict** | **`SUPABASE_AGGREGATE_INVENTORY_READONLY_QUERY_PREPARATION_GREEN_NO_MUTATION`** |
| **Prior evidence** | **`M55-EVID-20260519-5Z-I-V-AP-S-SUPABASE-AGGREGATE-INVENTORY-READONLY-QUERY-PREP-001`** |
| **Prior commit** | **`34e1d75`** |
| **AP-R verdict** | **`PRODUCTION_CLERK_NAMESPACE_CONTINUITY_REPLAY_COUNTS_BLOCKED_NO_MUTATION`** |
| **AP-R gap** | Supabase aggregates **mostly unclear** |
| **AP-S-R** | Supplies **complete counts-only** Supabase aggregate inventory |

---

## C. Inventory method

| Item | Recorded |
|------|----------|
| **Method** | Human **Supabase SQL Editor** aggregate replay（**AP-S §D.1** shape） |
| **Output scope** | **counts-only** |
| **Raw user_id / email / session** | **not recorded** |
| **Stripe checkout session / payment intent / event IDs** | **not recorded** |
| **Raw keys / secrets / fragments** | **not recorded** |
| **Agent query execution** | **no** — Human evidence recorded docs-only |

---

## D. Supabase aggregate counts table

| Metric | Count |
|--------|-------|
| **entitlements_total** | **10** |
| **entitlements_dtr_core_static_v1** | **10** |
| **entitlements_distinct_users** | **10** |
| **entitlement_rights_total** | **7** |
| **entitlement_rights_distinct_users** | **7** |
| **dtr_report_snapshots_total** | **6** |
| **dtr_report_snapshots_dtr_core_static_v1** | **6** |
| **dtr_report_snapshots_distinct_users** | **6** |
| **reply_ticket_wallets_total** | **10** |
| **reply_ticket_wallets_distinct_users** | **10** |
| **reply_wallet_ledgers_total** | **17** |
| **reply_wallet_ledgers_distinct_users** | **10** |
| **one_time_fulfillments_total** | **10** |
| **one_time_fulfillments_distinct_users** | **7** |
| **stripe_events_total** | **133** |
| **failed_fulfillments_total** | **7** |

**Aggregate inventory status（counts-only scope）:** **complete** — all AP-S metrics **numeric**（no `unclear` / `table_missing`）.

**Notable shape（interpretation only — no row data）:**

| Observation | Note |
|-------------|------|
| **entitlements 10 / rights 7** | Rights rows **<** entitlement rows — consistent with prior **O/R discrepancy** investigations |
| **OTF total 10 / distinct users 7** | Multiple fulfillment rows per some users possible |
| **ledgers 17 / wallets distinct 10** | Ledger activity **>** wallet row count |
| **failed_fulfillments 7** | Matches **AP-R** partial replay |

---

## E. Clerk continuity caveat

| Field | Value |
|-------|--------|
| **Clerk app safe label** | **`M55-Official`** |
| **Current instance type** | **Development** |
| **Total users count** | **5** |
| **Active users count** | **5** |
| **Production instance exists** | **no** |
| **Production instance `user_id` continuity** | **`not_confirmed`** |
| **Clerk confirms Production preserves Development user IDs** | **no** |
| **Reason** | Clerk **cannot confirm** whether a future Production instance preserves current Development **`user_id`** values |

**Safety recording:** Any Human form field implying continuity **known: yes** is **overridden** here — safe SSOT position is **`not_confirmed` / no`**.

**Therefore:** **Production Clerk instance creation / namespace switch execution remains blocked**（independent of Supabase counts GREEN）.

---

## F. Mapping risk interpretation

| Risk | Assessment |
|------|------------|
| **Paid artifacts keyed by `user_id`** | **yes** — entitlements, rights, snapshots, wallets, ledgers, OTF |
| **`user_id` change on Production instance** | **high risk** — orphan / deny paid access |
| **Counts prove artifacts exist** | **yes** — non-zero paid/right/snapshot/wallet/fulfillment population **must be preserved** |
| **Migration planning** | **required** if Production instance issues **new** Clerk **`user_id`** namespace |
| **Supabase counts alone** | **do not** prove Clerk namespace continuity |

---

## G. Decision

| Field | Value |
|-------|--------|
| **AP-S-R verdict（Supabase counts scope）** | **`SUPABASE_AGGREGATE_INVENTORY_REPLAY_RESULT_GREEN_NO_MUTATION`** |
| **Supabase aggregate inventory** | **GREEN** — counts-only scope **complete** |
| **Production Clerk namespace continuity** | **not confirmed** — **not GREEN** |
| **Production instance execution** | **blocked** |
| **AL authorized** | **no** |
| **AQ** | **planning only** — **`5Z-I-V-AQ`** may proceed as **feasibility / continuity planning**；**must not** authorize mutation or Clerk Production creation |
| **Production auth compliance** | **RED** |

### Resolved vs remaining blockers

| Item | Status |
|------|--------|
| **Supabase aggregate counts** | **resolved** — **§D** complete |
| **Clerk Development user counts** | **resolved** — **5 / 5**（carried from AP-R） |
| **Production instance exists** | **unresolved** — **no** |
| **`user_id` continuity Development → Production** | **unresolved** — **`not_confirmed`** |
| **AL correction execution** | **blocked** |

---

## H. No-mutation statement

**Explicitly confirmed — none performed in AP-S-R:**

- No raw key / secret / suffix / fragment recorded
- No full **user_id** / email / session recorded
- No full checkout session / payment intent / Stripe event ID recorded
- No Clerk Production instance creation
- No Clerk setting change
- No key generation or replacement
- No Vercel env change
- No redeploy / deploy / promote
- No Production DB write
- No auth mutation
- No user creation or migration
- No Stripe / webhook / checkout / payment
- No runner execution that writes
- No code change
- No manual entitlement / snapshot / wallet mutation

---

## I. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Type-label mismatch** | **separate** — unchanged |
| **`npm run audit` Background NoTouch** | **separate** — unchanged |
| **Full normal dev flow** | **NOT released** |
| **AP-S-R authorizes AL** | **no** |

### Current access continuity（Human attestation — unchanged）

| Check | Result |
|-------|--------|
| **Canonical paid user DTR owned access remains GREEN** | **yes** |
| **Unpaid non-owned path remains GREEN** | **yes** |
| **Paid owner verify after future correction without payment** | **yes** |
| **Unpaid no-payment verify after future correction** | **yes** |

---

## J. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended）** | **`5Z-I-V-AQ`** — Production Clerk production-instance **feasibility / `user_id` continuity planning**（**no** instance creation；**no** mutation） |
| **Not authorized** | **AL** execution；Clerk Production creation；Vercel **`pk_live_`** swap until explicit Category 2 GO chain |

**Purpose of AQ:** Plan how to **verify** whether creating a Production instance under **`M55-Official`** preserves or changes Development **`user_id`** values — **without creating it in AQ**.

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AP-S-R-SUPABASE-AGGREGATE-INVENTORY-REPLAY-RESULT-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AP-S-SUPABASE-AGGREGATE-INVENTORY-READONLY-QUERY-PREP-001`** | query prep |
| **`M55-EVID-20260519-5Z-I-V-AP-R-PRODUCTION-CLERK-NAMESPACE-CONTINUITY-REPLAY-COUNTS-RESULT-001`** | prior Clerk replay |

---

## 未実行事項（AP-S-R）

- No mutation
- **AQ** not executed
- **AL** not authorized
- Production Clerk namespace continuity **not confirmed**
