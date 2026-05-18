# Phase 5-6H-5Z-I-V-J — Duplicate Clerk app/config conflict diagnostic planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-J Duplicate Clerk app/config conflict diagnostic planning gate**

本条は **`5Z-I-V-I` `SEVERE_DUPLICATE_CONFIG_CONFLICT`** の **構造診断計画**（docs-only）。**削除・env 変更・redeploy・DB write・runner・code 変更なし**。**Supabase §B SELECT 再開なし**。**通常開発フロー解放は記録しない**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-I`** | **`CLERK_ALIGNMENT_BLOCKED_DUPLICATE_PUBLISHABLE_KEY_CONFLICT`** |
| **Exact comparison** | **both `M55-core` + `M55-Official` full equality yes** |
| **Production-bound winner** | **`conflict` / `unresolved`** |
| **本条** | **duplicate/config conflict diagnostic plan only** |
| **Mutation** | **none** |

**Work anchor：** **`4dbc446fe9fd9630dd6a820bad794f7f6238ee79`** — **`docs: record exact clerk key duplicate conflict`**（**`5Z-I-V-I`**）。

**Registry：** `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md` §2e–§2f

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-J-DUPLICATE-CLERK-APP-CONFIG-CONFLICT-DIAGNOSTIC-PLAN-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-I-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-001`** | exact execution |
| **`M55-EVID-20260518-5Z-I-V-H-EXACT-CLERK-KEY-CONFLICT-DIAGNOSTIC-PLAN-001`** | comparison plan |
| **`M55-EVID-20260518-5Z-I-V-G-EXACT-VERCEL-CLERK-KEY-MATCH-001`** | dashboard conflict |

**Full publishable key／full secret／full user_id／email／session：** **記録しない**。

---

## 4. Redacted key evidence（AI-readable — no raw key）

| Field | Value |
|-------|--------|
| **Vercel Production publishable exists** | **yes** |
| **first 8 evidence** | **`pk_test_`** |
| **suffix evidence** | **`ZXYk`**（human-redacted suffix as supplied） |
| **raw key recorded** | **no** |
| **`M55-core` first8 / last6 / full equality** | **yes / yes / yes** |
| **`M55-Official` first8 / last6 / full equality** | **yes / yes / yes** |

**Interpretation signal（non-conclusive）：** **`pk_test_` prefix** on Vercel Production name suggests **possible test/dev publishable key on Production env**（supports **H3 / H4** — requires **`5Z-I-V-K` read-only confirmation**）.

---

## 5. Conflict interpretation（固定）

| Statement | Status |
|-----------|--------|
| **classification** | **`SEVERE_DUPLICATE_CONFIG_CONFLICT`** |
| **gate verdict（`5Z-I-V-I`）** | **`CLERK_ALIGNMENT_BLOCKED_DUPLICATE_PUBLISHABLE_KEY_CONFLICT`** |
| **Production-bound winner** | **`conflict` / `unresolved`** |
| **`M55-core` winner** | **rejected** |
| **`M55-Official` winner** | **rejected** |
| **secret same-app yes** | **non-dispositive** |
| **user location yes rows** | **non-dispositive** |
| **§B SELECT** | **blocked** |

---

## 6. Conflict decision table（registry-fixed）

| core full eq | official full eq | **Outcome** | **Winner** |
|--------------|------------------|-------------|------------|
| yes | no | single-app match | **`M55-core`**（only if **`5Z-I-V-K+` confirms**） |
| no | yes | single-app match | **`M55-Official`**（only if confirmed） |
| **yes** | **yes** | **`SEVERE_DUPLICATE_CONFIG_CONFLICT`** | **none**（**current state**） |
| no | no | third app / stale Vercel | **none** until remap |
| unclear | * | inconclusive | **none** |

**Current row applied：** **both yes** → **no winner** → **diagnostic track only**.

---

## 7. Diagnostic hypotheses（H1–H7）

| ID | Hypothesis | Read-only check（`5Z-I-V-K`） |
|----|------------|-------------------------------|
| **H1** | **Dashboard context confusion** — same key viewed via duplicate UI paths | separate app card navigation trace; same instance re-display |
| **H2** | **Clerk app duplication / clone** — `M55-core` vs `M55-Official` are name-only clones | redacted **app id / instance id** presence comparison |
| **H3** | **Vercel env copied/stale** — Production env still references old app key | Vercel env **created/updated** timestamp vs Clerk key metadata |
| **H4** | **Development instance key reused** — both share **test** publishable on Production | confirm **`pk_test_` vs `pk_live_`** context（prefix only — **no full key**） |
| **H5** | **Human comparison context error** — one app’s key used for both comparisons | publishable **display context** per app screen |
| **H6** | **Clerk project structure misunderstanding** — app name ≠ 1:1 frontend domain/instance | frontend API/domain mapping per app |
| **H7** | **Registry historical winner pollution** — prior `M55-Official` winner / device-origin context mixed into judgment | SSOT cites **§2a superseded** + **§2d authoritative** only |

---

## 8. Next diagnostic plan（`5Z-I-V-K` — read-only execution）

Human dashboard **read-only**（**no env mutation / no deletion**）:

| Check | Record allowed |
|-------|----------------|
| Clerk **app id / instance id** | redacted presence / prefix only — **yes/no/unclear** per app |
| **Frontend API / domain** mapping | domain host labels only |
| **Publishable key display context** | which screen / which instance label |
| **Key created / last updated** metadata | date if visible — **no raw key** |
| **User list freshness** | aggregate / relative only — **no full user_id** |
| **Vercel env created/updated** | timestamp if visible |
| **Truly separate apps vs same context** | **yes/no/unclear** |
| **raw values** | **prohibited** |

**Redacted evidence policy（本条固定）：**

| Allowed | Prohibited |
|---------|------------|
| first8 / last6 / suffix labels | full key |
| yes/no/unclear | full secret |
| app names | full user_id |
| frontend domains | email |
| created/updated date（non-sensitive） | raw env dump |
| row_count / user count aggregate | screenshots with secrets |

---

## 9. Canonical / quarantine planning stance（no mutation this gate）

| Resource | Planning stance（until conflict resolved） |
|----------|---------------------------------------------|
| **`m55-webv2` Vercel Production** | **inspect_only** — **no env edit without separate GO** |
| **`M55-core`** | **HOLD_QUARANTINE（HQ-01）** — **do_not_touch** |
| **`M55-Official`（CK-11）** | **ask_human** — **production_bound unclear** |
| **Either Clerk app** | **not confirmed Production-bound winner** |
| **Purge / delete** | **prohibited** this track |

---

## 10. Classification tokens（本条）

| Token | Applied |
|-------|---------|
| **`READY_FOR_DUPLICATE_CLERK_APP_CONFIG_CONFLICT_READONLY_DIAGNOSTIC_GATE`** | **yes**（recommended） |
| **Return to normal dev flow** | **no**（not recorded） |

---

## 11. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`READY_FOR_DUPLICATE_CLERK_APP_CONFIG_CONFLICT_READONLY_DIAGNOSTIC_GATE`** |

---

## 12. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-K` Duplicate Clerk app/config conflict read-only diagnostic execution gate**
  - Human performs §8 checks; records redacted fields only
  - **no env change / no deletion / no §B SELECT**

**If `5Z-I-V-K` resolves to single-app key ownership:**

- separate **env correction planning gate** with explicit Human GO（**not automatic**）

**If duplicate persists:**

- **Clerk env conflict resolution planning**（extended track）

---

## 13. 未実行事項

- **削除／purge**
- **env 変更／redeploy**
- **DB write／runner**
- **code／UI 変更**
- **full keys／secrets／user IDs**
- **§B SELECT**
- **winner confirmation**
- **normal dev flow unlock**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_J_DUPLICATE_CLERK_APP_CONFIG_CONFLICT_DIAGNOSTIC_PLANNING_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-J-DUPLICATE-CLERK-APP-CONFIG-DIAGNOSTIC-PLAN-001`** |
| **Verdict** | **`READY_FOR_DUPLICATE_CLERK_APP_CONFIG_CONFLICT_READONLY_DIAGNOSTIC_GATE`** |
| **Next** | **`5Z-I-V-K`** read-only diagnostic execution |
