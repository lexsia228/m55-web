# M55 Pair P5 Production Payment E2E Closeout

Status: **CLOSED_GREEN / PRODUCTION / NO_REPLAY**
Scope: Pair Premium (`compatibility_report_full_v1`) live-payment E2E from Clerk email prefill through owned-report revisit
Date frozen: **2026-10-07**
Human authorization: `PAIR P5 CONTROLLED PAYMENT E2E SSOT FREEZE GO`

---

## Authority precedence

1. This closeout is **durable E2E evidence authority** for the Production payment→delivery chain below.
2. `docs/ssot/M55_PAIR_FUNNEL_CONTRACT.md` — Pair commercial funnel contract (updated to reference this closeout).
3. `docs/ssot/M55_HIGH_COST_EVIDENCE_LEDGER.md` — ledger row for Pair real-payment E2E (updated to **CLOSED_GREEN / PRODUCTION / NO_REPLAY**).
4. `lib/m55/contracts/m55CommercialFunnelContract.ts` — machine product registry (`pairPremium.status = NOT_LIVE`) is **not edited by this gate**; that value is **stale / reconciliation-required** relative to fresh Production runtime proof recorded here.
5. `docs/ssot/M55_EXECUTION_STATE.json` — **not edited** by this gate. Its Pair real-payment E2E substate (equivalent to `PAUSED_BEFORE_PAYMENT`) remains **stale / reconciliation-required** relative to this closeout. This docs-only freeze **does not** change the sole executable CURRENT/NEXT gate. **Execution-state reconciliation** is a separate bounded control-plane task. This closeout does **not** outrank execution state for unrelated executable progression.

Evidence registry protocol: `docs/ssot/M55_EVIDENCE_REGISTRY_PROTOCOL_2026-05-16.md` — full external IDs are **not** stored below; use `evidence_id` + `redacted_external_ref` only.

---

## Production identity (redacted)

| Field | Value |
|---|---|
| Pair P5 email-consistency merge/main SHA | `2f3c5a7c5a5b732d527ff498d48951a5ddab970d` |
| Production deployment | `dpl_****t5WE` — `M55-EVID-20261007-PAIR-P5-VERCEL-DEPLOYMENT-001` |
| Vercel target / state | `production` / `READY` |
| Production alias | `m-55.jp` bound to that deployment |

### Stripe live authority (redacted)

| Field | Value |
|---|---|
| Account name | `M55WEB` |
| Account context | `acct_****DCT5` |
| Product | `prod_****ymdxL` |
| Price | `price_****W2NF` |
| Product key | `compatibility_report_full_v1` |
| Public product name | `二人の相性レポート` |
| One-time price | `JPY 1,480` |
| Webhook endpoint | `we_****1Egz` |
| Webhook URL | `https://m55-webv2.vercel.app/api/stripe/webhook` |
| Enabled event | `checkout.session.completed` |

---

## Evidence registry (PAIR-P5)

Compact records per `M55_EVIDENCE_REGISTRY_PROTOCOL_2026-05-16.md`. Full external IDs remain outside SSOT.

### M55-EVID-20261007-PAIR-P5-VERCEL-DEPLOYMENT-001

| Field | Value |
|---|---|
| evidence_id | `M55-EVID-20261007-PAIR-P5-VERCEL-DEPLOYMENT-001` |
| phase | `PAIR-P5` |
| source_system | Vercel Deployments |
| evidence_kind | vercel_log |
| observed_at_jst | `2026-10-07` JST (Control-Tower Production deployment verification; exact clock time not frozen) |
| status_summary | `production` / `READY` · alias `m-55.jp` |
| redacted_external_ref | `dpl_****t5WE` |
| linked_ssot_doc | `docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md` |
| allowed_next_action | read-only · cite by evidence_id |
| prohibited_next_action | replay deploy · paste full deployment ID |
| notes_redacted | Pair P5 email-consistency Production deployment pin |

### M55-EVID-20261007-PAIR-P5-STRIPE-PAYMENT-001

| Field | Value |
|---|---|
| evidence_id | `M55-EVID-20261007-PAIR-P5-STRIPE-PAYMENT-001` |
| phase | `PAIR-P5` |
| source_system | Stripe Dashboard |
| evidence_kind | checkout_session |
| observed_at_jst | `2026-10-07` JST (Human controlled live payment; exact clock time not frozen) |
| amount / currency | `1480` / `jpy` |
| status_summary | `complete` / `paid` · line item quantity `1` |
| redacted_external_ref | `cs_live_****1uHi` · `pi_****iZIF` |
| linked_ssot_doc | `docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md` |
| allowed_next_action | read-only · cite by evidence_id |
| prohibited_next_action | replay live payment · paste full Checkout Session / PaymentIntent ID |
| notes_redacted | Clerk email prefill proven present in Checkout Session; customer email not recorded |

### M55-EVID-20261007-PAIR-P5-STRIPE-EVENT-001

| Field | Value |
|---|---|
| evidence_id | `M55-EVID-20261007-PAIR-P5-STRIPE-EVENT-001` |
| phase | `PAIR-P5` |
| source_system | Stripe Workbench Events |
| evidence_kind | stripe_event |
| observed_at_jst | `2026-10-07` JST (Control-Tower Stripe event observation; exact provider event clock time not frozen) |
| status_summary | `checkout.session.completed` observed; Production DB receipt/fulfillment corroborated separately |
| redacted_external_ref | `evt_****Zvbj2` |
| linked_ssot_doc | `docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md` |
| allowed_next_action | read-only · cite by evidence_id |
| prohibited_next_action | replay webhook · paste full event ID |
| notes_redacted | Production webhook endpoint `we_****1Egz` · URL `https://m55-webv2.vercel.app/api/stripe/webhook` |

### M55-EVID-20261007-PAIR-P5-SUPABASE-FULFILLMENT-001

| Field | Value |
|---|---|
| evidence_id | `M55-EVID-20261007-PAIR-P5-SUPABASE-FULFILLMENT-001` |
| phase | `PAIR-P5` |
| source_system | Supabase Production DB |
| evidence_kind | db_row_presence |
| observed_at_utc | `2026-10-06T17:37:23.898542Z` (`fulfilled_at` / owned-report `created_at`) |
| status_summary | purchase context `fulfilled` · owned report row present |
| redacted_external_ref | purchase context `8171…3b89` · owned report `91b1…95a3` |
| linked_ssot_doc | `docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md` |
| allowed_next_action | read-only · cite by evidence_id |
| prohibited_next_action | paste full UUID · mutate fulfillment rows for QA replay |
| notes_redacted | owned product key `compatibility_report_full_v1` · snapshot `paid_compatibility_report_v1` · PaymentIntent matches `pi_****iZIF` |

### M55-EVID-20261007-PAIR-P5-M55-UI-001

| Field | Value |
|---|---|
| evidence_id | `M55-EVID-20261007-PAIR-P5-M55-UI-001` |
| phase | `PAIR-P5` |
| source_system | M55 UI |
| evidence_kind | ui_observation |
| observed_at_jst | `2026-10-07` (Human Production runtime proof) |
| status_summary | signed-in revisit GREEN |
| redacted_external_ref | _(route-level only)_ |
| linked_ssot_doc | `docs/ssot/M55_PAIR_P5_PRODUCTION_PAYMENT_E2E_CLOSEOUT_2026-10-07.md` |
| allowed_next_action | read-only · non-payment browser regression |
| prohibited_next_action | paste partner nickname · paste full report URL/UUID · replay live payment |
| notes_redacted | `/synastry/report/[reportId]` six-chapter paid report opened successfully; `/my` purchased Pair card rendered for correct owner/pair; selected relation label rendered; CTA `レポートを開く` observed |

---

## Closed-Green chain

Proven end-to-end at capability level (no full production identifiers in SSOT):

```
Clerk email prefill
  → Live Checkout ¥1,480
  → complete / paid
  → checkout.session.completed webhook
  → compatibility fulfillment
  → purchase_context fulfilled
  → compatibility_owned_reports row
  → /my purchased report card
  → /synastry/report/[reportId]
  → six-chapter paid report revisit
```

**Scope boundary:** this chain proves payment → webhook → fulfillment → owned report → My Page → report revisit. It is **not** an exhaustive semantic/content-quality audit of every Pair Paid value bullet.

---

## NO-REPLAY policy

- This exact high-cost real-payment E2E proof is **CLOSED_GREEN / PRODUCTION / NO_REPLAY**.
- **Do not** run another real-money payment merely to re-prove this same path unless an invalidating dependency listed below changed.
- Ordinary UI/copy changes that do **not** touch payment/delivery semantics do **not** invalidate this proof; use non-payment automated/browser regression instead.
- A legitimate **new** commercial purchase for a **different partner / genuinely new Pair** is **not** prohibited by NO-REPLAY. That is normal product behavior, not a QA replay.
- **Never** create a second charge for the same already-paid context just to test idempotency or re-run this same E2E proof.

---

## Invalidating dependencies

Re-proof requires explicit invalidation of at least one of:

- Pair checkout route / Checkout Session construction
- product / price / product-key binding
- Stripe live account or webhook endpoint / event binding
- shared webhook dispatch branch for Pair
- compatibility validation / fulfillment code
- `m55_fulfill_compatibility_report_v1`
- compatibility purchase-context / owned-report DB schema or ownership contract
- owned-report retrieval / auth ownership
- My Page Pair-library API (if the claim being revalidated includes library delivery / revisit)
- Production environment binding that changes Stripe / Supabase / Clerk identity

---

## Human-approved multi-Pair repurchase policy (2026-10-07)

**Policy frozen here; not implemented in this gate.**

| Context | Policy |
|---|---|
| Same already-owned Pair / same paid purchase context | Do **not** present a primary `¥1,480で購入手続きへ` CTA that can look like the user needs to buy again. Prefer purchased/processing state such as `レポートを開く`, `マイページで見る`, or bounded fulfillment status. |
| Different partner / genuinely new Pair | A fresh purchase CTA **may** be shown because the user can buy another Pair reading. |
| Stable Pair identity | **Not frozen here.** Do **not** use nickname/display label alone as identity. The identity/matching rule must be mapped in a separate bounded remediation before implementation. |

---

## Residual UX defects (separate / non-invalidating)

These are **open UX defects** and do **not** invalidate the completed money→delivery E2E proof:

1. **`/synastry/purchase/success`** — static `確認中` surface; does not automatically transition after DB fulfillment. Paid report delivery itself is proven GREEN.
2. **`/synastry/purchase/confirm`** — can show the purchase CTA again after successful purchase because it does not currently resolve owned/fulfilled Pair purchase state.

---

## Explicit prohibitions

- No additional real-money payment for this same E2E proof path without invalidation.
- No customer email, webhook signing secret, Supabase service-role key, or DB credentials in SSOT.
- No raw birth dates, partner nicknames, private answer IDs, or full external/provider UUIDs in this closeout.
- No machine-registry or execution-state edits from this gate.

---

## Next bounded remediation

**Name:** `PAIR P5 POST-PURCHASE OWNED-STATE UX READ-ONLY MAPPING`

**Job (do not implement in this gate):**

- map purchase-confirm owned / fulfilled / processing state
- map success-page bounded transition / polling against DB truth
- define stable same-Pair vs different-Pair identity
- ensure different partner can legitimately buy
- suppress accidental duplicate-purchase CTA for already-owned Pair
- no real payment required for this remediation unless a payment-path invalidator is introduced

**Separate control-plane follow-up (not this gate):** reconcile `M55_EXECUTION_STATE.json` Pair real-payment E2E substate to this closeout.
