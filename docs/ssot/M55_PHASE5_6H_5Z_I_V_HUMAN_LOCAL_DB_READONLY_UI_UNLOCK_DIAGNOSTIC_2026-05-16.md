# Phase 5-6H-5Z-I-V — Human-local DB read-only UI unlock diagnostic gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-V Human-local DB read-only UI unlock diagnostic gate**

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-Q`** | **`EXACTLY_ONE_REPAIR_EXECUTION_RECORDED`** |
| **`5Z-I-R`** | **`POST_REPAIR_PRODUCTION_DB_READ_ONLY_VERIFICATION_GREEN`**（**caveat：** agent **Production `SELECT` 未実行**） |
| **`5Z-I-S`** | **`UI_REPORT_UNLOCK_VERIFICATION_BLOCKED`** |
| **`5Z-I-U`** | **`UI_UNLOCK_TYPE_MISMATCH_READONLY_DIAGNOSTIC_GREEN_DB_CONFIRMATION_REQUIRED`** — primary **`OWNERSHIP_GATE_USER_ID_MISMATCH`** |
| **本条** | **Human-local Production `SELECT` read-only 診断枠**。**Agent は DB に接続しない** |

**Work anchor（repo 診断）：** **`5b184719e963a7fa838a36805349108d12fa2478`** — **`docs: diagnose ui unlock type mismatch readonly`**（**`5Z-I-U`**）。

**Safe labels（参照のみ・DB 値／SQL リテラル禁止）：**

| 種別 | Label |
|------|--------|
| **checkout** | **`cs_live_JSRW`** |
| **repair／client_reference 想定 user** | **`user_36xz`** |
| **UI ログイン観測 user** | **`human-ui-current-user`** |

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-V-HUMAN-LOCAL-DB-READONLY-UI-UNLOCK-DIAGNOSTIC-001`** | **本条：** Human-local DB read-only UI unlock 診断 |
| **`M55-EVID-20260516-5Z-I-U-UI-UNLOCK-TYPE-MISMATCH-READONLY-DIAGNOSTIC-001`** | repo 診断 |
| **`M55-EVID-20260516-5Z-I-S-UI-REPORT-UNLOCK-VERIFICATION-001`** | UI blocked |
| **`M55-EVID-20260516-5Z-I-R-POST-REPAIR-DB-READONLY-VERIFICATION-001`** | post-repair DB（caveat） |
| **`M55-EVID-20260516-5Z-I-Q-EXACTLY-ONE-REPAIR-EXECUTION-001`** | repair |

**Full IDs／secrets／session／raw SQL：** **記録しない**。

---

## 4. Human-local SELECT result summary（redacted）

**出所注記：** **§A** は **`5Z-I-R`（safe label `user_36xz`／repair 文脈）の prior Human-local 転記を引用**（**本条で fresh `SELECT` の再実施を agent は確認しない**）。**§B–E の UI ログインユーザー（`human-ui-current-user`）向け `row_count` は、本条コミット時点で **chat に redacted メタ未提出** → **`unclear`**。**Human が Supabase で `SELECT` 後、同一 Evidence で追認更新可**。

### A. Repair user artifact check（safe label **`user_36xz`**）

**出所：** **`5Z-I-R` Human-local 転記（引用）** — **repair runner 想定 user 文脈**。

| 対象 | **`row_count`** | **classification** |
|------|-----------------|-------------------|
| **`stripe_events`** | **1** | **found expected** |
| **`one_time_fulfillments`** | **1** | **found expected** |
| **`entitlements`（`DTR_CORE_STATIC_V1`）** | **1** | **found expected** |
| **`entitlement_rights`** | **≥1** | **found expected** |
| **`dtr_report_snapshots`（`DTR_CORE_STATIC_V1`）** | **1** | **found expected** |
| **`reply_ticket_wallets`** | **1** | **found expected** |
| **`reply_wallet_ledgers`** | **≥1** | **found expected** |

### B. Current UI logged-in user artifact check（safe label **`human-ui-current-user`**）

| 対象 | **`row_count`** | **classification** |
|------|-----------------|-------------------|
| **`entitlements`（`DTR_CORE_STATIC_V1`）** | **unclear** | **unclear** |
| **`entitlement_rights`** | **unclear** | **unclear** |
| **`dtr_report_snapshots`（`DTR_CORE_STATIC_V1`）** | **unclear** | **unclear** |
| **`one_time_fulfillments`** | **unclear** | **unclear** |
| **`reply_ticket_wallets`** | **unclear** | **unclear** |
| **`reply_wallet_ledgers`** | **unclear** | **unclear** |

### C. User mapping comparison

| 観点 | 記録 |
|------|------|
| **`repair_user_label` vs `ui_user_label`（safe label 対）** | **mismatch**（**2 ラベルは別 subject 参照として gate 指定** — **DB 同一性は未証明**） |
| **`client_reference` が current UI user に対応** | **unclear** |
| **UI ownership gate が参照する Clerk user に artifact あり** | **unclear** |
| **artifact `user_id` ≠ logged-in UI `user_id`** | **unclear**（**`5Z-I-U` コード上は不一致時 `locked` — DB 確定は §B 要**） |

### D. Ownership gate exact condition check（UI user 文脈）

**repo：** `resolveEntryReportOwnership`（`5Z-I-U` 要約）。

| 条件 | UI user（`human-ui-current-user`） |
|------|-------------------------------------|
| **snapshot 条件** | **unclear** |
| **rights + backing 条件** | **unclear** |
| **entitlements repair 条件** | **unclear** |
| **`product_id` key（`DTR_CORE_STATIC_V1`）** | **unclear** |
| **backing OTF または entitlement（UI user）** | **unclear** |

**Repair user（引用・`5Z-I-R`）：** **snapshot／ent／rights／OTF はいずれも存在する想定** → **gate は repair user では `owned` になりうる**（**UI login user では未確認**）。

### E. Snapshot lookup check

| 観点 | Repair user（`user_36xz` 引用） | UI user（`human-ui-current-user`） |
|------|----------------------------------|-------------------------------------|
| **`dtr_report_snapshots` `row_count`** | **1** | **unclear** |
| **payload parse／envelope safe existence** | **present**（**`5Z-I-R`：found expected**） | **unclear** |
| **archetype／type key present** | **unclear**（**full payload 未検査**） | **unclear** |

### F. Type mismatch support check（repo read-only・DB 不要）

| 観点 | 記録 |
|------|------|
| **棚 `GLOBAL LEADER` の出所** | **confirmed** — **`DtrShelfPanel` `DTR_TYPE_EN[stemIdx]` + client `ProfileRepository`**（**`5Z-I-U` F-U-SHELF-02**） |
| **本質 `INFLUENCER`／熱量先導の出所** | **confirmed** — **`CoreHeroSection` `HERO_VISUAL_PRESET` `TYPE_09`**（**`5Z-I-U` F-U-CORE-02**） |
| **同一 stemIdx で label 表が異なる** | **confirmed** — **stemIdx 8 例：`DTR_TYPE_EN[8]`=GLOBAL LEADER vs `TYPE_09` hero=INFLUENCER** |
| **code／SSOT label alignment issue** | **likely**（**計算破損は not_proven**） |

---

## 5. Unlock root cause classification

| 役割 | Token |
|------|--------|
| **Primary** | **`DB_READONLY_DIAGNOSTIC_INCONCLUSIVE`** |
| **Secondary（候補・未確定）** | **`OWNERSHIP_GATE_USER_ID_MISMATCH`**（**`5Z-I-U` primary — §B `row_count` 未提出のため本条では未昇格**） |
| **Secondary（候補）** | **`SNAPSHOT_LOOKUP_MISMATCH`** |

**理由：** **UI ログインユーザー向け fresh Human-local `SELECT` の redacted `row_count` が本条コミット時点で SSOT に未転記**。**`user_36xz` 側は `5Z-I-R` 引用のみ**。

---

## 6. Type mismatch classification

| 役割 | Token |
|------|--------|
| **Primary** | **`CONFIRMED_LABEL_SOURCE_DIVERGENCE_STEMIDX_MAPPING`** |
| **Secondary** | **`CONFIRMED_SHELF_CARD_PROFILE_SOURCE_NOT_SNAPSHOT`** |
| **Secondary** | **`CONFIRMED_CORE_PRESET_SOURCE_DIFFERENCE`** |

**注：** **repo read-only で確定**。**DB `SELECT` 不要**。

---

## 7. Recommended next action

**`DB_READONLY_DIAGNOSTIC_INCONCLUSIVE_MORE_EVIDENCE_REQUIRED`**

**Human 追認で昇格しうる next action（未採用）：**

| 条件 | Token |
|------|--------|
| **§B で UI user artifact 全 0、repair user に artifact あり** | **`READY_FOR_USER_ID_MAPPING_REPAIR_PLANNING_GATE`** |
| **同一 user で artifact あり・UI 仍 blocked** | **`READY_FOR_OWNERSHIP_GATE_CODE_FIX_PLANNING_GATE`** または **`READY_FOR_SNAPSHOT_LOOKUP_FIX_PLANNING_GATE`** |
| **type のみ** | **`READY_FOR_TYPE_LABEL_SSOT_ALIGNMENT_PLANNING_GATE`**（**repo 上は既に likely**） |

---

## 8. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`UI_UNLOCK_DB_READONLY_DIAGNOSTIC_INCONCLUSIVE`** |

**参考（未採用・Human §B 追認後）：**

| 条件 | Verdict |
|------|---------|
| **user mismatch DB 確定** | **`UI_UNLOCK_DB_READONLY_DIAGNOSTIC_GREEN_USER_ID_MISMATCH_CONFIRMED`** |
| **同一 user・gate／code 問題** | **`UI_UNLOCK_DB_READONLY_DIAGNOSTIC_GREEN_CODE_FIX_REQUIRED`** |
| **snap／product key** | **`UI_UNLOCK_DB_READONLY_DIAGNOSTIC_GREEN_SNAPSHOT_OR_PRODUCT_KEY_FIX_REQUIRED`** |

---

## 9. 未実行事項

- **Production DB write／runner／二回目 repair／manual SQL／grant**
- **Events API／replay／決済／refund**
- **included reply-ticket 検証**
- **Stripe／env／whsec／redeploy／package／runner／runtime／code／UI 変更**
- **Agent による Production `SELECT`**
- **full IDs／secrets／session 記録**

---

## 10. Next

**Human が §B–E の redacted `row_count` を同一 Evidence に追認するまで：**

- **unlock 根因の DB 確定は保留**
- **type mismatch：** **`Phase 5-6H-5Z-I-W` Type label SSOT alignment planning gate** へ **repo 確定分のみ先行可**（**explicit GO まで実装なし**）

**§B 追認で `CONFIRMED_OWNERSHIP_GATE_USER_ID_MISMATCH` となった場合：**

- **`Phase 5-6H-5Z-I-W` User ID mapping repair planning gate**

**§B 追認で同一 user・artifact ありの場合：**

- **`Phase 5-6H-5Z-I-W` Ownership gate／code fix planning gate**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_V_HUMAN_LOCAL_DB_READONLY_UI_UNLOCK_DIAGNOSTIC_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-V-HUMAN-LOCAL-DB-READONLY-UI-UNLOCK-DIAGNOSTIC-001`** |
| **Verdict** | **`UI_UNLOCK_DB_READONLY_DIAGNOSTIC_INCONCLUSIVE`** |
| **Unlock primary** | **`DB_READONLY_DIAGNOSTIC_INCONCLUSIVE`** |
| **Type primary** | **`CONFIRMED_LABEL_SOURCE_DIVERGENCE_STEMIDX_MAPPING`** |
| **Next action** | **`DB_READONLY_DIAGNOSTIC_INCONCLUSIVE_MORE_EVIDENCE_REQUIRED`** |
