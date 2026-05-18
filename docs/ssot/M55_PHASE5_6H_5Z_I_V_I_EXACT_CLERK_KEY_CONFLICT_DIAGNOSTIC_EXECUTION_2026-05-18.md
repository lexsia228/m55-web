# Phase 5-6H-5Z-I-V-I — Exact Clerk key conflict diagnostic execution checkpoint（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-I Exact Clerk key conflict diagnostic execution checkpoint**

本条は **`5Z-I-V-H` 計画**に基づく **human-local exact publishable key comparison 結果**の SSOT 固定。**env 変更・削除・redeploy・DB write・runner・code 変更なし**。**Supabase §B SELECT 再開なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-G`** | **dual-match conflict** recorded |
| **`5Z-I-V-H`** | **`READY_FOR_EXACT_CLERK_KEY_CONFLICT_DIAGNOSTIC_EXECUTION`** |
| **本条** | **exact comparison executed**（Human-local, redacted） |
| **Mutation** | **none** |

**Work anchor：** **`5c58de718aa2593f646ac9b70ea1848b09f7ee84`** — **`docs: plan exact clerk key conflict diagnostic`**（**`5Z-I-V-H`**）。

**Registry：** `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md` §2d

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-I-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-H-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-PLAN-001`** | plan |
| **`M55-EVID-20260518-5Z-I-V-G-EXACT-VERCEL-CLERK-KEY-MATCH-001`** | prior conflict |
| **`M55-EVID-20260518-5Z-I-V-F-DEVICE-ORIGIN-CLERK-CONTEXT-001`** | device-origin（not Production proof） |

**Full publishable key／full secret／full user_id／email／session：** **記録しない**。

---

## 4. Exact comparison result（Human-local — redacted）

### Vercel Production

| Check | Result |
|-------|--------|
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` exists** | **yes** |
| **raw key shared** | **no** |

### `M55-core`

| Check | Result |
|-------|--------|
| **first 8 match** | **yes** |
| **last 6 match** | **yes** |
| **full equality** | **yes** |

### `M55-Official`

| Check | Result |
|-------|--------|
| **first 8 match** | **yes** |
| **last 6 match** | **yes** |
| **full equality** | **yes** |

---

## 5. Decision table application

| `M55-core` full equality | `M55-Official` full equality | **Outcome** |
|--------------------------|------------------------------|-------------|
| **yes** | **yes** | **`SEVERE_DUPLICATE_CONFIG_CONFLICT`** — **not winner** |

**Rejected as Production-bound winner:**

| App | Status |
|-----|--------|
| **`M55-core`** | **rejected** |
| **`M55-Official`** | **rejected** |

**Production-bound winner:** **`conflict` / `unresolved`**

**Human final token submitted:** **`SEVERE_DUPLICATE_CONFIG_CONFLICT_RECORDED`**

---

## 6. Classification

| Field | Value |
|--------|--------|
| **classification** | **`SEVERE_DUPLICATE_CONFIG_CONFLICT`** |
| **prior `5Z-I-V-G`** | **`CLERK_PUBLISHABLE_KEY_MATCH_CONFLICT`**（dashboard dual-match — **confirmed by exact equality**） |

---

## 7. Secret / user location（non-dispositive）

**Winner = conflict** — submitted **yes** values are **recorded only as observed, not winner-scoped**.

| Check | Human submitted | **Treatment** |
|-------|-----------------|---------------|
| **`CLERK_SECRET_KEY` exists** | **yes** | recorded |
| **secret same-app as winner** | **yes** | **non-dispositive** |
| **raw secret shared** | **no** | compliant |
| **`human-ui-current-user` in winner app** | **yes** | **non-dispositive** |
| **`user_36xz` in winner app** | **yes** | **non-dispositive** |
| **both users same app** | **yes** | **non-dispositive** |
| **full user_id/email shared** | **no** | compliant |

**§B `human-ui-current-user` row_count SELECT:** **not resumed**（blocked by duplicate conflict）.

---

## 8. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`CLERK_ALIGNMENT_BLOCKED_DUPLICATE_PUBLISHABLE_KEY_CONFLICT`** |

---

## 9. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-J` Duplicate Clerk app/config conflict diagnostic planning gate**
  - whether two dashboard cards are **separate apps sharing copied keys**
  - whether one app was **duplicated/cloned**
  - whether **Vercel env is stale** or copied across apps
  - whether comparison used **wrong dashboard context**
  - which app should be **canonical keep** vs **hold quarantine**（planning only）
  - **any env correction** requires **separate Human GO** — **not this track**

**Not resumed until duplicate resolved:**

- **`5Z-I-V` §B** `human-ui-current-user` **`row_count` SELECT**

---

## 10. 未実行事項

- **削除／purge**
- **env 変更／redeploy**
- **DB write／runner**
- **code／UI 変更**
- **full keys／secrets／user IDs**
- **§B SELECT**
- **winner as `M55-core` or `M55-Official`**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_I_EXACT_CLERK_KEY_CONFLICT_DIAGNOSTIC_EXECUTION_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-I-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-001`** |
| **Classification** | **`SEVERE_DUPLICATE_CONFIG_CONFLICT`** |
| **Verdict** | **`CLERK_ALIGNMENT_BLOCKED_DUPLICATE_PUBLISHABLE_KEY_CONFLICT`** |
| **Next** | **`5Z-I-V-J`** duplicate conflict diagnostic planning |
