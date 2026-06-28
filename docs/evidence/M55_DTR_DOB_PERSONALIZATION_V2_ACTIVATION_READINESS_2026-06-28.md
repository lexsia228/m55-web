# M55 DTR DOB Personalization V2 Activation Readiness Evidence

## 1. Gate Identity

| 項目 | 値 |
|---|---|
| Gate | CATEGORY-2-M55-PAID-DTR-DOB-PERSONALIZATION-ACTIVATION-READINESS-EVIDENCE-REV1 |
| Date | 2026-06-28 |
| Activation readiness source gate | CATEGORY-2-M55-PAID-DTR-DOB-PERSONALIZATION-ACTIVATION-READINESS-REV1 |
| Result | YELLOW_EVIDENCE_FIRST → evidence-before-flag-on |

## 2. Production Identity

| 項目 | 値 |
|---|---|
| production SHA | `6d0a5ce5d70769b8512ef014b0528f28817194b5` |
| branch | `main` |
| vercel_env | `production` |
| node_env | `production` |
| diagnostics HTTP status | 200 |
| local / origin / prod 一致 | yes |

## 3. Current Activation State

- DOB-v2 コードは Production にデプロイ済み。
- 本ゲートで production fulfillment flag の有効化・変更は行っていない。
- `M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED` は OFF / unchanged のまま。
- したがって、別途 flag ON ゲートが実行されるまで、新規フルフィルメントは引き続き v1 を使用する。

## 4. Feature Flag Contract

| 確認項目 | 値 |
|---|---|
| env 変数名 | `M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED` |
| true になる条件 | 文字列 `'true'` のみ |
| missing / empty / `'false'` / その他 | すべて false（v1 継続） |
| flag 読取スコープ | fulfillment パス（`buildV2FulfillmentSnapshot.ts`）のみ |
| display パスが flag を読む | していない |
| compose が flag を読む | していない |
| missing version の解決 | v1 |

## 5. Existing Purchaser Immutability

- `upsertDtrReportSnapshotAtFulfillment` は先頭で `getVisibleDtrReportSnapshot` を呼び、既存 visible snapshot が存在すれば即リターンする。INSERT には到達しない。
- UPDATE / backfill / DELETE / overwrite の経路は存在しない。
- `paidIndividualizationVersion` を持たない既存行は v1 で表示される。
- stored v1 は v1 で表示される。stored v2 は v2 で表示される。
- env flag ON は既存購入済みレポートを遡及的に変更しない。
- DB migration は不要。

## 6. New-Purchase-Only Activation Boundary

flag ON 時の新規 INSERT 動作：

- `paidIndividualizationVersion = 'v2'` をスタンプ
- `dobPersonalizationCatalogVersion = 'dob-v2-2026-06'` をスタンプ
- version スタンプ後に `composePaidIndividualizationFromEngineContext` を呼ぶ
- `envelope_json`・`engine_context_json`・`auditMeta.paidIndividualization` がすべて一貫して v2 で生成される

変更なし（flag ON の影響を受けない）:

- Stripe / payment / wallet / ticket 経路
- consult send route
- DB スキーマ・migration
- 既存購入者の表示

## 7. Validation Facts

| 確認項目 | 結果 |
|---|---|
| `npx tsc --noEmit --pretty false` | PASS |
| DOB-v2 focused tests | 53 / 53 PASS |
| static scan: display path に feature flag 参照 | NOT_FOUND |
| static scan: compose に feature flag 参照 | NOT_FOUND |
| static scan: v1 モジュールに compose import | NOT_FOUND |
| `STEM_BODIES` / `SECTION_SPECS` 変更 | なし |
| 既知の pre-existing 全スイート失敗 | `send route prompt aligns with four-to-five-block renderer contract`（保護ファイル依存・DOB-v2 スコープ外） |

## 8. Rollback / Kill-Switch Semantics

- `M55_DOB_PERSONALIZATION_V2_FULFILLMENT_ENABLED` を `'true'` 以外に設定すれば、以降の新規フルフィルメントは v1 に戻る。
- 既に作成された v2 snapshot は stored version を参照するため v2 のまま表示される。これは意図されたスナップショット不変性である。
- 既存 v2 snapshot を v1 に戻すには別途 DB mutation ゲートが必要であり、通常は推奨されない。
- アクティベーションの一部として backfill / mutation を行うべきではない。

## 9. Activation Decision

| 項目 | 値 |
|---|---|
| 技術的な有効化準備 | READY |
| 本証跡のステータス | コミット済みにより証跡要件を満たす |
| 次に実行可能なゲート | CATEGORY-2-M55-PAID-DTR-DOB-PERSONALIZATION-PRODUCTION-FLAG-ON-REV1 |
| 本ファイルが flag ON を認可するか | しない（別ゲートでの明示的な指示が必要） |

## 10. Explicit Non-Actions

本ゲートで実施しなかったこと：

- production env flag 変更
- deploy
- DB 接続
- DB 変更
- migration 適用
- payment 操作
- Stripe checkout
- webhook replay
- consult reply 送信
- ticket 消費
- OpenAI / Gemini 呼び出し
- production POST
- live purchase QA
- NOTE / LP / SNS / 外部告知
- 実ユーザーデータ使用
- push（本ゲートのコミット後、別途 push ゲートが必要）
