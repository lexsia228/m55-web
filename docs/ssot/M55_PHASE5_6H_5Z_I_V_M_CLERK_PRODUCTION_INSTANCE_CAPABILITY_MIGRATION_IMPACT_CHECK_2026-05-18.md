# Phase 5-6H-5Z-I-V-M — Clerk production instance capability / migration impact check gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-M Clerk production instance capability / migration impact check gate**

本条は **`5Z-I-V-L` 計画**に基づく **Production instance / `pk_live_` 利用可能性**と **migration orphan リスク**の **read-only チェック**（docs-only checkpoint）。**Clerk Production instance 作成・env 変更・redeploy・削除・DB write・runner・code 変更なし**。**§B SELECT 再開なし**。**通常開発フロー解放なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-K`** | **dev/test key on Vercel Production**（**`pk_test_`**） |
| **`5Z-I-V-L`** | **`VERCEL_CLERK_ENV_CORRECTION_PLANNING_GREEN_NO_MUTATION`** |
| **Production-bound winner** | **`conflict` / `unresolved`** |
| **本条** | **read-only capability + migration impact check** |
| **Mutation** | **none** |

**Work anchor：** **`933df021590d4b05bd572172f8f5f0448d893b80`** — **`docs: plan vercel clerk env correction`**（**`5Z-I-V-L`**）。

**Observation source：** **Chained redacted evidence**（**`5Z-I-V-K` / `5Z-I-V-L` / `5Z-I-V-A` / registry**）— **no Agent dashboard access**. **Per-app Production enablement UI path** and **billing/domain requirements** → **unclear** unless Human amends with dashboard yes/no.

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-M-CLERK-PRODUCTION-INSTANCE-CAPABILITY-MIGRATION-IMPACT-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-L-VERCEL-CLERK-ENV-CORRECTION-PLAN-001`** | correction plan |
| **`M55-EVID-20260518-5Z-I-V-K-DUPLICATE-CLERK-APP-CONFIG-READONLY-DIAGNOSTIC-001`** | diagnostic |
| **`M55-EVID-20260518-5Z-I-V-I-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-001`** | exact key |

**Full publishable key／full secret／full user_id／email／session：** **記録しない**。

---

## 4. A. Clerk Production instance capability（read-only）

| Check | **M55-core** | **M55-Official** |
|-------|--------------|------------------|
| **Production instance create/enable path visible** | **unclear**（**`No Production Environment` observed — path may exist**） |
| **`pk_live_` visible on existing app** | **no** |
| **Production setup requires paid/domain/config** | **unclear** |
| **`No Production Environment` warning continues** | **yes** |
| **raw key recorded** | **no** |

**Summary：** **`pk_live_` not currently visible** on either app. **Production instance capability** is **plausible**（Clerk UI typically offers enablement）but **not confirmed** in a dedicated Human **`5Z-I-V-M`** paste → **`unclear`** for enablement path per app.

---

## 5. B. Current dev/test instance preservation

| Check | Result |
|-------|--------|
| **Current `pk_test_` config can be maintained temporarily** | **yes**（**no env change this gate**） |
| **Current Clerk user IDs likely preserved if no migration** | **likely** |
| **UI unlock / §B diagnostic can continue on current instance without env change** | **yes**（**subject to explicit exception gate — not automatic**） |

---

## 6. C. Production migration risk（planning assessment）

| Check | Result |
|-------|--------|
| **`pk_live_` migration may change Clerk user IDs** | **yes** |
| **entitlements orphan risk** | **yes** |
| **dtr_report_snapshots orphan risk** | **yes** |
| **reply_ticket_wallets orphan risk** | **yes** |
| **`user_36xz` repair artifact migration needed if instance changes** | **yes** |
| **migration requires separate mapping plan** | **yes** |
| **rollback plan required before any future env change** | **yes**（**CONTROL-12**） |

---

## 7. D. Option comparison（`5Z-I-V-L` options）

| Option | Short-term viability | Risk | Notes |
|--------|---------------------|------|-------|
| **1** Keep **`pk_test_`** known-risk | **yes** | **high** | **temporary exception only: yes** |
| **2** Migrate to **`pk_live_` / Production** | **unclear**（**capability not confirmed**） | **high** | **requires user_id migration plan: yes** |
| **3** Canonicalize one app + quarantine | **unclear** | **high** | **still `pk_test_` risk: yes**；**quarantine labeling: yes** |
| **4** Delay env correction; user mapping first | **yes** | **medium** | **long-term governance incomplete: yes** |

---

## 8. E. Recommended path classification

| Field | Value |
|-------|--------|
| **classification** | **`READY_FOR_TEMPORARY_DEV_AUTH_EXCEPTION_USER_MAPPING_PLANNING`** |

**Rationale（planning — not execution）：**

- DB artifacts already tied to **current Clerk `user_id` strings**
- Immediate goal: **paid DTR unlock / §B diagnosis** on **current** instance
- **`pk_live_` migration** likely **orphans** entitlements / snapshots / wallets
- **Production-grade migration** → **separate later gate** with **CONTROL-15** / **CONTROL-16**

**Not selected：** `READY_FOR_CLERK_PRODUCTION_MIGRATION_PLANNING`（deferred — capability **`pk_live_` not visible**）／`READY_FOR_CLERK_APP_CANONICALIZATION_QUARANTINE_PLANNING`（deferred — winner still **conflict**）／`CLERK_PRODUCTION_CAPABILITY_INCONCLUSIVE_MORE_HUMAN_DASHBOARD_EVIDENCE_REQUIRED`（not primary — sufficient for **temporary exception planning** path）

---

## 9. Migration impact summary（fixed）

| Area | Impact |
|------|--------|
| **Clerk userId** | Instance/app migration → **IDs may change** |
| **Supabase `user_id` columns** | **Orphan risk** without migration |
| **`user_36xz`** | **No blind copy**；separate mapping if instance changes |
| **Rollback** | **Human-local env backup** required before any future correction |

---

## 10. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`CLERK_PRODUCTION_CAPABILITY_CHECK_GREEN_TEMPORARY_DEV_AUTH_EXCEPTION_RECOMMENDED`** |

**Not selected：** `CLERK_PRODUCTION_CAPABILITY_CHECK_GREEN_MIGRATION_PLANNING_REQUIRED`／`CLERK_PRODUCTION_CAPABILITY_CHECK_INCONCLUSIVE`

---

## 11. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-N` Temporary current-Clerk-instance exception / user mapping planning gate**
  - explicit scope / timebox for **dev/test auth exception**
  - path toward **`human-ui-current-user`** / §B planning **without env change**
  - **no §B SELECT until N authorizes**

**Deferred：**

- **`5Z-I-V-N` Clerk production migration planning**（after **`pk_live_` capability confirmed**）
- **Deeper Clerk dashboard evidence** if Human amends **unclear** capability rows

---

## 12. 未実行事項

- **Clerk Production instance 作成**
- **env 変更／redeploy／削除**
- **DB write／runner**
- **code／UI 変更**
- **full keys／secrets／user IDs**
- **§B SELECT**
- **normal dev flow release**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_M_CLERK_PRODUCTION_INSTANCE_CAPABILITY_MIGRATION_IMPACT_CHECK_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-M-CLERK-PRODUCTION-INSTANCE-CAPABILITY-MIGRATION-IMPACT-001`** |
| **Verdict** | **`CLERK_PRODUCTION_CAPABILITY_CHECK_GREEN_TEMPORARY_DEV_AUTH_EXCEPTION_RECOMMENDED`** |
| **Next** | **`5Z-I-V-N` temporary dev-auth exception / user mapping planning** |
