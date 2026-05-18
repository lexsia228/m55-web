# M55 Environment Identity Registry（AI-readable SSOT）

**Version:** `2026-05-18`（**preflight elevation:** `5Z-I-V-D`）
**Maintained by phase:** `5Z-I-W`
**Registry evidence:** `M55-EVID-20260518-5Z-I-W-UI-LOGIN-IDENTITY-CORRECTION-UNLOCK-001`
**Prior evidence:** `M55-EVID-20260518-5Z-I-V-F-CLERK-ALIGNMENT-RESULT-001`
**Device-origin supplement:** `M55-EVID-20260518-5Z-I-V-F-DEVICE-ORIGIN-CLERK-CONTEXT-001`（**operational context only — not Production-bound proof**）
**Checkpoint:** `docs/ssot/M55_PHASE5_6H_5Z_I_W_UI_LOGIN_IDENTITY_CORRECTION_UNLOCK_VERIFICATION_2026-05-18.md`

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
| **Clerk** | `clerk.app.production-bound` | **`M55-Official`** | **confirmed** | **yes** |
| **Clerk** | `clerk.app.M55-core` | non-Production-bound | **confirmed hold** | **no** |
| **Clerk** | `clerk.app.M55-Official` | Production-bound winner | **confirmed** | **yes** |
| **Supabase** | `supabase.project.m55-soul-core` | **`m55-soul-core` / `main` / `PRODUCTION`** | **confirmed** | **yes** |
| **Supabase** | `supabase.auth.users` | **not auth SSOT for M55** | **confirmed empty observed** | **n/a** |
| **Supabase** | `supabase.tables.user_id` | **Clerk userId (text) in app tables** | **confirmed** | **yes** |
| **Stripe** | `stripe.account.M55WEB` | **live** | **confirmed** | **yes** |
| **Stripe** | `stripe.product.DTR_CORE_STATIC_V1` | **DTR core lane** | **confirmed** | **yes** |
| **Stripe** | `stripe.webhook.canonical-intent` | **`https://m55-webv2.vercel.app/api/stripe/webhook`** | **confirmed intent** | **yes** |
| **Label** | `label.checkout.repair` | **`cs_live_JSRW`** | **reference** | **n/a** |
| **Label** | `label.user.repair` | **`user_36xz`** | **reference** | **n/a** |
| **Label** | `label.user.ui` | **`human-ui-current-user`** | **reference** | **n/a** |
| **Label** | `label.login.previous` | **`previous-private-login`** | **reference** | **n/a** |
| **Label** | `label.login.canonical` | **`canonical-normal-login`** | **reference** | **n/a** |
| **Label** | `label.login.m55-official` | **`M55-Official production user`** | **reference** | **n/a** |

---

## 1b. UI unlock verification（`5Z-I-W` — redacted）

| Check | Result | Notes |
|-------|--------|-------|
| **Login context corrected** | **yes** | **`previous-private-login` → `canonical-normal-login`** |
| **Production-bound Clerk** | **`M55-Official`** | unchanged **CANONICAL_KEEP** |
| **Paid DTR report unlock** | **yes** | shelf saved / FULL REPORT / opens / content visible |
| **Purchase CTA blocking** | **no** | under **`canonical-normal-login`** |
| **Included reply-ticket** | **visible, remaining 1** | **formal verification not done** |
| **Emails recorded** | **no** | safe labels only |

**`M55-core`:** remains **HOLD_QUARANTINE** — **not delete**.

---

## 1c. Device-origin Clerk context（`5Z-I-V-F` device-origin — operational only）

**Evidence:** `M55-EVID-20260518-5Z-I-V-F-DEVICE-ORIGIN-CLERK-CONTEXT-001`

**Does NOT determine `production_bound`.** **Does NOT contradict** §2 key-match winner when publishable match evidence exists.

| registry_id | Clerk app | device-origin | operational role | user-count tendency | proves_production_bound |
|-------------|-----------|---------------|------------------|---------------------|-------------------------|
| **DO-01** | **`M55-core`** | **Mac** | **primary active / main cockpit** | **fewer than Official** | **no** |
| **DO-02** | **`M55-Official`** | **Windows / test** | **historical test / multi-user validation** | **more than core** | **no** |

### Supabase aggregate inventory（distinct users — no full user_id）

| Metric | **count** |
|--------|-----------|
| **`entitlements` DTR_CORE distinct users** | **10** |
| **`dtr_report_snapshots` DTR_CORE distinct users** | **6** |
| **`one_time_fulfillments` distinct users** | **7** |
| **`reply_ticket_wallets` distinct users** | **10** |

**Non-inference:** user counts ≠ Production-bound Clerk app; **“Official” name ≠ Production**.

---

## 2. Clerk alignment result（redacted — `5Z-I-V-F` key match）

**`5Z-I-V-G` attempt（2026-05-18）：** **`CLERK_KEY_MATCH_HUMAN_EVIDENCE_NOT_SUBMITTED`** — template options unselected; **§2 table unchanged**. See `docs/ssot/M55_PHASE5_6H_5Z_I_V_G_EXACT_VERCEL_CLERK_PUBLISHABLE_KEY_MATCH_2026-05-18.md`.

**Human dashboard observation（§2 source — `5Z-I-V-F` alignment result）：** **SUBMITTED**（redacted yes/no only — **no full keys/secrets/user ids**）。

| Field | Value |
|-------|--------|
| **classification** | **`CLERK_PRODUCTION_BOUND_APP_CONFIRMED_M55_OFFICIAL`** ＋ **`CLERK_UI_LOGIN_USER_NOT_IN_PRODUCTION_BOUND_APP`** ＋ **`REPAIR_USER_EXISTS_IN_PRODUCTION_BOUND_APP`** |
| **gate_verdict** | **`CLERK_ALIGNMENT_CONFIRMED_USER_LOCATION_MISMATCH`** |
| **ui_unlock_primary** | **`CLERK_UI_LOGIN_USER_NOT_IN_PRODUCTION_BOUND_APP` / `USER_ID_MAPPING_MISMATCH`** |
| **full_secret_recorded** | **no** |
| **last_verified_phase** | **`5Z-I-V-F`** |

### A. Vercel Production env（§A）

| Check | Result |
|-------|--------|
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` exists** | **yes** |
| **`CLERK_SECRET_KEY` exists** | **yes** |
| **full values recorded** | **no** |

### B. Clerk publishable key app match（§B）

| Check | Result |
|-------|--------|
| **`M55-core` publishable match** | **no** |
| **`M55-Official` publishable match** | **yes** |
| **Production-bound publishable winner** | **`M55-Official`** |
| **full publishable key recorded** | **no** |

### C. Clerk secret same-app（§C）

| Check | Result |
|-------|--------|
| **secret same-app as publishable winner** | **yes** |
| **full secret recorded** | **no** |

### D. Production Environment warning（§D）

| Check | Result |
|-------|--------|
| **`No Production Environment` warning still observed** | **yes**（prior `5Z-I-V-A` — **not contradicted**） |
| **interpretation** | **risk signal only — not mutation target** |

### E. User location（§E — yes/no/unclear only）

| Check | Result |
|-------|--------|
| **`human-ui-current-user` in Production-bound Clerk app** | **no** |
| **`user_36xz` in Production-bound Clerk app** | **yes** |
| **both users in same Clerk app** | **no** |

### F. Registry classification actions（§G — applied `5Z-I-V-F`）

| Action | Status |
|--------|--------|
| **`M55-Official` → CANONICAL_KEEP（CK-11 production_bound yes）** | **applied** |
| **`M55-core` → HOLD_QUARANTINE（HQ-01）** | **applied** — **not delete** |
| **UT-01 / UT-02 removed from UNKNOWN** | **yes**（key match resolved） |

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
| **last_verified_phase** | **`5Z-I-V-F`** |
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
| **CK-11** | Clerk app **`M55-Official`**（Production-bound） | **canonical** | **yes** | **use** | **prohibited** | **Clerk** |

---

### 3.2 HOLD_QUARANTINE（混乱源 — 削除しない・誤使用防止）

| registry_id | resource | canonical_status | production_bound | ai_action_policy | deletion_policy | evidence_source |
|-------------|----------|------------------|------------------|------------------|-----------------|-------------------|
| **HQ-01** | Clerk app **`M55-core`**（non-Production-bound — **do not delete**） | **hold** | **no** | **do_not_touch** | **later_after_confirmation** | **Clerk** |
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
| **UT-01** | Vercel Production **publishable key value**（full） | **unknown** | **n/a** | **do_not_touch** | **unknown** | **Vercel** |
| **UT-02** | Vercel Production **`CLERK_SECRET_KEY` value**（full） | **unknown** | **n/a** | **do_not_touch** | **unknown** | **Vercel** |
| **UT-03** | **Browser/UI Clerk session user**（`human-ui-current-user` — not in `M55-Official`） | **unknown** | **no** | **ask_human** | **unknown** | **Clerk** |
| **UT-04** | **Any unmapped Supabase project** | **unknown** | **unclear** | **do_not_touch** | **unknown** | **Supabase** |
| **UT-05** | **Unmapped Stripe price/webhook** | **unknown** | **unclear** | **do_not_touch** | **unknown** | **Stripe** |

---

### 3.4 DELETE_LATER_CANDIDATE（本 Gate では削除しない）

| registry_id | resource | canonical_status | production_bound | ai_action_policy | deletion_policy | dependency_check |
|-------------|----------|------------------|------------------|------------------|-----------------|------------------|
| **DL-01** | **`M55-core` Clerk app**（after quarantine period — **not purge in 5Z-I-V-F**） | **delete_later_candidate** | **no** | **do_not_touch** | **later_after_confirmation** | **explicit purge gate only** |
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
| **W-01** | **Multiple Clerk app risk**（`M55-core` + `M55-Official`） | **inspect_only** | **5Z-I-V-F** |
| **W-02** | **Clerk Production-bound winner** → **`M55-Official` confirmed** | **use CK-11** | **5Z-I-V-F** |
| **W-03** | **Supabase Auth empty is non-conclusive**（Clerk is auth SSOT） | **inspect_only** | **5Z-I-V-F** |
| **W-04** | **Production domain duality**（`m55-web` vs `m55-webv2`） | **ask_human** | **5Z-I-V-F** |
| **W-05** | **Stripe live/test mode separation** | **inspect_only** | **5Z-I-V-F** |
| **W-06** | **`user_id` mapping** — **`canonical-normal-login` unlock verified**（**`5Z-I-W`**） | **inspect_only** | **5Z-I-W** |
| **W-07** | **Type label source divergence** — **CREATOR under canonical login; global SSOT open** | **inspect_only** | **5Z-I-W** |
| **W-08** | **DTR ownership gate** — **paid report unlock verified after canonical login** | **inspect_only** | **5Z-I-W** |
| **W-09** | **Device-origin vs Production-bound confusion**（Mac core vs Windows Official — **not winner proof**） | **inspect_only** | **5Z-I-V-F** |

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
11. **Do not infer Production-bound Clerk app from device-origin, app name, or Supabase distinct-user counts**（§1c）.
12. **Only Vercel Production publishable key match**（redacted — **not** device-origin）**confirms Clerk winner**.
13. **If both `M55-core` and `M55-Official` publishable match = yes → classify `conflict`** — not winner.
14. **Template yes/no/unclear left unselected = evidence not submitted**.

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
| **CONTROL-01** | Production-bound Clerk app confirmation | **closed**（**`M55-Official` — `5Z-I-V-F`**） |
| **CONTROL-02** | Vercel env-to-Clerk key preflight | **closed**（**match yes + same-app yes — `5Z-I-V-F`**） |
| **CONTROL-06** | User identity mapping preflight | **closed**（**UI unlock verified — `canonical-normal-login` / `5Z-I-W`**） |
| **CONTROL-03** | Env identity registry JSON/YAML export | **open** |
| **CONTROL-04** | Dashboard naming/tagging convention | **open** |
| **CONTROL-05** | Webhook endpoint inventory monitor | **open** |
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
| **Update after** | **`5Z-I-X`** Included reply-ticket verification planning |
| **Do not update via** | env change, deletion, redeploy, DB write, code change |

**Prior evidence chain:** `M55-EVID-20260518-5Z-I-W-*` → `M55-EVID-20260518-5Z-I-V-F-DEVICE-ORIGIN-*` → `M55-EVID-20260518-5Z-I-V-F-CLERK-ALIGNMENT-*` → `M55-EVID-20260518-5Z-I-V-E-*` → `M55-EVID-20260518-5Z-I-V-D-*` → `M55-EVID-20260518-5Z-I-V-C-*` → `M55-EVID-20260518-5Z-I-V-B-*` → `M55-EVID-20260518-5Z-I-V-A-*` → `M55-EVID-20260516-5Z-I-V-*`
