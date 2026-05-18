# Phase 5-6H-5Z-I-V-N — Temporary current-Clerk-instance exception / user mapping planning gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-N Temporary current-Clerk-instance exception / user mapping planning gate**

本条は **`5Z-I-V-M` 推奨**の **temporary dev-auth exception** を **明示 scope / timebox / 禁止事項** 付きで計画。**env 変更・redeploy・Clerk Production instance 作成・削除・DB write・runner・code 変更なし**。**本条では §B SELECT 実行なし**。**通常開発フロー全面解放なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-K`** | **dev/test Clerk key on Vercel Production**（**`pk_test_`**） |
| **`5Z-I-V-L`** | env correction options planned |
| **`5Z-I-V-M`** | **`CLERK_PRODUCTION_CAPABILITY_CHECK_GREEN_TEMPORARY_DEV_AUTH_EXCEPTION_RECOMMENDED`** |
| **Production-bound winner** | **`conflict` / `unresolved`** |
| **§B SELECT** | **not executed** — **resume conditions defined本条** |
| **本条** | **exception planning only** |

**Work anchor：** **`88d4df18730cc0855296245183ae5381decd6f92`** — **`docs: check clerk production migration impact`**（**`5Z-I-V-M`**）。

**Registry：** `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md` §2j

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-N-TEMPORARY-CURRENT-CLERK-INSTANCE-USER-MAPPING-EXCEPTION-PLAN-001`** | **本条** |
| **`M55-EVID-20260518-5Z-I-V-M-CLERK-PRODUCTION-INSTANCE-CAPABILITY-MIGRATION-IMPACT-001`** | capability check |
| **`M55-EVID-20260518-5Z-I-V-L-VERCEL-CLERK-ENV-CORRECTION-PLAN-001`** | correction plan |
| **`M55-EVID-20260518-5Z-I-V-K-DUPLICATE-CLERK-APP-CONFIG-READONLY-DIAGNOSTIC-001`** | diagnostic |

**Full publishable key／full secret／full user_id／email／session：** **記録しない**。

---

## 4. A. Temporary exception definition

| Field | Value |
|-------|--------|
| **exception name** | **`TEMPORARY_CURRENT_CLERK_INSTANCE_USER_MAPPING_EXCEPTION`** |
| **reason** | **Immediate paid DTR unlock diagnosis** depends on **current Clerk `user_id` strings** in Supabase |
| **risk level** | **high** |

### Allowed only for

| Scope | Detail |
|-------|--------|
| **`5Z-I-V` §B** | **`human-ui-current-user` `row_count` SELECT**（**read-only**） |
| **Ownership / user mapping diagnosis** | redacted yes/no/unclear only |
| **Registry-first-read** | mandatory before any §B execution |

### Not allowed for

| Prohibited | Detail |
|------------|--------|
| **Production auth compliance claim** | **`pk_test_` on Production** remains **non-compliant** |
| **Public release confidence** | **no** |
| **Normal dev flow full release** | **no** |
| **Clerk app delete / purge** | **no** |
| **`pk_live_` migration** | **separate gate with explicit GO** |
| **env mutation** | **no** |

### Risk rationale

| Factor | Status |
|--------|--------|
| **Vercel Production uses `pk_test_`** | **yes** |
| **Duplicate Clerk app/config conflict** | **unresolved** |
| **Current user_id continuity needed** | **yes**（unlock diagnosis） |

### Mitigation（fixed）

| Mitigation | Detail |
|------------|--------|
| **Read-only only** | **SELECT** — no write |
| **No env change** | this track |
| **No DB mutation** | no copy/migrate entitlements |
| **Registry mandatory first-read** | before **`5Z-I-V-O`** |
| **Future production migration** | **separate**（**CONTROL-15**） |

---

## 5. B. Timebox / exit criteria

**Exception remains valid only until one of:**

1. **UI unlock root cause diagnosed**（redacted evidence only）
2. **User mapping repair / code-fix plan chosen**（separate gate）
3. **Clerk production migration plan supersedes** this exception（**CONTROL-15**）

**Exit requires:**

| Requirement | Detail |
|-------------|--------|
| **CONTROL-11 / 15 / 16** | **resolved or explicitly deferred** with Human sign-off |
| **Future `pk_live_` migration plan** | **recorded** if migration path chosen |
| **Orphan risk** | **not untracked**（**CONTROL-13** / **CONTROL-16**） |

**CONTROL-17：** tracks exception exit criteria（registry §9）.

---

## 6. C–D. §B SELECT resume protocol（authorized for `5Z-I-V-O` only — not executed本条）

**Resume authorized after本条 planning** — **execution only in `5Z-I-V-O`**.

### Preconditions（all required）

| # | Condition |
|---|-----------|
| **1** | **`TEMPORARY_CURRENT_CLERK_INSTANCE_USER_MAPPING_EXCEPTION`** recorded（本条） |
| **2** | **Full `user_id` human-local only** — **not in SSOT** |
| **3** | **`SELECT` read-only** |
| **4** | **Results: `row_count` only** |
| **5** | **No DB write** |
| **6** | **No migrate/copy entitlements** |
| **7** | **No safe label as DB query value**（`human-ui-current-user` / `user_36xz` are labels only） |

### Target summary（`5Z-I-V-O` collects）

| Target | Record |
|--------|--------|
| **`ui_user.entitlements` DTR_CORE_STATIC_V1** | **row_count** |
| **`ui_user.entitlement_rights`** | **row_count** |
| **`ui_user.dtr_report_snapshots` DTR_CORE_STATIC_V1** | **row_count** |
| **`ui_user.one_time_fulfillments`** | **row_count** |
| **`ui_user.reply_ticket_wallets`** | **row_count** |
| **`ui_user.reply_wallet_ledgers`** | **row_count** |
| **`repair_user_label` vs `ui_user_label`** | **matched / mismatch / unclear** |
| **artifact `user_id` ≠ logged-in UI `user_id`** | **yes / no / unclear** |
| **full IDs** | **not recorded** |

**Safe labels（reference）：** **`human-ui-current-user`**（UI）／**`user_36xz`**（repair-era）／**`canonical-normal-login`**（login context）

---

## 7. E. Risk classification（summary）

| Field | Value |
|-------|--------|
| **risk level** | **high** |
| **mitigation** | read-only / no env / no DB mutation / registry first-read / migration separated |

---

## 8. F. Recommended next action

| Field | Value |
|-------|--------|
| **classification** | **`READY_FOR_HUMAN_UI_USER_ROWCOUNT_READONLY_SELECT_GATE`** |
| **phase id** | **`5Z-I-V-O`** Human UI user row_count read-only SELECT gate |

---

## 9. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`TEMPORARY_CURRENT_CLERK_INSTANCE_EXCEPTION_PLANNING_GREEN_NO_MUTATION`** |

---

## 10. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-O` Human UI user row_count read-only SELECT gate**
  - **may execute §B SELECT**（Human-local）
  - **`row_count` only**
  - **no write**

**Still blocked：** normal dev flow full release／env correction／Clerk Production instance creation.

---

## 11. 未実行事項

- **env 変更／redeploy**
- **Clerk Production instance 作成**
- **削除**
- **DB write／runner**
- **code／UI 変更**
- **§B SELECT 実行**（本条）
- **full keys／secrets／user IDs in SSOT**
- **normal dev flow release**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_N_TEMPORARY_CURRENT_CLERK_INSTANCE_USER_MAPPING_EXCEPTION_PLANNING_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-N-TEMPORARY-CURRENT-CLERK-INSTANCE-USER-MAPPING-EXCEPTION-PLAN-001`** |
| **Exception** | **`TEMPORARY_CURRENT_CLERK_INSTANCE_USER_MAPPING_EXCEPTION`** |
| **Verdict** | **`TEMPORARY_CURRENT_CLERK_INSTANCE_EXCEPTION_PLANNING_GREEN_NO_MUTATION`** |
| **Next** | **`5Z-I-V-O`** §B read-only SELECT |
