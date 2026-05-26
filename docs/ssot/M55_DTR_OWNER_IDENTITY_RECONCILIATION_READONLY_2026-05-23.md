# Phase DTR_OWNER_IDENTITY_RECONCILIATION_READONLY — Identity reconciliation（2026-05-23）

## A. Gate summary

| Field | Value |
|-------|--------|
| **Phase** | **DTR_OWNER_IDENTITY_RECONCILIATION_READONLY** |
| **Title** | **Production DTR owner identity reconciliation — current session Not owned vs smoke-ready DB inventory** |
| **Classification** | **Category 1 / read-only identity reconciliation / no-mutation** |
| **Verdict** | **`DTR_OWNER_IDENTITY_RECONCILIATION_BLOCKED_CURRENT_SESSION_NOT_OWNED_NO_MUTATION`** |
| **Evidence ID** | **`M55-EVID-20260523-DTR-OWNER-IDENTITY-RECONCILIATION-READONLY-001`** |
| **Date** | **2026-05-23** |
| **Target** | **m55-soul-core** Production · app **`4dcd856`** |
| **Prior gate** | **`BACKEND_COMMERCE_CONTRACT_C_CONTROLLED_CONSULT_SEND_SMOKE_PLANNING_GREEN_NO_MUTATION`** |
| **Controlled consult send smoke** | **HOLD** · legacy owner chase **ABANDONED** · see **`LEGACY-TEST-DATA-CUTOFF-POLICY-PLANNING`** |
| **DB write / checkout / VERIFY-C** | **HOLD** |

**Reconciliation BLOCKED for current browser session.** Production **does** contain smoke-ready owner candidates · current Clerk/Google session **does not match** any visible DTR owner row.

---

## B. Current session owner status

| Signal | Observed | Interpretation |
|--------|----------|----------------|
| **`GET /api/room/core`** | **403 Not owned** | **`resolveEntryReportOwnership` → `unlockState ≠ owned`** for current Clerk `userId` |
| **Consult room `/dtr/core`** | not usable for smoke | ownership gate fail-closed |
| **Operator hash match（when bound）** | **expected 0** visible snapshots · **0** smoke-ready wallets | current session ∉ Production owner set |

**Ownership resolution order（repo SSOT）：**

1. Visible **`dtr_report_snapshots`** row（`DTR_CORE_STATIC_V1` · `user_hidden_at IS NULL`）→ **owned**
2. Else **`entitlement_rights` + payment backing**（active **`entitlements`** or **`one_time_fulfillments`**）
3. Else **locked** → **`/api/room/core` Not owned**

---

## C. Production owner candidate existence（counts attested）

| Metric | Count | Smoke relevance |
|--------|------:|-----------------|
| **`dtr_owner_users`** | **10** | all DTR snapshot holders |
| **`visible_dtr_report_users`** | **6** | visible saved-report owners |
| **`scoped_wallet_users`** | **6** | scoped wallet rows |
| **`scoped_active_available_wallet_users`** | **5** | can spend |
| **`controlled_smoke_ready_users`** | **5** | visible snapshot + scoped active wallet **`available_count > 0`** |
| **`controlled_smoke_ready_wallets`** | **5** | wallet rows ready |
| **`controlled_smoke_ready_available_sum`** | **5** | total spendable tickets across ready rows |
| **`wallets_null_status_active`** | **0** | S-5 OK |
| **`wallets_cap_violation_rows`** | **0** | cap OK |

**Conclusion:** Production **has** five smoke-ready owner identities · problem is **session selection**, not missing Production data.

**Reconciliation SQL:** `scripts/sql/production/m55_dtr_owner_identity_reconciliation_readonly_v1.sql`

---

## D. Five planning questions — answers

### Q1. Which Clerk/Google account is one of the `controlled_smoke_ready_users`?

| Answer | Detail |
|--------|--------|
| **Agent/public SSOT** | **Cannot name account** · **5 candidates exist** in Production DB |
| **Human-private method** | Clerk Dashboard Production → list users → compute **`hashUserIdForLedgerLog(clerk_user_id)`** locally → match against SQL §4 **`operator_user_hash_hex16`** |
| **Safe labels only** | **`smoke-candidate-01` … `smoke-candidate-05`**（ordinal · assigned after Human hash match · **not in public SSOT until matched**） |

**First account to try:** whichever Clerk Production user yields **`operator_visible_snapshot_count = 1`** and **`operator_smoke_ready_wallet_count = 1`** in SQL §4.

### Q2. Did prior successful payment happen in Production, Preview, Shadow, or another environment?

| Classification | Likelihood | Rationale |
|----------------|------------|-----------|
| **Production (`m55-soul-core`)** | **HIGH** | **`controlled_smoke_ready_users = 5`** requires visible snapshots + scoped wallets **in this DB** · created by Production fulfillment path |
| **Preview-only payment** | **LOW for smoke-ready rows** | Preview DB ≠ Production · would not populate **`m55-soul-core`** |
| **Shadow / local** | **LOW** | same separation |
| **Wrong Stripe mode on current session** | **MEDIUM for current browser user** | user may have paid in **test** Clerk/Stripe while Production app uses **Production** Clerk |

**Human-private check:** Stripe Dashboard → filter **`checkout.session.completed`** · match **`metadata.product_id = DTR_CORE_STATIC_V1`** · compare **`user_ref_hash`** / session metadata hash to operator hex16 · **do not paste raw IDs into SSOT**.

### Q3. Is there a `checkout.session.completed` in Stripe tied to the current tested account?

| Answer | Detail |
|--------|--------|
| **For current Not-owned session** | **Likely NO Production fulfillment row** for this Clerk `user_id` · else ownership gate would not return locked |
| **Human action** | Stripe → search by **safe time window** + **amount band（¥1,000 DTR）** · verify whether **any** completed session hash matches current Clerk user |
| **If test-mode payment only** | **YES in Stripe test** · **NO in Production DB** → explains Not owned |

### Q4. Does DB entitlement/snapshot/wallet exist for that same account?

| Layer | Current tested session | Smoke-ready population |
|-------|------------------------|------------------------|
| **Visible snapshot** | **expected absent** | **5 users** |
| **Scoped active wallet** | **expected absent / not smoke-ready** | **5 wallets** |
| **`/api/room/core`** | **Not owned** | would be **owned** for matched account |

**Mismatch confirmed:** DB artifacts exist for **other** identities · **not** for current browser Clerk user.

### Q5. Is the current browser session simply the wrong account?

| Verdict | **YES — primary hypothesis H1** |
|---------|----------------------------------|
| **Confidence** | **HIGH** |
| **Supporting facts** | Not owned API · **5** unrelated smoke-ready owners in DB · common multi-Google-account operator error |
| **Secondary hypotheses** | H2 wrong Clerk instance（dev vs prod）· H3 hidden snapshot only · H4 orphan rights without snapshot（less likely given ready wallet join） |

---

## E. Likely cause classification

| ID | Cause | Likelihood | Next action |
|----|-------|------------|-------------|
| **H1** | **Wrong Google/Clerk account signed in** | **HIGH** | Sign out · try **`smoke-candidate-*`** matched account |
| **H2** | **Clerk Development session on Production app** | **MEDIUM** | Confirm Clerk app = **Production** instance on **`m55-webv2.vercel.app`** |
| **H3** | **Payment in Stripe test / Preview only** | **MEDIUM** | Human Stripe + DB hash cross-check |
| **H4** | **Snapshot hidden (`user_hidden_at` set)** for this user | **LOW** for current user | check hidden-only repurchase path |
| **H5** | **Ownership gate bug despite DB rows** | **LOW** | only if hash match shows snapshot=1 but API still Not owned |

---

## F. Next account to try（safe label only）

| Priority | Safe label | Selection rule |
|----------|------------|----------------|
| **1** | **`smoke-candidate-first-match`** | First Clerk Production user where SQL §4 returns **`operator_visible_snapshot_count = 1`** and **`operator_smoke_ready_wallet_count ≥ 1`** |
| **2** | **`smoke-candidate-second-match`** | Next distinct hash match if first fails UI sign-in |
| **Avoid** | **`current-browser-session`** | already confirmed **Not owned** |

**Procedure:**

1. Sign out all Google accounts in browser · use incognito
2. Clerk sign-in with **`smoke-candidate-first-match`** account only
3. Open **`/dtr/core`** · confirm **`GET /api/room/core` → 200** · wallet counts visible
4. Only then authorize **`CONTROLLED-CONSULT-SEND-SMOKE go`**

---

## G. Controlled smoke resume status

| Field | Status |
|-------|--------|
| **Contract-C deploy / RPC** | **READY** |
| **Production smoke-ready inventory** | **READY**（5 candidates） |
| **Current browser session** | **BLOCKED** |
| **Controlled consult send smoke** | **HOLD** until **`smoke-candidate-first-match`** session confirmed owned |

---

## H. Human-private inspection checklist（not in public SSOT）

| Surface | Check | Record in private ticket only |
|---------|-------|-------------------------------|
| **Clerk Production** | User list · instance = Production | hash hex16 per candidate |
| **Stripe** | `checkout.session.completed` · DTR SKU | hash/metadata presence booleans |
| **Supabase SQL §4** | bind `operator_user_hash_hex16` | match counts 0/1 |
| **Browser** | `/api/room/core` after switch | owned yes/no |

---

## I. No-mutation confirmation

| Action | Status |
|--------|--------|
| Production DB write | **no** |
| checkout / payment / webhook replay | **no** |
| VERIFY-C | **no** |
| env / Stripe mutation | **no** |
| Production delete | **no** |
| raw user_id / email / session / Stripe ID in SSOT | **no** |

---

## J. Recommended next gate

| Priority | Gate |
|----------|------|
| **1** | **Human session switch** · confirm owned via SQL §4 + `/api/room/core` |
| **2** | **`BACKEND-COMMERCE-CONTRACT-C-CONTROLLED-CONSULT-SEND-SMOKE`** · after owned session |
| **3** | Optional: populate **`m55_user_identity_mappings`** with safe labels（separate GO · not required for smoke if hash match suffices） |

---

## K. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260523-DTR-OWNER-IDENTITY-RECONCILIATION-READONLY-001`** | **本条** |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-CONTROLLED-CONSULT-SEND-SMOKE-PLANNING-001`** | Smoke plan HOLD |
| **`M55-EVID-20260523-BACKEND-COMMERCE-CONTRACT-C-POSTFLIGHT-R-001`** | Contract-C LIVE |

---

## L. History

| Version | Date | Note |
|---------|------|------|
| v1.0 | 2026-05-23 | BLOCKED current session · 5 smoke-ready owners exist in Production |
