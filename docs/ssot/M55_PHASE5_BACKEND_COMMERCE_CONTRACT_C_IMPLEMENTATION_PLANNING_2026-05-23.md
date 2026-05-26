# Phase BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING — Implementation spec freeze（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING** |
| **Title** | **Unified consume RPC · live send refactor · ledger · cap=5 · idempotency — implementation spec freeze** |
| **Classification** | **Category 1 / read-only repo + SSOT / implementation planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_IMPLEMENTATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **`main`** @ **`6ce7002`** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_READONLY_PREFLIGHT_PLANNING_GREEN_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING-001`** |
| **CC-0 / CC-1〜CC-3** | **SATISFIED** |
| **Contract-C implementation** | **HOLD** until **C-MIGRATION-PLANNING** + **C-D-EXEC** Human GO |
| **VERIFY-C / live checkout** | **HOLD** |

**Implementation planning GREEN.** RPC spec · API diff · migration **design text** frozen. **No code · no migration file · no DB write in this gate.**

**Prior planning SSOT:** `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_READONLY_PREFLIGHT_PLANNING_2026-05-23.md`

---

## B. Pre-check

| # | Check | Result |
|---|-------|--------|
| 1 | C-READONLY-PREFLIGHT-PLANNING | **GREEN** |
| 2 | Live gap map validated | **yes** · BC-GAP-001〜004 P0 |
| 3 | Ledger CHECK constraint reviewed | **`reply_consume` requires `reply_session_id`** today — schema extension planned |
| 4 | DB write in this gate | **no** |

---

## C. Inspected files（read-only · re-validated）

| Path | Finding |
|------|---------|
| `app/api/room/core/send/route.ts` | messages INSERT **before** wallet UPDATE · no ledger · no idempotency |
| `app/api/room/core/route.ts` | `MAX_CREDITS=3` · scoped wallet query conditional · assistant-count reconcile |
| `app/api/reply/generate/route.ts` | `m55_reply_generate_commit` · `X-Idempotency-Key` pattern reference |
| `components/dtr/ConsultRoom.tsx` | `handleSend` · no idempotency header · cap copy drift |
| `supabase/migrations/20260416000000_reply_system_data_layer_v1.sql` | ledger CHECK · wallet 1-row-per-user origin |
| `supabase/migrations/20260417000000_m55_reply_generate_commit_rpc.sql` | atomic consume reference · **user_id-only** wallet lock |
| `lib/m55/reply/replyTicketCheckoutConstants.ts` | **cap=5** authority |
| `scripts/sql/production/m55_backend_commerce_contract_c_readonly_preflight_v1.sql` | C-HUMAN-R preflight draft |

---

## D. Architecture decision record（frozen）

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **D-1 RPC name** | **`m55_consult_reply_commit`** | Consult/message model · decouple from `reply/generate` |
| **D-2 Extend vs new** | **New RPC** | Avoid `reply_sessions` / theme coupling on live path |
| **D-3 LLM boundary** | **Outside RPC** | OpenAI in route · RPC = DB atomic commit only |
| **D-4 Idempotency store** | **`consult_send_commits` table** | Dedicated dedupe · payload hash for conflict |
| **D-5 Ledger linkage** | **`consult_commit_id` on ledger** | Existing CHECK requires non-null session ref for `reply_consume` |
| **D-6 Wallet scope** | **`(user_id, report_instance_id)` FOR UPDATE** | C-11 · null-scope forbidden |
| **D-7 Thread role** | **Display sync only** | Wallet SSOT · cap **5** |
| **D-8 C-10 grant order** | **P1** | Not blocking consume RPC |
| **D-9 C-12 ledger inherit** | **P1 optional** | Non-blocking |

---

## E. `m55_consult_reply_commit` RPC spec（frozen · draft SQL text only）

### E.1 Signature

```sql
-- DRAFT — NOT APPLIED — Contract-C migration gate only
CREATE OR REPLACE FUNCTION public.m55_consult_reply_commit(
  p_user_id text,
  p_report_instance_id uuid,
  p_consult_thread_id uuid,
  p_idempotency_key text,
  p_user_message text,
  p_assistant_message text,
  p_message_created_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
```

### E.2 Preconditions（RPC entry · fail before locks）

| Check | Error code | HTTP map（route） |
|-------|------------|-------------------|
| `p_user_id` non-empty | `INVALID_ARGUMENT` | 400 |
| `p_report_instance_id` NOT NULL | `INVALID_ARGUMENT` | 400 |
| `p_consult_thread_id` NOT NULL | `INVALID_ARGUMENT` | 400 |
| `p_idempotency_key` length 8–128 | `INVALID_ARGUMENT` | 400 |
| User message length 10–500 | `INVALID_ARGUMENT` | 422 |
| Assistant message length 1–1000 | `INVALID_ARGUMENT` | 422 |

### E.3 Idempotency phase

1. Compute **`payload_fingerprint`** = `md5(concat_ws('|', p_user_message, p_assistant_message))`（storage internal · not logged raw）
2. `SELECT … FROM consult_send_commits WHERE (user_id, report_instance_id, idempotency_key)` **`FOR UPDATE`**
3. **If row exists + status=`succeeded`:**
   - Same fingerprint → **`mode=replay`** · return stored message ids + wallet_after · **`consumption_applied=false`**
   - Different fingerprint → **`IDEMPOTENCY_CONFLICT`**
4. **If row exists + status=`pending`:** treat as in-flight · **`COMMIT_IN_PROGRESS`**（route 409 retry）
5. **Else:** INSERT commit row **`status=pending`**

### E.4 Authorization phase

| Check | Error code |
|-------|------------|
| `consult_threads.id = p_consult_thread_id` exists | `THREAD_NOT_FOUND` |
| `consult_threads.user_id = p_user_id` | `THREAD_USER_MISMATCH` |
| Wallet row **`(user_id, report_instance_id)`** exists | `WALLET_NOT_FOUND` |
| **`report_instance_id IS NOT NULL`** on wallet row | `FORBIDDEN_NULL_SCOPE` |
| **`status = 'active'`** | `WALLET_NOT_ACTIVE` |
| **`available_count > 0`** | `WALLET_NO_BALANCE` |
| No fallback to **`report_instance_id IS NULL`** row | implicit in scoped SELECT |

### E.5 Mutation phase（single transaction · order fixed）

| Step | Action |
|------|--------|
| **1** | `FOR UPDATE` wallet **`(user_id, report_instance_id)`** |
| **2** | Re-check `available_count > 0` · `status='active'` |
| **3** | INSERT `consult_messages` user row |
| **4** | INSERT `consult_messages` assistant row |
| **5** | UPDATE wallet: `available_count -= 1` · `consumed_count += 1` · `updated_at=now()` |
| **6** | INSERT `reply_wallet_ledgers`: **`event_type='reply_consume'`** · **`delta=-1`** · **`balance_after=available_after`** · **`consult_commit_id=<commit row id>`** · **`report_instance_id=p_report_instance_id`**（if column exists） |
| **7** | UPDATE `consult_threads`: `credits_remaining = wallet.available_after` · `state = read_only if 0 else writable` · `credits_total = min(5, max(credits_total, wallet.initial+purchased))`（display sync only） |
| **8** | UPDATE `consult_send_commits`: **`status=succeeded`** · store message ids + wallet_before/after |
| **9** | RETURN **`mode=consumed`** · **`consumption_applied=true`** |

### E.6 Success return shape（jsonb · no raw IDs in SSOT tickets）

```json
{
  "ok": true,
  "mode": "consumed | replay",
  "consumption_applied": true,
  "wallet_before": 0,
  "wallet_after": 0,
  "thread_state": "writable | read_only",
  "thread_credits_remaining": 0
}
```

### E.7 Security

- **`SECURITY DEFINER`** · **`REVOKE ALL FROM PUBLIC`** · **`GRANT EXECUTE TO service_role`** only
- Route uses **`getSupabaseAdmin()`** · same as existing RPC callers

---

## F. Transaction boundary

```
┌──────────────────────────────────────────────────────────────────────────┐
│ POST /api/room/core/send (app layer · NO wallet mutation)                │
├──────────────────────────────────────────────────────────────────────────┤
│ A. auth + ownership → reportInstanceId required                          │
│ B. input validation + safety classify → 422 block · NO RPC               │
│ C. wallet pre-check (read-only) → 403 if inactive/empty · NO RPC         │
│ D. OpenAI generate + output safety → 503/422 fail · NO RPC               │
│ E. db.rpc('m55_consult_reply_commit', …)  ←── SINGLE DB TRANSACTION      │
│    · idempotency · messages · wallet · ledger · thread sync              │
│ F. Map RPC jsonb → HTTP 200 response                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

| Boundary | Inside RPC | Outside RPC |
|----------|------------|-------------|
| OpenAI call | **no** | **yes** |
| Safety block | **no** | **yes** |
| `consult_messages` INSERT | **yes** | **no** |
| Wallet decrement | **yes** | **no** |
| `reply_consume` ledger | **yes** | **no** |
| `consult_threads` display sync | **yes** | **no** |
| Direct `reply_ticket_wallets` UPDATE in route | **prohibited** | — |

**Rollback:** any RPC failure → **no** partial consume · **no** ledger row · commit row stays **`failed`** or deleted per migration design.

---

## G. Idempotency contract

### G.1 Client（ConsultRoom + send route）

| Field | Rule |
|-------|------|
| **Header** | **`X-Idempotency-Key`** required on send |
| **Format** | UUID v4 or client-generated opaque string 8–128 chars |
| **Scope** | Per user · per report instance · per send attempt |
| **Generation** | New UUID when user composes **new** message · reuse same key on **network retry** of identical payload |

### G.2 Server

| Rule | Behavior |
|------|----------|
| **Store** | `consult_send_commits (user_id, report_instance_id, idempotency_key)` UNIQUE |
| **Replay** | Same key + same payload fingerprint → return prior success · **no second consume** |
| **Conflict** | Same key + different payload → **409 IDEMPOTENCY_CONFLICT** |
| **Missing key** | **400** · reject（no server-generated key in P0） |

### G.3 Schema addition（design text · not applied）

```sql
-- DRAFT — consult_send_commits
-- UNIQUE (user_id, report_instance_id, idempotency_key)
-- status IN ('pending', 'succeeded', 'failed')
-- payload_fingerprint text NOT NULL
-- user_message_id uuid NULL · assistant_message_id uuid NULL
-- wallet_before int · wallet_after int
```

### G.4 Ledger CHECK extension（design text · not applied）

Current CHECK requires **`reply_session_id IS NOT NULL`** for `reply_consume`. Planned migration adds:

- Column **`consult_commit_id uuid REFERENCES consult_send_commits(id)`**
- Revised CHECK: **`reply_consume` → `(reply_session_id IS NOT NULL OR consult_commit_id IS NOT NULL)` AND `delta < 0`**

---

## H. Send route implementation plan

### H.1 `app/api/room/core/send/route.ts` diff plan

| # | Change |
|---|--------|
| **1** | Require **`X-Idempotency-Key`** header |
| **2** | Remove inline **`consumeWallet()`** and direct wallet UPDATE |
| **3** | Remove pre-RPC **`consult_messages` INSERT** |
| **4** | After AI success → single **`db.rpc('m55_consult_reply_commit', { … })`** |
| **5** | Map RPC errors → 403/409/422/500 per error_code |
| **6** | On **`mode=replay`** → return assistant content from DB fetch by commit row（or echo from request if replay stores content hash only — implementation uses stored message ids server-side） |
| **7** | Remove **`reconcile_needed`** path for consume failure（RPC atomicity eliminates split state） |
| **8** | Keep safety/validation/AI gates **unchanged** before RPC |

### H.2 Pre-RPC read-only wallet check（retained）

- Scoped SELECT remains for fast **403** before LLM cost
- Must not mutate wallet in route

### H.3 Error mapping

| RPC `error_code` | HTTP |
|------------------|------|
| `INVALID_ARGUMENT` | 400 / 422 |
| `IDEMPOTENCY_CONFLICT` | 409 |
| `COMMIT_IN_PROGRESS` | 409 |
| `WALLET_NOT_FOUND` / `WALLET_NOT_ACTIVE` / `WALLET_NO_BALANCE` | 403 |
| `FORBIDDEN_NULL_SCOPE` | 409 |
| `THREAD_NOT_FOUND` | 404 |
| default | 500 |

---

## I. cap=5 unification plan

| File | Change |
|------|--------|
| `lib/m55/reply/replyTicketCheckoutConstants.ts` | **no change** — remains SSOT |
| `app/api/room/core/route.ts` | Remove **`MAX_CREDITS=3`** authority · import **`REPLY_TICKET_TOTAL_CAP_PER_REPORT`** for display cap only |
| `app/api/room/core/route.ts` | **`effective_credits_remaining`** = scoped wallet `available_count` when **`active`** · else **0**（no thread fallback for spend authority） |
| `components/dtr/ConsultRoom.tsx` | Replace **`MAX_CREDITS=3`** copy with **5** · align purchase CTA text |
| RPC step 7 | Thread `credits_total` display sync capped at **5** · never debit authority |
| Contract-B monitor | Keep **`consult_threads_credits_total_gt_3`** as drift indicator until AR migration |

---

## J. Null-scope / non-active fallback guard plan

| Layer | Guard |
|-------|-------|
| **RPC wallet SELECT** | **`WHERE user_id = p_user_id AND report_instance_id = p_report_instance_id`** only |
| **RPC reject** | Any wallet with **`report_instance_id IS NULL`** never selected |
| **RPC reject** | **`status <> 'active'`** → `WALLET_NOT_ACTIVE` |
| **send route** | **`reportInstanceId`** required before RPC（existing 409） |
| **GET /api/room/core** | When `reportInstanceId` present → scoped query **only** · **no** user_id-only fallback |
| **GET when scope missing** | **`has_wallet_row=false`** · **`effective_credits_remaining=0`** · no null-row spend |
| **B3 invariant** | **4** closed null rows remain audit-only · C preflight STOP if active null returns |

---

## K. Ledger design

| Field | Value |
|-------|-------|
| **Event** | **`reply_consume`** |
| **Delta** | **-1** |
| **balance_after** | post-decrement `available_count` |
| **wallet_id** | scoped wallet PK |
| **consult_commit_id** | new FK（P0 schema extension） |
| **report_instance_id** | set when column exists（C-12 full inherit optional P1） |
| **reply_session_id** | **NULL** for consult path |

**Invariant after C-D-EXEC:** every scoped wallet decrement on live path has ≥1 **`reply_consume`** ledger row.

**Preflight signal:** `scoped_wallets_consumed_without_reply_consume_ledger` should trend to **0** for new consumes; historical gap may remain until backfill policy defined（P1 / C-12）.

---

## L. Thread display sync plan

| Field | Source after C |
|-------|----------------|
| **`credits_remaining`** | wallet `available_count` |
| **`state`** | `read_only` if `available_count=0` else `writable` |
| **`credits_total`** | display: `min(5, initial_included + purchased_count)` · not consume authority |
| **GET reconcile** | Prefer wallet SSOT · assistant-count reconcile **secondary** · log **`LEDGER_MISMATCH_PROBE`** on divergence |

**Remove:** thread `credits_remaining` driving checkout eligibility when wallet present.

---

## M. Migration / test plan

### M.1 Migration gate chain

| Step | Gate | Artifact |
|------|------|----------|
| **1** | **C-IMPLEMENTATION-PLANNING** | **本条** spec freeze |
| **2** | **C-HUMAN-R** | Run `m55_backend_commerce_contract_c_readonly_preflight_v1.sql` |
| **3** | **C-MIGRATION-PLANNING** | Review migration candidate file · staging shadow |
| **4** | **C-D-EXEC** | Apply migration + deploy · Human GO |
| **5** | **C-POSTFLIGHT-R** | C + B SQL · ledger coverage |

### M.2 Planned migration contents（single additive migration · text only）

| # | Object |
|---|--------|
| **1** | CREATE TABLE **`consult_send_commits`** + UNIQUE + indexes |
| **2** | ALTER **`reply_wallet_ledgers`** ADD **`consult_commit_id`** · optional **`report_instance_id`** if missing on ledger |
| **3** | ALTER CHECK constraint for **`reply_consume`** |
| **4** | CREATE FUNCTION **`m55_consult_reply_commit`** |
| **5** | GRANT to **`service_role`** |

**File path（future · not created here）:** `supabase/migrations/20260523xxxxxx_m55_consult_reply_commit_rpc.sql`

### M.3 Staging verification（C-MIGRATION-PLANNING）

| Test | Expected |
|------|----------|
| RPC exists | **`rpc_consult_reply_commit_exists=true`** |
| Happy path | 1 consume · 2 messages · 1 ledger · wallet-- |
| Idempotency replay | 2nd call · **0** additional consume |
| Idempotency conflict | different payload · error |
| Inactive wallet | **no** consume |
| Null-scope wallet | **not** selectable |

### M.4 App test plan（post C-D-EXEC · no live checkout）

| # | Scenario |
|---|----------|
| **T-1** | Safety block → no RPC · wallet unchanged |
| **T-2** | Validation fail → no RPC |
| **T-3** | AI fail → no RPC |
| **T-4** | Success → ledger + wallet + messages |
| **T-5** | Double-submit same key → single consume |
| **T-6** | GET reflects wallet cap **5** |

---

## N. C-HUMAN-R preflight plan

| Step | Action |
|------|--------|
| **1** | Confirm Supabase = **m55-soul-core** |
| **2** | Run **`m55_backend_commerce_contract_c_readonly_preflight_v1.sql`** section-by-section |
| **3** | Verify S-5 anchors: **`wallets_null_status_active=0`** · **`quarantine_apply_candidate_count=0`** |
| **4** | Record **`rpc_consult_reply_commit_exists=false`**（expected pre-migration） |
| **5** | Record **`scoped_wallets_consumed_without_reply_consume_ledger`** baseline |
| **6** | **STOP** if any C-S-1〜C-S-5 triggered |

**Verdict target:** **`BACKEND_COMMERCE_CONTRACT_C_HUMAN_R_GREEN_NO_MUTATION`**

---

## O. Implementation file list

| Priority | File | Change type |
|----------|------|-------------|
| **P0** | `supabase/migrations/<new>_m55_consult_reply_commit_rpc.sql` | **new** migration |
| **P0** | `app/api/room/core/send/route.ts` | RPC delegate · remove direct UPDATE |
| **P0** | `components/dtr/ConsultRoom.tsx` | idempotency header · cap=5 copy |
| **P0** | `app/api/room/core/route.ts` | cap=5 display · scoped-only wallet read |
| **P1** | `lib/m55/reply/readReplyWalletProbe.ts` | **`scopedWalletLookupActive: true`** when column scoped |
| **P1** | `lib/m55/dtrCoreCheckoutFulfillment.ts` | C-10 grant order |
| **P1** | `lib/m55/reply/walletGrants.ts` | scoped wallet create |
| **P1** | `app/api/reply/generate/route.ts` | deprecate or scope later |
| **P1** | `scripts/sql/production/m55_backend_commerce_contract_c_postflight_v1.sql` | **new** postflight draft（future gate） |

**Frozen public API paths:** **`POST /api/room/core/send`** · **`GET /api/room/core`** — response shape stable except **`reconcile_needed`** removal documented.

---

## P. P0 / P1 split

### P0（blocks C-D-EXEC acceptance · live send correctness）

| ID | Deliverable |
|----|-------------|
| **C-P0-001** | **`consult_send_commits`** + ledger CHECK migration |
| **C-P0-002** | **`m55_consult_reply_commit`** RPC |
| **C-P0-003** | send route RPC-only · atomic boundary |
| **C-P0-004** | Client + server idempotency |
| **C-P0-005** | Scoped wallet only · null fallback removed on GET |
| **C-P0-006** | cap=5 UI/API alignment |
| **C-P0-007** | Thread display sync via RPC |
| **C-P0-008** | C-HUMAN-R baseline recorded |

### P1（pre live checkout · non-blocking for RPC merge）

| ID | Deliverable |
|----|-------------|
| **C-P1-001** | C-10 DTR grant order |
| **C-P1-002** | Scope or deprecate **`m55_reply_generate_commit`** |
| **C-P1-003** | C-12 ledger **`report_instance_id`** inherit |
| **C-P1-004** | ¥500 refund policy |
| **C-P1-005** | Contract-B S-6 env checklist |
| **C-P1-006** | Historical ledger backfill for pre-C consumes |

---

## Q. Failure-mode matrix

| Scenario | Pre-C behavior | Post-C behavior |
|----------|----------------|-----------------|
| Safety block | no consume | no RPC · no consume |
| Validation fail | no consume | no RPC |
| LLM fail | no consume | no RPC |
| Output safety block | no consume | no RPC |
| Messages saved · consume fail | **orphan messages possible** | **prevented** · RPC atomic |
| Consume ok · thread sync fail | reconcile_needed | RPC rolls back or thread in same tx |
| Double-click send | double consume risk | idempotency replay |
| Network retry same key | double consume risk | single consume |
| Scoped wallet missing | 409 | 403/409 · no null fallback |
| Null-scope row only | blocked on send | still blocked · GET shows no spend |
| Closed wallet | 403 | `WALLET_NOT_ACTIVE` |
| S-5 regression | N/A | C preflight STOP |

---

## R. Stop conditions

| # | Condition |
|---|-----------|
| **C-IP-S-1** | Implementation starts without frozen RPC spec（本条） |
| **C-IP-S-2** | Direct wallet UPDATE retained in send after C-D-EXEC |
| **C-IP-S-3** | Live send ships without **`reply_consume` ledger** |
| **C-IP-S-4** | Null-scope wallet debited |
| **C-IP-S-5** | S-5 metrics regress（C-HUMAN-R / postflight） |
| **C-IP-S-6** | Code edit / migration file creation inside **IMPLEMENTATION-PLANNING** gate |
| **C-IP-S-7** | Live checkout / VERIFY-C inside C implementation gates |
| **C-IP-S-8** | Idempotency optional on send（must be required P0） |

---

## S. No-mutation confirmation

| Action | Status |
|--------|--------|
| code edit | **no** |
| migration file creation | **no**（design text in SSOT only） |
| Production DML | **no** |
| commit / push / deploy / env / Stripe | **no** |
| live checkout / webhook / VERIFY-C | **HOLD** |
| raw ID recording | **no** |

---

## T. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-HUMAN-R`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING-001`** |
| **3** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** |
| **4** | **`BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-001`** |
| **5** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-DB`** | **HOLD** · **`C-D-EXEC go`** |

**Future Human GO phrase（C-D-EXEC · not authorized here）:**

```text
BACKEND-COMMERCE-CONTRACT-C-D-EXEC go
```

---

## U. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-READONLY-PREFLIGHT-PLANNING-001`** | Prior planning · gap map |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`** | C-HUMAN-R attestation |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING-001`** | Migration candidate design |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** | D-EXEC Human packet |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R-001`** | CC-0 |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-A-1000-DTR-500-REPLY-PLANNING-001`** | P0 origin |

---

## V. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | IMPLEMENTATION-PLANNING GREEN @ **`6ce7002`** · RPC spec frozen |
