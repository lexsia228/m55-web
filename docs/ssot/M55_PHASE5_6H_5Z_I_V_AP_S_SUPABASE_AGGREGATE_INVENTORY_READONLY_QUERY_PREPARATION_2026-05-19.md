# Phase 5-6H-5Z-I-V-AP-S — Supabase aggregate inventory replay / read-only query preparation gate（2026-05-19 SSOT）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **5Z-I-V-AP-S** |
| **Title** | **Supabase aggregate inventory replay / read-only query preparation** |
| **Classification** | **Category 2 read-only query preparation / docs-only / no-mutation** |
| **Verdict** | **`SUPABASE_AGGREGATE_INVENTORY_READONLY_QUERY_PREPARATION_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260519-5Z-I-V-AP-S-SUPABASE-AGGREGATE-INVENTORY-READONLY-QUERY-PREP-001`** |
| **Date** | **2026-05-19** |
| **Branch** | **`work/home-cluster`** |
| **Production target** | **`m55-soul-core` / `public` schema**（Human-local SELECT only — **not executed in AP-S**） |

---

## B. Prior gate reference

| Field | Value |
|-------|--------|
| **Prior phase** | **5Z-I-V-AP-R** |
| **Prior verdict** | **`PRODUCTION_CLERK_NAMESPACE_CONTINUITY_REPLAY_COUNTS_BLOCKED_NO_MUTATION`** |
| **Prior evidence** | **`M55-EVID-20260519-5Z-I-V-AP-R-PRODUCTION-CLERK-NAMESPACE-CONTINUITY-REPLAY-COUNTS-RESULT-001`** |
| **Prior commit** | **`3626236`** |
| **Clerk counts** | **5** total / **5** active（**`M55-Official` Development**） |
| **Supabase aggregates** | **mostly unclear** — **AP-S prepares SQL** |
| **Known partial** | **failed_fulfillments total = 7**（AP-R Human replay） |

---

## C. Query safety rules

| Rule | Requirement |
|------|-------------|
| **Statements** | **`SELECT` count only** — no DML/DDL |
| **Output** | **Numeric counts only** — paste **`metric` / `value`** rows or template below |
| **Forbidden output** | Raw rows；full **`user_id`**；email；session；checkout_session_id；payment_intent；customer_id；event_id |
| **Writes** | **Forbidden** — INSERT/UPDATE/DELETE/UPSERT/ALTER/CREATE/DROP/RPC writes |
| **Errors** | If error text exposes sensitive values → **do not paste**；record **`query_error_safe_summary`** only |
| **Human paste format** | **`metric: <name> value: <number>`** or **`unclear` / `table_missing` / `column_missing`** |
| **AP-S execution** | **No query run** in this gate — preparation only |

---

## D. Prepared read-only aggregate SQL

**Run in Supabase SQL Editor**（or approved read-only client）against **Production** with explicit Human GO.

**Repo alignment:** tables/columns used by `dtrOwnershipGate.ts`, `dtrDraftDb.ts`, `dtrCoreCheckoutFulfillment.ts`, `replyTicketCheckoutValidate.ts`, `scripts/sql/production/m55_phase5_4_production_ghost_data_readonly_check_v1.sql`.

### D.1 Primary bundle（single result set — counts only）

```sql
-- M55 AP-S Supabase aggregate inventory
-- READ-ONLY / COUNTS ONLY
-- Do not output raw user_id, email, checkout_session_id, payment_intent, customer_id, event_id, or row data.

SELECT 'entitlements_total' AS metric, count(*)::text AS value FROM public.entitlements
UNION ALL
SELECT 'entitlements_dtr_core_static_v1', count(*)::text FROM public.entitlements WHERE product_id = 'DTR_CORE_STATIC_V1'
UNION ALL
SELECT 'entitlements_distinct_users', count(DISTINCT user_id)::text FROM public.entitlements
UNION ALL
SELECT 'entitlement_rights_total', count(*)::text FROM public.entitlement_rights
UNION ALL
SELECT 'entitlement_rights_distinct_users', count(DISTINCT user_id)::text FROM public.entitlement_rights
UNION ALL
SELECT 'dtr_report_snapshots_total', count(*)::text FROM public.dtr_report_snapshots
UNION ALL
SELECT 'dtr_report_snapshots_dtr_core_static_v1', count(*)::text FROM public.dtr_report_snapshots WHERE product_id = 'DTR_CORE_STATIC_V1'
UNION ALL
SELECT 'dtr_report_snapshots_distinct_users', count(DISTINCT user_id)::text FROM public.dtr_report_snapshots
UNION ALL
SELECT 'reply_ticket_wallets_total', count(*)::text FROM public.reply_ticket_wallets
UNION ALL
SELECT 'reply_ticket_wallets_distinct_users', count(DISTINCT user_id)::text FROM public.reply_ticket_wallets
UNION ALL
SELECT 'reply_wallet_ledgers_total', count(*)::text FROM public.reply_wallet_ledgers
UNION ALL
SELECT 'reply_wallet_ledgers_distinct_users', count(DISTINCT user_id)::text FROM public.reply_wallet_ledgers
UNION ALL
SELECT 'one_time_fulfillments_total', count(*)::text FROM public.one_time_fulfillments
UNION ALL
SELECT 'one_time_fulfillments_distinct_users', count(DISTINCT user_id)::text FROM public.one_time_fulfillments
UNION ALL
SELECT 'stripe_events_total', count(*)::text FROM public.stripe_events
UNION ALL
SELECT 'failed_fulfillments_total', count(*)::text FROM public.failed_fulfillments;
```

### D.2 Optional supplement（run only if D.1 succeeds — still counts only）

```sql
-- Optional: active DTR entitlements (status column used in dtrOwnershipGate)
SELECT 'entitlements_dtr_core_active', count(*)::text AS value
FROM public.entitlements
WHERE product_id = 'DTR_CORE_STATIC_V1' AND status = 'active';
```

If **`status`** column missing → record **`column_missing`** for that metric only.

### D.3 Schema failure handling

| Failure | Human records |
|---------|-----------------|
| **Table missing** | **`table_missing:<name>`** |
| **Column missing** | **`column_missing:<table>.<column>`** |
| **Permission denied** | **`permission_denied`** |
| **Other error** | **`query_error_safe_summary:<short text>`** — **no raw values** |

---

## E. Human paste template（for **`5Z-I-V-AP-S-R`** or next replay gate）

```
entitlements_total: <n|unclear|table_missing>
entitlements_dtr_core_static_v1: <n|unclear>
entitlements_distinct_users: <n|unclear>
entitlements_dtr_core_active: <n|unclear|column_missing|not_run>
entitlement_rights_total: <n|unclear>
entitlement_rights_distinct_users: <n|unclear>
dtr_report_snapshots_total: <n|unclear>
dtr_report_snapshots_dtr_core_static_v1: <n|unclear>
dtr_report_snapshots_distinct_users: <n|unclear>
reply_ticket_wallets_total: <n|unclear>
reply_ticket_wallets_distinct_users: <n|unclear>
reply_wallet_ledgers_total: <n|unclear>
reply_wallet_ledgers_distinct_users: <n|unclear>
one_time_fulfillments_total: <n|unclear>
one_time_fulfillments_distinct_users: <n|unclear>
stripe_events_total: <n|unclear>
failed_fulfillments_total: <n|unclear>
```

**Do not paste SQL result grids containing `user_id` columns.**

---

## F. Decision（AP-S scope）

| Field | Value |
|-------|--------|
| **AP-S verdict** | **`SUPABASE_AGGREGATE_INVENTORY_READONLY_QUERY_PREPARATION_GREEN_NO_MUTATION`** |
| **Aggregate counts obtained** | **no** — SQL **prepared only** |
| **AP inventory complete** | **no** — awaits Human execution + **AP-S-R** recording |
| **AL authorized** | **no** |
| **AQ authorized** | **no** — default until aggregates recorded |

---

## G. No-mutation statement

**Explicitly confirmed — none performed in AP-S:**

- No DB write / no query execution in agent session
- No raw user_id / email / session / Stripe IDs recorded
- No Clerk / Vercel / key / redeploy / code / auth / migration / payment / runner writes

---

## H. Tracks that remain separate

| Track | Status |
|-------|--------|
| **DTR owned unlock** | **GREEN / closed** |
| **AC-P6 unpaid non-owned** | **GREEN** |
| **Production auth compliance** | **RED** |
| **Type-label / audit / full dev flow** | **separate / unchanged** |
| **AL** | **not authorized** |

---

## I. Next phase

| Priority | Gate |
|----------|------|
| **1（recommended）** | **`5Z-I-V-AP-S-R`** — Supabase aggregate inventory **replay result recording**（Human runs **§D.1** SQL；pastes **§E** template only） |
| **2** | Re-evaluate namespace inventory completeness → **`5Z-I-V-AQ`** only after AP-S-R GREEN or governance waiver |
| **Alternative** | Governance waiver gate — **default: do not waive** |

---

## Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260519-5Z-I-V-AP-S-SUPABASE-AGGREGATE-INVENTORY-READONLY-QUERY-PREP-001`** | **本条** |
| **`M55-EVID-20260519-5Z-I-V-AP-R-PRODUCTION-CLERK-NAMESPACE-CONTINUITY-REPLAY-COUNTS-RESULT-001`** | prior replay |

---

## 未実行事項（AP-S）

- SQL **not executed** by agent
- **AP-S-R** not run
- no mutation
