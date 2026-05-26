# Phase BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING — Migration candidate review（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING** |
| **Title** | **consult_send_commits · ledger extension · m55_consult_reply_commit · app refactor plan review** |
| **Classification** | **Category 1 / migration planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_MIGRATION_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **`main`** @ **`6ce7002`** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_HUMAN_R_GREEN_READY_FOR_MIGRATION_PLANNING_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`** |
| **C-D-EXEC** | **HOLD** until **C-D-EXEC-PLANNING** + explicit Human GO |
| **VERIFY-C / live checkout** | **HOLD** |

**Migration planning GREEN.** Migration candidate **design reviewed** · **no migration file created** · **no DB apply** in this gate.

**Frozen specs:** `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_IMPLEMENTATION_PLANNING_2026-05-23.md`

---

## B. Pre-check

| # | Check | Result |
|---|-------|--------|
| 1 | C-HUMAN-R | **GREEN** · S-5 non-regression |
| 2 | Pre-C schema absent | **confirmed** |
| 3 | IMPLEMENTATION-PLANNING ADR | **frozen** |
| 4 | Migration file / code / DB write in this gate | **no** |

---

## C. Inspected files（read-only）

| Path | Role |
|------|------|
| `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_IMPLEMENTATION_PLANNING_2026-05-23.md` | RPC spec · ADR |
| `docs/ssot/M55_PHASE5_BACKEND_COMMERCE_CONTRACT_C_HUMAN_R_PRODUCTION_PREFLIGHT_RESULT_2026-05-23.md` | Pre-C baseline |
| `supabase/migrations/20260325000000_consult_room.sql` | `consult_threads` · `consult_messages` |
| `supabase/migrations/20260416000000_reply_system_data_layer_v1.sql` | wallet · ledger CHECK |
| `supabase/migrations/20260417000000_m55_reply_generate_commit_rpc.sql` | reference atomic pattern |
| `app/api/room/core/send/route.ts` | live gap · refactor target |
| `app/api/room/core/route.ts` | GET · cap drift |
| `components/dtr/ConsultRoom.tsx` | idempotency · UI cap |
| `lib/m55/reply/replyTicketCheckoutConstants.ts` | cap=5 SSOT |
| `scripts/sql/production/m55_backend_commerce_contract_c_readonly_preflight_v1.sql` | pre/post baseline |
| `scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql` | staging candidate pattern reference |

---

## D. Migration candidate design（single additive migration · DRAFT TEXT ONLY）

**Planned repo path（future · NOT CREATED in this gate）:**

| Artifact | Path |
|----------|------|
| **Supabase migration** | `supabase/migrations/20260523120000_m55_consult_reply_commit_rpc_v1.sql` |
| **Staging shadow copy** | `scripts/sql/staging/m55_consult_reply_commit_rpc_migration_candidate_v1.sql` |
| **Production apply verify** | `scripts/sql/production/m55_backend_commerce_contract_c_postflight_v1.sql`（future gate） |

**Apply order（fail-closed）:**

| Step | Object | Rollback |
|------|--------|----------|
| **1** | `consult_send_commits` table + indexes | DROP TABLE（separate GO only） |
| **2** | `reply_wallet_ledgers.consult_commit_id` column + FK | DROP COLUMN |
| **3** | Replace ledger event_type CHECK | restore prior CHECK from migration comment block |
| **4** | `m55_consult_reply_commit` function + GRANT | DROP FUNCTION |
| **5** | Optional index `idx_reply_wallet_ledgers_consult_commit` | DROP INDEX |

### D.1 `consult_send_commits`（draft DDL）

```sql
-- DRAFT — NOT APPLIED
CREATE TABLE IF NOT EXISTS public.consult_send_commits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL CHECK (length(btrim(user_id)) > 0),
  report_instance_id uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 128),
  payload_fingerprint text NOT NULL,
  consult_thread_id uuid NOT NULL REFERENCES public.consult_threads(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  user_message_id uuid REFERENCES public.consult_messages(id) ON DELETE SET NULL,
  assistant_message_id uuid REFERENCES public.consult_messages(id) ON DELETE SET NULL,
  wallet_id uuid REFERENCES public.reply_ticket_wallets(id) ON DELETE SET NULL,
  wallet_before integer,
  wallet_after integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_instance_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_consult_send_commits_user_report_created
  ON public.consult_send_commits (user_id, report_instance_id, created_at DESC);
```

**Notes:**

- **`payload_fingerprint`**: internal hash · not raw message in tickets
- **`failed`**: set on RPC exception path before re-raise · allows retry with **new** key or cleanup job（P1）
- **No circular FK at create**: message ids updated after INSERT within same RPC transaction

### D.2 Ledger extension + CHECK relaxation（draft DDL）

```sql
-- DRAFT — NOT APPLIED
ALTER TABLE public.reply_wallet_ledgers
  ADD COLUMN IF NOT EXISTS consult_commit_id uuid
  REFERENCES public.consult_send_commits(id) ON DELETE SET NULL;

-- Drop + recreate CHECK (name from catalog at apply time)
-- Prior rule: reply_consume requires reply_session_id IS NOT NULL
-- New rule:
--   reply_consume => delta < 0 AND (reply_session_id IS NOT NULL OR consult_commit_id IS NOT NULL)
--   included_grant / purchase_grant => delta > 0 (unchanged)
--   recovery_adjust / admin_adjust (unchanged)

CREATE INDEX IF NOT EXISTS idx_reply_wallet_ledgers_consult_commit
  ON public.reply_wallet_ledgers (consult_commit_id)
  WHERE consult_commit_id IS NOT NULL;
```

**Compatibility:** existing **`reply_consume`** rows with **`reply_session_id`** remain valid · no backfill required for consult path launch.

### D.3 Migration preflight guards（Human · before apply）

| Guard | Source |
|-------|--------|
| S-5 metrics | `m55_backend_commerce_contract_c_readonly_preflight_v1.sql` §1 |
| **`rpc_consult_reply_commit_exists = false`** | §5 |
| **`consult_send_commits` absent** | information_schema |
| **`consult_commit_id` absent** | information_schema |
| Cap / dual-wallet | §2–§3 |

---

## E. RPC candidate design（draft · aligns IMPLEMENTATION-PLANNING §E）

**Function:** `public.m55_consult_reply_commit`  
**Runtime:** `SECURITY DEFINER` · `service_role` only

### E.1 Parameters

| Param | Type | Notes |
|-------|------|-------|
| `p_user_id` | text | Clerk user |
| `p_report_instance_id` | uuid | scoped wallet key · required |
| `p_consult_thread_id` | uuid | existing thread row |
| `p_idempotency_key` | text | client header |
| `p_user_message` | text | 10–500 |
| `p_assistant_message` | text | 1–1000 |
| `p_message_created_at` | timestamptz | default `now()` |

### E.2 Transaction steps（fixed order）

1. Validate args
2. **`consult_send_commits` FOR UPDATE** by `(user_id, report_instance_id, idempotency_key)`
3. Replay / conflict / pending handling
4. **`consult_threads` FOR UPDATE** · ownership
5. **`reply_ticket_wallets` FOR UPDATE** where `(user_id, report_instance_id)` · `status='active'` · `available_count>0` · **`report_instance_id IS NOT NULL`**
6. INSERT user + assistant **`consult_messages`**
7. UPDATE wallet decrement
8. INSERT **`reply_wallet_ledgers`** `reply_consume` · `consult_commit_id` · `delta=-1`
9. UPDATE **`consult_threads`** display sync from wallet
10. UPDATE commit row **`succeeded`** · store message ids + wallet before/after
11. RETURN jsonb `{ ok, mode, consumption_applied, wallet_before, wallet_after, thread_state, thread_credits_remaining }`

### E.3 Error codes（frozen）

`INVALID_ARGUMENT` · `IDEMPOTENCY_CONFLICT` · `COMMIT_IN_PROGRESS` · `THREAD_NOT_FOUND` · `THREAD_USER_MISMATCH` · `WALLET_NOT_FOUND` · `WALLET_NOT_ACTIVE` · `WALLET_NO_BALANCE` · `FORBIDDEN_NULL_SCOPE`

### E.4 Idempotency semantics

| Case | RPC behavior |
|------|----------------|
| First success | `mode=consumed` · `consumption_applied=true` |
| Retry same key + same fingerprint | `mode=replay` · `consumption_applied=false` |
| Same key · different fingerprint | `IDEMPOTENCY_CONFLICT` |
| Concurrent duplicate | `pending` row · `COMMIT_IN_PROGRESS` |

---

## F. Route refactor plan（`/api/room/core/send`）

| # | Before | After |
|---|--------|-------|
| **F-1** | No idempotency header | Require **`X-Idempotency-Key`** · 400 if missing |
| **F-2** | Pre-RPC message INSERT | **Removed** · messages only in RPC |
| **F-3** | Inline `consumeWallet()` UPDATE | **Removed** |
| **F-4** | Post-consume thread UPDATE in route | **Removed** · RPC owns display sync |
| **F-5** | AI before DB | **Unchanged** · AI success → RPC only |
| **F-6** | `reconcile_needed` on thread fail | **Removed** · atomic RPC |
| **F-7** | Error mapping | Map RPC `error_code` → HTTP per IMPLEMENTATION-PLANNING §H.3 |

**Pre-RPC read-only wallet check:** retain for fast 403 before LLM cost · must not mutate.

---

## G. UI idempotency plan（`ConsultRoom.tsx`）

| # | Change |
|---|--------|
| **G-1** | Generate **`crypto.randomUUID()`** per new send composition |
| **G-2** | Pass **`X-Idempotency-Key`** on `fetch('/api/room/core/send')` |
| **G-3** | On network failure retry: **reuse same key** + same message snapshot |
| **G-4** | On user edits message before retry: **new key** |
| **G-5** | Replace **`MAX_CREDITS = 3`** purchase copy with **`REPLY_TICKET_TOTAL_CAP_PER_REPORT = 5`** |
| **G-6** | Display **`wallet.available_count`** / totals from GET · not thread cap authority |
| **G-7** | Keep client **`sendLock`** as UX guard · server idempotency is authority |

---

## H. GET / cap=5 plan（`/api/room/core`）

| # | Change |
|---|--------|
| **H-1** | Remove **`MAX_CREDITS = 3`** as spend authority |
| **H-2** | Import **`REPLY_TICKET_TOTAL_CAP_PER_REPORT`** for display cap only |
| **H-3** | Wallet query: **always** filter `report_instance_id = ownership.reportInstanceId` when owned |
| **H-4** | If `reportInstanceId` missing: **`has_wallet_row=false`** · **`effective_credits_remaining=0`** |
| **H-5** | Remove user_id-only wallet fallback |
| **H-6** | Assistant-count reconcile: **secondary** · log probe on divergence · prefer wallet SSOT |
| **H-7** | Response fields stable · document removal of **`reconcile_needed`** on send only |

---

## I. Test matrix（post C-D-EXEC · no live checkout）

| ID | Scenario | Expected |
|----|----------|----------|
| **T-1** | Safety block before RPC | no wallet change · no ledger · no messages |
| **T-2** | Validation fail（length） | no RPC |
| **T-3** | LLM / output safety fail | no RPC |
| **T-4** | Successful send | 2 messages · wallet--1 · 1 `reply_consume` · `consult_commit_id` set |
| **T-5** | Duplicate same idempotency key | single consume · replay response |
| **T-6** | Same key · different payload | **409 IDEMPOTENCY_CONFLICT** |
| **T-7** | Missing idempotency header | **400** |
| **T-8** | Inactive / missing scoped wallet | RPC error · no consume |
| **T-9** | Null-scope wallet only | **not selected** · FORBIDDEN_NULL_SCOPE / WALLET_NOT_FOUND |
| **T-10** | GET after send | `effective_credits_remaining` = wallet · cap display **5** |
| **T-11** | Postflight SQL | `rpc_consult_reply_commit_exists=true` · S-5 still **0** active null |

**Environments:** staging shadow first · Production only after **C-D-EXEC GO** · no Stripe live pay.

---

## J. Stop conditions

| # | Condition | When |
|---|-----------|------|
| **C-MP-S-1** | S-5 regression on pre-apply preflight | before DB apply |
| **C-MP-S-2** | Migration apply inside **MIGRATION-PLANNING** gate | gate violation |
| **C-MP-S-3** | App deploy before RPC exists on target DB | **STOP** · broken send |
| **C-MP-S-4** | Partial apply without rollback plan | **STOP** |
| **C-MP-S-5** | Direct wallet UPDATE remains in send after deploy claimed | **STOP** |
| **C-MP-S-6** | Ledger CHECK relaxed without `consult_commit_id` NOT NULL rule for consult consumes | **STOP** |
| **C-MP-S-7** | Live checkout / VERIFY-C in same window | **STOP** |

---

## K. C-D-EXEC gate split（apply vs deploy）

### K.1 Recommended sub-gates

| Sub-gate | Scope | Mutation | Human GO |
|----------|-------|----------|----------|
| **C-D-EXEC-PLANNING** | Human execution packet · rollback · window | **no** | — |
| **C-D-EXEC-DB** | Apply migration on **m55-soul-core** | **yes** · DDL + RPC | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC go`** |
| **C-D-EXEC-APP** | Deploy **`main`** with send/GET/UI refactor | **yes** · code | same GO · **after DB** or **same window** |
| **C-POSTFLIGHT-R** | C postflight SQL + attestation | **no** | — |

### K.2 Single maintenance window order

| Step | Action |
|------|--------|
| **0** | Re-run `m55_backend_commerce_contract_c_readonly_preflight_v1.sql` · **STOP** on S-5/cap |
| **1** | Apply migration（§D）· record boolean/count confirmations only |
| **2** | Verify `rpc_consult_reply_commit_exists=true` |
| **3** | Deploy app commit with route/UI/GET changes |
| **4** | Smoke: staging or controlled Production send test（no checkout） |
| **5** | Run postflight SQL · open **C-POSTFLIGHT-R** |

**Ordering rule:** **DB before app** OR **atomic same window** — never app-first.

### K.3 Rollback boundary

| Layer | Rollback |
|-------|----------|
| **App** | Redeploy prior **`6ce7002`** artifact · restores direct UPDATE path |
| **DB** | Separate explicit GO · DROP FUNCTION + DROP TABLE + restore CHECK · **no DELETE of wallet rows** |
| **Ledger rows created post-launch** | **`recovery_adjust`** policy · separate ops gate |

---

## L. No-mutation confirmation

| Action | Status |
|--------|--------|
| migration file creation | **no** |
| code edit | **no** |
| Production DML / DDL apply | **no** |
| commit / push / deploy / env / Stripe | **no** |
| live checkout / webhook / VERIFY-C | **HOLD** |
| raw ID recording | **no** |

---

## M. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING`** | **CLOSED** GREEN @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION`** | **CLOSED** GREEN |
| **3** | **`BACKEND-COMMERCE-CONTRACT-C-D-EXEC-DB`** | **HOLD** · **`C-D-EXEC go`** |

**Human GO phrase（C-D-EXEC only · not authorized here）:**

```text
BACKEND-COMMERCE-CONTRACT-C-D-EXEC go
```

---

## N. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-MIGRATION-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-PLANNING-001`** | D-EXEC Human packet |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-HUMAN-R-001`** | Pre-C baseline |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-IMPLEMENTATION-PLANNING-001`** | RPC spec |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-B3-S5-COMBINED-POSTFLIGHT-R-001`** | S-5 anchor |

---

## O. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | MIGRATION-PLANNING GREEN @ **`6ce7002`** · candidate design reviewed |
