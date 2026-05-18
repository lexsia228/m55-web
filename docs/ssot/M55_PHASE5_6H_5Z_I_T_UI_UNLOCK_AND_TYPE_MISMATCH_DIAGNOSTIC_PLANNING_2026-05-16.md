# Phase 5-6H-5Z-I-T — UI unlock and report type mismatch diagnostic planning gate（2026-05-16 SSOT）

## 1. Phase 名

**Phase 5-6H-5Z-I-T UI unlock and report type mismatch diagnostic planning gate**

本条は **read-only 診断計画**の固定のみ。**DB write／runner／repair／code／UI 変更なし**。

---

## 2. 現在地（前提）

| 項目 | 状態 |
|------|------|
| **`5Z-I-Q`** | **`EXACTLY_ONE_REPAIR_EXECUTION_RECORDED`**／**`REPAIR_EXECUTED_ONCE`**／**DB write by runner `yes`**。 |
| **`5Z-I-R`** | **`POST_REPAIR_PRODUCTION_DB_READ_ONLY_VERIFICATION_GREEN`**／**`POST_REPAIR_DB_ARTIFACTS_VERIFIED`**（**caveat：** agent **Production `SELECT` 未実行**）。 |
| **`5Z-I-S`** | **`UI_REPORT_UNLOCK_VERIFICATION_BLOCKED`**／**`UI_REPORT_UNLOCK_BLOCKED_AFTER_REPAIR`**／**`CORE_PAID_TYPE_MISMATCH_INFLUENCER_VS_GLOBAL_LEADER`**。 |
| **本条** | **repo read-only inspection** により **調査対象・仮説・順序・停止条件**を計画化。**実装修正・DB 診断実行は `5Z-I-U`**。 |

**Work anchor（UI blocked 追認）：** **`e15f0f7d7e84bbd7be6e067e6b3f24a67c1f55cb`** — **`docs: update ui report unlock blocked evidence`**（**`5Z-I-S`**）。

---

## 3. Evidence Registry

| `evidence_id` | Role |
|----------------|------|
| **`M55-EVID-20260516-5Z-I-T-UI-UNLOCK-TYPE-MISMATCH-DIAGNOSTIC-PLAN-001`** | **本条：** 診断計画 |
| **`M55-EVID-20260516-5Z-I-S-UI-REPORT-UNLOCK-VERIFICATION-001`** | UI unlock blocked |
| **`M55-EVID-20260516-5Z-I-R-POST-REPAIR-DB-READONLY-VERIFICATION-001`** | post-repair DB（caveat 付き） |
| **`M55-EVID-20260516-5Z-I-Q-EXACTLY-ONE-REPAIR-EXECUTION-001`** | exactly-one repair |

**Full IDs／secrets／session／cookie：** **記録しない**。

---

## 4. Observed findings（`5Z-I-S` 転記・redacted）

| Finding | 要約 |
|---------|------|
| **`UI_REPORT_UNLOCK_BLOCKED_AFTER_REPAIR`** | **logged in**／**DTR area reached**／**paid unlock no**／**purchase CTA blocking yes**（**¥1,000**／**購入する**／**1,000円で入手**／**商品ページ**文脈） |
| **`CORE_PAID_TYPE_MISMATCH_INFLUENCER_VS_GLOBAL_LEADER`** | **本質側：** **`熱量先導`／`INFLUENCER`** — **棚カード側：** **`GLOBAL LEADER`** |
| **Connection error** | **最新スクショでは未観測**（**`接続を確認できませんでした` は消失の可能性**） |
| **Paid snapshot visible** | **no**（UI 上） |

**Safe labels（参照のみ）：** **`cs_live_JSRW`**／**`user_36xz`**

---

## 5. Non-conclusions（本条で確定しないこと）

| 項目 | 方針 |
|------|------|
| **計算ロジック破損** | **未確定**（**二重ソースの可能性**を優先調査） |
| **`snapshot_missing`** | **未確定**（**`5Z-I-R` は `dtr_report_snapshots` `row_count 1`・caveat 付き**） |
| **DB artifact 欠落** | **未確定**（**`5Z-I-R` GREEN と UI BLOCKED の両立**） |
| **repair retry** | **禁止**（別 Gate・明示 GO のみ） |
| **refund** | **禁止** |
| **included reply-ticket 検証** | **本条・次条 `5Z-I-U` では実施しない** |

---

## 6. Diagnostic hypotheses（H1–H8）

| ID | 仮説 | 優先度（計画） |
|----|------|----------------|
| **H1** | **ownership gate mismatch** — repair で artifact はあるが **`resolveEntryReportOwnership`** が **`locked`** を返す（**snapshot 優先→rights+backing→entitlements repair** のいずれかで落ちる） | **P0** |
| **H2** | **user identity mismatch** — repair 対象 **Clerk `user_id`** と UI ログイン **Clerk `user_id`** が別（**safe label `user_36xz` で Human-local 照合**） | **P0** |
| **H3** | **snapshot lookup mismatch** — **`getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1)`** が **`.maybeSingle()`** で **0 行／複数行／parse null**（**UI は `snap == null` で LP へ**） | **P0** |
| **H4** | **product_id / entitlement key mismatch** — UI／fulfillment は **`DTR_CORE_STATIC_V1`**／rights は **`m55_p:core_origin`**（**`lib/oneTimeCheckout.ts`／`dtrCoreCheckoutFulfillment.ts`**） | **P1** |
| **H5** | **report shelf card source mismatch** — 棚カード **`GLOBAL LEADER`** は **client `ProfileRepository` + `essenceStemLaneIndex`**（**`DTR_TYPE_EN[stemIdx]`**）。**owned でも snapshot envelope ではなく profile stem を表示** | **P0**（type mismatch） |
| **H6** | **archetype calculation source mismatch** — **`/dtr/core`** は **`runDtrEngine(snapshot.profile)`** で **再計算 envelope**。**`/core` 本質**は **`CoreHeroSection` `HERO_VISUAL_PRESET[coreType]`**（**`TYPE_09`＝INFLUENCER／熱量先導**）。**同一 birthDate でも lane index と coreType が異なりうる** | **P0**（type mismatch） |
| **H7** | **cache/session/stale UI** — **super reload 後も unlock 不可**のため **単独原因とは見ない**（**補助確認のみ**） | **P2** |
| **H8** | **RLS/API read mismatch** — **admin client（server）** と **Human SELECT** の差（**`5Z-I-R` caveat** と合わせ **`5Z-I-U` で row 内容・`user_id` 整合のみ redacted 確認**） | **P1** |

---

## 7. Read-only inspection plan（repo・本条で実施済みの要約）

**方針：** **POST／write route は実行しない。** **コード変更なし。**

### 7.1 DTR ownership / unlock gate（P0）

| 対象 | パス | 確認したこと／次に見ること |
|------|------|---------------------------|
| **Ownership resolver** | `lib/m55/dtrOwnershipGate.ts` | **順序：** (1) **`getDtrReportSnapshot`→`owned`** (2) **`entitlement_rights` + entitlements/OTF backing** (3) **active entitlements + rights repair upsert**。**(2) orphan rights のみ→`locked`**。 |
| **Snapshot lookup** | `lib/m55/dtrDraftDb.ts` `getDtrReportSnapshot` | **`.eq('user_id', userId).eq('product_id', productId).maybeSingle()`**。**`id` parse 失敗→null**。 |
| **Shelf gate** | `app/dtr/page.tsx` | **`resolveEntryReportOwnership`→`ownershipState`**。**`owned` 時のみ `snapshotReady = snap != null`**。 |
| **LP CTA** | `app/dtr/lp/page.tsx` | **`locked`→`lpCtaMode=purchase`**（**¥1,000／PurchaseButton**）。**`owned`+snap→`open`**。**`owned`+no snap→`pending`**。 |
| **Core reader** | `app/dtr/core/page.tsx` | **`locked`→redirect `/dtr/lp`**。**snap あり→`runDtrEngine` 再計算して `DtrFullReader`**。**snap なし→redirect `/dtr/lp`**。 |

**`5Z-I-U` 質問：** UI が **purchase** のとき **server は `unlockState===locked` か**？ **Vercel log `[dtrOwnershipGate]` の `grantSource`／`unlockState` は何か**（**full userId ログは SSOT に載せない**）。

### 7.2 Report shelf / type display（P0・H5/H6）

| 対象 | パス | 確認したこと |
|------|------|----------------|
| **Shelf card type label** | `components/dtr/DtrShelfPanel.tsx` | **Client：`ProfileRepository.get(ownerId)` + `essenceStemLaneIndex(birthDate)`→`DTR_TYPE_EN[stemIdx]`**（**8＝`GLOBAL LEADER`**、**2＝`INFLUENCER`**）。**Server `ownershipState` とは独立**。 |
| **Shelf CTA** | 同上 `EntryReportCard` | **`owned && snapshotReady`→`/dtr/core`**。**`owned && !snapshotReady`→`/dtr/lp`「準備中」**。**`locked`→`/dtr/lp`＋購入 CTA**。 |
| **Full reader types** | `components/dtr/DtrFullReader.tsx` | **stem index→英語ラベル表**（棚と同系） |
| **Core 本質 hero** | `components/core/CoreHeroSection.tsx` | **`HERO_VISUAL_PRESET`** — **`TYPE_09`＝INFLUENCER／`観測特性：熱量先導`**（**`TYPE_07`＝GLOBAL LEADER**） |

**`5Z-I-U` 質問：** Human 観測の **INFLUENCER** は **`/core` か `/dtr/core` か**？ **GLOBAL LEADER** は **`/dtr` 棚カードか**？ **stemIdx／coreType の redacted 対応表**を Human-local で作る。

### 7.3 Paid product page / purchase CTA（P0）

| 対象 | パス | 確認したこと |
|------|------|----------------|
| **Checkout guard** | `app/api/purchase/checkout/route.ts` | **既存 active entitlement チェック**（**実行は `5Z-I-U` でしない**） |
| **Purchase button** | `components/PurchaseButton.tsx` | **`DTR_CORE_STATIC_V1`→`STRIPE_PRICE_DTR_CORE_STATIC_V1`** |

### 7.4 Snapshot retrieval / fulfillment（P0–P1）

| 対象 | パス | 確認したこと |
|------|------|----------------|
| **Fulfillment** | `lib/m55/dtrCoreCheckoutFulfillment.ts` | **`upsertDtrReportSnapshotAtFulfillment`**。**product **`DTR_CORE_STATIC_V1`**／right **`m55_p:core_origin`**。 |
| **Processing error UI** | `app/dtr/processing/page.tsx` | **`接続を確認できませんでした`**＝**admin throw または fulfill `db_error`**（**snap null「準備中」とは別**） |
| **Snapshot ready API** | `app/api/dtr/report-snapshot-ready/route.ts` | **ownership + `getDtrReportSnapshot`**（**read-only 設計確認用**） |

### 7.5 API routes（read-only・POST 不実行）

| Route | 用途（計画） |
|-------|----------------|
| `app/api/dtr/draft/me` | draft 有無（**GET のみ Human／`5Z-I-U`**） |
| `app/api/dtr/draft/claim` | **POST — 実行禁止** |
| `app/api/me/entitlements/route.ts` | **product_id filter** 設計確認 |
| `app/api/stripe/webhook/route.ts` | **fulfillment 経路参照のみ** |

---

## 8. Repo read-only findings（計画時点・redacted）

| ID | 所見 | 示唆 |
|----|------|------|
| **F-T-01** | **購入 CTA（`/dtr/lp` `purchase`）は `resolveEntryReportOwnership` が `locked` のときのみ**（**`5Z-I-S` UI と整合**） | **H1／H2／H3 を最優先** |
| **F-T-02** | **棚カードの type 英字は client profile stem index。`/dtr/core` 本文は server `runDtrEngine(snapshot.profile)`** | **H5／H6：表示不一致は「別関数・別入力」で説明可能。計算破損と断定しない** |
| **F-T-03** | **`/dtr/core` は snap ありでも envelope を DB からではなく engine 再計算** | **snapshot row があっても表示 type は engine 出力に依存** |
| **F-T-04** | **`5Z-I-R` artifact GREEN と UI `locked` は両立しうる（別 user／lookup miss／orphan rights）** | **`5Z-I-U` で Human-local SELECT + gate log 突合** |

---

## 9. Future read-only verification plan（`5Z-I-U` 向け）

**SSOT に full ID を書かない。** **`row_count`／`matched`／`mismatch`／`unclear` のみ。**

| # | 確認項目 | 期待するトークン |
|---|----------|------------------|
| 1 | **Clerk logged-in `user_id`（Human-local）** vs **repair safe label `user_36xz` 同一性** | **matched／mismatch** |
| 2 | **`dtr_report_snapshots` for target user + `DTR_CORE_STATIC_V1`** | **row_count 1／0／>1**；**`envelope_json` parseable：yes/no** |
| 3 | **`entitlements` active + `product_id`** | **matched／missing** |
| 4 | **`entitlement_rights` `m55_p:core_origin` + backing OTF/ent** | **matched／orphan／missing** |
| 5 | **`one_time_fulfillments` for target checkout（safe label 照合）** | **matched／missing** |
| 6 | **Production Vercel log sample `[dtrOwnershipGate]` unlockState**（**redacted user suffix のみ**） | **owned／locked／grantSource class** |
| 7 | **Human UI route map**（**/dtr vs /dtr/lp vs /dtr/core vs /core**） | **documented** |
| 8 | **Profile birthDate stem index（Human-local）** vs **engine coreType（Human-local）** | **matched／mismatch／unclear** |

**API read-only（任意・Human）：** **`GET /api/me/entitlements`** が **active DTR を返すか**（**session cookie Human-only**）。

---

## 10. 診断順序（`5Z-I-U` 実行手順）

1. **UI unlock gate 実条件** — **`/dtr/lp` が `purchase` になる条件＝`locked` か確認**（server log／read-only API）。
2. **user_id 整合** — repair 対象と UI ログイン（**H2**）。
3. **snapshot lookup** — **`getDtrReportSnapshot` 条件と DB 行の一致**（**H3**）。
4. **ownership 分岐** — snapshot／rights+backing／entitlements repair のどこで落ちるか（**H1**）。
5. **type mismatch** — shelf **profile stem** vs **core engine** vs **`CoreHeroSection` coreType**（**H5/H6**）。
6. **product_id / keys** — **`DTR_CORE_STATIC_V1`／`m55_p:core_origin`**（**H4**）。
7. **RLS/admin read** — Human SELECT vs server admin（**H8**）。
8. **STOP 判定** — 下記 §11。

---

## 11. STOP conditions（`5Z-I-U` 中）

- **full ID／secret／session／cookie を SSOT や chat に載せる必要が出た** → **STOP**（Human-local のみ）。
- **repair retry／runner／refund／新規決済の誘因**が出た → **STOP**（別 Gate）。
- **コード修正が先に必要と断定** → **STOP**（**実装 Gate を分離**）。
- **DB write が必要と断定** → **STOP**（**専用 repair 計画 Gate**）。

---

## 12. 判定

| Field | Value |
|--------|--------|
| **Planning verdict** | **`READY_FOR_UI_UNLOCK_TYPE_MISMATCH_READ_ONLY_DIAGNOSTIC_GATE`** |

**採用理由：** **repo 要約は本条で実施済み**だが、**Production 側の `user_id` 整合・snapshot 行内容・gate log・UI route 突合**は **`5Z-I-U` read-only 実行**が必要。

**未採用：** **`READY_FOR_UI_UNLOCK_DIAGNOSTIC_EXECUTION_GATE`**（**Human-local DB／log 証跡が未着手**）。

---

## 13. 未実行事項

- **Production DB write／runner／二回目 repair／manual SQL／grant**
- **Events API／replay／決済／refund**
- **included reply-ticket 検証**
- **Stripe／env／whsec／redeploy／package／runner／runtime／code／UI 変更**
- **UI 修正実装／snapshot 補正 runner／DB 修復再実行**
- **full IDs／secrets／session 記録**

---

## 14. Next

**`Phase 5-6H-5Z-I-U` UI unlock and type mismatch read-only diagnostic execution gate**

**`5Z-I-U` 必須規律：**

- **repo／code read-only** 継続可
- **Human-local SELECT／log 観測**は **redacted のみ SSOT 化**
- **DB mutate なし**／**code 変更なし**／**repair retry なし**／**refund なし**／**返書券検証なし**

---

## 本条パス

`docs/ssot/M55_PHASE5_6H_5Z_I_T_UI_UNLOCK_AND_TYPE_MISMATCH_DIAGNOSTIC_PLANNING_2026-05-16.md`

---

### 本条サマリー

| Field | Value |
|--------|--------|
| **Evidence** | **`M55-EVID-20260516-5Z-I-T-UI-UNLOCK-TYPE-MISMATCH-DIAGNOSTIC-PLAN-001`** |
| **Verdict** | **`READY_FOR_UI_UNLOCK_TYPE_MISMATCH_READ_ONLY_DIAGNOSTIC_GATE`** |
| **Top hypotheses** | **H1 ownership**／**H2 user id**／**H3 snapshot lookup**／**H5–H6 dual type source** |
| **Next** | **`5Z-I-U` read-only diagnostic execution** |
