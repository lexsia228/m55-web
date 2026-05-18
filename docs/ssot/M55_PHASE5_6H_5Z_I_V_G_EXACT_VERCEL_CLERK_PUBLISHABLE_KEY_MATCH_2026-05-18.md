# Phase 5-6H-5Z-I-V-G — Exact Vercel–Clerk publishable key match human confirmation gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-G Exact Vercel–Clerk publishable key match human confirmation gate**

本条は **Human dashboard read-only** による **Production-bound Clerk app** の **単一選択 yes/no/unclear** 固定。**env 変更・削除・redeploy・DB write・runner・code 変更なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-F` device-origin** | **`DEVICE_ORIGIN_CONTEXT_RECORDED_PRODUCTION_WINNER_STILL_KEY_MATCH_REQUIRED`** |
| **Registry §2** | **prior `5Z-I-V-F` alignment result**（**`M55-Official`** — separate evidence）— **本条未提出では上書きしない** |
| **本条 Human 提出** | **template only — options not selected** |

**Work anchor（device-origin）：** **`619b0d529d33df93cc23169640838890332844b6`** — **`docs: record clerk device origin context`**（**`5Z-I-V-F` device-origin**）。

**Safe labels：** **`human-ui-current-user`**／**`user_36xz`**

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-G-EXACT-VERCEL-CLERK-KEY-MATCH-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-F-DEVICE-ORIGIN-CLERK-CONTEXT-001`** | device-origin（not Production proof） |
| **`M55-EVID-20260518-5Z-I-V-E-HUMAN-DASHBOARD-CLERK-KEY-MATCH-001`** | prior frame |
| **`M55-EVID-20260518-5Z-I-V-F-CLERK-ALIGNMENT-RESULT-001`** | **separate prior submission**（not adopted as本条 evidence） |

**Full publishable key／full secret／full user_id／email：** **記録しない**。

---

## 4. Human submission received（2026-05-18 chat）

**Format:** template with **literal option lists**（`yes / no / unclear`）on each line — **no single value selected per field**.

**Policy（registry §7 item 14）：** **unselected template = evidence not submitted**.

### Vercel Production env

| Check | Human message | Recorded result |
|-------|---------------|-----------------|
| **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` exists** | `yes`（fixed field） | **yes** |
| **full publishable key shared** | `no`（fixed field） | **no**（compliant） |

### Publishable key match

| Check | Human message | Recorded result |
|-------|---------------|-----------------|
| **`M55-core` publishable match** | `yes / no / unclear`（unselected） | **not submitted** |
| **`M55-Official` publishable match** | `yes / no / unclear`（unselected） | **not submitted** |
| **Production-bound winner** | `M55-core / M55-Official / unclear / conflict`（unselected） | **not submitted** |

### Secret same-app

| Check | Human message | Recorded result |
|-------|---------------|-----------------|
| **`CLERK_SECRET_KEY` same app as winner** | `yes / no / unclear`（unselected） | **not submitted** |
| **full secret shared** | `no`（fixed field） | **no**（compliant） |

### User location

| Check | Human message | Recorded result |
|-------|---------------|-----------------|
| **`human-ui-current-user` in winner app** | `yes / no / unclear`（unselected） | **not submitted** |
| **`user_36xz` in winner app** | `yes / no / unclear`（unselected） | **not submitted** |
| **both users same app** | `yes / no / unclear`（unselected） | **not submitted** |
| **full user_id/email shared** | `no`（fixed field） | **no**（compliant） |

---

## 5. Classification

| Field | Value |
|--------|--------|
| **classification** | **`CLERK_PRODUCTION_BOUND_APP_STILL_UNCLEAR_FOR_5Z_I_V_G`** |

**未採用（本条）：** `CLERK_PRODUCTION_BOUND_APP_CONFIRMED`／`CONFLICT`／`CLERK_SECRET_PUBLISHABLE_APP_MISMATCH`（**match rows not submitted**）

**Cross-reference only（別 evidence — 本条では採用しない）：** `M55-EVID-20260518-5Z-I-V-F-CLERK-ALIGNMENT-RESULT-001` に **`M55-Official` winner** の redacted yes/no が既存。Human が **`5Z-I-V-G` として再確定**する場合は **§11 形式で単一値再提出**が必要。

---

## 6. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`CLERK_KEY_MATCH_HUMAN_EVIDENCE_NOT_SUBMITTED`** |

**同等トークン：** **`CLERK_ALIGNMENT_STILL_UNCLEAR_HUMAN_KEY_MATCH_REQUIRED`**

---

## 7. Next

**採用：**

- **Human resubmit `5Z-I-V-G`** — **one value per row**（例：§11）
- **If both apps publishable match = yes** → report **`conflict`**（not winner）
- **If winner + secret same-app yes** → **resume `5Z-I-V` §B** `human-ui-current-user` **`row_count` SELECT**（redacted）

**Registry：** §2 **unchanged** until valid **`5Z-I-V-G`** submission amends via separate Human-approved gate update.

---

## 8. 未実行事項

- **削除／purge**
- **env 変更／redeploy**
- **DB write／runner**
- **code／UI 変更**
- **full IDs／secrets**

---

## 9. Human resubmission format（full 値禁止）

各行 **1 つのみ** 選択（スラッシュ列挙は不可）:

```
Vercel Production env:
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY exists: yes
- full publishable key shared: no

Publishable key match:
- M55-core publishable match: no
- M55-Official publishable match: yes
- Production-bound winner: M55-Official

Secret same-app:
- CLERK_SECRET_KEY same app as winner: yes
- full secret shared: no

User location:
- human-ui-current-user exists in winner app: no
- repair user user_36xz exists in winner app: yes
- both users same app: no
- full user_id/email shared: no
```

（上記は **例示** — Human の実観測で **単一値** を記入。SSOT には **yes/no/unclear と winner 名のみ**。）

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_G_EXACT_VERCEL_CLERK_PUBLISHABLE_KEY_MATCH_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-G-EXACT-VERCEL-CLERK-KEY-MATCH-001`** |
| **Verdict** | **`CLERK_KEY_MATCH_HUMAN_EVIDENCE_NOT_SUBMITTED`** |
| **Next** | **Human single-value resubmit** |
