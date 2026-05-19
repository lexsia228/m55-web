# Phase 5-6H-5Z-I-U — UI unlock and type mismatch read-only diagnostic execution gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-U UI unlock and type mismatch read-only diagnostic execution gate**

本条は **repo read-only 診断実行**の固定のみ。**Production DB write／runner／code／UI 変更なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-Q`** | **`EXACTLY_ONE_REPAIR_EXECUTION_RECORDED`** |
| **`5Z-I-R`** | **`POST_REPAIR_PRODUCTION_DB_READ_ONLY_VERIFICATION_GREEN`**（**caveat：** agent **Production `SELECT` 未実行**） |
| **`5Z-I-S`** | **`UI_REPORT_UNLOCK_VERIFICATION_BLOCKED`**／**`CORE_PAID_TYPE_MISMATCH_INFLUENCER_VS_GLOBAL_LEADER`** |
| **`5Z-I-T`** | **`READY_FOR_UI_UNLOCK_TYPE_MISMATCH_READ_ONLY_DIAGNOSTIC_GATE`** |
| **本条** | **コード／SSOT read-only 診断を実施**。**DB `SELECT` は本条では実行しない** |

**Work anchor（計画）：** **`cf79935708c383e77b5bca7626455ca2771b2744`** — **`docs: plan ui unlock type mismatch diagnostic`**（**`5Z-I-T`**）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-U-UI-UNLOCK-TYPE-MISMATCH-READONLY-DIAGNOSTIC-001`** | **本条：** read-only 診断実行 |
| **`M55-EVID-20260516-5Z-I-T-UI-UNLOCK-TYPE-MISMATCH-DIAGNOSTIC-PLAN-001`** | 診断計画 |
| **`M55-EVID-20260516-5Z-I-S-UI-REPORT-UNLOCK-VERIFICATION-001`** | UI blocked |
| **`M55-EVID-20260516-5Z-I-R-POST-REPAIR-DB-READONLY-VERIFICATION-001`** | DB artifact（caveat） |
| **`M55-EVID-20260516-5Z-I-Q-EXACTLY-ONE-REPAIR-EXECUTION-001`** | repair |

**Full IDs／secrets／session：** **記録しない**。

---

## 4. Repo read-only findings

### 4.1 Ownership / unlock gate

| 所見 ID | 内容 |
|---------|------|
| **F-U-OWN-01** | **`resolveEntryReportOwnership(userId)`**（`lib/m55/dtrOwnershipGate.ts`）は **Clerk `userId` 文字列**をキーに **admin Supabase** で判定。**順序：** (1) **`getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1)`→`owned`** (2) **`entitlement_rights`（`m55_p:core_origin`）+ active `entitlements` または `one_time_fulfillments`** (3) **active `entitlements` のみ→rights repair upsert→`owned`** (4) **rights orphan のみ→`locked`** (5) **else `locked`**。 |
| **F-U-OWN-02** | **`/dtr/lp`**（`app/dtr/lp/page.tsx`）：**`unlockState==='locked'`→`lpCtaMode='purchase'`**（**¥1,000／PurchaseButton**）。**`5Z-I-S` の purchase CTA とコード整合**。 |
| **F-U-OWN-03** | **`/dtr/core`**：**`locked`→redirect `/dtr/lp`**。**`owned` かつ snap null→redirect `/dtr/lp`**（**保存版本文なし**）。 |
| **F-U-OWN-04** | **`/dtr` 棚**（`app/dtr/page.tsx`）：**server `ownershipState`** は gate 結果。**`snapshotReady`** は **`owned` 時のみ** `getDtrReportSnapshot != null`。 |
| **F-U-OWN-05** | **product key：** **`DTR_CORE_STATIC_V1`**（`lib/oneTimeCheckout.ts`）／rights **`m55_p:core_origin`**（`dtrCoreCheckoutFulfillment.ts`）。**コード上の product_id 分岐は単一**。 |
| **F-U-OWN-06** | **repair runner** は **`params.expectedUserId`**（Stripe **`client_reference_id`**）で fulfillment。**UI gate** は **`auth()` の Clerk `userId`**。**不一致時は artifact があっても UI は `locked`**（**H2 最有力・DB 確認要**）。 |

### 4.2 DTR snapshot lookup

| 所見 ID | 内容 |
|---------|------|
| **F-U-SNAP-01** | **`getDtrReportSnapshot`**（`lib/m55/dtrDraftDb.ts`）：**`.eq('user_id', userId).eq('product_id', productId).maybeSingle()`**。**複数行は PostgREST エラー→catch→`null`**。 |
| **F-U-SNAP-02** | **`id` が string/number 以外→`null`**。**`envelope_json` cast 失敗は実行時エラーになりうる**（**parse ガード弱い**）。 |
| **F-U-SNAP-03** | **fulfillment**（`upsertDtrReportSnapshotAtFulfillment`）：**`(user_id, product_id)` upsert**。**metadata／draft 欠損時は snapshot skip しうる**（ログ **`dtr_report_snapshots skipped`**）。 |
| **F-U-SNAP-04** | **`/dtr/core` は snap ありでも `envelope_json` を表示せず `runDtrEngine(profile_snapshot)` で本文再生成**（**unlock は snap 存在で gate**、**表示 type は engine 出力**）。 |
| **F-U-SNAP-05** | **棚カードは snapshot の archetype／envelope を表示に使わない**（**§4.3**）。 |

### 4.3 Report shelf / card source

| 所見 ID | 内容 |
|---------|------|
| **F-U-SHELF-01** | **`DtrShelfPanel`**（client）：**`ProfileRepository.get(clerkUserId)` + `essenceStemLaneIndex(birthDate)`→`DTR_TYPE_EN[stemIdx]`**（`components/dtr/DtrShelfPanel.tsx`）。**server `ownershipState`／`snapshotReady` とは独立**。 |
| **F-U-SHELF-02** | **`DTR_TYPE_EN`：** stemIdx **8→`GLOBAL LEADER`**、**2→`INFLUENCER`**（**`TEN_STEM_DISPLAY` 壬／丙と英字表が一致する配列**）。 |
| **F-U-SHELF-03** | **CTA 分岐：** **`owned && snapshotReady`→`/dtr/core`「レポートを開く」**；**`owned && !snapshotReady`→`/dtr/lp`「準備中」**；**`locked`→`/dtr/lp`＋購入 CTA**。 |
| **F-U-SHELF-04** | **`ProfileRepository` は localStorage 優先**（`lib/soul/profile.ts`）。**DB snapshot の `profile_snapshot` と birthDate がズレうる**（**表示 type のみ影響**）。 |

### 4.4 Core / free 本質 source

| 所見 ID | 内容 |
|---------|------|
| **F-U-CORE-01** | **`/core`**（`CoreEssencePanel`）：**`ensureSealedCoreResult`→`buildCoreResult`→`runCanonicalCorePipeline`→`essenceStemLaneIndex`→`typeIndexFromStemLane`→`TYPE_CATALOG[idx]`**（`lib/m55/coreResult/*`）。 |
| **F-U-CORE-02** | **`CoreHeroSection` `HERO_VISUAL_PRESET`：** **`TYPE_09`→english `INFLUENCER`／`観測特性：熱量先導`**（`components/core/CoreHeroSection.tsx`）。 |
| **F-U-CORE-03** | **同一 `stemLaneIndex=L` のとき：** **`TYPE_CATALOG[L]` は `TYPE_{L+1}`**、**`DTR_TYPE_EN[L]` は stem 英字表**。**`L=8` の例：** **`TYPE_09`＝INFLUENCER（core）** vs **`DTR_TYPE_EN[8]`＝GLOBAL LEADER（棚）** — **`5Z-I-S` mismatch とコード上整合**（**計算破損ではなくラベル表のインデックス対応差**）。 |
| **F-U-CORE-04** | **`runDtrEngine`** も **`essenceStemLaneIndex(birthDate)`**（`lib/m55/dtrEngine.ts`）。**paid `/dtr/core` 本文は engine 再計算**（**snap envelope の type ラベルを UI に直接出さない**）。 |

### 4.5 API / route read path（POST 未実行）

| 所見 ID | 内容 |
|---------|------|
| **F-U-API-01** | **`GET` 設計確認のみ：** **`/api/dtr/report-snapshot-ready`** — ownership + snapshot。**`/api/me/entitlements`** — **`DTR_CORE_STATIC_V1` filter**。 |
| **F-U-API-02** | **`POST /api/purchase/checkout`：** **snap 既存→409 `already_purchased`**。**`owned` かつ snap なし→409 `fulfillment_pending` 等**（**設計読取のみ**）。 |
| **F-U-API-03** | **`/dtr/processing`：** fulfill 後 snap 確認。**失敗時「接続を確認できませんでした」**（**`5Z-I-S` 最新スクショでは未観測**）。 |

---

## 5. Unlock blocker classification

| Token | 採用 | 根拠（redacted） |
|-------|------|------------------|
| **`OWNERSHIP_GATE_USER_ID_MISMATCH`** | **yes（primary）** | **repair `expectedUserId`≠ UI Clerk `userId` なら gate は `locked`／purchase CTA**（**F-U-OWN-06**）。**`5Z-I-R` artifact は repair ユーザー行に紐づく可能性**（**caveat**）。 |
| **`SNAPSHOT_LOOKUP_MISMATCH`** | **yes（secondary）** | **snap は repair user にのみ存在し UI user では `getDtrReportSnapshot` null**（**F-U-SNAP-01**）。**Human-local SELECT で確認要**。 |
| **`ENTITLEMENT_READ_PATH_MISMATCH`** | **possible** | **rights orphan のみで `locked`**（**F-U-OWN-01**）。**`5Z-I-R` が rights≥1 なら優先度低**。 |
| **`PURCHASE_CTA_FALLBACK_NOT_OWNED_BRANCH`** | **yes（mechanism）** | **`locked`→purchase は仕様**（**F-U-OWN-02**）。**root cause ではなく症状経路**。 |
| **`OWNERSHIP_GATE_PRODUCT_KEY_MISMATCH`** | **no** | **コード上 product_id は `DTR_CORE_STATIC_V1` で統一**（**F-U-OWN-05**）。 |
| **`SNAPSHOT_PAYLOAD_SHAPE_MISMATCH`** | **unclear** | **コード上は row あれば通過**。**payload 検証は `5Z-I-V` SELECT**。 |
| **`RLS_OR_SERVER_CLIENT_READ_MISMATCH`** | **unclear** | **gate は admin client**。**Human UI は server component 経由で同一関数**。 |
| **`UI_CACHE_OR_SESSION_STALE`** | **unlikely（単独）** | **`5Z-I-S`：super reload 後も unlock 不可**。 |
| **`INCONCLUSIVE`** | **partial** | **DB 行が UI ログインユーザーに存在するか未確認** |

---

## 6. Type mismatch classification

| Token | 採用 | 根拠（redacted） |
|-------|------|------------------|
| **`SHELF_CARD_USES_PROFILE_REPOSITORY_NOT_SNAPSHOT`** | **yes** | **棚 type 英字は client profile stem→`DTR_TYPE_EN`**（**F-U-SHELF-01**）。**snapshot envelope 未使用**。 |
| **`CORE_USES_TYPE_09_PRESET_DIFFERENT_SOURCE`** | **yes** | **`/core` hero は `coreType`→`HERO_VISUAL_PRESET`**（**F-U-CORE-02**）。**`TYPE_09`＝INFLUENCER／熱量先導**。 |
| **`FREE_AND_PAID_DTR_ENGINE_DIVERGENCE`** | **yes** | **同一 birthDate でも `TYPE_CATALOG[stemIdx]` 英字（HERO）と `DTR_TYPE_EN[stemIdx]` が異なりうる**（**F-U-CORE-03**：**stemIdx 8 例**）。**`runDtrEngine` と core pipeline は別表示経路**。 |
| **`FALLBACK_GLOBAL_LEADER_DEFAULT`** | **no** | **GLOBAL LEADER は `DTR_TYPE_EN[8]` の stem 対応表**（**F-U-SHELF-02**）。**generic fallback ではない**。 |
| **`SNAPSHOT_ARCHETYPE_MISMATCH`** | **no（主因ではない）** | **棚は snapshot archetype を読まない**（**F-U-SNAP-05**）。 |
| **`INCONCLUSIVE`** | **no** | **repo 診断で説明可能** |

---

## 7. Human-local SELECT plan（`5Z-I-V`・本条では未実行）

**方針：** **safe label `user_36xz`／`cs_live_JSRW` で Human-local 照合のみ。** **SSOT には row_count／matched／mismatch のみ。**

| # | 確認 | 期待トークン |
|---|------|----------------|
| 1 | **Clerk ログイン `user_id` suffix** vs **repair 対象 user（safe label）** | **matched／mismatch** |
| 2 | **`dtr_report_snapshots` WHERE `product_id=DTR_CORE_STATIC_V1`（UI login user）** | **row_count 0／1／>1** |
| 3 | **同上（repair 対象 user・Human-local のみ）** | **row_count 比較** |
| 4 | **`entitlements` active + `DTR_CORE_STATIC_V1`（UI user）** | **matched／missing** |
| 5 | **`entitlement_rights` `m55_p:core_origin` + OTF or ent backing（UI user）** | **matched／orphan／missing** |
| 6 | **`one_time_fulfillments`（checkout safe label 照合）** | **matched／missing** |
| 7 | **snapshot `profile_snapshot.birthDate` vs `ProfileRepository` birthDate（Human-local）** | **matched／mismatch**（**type のみ**） |
| 8 | **`essenceStemLaneIndex`（両 birthDate）→ stemIdx** | **same／different**（**redacted index のみ**） |
| 9 | **Vercel log `[dtrOwnershipGate]` `unlockState` class（suffix のみ）** | **owned／locked／grantSource class** |

---

## 8. Recommended next action

**`READY_FOR_HUMAN_LOCAL_DB_READONLY_DIAGNOSTIC_GATE`**

**理由：** unlock 根因は **user_id／snapshot lookup の Production 確認**が必要。**type mismatch は repo 上、ラベル表対応差として説明済み**（**code fix planning は DB 確認後でも可**）。

**Next action class（副次）：**

| Class | 条件 |
|-------|------|
| **`USER_ID_MAPPING_DIAGNOSTIC_REQUIRED`** | **SELECT #1 mismatch 時** |
| **`CODE_FIX_PLANNING_REQUIRED`** | **user 一致後も unlock blocked、または type 表統一 fix** |
| **`SNAPSHOT_REPAIR_PLANNING_REQUIRED`** | **user 一致・ent あり・snap 0 のみ**（**repair retry は別 GO**） |

---

## 9. 判定

| Field | Value |
|--------|--------|
| **Gate verdict** | **`UI_UNLOCK_TYPE_MISMATCH_READONLY_DIAGNOSTIC_GREEN_DB_CONFIRMATION_REQUIRED`** |

**要約：**

- **Unlock：** **コード上は UI login が `locked` なら purchase CTA 必至**。**repair artifact が別 `user_id` に付いている仮説が最有力**（**DB 確認要**）。
- **Type mismatch：** **同一 stem lane で `DTR_TYPE_EN`（棚）と `HERO_VISUAL_PRESET`/`TYPE_CATALOG`（/core）が異なるラベルを返しうる** — **`INFLUENCER` vs `GLOBAL LEADER` は stemIdx 8 の例と整合**。**snapshot_missing や計算破損は主因ではない**。

---

## 10. 未実行事項

- **Production DB write／runner／二回目 repair／manual SQL／grant**
- **Events API／replay／決済／refund**
- **included reply-ticket 検証**
- **Stripe／env／whsec／redeploy／package／runner／runtime／code／UI 変更**
- **Human-local SELECT（本条）**
- **full IDs／secrets／session 記録**

---

## 11. Next

**`Phase 5-6H-5Z-I-V` Human-local DB read-only UI unlock diagnostic gate**

- **§7 SELECT を実行**（**redacted のみ SSOT 化**）
- **mutate 禁止**／**repair retry 禁止**／**refund 禁止**
- **user_id mismatch 確定時：** 別途 **mapping diagnostic**（**`5Z-I-V` 内で verdict 分岐**）
- **type mismatch：** **repo 診断で code fix planning 候補あり** — **実装は explicit GO 後の Gate**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_U_UI_UNLOCK_AND_TYPE_MISMATCH_READ_ONLY_DIAGNOSTIC_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-U-UI-UNLOCK-TYPE-MISMATCH-READONLY-DIAGNOSTIC-001`** |
| **Verdict** | **`UI_UNLOCK_TYPE_MISMATCH_READONLY_DIAGNOSTIC_GREEN_DB_CONFIRMATION_REQUIRED`** |
| **Unlock（primary）** | **`OWNERSHIP_GATE_USER_ID_MISMATCH`**（**DB 確認要**） |
| **Type（primary）** | **`SHELF_CARD_USES_PROFILE_REPOSITORY_NOT_SNAPSHOT`** + **`FREE_AND_PAID_DTR_ENGINE_DIVERGENCE`** |
| **Next** | **`5Z-I-V` Human-local DB read-only** |
