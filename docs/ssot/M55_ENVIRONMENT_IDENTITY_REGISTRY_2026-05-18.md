# M55 Environment Identity Registry（AI-readable SSOT）

**Version:** `2026-05-18`（**preflight elevation:** `5Z-I-V-D`）
**Maintained by phase:** `5Z-I-V-E`
**Registry evidence:** `M55-EVID-20260518-5Z-I-V-E-HUMAN-DASHBOARD-CLERK-KEY-MATCH-001`
**Prior evidence:** `M55-EVID-20260518-5Z-I-V-D-CLERK-ALIGNMENT-PLATFORM-BENCHMARK-001`
**Checkpoint:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_E_HUMAN_DASHBOARD_CLERK_KEY_MATCH_CONFIRMATION_2026-05-18.md`

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

## 2. Clerk alignment result（redacted — `5Z-I-V-E`）

**Human dashboard observation in `5Z-I-V-E`:** **NOT SUBMITTED with gate commit** — Agent は dashboard 非アクセス。**match／winner／user location はすべて `unclear`**。

| Field | Value |
|-------|--------|
| **classification** | **`CLERK_PRODUCTION_BOUND_APP_STILL_UNCLEAR`** |
| **gate_verdict** | **`CLERK_ALIGNMENT_STILL_UNCLEAR_HUMAN_DASHBOARD_REQUIRED`** |
| **full_secret_recorded** | **no** |
| **last_verified_phase** | **`5Z-I-V-E`** |

### A. Vercel Production env（§A）

| Check | Result |
|-------|--------|
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` exists** | **unclear** |
| **`CLERK_SECRET_KEY` exists** | **unclear** |
| **full values recorded** | **no** |

### B. Clerk publishable key app match（§B）

| Check | Result |
|-------|--------|
| **`M55-core` publishable match** | **unclear** |
| **`M55-Official` publishable match** | **unclear** |
| **Production-bound publishable winner** | **unclear** |
| **full publishable key recorded** | **no** |

### C. Clerk secret same-app（§C）

| Check | Result |
|-------|--------|
| **secret same-app as publishable winner** | **unclear** |
| **full secret recorded** | **no** |

### D. Production Environment warning（§D）

| Check | Result |
|-------|--------|
| **`No Production Environment` warning still observed** | **yes**（prior `5Z-I-V-A`） |
| **interpretation** | **risk signal only — not mutation target** |

### E. User location（§E — yes/no/unclear only）

| Check | Result |
|-------|--------|
| **`human-ui-current-user` in Production-bound Clerk app** | **unclear** |
| **`user_36xz` in Production-bound Clerk app** | **unclear** |
| **both users in same Clerk app** | **unclear** |

### F. Registry classification actions（§G）

| Action | Status |
|--------|--------|
| **Winner → CANONICAL_KEEP（CK-11 production_bound yes）** | **not applied**（winner unclear） |
| **Loser → HOLD_QUARANTINE（HQ-01）** | **not applied**（winner unclear） |
| **Both apps remain UNKNOWN_DO_NOT_TOUCH（UT-01, UT-02）** | **yes** |

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
| **last_verified_phase** | **`5Z-I-V-E`** |
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

## 6. AI monitoring watchlist（high-risk — mandatory preflight read）

| watch_id | signal | ai_action_policy | last_verified_phase |
|----------|--------|------------------|---------------------|
| **W-01** | **Multiple Clerk app risk**（`M55-core` + `M55-Official`） | **ask_human** | **5Z-I-V-E** |
| **W-02** | **Clerk Production-bound winner unclear** | **ask_human** | **5Z-I-V-E** |
| **W-03** | **Supabase Auth empty is non-conclusive**（Clerk is auth SSOT） | **inspect_only** | **5Z-I-V-D** |
| **W-04** | **Production domain duality**（`m55-web` vs `m55-webv2`） | **ask_human** | **5Z-I-V-D** |
| **W-05** | **Stripe live/test mode separation** | **inspect_only** | **5Z-I-V-D** |
| **W-06** | **`user_id` mapping risk**（repair vs UI Clerk user） | **ask_human** | **5Z-I-V-D** |
| **W-07** | **Type label source divergence**（shelf vs core preset） | **inspect_only** | **5Z-I-V-D** |
| **W-08** | **DTR ownership gate locked-after-repair risk** | **ask_human** | **5Z-I-V-D** |

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
9. **Mandatory first-read:** all auth/payment/DB gates must read this registry before execution（**`5Z-I-V-D` preflight elevation**）.
10. **Machine-checkable export pending** — see **CONTROL-03**（§10）.

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

## 9. Missing controls backlog（`5Z-I-V-D` — not implemented this gate）

| control_id | title | status |
|------------|-------|--------|
| **CONTROL-01** | Production-bound Clerk app confirmation | **open**（**`5Z-I-V-E` Human observation pending**） |
| **CONTROL-02** | Vercel env-to-Clerk key preflight | **open**（**`5Z-I-V-E` Human observation pending**） |
| **CONTROL-03** | Env identity registry JSON/YAML export | **open** |
| **CONTROL-04** | Dashboard naming/tagging convention | **open** |
| **CONTROL-05** | Webhook endpoint inventory monitor | **open** |
| **CONTROL-06** | User identity mapping preflight | **open** |
| **CONTROL-07** | DB read-only artifact verification templates | **open** |
| **CONTROL-08** | DTR type label SSOT alignment plan | **open** |
| **CONTROL-09** | Drift detection checklist | **open** |
| **CONTROL-10** | Incident/postmortem template formalization | **open** |

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_D_CLERK_ALIGNMENT_AND_PLATFORM_BENCHMARK_2026-05-18.md` §6.

---

## 10. Registry maintenance

| Field | Value |
|-------|--------|
| **Role** | **Production preflight ledger**（auth/payment/DB gates mandatory first-read） |
| **Update after** | **`5Z-I-V-F`** Deeper Human dashboard Clerk alignment（redacted yes/no submission） |
| **Do not update via** | env change, deletion, redeploy, DB write, code change |

**Prior evidence chain:** `M55-EVID-20260518-5Z-I-V-E-*` → `M55-EVID-20260518-5Z-I-V-D-*` → `M55-EVID-20260518-5Z-I-V-C-*` → `M55-EVID-20260518-5Z-I-V-B-*` → `M55-EVID-20260518-5Z-I-V-A-*` → `M55-EVID-20260516-5Z-I-V-*`
