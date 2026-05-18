# Phase 5-6H-5Z-I-V-G — Exact Vercel–Clerk publishable key match human confirmation gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-G Exact Vercel–Clerk publishable key match human confirmation gate**

**Conflict correction checkpoint（本条最終）：** **Clerk publishable key match conflict correction**

本条は **Human dashboard read-only**。**env 変更・削除・redeploy・DB write・runner・code 変更なし**。**Supabase §B SELECT 再開なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **Prior `5Z-I-V-G`（1st）** | **`CLERK_KEY_MATCH_HUMAN_EVIDENCE_NOT_SUBMITTED`** |
| **本条（2nd — conflict correction）** | **Human redacted result submitted** → **both apps match yes** → **`conflict`** |
| **`5Z-I-V-F` alignment result** | **superseded for `production_bound`** — **do not use as winner** |
| **`5Z-I-AB`** | **separate track** — **not mixed**（§12） |

**Work anchor（1st）：** **`dc85a2f`** — **`docs: record 5z-i-v-g clerk key match inconclusive`**

**Safe labels：** **`human-ui-current-user`**／**`user_36xz`**

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-G-EXACT-VERCEL-CLERK-KEY-MATCH-001`** | **本条（amended — conflict）** |
| **`M55-EVID-20260518-5Z-I-V-F-DEVICE-ORIGIN-CLERK-CONTEXT-001`** | device-origin（not Production proof） |
| **`M55-EVID-20260518-5Z-I-V-F-CLERK-ALIGNMENT-RESULT-001`** | **superseded** for winner（historical） |
| **`M55-EVID-20260518-5Z-I-V-E-HUMAN-DASHBOARD-CLERK-KEY-MATCH-001`** | prior frame |

**Full publishable key／full secret／full user_id／email：** **記録しない**。

---

## 4. Gate history

| Pass | Verdict |
|------|---------|
| **1st（template unselected）** | **`CLERK_KEY_MATCH_HUMAN_EVIDENCE_NOT_SUBMITTED`** |
| **2nd（conflict correction）** | **`CLERK_ALIGNMENT_BLOCKED_KEY_CONFLICT`** |

---

## 5. Human submission — conflict correction（redacted）

### Vercel Production env（`m55-webv2` / Production）

| Check | Result |
|-------|--------|
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` exists** | **yes** |
| **`CLERK_SECRET_KEY` exists** | **yes** |
| **full values shared** | **no** |

### Publishable key match

| Check | Human submitted | **Recorded（registry rule applied）** |
|-------|-----------------|--------------------------------------|
| **`M55-core` publishable match** | **yes** | **yes** |
| **`M55-Official` publishable match** | **yes** | **yes** |
| **Production-bound winner** | **M55-core**（Human） | **`conflict`** — **Human winner override rejected** |
| **full publishable key recorded** | — | **no** |

**Registry rule（§7 item 13）：** **both apps match yes → `conflict` — not winner.** **Do not record `M55-core` or `M55-Official` as Production-bound winner.**

### Secret same-app

| Check | Human submitted | **Recorded** |
|-------|-----------------|--------------|
| **`CLERK_SECRET_KEY` same app as winner** | **yes** | **yes**（**non-dispositive** — winner is **conflict**） |
| **full secret shared** | **no** | **no** |

### User location（non-dispositive — winner unresolved）

| Check | Human submitted | **Recorded** |
|-------|-----------------|--------------|
| **`human-ui-current-user` in winner app** | **yes** | **observed — not winner-scoped** |
| **`user_36xz` in winner app** | **yes** | **observed — not winner-scoped** |
| **both users same app** | **yes** | **observed — not winner-scoped** |
| **full user_id/email shared** | **no** | **no** |

---

## 6. Classification

| Field | Value |
|--------|--------|
| **classification** | **`CLERK_PUBLISHABLE_KEY_MATCH_CONFLICT`** |

**未採用：** `CLERK_PRODUCTION_BOUND_APP_CONFIRMED_M55_CORE`／`CLERK_PRODUCTION_BOUND_APP_CONFIRMED_M55_OFFICIAL`／`CLERK_ALIGNMENT_CONFIRMED_*`

---

## 7. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`CLERK_ALIGNMENT_BLOCKED_KEY_CONFLICT`** |
| **Production-bound winner** | **`conflict` / `unresolved`** |

---

## 8. Production-bound status（固定）

| Statement | Status |
|-----------|--------|
| **`M55-core` is Production-bound winner** | **no**（**rejected** — conflict） |
| **`M55-Official` is Production-bound winner** | **no**（**not confirmed** — conflict） |
| **Winner from device-origin / user count / app name** | **prohibited** |
| **§B `human-ui-current-user` row_count SELECT** | **not resumed**（blocked） |

---

## 9. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-H` Exact Clerk key conflict diagnostic planning gate**
  - Human compares **full** Vercel Production publishable key to each Clerk app **locally**（**never paste full key into SSOT/chat**）
  - Record **only:**
    - **first 8 chars match:** yes/no
    - **last 6 chars match:** yes/no
    - **full equality:** yes/no
    - **no raw key**
  - **If one app full equality yes, other no** → **winner confirmed**（single app）
  - **If both full equality yes** → **severe duplicate/config conflict**
  - **If both full equality no** → Vercel key belongs to **another** Clerk app or **stale env**
  - **no env change / no deletion / no redeploy**

**Not resumed until winner resolved:** **`5Z-I-V` §B** `human-ui-current-user` **`row_count` SELECT**

---

## 10. 未実行事項

- **削除／purge**
- **env 変更／redeploy**
- **DB write／runner**
- **code／UI 変更**
- **full IDs／secrets**
- **Supabase §B SELECT**

---

## 11. `5Z-I-V-H` diagnostic frame（planning — for next gate doc）

| Outcome | Interpretation |
|---------|----------------|
| **One app full equality yes** | **Winner confirmed**（record app name only） |
| **Both apps full equality yes** | **Severe duplicate/config conflict** |
| **Both apps full equality no** | **Vercel key ≠ either app**（stale / third app） |
| **Prefix/suffix only** | **Insufficient** — require **full equality** row |

---

## 12. `5Z-I-AB` separation（reply-ticket — not Clerk）

**Human lines in same chat（UI consume verification）— out of scope for本条:**

| Check | Value | **Recorded in** |
|-------|-------|-----------------|
| final generate clicked | yes | **`5Z-I-AA`**（already） |
| reply generated visible | yes | **`5Z-I-AA`** |
| remaining after visible | 0 | **`5Z-I-AA`** |
| DB write by app flow | yes | **`5Z-I-AA`** |
| error shown | none | **`5Z-I-AA`** |

**`5Z-I-AB` SSOT：** `docs/ssot/M55_PHASE5_6H_5Z_I_AB_POST_CONSUME_DB_READONLY_VERIFICATION_2026-05-18.md` — **unchanged**（**Human `SELECT` row_count still inconclusive** — **not amended by本条**）。

**Do not mix** Clerk alignment with included reply-ticket post-consume DB verification.

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_G_EXACT_VERCEL_CLERK_PUBLISHABLE_KEY_MATCH_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-G-EXACT-VERCEL-CLERK-KEY-MATCH-001`** |
| **Classification** | **`CLERK_PUBLISHABLE_KEY_MATCH_CONFLICT`** |
| **Verdict** | **`CLERK_ALIGNMENT_BLOCKED_KEY_CONFLICT`** |
| **Production-bound winner** | **`conflict` / `unresolved`** |
| **Next** | **`5Z-I-V-H`** exact key conflict diagnostic planning |
