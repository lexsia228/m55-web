# Phase 5-6H-5Z-I-V-H — Exact Clerk key conflict diagnostic planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-H Exact Clerk key conflict diagnostic planning gate**

本条は **human-local exact publishable key comparison 手順の docs-only 固定**。**実際の key 照合・env 変更・削除・redeploy・DB write・runner・code 変更は行わない**。**Supabase §B SELECT 再開なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-G`** | **`CLERK_ALIGNMENT_BLOCKED_KEY_CONFLICT`** — **conflict correction recorded** |
| **Publishable match submitted** | **`M55-core` yes** + **`M55-Official` yes** |
| **Production-bound winner** | **`conflict` / `unresolved`** |
| **Registry §2b** | **authoritative**（§2a **`5Z-I-V-F` superseded**） |
| **CK-11 / HQ-01** | **`production_bound` = `unclear`** |
| **CONTROL-01 / CONTROL-02** | **open** |
| **W-10** | **dual-match conflict** |
| **`5Z-I-V` §B SELECT** | **blocked** |
| **本条** | **exact redacted comparison protocol only** — **execution deferred to `5Z-I-V-I`** |

**Work anchor：** **`b5af9cf056676298f7ee1584dd2f0bb987182526`** — **`docs: record clerk key match conflict`**（**`5Z-I-V-G`**）。

**Registry：** `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md`

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-H-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-PLAN-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-G-EXACT-VERCEL-CLERK-KEY-MATCH-001`** | conflict source |
| **`M55-EVID-20260518-5Z-I-V-F-DEVICE-ORIGIN-CLERK-CONTEXT-001`** | device-origin（not Production proof） |
| **`M55-EVID-20260518-5Z-I-V-D-CLERK-ALIGNMENT-PLATFORM-BENCHMARK-001`** | benchmark |

**Raw publishable key／raw secret／full user_id／email／session／cookie／token：** **記録しない**。

---

## 4. Conflict summary（`5Z-I-V-G` facts）

| Field | Value |
|-------|--------|
| **Prior `5Z-I-V-G` pass** | **`CLERK_KEY_MATCH_HUMAN_EVIDENCE_NOT_SUBMITTED`** |
| **Updated classification** | **`CLERK_PUBLISHABLE_KEY_MATCH_CONFLICT`** |
| **Gate verdict** | **`CLERK_ALIGNMENT_BLOCKED_KEY_CONFLICT`** |
| **`M55-core` publishable match** | **yes** |
| **`M55-Official` publishable match** | **yes** |
| **Human winner submitted** | **`M55-core`** — **rejected**（registry: both yes = **conflict**） |
| **Production-bound winner** | **`conflict` / `unresolved`** |
| **Secret same-app / user location** | **non-dispositive** while winner unresolved |
| **Prior `5Z-I-V-F` / `M55-Official` winner** | **superseded — historical only** |

**Interpretation：** dashboard **yes/no match per app** は **両方 yes になり得る**（曖昧照合）。**exact full equality** で **単一 winner** を確定する必要がある。

---

## 5. Exact comparison protocol（`5Z-I-V-I` execution — human-local only）

**Execution gate：** **`5Z-I-V-I` only** — **not this gate**.

Human compares **locally on screen**（**never paste full key into chat/SSOT**）:

1. **Vercel Production** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`（project **`m55-webv2`** / **Production**）
2. **Clerk `M55-core`** Publishable key
3. **Clerk `M55-Official`** Publishable key

### 5.1 Permitted record fields（redacted only）

| Field | Allowed values |
|-------|----------------|
| **Vercel key exists** | **yes** / **no** / **unclear** |
| **`M55-core` first 8 match** | **yes** / **no** / **unclear** |
| **`M55-core` last 6 match** | **yes** / **no** / **unclear** |
| **`M55-core` full equality** | **yes** / **no** / **unclear** |
| **`M55-Official` first 8 match** | **yes** / **no** / **unclear** |
| **`M55-Official` last 6 match** | **yes** / **no** / **unclear** |
| **`M55-Official` full equality** | **yes** / **no** / **unclear** |
| **raw key shared** | **no**（required） |

**first 8 / last 6 alone are insufficient for winner** — **full equality row required** for winner branch.

### 5.2 Stop conditions

| Condition | Action |
|-----------|--------|
| **Any raw key pasted to chat/SSOT** | **STOP** — do not record key; re-run comparison locally |
| **Human lacks dashboard access** | **`CLERK_KEY_CONFLICT_NEEDS_HUMAN_DASHBOARD_ACCESS`** |
| **Comparison not performed** | **do not infer winner** |

---

## 6. Decision table（full equality authoritative）

| `M55-core` full equality | `M55-Official` full equality | **Outcome** |
|--------------------------|------------------------------|-------------|
| **yes** | **no** | **Winner: `M55-core`**（single-app） |
| **no** | **yes** | **Winner: `M55-Official`**（single-app） |
| **yes** | **yes** | **Severe duplicate/config conflict** — **not winner** |
| **no** | **no** | **Vercel key ≠ both apps** — third Clerk app or **stale env** |
| **unclear** or prefix-only mismatch | any | **`INCONCLUSIVE`** — require full equality re-check |

**Prefix/suffix only（first 8 / last 6 mismatch, full equality unclear）：** **`CLERK_EXACT_KEY_COMPARISON_INCONCLUSIVE`** — **no winner**.

**This planning gate does not apply outcomes** — **`5Z-I-V-I` records Human redacted results only**.

---

## 7. Secret same-app plan（`5Z-I-V-I` — after winner confirmed only）

| Field | When |
|-------|------|
| **`CLERK_SECRET_KEY` exists** | **yes/no/unclear** — after **single winner** from §6 |
| **secret same-app as winner** | **yes/no/unclear** |
| **raw secret shared** | **no**（required） |

**While winner = conflict / unresolved / inconclusive：** **secret same-app is non-dispositive**（same as `5Z-I-V-G`）.

---

## 8. User location plan（`5Z-I-V-I` — after winner confirmed only）

| Field | When |
|-------|------|
| **`human-ui-current-user` exists in winner app** | **yes/no/unclear** |
| **`user_36xz` exists in winner app** | **yes/no/unclear** |
| **both users same app** | **yes/no/unclear** |
| **full user_id/email shared** | **no**（required） |

**While winner unresolved：** prior `5Z-I-V-G` user-location rows remain **non-dispositive**.

---

## 9. Classification tokens（本条）

| Token | Applied |
|-------|---------|
| **`READY_FOR_EXACT_CLERK_KEY_CONFLICT_DIAGNOSTIC_EXECUTION`** | **yes**（recommended） |
| **`CLERK_KEY_CONFLICT_PLANNING_BLOCKED`** | **no** |
| **`CLERK_KEY_CONFLICT_NEEDS_HUMAN_DASHBOARD_ACCESS`** | **conditional**（if Human cannot open dashboards at `5Z-I-V-I`） |

---

## 10. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`READY_FOR_EXACT_CLERK_KEY_CONFLICT_DIAGNOSTIC_EXECUTION`** |

---

## 11. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-I` Exact Clerk key conflict diagnostic execution gate**
  - Human performs §5 comparison; records §5.1 fields only
  - **no env change / no deletion / no redeploy**

**If `5Z-I-V-I` confirms single winner:**

- Update registry §2b → winner + **close CONTROL-01/02**（redacted evidence only）
- **Resume `5Z-I-V` §B** — **`human-ui-current-user` `row_count` SELECT**（Human-local, redacted）

**If `5Z-I-V-I` severe duplicate（both full equality yes）：**

- **`Clerk env conflict resolution planning gate`**（separate phase）

**If `5Z-I-V-I` both full equality no：**

- **`Vercel stale / third-app Clerk key diagnostic planning gate`**（separate phase）

---

## 12. 未実行事項

- **actual key comparison**（deferred **`5Z-I-V-I`**）
- **削除／purge**
- **env 変更／redeploy**
- **DB write／runner**
- **code／UI 変更**
- **raw keys／secrets／full user IDs**
- **Supabase §B SELECT**
- **winner as `M55-core` or `M55-Official` 確定**（本条）

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_H_EXACT_CLERK_KEY_CONFLICT_DIAGNOSTIC_PLANNING_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-H-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-PLAN-001`** |
| **Verdict** | **`READY_FOR_EXACT_CLERK_KEY_CONFLICT_DIAGNOSTIC_EXECUTION`** |
| **Next** | **`5Z-I-V-I`** execution |
