# M55 Environment Identity Registry（AI-readable SSOT）

**Version:** `2026-05-18`  
**Maintained by phase:** `5Z-I-V-C`  
**Registry evidence:** `M55-EVID-20260518-5Z-I-V-C-AI-READABLE-ENV-IDENTITY-REGISTRY-001`  
**Checkpoint:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_C_AI_READABLE_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md`

**Policy:** This document is the **AI-readable SSOT** for environment identity. **Full secrets, full user IDs, emails, sessions, cookies, tokens, and raw env dumps are never recorded here.**

---

## 1. Canonical environment map

| Layer | Resource ID | Canonical target | map_status | production_bound |
|-------|-------------|------------------|------------|------------------|
| **Vercel** | `vercel.project.m55-webv2` | **`m55-webv2`** | **confirmed** | **yes** |
| **Vercel** | `vercel.domain.primary-ui` | **`m55-webv2.vercel.app`** | **confirmed** | **yes** |
| **Vercel** | `vercel.domain.assigned-secondary` | **`m55-web.vercel.app`** | **confirmed** | **yes** |
| **Vercel** | `vercel.branch.production` | **`main`** | **confirmed** | **yes** |
| **Vercel** | `vercel.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **name confirmed; value redacted** | **confirmed** | **yes** |
| **Vercel** | `vercel.env.CLERK_SECRET_KEY` | **name confirmed; value redacted** | **confirmed** | **yes** |
| **Clerk** | `clerk.app.production-bound` | **`M55-core` OR `M55-Official` (exactly one)** | **unclear** | **unclear** |
| **Clerk** | `clerk.app.M55-core` | app name + domain TBD | **observed** | **unclear** |
| **Clerk** | `clerk.app.M55-Official` | app name + domain TBD | **observed** | **unclear** |
| **Supabase** | `supabase.project.m55-soul-core` | **`m55-soul-core` / `main` / `PRODUCTION`** | **confirmed** | **yes** |
| **Supabase** | `supabase.auth.users` | **not auth SSOT for M55** | **confirmed empty observed** | **n/a** |
| **Supabase** | `supabase.tables.user_id` | **Clerk userId (text) in app tables** | **confirmed** | **yes** |
| **Stripe** | `stripe.account.M55WEB` | **live** | **confirmed** | **yes** |
| **Stripe** | `stripe.product.DTR_CORE_STATIC_V1` | **DTR core lane** | **confirmed** | **yes** |
| **Stripe** | `stripe.webhook.canonical-intent` | **`https://m55-webv2.vercel.app/api/stripe/webhook`** | **confirmed intent** | **yes** |
| **Label** | `label.checkout.repair` | **`cs_live_JSRW`** | **reference** | **n/a** |
| **Label** | `label.user.repair` | **`user_36xz`** | **reference** | **n/a** |
| **Label** | `label.user.ui` | **`human-ui-current-user`** | **reference** | **n/a** |

---

## 2. Clerk alignment result（redacted — `5Z-I-V-C`）

### A. Vercel Production publishable key alignment

| Check | Result | Notes |
|-------|--------|-------|
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` observed on Vercel Production** | **yes**（env name） | **full value not recorded** |
| **prefix/suffix match recorded** | **no** | **Human dashboard required** |
| **Matches `M55-core`** | **unclear** | **yes/no only when Human confirms** |
| **Matches `M55-Official`** | **unclear** | **yes/no only when Human confirms** |
| **Production-bound Clerk app** | **unclear** | **winner: `M55-core` \| `M55-Official` \| unclear** |

### B. Vercel Production secret key alignment

| Check | Result | Notes |
|-------|--------|-------|
| **`CLERK_SECRET_KEY` present on Vercel Production** | **yes**（env name） | **full value not recorded** |
| **Same Clerk app as publishable key** | **unclear** | **yes/no/unclear — Human confirms** |

### C. Production UI user location

| Check | Result |
|-------|--------|
| **`human-ui-current-user` exists in Production-bound Clerk app** | **unclear** |

### D. Repair user location

| Check | Result |
|-------|--------|
| **`user_36xz` exists in Production-bound Clerk app** | **unclear** |

### Clerk frontend domains（observed — app mapping unclear）

| domain (redacted host) | linked_app | production_bound |
|------------------------|------------|------------------|
| **`content-snake-42.clerk.accounts.dev`** | **unclear** | **unclear** |
| **`whole-halibut-25.clerk.accounts.dev`** | **unclear** | **unclear** |

**Risk signal（observed, not conclusive）：** both Clerk app cards show **`No Production Environment`**.

---

## 3. AI-readable classification registry

**Legend**

| Field | Values |
|-------|--------|
| **canonical_status** | `canonical` \| `hold` \| `unknown` \| `delete_later_candidate` |
| **production_bound** | `yes` \| `no` \| `unclear` |
| **ai_action_policy** | `use` \| `inspect_only` \| `do_not_touch` \| `ask_human` |
| **deletion_policy** | `prohibited` \| `later_after_confirmation` \| `unknown` |
| **evidence_source** | `Vercel` \| `Clerk` \| `Supabase` \| `Stripe` \| `SSOT` |
| **last_verified_phase** | **`5Z-I-V-C`** |
| **full_secret_recorded** | **`no`**（always） |

---

### 3.1 CANONICAL_KEEP（削除禁止 — AI が常に優先）

| registry_id | resource | canonical_status | production_bound | ai_action_policy | deletion_policy | evidence_source |
|-------------|----------|------------------|------------------|------------------|-----------------|-------------------|
| **CK-01** | Vercel project **`m55-webv2`** | **canonical** | **yes** | **use** | **prohibited** | **SSOT** |
| **CK-02** | Domain **`m55-webv2.vercel.app`** | **canonical** | **yes** | **use** | **prohibited** | **SSOT** |
| **CK-03** | Domain **`m55-web.vercel.app`**（assigned） | **canonical** | **yes** | **use** | **prohibited** | **SSOT** |
| **CK-04** | Vercel Production env **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**（name） | **canonical** | **yes** | **inspect_only** | **prohibited** | **Vercel** |
| **CK-05** | Vercel Production env **`CLERK_SECRET_KEY`**（name） | **canonical** | **yes** | **inspect_only** | **prohibited** | **Vercel** |
| **CK-06** | Supabase **`m55-soul-core` / main / PRODUCTION** | **canonical** | **yes** | **use** | **prohibited** | **Supabase** |
| **CK-07** | Supabase app tables **`user_id` = Clerk userId** | **canonical** | **yes** | **use** | **prohibited** | **SSOT** |
| **CK-08** | Stripe **`M55WEB` live** | **canonical** | **yes** | **use** | **prohibited** | **Stripe** |
| **CK-09** | Stripe product lane **`DTR_CORE_STATIC_V1`** | **canonical** | **yes** | **use** | **prohibited** | **Stripe** |
| **CK-10** | Stripe webhook intent **`/api/stripe/webhook` on m55-webv2** | **canonical** | **yes** | **inspect_only** | **prohibited** | **SSOT** |
| **CK-11** | Clerk app **Production-bound（TBD: M55-core or M55-Official）** | **canonical** | **unclear** | **ask_human** | **prohibited** | **Clerk** |

---

### 3.2 HOLD_QUARANTINE（混乱源 — 削除しない・誤使用防止）

| registry_id | resource | canonical_status | production_bound | ai_action_policy | deletion_policy | evidence_source |
|-------------|----------|------------------|------------------|------------------|-----------------|-------------------|
| **HQ-01** | Clerk app **non-Production-bound（loser after alignment）** | **hold** | **no** | **do_not_touch** | **later_after_confirmation** | **Clerk** |
| **HQ-02** | Clerk domain **`content-snake-42.clerk.accounts.dev`** | **hold** | **unclear** | **inspect_only** | **prohibited** | **Clerk** |
| **HQ-03** | Clerk domain **`whole-halibut-25.clerk.accounts.dev`** | **hold** | **unclear** | **inspect_only** | **prohibited** | **Clerk** |
| **HQ-04** | Vercel **non-Current / Preview deployments** | **hold** | **no** | **inspect_only** | **later_after_confirmation** | **Vercel** |
| **HQ-05** | Dual domain **`m55-web` vs `m55-webv2`** routing ambiguity | **hold** | **unclear** | **ask_human** | **prohibited** | **SSOT** |
| **HQ-06** | Supabase **shadow/test project**（if present） | **hold** | **no** | **do_not_touch** | **prohibited** | **SSOT** |
| **HQ-07** | Stripe **test-mode keys / duplicate webhook endpoints** | **hold** | **no** | **inspect_only** | **later_after_confirmation** | **Stripe** |
| **HQ-08** | Safe labels **`user_36xz` / `human-ui-current-user`** | **hold** | **n/a** | **inspect_only** | **prohibited** | **SSOT** |

---

### 3.3 UNKNOWN_DO_NOT_TOUCH（参照未確定 — 変更・削除禁止）

| registry_id | resource | canonical_status | production_bound | ai_action_policy | deletion_policy | evidence_source |
|-------------|----------|------------------|------------------|------------------|-----------------|-------------------|
| **UT-01** | Clerk app **`M55-core`**（until key match） | **unknown** | **unclear** | **do_not_touch** | **unknown** | **Clerk** |
| **UT-02** | Clerk app **`M55-Official`**（until key match） | **unknown** | **unclear** | **do_not_touch** | **unknown** | **Clerk** |
| **UT-03** | Vercel Production **publishable key value** | **unknown** | **unclear** | **do_not_touch** | **unknown** | **Vercel** |
| **UT-04** | Vercel Production **`CLERK_SECRET_KEY` value** | **unknown** | **unclear** | **do_not_touch** | **unknown** | **Vercel** |
| **UT-05** | **Any unmapped Supabase project** | **unknown** | **unclear** | **do_not_touch** | **unknown** | **Supabase** |
| **UT-06** | **Unmapped Stripe price/webhook** | **unknown** | **unclear** | **do_not_touch** | **unknown** | **Stripe** |

---

### 3.4 DELETE_LATER_CANDIDATE（本 Gate では削除しない）

| registry_id | resource | canonical_status | production_bound | ai_action_policy | deletion_policy | dependency_check |
|-------------|----------|------------------|------------------|------------------|-----------------|------------------|
| **DL-01** | **Duplicate unused Clerk app** | **delete_later_candidate** | **no** | **do_not_touch** | **later_after_confirmation** | **Vercel key match + user migration check** |
| **DL-02** | **Unused Vercel deployments**（no domain） | **delete_later_candidate** | **no** | **do_not_touch** | **later_after_confirmation** | **Current Production confirmed** |
| **DL-03** | **Obsolete Stripe webhook endpoint** | **delete_later_candidate** | **no** | **do_not_touch** | **later_after_confirmation** | **canonical endpoint healthy** |
| **DL-04** | **Obsolete scratch Vercel project** | **delete_later_candidate** | **no** | **do_not_touch** | **later_after_confirmation** | **`m55-webv2` only Production** |

---

## 4. AI action policy（summary）

| Policy | Rule |
|--------|------|
| **use** | **CANONICAL_KEEP only** — auth, payment, DB, deploy targets |
| **inspect_only** | Read dashboards/SSOT; **no mutation** |
| **do_not_touch** | **No delete, no env change, no redeploy, no DB write** |
| **ask_human** | **Clerk app winner, key match, user existence** |

---

## 5. Deletion policy（summary）

| Class | deletion_policy |
|-------|-----------------|
| **CANONICAL_KEEP** | **prohibited** |
| **HOLD_QUARANTINE** | **prohibited**（label/quarantine only） |
| **UNKNOWN_DO_NOT_TOUCH** | **unknown**（treat as **prohibited**） |
| **DELETE_LATER_CANDIDATE** | **later_after_confirmation**（separate human-only purge gate） |

---

## 6. AI monitoring watchlist（high-risk)

| watch_id | signal | ai_action_policy | last_verified_phase |
|----------|--------|------------------|---------------------|
| **W-01** | **Two Clerk apps visible** | **ask_human** | **5Z-I-V-C** |
| **W-02** | **Production-bound Clerk app unclear** | **ask_human** | **5Z-I-V-C** |
| **W-03** | **Both Clerk cards: No Production Environment** | **inspect_only** | **5Z-I-V-C** |
| **W-04** | **UI user vs repair user label mismatch** | **ask_human** | **5Z-I-V** |
| **W-05** | **Supabase Auth Users empty** | **inspect_only**（**not anomaly by itself**） | **5Z-I-V-C** |
| **W-06** | **Safe labels used as DB values** | **do_not_touch** | **5Z-I-V-C** |

---

## 7. Future prompt guard（Cursor / GPT / Gemini）

**Copy into agent instructions when touching auth, payment, or DB:**

1. **Before touching auth/payment/DB, check `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md`.**
2. **Use only `CANONICAL_KEEP` resources**（registry §3.1 **`CK-*`**）.
3. **`HOLD_QUARANTINE` resources are not execution targets**（§3.2 **`HQ-*`**）.
4. **`UNKNOWN_DO_NOT_TOUCH` resources must not be changed or deleted**（§3.3 **`UT-*`**）.
5. **Never infer production identity from Supabase Auth Users** — **Clerk is auth SSOT** for M55.
6. **Never use safe labels**（`user_36xz`, `human-ui-current-user`, `cs_live_JSRW`）**as DB query values**.
7. **Full IDs/secrets remain human-local only** — record **prefix/suffix, yes/no/unclear** in SSOT only.
8. **`DELETE_LATER_CANDIDATE` purge requires explicit human-only gate** — not agent execution.

---

## 8. Full IDs / secrets policy

| Item | Recorded in this registry |
|------|---------------------------|
| **CLERK_SECRET_KEY / publishable key full value** | **no** |
| **STRIPE_SECRET_KEY / whsec** | **no** |
| **SUPABASE_SERVICE_ROLE_KEY** | **no** |
| **full user_id / email / session** | **no** |
| **raw env dump** | **no** |
| **full_secret_recorded** | **no**（all rows） |

---

## 9. Registry maintenance

| Field | Value |
|-------|--------|
| **Update after** | **`5Z-I-V-D`** Human dashboard Clerk alignment |
| **Do not update via** | env change, deletion, redeploy, DB write, code change |

**Prior evidence chain:** `M55-EVID-20260518-5Z-I-V-B-*` → `M55-EVID-20260518-5Z-I-V-A-*` → `M55-EVID-20260516-5Z-I-V-*`
