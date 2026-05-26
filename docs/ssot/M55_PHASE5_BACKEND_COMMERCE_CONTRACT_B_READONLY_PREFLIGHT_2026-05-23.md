# Phase BACKEND-COMMERCE-CONTRACT-B — Production read-only preflight planning（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-B** |
| **Title** | **Backend commerce contract — Production read-only preflight (RPC / schema / env names / cap SSOT)** |
| **Classification** | **Category 1 / read-only repo + SQL draft / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_B_READONLY_PREFLIGHT_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B-READONLY-PREFLIGHT-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **`main`** @ **`6ce7002`** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_A_1000_DTR_AND_500_REPLY_TICKET_PLANNING_GREEN_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-A-1000-DTR-500-REPLY-PLANNING-001`** |
| **VERIFY-C** | **HOLD** |
| **R8-R meta commit** | **not created** |

**Repo-side preflight GREEN.** **Production DB confirmation:** **recorded** in **`BACKEND-COMMERCE-CONTRACT-B-HUMAN-R`** — **S-1〜S-4 PASS** · **S-5 STOP** · Contract-C **BLOCKED**.

**Human-R SSOT:** `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B_HUMAN_R_PRODUCTION_PREFLIGHT_RESULT_2026-05-23.md`
**Human-R verdict:** **`BACKEND_COMMERCE_CONTRACT_B_HUMAN_R_BLOCKED_S5_ACTIVE_NULL_SCOPE_WALLETS_NO_MUTATION`**
**Human-R evidence:** **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B-HUMAN-R-001`**

---

## B. Pre-check

| # | Check | Result |
|---|-------|--------|
| 1 | `git status` | **`M55_SYSTEM_SSOT.md` modified** · untracked SSOT ×7 · `supabase/.temp/` |
| 2 | `supabase/.temp/` staged | **no** |
| 3 | R8-R / meta commit | **no** |
| 4 | push / deploy / DB / env / payment | **no** |

---

## C. Inspected files（read-only）

| Area | Files |
|------|-------|
| **DTR checkout** | `app/api/purchase/checkout/route.ts` · `lib/oneTimeCheckout.ts` · `lib/m55/dtrCoreCheckoutFulfillment.ts` |
| **¥500 checkout** | `app/api/reply-tickets/checkout/route.ts` · `lib/m55/reply/replyTicketCheckoutConstants.ts` · `replyTicketCheckoutValidate.ts` |
| **Webhook** | `app/api/stripe/webhook/route.ts` · `replyTicketWebhookLane.ts` · `replyTicketFulfillmentRpc.ts` |
| **Live consume** | `app/api/room/core/send/route.ts` · `app/api/room/core/route.ts` · `components/dtr/ConsultRoom.tsx` |
| **Alt consume (not Live)** | `app/api/reply/generate/route.ts` |
| **Wallet grants** | `lib/m55/reply/walletGrants.ts` |
| **Repo migrations** | `supabase/migrations/20260416000000_reply_system_data_layer_v1.sql` · `20260417000000_m55_reply_generate_commit_rpc.sql` |
| **Production SQL refs** | `scripts/sql/production/m55_reply_ticket_fulfillment_rpc_preflight.sql` · `m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql` · **`m55_backend_commerce_contract_b_readonly_preflight_v1.sql`**（本条 draft） |
| **Prior contract** | `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_A_1000_DTR_500_REPLY_PLANNING_2026-05-23.md` |

---

## D. Code path map

| Flow | Entry | Fulfillment / consume | Ledger |
|------|-------|----------------------|--------|
| **¥1,000 DTR** | `POST /api/purchase/checkout` | Webhook → `fulfillDtrCoreFromCheckoutSessionId` | **`included_grant`** via `grantInitialIncludedReplyIfNeeded` |
| **¥500 reply** | `POST /api/reply-tickets/checkout` | Webhook → `m55_reply_ticket_fulfill_checkout_event` RPC | **`purchase_grant`** in RPC |
| **Live reply send** | `ConsultRoom` → `POST /api/room/core/send` | Direct `reply_ticket_wallets` UPDATE | **none**（**BC-P0-001**） |
| **Alt reply** | `POST /api/reply/generate` | `m55_reply_generate_commit` RPC | **`reply_consume`**（**not Live UI**） |
| **Room state** | `GET /api/room/core` | `consult_threads` + wallet probe | mismatch log **`LEDGER_MISMATCH_PROBE`** |

---

## E. Schema / RPC expectation map

### E.1 `reply_ticket_wallets`（Production target）

| Column | Repo migration v1 | Production candidate SQL | Contract need |
|--------|-------------------|--------------------------|---------------|
| `user_id` | **UNIQUE** (global 1 row) | **`report_instance_id`** scoped row | **Per-report wallet** for ¥500 + consume |
| `initial_included_count` | yes | yes | cap **1** |
| `purchased_count` | yes | yes | max **4** |
| `available_count` | yes | yes | invariant check |
| `consumed_count` | yes | yes | invariant check |
| `status` | active/suspended/closed | yes | checkout gate |
| **`report_instance_id`** | **not in repo migration** | **ADD in production candidate** | **required** |

### E.2 `reply_wallet_ledgers`

| Column / rule | Contract need |
|---------------|---------------|
| `event_type` IN (`included_grant`,`purchase_grant`,`reply_consume`,`recovery_adjust`,`admin_adjust`) | all grant/consume paths |
| `delta` sign rules | CHECK in migration v1 |
| **`report_instance_id`** | production candidate ADD |
| **`stripe_event_id`** etc. | purchase_grant traceability |

### E.3 `m55_reply_ticket_fulfill_checkout_event`

| Field | Expected |
|-------|----------|
| **Args** | `text,text,text,text,uuid,text,text,integer` |
| **Returns** | `jsonb` |
| **Statuses** | `processed` · `duplicate_noop` · `skipped_cap` · `rejected_*` |
| **Idempotency** | `stripe_processed_events.stripe_event_id` partial UNIQUE |
| **Cap** | `initial+purchased >= 5` OR `purchased >= 4` → skip/reject |

### E.4 `m55_reply_generate_commit`

| Behavior | Contract assessment |
|----------|---------------------|
| Wallet lock | **`WHERE user_id = p_user_id`** only | **Not report-scoped** — **not reusable for Live consult without migration** |
| Consume ledger | **`reply_consume`** with `reply_session_id` | Good pattern · wrong surface for `consult_messages` today |
| Replay | No double consume if doc exists | Good idempotency pattern |

### E.5 Unified consume RPC — **required for Contract-C**

**Recommendation:** new RPC e.g. **`m55_consult_reply_commit`** (or extend generate RPC) that atomically:

1. Validates ownership + **`report_instance_id`** scoped wallet
2. Inserts **`consult_messages`** (user + assistant) OR ties to consult message IDs
3. Decrements wallet with optimistic lock
4. Inserts **`reply_consume` ledger** row
5. Updates **`consult_threads`** display fields from wallet SSOT only
6. Supports **`idempotency_key`** (new column or consult-side dedupe table)

**Do not** wire Live UI to raw wallet UPDATE in route handler.

### E.6 Idempotency constraints (existing)

| Layer | Mechanism |
|-------|-----------|
| Stripe global | `stripe_events.event_id` |
| ¥500 fulfill | `stripe_processed_events` + RPC duplicate_noop |
| DTR fulfill | `one_time_fulfillments.checkout_session_id` |
| `/api/reply/generate` | `reply_sessions (user_id, idempotency_key)` UNIQUE |
| **`/api/room/core/send`** | **none**（server-side） |

---

## F. Env-name checklist（values prohibited）

| Env var | Used by | Required for release |
|---------|---------|---------------------|
| **`STRIPE_SECRET_KEY`** | All checkout + webhook Stripe client | **yes** |
| **`STRIPE_WEBHOOK_SECRET`** | `app/api/stripe/webhook/route.ts` L44 | **yes** |
| **`STRIPE_PRICE_DTR_CORE_STATIC_V1`** | `app/api/purchase/checkout/route.ts` L119-120 | **yes**（¥1,000） |
| **`STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** | `app/api/reply-tickets/checkout/route.ts` L23 | **yes**（¥500） |
| **`STRIPE_PRICE_PREMIUM_MONTHLY`** | Webhook subscription lane | ancillary · not release blocker |
| **`DTR_ALLOW_STALE_SESSION_NEW_CHECKOUT`** | DTR checkout escape hatch | optional · default off in prod |
| **`OPENAI_API_KEY`** | `room/core/send` AI | required for live reply text |

**Human action:** confirm **names exist** in Vercel Production · **do not paste values**.

---

## G. Cap SSOT findings

### G.1 Canonical cap（code SSOT）

| Constant | Value | File |
|----------|------:|------|
| `REPLY_TICKET_INCLUDED_COUNT` | **1** | `replyTicketCheckoutConstants.ts` |
| `REPLY_TICKET_ADDITIONAL_MAX_PURCHASED` | **4** | same |
| `REPLY_TICKET_TOTAL_CAP_PER_REPORT` | **5** | same |

### G.2 Still saying cap **3**（must fix in Contract-C）

| Location | Issue |
|----------|-------|
| `app/api/room/core/route.ts` | **`MAX_CREDITS = 3`** · **`CREDITS_ON_PURCHASE = 1`** |
| `components/dtr/ConsultRoom.tsx` | **`MAX_CREDITS = 3`** · comment "Thread cap: 3" · add-on copy **合計{MAX_CREDITS}件** |
| `00_PRIMARY_ACTIVE_LAW/M55_REPORT_PRODUCT_STRUCTURE_SSOT_v1.md` | `max 3 / 3`（frozen law — reconcile via ADR not silent edit） |
| `05_SECONDARY_SUPPORTING_LAW/.../M55_TRUST_AND_PAYMENT_CLARITY_SSOT_v1.md` | `3 / 3` |
| `00_PRIMARY_ACTIVE_LAW/m_55_entry_report_constitution_ssot_v_1.md` | 「合計3回」（constitution — policy alignment gate） |

### G.3 Already **5**（aligned）

| Location |
|----------|
| `lib/m55/reply/replyTicketCheckoutConstants.ts` |
| `replyTicketCheckoutValidate.ts` |
| `app/support/page.tsx` · `app/legal/terms/page.tsx` |
| `ConsultRoom.tsx` display **合計5件まで**（partial — conflicts with MAX_CREDITS=3 branch） |
| `docs/ssot/M55_REPORT_CORRECTION_AND_REPLY_CREDIT_POLICY_v1.md` |

---

## H. P0 implementation readiness

| Question | Repo preflight | Production Human SQL |
|----------|----------------|----------------------|
| Code paths mapped | **yes** | n/a |
| P0 gaps confirmed | **yes**（A carry-forward） | n/a |
| RPC signature documented | **yes** | **PASS**（S-1） |
| `report_instance_id` on wallets | **expected in prod candidate** | **PASS** columns exist（S-2）· **5 legacy null-scope rows remain**（S-5 STOP） |
| Env **names** listed | **yes** | **not attested in B-HUMAN-R**（S-6 separate） |
| Cap drift enumerated | **yes** | **`wallets_cap_violation_rows = 0`** · **`consult_threads_credits_total_gt_3 = 0`** |

**Readiness verdict（post Human-R）:** **`CONTRACT_C_BLOCKED_PENDING_B2_NULL_SCOPE_WALLET_PLANNING`** — Human SQL **S-1〜S-4 PASS** · **S-5 STOP**.

**Do not start Contract-C implementation / live ¥500 checkout / VERIFY-C** until **`BACKEND-COMMERCE-CONTRACT-B2-NULL-SCOPE-WALLET-COMPATIBILITY-BACKFILL-PLANNING`** clears S-5.

---

## I. Contract-C target list（exact）

| # | Target | Files / layer |
|---|--------|----------------|
| **C-1** | **Unified atomic consume RPC** | new migration SQL + `app/api/room/core/send/route.ts` |
| **C-2** | **`reply_consume` ledger** on every successful Live send | RPC only · remove direct wallet UPDATE in route |
| **C-3** | **Transaction order** — consume only after durable assistant message | RPC boundary |
| **C-4** | **Send idempotency** | header + DB dedupe (consult-scoped) |
| **C-5** | **Cap SSOT = 5** — remove **`MAX_CREDITS=3`** | `room/core/route.ts` · `ConsultRoom.tsx` |
| **C-6** | **`consult_threads` demoted** — display sync from wallet · not authority | `room/core/route.ts` |
| **C-7** | **Report-scoped wallet** in consume RPC | align with Production `report_instance_id` |
| **C-8** | **UI copy** — single cap story (optional same PR or UI pass after C) | `ConsultRoom.tsx` |
| **C-9** | **Do not switch Live to `/api/reply/generate`** without consult message model alignment | architectural |

**Out of scope Contract-C (Contract-D/E):** live checkout smoke · webhook replay · env value changes · Stripe Dashboard.

---

## J. Stop conditions

| # | Condition | Action |
|---|-----------|--------|
| **S-1** | `m55_reply_ticket_fulfill_checkout_event` **missing** on Production | **STOP** · apply production migration candidate per runbook · no live ¥500 |
| **S-2** | `reply_ticket_wallets.report_instance_id` **missing** | **STOP** · schema migration before consume/checkout |
| **S-3** | `stripe_processed_events` **missing** or no unique on `stripe_event_id` | **STOP** · ¥500 idempotency unsafe |
| **S-4** | `wallets_cap_violation_rows > 0` | **STOP** · data repair planning before cap enforcement |
| **S-5** | `wallets_with_null_report_instance_id` **> 0** for active owned users | **STOP** · backfill runbook before scoped consume |
| **S-6** | Env name **missing** on Vercel (`STRIPE_PRICE_*` either) | **STOP** · Human env config gate · no checkout |
| **S-7** | Attempt live payment / webhook replay in B gate | **STOP** · gate violation |

---

## K. Human SQL preflight draft

**File:** `scripts/sql/production/m55_backend_commerce_contract_b_readonly_preflight_v1.sql`

**Also valid (deeper RPC packet):** `scripts/sql/production/m55_reply_ticket_fulfillment_rpc_preflight.sql`

**Post-apply verification (if migration ever applied):** `m55_phase5_2_reply_ticket_fulfillment_postflight_verification_v1.sql`

**Rules:** section-by-section · `current_database()` = **`m55-soul-core`** · paste back **boolean/count columns only**.

---

## L. No-mutation（this gate）

| Action | Status |
|--------|--------|
| code edit | **no** |
| commit | **no** |
| push / deploy | **no** |
| DB write / env change | **no** |
| live checkout / payment / webhook replay | **no** |
| VERIFY-C | **HOLD** |
| raw ID / secret | **no** |
| R8-R meta commit | **no** |

---

## M. Recommended next gate

| Priority | Gate | Status |
|----------|------|--------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-B2-NULL-SCOPE-WALLET-COMPATIBILITY-BACKFILL-PLANNING`** | **CLOSED** GREEN |
| **2** | **`BACKEND-COMMERCE-CONTRACT-B2-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B2-R-001`** |
| **3** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING-001`** |
| **4** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING-001`** |
| **5** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-D-EXEC`** | **COMPLETE** |
| **6** | **`BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R`** | **CLOSED** GREEN |
| **7** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING`** | **CLOSED** GREEN |
| **8** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING-001`** |
| **9** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-D-EXEC`** | **COMPLETE** |
| **10** | **`BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R-001`** |
| **11** | **`BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R-001`** · **S-5 CLOSED** |
| **12** | **`BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING-001`** |
| **13** | **`BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING-001`** |
| **14** | **`BACKEND-COMMERCE-CONTRACT-C-HUMAN-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`** |
| **15** | **`BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING-001`** |
| **16** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** |
| **17** | **`BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION`** | **NEXT** |
| **18** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-DB`** | **HOLD** · **`C-D-EXEC go`** |

---

## N. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B-READONLY-PREFLIGHT-PLANNING-001`** | **本条**（repo planning） |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B-HUMAN-R-001`** | Human Production preflight · **S-5 BLOCK** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B2-NULL-SCOPE-WALLET-COMPATIBILITY-BACKFILL-PLANNING-001`** | B2 null-scope planning |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B2-R-001`** | B2-R counts · backfill **1** · quarantine **4** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-PLANNING-001`** | B3 wallet backfill planning |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-EXEC-PLANNING-001`** | B3 wallet backfill EXEC-PLANNING |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-WALLET-BACKFILL-POSTFLIGHT-R-001`** | B3 wallet backfill POSTFLIGHT-R |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-PLANNING-001`** | B3 quarantine planning |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-EXEC-PLANNING-001`** | B3 quarantine EXEC-PLANNING |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-QUARANTINE-POSTFLIGHT-R-001`** | B3 quarantine POSTFLIGHT-R |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R-001`** | B3 S-5 combined POSTFLIGHT-R · **S-5 CLOSED** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING-001`** | Contract-C READONLY-PREFLIGHT-PLANNING |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING-001`** | Contract-C IMPLEMENTATION-PLANNING |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`** | C-HUMAN-R Production preflight |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING-001`** | C migration planning |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** | C D-EXEC-PLANNING |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-A-1000-DTR-500-REPLY-PLANNING-001`** | Prior contract |
| **`M55-EVID-20260522-5Z-I-V-RELEASE-READINESS-OPS-MONITOR-R8-R-001`** | Cadence anchor |
