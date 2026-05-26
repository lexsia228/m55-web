# Phase BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING — Contract-C entry planning（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING** |
| **Title** | **Unified consume RPC / live send / ledger / cap=5 / idempotency — read-only preflight planning** |
| **Classification** | **Category 1 / read-only repo + SSOT audit / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_READONLY_PREFLIGHT_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **`main`** @ **`6ce7002`** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_B3_S5_COMBINED_POSTFLIGHT_R_GREEN_S5_REMEDIATED_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R-001`** |
| **Contract-B S-5** | **GREEN / CLOSED** |
| **CC-0** | **SATISFIED** |
| **Contract-C planning entry** | **UNBLOCKED** |
| **Contract-C implementation** | **HOLD** |
| **VERIFY-C / live checkout / payment / webhook replay** | **HOLD** |

**Planning only.** No code · migration apply · DB write · env · Stripe · live checkout · commit.

---

## B. Pre-check

| # | Check | Result |
|---|-------|--------|
| 1 | B3-S5-COMBINED-POSTFLIGHT-R | **GREEN** · S-5 CLOSED |
| 2 | CC-0 / CC-1〜CC-3 | **SATISFIED** |
| 3 | Repo consume path inspected | **yes** · gaps documented |
| 4 | DB write in this gate | **no** |

---

## C. Inspected files（read-only）

### Live consume / room API

| Path | Role |
|------|------|
| `app/api/room/core/send/route.ts` | **LIVE** send · direct wallet UPDATE · no ledger · no idempotency |
| `app/api/room/core/route.ts` | GET state · `MAX_CREDITS=3` · wallet/thread reconcile |
| `app/api/reply/generate/route.ts` | Alternate commit · `m55_reply_generate_commit` · idempotency header |

### lib / fulfillment

| Path | Role |
|------|------|
| `lib/m55/reply/walletGrants.ts` | DTR included grant · **user_id-only** wallet |
| `lib/m55/reply/readReplyWalletProbe.ts` | Read probe · **scopedWalletLookupActive: false** |
| `lib/m55/reply/replyTicketCheckoutConstants.ts` | **cap=5** SSOT constants |
| `lib/m55/reply/replyTicketCheckoutValidate.ts` | ¥500 gate · scoped wallet |
| `lib/m55/reply/replyTicketFulfillmentRpc.ts` | Fulfillment RPC caller |
| `lib/m55/reply/replyTicketWebhookLane.ts` | Webhook reply lane |
| `lib/m55/reply/recordValidators.zod.ts` | `reply_consume` validator |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | DTR fulfill · wallet relink pattern |

### Checkout / webhook

| Path | Role |
|------|------|
| `app/api/reply-tickets/checkout/route.ts` | ¥500 checkout create |
| `app/api/stripe/webhook/route.ts` | DTR + reply lanes |

### UI

| Path | Role |
|------|------|
| `components/dtr/ConsultRoom.tsx` | Live UI · send · purchase · cap copy drift |

### DB / SQL / SSOT

| Path | Role |
|------|------|
| `supabase/migrations/20260416000000_reply_system_data_layer_v1.sql` | Wallet · ledger · sessions schema |
| `supabase/migrations/20260417000000_m55_reply_generate_commit_rpc.sql` | Existing atomic consume RPC |
| `supabase/migrations/20260325000000_consult_room.sql` | `consult_threads` legacy cap layer |
| `scripts/sql/production/m55_backend_commerce_contract_b_readonly_preflight_v1.sql` | Contract-B baseline |
| `scripts/sql/production/m55_backend_commerce_contract_c_readonly_preflight_v1.sql` | **本条** C preflight draft |
| `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_A_1000_DTR_500_REPLY_PLANNING_2026-05-23.md` | P0 gap list · target state machine |
| `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_B3_S5_COMBINED_POSTFLIGHT_R_2026-05-23.md` | S-5 closure anchor |
| `docs/ssot/M55_REPLY_DATA_MODEL_AND_DB_CONTRACT_v1.md` | Data model reference |
| `docs/ssot/M55_REPLY_TICKET_NULL_WALLET_POLICY_v1.md` | Close-not-delete · null-scope forbid |

---

## D. Current live consume path map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LIVE PATH: ConsultRoom → POST /api/room/core/send                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. auth + resolveEntryReportOwnership → reportInstanceId REQUIRED (409)     │
│ 2. safety / validation → no consume on block                                │
│ 3. consult_threads SELECT (legacy ledger row)                               │
│ 4. reply_ticket_wallets SELECT (user_id + report_instance_id) scoped        │
│    · status=active · available_count>0 required                             │
│    · NO null-scope fallback (C-11 partial — send only)                      │
│ 5. OpenAI generate (before DB writes)                                       │
│ 6. consult_messages INSERT (user + assistant batch)                         │
│ 7. reply_ticket_wallets UPDATE direct (optimistic lock + 1 retry)           │
│    · NO reply_consume ledger                                                │
│    · NO idempotency key                                                     │
│ 8. consult_threads UPDATE credits_remaining/state from wallet-derived value │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ALT PATH: POST /api/reply/generate (NOT ConsultRoom live UI)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ · X-Idempotency-Key → reply_sessions unique                                 │
│ · db.rpc('m55_reply_generate_commit')                                       │
│ · wallet SELECT user_id ONLY (legacy — no report_instance_id scope)          │
│ · reply_consume ledger YES                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ GET /api/room/core (display sync)                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ · MAX_CREDITS=3 thread constants                                            │
│ · wallet probe: scoped if reportInstanceId else user_id-only fallback        │
│ · effective_credits_remaining: wallet preferred else thread                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Critical ordering gap (BC-GAP-002):** live send inserts messages **before** wallet consume. Consume failure → orphan messages possible.

---

## E. Target unified consume contract

| # | Contract-A/B target | Target behavior |
|---|---------------------|-----------------|
| **1** | Unified atomic consume RPC | Single **`m55_consult_reply_commit`** (or scoped extension of generate RPC) owns wallet decrement + ledger |
| **2** | Stop direct wallet UPDATE in send | **`/api/room/core/send`** delegates to RPC only |
| **3** | `reply_consume` ledger on every successful debit | Ledger row with negative delta · `reply_session_id` or consult idempotency key |
| **4** | Consume only after successful reply commit | Messages + wallet + ledger in **one transaction** · rollback on any fail |
| **5** | No consume on safety/validation/LLM/output/DB fail | Pre-RPC gates unchanged · RPC not called |
| **6** | Idempotency | Client key + server dedupe table / session row · replay → single consume |
| **7** | cap=5 SSOT | Wallet authority · remove cap=3 drift |
| **8** | consult_threads display sync only | Thread fields derived from wallet · not debit authority |
| **9** | report_instance_id scoped wallet only | RPC wallet lock **`(user_id, report_instance_id)`** · **`status='active'`** |
| **10** | DTR grant order fix | Wallet created/linked with scope **before** included grant finality (C-10) |
| **11** | null-scope / non-active fallback forbidden | RPC rejects NULL scope · rejects `closed`/`inactive` · GET must not spend null rows |
| **12** | Ledger scope inherit | Optional C-12 · non-blocking for consume RPC |

**Null-scope policy (post-B3):** **4** closed audit rows remain · must never be selected for consume.

---

## F. RPC / migration design requirements

### F.1 Recommended new RPC: `m55_consult_reply_commit`

| Parameter | Purpose |
|-----------|---------|
| `p_user_id` | Clerk user |
| `p_report_instance_id` | Scoped wallet key · **required** |
| `p_consult_thread_id` | Thread FK for messages |
| `p_idempotency_key` | Dedupe key (text) |
| `p_user_message` / `p_assistant_message` | Persisted content |
| `p_metadata_json` | Optional safety audit fields |

**Transaction steps (single function):**

1. Idempotency lookup → replay short-circuit if prior success
2. `FOR UPDATE` wallet where `(user_id, report_instance_id)` · `status='active'` · `available_count>0`
3. Reject if wallet missing / inactive / null-scope row would match
4. INSERT `consult_messages` (both roles)
5. UPDATE wallet `available_count--` · `consumed_count++`
6. INSERT `reply_wallet_ledgers` **`reply_consume`** (negative delta · wallet_id · report_instance_id)
7. UPDATE `consult_threads` display fields from wallet-derived values
8. RETURN jsonb `{ ok, replay, wallet_after, thread_after }`

**Migration file:** new additive migration under `supabase/migrations/` · **not created in this gate**.

### F.2 Extend vs replace `m55_reply_generate_commit`

| Option | Pros | Cons |
|--------|------|------|
| **A — New RPC** | Clean consult/message model · no theme/session coupling | Two RPCs until generate path retired |
| **B — Extend generate RPC** | Reuse idempotency/session | ConsultRoom ≠ reply_sessions model · coupling risk |

**Planning recommendation:** **Option A — `m55_consult_reply_commit`** for live path · keep generate RPC until explicit deprecation gate.

### F.3 Schema additions (planning)

| Object | Purpose |
|--------|---------|
| `consult_send_idempotency` table OR extend `reply_sessions` | Dedupe consult sends |
| UNIQUE `(user_id, report_instance_id, idempotency_key)` | Double-submit guard |
| Optional index on ledger `(wallet_id, event_type)` | Audit queries |

**No DDL executed in this gate.**

### F.4 C-10 grant order (fulfillment — separate sub-gate)

| Current | Target |
|---------|--------|
| `grantInitialIncludedReplyIfNeeded` creates **user_id-only** wallet | Create/link scoped wallet with **`report_instance_id`** at DTR fulfill **before** grant |
| `fulfillDtrCoreFromCheckoutSessionId` relinks all active wallets post snapshot | Scope link at wallet creation · no broad null relink |

---

## G. Idempotency design

| Surface | Current | Target |
|---------|---------|--------|
| **`/api/reply/generate`** | `X-Idempotency-Key` → `reply_sessions` UNIQUE | retain |
| **`/api/room/core/send`** | client `sendLock` only | **`X-Idempotency-Key` or body key** → RPC dedupe |
| **Webhook ¥500** | `stripe_processed_events` + RPC duplicate_noop | retain |
| **Webhook ¥1,000** | `one_time_fulfillments` + stripe_events | retain |

**Replay semantics:**

- Same key + same payload → return prior success · **no second consume**
- Same key + different payload → **409 IDEMPOTENCY_CONFLICT**
- Missing key → reject or generate server-side UUID (planning decision: **require client key** for send)

---

## H. Ledger design

| Event | When | Required fields |
|-------|------|-----------------|
| **`included_grant`** | DTR fulfill | positive delta · wallet_id |
| **`purchase_grant`** | ¥500 fulfill RPC | positive delta · stripe_event_id · product_key |
| **`reply_consume`** | successful consult send | **negative delta** · wallet_id · idempotency/session ref |

**Live path gap:** room send performs wallet UPDATE with **zero** `reply_consume` rows today.

**C-12 optional:** backfill `report_instance_id` on legacy ledger rows tied to scoped wallets · defer to **B3-LEDGER-INHERIT-PLANNING**.

**Preflight signal SQL:** `scoped_wallets_consumed_without_reply_consume_ledger` in C preflight draft — expect **> 0** until Contract-C apply.

---

## I. cap=5 drift map

| Location | Current cap | SSOT target |
|----------|-------------|-------------|
| `lib/m55/reply/replyTicketCheckoutConstants.ts` | **5** | authority |
| `replyTicketCheckoutValidate.ts` | **5** / purchased **4** | authority |
| `m55_reply_ticket_fulfill_checkout_event` RPC | hardcoded **5/4** | authority |
| `ConsultRoom.tsx` UI purchase copy | mixed **3** and **5** | align to **5** |
| `app/api/room/core/route.ts` | `MAX_CREDITS = 3` | **display sync only** · derive from wallet |
| `consult_threads` schema | credits_total often **1** at create | not debit authority |
| Contract-B preflight SQL | `consult_threads_credits_total_gt_3` monitor | drift indicator only |

**Contract-C action:** wallet **`REPLY_TICKET_TOTAL_CAP_PER_REPORT = 5`** is sole spend/purchase cap · thread cap constants removed from authority paths.

---

## J. Contract-C P0 implementation list

| ID | Item | Files / scope | Blocks live send |
|----|------|---------------|------------------|
| **C-P0-001** | Add **`m55_consult_reply_commit`** migration candidate | `supabase/migrations/` · SQL draft | **yes** |
| **C-P0-002** | Refactor **`/api/room/core/send`** to RPC-only consume | `app/api/room/core/send/route.ts` | **yes** |
| **C-P0-003** | Atomic tx: messages + wallet + ledger | RPC body | **yes** |
| **C-P0-004** | Send idempotency key contract | `ConsultRoom.tsx` + send route | **yes** |
| **C-P0-005** | Scoped wallet only · forbid null fallback | RPC + `room/core/route.ts` GET | **yes** |
| **C-P0-006** | cap=5 alignment · remove cap=3 authority | `route.ts` · `ConsultRoom.tsx` | **yes** |
| **C-P0-007** | consult_threads display sync from wallet | `room/core/route.ts` · RPC step 7 | **yes** |
| **C-P0-008** | Contract-C read-only Human preflight | `m55_backend_commerce_contract_c_readonly_preflight_v1.sql` | gate |
| **C-P0-009** | C-11 live send guard tests (planning) | stop conditions below | **yes** |

### P1（non-blocking consume RPC · pre live checkout）

| ID | Item |
|----|------|
| **C-P1-001** | C-10 DTR grant order · `walletGrants.ts` + `dtrCoreCheckoutFulfillment.ts` |
| **C-P1-002** | Scope `m55_reply_generate_commit` or deprecate path |
| **C-P1-003** | C-12 ledger `report_instance_id` inherit |
| **C-P1-004** | ¥500 refund webhook policy |
| **C-P1-005** | Contract-B S-6 env-name Human checklist |

---

## K. Test / preflight plan

| Phase | Gate | Action | Mutation |
|-------|------|--------|----------|
| **1** | **C-READONLY-PREFLIGHT-PLANNING** | **本条** · repo gap map | **no** |
| **2** | **C-IMPLEMENTATION-PLANNING** | RPC spec freeze · migration draft review · rollback | **no** |
| **3** | **C-HUMAN-R** | Run `m55_backend_commerce_contract_c_readonly_preflight_v1.sql` · counts only | **no** |
| **4** | **C-MIGRATION-PLANNING** | Staging shadow apply verify | **staging only** |
| **5** | **C-D-EXEC** | Apply migration + deploy · explicit Human GO | **yes** |
| **6** | **C-POSTFLIGHT-R** | Re-run C + B SQL · ledger consume coverage | **no** |
| **7** | **CONTRACT-D** | Test-mode checkout observation | **HOLD** |
| **8** | **VERIFY-C** | Separate Human GO | **HOLD** |

**Acceptance checks (from Contract-A §P adapted):**

1. Send success → **`reply_consume`** + wallet-- · scoped row only
2. Safety / validation / AI fail → **no** wallet change · **no** ledger
3. Double-submit same idempotency → **single** consume
4. `GET /api/room/core` matches wallet SSOT · cap **5** display
5. Null-scope rows remain **closed** · never debited

---

## L. Stop conditions

| # | Condition | Action |
|---|-----------|--------|
| **C-S-1** | S-5 regression: `wallets_null_status_active > 0` | **STOP** · return to B3 cadence |
| **C-S-2** | `wallets_null_active_available_gt_0 > 0` | **STOP** |
| **C-S-3** | `quarantine_apply_candidate_count > 0` | **STOP** |
| **C-S-4** | `wallets_cap_violation_rows > 0` | **STOP** |
| **C-S-5** | `users_with_both_null_and_scoped_wallet > 0` | **STOP** |
| **C-S-6** | Implementation without **`m55_consult_reply_commit`** on live send | **STOP** · BC-GAP-001 |
| **C-S-7** | Direct wallet UPDATE retained in send after C-D-EXEC claimed | **STOP** · gate violation |
| **C-S-8** | Null-scope wallet selected for consume | **STOP** · C-11 violation |
| **C-S-9** | Live checkout / webhook replay inside C planning gate | **STOP** |
| **C-S-10** | Code edit / migration apply inside **READONLY-PREFLIGHT-PLANNING** | **STOP** |

---

## M. Gap register（repo read-only · prioritized）

| ID | Gap | Sev | Contract-C fix |
|----|-----|-----|----------------|
| **BC-GAP-001** | Live send no `reply_consume` ledger | **P0** | C-P0-001/002 |
| **BC-GAP-002** | Messages before consume · orphan risk | **P0** | C-P0-003 |
| **BC-GAP-003** | cap **3** vs **5** dual SSOT | **P0** | C-P0-006 |
| **BC-GAP-004** | Two consume paths | **P0** | C-P0-002 · deprecate generate later |
| **BC-GAP-005** | `m55_reply_generate_commit` user_id-only scope | **P1** | C-P1-002 |
| **BC-GAP-011** | GET wallet user_id fallback when scope missing | **P0** | C-P0-005 |
| **BC-GAP-012** | `walletGrants` null-scope wallet create | **P1** | C-P1-001 |
| **BC-GAP-006** | No ¥500 refund handler | **P1** | C-P1-004 |

*(BC-GAP-001〜010 inherited from Contract-A §K · re-validated here.)*

---

## N. CC-0 / Contract-C dependency status

| Item | Status |
|------|--------|
| **CC-0 S-5** | **SATISFIED** |
| **CC-1 S-1〜S-4** | **PASS**（B-HUMAN-R） |
| **CC-2 B2-R** | **SATISFIED** |
| **CC-3 B3 remediation** | **SATISFIED** |
| **Planning entry** | **UNBLOCKED** |
| **Implementation** | **HOLD** until **C-IMPLEMENTATION-PLANNING** + explicit GO |
| **VERIFY-C / live checkout** | **HOLD** |

---

## O. No-mutation confirmation

| Action | Status |
|--------|--------|
| code edit | **no** |
| migration creation (applied) | **no**（SQL **draft** only） |
| Production DML | **no** |
| commit / push / deploy / env / Stripe | **no** |
| live checkout / webhook / VERIFY-C | **HOLD** |
| raw ID recording | **no** |

---

## P. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING-001`** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-HUMAN-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`** |
| **3** | **`BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING-001`** |
| **4** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** |
| **5** | **`BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION`** | **NEXT** |

---

## Q. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING-001`** | IMPLEMENTATION-PLANNING · RPC spec |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`** | C-HUMAN-R Production preflight |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING-001`** | Migration planning |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** | D-EXEC-PLANNING |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R-001`** | S-5 CLOSED · CC-0 |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-A-1000-DTR-500-REPLY-PLANNING-001`** | P0 gap origin |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B-READONLY-PREFLIGHT-PLANNING-001`** | Contract-B baseline |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B-HUMAN-R-001`** | S-1〜S-4 anchor |

---

## R. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | READONLY-PREFLIGHT-PLANNING GREEN @ **`6ce7002`** · Contract-C entry UNBLOCKED |
