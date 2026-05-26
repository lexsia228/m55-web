# Phase BACKEND-COMMERCE-CONTRACT-C-CONTROLLED-CONSULT-SEND-SMOKE-PLANNING — Smoke plan（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **BACKEND-COMMERCE-CONTRACT-C-CONTROLLED-CONSULT-SEND-SMOKE-PLANNING** |
| **Title** | **Authenticated consult send smoke — idempotency · wallet · ledger · no checkout** |
| **Classification** | **Category 1 / planning only / no-mutation** |
| **Verdict** | **`BACKEND_COMMERCE_CONTRACT_C_CONTROLLED_CONSULT_SEND_SMOKE_PLANNING_GREEN_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-CONTROLLED-CONSULT-SEND-SMOKE-PLANNING-001`** |
| **Date** | **2026-05-23** |
| **Deploy anchor** | **`4dcd856`** · Production **`https://m55-webv2.vercel.app`** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_POSTFLIGHT_R_GREEN_NO_MUTATION`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R-001`** |
| **Execution** | **HOLD** · legacy owner path **ABANDONED** · superseded by **`FRESH-VALIDATION-PATH-PLANNING`** @ **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-FRESH-VALIDATION-PATH-PLANNING-001`** |
| **VERIFY-C / live checkout / webhook** | **HOLD** |

**Planning GREEN.** Execution packet frozen · **no send · no checkout · no DB write in this gate.**

---

## B. Smoke preconditions

| # | Precondition | Required |
|---|--------------|----------|
| **P-1** | **C-POSTFLIGHT-R** GREEN · Contract-C objects LIVE | **yes** |
| **P-2** | Human test account: **owned DTR** · **`dtr_unlock_state = owned`** | **yes** |
| **P-3** | Scoped wallet **`status = active`** · **`available_count >= 1`** | **yes** |
| **P-4** | **`report_instance_id`** present on wallet row | **yes** |
| **P-5** | S-5 metrics **0** on pre-smoke SQL §1 | **yes** |
| **P-6** | POSTFLIGHT-R baseline recorded | **yes** |
| **P-7** | No concurrent checkout / webhook / unrelated DML | **yes** |
| **P-8** | OpenAI configured on Production（send route AI phase） | **yes** |

**Account selection:** Human-owned Production account with visible **`/dtr/core`** consult room · **no raw IDs in SSOT/ticket public copy** · use role label only（e.g. **`owned-test-operator`**）.

---

## C. Exact execution packet（Human · single window）

| Step | Action | Mutation |
|------|--------|----------|
| **0** | Confirm Supabase = **m55-soul-core** · app = **`4dcd856`** | **no** |
| **1** | Run pre-smoke SQL §0–§3 · record counts | **no** |
| **2** | Sign in · open **`/dtr/core`** | **no** |
| **3** | **`GET /api/room/core`** · record **`wallet.available_count`** · **`effective_credits_remaining`**（counts only） | **no** |
| **4** | Select theme · compose **safe prompt** §D · note idempotency key source（browser network） | — |
| **5** | **First send** · **`POST /api/room/core/send`** with **`X-Idempotency-Key`** | **yes** · 1 consume |
| **5b** | Expect **HTTP 200** · response includes **`reply`** · **`thread`** · **`consumption_applied=true`** | observe |
| **6** | Run post-smoke SQL §3 · compare deltas §F | **no** |
| **7** | **Idempotency replay** · same key + same body · expect **200** · **`consumption_applied=false`** | **no** additional consume |
| **8** | Re-run SQL §3 · counts **unchanged** vs step 6 | **no** |
| **9** | **Optional:** safety-block send §E · expect **422** · SQL unchanged | **no** consume |
| **10** | Open **`CONTROLLED-CONSULT-SEND-SMOKE-R`** attestation SSOT | **no** |

**Forbidden:** Stripe checkout · payment · webhook replay · VERIFY-C · env change · second distinct send in same window（unless explicitly scoped as retry-fail recovery）.

---

## D. Safe test prompt（fixed template · ≥10 chars · report-scoped）

**UI path:** `/dtr/core` → theme **`役割・裁量`** → minimal supplementary none → send once.

**Composed message（copy-paste safe · no safety triggers · no medical/legal/investment · no crisis language）:**

```text
【テーマ】役割・裁量

保存版レポートの「強みが活きやすい場面」の章を読み返しました。日常の仕事で、その強みを意識するうえで最初に整えるべき点を、レポートの範囲内で整理してください。
```

**Validation:** total length **10–500** · passes ConsultRoom theme requirement · scoped to owned report content.

**Do not use:** random chat · unrelated topics · urgency/shame wording · content likely to trigger **`422 blocked`**.

---

## E. Safety-block control（optional · same window · no consume）

| Step | Action | Expected |
|------|--------|----------|
| **SB-1** | Attempt send with known high-risk pattern message（internal ops list only · **not in public SSOT**） | **422** · **`error=blocked`** |
| **SB-2** | Pre/post SQL §3 counts | **identical** to pre-smoke |
| **SB-3** | **`GET /api/room/core`** wallet counts | **unchanged** vs step 3 |

**Note:** If safety-block step risks operator discomfort, defer to separate ops-only gate · **first-send success is P0**.

---

## F. Pre-smoke / post-smoke SQL metrics

**SQL file:** `scripts/sql/production/m55_backend_commerce_contract_c_controlled_consult_send_smoke_readonly_v1.sql`

### F.1 Pre-smoke（§1–§3 · record before send）

| Metric | POSTFLIGHT-R anchor | Pre-smoke expected |
|--------|--------------------:|-------------------:|
| **`ledger_reply_consume_total`** | **4** | **4** |
| **`ledger_reply_consume_with_consult_commit_id`** | **0** | **0** |
| **`consult_send_commits_total`** | **0** | **0** |
| **`consult_send_commits_succeeded`** | **0** | **0** |
| **`consult_send_commits_pending`** | **0** | **0** |
| **`consult_send_commits_failed`** | **0** | **0** |
| **`wallets_null_status_active`** | **0** | **0** |
| **`wallets_cap_violation_rows`** | **0** | **0** |
| **`scoped_wallets_active_available_gt_0`** | **≥ 1** | **≥ 1** |

**App-layer pre-record（Human ticket · counts only）:**

| Field | Source |
|-------|--------|
| **`wallet_available_before`** | **`GET /api/room/core`** → **`wallet.available_count`** |
| **`effective_credits_before`** | **`GET /api/room/core`** → **`effective_credits_remaining`** |

### F.2 Post-smoke（after first successful send · §3 re-run）

| Metric | Expected delta vs pre-smoke |
|--------|----------------------------|
| **`ledger_reply_consume_total`** | **+1** → **5** |
| **`ledger_reply_consume_with_consult_commit_id`** | **+1** → **1** |
| **`consult_send_commits_total`** | **+1** → **1** |
| **`consult_send_commits_succeeded`** | **+1** → **1** |
| **`consult_send_commits_pending`** | **0** |
| **`consult_send_commits_failed`** | **0** |
| **`scoped_active_available_sum`** | **-1**（valid when single test user consumes in window） |
| **S-5 §1 metrics** | **unchanged 0** |

**App-layer post-record:**

| Field | Expected |
|-------|----------|
| **`wallet_available_after`** | **`wallet_available_before - 1`** |
| **`effective_credits_after`** | **`effective_credits_before - 1`** |
| **HTTP response** | **200** · **`consumption_applied=true`** |

### F.3 Post-idempotency-replay（§5 · counts unchanged vs F.2）

| Metric | Expected delta vs post-first-send |
|--------|----------------------------------|
| All §3 SQL counts | **0** |
| HTTP response | **200** · **`consumption_applied=false`** · **`mode=replay`** |

---

## G. Idempotency retry plan

| # | Rule |
|---|------|
| **G-1** | Capture **`X-Idempotency-Key`** from first send network request（Human ticket private note · not SSOT） |
| **G-2** | Replay **`POST /api/room/core/send`** with **identical JSON body** + **same header** |
| **G-3** | Tools: browser devtools replay · or scripted curl with Clerk session cookie（ops-only · no secrets in SSOT） |
| **G-4** | Expect RPC **`mode=replay`** · no second wallet decrement |
| **G-5** | SQL §3 counts **frozen** after replay |
| **G-6** | Changing message body with same key → **409** **`IDEMPOTENCY_CONFLICT`**（optional negative test · **no extra consume**） |

---

## H. Expected deltas summary

```
Pre-smoke anchor (POSTFLIGHT-R):
  ledger_reply_consume_total = 4
  ledger_reply_consume_with_consult_commit_id = 0
  consult_send_commits_succeeded = 0

After exactly one successful send:
  ledger_reply_consume_total = 5                    (+1)
  ledger_reply_consume_with_consult_commit_id = 1   (+1)
  consult_send_commits_succeeded = 1                (+1)
  wallet.available_count (test user) = before - 1   (-1)

After idempotency replay:
  all SQL counts unchanged vs post-first-send
```

**Historical note:** pre-C consult consumes without ledger remain · **not repaired** by smoke · **`scoped_wallets_consumed_without_reply_consume_ledger`** may stay **> 0** until C-12.

---

## I. STOP conditions

| # | Condition | Action |
|---|-----------|--------|
| **C-SMOKE-S-1** | Pre-smoke S-5 / cap FAIL | **STOP** · no send |
| **C-SMOKE-S-2** | Test wallet **`available_count = 0`** | **STOP** · pick different account or abort |
| **C-SMOKE-S-3** | Send **200** but SQL deltas not **+1 exactly** | **STOP** · ops review · no second send |
| **C-SMOKE-S-4** | Idempotency replay changes SQL counts | **STOP** |
| **C-SMOKE-S-5** | **`consult_commit_id` ledger delta ≠ 1** | **STOP** |
| **C-SMOKE-S-6** | Safety-block send consumes wallet | **STOP** · incident |
| **C-SMOKE-S-7** | Checkout / payment / webhook in window | **STOP** · gate violation |
| **C-SMOKE-S-8** | Missing **`X-Idempotency-Key`** returns non-400 | **STOP** · wrong deploy |
| **C-SMOKE-S-9** | Execution inside **PLANNING** gate | **STOP** |

---

## J. Rollback / support boundary

| Layer | Policy |
|-------|--------|
| **Single smoke consume** | **Irreversible without ops GO** · acceptable test cost（1 ticket） |
| **Bad double consume** | **STOP** · **`recovery_adjust`** ledger policy · separate ops gate |
| **App rollback** | Does not undo DB consume · RPC path remains |
| **DB rollback** | **Not in smoke scope** · separate catastrophic GO |
| **Evidence** | pre/post SQL counts · HTTP status codes · **`consumption_applied` boolean** · no raw IDs |

---

## K. No-mutation confirmation（planning gate）

| Action | Status |
|--------|--------|
| Authenticated consult send executed | **no** |
| Production DB write（beyond future authorized smoke） | **no** |
| checkout / payment / webhook / VERIFY-C | **no** |
| env / Stripe change | **no** |
| Production delete | **no** |
| raw ID recording | **no** |

---

## L. Recommended next gate

| Priority | Gate | Mutation |
|----------|------|----------|
| **1** | **`BACKEND-COMMERCE-CONTRACT-C-CONTROLLED-CONSULT-SEND-SMOKE`** | **yes** · 1 authorized send + replay |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-CONTROLLED-CONSULT-SEND-SMOKE-R`** | **no** · attestation close |
| **3** | **Contract-C D-EXEC window close** | **no** |
| **4** | VERIFY-C / live checkout | **HOLD** |

**Human GO phrase（execution · not authorized here）:**

```text
BACKEND-COMMERCE-CONTRACT-C-CONTROLLED-CONSULT-SEND-SMOKE go
```

---

## M. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-CONTROLLED-CONSULT-SEND-SMOKE-PLANNING-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R-001`** | Baseline anchor |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-D-EXEC-APP-001`** | Deploy **`4dcd856`** |

---

## N. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | SMOKE-PLANNING GREEN · packet frozen |
