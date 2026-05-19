# Phase 5-6H-5Z-I-V-F — Device-origin Clerk context registry update gate（2026-05-18 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V-F Device-origin Clerk context registry update gate**

**Note:** Same phase letter **`5Z-I-V-F`** also names **`M55_PHASE5_6H_5Z_I_V_F_CLERK_ALIGNMENT_RESULT_2026-05-18.md`**（publishable key match — **separate evidence**）。本条は **device-origin operational context のみ**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-V-E`** | **`CLERK_ALIGNMENT_STILL_UNCLEAR_HUMAN_DASHBOARD_REQUIRED`**（key match frame） |
| **本条** | **Human device-origin context 追記** — **AI monitoring only** |
| **Production-bound winner** | **NOT determined by device-origin** — **Vercel Production publishable key match only** |

**Work anchor（key-match frame）：** **`3ddb69477cd3a20f95c5c61a04ac7aceea1a6ed3`** — **`docs: confirm clerk production app alignment`**（**`5Z-I-V-E`**）。

**Registry：** `docs/ssot/M55_ENVIRONMENT_IDENTITY_REGISTRY_2026-05-18.md`

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260518-5Z-I-V-F-DEVICE-ORIGIN-CLERK-CONTEXT-001`** | **本条：device-origin context** |
| **`M55-EVID-20260518-5Z-I-V-E-HUMAN-DASHBOARD-CLERK-KEY-MATCH-001`** | key-match frame |
| **`M55-EVID-20260518-5Z-I-V-D-CLERK-ALIGNMENT-PLATFORM-BENCHMARK-001`** | benchmark |
| **`M55-EVID-20260518-5Z-I-V-C-AI-READABLE-ENV-IDENTITY-REGISTRY-001`** | registry |

**Full key／secret／user_id／email：** **記録しない**。

---

## 4. Device-origin mapping（operational — not Production proof）

| Clerk app | device-origin | operational role | user-count tendency |
|-----------|---------------|-------------------|---------------------|
| **`M55-core`** | **Mac** | **Human primary active environment / current main cockpit** | **fewer users than Official** |
| **`M55-Official`** | **Windows / test usage** | **historical test / multi-user validation cluster** | **more users than core**（Windows/test activity） |

**Registry IDs：** **`DO-01`**（M55-core）／**`DO-02`**（M55-Official）— see registry §1c.

---

## 5. Supabase aggregate inventory（distinct users only — not Production proof）

**Project：** **`m55-soul-core` / PRODUCTION**（aggregate observation — **no full user_id**）

| Table / scope | **distinct_user_count** |
|---------------|-------------------------|
| **`entitlements`（DTR_CORE lane）** | **10** |
| **`dtr_report_snapshots`（DTR_CORE）** | **6** |
| **`one_time_fulfillments`** | **7** |
| **`reply_ticket_wallets`** | **10** |

**Interpretation：** counts reflect **historical multi-environment activity** — **do not rank Clerk apps** or **infer Production-bound winner**.

---

## 6. Non-conclusions（固定）

| Statement | Status |
|-----------|--------|
| **`M55-core` is Production-bound because Mac primary** | **false** |
| **`M55-Official` is non-production because Windows/test** | **false** |
| **App name “Official” proves Production** | **false** |
| **Higher user count proves Production-bound app** | **false** |
| **Production-bound winner** | **only via Vercel Production `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` ↔ Clerk publishable key match** |
| **Both apps match yes** | **classify as `conflict`** — **not winner** |
| **Template yes/no/unclear left unselected** | **treat as evidence not submitted** |

---

## 7. AI guard update（registry §7 supplement）

| # | Rule |
|---|------|
| **11** | **Do not infer Production-bound Clerk app from device-origin, app name, or Supabase user counts.** |
| **12** | **Only Vercel Production publishable key match（redacted prefix/suffix or explicit Human yes/no per app）confirms winner.** |
| **13** | **If both `M55-core` and `M55-Official` publishable match = yes → `conflict` — stop and ask Human.** |
| **14** | **Unselected template options are not evidence — treat as not submitted.** |

---

## 8. Production-bound winner status（at this gate）

| Field | Value |
|--------|--------|
| **Determined by device-origin?** | **no** |
| **Determined by key match?** | **required** — see **`5Z-I-V-G`** / alignment result doc when submitted |
| **Registry §2（if later updated）** | **key match evidence supersedes device-origin for `production_bound`** |

---

## 9. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`DEVICE_ORIGIN_CONTEXT_RECORDED_PRODUCTION_WINNER_STILL_KEY_MATCH_REQUIRED`** |

---

## 10. Next

**採用：**

- **`Phase 5-6H-5Z-I-V-G` Exact Vercel–Clerk publishable key match human confirmation**
  - redacted prefix/suffix or per-app yes/no only
  - **no env change / no deletion**

**After winner confirmed via key match only:**

- **Resume `5Z-I-V` §B** — **`human-ui-current-user` `row_count` SELECT**（human-local, redacted）

---

## 11. 未実行事項

- **削除／purge**
- **env 変更／redeploy**
- **DB write／runner**
- **code／UI 変更**
- **full IDs／secrets**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_F_DEVICE_ORIGIN_CLERK_CONTEXT_REGISTRY_UPDATE_2026-05-18.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260518-5Z-I-V-F-DEVICE-ORIGIN-CLERK-CONTEXT-001`** |
| **Verdict** | **`DEVICE_ORIGIN_CONTEXT_RECORDED_PRODUCTION_WINNER_STILL_KEY_MATCH_REQUIRED`** |
| **Next** | **`5Z-I-V-G` publishable key match** |
