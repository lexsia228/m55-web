# M55 Environment Identity Registry（AI-readable SSOT）

**Version:** `2026-05-18`（**preflight elevation:** `5Z-I-V-D`）
**Maintained by phase:** `5Z-I-W`
**Registry evidence:** `M55-EVID-20260518-5Z-I-W-UI-LOGIN-IDENTITY-CORRECTION-UNLOCK-001`
**Production UI execution:** `M55-EVID-20260518-5Z-I-V-AC-CANONICAL-PRODUCTION-UI-VERIFICATION-EXECUTION-001`（**§2y**）
**Deploy execution:** `M55-EVID-20260518-5Z-I-V-AB-PRODUCTION-DEPLOYMENT-PROMOTION-EXECUTION-001`（**§2x**）
**Deploy plan:** `M55-EVID-20260518-5Z-I-V-AA-PRODUCTION-DEPLOYMENT-PROMOTION-PLAN-001`（**§2w**）
**Production UI plan:** `M55-EVID-20260518-5Z-I-V-Z-CANONICAL-PRODUCTION-UI-VERIFICATION-DEPLOYMENT-DECISION-PLAN-001`（**§2v**）
**UI verify execution:** `M55-EVID-20260518-5Z-I-V-Y-HUMAN-UI-VERIFICATION-EXECUTION-001`（**§2u**）
**UI verify plan:** `M55-EVID-20260518-5Z-I-V-X-HUMAN-UI-VERIFICATION-PLAN-001`（**§2t**）
**Execution evidence:** `M55-EVID-20260518-5Z-I-V-W-SNAPSHOT-ROUTE-READ-PATH-IMPLEMENTATION-EXECUTION-001`（**§2s**）
**Prior evidence:** `M55-EVID-20260518-5Z-I-V-V-SNAPSHOT-ROUTE-READ-PATH-IMPLEMENTATION-PLAN-001`（**impl plan — §2r**）
**Code-fix plan:** `M55-EVID-20260518-5Z-I-V-U-SNAPSHOT-LOOKUP-ROUTE-READ-PATH-SNAPSHOTREADY-CODE-FIX-PLAN-001`（§2q）
**SELECT:** `M55-EVID-20260518-5Z-I-V-T-ENTITLEMENT-DISCREPANCY-OWNERSHIP-FALLBACK-READONLY-SELECT-001`（§2p）
**Plan:** `M55-EVID-20260518-5Z-I-V-S-ENTITLEMENT-ROW-DISCREPANCY-OWNERSHIP-FALLBACK-DIAGNOSTIC-PLAN-001`（§2o）
**SELECT:** `M55-EVID-20260518-5Z-I-V-R-PRODUCT-RIGHT-SNAPSHOT-READONLY-SELECT-001`（§2n）
**Gate trace:** `M55-EVID-20260518-5Z-I-V-Q-OWNERSHIP-GATE-READ-PATH-READONLY-DIAGNOSTIC-001`（§2m）
**Plan:** `M55-EVID-20260518-5Z-I-V-P-OWNERSHIP-GATE-READ-PATH-SNAPSHOT-LOOKUP-DIAGNOSTIC-PLAN-001`（§2l）
**§B execution:** `M55-EVID-20260518-5Z-I-V-O-HUMAN-UI-USER-ROWCOUNT-READONLY-SELECT-001`（§2k）
**Exception:** `M55-EVID-20260518-5Z-I-V-N-TEMPORARY-CURRENT-CLERK-INSTANCE-USER-MAPPING-EXCEPTION-PLAN-001`（§2j）
**Check:** `M55-EVID-20260518-5Z-I-V-M-CLERK-PRODUCTION-INSTANCE-CAPABILITY-MIGRATION-IMPACT-001`（§2i）
**Plan:** `M55-EVID-20260518-5Z-I-V-L-VERCEL-CLERK-ENV-CORRECTION-PLAN-001`（§2h）
**Diagnostic:** `M55-EVID-20260518-5Z-I-V-K-DUPLICATE-CLERK-APP-CONFIG-READONLY-DIAGNOSTIC-001`（§2g）
**Plan:** `M55-EVID-20260518-5Z-I-V-J-DUPLICATE-CLERK-APP-CONFIG-CONFLICT-DIAGNOSTIC-PLAN-001`（§2f）
**Exact key:** `M55-EVID-20260518-5Z-I-V-I-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-001`（§2d）
**Plan:** `M55-EVID-20260518-5Z-I-V-H-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-PLAN-001`（§2c）
**Conflict source:** `M55-EVID-20260518-5Z-I-V-G-EXACT-VERCEL-CLERK-KEY-MATCH-001`（§2b）
**Superseded:** `M55-EVID-20260518-5Z-I-V-F-CLERK-ALIGNMENT-RESULT-001`（§2a historical only）
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
| **Clerk** | `clerk.app.production-bound` | **duplicate publishable key**（**`5Z-I-V-I` — both full eq yes**） | **severe_conflict** | **unclear** |
| **Clerk** | `clerk.app.M55-core` | **full equality yes** — **not winner** | **severe_conflict** | **unclear** |
| **Clerk** | `clerk.app.M55-Official` | **full equality yes** — **not winner** | **severe_conflict** | **unclear** |
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
| **Production-bound Clerk** | **`conflict` / unresolved**（**`5Z-I-V-G`** — **not `M55-Official` until `5Z-I-V-H`**） | **see §2b** |
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

## 2. Clerk alignment result（redacted）

### 2a. Historical — `5Z-I-V-F` alignment result（**superseded for `production_bound`**）

**Status:** **SUPERSEDED** by **§2b `5Z-I-V-G` conflict** — **do not use `M55-Official` as Production-bound winner.**

| Field | Prior value（historical only） |
|-------|-------------------------------|
| **classification** | **`CLERK_PRODUCTION_BOUND_APP_CONFIRMED_M55_OFFICIAL`**（**withdrawn**） |
| **gate_verdict** | **`CLERK_ALIGNMENT_CONFIRMED_USER_LOCATION_MISMATCH`**（**withdrawn**） |

**Source doc:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_F_CLERK_ALIGNMENT_RESULT_2026-05-18.md`

---

### 2b. Authoritative — `5Z-I-V-G` publishable key match（**conflict correction**）

**Evidence:** `M55-EVID-20260518-5Z-I-V-G-EXACT-VERCEL-CLERK-KEY-MATCH-001`

**Prior pass:** **`CLERK_KEY_MATCH_HUMAN_EVIDENCE_NOT_SUBMITTED`** → **Human resubmitted** → **both apps match yes**.

| Field | Value |
|-------|--------|
| **classification** | **`CLERK_PUBLISHABLE_KEY_MATCH_CONFLICT`** |
| **gate_verdict** | **`CLERK_ALIGNMENT_BLOCKED_KEY_CONFLICT`** |
| **Production-bound winner** | **`conflict` / `unresolved`** |
| **Human winner submitted** | **`M55-core`** — **rejected**（registry dual-match rule） |
| **full_secret_recorded** | **no** |
| **last_verified_phase** | **`5Z-I-V-G`** |

#### A. Vercel Production env

| Check | Result |
|-------|--------|
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` exists** | **yes** |
| **`CLERK_SECRET_KEY` exists** | **yes** |
| **full values recorded** | **no** |

#### B. Clerk publishable key app match

| Check | Result |
|-------|--------|
| **`M55-core` publishable match** | **yes** |
| **`M55-Official` publishable match** | **yes** |
| **Production-bound publishable winner** | **`conflict`**（**not `M55-core`** / **not `M55-Official`**） |
| **full publishable key recorded** | **no** |

#### C. Clerk secret same-app

| Check | Result |
|-------|--------|
| **secret same-app as winner** | **yes**（**non-dispositive** — winner **conflict**） |
| **full secret recorded** | **no** |

#### D. User location（observed — **not winner-scoped**）

| Check | Result |
|-------|--------|
| **`human-ui-current-user` in winner app** | **yes**（**non-dispositive**） |
| **`user_36xz` in winner app** | **yes**（**non-dispositive**） |
| **both users in same Clerk app** | **yes**（**non-dispositive**） |

#### E. Registry classification actions（`5Z-I-V-G` conflict correction）

| Action | Status |
|--------|--------|
| **CK-11 `M55-Official` production_bound yes** | **reverted → `unclear`** |
| **HQ-01 `M55-core` production_bound no** | **reverted → `unclear`** |
| **CONTROL-01 / CONTROL-02** | **reopened**（blocked by conflict） |
| **§B `human-ui-current-user` SELECT** | **not resumed** |

---

### 2c. Planned exact key diagnostic（`5Z-I-V-H` — planning — **executed `5Z-I-V-I`**）

**Evidence:** `M55-EVID-20260518-5Z-I-V-H-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-PLAN-001`

**Status:** **EXECUTED** — see **§2d** for Human result.

**Production-bound winner:** **`conflict` / `unresolved`**（unchanged — **no winner confirmed in this gate**）.

**Exact comparison protocol（human-local — no raw key）：**

| Compare target | Record fields |
|----------------|---------------|
| Vercel Production `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **exists: yes/no/unclear** |
| vs **`M55-core`** | **first 8 / last 6 / full equality: yes/no/unclear each** |
| vs **`M55-Official`** | **first 8 / last 6 / full equality: yes/no/unclear each** |
| **raw key in SSOT/chat** | **prohibited** |

**Decision（`5Z-I-V-I` applies — planning reference）：**

| core full eq | official full eq | Outcome |
|--------------|------------------|---------|
| yes | no | winner **`M55-core`** |
| no | yes | winner **`M55-Official`** |
| yes | yes | **severe duplicate/config conflict** |
| no | no | **third app / stale Vercel env** |
| unclear | * | **inconclusive** |

**Post-winner only（`5Z-I-V-I`）：** secret same-app + user location（safe labels, **no full IDs**）.

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_H_EXACT_CLERK_KEY_CONFLICT_DIAGNOSTIC_PLANNING_2026-05-18.md`

**CONTROL-01 / CONTROL-02:** **open**（blocked until `5Z-I-V-I` winner）.

**§B SELECT:** **blocked**（**duplicate conflict — §2d**）.

---

### 2d. Authoritative — `5Z-I-V-I` exact key diagnostic execution

**Evidence:** `M55-EVID-20260518-5Z-I-V-I-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-001`

| Field | Value |
|-------|--------|
| **classification** | **`SEVERE_DUPLICATE_CONFIG_CONFLICT`** |
| **gate_verdict** | **`CLERK_ALIGNMENT_BLOCKED_DUPLICATE_PUBLISHABLE_KEY_CONFLICT`** |
| **Production-bound winner** | **`conflict` / `unresolved`** |
| **`M55-core` winner** | **rejected** |
| **`M55-Official` winner** | **rejected** |
| **last_verified_phase** | **`5Z-I-V-I`** |
| **full_secret_recorded** | **no** |

#### Exact comparison（redacted）

| Check | Result |
|-------|--------|
| **Vercel publishable key exists** | **yes** |
| **raw key shared** | **no** |
| **`M55-core` first 8 / last 6 / full equality** | **yes / yes / yes** |
| **`M55-Official` first 8 / last 6 / full equality** | **yes / yes / yes** |
| **Decision（both full eq yes）** | **`SEVERE_DUPLICATE_CONFIG_CONFLICT`** |

#### Secret / user（non-dispositive）

| Check | Submitted | Treatment |
|-------|-----------|-----------|
| **`CLERK_SECRET_KEY` exists** | **yes** | recorded |
| **secret same-app as winner** | **yes** | **non-dispositive** |
| **`human-ui-current-user` in winner app** | **yes** | **non-dispositive** |
| **`user_36xz` in winner app** | **yes** | **non-dispositive** |
| **both users same app** | **yes** | **non-dispositive** |

#### Registry actions（`5Z-I-V-I`）

| Action | Status |
|--------|--------|
| **CK-11 / HQ-01 `production_bound`** | **remain `unclear`** |
| **CONTROL-01 / CONTROL-02** | **remain open** |
| **§B SELECT** | **remain blocked** |
| **W-10 dual-match** | **active** |
| **W-11 exact duplicate** | **active** |

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_I_EXACT_CLERK_KEY_CONFLICT_DIAGNOSTIC_EXECUTION_2026-05-18.md`

---

### 2e. Redacted key evidence summary（`5Z-I-V-J` — AI monitoring）

**Raw key / secret / full user_id：** **not recorded**.

| Field | Value |
|-------|--------|
| **Vercel Production publishable exists** | **yes** |
| **first 8** | **`pk_test_`** |
| **suffix label** | **`ZXYk`**（human-redacted） |
| **`M55-core` first8 / last6 / full equality** | **yes / yes / yes** |
| **`M55-Official` first8 / last6 / full equality** | **yes / yes / yes** |
| **Production-bound winner** | **`conflict` / `unresolved`** |

**Signal（planning only）：** **`pk_test_` on Production env name** → investigate **H3/H4** at **`5Z-I-V-K`**（read-only）.

---

### 2f. Conflict decision table + duplicate diagnostic plan（`5Z-I-V-J`）

**Evidence:** `M55-EVID-20260518-5Z-I-V-J-DUPLICATE-CLERK-APP-CONFIG-DIAGNOSTIC-PLAN-001`

**Gate verdict（planning）：** **`READY_FOR_DUPLICATE_CLERK_APP_CONFIG_CONFLICT_READONLY_DIAGNOSTIC_GATE`**

#### Conflict decision table（fixed）

| core full eq | official full eq | Outcome | Winner |
|--------------|------------------|---------|--------|
| yes | no | single-app | **`M55-core`**（if later confirmed） |
| no | yes | single-app | **`M55-Official`**（if later confirmed） |
| **yes** | **yes** | **`SEVERE_DUPLICATE_CONFIG_CONFLICT`** | **none**（**current**） |
| no | no | third / stale Vercel | none |
| unclear | * | inconclusive | none |

#### Diagnostic hypotheses（H1–H7）

| ID | Summary |
|----|---------|
| **H1** | Dashboard context confusion |
| **H2** | Clerk app duplication / clone |
| **H3** | Vercel env copied/stale |
| **H4** | Dev/test key reused on Production |
| **H5** | Human comparison context error |
| **H6** | Clerk project structure misunderstanding |
| **H7** | Registry historical winner pollution |

**Execution deferred:** **`5Z-I-V-K`** read-only app/instance/context checks（**no raw values**）.

**Registry posture（unchanged）：**

| Item | Status |
|------|--------|
| **CK-11 / HQ-01 `production_bound`** | **unclear** |
| **CONTROL-01 / CONTROL-02** | **open** |
| **W-10 / W-11** | **active** |
| **W-12 J-level plan** | **active** |
| **§B SELECT** | **blocked** |
| **Normal dev flow** | **not unlocked** |

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_J_DUPLICATE_CLERK_APP_CONFIG_CONFLICT_DIAGNOSTIC_PLANNING_2026-05-18.md`

---

### 2g. Read-only diagnostic execution（`5Z-I-V-K` — authoritative diagnostic）

**Evidence:** `M55-EVID-20260518-5Z-I-V-K-DUPLICATE-CLERK-APP-CONFIG-READONLY-DIAGNOSTIC-001`

| Field | Value |
|-------|--------|
| **gate_verdict** | **`DUPLICATE_CLERK_READONLY_DIAGNOSTIC_GREEN_DEV_KEY_ON_PRODUCTION_CONFIRMED`** |
| **primary classification** | **`VERCEL_PRODUCTION_USES_DEV_TEST_CLERK_KEY_CONFIRMED`** |
| **secondary** | **`DUPLICATE_CLERK_CONFIG_CONFIRMED_SAME_PUBLISHABLE_KEY`** + **`CLERK_APPS_SEPARATE_BUT_KEY_REUSED`** |
| **Production-bound winner** | **`conflict` / `unresolved`**（**unchanged**） |
| **last_verified_phase** | **`5Z-I-V-K`** |

#### A. Vercel env scope（redacted）

| Check | Result |
|-------|--------|
| **publishable exists** | **yes** |
| **environment scope** | **unclear** |
| **prefix class** | **`pk_test_`** |
| **suffix** | **`ZXYk`** |
| **secret exists** | **yes** |
| **secret scope** | **unclear** |

#### B–C. Per-app identity（redacted）

| App | frontend domain | prod warning | prefix | suffix | same key |
|-----|-----------------|--------------|--------|--------|----------|
| **`M55-core`** | **content-snake-42…** | **yes** | **`pk_test_`** | **`ZXYk`** | **yes** |
| **`M55-Official`** | **whole-halibut-25…** | **yes** | **`pk_test_`** | **`ZXYk`** | **yes** |

#### D. Separate-apps summary

| Check | Result |
|-------|--------|
| **separate app cards** | **yes** |
| **different domains** | **yes** |
| **same publishable key** | **yes** |
| **both dev/test instance risk** | **yes** |
| **`pk_live_` visible** | **no** |

#### H1–H7（summary）

| H | Result |
|---|--------|
| **H1** | not supported |
| **H2** | supported |
| **H3** | unclear |
| **H4** | **supported** |
| **H5** | not supported |
| **H6** | supported |
| **H7** | not supported |

**Registry posture：** CK-11/HQ-01 **`unclear`**；CONTROL-01/02 **open**；W-10/W-11/W-12 **active**；W-13 **`pk_test_` on Production**；§B **blocked**；normal dev **not unlocked**.

**Next：** **`5Z-I-V-L` Vercel–Clerk env correction planning**（**no env change until GO**）.

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_K_DUPLICATE_CLERK_APP_CONFIG_READONLY_DIAGNOSTIC_2026-05-18.md`

---

### 2h. Vercel–Clerk env correction planning（`5Z-I-V-L` — no mutation）

**Evidence:** `M55-EVID-20260518-5Z-I-V-L-VERCEL-CLERK-ENV-CORRECTION-PLAN-001`

| Field | Value |
|-------|--------|
| **gate_verdict** | **`VERCEL_CLERK_ENV_CORRECTION_PLANNING_GREEN_NO_MUTATION`** |
| **recommended next** | **`READY_FOR_CLERK_PRODUCTION_INSTANCE_CAPABILITY_CHECK_GATE`** → **`5Z-I-V-M`** |
| **Production-bound winner** | **`conflict` / `unresolved`**（unchanged） |
| **env correction executed** | **no** |

**Correction options（not selected）：** Option 1 known-risk retain **`pk_test_`** / Option 2 **`pk_live_` migration** / Option 3 canonicalize one app + quarantine / Option 4 delay + user mapping first.

**User ID / DB impact：** Clerk instance change → **userId churn risk**；Supabase tables use Clerk **`user_id`** strings → **orphan risk** for entitlements/snapshots/wallets；**`user_36xz`** artifacts **no blind copy**.

**Preflight before future env change：** Human backup of env values；target app/instance；**`pk_live_`** confirmation；secret same-app；mapping assessment；rollback plan（**CONTROL-12**）.

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_L_VERCEL_CLERK_ENV_CORRECTION_PLANNING_2026-05-18.md`

---

### 2i. Production instance capability / migration impact（`5Z-I-V-M` — read-only）

**Evidence:** `M55-EVID-20260518-5Z-I-V-M-CLERK-PRODUCTION-INSTANCE-CAPABILITY-MIGRATION-IMPACT-001`

| Field | Value |
|-------|--------|
| **gate_verdict** | **`CLERK_PRODUCTION_CAPABILITY_CHECK_GREEN_TEMPORARY_DEV_AUTH_EXCEPTION_RECOMMENDED`** |
| **recommended path** | **`READY_FOR_TEMPORARY_DEV_AUTH_EXCEPTION_USER_MAPPING_PLANNING`** |
| **`pk_live_` visible** | **no**（both apps） |
| **Production enable path per app** | **unclear** |
| **`No Production Environment` warning** | **yes**（both） |
| **Production-bound winner** | **`conflict` / `unresolved`**（unchanged） |

**Migration impact：** userId change **yes** on migration；entitlements/snapshots/wallets orphan **yes**；**`user_36xz`** migration needed if instance changes **yes**；separate mapping plan **yes**.

**Option comparison（summary）：** Option **1** short-term **yes** / high risk；Option **2** capability **unclear** / migration **high**；Option **3** **unclear** / still **`pk_test_`**；Option **4** **yes** / governance incomplete **yes**.

**Next：** **`5Z-I-V-N` temporary dev-auth exception planning** — **completed §2j**.

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_M_CLERK_PRODUCTION_INSTANCE_CAPABILITY_MIGRATION_IMPACT_CHECK_2026-05-18.md`

---

### 2j. Temporary current-Clerk-instance exception（`5Z-I-V-N` — planning only）

**Evidence:** `M55-EVID-20260518-5Z-I-V-N-TEMPORARY-CURRENT-CLERK-INSTANCE-USER-MAPPING-EXCEPTION-PLAN-001`

| Field | Value |
|-------|--------|
| **exception name** | **`TEMPORARY_CURRENT_CLERK_INSTANCE_USER_MAPPING_EXCEPTION`** |
| **gate_verdict** | **`TEMPORARY_CURRENT_CLERK_INSTANCE_EXCEPTION_PLANNING_GREEN_NO_MUTATION`** |
| **risk level** | **high** |
| **Production auth compliance** | **unresolved**（**`pk_test_` on Production**） |
| **Production-bound winner** | **`conflict` / `unresolved`**（unchanged） |
| **§B SELECT** | **executed in `5Z-I-V-O`** — see **§2k** |
| **normal dev flow** | **not released** |

**Allowed：** `5Z-I-V` §B **`human-ui-current-user` `row_count` SELECT**（read-only）；ownership/mapping diagnosis（redacted）.

**Prohibited：** production compliance claim；public release confidence；normal dev full release；Clerk delete/purge；**`pk_live_` migration** without GO.

**§B protocol：** Human-local full `user_id`；**row_count only**；no DB write；no safe labels as DB values.

**Next：** **`5Z-I-V-O`** Human UI user row_count read-only SELECT.

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_N_TEMPORARY_CURRENT_CLERK_INSTANCE_USER_MAPPING_EXCEPTION_PLANNING_2026-05-18.md`

---

### 2k. Human UI user row_count read-only SELECT（`5Z-I-V-O` — under exception）

**Evidence:** `M55-EVID-20260518-5Z-I-V-O-HUMAN-UI-USER-ROWCOUNT-READONLY-SELECT-001`

**Exception scope:** `TEMPORARY_CURRENT_CLERK_INSTANCE_USER_MAPPING_EXCEPTION`（**`5Z-I-V-N`**）

| Field | Value |
|-------|--------|
| **safe label** | **`human-ui-current-user`** |
| **suffix evidence** | **`user_****1M65`** |
| **gate_verdict** | **`UI_USER_ROWCOUNT_READONLY_SELECT_GREEN_ARTIFACTS_FOUND_OWNERSHIP_READ_PATH_DIAGNOSTIC_REQUIRED`** |

#### Row_count（Human-local — no full user_id）

| Table / scope | **row_count** |
|---------------|---------------|
| **entitlements DTR_CORE_STATIC_V1** | **1** |
| **entitlement_rights** | **1** |
| **dtr_report_snapshots DTR_CORE_STATIC_V1** | **1** |
| **one_time_fulfillments** | **4** |
| **reply_ticket_wallets** | **1** |
| **reply_wallet_ledgers** | **1** |

#### Findings

| Token | Status |
|-------|--------|
| **`UI_USER_DTR_ARTIFACTS_FOUND`** | **yes** |
| **`USER_ID_MISMATCH_NOT_PRIMARY_BASED_ON_ROWCOUNT`** | **yes** |
| **`OTF_MULTIPLE_ROWS_FOUND_FOR_UI_USER`** | **yes** |
| **`UI_UNLOCK_STILL_REQUIRES_OWNERSHIP_READ_PATH_DIAGNOSTIC`** | **yes** |

**Next diagnostic focus：** **`5Z-I-V-P` planned** → **`5Z-I-V-Q` execution**.

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_O_HUMAN_UI_USER_ROWCOUNT_READONLY_SELECT_2026-05-18.md`

---

### 2l. Ownership / read path diagnostic planning（`5Z-I-V-P` — planning only）

**Evidence:** `M55-EVID-20260518-5Z-I-V-P-OWNERSHIP-GATE-READ-PATH-SNAPSHOT-LOOKUP-DIAGNOSTIC-PLAN-001`

| Field | Value |
|-------|--------|
| **gate_verdict** | **`READY_FOR_OWNERSHIP_GATE_READONLY_DIAGNOSTIC_EXECUTION`** |
| **primary rejected** | **`USER_ID_MISMATCH`** as sole cause |
| **artifacts** | **present**（§2k row_counts） |
| **UI state** | **locked** — ownership/read-path diagnostic required |
| **OTF** | **row_count 4** — read-only; **no cleanup** |

**Repo targets（read-only）：** `lib/m55/dtrOwnershipGate`；`lib/m55/dtrDraftDb`；`app/dtr/*`；`components/dtr/DtrShelfPanel.tsx`；`app/api/dtr/report-snapshot-ready/route.ts`.

**Hypotheses（Q classifies）：** product_id mismatch；right_key mismatch；snapshot lookup/parse；shelf/read-path；RLS/server-client；cache stale；OTF multiple rows；code bug；inconclusive.

**Next：** **`5Z-I-V-Q`** execution.

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_P_OWNERSHIP_GATE_READ_PATH_SNAPSHOT_LOOKUP_DIAGNOSTIC_PLANNING_2026-05-18.md`

---

### 2m. Ownership / read path read-only diagnostic execution（`5Z-I-V-Q`）

**Evidence:** `M55-EVID-20260518-5Z-I-V-Q-OWNERSHIP-GATE-READ-PATH-READONLY-DIAGNOSTIC-001`

| Field | Value |
|-------|--------|
| **gate_verdict** | **`OWNERSHIP_GATE_READONLY_DIAGNOSTIC_GREEN_DB_KEY_CONFIRMATION_REQUIRED`** |
| **primary root cause（repo+row_count）** | **`OWNERSHIP_GATE_RIGHT_KEY_MISMATCH`**（pending DB confirm）+ **`SNAPSHOT_LOOKUP_CONDITION_MISMATCH`**（possible） |
| **secondary** | **`REPORT_SHELF_PRODUCT_PAGE_READ_PATH_MISMATCH`**（`owned` requires **`snapshotReady`**） |
| **USER_ID_MISMATCH primary** | **rejected** |

**Repo gate order:** snapshot → rights+backing → **rights orphan (locked)** → ent active repair → locked.

**Constants:** `product_id` = **`DTR_CORE_STATIC_V1`**；`right_key` = **`m55_p:core_origin`**.

**OTF ×4:** gate uses **latest 1** row — **not** `maybeSingle` multi-row failure；breakdown SELECT still recommended.

**Next:** **`5Z-I-V-R`** product/right/snapshot redacted SELECT.

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_Q_OWNERSHIP_GATE_READ_PATH_READONLY_DIAGNOSTIC_2026-05-18.md`

---

### 2n. Product / right / snapshot read-only SELECT（`5Z-I-V-R` — updated）

**Evidence:** `M55-EVID-20260518-5Z-I-V-R-PRODUCT-RIGHT-SNAPSHOT-READONLY-SELECT-001`（**追認更新**）

| Field | Value |
|-------|--------|
| **gate_verdict** | **`PRODUCT_RIGHT_SNAPSHOT_SELECT_GREEN_ENTITLEMENT_STATUS_MISMATCH_CONFIRMED_WITH_EVIDENCE_CAVEAT`** |
| **primary** | **no active entitlement row**（**`5Z-I-V-R` ent row_count 0**） |
| **matched** | **`right_key` `m55_p:core_origin`**；snapshot **1** / **`DTR_CORE_STATIC_V1`**；OTF latest **DTR** + **`fulfilled_at` present** |
| **caveat** | **`V_O_V_R_ENTITLEMENT_ROWCOUNT_DISCREPANCY`** — **O ent 1** vs **R ent 0** |
| **suspect if UI locked** | **snapshot lookup / route read-path** |
| **agent Production SELECT** | **no** |

**Next:** **`5Z-I-V-S`** entitlement discrepancy / ownership fallback planning.

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_R_PRODUCT_RIGHT_SNAPSHOT_READONLY_SELECT_2026-05-18.md`

---

### 2o. Entitlement row discrepancy / ownership fallback diagnostic planning（`5Z-I-V-S`）

**Evidence:** `M55-EVID-20260518-5Z-I-V-S-ENTITLEMENT-ROW-DISCREPANCY-OWNERSHIP-FALLBACK-DIAGNOSTIC-PLAN-001`

| Field | Value |
|-------|--------|
| **gate_verdict** | **`READY_FOR_ENTITLEMENT_DISCREPANCY_AND_FALLBACK_READONLY_SELECT_GATE`** |
| **O/R caveat** | **O ent 1** vs **R ent 0** — **`V_O_V_R_ENTITLEMENT_ROWCOUNT_DISCREPANCY_REQUIRES_CONFIRMATION`** |
| **matched（R）** | **right_key** / **snapshot** / **OTF latest** |
| **fallback plan** | snapshot → rights+OTF → orphan；**rights+snap+OTF → should be owned** if same user |
| **hypotheses** | **H1–H6**（user_id / SQL filter / alias / status / Clerk context / timing） |
| **next execution** | **`5Z-I-V-T`** Human SELECT（same user_id；no label as SQL） |

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_S_ENTITLEMENT_ROW_DISCREPANCY_OWNERSHIP_FALLBACK_DIAGNOSTIC_PLANNING_2026-05-18.md`

---

### 2p. Entitlement discrepancy / ownership fallback read-only SELECT（`5Z-I-V-T` — updated）

**Evidence:** `M55-EVID-20260518-5Z-I-V-T-ENTITLEMENT-DISCREPANCY-OWNERSHIP-FALLBACK-READONLY-SELECT-001`（**追認更新**）

| Field | Value |
|-------|--------|
| **gate_verdict** | **`ENTITLEMENT_DISCREPANCY_SELECT_GREEN_ACTIVE_ROW_FOUND`** |
| **same-ID consistency** | **yes** |
| **matched** | **active ent** / **`m55_p:core_origin`** / **snapshot ×1** / **OTF latest DTR** |
| **O/R discrepancy** | **resolved** — **`ENTITLEMENT_ROWCOUNT_DISCREPANCY_RESOLVED_ACTIVE_ROW_FOUND`** |
| **primary suspect if UI locked** | **snapshot lookup / route / `snapshotReady`** |
| **agent Production SELECT** | **no** |

**Next:** **`5Z-I-V-U`** snapshot/route/snapshotReady code-fix planning.

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_T_ENTITLEMENT_DISCREPANCY_OWNERSHIP_FALLBACK_READONLY_SELECT_2026-05-18.md`

---

### 2q. Snapshot lookup / route read-path / snapshotReady code-fix planning（`5Z-I-V-U`）

**Evidence:** `M55-EVID-20260518-5Z-I-V-U-SNAPSHOT-LOOKUP-ROUTE-READ-PATH-SNAPSHOTREADY-CODE-FIX-PLAN-001`

| Field | Value |
|-------|--------|
| **gate_verdict** | **`SNAPSHOT_LOOKUP_ROUTE_READ_PATH_CODE_FIX_PLANNING_GREEN_NO_IMPLEMENTATION`** |
| **root suspicion** | **`SNAPSHOT_LOOKUP_ROUTE_READ_PATH_SNAPSHOTREADY_CONSUMPTION_PRIMARY`** |
| **DB prerequisites** | **matched**（**`5Z-I-V-T`**） |
| **preferred fix** | **Option 2+4**（owned+!snapshotReady UX；route unification）+ **Option 3** if snap read null |
| **next** | **implementation planning gate** — **explicit GO only** |

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_U_SNAPSHOT_LOOKUP_ROUTE_READ_PATH_SNAPSHOTREADY_CODE_FIX_PLANNING_2026-05-18.md`

---

### 2r. Snapshot route read-path implementation planning（`5Z-I-V-V`）

**Evidence:** `M55-EVID-20260518-5Z-I-V-V-SNAPSHOT-ROUTE-READ-PATH-IMPLEMENTATION-PLAN-001`

| Field | Value |
|-------|--------|
| **gate_verdict** | **`SNAPSHOT_ROUTE_READ_PATH_IMPLEMENTATION_PLANNING_GREEN_NO_CODE_CHANGE`** |
| **new file planned** | **`lib/m55/dtrShelfAccess.ts`** |
| **required touches** | **`DtrShelfPanel`** / **`/dtr`** / **`/dtr/lp`** / **`/dtr/core`** / **`processing`** / **`report-snapshot-ready` API** |
| **next** | **`5Z-I-V-W` execution** — explicit GO |

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_V_SNAPSHOT_ROUTE_READ_PATH_IMPLEMENTATION_PLANNING_2026-05-18.md`

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
| **last_verified_phase** | **`5Z-I-V-K`** |
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
| **CK-11** | Clerk app **`M55-Official`**（**winner unresolved — conflict**） | **canonical** | **unclear** | **ask_human** | **prohibited** | **Clerk** |

---

### 3.2 HOLD_QUARANTINE（混乱源 — 削除しない・誤使用防止）

| registry_id | resource | canonical_status | production_bound | ai_action_policy | deletion_policy | evidence_source |
|-------------|----------|------------------|------------------|------------------|-----------------|-------------------|
| **HQ-01** | Clerk app **`M55-core`**（**publishable match yes — not winner** — **do not delete**） | **hold** | **unclear** | **do_not_touch** | **later_after_confirmation** | **Clerk** |
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
| **UT-03** | **Browser/UI Clerk session user**（`human-ui-current-user` — **winner app unresolved**） | **unknown** | **unclear** | **ask_human** | **unknown** | **Clerk** |
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
| **W-02** | **Clerk Production-bound winner** → **`conflict` / unresolved**（**dual publishable match yes**） | **ask_human** | **5Z-I-V-G** |
| **W-03** | **Supabase Auth empty is non-conclusive**（Clerk is auth SSOT） | **inspect_only** | **5Z-I-V-F** |
| **W-04** | **Production domain duality**（`m55-web` vs `m55-webv2`） | **ask_human** | **5Z-I-V-F** |
| **W-05** | **Stripe live/test mode separation** | **inspect_only** | **5Z-I-V-F** |
| **W-06** | **`user_id` mapping** — **`canonical-normal-login` unlock verified**（**`5Z-I-W`**） | **inspect_only** | **5Z-I-W** |
| **W-07** | **Type label source divergence** — **CREATOR under canonical login; global SSOT open** | **inspect_only** | **5Z-I-W** |
| **W-08** | **DTR ownership gate** — **paid report unlock verified after canonical login** | **inspect_only** | **5Z-I-W** |
| **W-09** | **Device-origin vs Production-bound confusion**（Mac core vs Windows Official — **not winner proof**） | **inspect_only** | **5Z-I-V-F** |
| **W-10** | **Publishable dual-match conflict**（**both `M55-core` + `M55-Official` match yes**） | **ask_human** | **5Z-I-V-G** |
| **W-11** | **Exact full-equality duplicate conflict**（**Vercel key = both `M55-core` + `M55-Official` full eq yes**） | **ask_human** | **5Z-I-V-I** |
| **W-12** | **Duplicate config diagnostic executed**（**`5Z-I-V-K`**） | **inspect_only** | **5Z-I-V-K** |
| **W-13** | **Production env uses `pk_test_` publishable class**（**H4 confirmed — `5Z-I-V-K`**） | **ask_human** | **5Z-I-V-K** |
| **W-14** | **Vercel Production uses `pk_test_` publishable**（**correction required before production-grade**） | **ask_human** | **5Z-I-V-L** |
| **W-15** | **Clerk production instance absent / `pk_live_` not visible** | **ask_human** | **5Z-I-V-L** |
| **W-16** | **Env correction may orphan DB `user_id` mappings** | **do_not_touch** | **5Z-I-V-L** |
| **W-17** | **Normal dev flow blocked until Clerk env decision** | **inspect_only** | **5Z-I-V-L** |
| **W-18** | **`pk_live_` migration may orphan current Clerk user IDs** | **do_not_touch** | **5Z-I-V-M** |
| **W-19** | **Temporary dev-auth exception requires explicit scope/timebox** | **ask_human** | **5Z-I-V-M** |
| **W-20** | **Temporary dev-auth exception active**（**`TEMPORARY_CURRENT_CLERK_INSTANCE_USER_MAPPING_EXCEPTION`**） | **inspect_only** | **5Z-I-V-N** |
| **W-21** | **§B SELECT permitted read-only under exception only**（**`5Z-I-V-O` executed**） | **inspect_only** | **5Z-I-V-O** |
| **W-22** | **UI user DTR artifacts found but unlock still blocked** | **inspect_only** | **5Z-I-V-O** |
| **W-23** | **`one_time_fulfillments` multiple rows for UI user**（**row_count 4**） | **inspect_only** | **5Z-I-V-O** |
| **W-24** | **UI user artifacts present but gate may still lock** | **inspect_only** | **5Z-I-V-Q** |
| **W-25** | **OTF multiple rows — gate reads latest only** | **inspect_only** | **5Z-I-V-Q** |
| **W-26** | **Active entitlement row found**（**`5Z-I-V-T` final** — ent **1** / **active**） | **inspect_only** | **5Z-I-V-T** |
| **W-27** | **O/R entitlement discrepancy resolved**（O **1** / R **0** → T confirms **1 active**） | **inspect_only** | **5Z-I-V-T** |
| **W-28** | **OTF ×4 — latest row `DTR_CORE_STATIC_V1` matched**（**`5Z-I-V-R`**） | **inspect_only** | **5Z-I-V-R** |
| **W-29** | **`owned` + !`snapshotReady` routes to LP/purchase UX** | **inspect_only** | **5Z-I-V-Q** |
| **W-30** | **Ownership fallback artifacts matched**（ent + rights + snap + OTF latest） | **inspect_only** | **5Z-I-V-T** |
| **W-31** | **Snapshot lookup / route / `snapshotReady` consumption primary suspect** | **inspect_only** | **5Z-I-V-U** |
| **W-32** | **DB owned prerequisites matched** — implementation executed | **inspect_only** | **5Z-I-V-W** |
| **W-33** | **`snapshotReady` consumption** — unified via **`dtrShelfAccess`** | **inspect_only** | **5Z-I-V-W** |
| **W-34** | **Duplicate purchase CTA** — code regression guard in place | **inspect_only** | **5Z-I-V-W** |
| **W-35** | **`owned` + !`snapshotReady` → recovery/processing**（not unpaid LP） | **inspect_only** | **5Z-I-V-W** |
| **W-36** | **Human UI verification**（owned unlock / no duplicate CTA） | **closed** — **branch preview GREEN `5Z-I-V-Y`** | **5Z-I-V-Y** |
| **W-37** | **Human UI verification execution** | **closed** — **`UI_VERIFICATION_GREEN_SAVED_REPORT_UNLOCKED`** | **5Z-I-V-Y** |
| **W-38** | **Branch preview DTR unlock GREEN** | **closed** — **`5Z-I-V-Y`** | **5Z-I-V-Y** |
| **W-39** | **Production includes `98bcd58`** | **yes** — after **`5Z-I-V-AB`** / **`5e90199`** | **5Z-I-V-AB** |
| **W-40** | **Production deployment/promotion execution** | **closed** — **`5Z-I-V-AB`** | **5Z-I-V-AB** |
| **W-41** | **Production includes `98bcd58` + UI verified** | **closed GREEN** — **`5Z-I-V-AC`** | **5Z-I-V-AC** |
| **W-42** | **Production DTR unlock verified on canonical domain** | **closed** — **`m55-webv2.vercel.app`** | **5Z-I-V-AC** |

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
| **CONTROL-01** | Production-bound Clerk app confirmation | **open**（**blocked — `5Z-I-V-G` conflict**） |
| **CONTROL-02** | Vercel env-to-Clerk key preflight | **open**（**blocked — dual match yes — `5Z-I-V-H` required**） |
| **CONTROL-06** | User identity mapping preflight | **closed**（**UI unlock verified — `canonical-normal-login` / `5Z-I-W`**） |
| **CONTROL-03** | Env identity registry JSON/YAML export | **open** |
| **CONTROL-04** | Dashboard naming/tagging convention | **open** |
| **CONTROL-05** | Webhook endpoint inventory monitor | **open** |
| **CONTROL-07** | DB read-only artifact verification templates | **open** |
| **CONTROL-08** | DTR type label SSOT alignment plan | **open** |
| **CONTROL-09** | Drift detection checklist | **open** |
| **CONTROL-10** | Incident/postmortem template formalization | **open** |
| **CONTROL-11** | Clerk production instance / migration decision | **open**（**`5Z-I-V-L` — blocked until `5Z-I-V-M`**） |
| **CONTROL-12** | Clerk env rollback plan | **open** |
| **CONTROL-13** | **`user_id` preservation / migration plan** | **open** |
| **CONTROL-14** | Temporary auth exception decision | **planned**（**exception defined — `5Z-I-V-N`**；execution **`5Z-I-V-O`**） |
| **CONTROL-15** | Future Clerk production migration plan | **open**（deferred until **`pk_live_` confirmed**） |
| **CONTROL-16** | **`user_id` migration dry-run / preflight** | **open** |
| **CONTROL-17** | Temporary exception exit criteria | **open** |
| **CONTROL-18** | Current-Clerk user mapping result required before any repair | **row_count recorded — `5Z-I-V-O`**；repair **blocked** until **CONTROL-20** |
| **CONTROL-19** | Production auth compliance remains unresolved | **open** |
| **CONTROL-20** | Ownership gate / read-path diagnostic required | **planned** — execution **`5Z-I-V-Q`** |
| **CONTROL-21** | Ownership gate condition map required | **mapped** — **`5Z-I-V-Q`** repo trace |
| **CONTROL-22** | Product/right key/snapshot lookup read-only verification | **partial** — **`5Z-I-V-R` GREEN with caveat**；snapshot/route still suspect |
| **CONTROL-23** | Entitlement **O/R row_count discrepancy** confirmation required | **closed** — **`5Z-I-V-T`** active row found |
| **CONTROL-24** | Same-user same-query entitlement confirmation required | **closed** — same-ID **yes**；SELECT submitted |
| **CONTROL-25** | Ownership fallback path decision required | **decided** — artifacts matched；**route/read-path planning → `5Z-I-V-U`** |
| **CONTROL-26** | `5Z-I-V-T` Human SELECT evidence submission required | **closed** |
| **CONTROL-27** | Route / read-path fix plan required | **closed** — **`5Z-I-V-V`** file list approved |
| **CONTROL-28** | Owned-but-snapshot-not-ready UX decision required | **decided** — recovery/processing；no purchase CTA |
| **CONTROL-29** | Implementation file list approved | **closed** — **`5Z-I-V-V`** |
| **CONTROL-30** | No-duplicate-purchase CTA regression test required | **closed** — **branch preview Human UI `5Z-I-V-Y` GREEN** |
| **CONTROL-31** | Human UI verification required（DTR unlock post-**`5Z-I-V-W`**） | **closed** — **branch preview passed `5Z-I-V-Y`** |
| **CONTROL-32** | Canonical Production UI verification required | **closed** — **`5Z-I-V-AC`** GREEN |
| **CONTROL-33** | Canonical Production UI verification required | **closed** — **`5Z-I-V-AC`** |
| **CONTROL-34** | Deployment/promotion planning required | **closed** — **`5Z-I-V-AA`** |
| **CONTROL-35** | Production deployment execution requires explicit GO | **closed** — **`5Z-I-V-AB`** |
| **CONTROL-36** | Canonical Production UI verification execution required | **closed** — **`5Z-I-V-AC`** **`CANONICAL_PRODUCTION_UI_VERIFICATION_GREEN_SAVED_REPORT_UNLOCKED`** |
| **CONTROL-37** | Post-production stabilization / release decision required | **open** — **`5Z-I-V-AD`** |

**Detail:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_D_CLERK_ALIGNMENT_AND_PLATFORM_BENCHMARK_2026-05-18.md` §6；**`5Z-I-V-AC`:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_AC_CANONICAL_PRODUCTION_UI_VERIFICATION_EXECUTION_2026-05-18.md`；**`5Z-I-V-AB`:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_AB_PRODUCTION_DEPLOYMENT_PROMOTION_EXECUTION_2026-05-18.md`；**`5Z-I-V-AA`:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_AA_PRODUCTION_DEPLOYMENT_PROMOTION_PLANNING_2026-05-18.md`；**`5Z-I-V-Z`:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_Z_CANONICAL_PRODUCTION_UI_VERIFICATION_DEPLOYMENT_DECISION_PLANNING_2026-05-18.md`；**`5Z-I-V-Y`:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_Y_HUMAN_UI_VERIFICATION_EXECUTION_2026-05-18.md`；**`5Z-I-V-X`:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_X_HUMAN_UI_VERIFICATION_PLANNING_2026-05-18.md`；**`5Z-I-V-V`:** `docs/ssot/M55_PHASE5_6H_5Z_I_V_V_SNAPSHOT_ROUTE_READ_PATH_IMPLEMENTATION_PLANNING_2026-05-18.md`

---

## 10. Registry maintenance

| Field | Value |
|-------|--------|
| **Role** | **Production preflight ledger**（auth/payment/DB gates mandatory first-read） |
| **Update after** | **`5Z-I-V-AC`** Canonical Production UI verification execution |
| **Do not update via** | env change, deletion, redeploy, DB write, code change |

**Prior evidence chain:** `M55-EVID-20260518-5Z-I-V-V-*` → `M55-EVID-20260518-5Z-I-V-U-*` → `M55-EVID-20260518-5Z-I-V-T-*` → `M55-EVID-20260518-5Z-I-V-S-*` → `M55-EVID-20260518-5Z-I-V-R-*` → `M55-EVID-20260518-5Z-I-V-Q-*` → `M55-EVID-20260518-5Z-I-V-P-*` → `M55-EVID-20260518-5Z-I-V-O-*` → `M55-EVID-20260518-5Z-I-V-N-*` → `M55-EVID-20260518-5Z-I-V-M-*` → `M55-EVID-20260518-5Z-I-V-L-*` → `M55-EVID-20260518-5Z-I-V-K-*` → `M55-EVID-20260518-5Z-I-V-J-*` → `M55-EVID-20260518-5Z-I-V-I-*` → `M55-EVID-20260518-5Z-I-V-H-*` → `M55-EVID-20260518-5Z-I-V-G-*` → `M55-EVID-20260518-5Z-I-W-*` → `M55-EVID-20260518-5Z-I-V-F-DEVICE-ORIGIN-*` → `M55-EVID-20260518-5Z-I-V-F-CLERK-ALIGNMENT-*` → `M55-EVID-20260518-5Z-I-V-E-*` → `M55-EVID-20260518-5Z-I-V-D-*` → `M55-EVID-20260518-5Z-I-V-C-*` → `M55-EVID-20260518-5Z-I-V-B-*` → `M55-EVID-20260518-5Z-I-V-A-*` → `M55-EVID-20260516-5Z-I-V-*`
