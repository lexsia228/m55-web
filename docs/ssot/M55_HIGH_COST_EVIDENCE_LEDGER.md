# M55 High-Cost Evidence Ledger

Status: **ACTIVE** (control-tower reference)
Last updated: **2026-08-26** (Pair Wave-A source / public-boundary closure evidence)
Protocol: `docs/ssot/M55_EVIDENCE_REGISTRY_PROTOCOL_2026-05-16.md`
Operations map: `docs/ssot/M55_CONTROL_TOWER_OPERATIONS_MAP.md`

## Permanent rerun rule

**HIGH-COST CLOSED GREEN TESTS MUST NOT BE RERUN UNLESS AN INVALIDATING DEPENDENCY CHANGED.**

`GATE_LOCAL_UNPROVEN != HISTORICALLY_UNPROVEN`

Before requesting any high-cost test, search: current SSOT · Git history · prior gate reports · evidence artifacts · Human-approved proof · Preview/Production proof records.

**UNKNOWN** in this ledger means inventory/search gap only. It does **not** authorize rerunning the test.

## Phase-B payment-evidence preservation (2026-08-22)

Current Pair Wave 0 Phase-B local diff does **not** change:

- commercial pricing / product contract
- checkout routes
- Stripe fulfillment / webhook handlers
- wallet grant / consume logic
- ConsultRoom business logic
- `/api/room/core` send logic
- DB consume RPC / migrations

The dev-fixture default defect was **QA presentation only** and is now covered by `lib/m55/paidResult/paidSkuCapabilityInvariant.test.ts`.

**Therefore:** prior real-payment / fulfillment / consult evidence remains **valid**.
**Policy:** `REAL_PAYMENT_RERUN_PROHIBITED` for Phase-B commit path unless a future diff touches the paths above.

---

## Ledger entries

| GATE / CAPABILITY | STATUS | EVIDENCE LOCATION | COMMIT / ENV (if known) | HUMAN APPROVAL | INVALIDATING DEPENDENCIES | RERUN POLICY |
|---|---|---|---|---|---|---|
| Historical Stripe payments (inventory) | **CLOSED_WITH_LIMITATION** | `docs/ssot/M55_PHASE5_6H_5Q_A_HISTORICAL_STRIPE_PAYMENT_EVIDENCE_INVENTORY_2026-05-15.md` | pre–Product-Truth era · ¥1,000 JPY observation | Human screenshot (redacted) | Product-Truth price/SKU contract change · Stripe account migration | **No rerun** — historical inventory only |
| Evidence registry protocol | **CLOSED_GREEN** | `docs/ssot/M55_EVIDENCE_REGISTRY_PROTOCOL_2026-05-16.md` · `M55_PHASE5_6H_5Z_A0_EVIDENCE_REGISTRY_PROTOCOL_CHECKPOINT_2026-05-16.md` | docs @ 2026-05-16 | Protocol adoption | Protocol schema break | **No rerun** |
| Auth namespace / fresh checkout canary | **CLOSED_GREEN** | `docs/ssot/M55_AUTH_NAMESPACE_FRESH_CHECKOUT_CANARY_FREEZE_R_2026-05-23.md` · `M55-EVID-20260523-AUTH-NAMESPACE-FRESH-CHECKOUT-CANARY-FREEZE-R-001` | Production · `M55-core-Development` · `launch-cohort-primary` | Human namespace observation | Clerk app split change · checkout entry rewrite | **No rerun** unless checkout/auth dependency changes |
| DTR ¥1,000 fresh checkout + fulfillment | **CLOSED_GREEN** | `docs/ssot/M55_BACKEND_COMMERCE_CONTRACT_C_FRESH_LANE_COMPOSITE_CLOSE_R_2026-05-25.md` · `M55_SYSTEM_SSOT.md` (2026-05-25 composite) · `M55-EVID-20260525-BACKEND-COMMERCE-CONTRACT-C-FRESH-LANE-COMPOSITE-CLOSE-R-001` | Production · `launch-cohort-primary` · one live payment | `FRESH-CHECKOUT-D-EXEC go` | checkout · webhook · fulfillment · wallet grant path change | **No rerun** — composite close |
| Included reply consume (first send) | **CLOSED_GREEN** | `docs/ssot/M55_FRESH_INCLUDED_REPLY_CONSUME_SQL_R_2026-05-24.md` · composite close §B step 5 | Production · `/api/room/core/send` 200 | Human send attestation | send RPC · wallet consume logic change | **No rerun** |
| ¥500 additional-reply purchase smoke | **CLOSED_GREEN** | `docs/ssot/M55_FRESH_ADDITIONAL_REPLY_500_PAYMENT_SMOKE_R_2026-05-25.md` · `M55-EVID-20260525-FRESH-ADDITIONAL-REPLY-500-PAYMENT-SMOKE-R-001` | Production · legacy ¥500 lane | Human one payment | Stripe product lane retirement without replacement proof | **No rerun** |
| Purchased-ticket consume | **CLOSED_GREEN** | `docs/ssot/M55_FRESH_ADDITIONAL_REPLY_PURCHASED_TICKET_CONSUME_R_2026-05-25.md` · `M55-EVID-20260525-FRESH-ADDITIONAL-REPLY-PURCHASED-TICKET-CONSUME-R-001` | Production · post-¥500 wallet | Human one send | consume RPC / send route change | **No rerun** |
| Fresh lane composite (pay + webhook + unlock + consumes) | **CLOSED_GREEN** | `docs/ssot/M55_BACKEND_COMMERCE_CONTRACT_C_FRESH_LANE_COMPOSITE_CLOSE_R_2026-05-25.md` | Production · Contract-C fresh lane | Composite close gate | Any row above dependency change | **No rerun** |
| ¥600 Light→Full upgrade recovery | **CLOSED_GREEN** | `docs/ssot/M55_CURRENT_STATE.md` § LIVE LIGHT→FULL UPGRADE RECOVERY · RPC v2 migration `20260813000000_*` | Production repair runner | `M55_CONFIRM_ONE_SHOT_LIGHT_TO_FULL_UPGRADE_REPAIR_20260813` | upgrade RPC / fulfillment rewrite | **No rerun** |
| Preview / Production environment separation | **CLOSED_GREEN** | `lib/m55/previewRemoteApply/remoteConnectionAuthority.ts` · `docs/planning/m55_preview_post_remediation_deletion_smoke_human_runbook.md` · preview deletion smoke scripts | Preview: `m55-preview` / `m55-soul-preview` · Production forbidden: `m55-soul-core` | Human separation evidence + authority pins | Supabase project rebinding · Clerk prod/dev swap | **No rerun** unless env binding changes |
| Preview post-remediation deletion smoke | **CLOSED_WITH_LIMITATION** | `docs/planning/m55_preview_post_remediation_deletion_smoke_human_runbook.md` · `scripts/preview/m55_preview_post_remediation_deletion_smoke.ts` | Preview-only human runbook | Separate Human GO per runbook | deletion RPC / auth model change | **No rerun** without new Human GO |
| Production public smoke (logged-out) | **CLOSED_GREEN** | `docs/ssot/M55_PHASE5_6H_5I_PRODUCTION_POST_DEPLOY_PUBLIC_SMOKE_EVIDENCE_CHECKPOINT_2026-05-15.md` | Production deploy checkpoints | Human/ops observation | public route architecture break | **No rerun** for Phase-B |
| Checkout creation (Stripe page reach) | **CLOSED_WITH_LIMITATION** | `docs/ssot/M55_PHASE5_6H_5U_L_A_CHECKOUT_CREATION_CONTROLLED_RETRY_GREEN_EVIDENCE_2026-05-15.md` | Production · checkout.stripe.com reach | Human attestation | Stripe env / price binding change | **No rerun** unless checkout binding changes |
| SKU capability regression (automated) | **CLOSED_GREEN** | `lib/m55/paidResult/paidSkuCapabilityInvariant.test.ts` · gate report 2026-08-22 | local @ `3e65076…` feature HEAD | Human authorization (regression patch gate) | commercial contract · fulfillment math · fixture default change | **No rerun** unless those files change again |
| Preview Light+Full capability runtime smoke (pair funnel) | **NOT_EXECUTED** (blocked) · **SUPERSEDED** by Human authority | Prior gate attempt · Human 2026-08-22: real payment history already complete | Preview @ `3e65076…` binding proven · no purchase executed | Human: do not rerun payment smoke | N/A — explicitly prohibited | **PROHIBITED** — use historical + automated invariants |
| Product Truth Light=1 / Full=5 dedicated Preview purchase matrix | **UNKNOWN** (no single named closure doc) | Partial: composite close (legacy ¥1k static product era) · machine contract @ HEAD · Human attestation of 16 historical test payments (conversation authority, not repo-enumerated) | Mixed legacy + current price points | Human extensive payment testing (out-of-band) | Explicit Product-Truth checkout/fulfillment code change | **No rerun** for Phase-B — Human authority + SKU invariants suffice until dependency changes |
| Idempotency replay (consult send) | **CLOSED_WITH_LIMITATION** | `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_FRESH_VALIDATION_PATH_PLANNING_2026-05-23.md` · composite lane | Production fresh lane | Planned/observed in Contract-C chain | idempotency RPC change | **No rerun** for Phase-B |
| Webhook mutation / DB migration runtime smokes | **CLOSED_WITH_LIMITATION** | Various Phase-5 docs · RPC v2 migration evidence in CURRENT_STATE | Production migrations applied | Human GO per migration | new migration touching same RPC | **No rerun** unless new migration invalidates |
| Pair Wave-A source / public-boundary closure | **CLOSED_GREEN** | `docs/ssot/M55_EXECUTION_STATE.json` · `pairWaveAClosureTransition` · product commit `9c7245b1ee0c98a3418520e3160885a80cc1c62a` · client-boundary commit `81a341210a9cbb70776626b5b55ba6a7c6f1dbb1` · reviewed diff SHA-256 `64f9d5b68446da7718a0b5ada5d0947e86ec8bbb45983116bff48876505f931c` · Codex GREEN P0/P1/P2=0 · 354 focused tests · Preview `dpl_GpmUfdbJReqD74RpRcCQ1GQJqYUC` READY @ `81a3412` · remote CI completed/no failures | feature `feat/m55-pair-relation-stage-v1` · PR #165 OPEN | Independent Codex source review GREEN | `CompatibilityGuestExperience.tsx` · `pairReadingGuestClientSafe.ts` · `pairReadingGuestResult.ts` · `pairReadingGuestContract.ts` · `currentContextContract.v2.ts` · `topFreeEntryPublicCopy.ts` · `pairFreeInsightSpecV2.ts` · `pairReadingRenderer.ts` | **NO RERUN** absent actual invalidation — dependency-scoped only; actual-browser/Human commercial acceptance is separate future evidence and **NOT** closed here |

---

## Human-attested payment volume (non-repo-enumerated)

Human authority (2026-08-22): **16 successful test payment transactions** across M55 commercial development history, including current/legacy paid price points.

This ledger **does not enumerate** individual PaymentIntent rows (redaction policy). Durable repo evidence for the **fresh Production lane** is the Contract-C composite close and child `M55-EVID-*` records above.

---

## Related active closures preserved by Phase-B

| Area | Status | Notes |
|---|---|---|
| Luminous TOC / Phase-B visual (Human) | **CLOSED_GREEN** | Do not reopen in precommit |
| SKU regression prevention patch | **CLOSED_GREEN** | `SKU_CAPABILITY_REGRESSION_PREVENTION_GREEN` |
| Real payment rerun | **PROHIBITED** | `REAL_PAYMENT_RERUN_PROHIBITED` |
