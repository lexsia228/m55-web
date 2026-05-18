# Phase 5-6H-5Z-I-V-K — Duplicate Clerk app/config conflict read-only diagnostic execution gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-K Duplicate Clerk app/config conflict read-only diagnostic execution gate**

本条は **`5Z-I-V-J` 計画**に基づく **read-only dashboard/config 診断**の SSOT 固定。**削除・env 変更・redeploy・DB write・runner・code 変更なし**。**§B SELECT 再開なし**。**通常開発フロー解放なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-I`** | **`CLERK_ALIGNMENT_BLOCKED_DUPLICATE_PUBLISHABLE_KEY_CONFLICT`** |
| **`5Z-I-V-J`** | **`READY_FOR_DUPLICATE_CLERK_APP_CONFIG_CONFLICT_READONLY_DIAGNOSTIC_GATE`** |
| **Production-bound winner** | **`conflict` / `unresolved`** |
| **本条** | **read-only diagnostic execution**（redacted only） |
| **Mutation** | **none** |

**Work anchor：** **`014d194b80b5707c15ae4164d6ff402bcaf89c12`** — **`docs: plan duplicate clerk app config conflict diagnostic`**（**`5Z-I-V-J`**）。

**Observation source：** **Chained redacted evidence**（**`5Z-I-V-I` / `5Z-I-V-J` / `5Z-I-V-A` / registry**）— **no Agent dashboard access**. **Vercel env scope** and **app/instance redacted IDs** not re-confirmed in a separate Human paste for本条 → **`unclear`** where noted.

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-K-DUPLICATE-CLERK-APP-CONFIG-READONLY-DIAGNOSTIC-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-J-DUPLICATE-CLERK-APP-CONFIG-CONFLICT-DIAGNOSTIC-PLAN-001`** | plan |
| **`M55-EVID-20260518-5Z-I-V-I-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-001`** | exact key |
| **`M55-EVID-20260518-5Z-I-V-H-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-PLAN-001`** | comparison plan |

**Full publishable key／full secret／full user_id／email／session：** **記録しない**。

---

## 4. A. Vercel env scope / assignment（`m55-webv2`）

| Check | Result |
|-------|--------|
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` exists** | **yes** |
| **environment scope** | **unclear**（**not observed in本条 Human paste — scope confirmation pending**） |
| **visible prefix class** | **`pk_test_`** |
| **visible suffix label** | **`ZXYk`** |
| **last updated date** | **unclear** |
| **raw key recorded** | **no** |
| **`CLERK_SECRET_KEY` exists** | **yes**（prior §2b） |
| **`CLERK_SECRET_KEY` environment scope** | **unclear** |
| **raw secret recorded** | **no** |

---

## 5. B. Clerk app identity — `M55-core`

| Check | Result |
|-------|--------|
| **app visible** | **yes**（**`5Z-I-V-A`**） |
| **frontend domain** | **`content-snake-42.clerk.accounts.dev`** |
| **Production Environment warning** | **yes** |
| **publishable prefix class** | **`pk_test_`** |
| **publishable suffix label** | **`ZXYk`** |
| **app/instance id redacted** | **not visible** |
| **created/updated metadata** | **unclear** |
| **raw key recorded** | **no** |

---

## 6. C. Clerk app identity — `M55-Official`

| Check | Result |
|-------|--------|
| **app visible** | **yes**（**`5Z-I-V-A`**） |
| **frontend domain** | **`whole-halibut-25.clerk.accounts.dev`** |
| **Production Environment warning** | **yes** |
| **publishable prefix class** | **`pk_test_`** |
| **publishable suffix label** | **`ZXYk`** |
| **app/instance id redacted** | **not visible** |
| **created/updated metadata** | **unclear** |
| **raw key recorded** | **no** |

---

## 7. D. Separate-apps / same-context comparison

| Check | Result |
|-------|--------|
| **Separate dashboard app cards visible** | **yes** |
| **Different frontend domains** | **yes** |
| **Different app/instance IDs（if visible）** | **unclear** |
| **Same publishable key（redacted equality）** | **yes**（**`5Z-I-V-I` full equality both**） |
| **Share same underlying Clerk instance** | **unclear** |
| **Both are Development/test instances** | **yes**（**`pk_test_` + `No Production Environment` on both**） |
| **Either shows proper Production / `pk_live_`** | **no** |

---

## 8. E. Hypothesis assessment（H1–H7）

| ID | Assessment |
|----|------------|
| **H1** Dashboard context confusion | **not supported**（separate app names + distinct domains） |
| **H2** Clerk app clone/duplication | **supported**（two apps, **same** publishable key class/suffix） |
| **H3** Vercel env copied/stale | **unclear**（scope / updated date not confirmed） |
| **H4** Dev/test key on Production | **supported**（Vercel Production publishable **prefix `pk_test_`**） |
| **H5** Human comparison context error | **not supported**（**`5Z-I-V-I` full equality** per app） |
| **H6** Clerk project structure misunderstanding | **supported**（app vs domain vs instance not 1:1 clear） |
| **H7** Registry historical winner pollution | **not supported**（本条 uses **§2d / §2e** authoritative chain） |

---

## 9. F. Diagnostic classification

| Field | Value |
|-------|--------|
| **primary** | **`VERCEL_PRODUCTION_USES_DEV_TEST_CLERK_KEY_CONFIRMED`** |
| **secondary** | **`DUPLICATE_CLERK_CONFIG_CONFIRMED_SAME_PUBLISHABLE_KEY`** |
| **secondary** | **`CLERK_APPS_SEPARATE_BUT_KEY_REUSED`** |

**Not selected：** `CLERK_DASHBOARD_CONTEXT_CONFUSION_LIKELY`／`THIRD_APP_OR_HIDDEN_INSTANCE_SUSPECTED`／`DUPLICATE_CLERK_DIAGNOSTIC_INCONCLUSIVE`

**Production-bound winner：** **`conflict` / `unresolved`** — **no winner confirmed**（duplicate + test key on Production name does not elect `M55-core` or `M55-Official`**）.

---

## 10. G. Recommended next action

| Field | Value |
|-------|--------|
| **recommended** | **`READY_FOR_VERCEL_CLERK_ENV_CORRECTION_PLANNING_GATE`** |
| **also plan** | **`READY_FOR_CLERK_ENV_CANONICALIZATION_PLANNING_GATE`**（separate apps, shared key） |

---

## 11. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`DUPLICATE_CLERK_READONLY_DIAGNOSTIC_GREEN_DEV_KEY_ON_PRODUCTION_CONFIRMED`** |

**Also records：** **`DUPLICATE_CLERK_READONLY_DIAGNOSTIC_GREEN_DUPLICATE_CONFIG_CONFIRMED`**（same publishable key on both apps — secondary token）

---

## 12. Next

**採用（primary）：**

- **`Phase 5-6H-5Z-I-V-L` Vercel–Clerk env correction planning gate**
  - **no env change until explicit Human GO**
  - target: Production publishable **must not remain `pk_test_` class** when live traffic intended

**Also plan（secondary track）：**

- **`5Z-I-V-L` Clerk canonicalization / quarantine planning**（**`M55-core` vs `M55-Official`** — **no purge**）

**Not resumed：** **`5Z-I-V` §B** `human-ui-current-user` **`row_count` SELECT** until Clerk winner unblocked.

---

## 13. 未実行事項

- **削除／env 変更／redeploy**
- **DB write／runner**
- **code／UI 変更**
- **full keys／secrets／user IDs**
- **§B SELECT**
- **normal dev flow release**
- **winner confirmation**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_K_DUPLICATE_CLERK_APP_CONFIG_READONLY_DIAGNOSTIC_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-K-DUPLICATE-CLERK-APP-CONFIG-READONLY-DIAGNOSTIC-001`** |
| **Verdict** | **`DUPLICATE_CLERK_READONLY_DIAGNOSTIC_GREEN_DEV_KEY_ON_PRODUCTION_CONFIRMED`** |
| **Next** | **`5Z-I-V-L` Vercel–Clerk env correction planning** |
