# Phase 5-6H-5Z-I-V-L — Vercel–Clerk env correction planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-L Vercel–Clerk env correction planning gate**

本条は **`5Z-I-V-K`** で確認された **Vercel Production + `pk_test_` publishable** および **duplicate same-key Clerk app config** に対する **env correction / canonicalization 計画**（docs-only）。**env 変更・redeploy・削除・DB write・runner・code 変更なし**。**§B SELECT 再開なし**。**通常開発フロー解放なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-K`** | **`DUPLICATE_CLERK_READONLY_DIAGNOSTIC_GREEN_DEV_KEY_ON_PRODUCTION_CONFIRMED`** |
| **Primary** | **`VERCEL_PRODUCTION_USES_DEV_TEST_CLERK_KEY_CONFIRMED`** |
| **Secondary** | **`DUPLICATE_CLERK_CONFIG_CONFIRMED_SAME_PUBLISHABLE_KEY`** + **`CLERK_APPS_SEPARATE_BUT_KEY_REUSED`** |
| **Production-bound winner** | **`conflict` / `unresolved`** |
| **§B SELECT** | **blocked** |
| **Normal dev flow** | **blocked** |
| **本条** | **planning only — no mutation** |

**Work anchor：** **`4b68fcc7c4809326667abe133071a2db64a32f88`** — **`docs: diagnose duplicate clerk app config readonly`**（**`5Z-I-V-K`**）。

**Registry：** `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md`

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-L-VERCEL-CLERK-ENV-CORRECTION-PLAN-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-K-DUPLICATE-CLERK-APP-CONFIG-READONLY-DIAGNOSTIC-001`** | diagnostic |
| **`M55-EVID-20260518-5Z-I-V-J-DUPLICATE-CLERK-APP-CONFIG-CONFLICT-DIAGNOSTIC-PLAN-001`** | conflict plan |
| **`M55-EVID-20260518-5Z-I-V-I-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-001`** | exact key |

**Full publishable key／full secret／full user_id／email／session：** **記録しない**。

---

## 4. `5Z-I-V-K` facts（planning input — redacted）

| Field | Value |
|-------|--------|
| **Vercel publishable exists** | **yes** |
| **prefix** | **`pk_test_`** |
| **suffix** | **`ZXYk`** |
| **secret exists** | **yes** |
| **env scope** | **unclear** |
| **`M55-core`** | separate card **yes**；domain **content-snake-42…**；prod warning **yes**；**pk_test_/ZXYk**；same key **yes** |
| **`M55-Official`** | separate card **yes**；domain **whole-halibut-25…**；prod warning **yes**；**pk_test_/ZXYk**；same key **yes** |
| **both dev/test** | **yes** |
| **`pk_live_` visible** | **no** |

---

## 5. A. Canonicalization decision candidates（options only — not executed）

### Option 1 — Keep dev/test key temporarily（known-risk）

| Aspect | Detail |
|--------|--------|
| **Action** | Retain current **`pk_test_`** on Vercel Production；strict registry/preflight only |
| **Use** | Immediate unlock **diagnosis only** after **explicit exception** gate |
| **Benefit** | No user_id churn short-term |
| **Risk** | Production-like traffic on **test** publishable；identity ambiguity persists |
| **Blocked** | Calling environment **production-grade**；automatic winner confirmation |

### Option 2 — Clerk Production instance + `pk_live_` migration

| Aspect | Detail |
|--------|--------|
| **Action** | Create/confirm proper Clerk **Production** instance；obtain **`pk_live_`** + matching secret；update Vercel Production **later under explicit GO** |
| **Benefit** | Aligns with production governance |
| **Risk** | **Clerk user IDs may change**；DB **`user_id` orphan** risk for entitlements/snapshots/wallets |
| **Blocked** | Agent env edit；redeploy without GO；blind copy of **`user_36xz`** artifacts |

### Option 3 — Canonicalize one existing app；quarantine the other

| Aspect | Detail |
|--------|--------|
| **Action** | Pick **`M55-core` OR `M55-Official`** as production **candidate** after instance proof；**HOLD_QUARANTINE** the other |
| **Benefit** | Reduces dual-app confusion |
| **Risk** | Still **`pk_test_`** unless real Production instance exists；cannot claim production-bound without **`pk_live_`** |
| **Blocked** | Winner without exact non-conflicting key evidence |

### Option 4 — Delay env correction；map current dev/test users first

| Aspect | Detail |
|--------|--------|
| **Action** | Complete **UI unlock / ownership mapping** on current dev/test Clerk；plan migration later |
| **Benefit** | Short-term **`human-ui-current-user`** / §B path clarity possible |
| **Risk** | Long-term governance incomplete；technical debt |
| **Blocked** | §B SELECT without explicit unblock gate；normal dev flow release |

**No option auto-selected** — **`5Z-I-V-M`** capability check required first.

---

## 6. B. Required preflight before any future env correction

| # | Check |
|---|--------|
| **1** | Exact current Vercel env values **backed up by Human**（not AI） |
| **2** | Current Clerk app/instance **identified**（redacted IDs only in SSOT） |
| **3** | Target Clerk app/instance **identified** |
| **4** | Target uses **`pk_live_`** confirmed（prefix class only in SSOT） |
| **5** | **`CLERK_SECRET_KEY` same-app** confirmed（yes/no — no secret value） |
| **6** | **`human-ui-current-user`** mapping assessed |
| **7** | **`user_36xz`** repair mapping assessed |
| **8** | DB artifact ownership impact assessed（entitlements/snapshots/wallets） |
| **9** | **Rollback plan** exists（**CONTROL-12**） |
| **10** | **No raw key** in SSOT/chat |
| **11** | **Redeploy** planned as **separate** explicit gate |

---

## 7. C. User ID / DB impact（planning — fixed）

| Statement | Policy |
|-----------|--------|
| **Clerk app/instance change may change Clerk user IDs** | **yes** — plan for migration or preserve-instance path |
| **Supabase app tables store Clerk `userId` strings** | **confirmed** |
| **Env correction may orphan** entitlements / snapshots / wallets | **high risk** without migration plan |
| **`user_36xz` repair artifacts** | **do not blindly copy or mutate** |
| **Before env correction, choose path** | **(1)** preserve current instance + fix ownership mapping，**OR** **(2)** migrate users/artifacts via **separate planning gate** |

**§B SELECT:** remains **blocked** until Clerk winner + env decision path unblocked.

---

## 8. D. Recommended immediate path（no auto-decision）

| Step | Gate |
|------|------|
| **1** | **`5Z-I-V-L`** records this plan（**done**） |
| **2** | **`5Z-I-V-M`** Human dashboard Clerk **production instance capability** check |
| **3** | Then Human chooses: **temporary dev/test exception** OR **production migration plan** |
| **4** | **No env change** until **explicit GO** execution gate |

---

## 9. E. Guardrail updates（registry）

| ID | Title |
|----|-------|
| **W-14** | Vercel Production uses **`pk_test_`** |
| **W-15** | Clerk production instance absent / **`pk_live_` not visible** |
| **W-16** | Env correction may orphan DB **`user_id`** |
| **W-17** | Normal dev flow blocked until Clerk env decision |
| **CONTROL-11** | Clerk production instance / migration decision |
| **CONTROL-12** | Clerk env rollback plan |
| **CONTROL-13** | **`user_id` preservation / migration plan** |

**CONTROL-01 / CONTROL-02:** remain **open**.

---

## 10. Recommended next action

| Token | Applied |
|-------|---------|
| **`READY_FOR_CLERK_PRODUCTION_INSTANCE_CAPABILITY_CHECK_GATE`** | **yes**（recommended） |
| **`READY_FOR_TEMPORARY_DEV_AUTH_EXCEPTION_PLANNING_GATE`** | **deferred** |
| **`READY_FOR_CLERK_PRODUCTION_MIGRATION_PLANNING_GATE`** | **deferred** |
| **`VERCEL_CLERK_ENV_CORRECTION_PLANNING_INCONCLUSIVE`** | **no** |

---

## 11. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`VERCEL_CLERK_ENV_CORRECTION_PLANNING_GREEN_NO_MUTATION`** |

---

## 12. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-M` Clerk production instance capability / migration impact check gate**
  - read-only dashboard
  - **no env change**
  - **no redeploy**

**Not resumed：** §B SELECT／normal dev flow／winner confirmation.

---

## 13. 未実行事項

- **Vercel env 変更／CLERK key 差し替え**
- **redeploy／削除**
- **DB write／runner**
- **code／UI 変更**
- **full keys／secrets／user IDs**
- **§B SELECT**
- **normal dev flow release**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_L_VERCEL_CLERK_ENV_CORRECTION_PLANNING_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-L-VERCEL-CLERK-ENV-CORRECTION-PLAN-001`** |
| **Verdict** | **`VERCEL_CLERK_ENV_CORRECTION_PLANNING_GREEN_NO_MUTATION`** |
| **Next** | **`5Z-I-V-M`** production instance capability check |
