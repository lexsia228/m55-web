---
gate: CATEGORY-1-M55-DTR-BASE-CATALOG-AND-COPY-SSOT-FREEZE-PRESERVATION-REV1
source_planning_gate: CATEGORY-1-M55-DTR-BASE-CATALOG-AND-COPY-SSOT-FREEZE-PLANNING-REV1
source_planning_gate_result: GREEN
branch: main
head_sha: dbb2fbbcffdc7cf045677f33d3d8a9ead1e43361
created_at_jst: 2026-06-27T21:00+09:00
model_mode: Sonnet planning / Fast preservation
purpose: DOB個別化拡張前 baseline freeze
---

# M55 DTR ベースカタログ・コピー SSOT フリーズベースライン — DOB個別化拡張前

**Gate:** `CATEGORY-1-M55-DTR-BASE-CATALOG-AND-COPY-SSOT-FREEZE-PRESERVATION-REV1`
**作成日時:** 2026-06-27 21:00 JST
**性質:** 内部証跡専用。NOTE / LP / SNS / 外部告知文ではない。

---

## 1. Gate Identity

| 項目 | 値 |
|---|---|
| Gate name | `CATEGORY-1-M55-DTR-BASE-CATALOG-AND-COPY-SSOT-FREEZE-PRESERVATION-REV1` |
| Source planning gate | `CATEGORY-1-M55-DTR-BASE-CATALOG-AND-COPY-SSOT-FREEZE-PLANNING-REV1` — GREEN |
| created_at_jst | 2026-06-27T21:00+09:00 |
| branch | `main` |
| HEAD SHA | `dbb2fbbcffdc7cf045677f33d3d8a9ead1e43361` |
| model mode | Sonnet planning / Fast preservation |
| purpose | DOB個別化拡張前 baseline freeze |

---

## 2. Freeze Purpose

本アーティファクトは、**DOB（生年月日）個別化拡張の実装前**に、現行の DTR ベースカタログ・有料個別化層・製品コピー SSOT・コンサルト返書グラウンディング契約を内部ベースラインとして固定する。

**重要な区別:**

- 現行製品はすでに「10資質テンプレートのみの商品」ではない。有料層には購入時コンテキストと個別化（節気 × 月齢位相 × 陰暦月）が存在する（最終エビデンス Claim A: CONFIRMED / STRONG）。
- しかし、現行 base catalog（`STEM_BODIES`）には stem 0–9 × 8 section の安定した base 章本文が存在する。
- より深い DOB 個別化を実装する前に、この状態を historical / operational baseline として保存する必要がある。
- 将来の変更は、このベースラインとの diff として「意図的な個別化拡張」であることを証明できる。

**本アーティファクトは内部証跡専用。** NOTE / LP / SNS / 外部告知文ではない。

---

## 3. Category A — Base Catalog Inventory

### `lib/m55/dtrEngine.ts`

| 項目 | 値 |
|---|---|
| SHA256 | `2e58fc91d8d0b783b51a594649045c5e186064818ad004a0861ec9934d825841` |
| line count | 946 |
| category | base catalog / engine |
| freeze role | `STEM_BODIES`（stem 0–9 × 8 section 全本文）、`SECTION_SPECS`（8章定義）、`runDtrEngine`（paid individualization 注入ロジック） |
| line range summary | `STEM_BODIES` L118–340、`SECTION_SPECS` L801–818、`runDtrEngine` L823–946 |
| full text included | **No** — SHA256 で証明。全文は収録しない |

**SECTION_SPECS（8章 ID / タイトル — 構造のみ）:**

| id | title | bodyKey |
|---|---|---|
| s1_identity | あなたという人物 | identity |
| s2_composition | 構成と傾向の全体像 | composition |
| s3_essence | 本質と安定の条件 | essence |
| s4_strengths | 自分の出やすい面 | strengths |
| s5_friction | 無理が出やすいところ | friction |
| s6_relation | 人とのやりとりの癖 | relation |
| s7_work | 日々の取扱いヒント | work |
| s8_bridge | まとめと相談返書について | bridge |

### `lib/m55/tenStemCatalog.ts`

| 項目 | 値 |
|---|---|
| SHA256 | `9949e658e0d530b91b0ab8ff130e3cbad0bf7b82714d1ec563560983e0511fb5` |
| line count | 97 |
| category | base catalog |
| freeze role | `TEN_STEM_DISPLAY`（10 stem の publicTitle / symbol / displayOneLine / keywordPool / focusPool） |
| full text included | stem index と publicTitle のみ（構造一覧） |

**TEN_STEM_DISPLAY publicTitle 一覧（stem 0–9）:**

| index | publicTitle |
|---|---|
| 0 | プレジデント |
| 1 | プランナー |
| 2 | インフルエンサー |
| 3 | クリエイター |
| 4 | マネージャー |
| 5 | プロデューサー |
| 6 | エグゼキューター |
| 7 | デザイナー |
| 8 | グローバルリーダー |
| 9 | アナリスト |

### `lib/m55/essenceEngine.ts`

| 項目 | 値 |
|---|---|
| SHA256 | `0b3cfeb1ac2e5818a0f66b0f7bcf35a65b515d17b0b29927b1468056f454d4a2` |
| line count | 256 |
| category | stem derivation |
| freeze role | `essenceStemLaneIndex(birthDate)` — JDN-based provisional stem 導出。free preview 系で引き続き使用 |
| full text included | 関数シグネチャ要約のみ |

---

## 4. Category B — Current Paid Individualization Layer

### `lib/m55/dtrPaidIndividualization.ts`

| 項目 | 値 |
|---|---|
| SHA256 | `e563a63a77552466ec39aeeb15387985d5543dc741f4d523c33343e953991ac0` |
| line count | 209 |
| category | paid individualization |
| freeze role | 現行 DOB 個別化層の完全定義。DOB拡張で最初に変更される候補ファイル |
| line range summary | 定数定義 L29–113、関数群 L145–198 |
| full text included | **No** — key 一覧と次元数のみ |

**現行個別化次元:**

```
solarTermKey(24) × lunarDayPhase(3: early/mid/late) × lunarMonthKey(12) × birthTimeUnknown(bool)
```

**定数マップ key 数:**

| マップ | key 数 | 用途 |
|---|---|---|
| `SOLAR_TERM_SEASON_READINGS` | 24 | 節気 → auxiliaryReading 季節リズム |
| `LUNAR_PHASE_HANDLING` | 3 (early/mid/late) | 月齢位相 → handlingHint |
| `LUNAR_MONTH_ESSENCE_READINGS` | 12 (月1–12) | 陰暦月 → essenceRhythmNote |

**安全な静的ラベル（prefix 文字列）:**

- `【この保存版だけの本質リズム】` — s3 章先頭 prefix（`buildPaidDtrS3IndividualizationPrefix`）
- `【この保存版だけの補助整理】` — s7 章先頭 prefix（`buildPaidDtrS7IndividualizationPrefix`）

**内部キー漏れガード:** `FORBIDDEN_USERFacingSubstrings`（`甲乙丙丁`、`solarTerm`、`stemLane` 等16項目）

---

## 5. Category C — Composite / Fulfillment Snapshot Generation

### ファイル一覧

| ファイル | SHA256 | line count | freeze role |
|---|---|---|---|
| `lib/m55/compositeStem/buildV2FulfillmentSnapshot.ts` | `19b99bf4fdc8c7378796a7475f6e032bcfa5dc30d71eb5fb604c66c21e089fe5` | 152 | 購入時スナップショット生成の主関数 |
| `lib/m55/compositeStem/pipeline.ts` | `f8cb3e9a6c8208d65a72611cf283ad994723fe387101f545eab39c42a5851f67` | 114 | `runM55CompositeStemPipeline`（solarTerm / lunarDay / lunarMonth 解決） |
| `lib/m55/compositeStem/constants.ts` | `8c976ac66b7c27dfe4421982d789a8dd934e43f42898ee18199662a514220d8e` | 9 | 版番号・カレンダー範囲定数 |
| `lib/m55/compositeStem/types.ts` | `f05eac4e6e88e406c7e4998128572e7217928aef434a7a916cdefbe0ac8df2c5` | 86 | `CompositeStemResult` / `boundaryMetadata` 型 |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | `2800dafe6d46b2219aae5d72d98fe93f1581511f080821a2879c01371fc0add4` | — | checkout → snapshot 生成 entry point |

**constants.ts 現行値（安全な静的定数）:**

| 定数 | 値 |
|---|---|
| `ENGINE_VERSION_V2` | `m55-composite-stem-v2` |
| `INPUT_VERSION_V1` | `composite-input-v1` |
| `CORRECTION_VERSION` | `m55-calendar-2026-01` |
| `CALENDAR_RANGE_START` | `1900-01-01` |
| `CALENDAR_RANGE_END` | `2100-12-31` |
| `PRIMARY_TIMEZONE_BUCKET` | `Asia/Tokyo` |

**購入時スナップショット生成フロー（構造要約）:**

```
Stripe checkout sessionMetadata + draft
  → resolveFulfillmentProfileFields
  → runM55CompositeStemPipeline (solarTerm / lunarDay / lunarMonth → boundaryMetadata)
  → buildPaidDtrIndividualizationFromComposite
  → runDtrEngine({ stemLaneIndex, paidIndividualization })
  → profile_snapshot + envelope_json + engine_context_json
  → upsertDtrReportSnapshotAtFulfillment (INSERT only)
```

---

## 6. Category D — Snapshot / Display Immutability Boundary

### ファイル一覧

| ファイル | SHA256 | line count | freeze role |
|---|---|---|---|
| `lib/m55/compositeStem/storedEnvelopeRead.ts` | `589773d0be423acb1059a38457bea0edc00d6d4d10e83e582bade346e152d9fe` | 119 | `resolveStoredEnvelopeRead` — stored envelope v2 consistency check |
| `lib/m55/compositeStem/resolveDisplayedDtrEnvelope.ts` | `44fd0609c28203aacfa210889d09511980244334a04abafdc12c2492c44af352` | 237 | display normalization — `displayNormalizeSource: 'current_dtr_engine_catalog'` |
| `lib/m55/dtrDraftDb.ts` | `04dd9072ae1eef67ace87f7840b4345f0c43df933667e1a3c63a4379243a1134` | — | `upsertDtrReportSnapshotAtFulfillment` — snapshot immutability |

**不変性設計（freeze 点）:**

1. **既存 visible snapshot がある場合 → INSERT しない / 上書きしない**
2. **再購入（hidden-only 状態）→ 新規 INSERT。既存行は soft-hide のまま**
3. **表示時: stored `engine_context_json`（購入時保存）を primary source として使用**
4. **現在の可変プロフィールを primary source として使用するパスは存在しない**

**display normalization 設計注記:**

- `resolveDisplayedDtrEnvelope` は v2 snapshot に対し `runDtrEngine` を current catalog + stored engine_context で再実行する
- `displayNormalizeSource = 'current_dtr_engine_catalog'` として明示記録
- 変わらないもの: `stemLaneIndex`、`boundaryMetadata`（solarTermKey / lunarDayKey / lunarMonthKey）、`paidIndividualization` 算出パラメータ
- これは silent overwrite ではなく、catalog copy の display normalization として設計されている

**本セクションに real DB rows は含まない。**

---

## 7. Category E — Product Copy Claims at Freeze Point

### ファイル一覧

| ファイル | SHA256 | line count | freeze role |
|---|---|---|---|
| `lib/m55/paidDtrProductCopy.ts` | `3ebe018fab242200332666509db36bc09f904945111d7274232fabe89665db44` | 1470 | product copy SSOT master |
| `lib/m55/paidDtrProductCopy.test.ts` | `4051dbc3af2ca639c2faf46d29e38314f27963aa3b98689d79c53cd3d2c9f8c5` | 306 | copy contract tests |
| `app/dtr/lp/page.tsx` | `e3585a68f0441b3ceb04dc3c8065e7a1a492f4d08a5e4b2f269780368f409c3c` | 397 | LP — `PAID_DTR_LP` import |
| `app/dtr/core/page.tsx` | `c91f8fd10b46cffee4a02e5c17102edd7cbdae70ce62479e5bbb7fd5b532e59e` | 88 | core reader — `resolveDisplayedDtrEnvelope` import |
| `app/dtr/processing/page.tsx` | `c0be203ac0178a4eb342caab2d6e9b470f41de9ebb635a3b74100e54fdefff9c` | 195 | processing — `fulfillDtrCoreFromCheckoutSessionId` import |

**安全な静的コピー（freeze 点の現行文）:**

`PAID_DTR_INDIVIDUALIZATION_FRAMING.readerContextJa`:
> 保存版では、10資質の入口に加えて、生年月日から出る複合的な読み取りを、購入時点のプロフィールに合わせて本文内に整理しています。

`PAID_DTR_TRUST_BOUNDARIES.profileSnapshotJa`:
> 保存版は購入時点のプロフィールをもとに作成・保存されています。表示名などが現在と異なる場合があります。

**PAID_DTR_CHAPTERS（4章タイトル）:**

| roman | title |
|---|---|
| Ⅰ | 輪郭を見る |
| Ⅱ | 構造を読む |
| Ⅲ | 無理を知る |
| Ⅳ | 楽に扱う |

**PAID_DTR_FORBIDDEN_CLAIMS（16項目 — 要約リスト）:**

1. unlimited chat
2. anything can be asked
3. guaranteed result
4. deterministic future
5. medical/legal/investment advice as product output
6. exact body character counts without verified approval
7. report-ready email from M55
8. reply-ready email from M55
9. product update push notifications (not implemented)
10. new divination authority claims
11. 8-chapter product structure as current truth
12. max 3 replies per report as current truth
13. ¥700 additional reply as current truth
14. Entry Report as primary Japanese product name
15. Premium or Blueprint as primary product name
16. generic public AI chat

---

## 8. Category F — Saved Snapshot Notice / UI Copy

### ファイル一覧

| ファイル | SHA256 | line count | freeze role |
|---|---|---|---|
| `lib/m55/dtrSavedReportCopy.ts` | `30744afeaf5b065549247401a2cc5b7c4e402d6e852c647295061d8fdf986c8a` | 19 | snapshot notice copy SSOT |
| `components/dtr/SavedSnapshotNotice.tsx` | `78252ed777a82261783461b8f07e52f64f7084ea63fb466f6b4861e926fd1862` | 20 | notice component — `SAVED_SNAPSHOT_NOTICE_PRIMARY` import のみ |
| `components/dtr/DtrFullReader.tsx` | — | 3246 | SHA + import-structure のみ。3246行 JSX 本文は収録しない |

**安全な静的 saved snapshot notice copy:**

`SAVED_SNAPSHOT_NOTICE_PRIMARY`:
> この保存版は、購入時点のプロフィールをもとに作成・保存されています。

`SAVED_SNAPSHOT_NOTICE_LEGACY_MODE`（legacy snapshot のみ表示）:
> この保存版は、購入時点のプロフィールと内容で固定されています。現在の無料鑑定と表示名が異なる場合があります。保存版の本文と相談返書では、購入時の内容を基準に扱います。

**DtrFullReader.tsx:** `paidDtrProductCopy.ts` から多数の export を import（`PAID_DTR_CHAPTER_*`、`PAID_DTR_INTRO_*`、`PAID_DTR_CONSULT_*` 等）。UI コピーは SSOT 経由。SHA256 は hash inventory テーブル参照。

---

## 9. Category G/H — Consult Reply Grounding Contract and Theme Map

### ファイル一覧

| ファイル | SHA256 | line count | freeze role |
|---|---|---|---|
| `lib/m55/consult/consultReportContext.ts` | `b1fea4d0c13ec2bf5b7015fc1ae885e8e867c0e1a5eb99c790d3ceb8d888a5de` | — | `buildConsultReportContextFromEnvelope` — grounding context builder |
| `lib/m55/consult/consultReplyGenerationContract.ts` | `b70ea932dd57e7312c2e0ca96522d9b877beb7982efbcaf7f056584524819e7b` | — | reply length / structure contract |
| `app/api/room/core/send/route.ts` | `8b45786820a60697c2f9c17b9226f75406bb503939268f12764fdfa34424334d` | — | send route — guard order + system prompt |
| `lib/m55/reply/laneBProductionFailClosed.ts` | `1ea1b235450e07f9cc4b16ccbc415c9a3cea4c0667f39919f054a4a5491fe8f1` | — | Lane B fail-close |
| `lib/m55/consult/consultReplyThemePartMap.ts` | `ce11a9ad2599da01d7b52b9e14e8ac438f9c45d78daa8a003e354c86d6d24d35` | — | theme → chapter map |
| `lib/m55/consult/consultSendMessage.ts` | `0d19979ea64409e2d7920e40a358bb35c17a0fd40907bf1ab3517c5031ef33cc` | — | send validation — theme required |

**Consult grounding 定数（freeze 点）:**

| 定数 | 値 |
|---|---|
| `CONSULT_REPORT_CONTEXT_TOTAL_CAP` | 1800 |

**SECTION_LIMITS（consultReportContext.ts）:**

| section id | maxBodyChars | role |
|---|---|---|
| s1_identity | 120 | support |
| s2_composition | 120 | support |
| s3_essence | 360 | primary |
| s4_strengths | 360 | primary |
| s5_friction | 360 | primary |

**CONSULT_REPLY_GENERATION 定数（freeze 点）:**

| 定数 | 値 |
|---|---|
| targetMinJa | 1200 |
| targetMaxJa | 1800 |
| minimumAcceptableJa | 1000 |
| hardUpperGuidanceJa | 2200 |
| outputHardCapJa | 2400 |
| assistantMessageRpcMaxJa | 2800 |
| minBlockCount | 4 |
| maxBlockCount | 5 |

**PRIMARY_THEME_PART_MAP（5テーマ → 章）:**

| theme | roman | chapter name |
|---|---|---|
| 恋人・近い人との向き合い方 | Ⅲ | 無理を知る |
| 仕事・これからの進め方 | Ⅱ | 構造を読む |
| お金・生活・疲れの整え方 | Ⅳ | 楽に扱う |
| これからの動き方 | Ⅱ | 構造を読む |
| 疲れたときの戻り方 | Ⅳ | 楽に扱う |

**Lane B fail-close（freeze 点）:**

```typescript
// lib/m55/reply/laneBProductionFailClosed.ts
export function isLaneBReplySurfaceEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}
// → 本番では常に false。POST /api/reply/generate は 410 return。
```

**Send route guard order（高レベル要約）:**

```
1. Auth (Clerk)                     → 401 if fail       [ticket消費なし]
2. Idempotency Key 検証             → 400 if fail       [ticket消費なし]
3. Ownership Gate                   → 403 if fail       [ticket消費なし]
4. Input validation (theme必須)     → 422 if fail       [ticket消費なし]
5. Safety guard                     → 422 if blocked    [ticket消費なし]
6. Thread / Wallet check (read-only)→ 404/403 if fail  [ticket消費なし]
7. Snapshot 読み取り                → 409 if fail       [ticket消費なし]
8. Envelope 解決                    → 409 if fail       [ticket消費なし]
9. Report context ビルド            → 409 if fail       [ticket消費なし]
10. AI 生成 (OpenAI)               → 503 if fail       [ticket消費なし]
11. 出力安全・品質・完全性チェック  → 422/503 if fail  [ticket消費なし]
12. RPC m55_consult_reply_commit    → ここのみチケット消費（atomicトランザクション内）
```

---

## 10. Category I/J/K — UI Anchors / Evidence / SSOT Docs

### Category I — Consult room UI copy anchors

| ファイル | SHA256 | line count | freeze role |
|---|---|---|---|
| `components/dtr/ConsultRoom.tsx` | `9231fbf6da4a3798f6f8680f8cea3589d2cb0da205e8a5b49b5e31065bb1661c` | 873 | `PAID_DTR_CONSULT_*` / `PAID_DTR_CONSULT_ROOM_UI` import — SSOT 経由 |
| `components/dtr/ConsultReplyCard.tsx` | `b06baee0e83e0ff9ce5535405d28a1ae63ba12b9649bc3959d17b46af21a6695` | 237 | `PAID_DTR_CONSULT_ENTRY_NEUTRAL` / `PAID_DTR_CONSULT_ROOM_UI` import — SSOT 経由 |

### Category J — Final internal evidence artifact

| ファイル | SHA256 | line count | freeze role |
|---|---|---|---|
| `docs/evidence/M55_PAID_DTR_AND_CONSULT_REPLY_FINAL_INTERNAL_EVIDENCE_2026-06-27.md` | `4d48850dc7ca2fbe110976369f74d2216b28eb288f3e3756d4d7f1fac24203fa` | 383 | DOB拡張前の製品信頼証跡確定版（Claim A/B/C/Lane B / SSOT整合 すべて CONFIRMED / STRONG） |

### Category K — Relevant docs/ssot files

| ファイル | SHA256 | freeze role |
|---|---|---|
| `docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | `f91c2f194e265ef7da9a31682bfba1f4315375ac839912865aea6ffd370f3786` | product copy SSOT 文書 authority |
| `docs/ssot/M55_DTR_CORE_FINAL_RELEASE_READINESS_CLOSEOUT_2026-06-03.md` | `728d1aff22f21fd83543a8ae5c29cf72790cb30fcbe91d0339930c63aaf7ecb8` | 2026-06-03 DTR Core リリース準備完了証跡 |
| `docs/ssot/M55_BASELINE_FREEZE_20260330.md` | `98782802aa10194cf5ee4d3ab7eaefee0d93a043b5d56e5573c367b9e3579d0b` | 2026-03-30 先行ベースラインフリーズ文書 |

---

## 11. File / Hash Inventory

| path | category | SHA256 | line count | freeze role |
|---|---|---|---|---|
| `lib/m55/dtrEngine.ts` | A | `2e58fc91d8d0b783b51a594649045c5e186064818ad004a0861ec9934d825841` | 946 | base catalog / STEM_BODIES |
| `lib/m55/tenStemCatalog.ts` | A | `9949e658e0d530b91b0ab8ff130e3cbad0bf7b82714d1ec563560983e0511fb5` | 97 | TEN_STEM_DISPLAY |
| `lib/m55/essenceEngine.ts` | A | `0b3cfeb1ac2e5818a0f66b0f7bcf35a65b515d17b0b29927b1468056f454d4a2` | 256 | stem derivation |
| `lib/m55/dtrPaidIndividualization.ts` | B | `e563a63a77552466ec39aeeb15387985d5543dc741f4d523c33343e953991ac0` | 209 | paid individualization layer |
| `lib/m55/compositeStem/buildV2FulfillmentSnapshot.ts` | C | `19b99bf4fdc8c7378796a7475f6e032bcfa5dc30d71eb5fb604c66c21e089fe5` | 152 | fulfillment snapshot builder |
| `lib/m55/compositeStem/pipeline.ts` | C | `f8cb3e9a6c8208d65a72611cf283ad994723fe387101f545eab39c42a5851f67` | 114 | composite pipeline |
| `lib/m55/compositeStem/constants.ts` | C | `8c976ac66b7c27dfe4421982d789a8dd934e43f42898ee18199662a514220d8e` | 9 | version constants |
| `lib/m55/compositeStem/types.ts` | C | `f05eac4e6e88e406c7e4998128572e7217928aef434a7a916cdefbe0ac8df2c5` | 86 | type contract |
| `lib/m55/dtrCoreCheckoutFulfillment.ts` | C | `2800dafe6d46b2219aae5d72d98fe93f1581511f080821a2879c01371fc0add4` | — | fulfillment entry |
| `lib/m55/compositeStem/storedEnvelopeRead.ts` | D | `589773d0be423acb1059a38457bea0edc00d6d4d10e83e582bade346e152d9fe` | 119 | stored envelope read |
| `lib/m55/compositeStem/resolveDisplayedDtrEnvelope.ts` | D | `44fd0609c28203aacfa210889d09511980244334a04abafdc12c2492c44af352` | 237 | display normalization |
| `lib/m55/dtrDraftDb.ts` | D | `04dd9072ae1eef67ace87f7840b4345f0c43df933667e1a3c63a4379243a1134` | — | snapshot immutability |
| `lib/m55/paidDtrProductCopy.ts` | E | `3ebe018fab242200332666509db36bc09f904945111d7274232fabe89665db44` | 1470 | product copy SSOT |
| `lib/m55/paidDtrProductCopy.test.ts` | E | `4051dbc3af2ca639c2faf46d29e38314f27963aa3b98689d79c53cd3d2c9f8c5` | 306 | copy contract tests |
| `app/dtr/lp/page.tsx` | E | `e3585a68f0441b3ceb04dc3c8065e7a1a492f4d08a5e4b2f269780368f409c3c` | 397 | LP page |
| `app/dtr/core/page.tsx` | E | `c91f8fd10b46cffee4a02e5c17102edd7cbdae70ce62479e5bbb7fd5b532e59e` | 88 | core reader page |
| `app/dtr/processing/page.tsx` | E | `c0be203ac0178a4eb342caab2d6e9b470f41de9ebb635a3b74100e54fdefff9c` | 195 | processing page |
| `lib/m55/dtrSavedReportCopy.ts` | F | `30744afeaf5b065549247401a2cc5b7c4e402d6e852c647295061d8fdf986c8a` | 19 | snapshot notice copy |
| `components/dtr/SavedSnapshotNotice.tsx` | F | `78252ed777a82261783461b8f07e52f64f7084ea63fb466f6b4861e926fd1862` | 20 | notice component |
| `components/dtr/DtrFullReader.tsx` | F | — | 3246 | reader UI (SHA/import only) |
| `lib/m55/consult/consultReportContext.ts` | G | `b1fea4d0c13ec2bf5b7015fc1ae885e8e867c0e1a5eb99c790d3ceb8d888a5de` | — | grounding context |
| `lib/m55/consult/consultReplyGenerationContract.ts` | G | `b70ea932dd57e7312c2e0ca96522d9b877beb7982efbcaf7f056584524819e7b` | — | reply contract |
| `app/api/room/core/send/route.ts` | G | `8b45786820a60697c2f9c17b9226f75406bb503939268f12764fdfa34424334d` | — | send route |
| `lib/m55/reply/laneBProductionFailClosed.ts` | G | `1ea1b235450e07f9cc4b16ccbc415c9a3cea4c0667f39919f054a4a5491fe8f1` | — | Lane B fail-close |
| `lib/m55/consult/consultReplyThemePartMap.ts` | H | `ce11a9ad2599da01d7b52b9e14e8ac438f9c45d78daa8a003e354c86d6d24d35` | — | theme-chapter map |
| `lib/m55/consult/consultSendMessage.ts` | H | `0d19979ea64409e2d7920e40a358bb35c17a0fd40907bf1ab3517c5031ef33cc` | — | send validation |
| `components/dtr/ConsultRoom.tsx` | I | `9231fbf6da4a3798f6f8680f8cea3589d2cb0da205e8a5b49b5e31065bb1661c` | 873 | consult room UI |
| `components/dtr/ConsultReplyCard.tsx` | I | `b06baee0e83e0ff9ce5535405d28a1ae63ba12b9649bc3959d17b46af21a6695` | 237 | reply card UI |
| `docs/evidence/M55_PAID_DTR_AND_CONSULT_REPLY_FINAL_INTERNAL_EVIDENCE_2026-06-27.md` | J | `4d48850dc7ca2fbe110976369f74d2216b28eb288f3e3756d4d7f1fac24203fa` | 383 | final evidence anchor |
| `docs/ssot/M55_PAID_DTR_PRODUCT_COPY_MASTER_v1.md` | K | `f91c2f194e265ef7da9a31682bfba1f4315375ac839912865aea6ffd370f3786` | — | copy SSOT doc |
| `docs/ssot/M55_DTR_CORE_FINAL_RELEASE_READINESS_CLOSEOUT_2026-06-03.md` | K | `728d1aff22f21fd83543a8ae5c29cf72790cb30fcbe91d0339930c63aaf7ecb8` | — | release closeout doc |
| `docs/ssot/M55_BASELINE_FREEZE_20260330.md` | K | `98782802aa10194cf5ee4d3ab7eaefee0d93a043b5d56e5573c367b9e3579d0b` | — | prior baseline freeze doc |

---

## 12. Current Baseline Interpretation

### 現行 base catalog の役割

`dtrEngine.ts` の `STEM_BODIES`（stem 0–9 × 8 section = 80 テキストブロック）が、すべての paid report に共通する「base chapter 本文」を提供する。`SECTION_SPECS` が 8 章構造（s1_identity 〜 s8_bridge）を定義する。

### 現行 paid individualization の役割

`dtrPaidIndividualization.ts` が、同じ stem 内でも誕生日の**節気（24種）× 月齢位相（3種）× 陰暦月（12種）× birthTimeUnknown** によって異なる補助テキストを生成する。s3 章先頭に `【この保存版だけの本質リズム】`、s7 章先頭に `【この保存版だけの補助整理】` を prepend することで、base catalog の上に purchase-time の個別化層を重ねる。

### なぜ現状でも「10種テンプレートのみ」ではないか

- 現状の個別化次元: 24 × 3 × 12 × 2(birthTimeUnknown) = 最大 **864通り以上**のパターン
- 同じ stem lane でも購入日・誕生日が異なれば s3・s7 の冒頭テキストが異なる
- 最終エビデンス Claim A（CONFIRMED / STRONG）で確認済み

### DOB拡張前にフリーズが有用な理由

「現状の個別化実装がどの程度のものか」を DOB拡張前に確定しておかなければ、将来の変更が「意図的拡張」なのか「コントロールされていない drift」なのかを証明できない。本アーティファクトの Section 11（File/Hash Inventory）が比較基準となる。

### 将来の変更との比較方法

変更後の各ファイルの `shasum -a 256` を Section 11 の SHA256 と照合する。差分があるファイルについて、その変更が:
- （a）DOB個別化拡張の意図的変更か
- （b）保護インバリアントへの意図しない影響か

を明示的に確認するゲートを経由する。

---

## 13. Future DOB-Personalization Change Boundary

### 変更可能な領域（将来ゲートで明示承認が必要）

| 対象 | 変更例 | 条件 |
|---|---|---|
| `dtrPaidIndividualization.ts` 定数マップ | 24節気テキスト精度向上、月別テキスト詳細化 | frozen baseline との diff が明示されること |
| 新規 DOB 個別化関数 | birthTime 帯域（朝/昼/夜）等の新次元 | `FORBIDDEN_USERFacingSubstrings` ガード維持 |
| S3/S7 prefix 構造 | `buildPaidDtrS3IndividualizationPrefix` / `buildPaidDtrS7IndividualizationPrefix` | s3/s7 への注入に限定 |
| `consultReportContext.ts` | `paidIndividualization` 注入部の拡充 | `CONSULT_REPORT_CONTEXT_TOTAL_CAP=1800` 内 |
| synthetic DOB テスト | 新規 DOB ケースのゴールデンテスト | 実ユーザーデータ不使用 |
| SSOT/copy 表現 | `PAID_DTR_INDIVIDUALIZATION_FRAMING.readerContextJa` 等 | overclaim にならないこと |

### 保護インバリアント（DOB拡張後も絶対に変えてはならない）

| # | 保護対象 |
|---|---|
| 1 | snapshot immutability — `upsertDtrReportSnapshotAtFulfillment` の「既存 visible なら INSERT しない」 |
| 2 | stored report instance identity — `engine_context_json`（購入時保存）を primary source として使用 |
| 3 | no silent overwrite — 既存購入済み snapshot の物理的上書き禁止 |
| 4 | consult reply grounding to saved report snapshot — `buildConsultReportContextFromEnvelope` が stored envelope sections を使用 |
| 5 | Lane B fail-close — `isLaneBReplySurfaceEnabled()` = `NODE_ENV !== 'production'` |
| 6 | ticket consumption only after successful generation/commit — RPC は send route ステップ12のみ |
| 7 | no generic AI chat positioning — `PAID_DTR_FORBIDDEN_CLAIMS` の `generic public AI chat` 等 |
| 8 | no overclaim in LP/NOTE/copy — `guaranteed result`、`deterministic future` 等禁止 |
| 9 | no real user content in tests/evidence — synthetic birthday のみ |

### 将来実装時の必要テスト / 証拠

- 新規 DOB 次元のゴールデンテスト（synthetic birthday、実ユーザーデータ不使用）
- `findForbiddenPaidIndividualizationLeak` を用いた leakガードテスト
- 既存購入者の stored snapshot が新個別化テキストで上書きされないことの確認
- display envelope が current catalog と stored engine_context を正しく組み合わせることの確認
- `paidDtrProductCopy.test.ts` が新コピーに対してもパスすること

### 実装 STOP 条件

| STOP 条件 |
|---|
| 既存 `dtr_report_snapshots` 行を再生成・上書きするコードが含まれる |
| `resolveDisplayedDtrEnvelope` が現在の可変プロフィールを primary source として使う変更 |
| `buildConsultReportContextFromEnvelope` が stored envelope を使わない経路を作る |
| `isLaneBReplySurfaceEnabled()` を変更する、または bypass する |
| `FORBIDDEN_USERFacingSubstrings` のリストを縮小する |
| 個別化テキストに `甲乙丙丁` 等の内部キーが含まれる |
| 新規 overclaim（「完全に固定された」「保証」「未来の断定」）が copy に入る |
| 実ユーザーデータをテストや証跡に含める |
| Lane A 以外の consult reply 経路が有効化される |

---

## 14. Redaction and Non-Inclusion Rules

本アーティファクトに**含めてはならない**もの:

| 禁止内容 | 理由 |
|---|---|
| 実ユーザーの saved report body | PII / 個人データ |
| 実ユーザーの consult reply body | PII |
| user_id / email / event_id | 秘密情報 |
| raw Stripe payload | 秘密情報 |
| 本番 DB rows / boundaryMetadata 実値 | DB 接続禁止 |
| private logs | 秘密情報 |
| `STEM_BODIES` 各章の全本文 | SHA256 で代替。全文収録は不要かつ大量 |
| `SOLAR_TERM_SEASON_READINGS` 等の個別化テキスト全文 | key 一覧と次元数のみで十分 |
| `DtrFullReader.tsx` の 3246行 JSX 全文 | import 構造と SHA のみで十分 |
| `canonicalV2GeneratedOutputAudit.ts` のゴールデン実値 | テストファイル詳細。freeze artifact には不要 |

**全文抜粋が許可されるもの（safe static copy のみ）:**

- `PAID_DTR_INDIVIDUALIZATION_FRAMING.readerContextJa`
- `PAID_DTR_TRUST_BOUNDARIES.profileSnapshotJa`
- `SAVED_SNAPSHOT_NOTICE_PRIMARY`
- `SAVED_SNAPSHOT_NOTICE_LEGACY_MODE`
- `PAID_DTR_FORBIDDEN_CLAIMS` 項目リスト
- `PAID_DTR_CHAPTERS` 4章タイトル
- `PRIMARY_THEME_PART_MAP` 5テーマ→章マップ
- 定数値（`CONSULT_REPORT_CONTEXT_TOTAL_CAP`、`CONSULT_REPLY_GENERATION` 等）

---

## 15. Non-Actions Confirmation

本 Preservation Gate において以下はいずれも実施していない。

| アクション | 実施 |
|---|---|
| ソースコード編集 | なし |
| 実装変更 | なし |
| DOB個別化の実装 | なし |
| DTR wording / SSOT/copy 変更 | なし |
| テスト実行 / ビルド実行 | なし |
| DB 接続 / ミューテーション / マイグレーション | なし |
| 支払い / コンサルト返書 / チケット消費 | なし |
| OpenAI / Gemini 呼び出し | なし |
| ライブ QA / 本番 POST | なし |
| デプロイ / stage / commit / push | なし |
| NOTE / LP / SNS / 外部告知作業 | なし |
| 実ユーザーデータの取得・収録 | なし |
| secrets / PII の出力 | なし |

**本アーティファクトは preservation-only。** 実装・ソース・DB・payment・send/ticket/AI/NOTE 作業は含まない。

---

**GATE RESULT: GREEN（preservation artifact created — 1 file only, no source changes）**
