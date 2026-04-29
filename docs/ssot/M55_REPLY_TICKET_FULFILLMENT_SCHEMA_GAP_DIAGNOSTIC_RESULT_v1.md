# M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_DIAGNOSTIC_RESULT_v1

Status: **本番 SELECT-only 診断の実測結果 SSOT** — **本条は migration APPLY／Webhook／Checkout／DB 更新／商品棚変更の許可証ではない。**  

Recorded: **2026-04-28**

Upstream:

- **Gap 一覧（論理チェックリスト）:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_REVIEW_v1.md`
- **診断パケット定義:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_DIAGNOSTIC_PACKET_v1.md`
- **実行した SQL:** `scripts/sql/production/m55_reply_ticket_fulfillment_schema_gap_diagnostic.sql`

**本条にシークレット・DB URL・Webhook secret・生の識別子・payload 本文・実行結果 raw ダンプは記載しない。**

---

## 1. 実行環境

| 項目 | 内容 |
|------|------|
| プロジェクト / ブランチ / 環境 | **m55-soul-core** / **main** / **PRODUCTION** |
| 実行種別 | **SELECT のみ**（カタログ・存在確認） |
| 禁止操作（未実行） | `UPDATE` / `INSERT` / `DELETE` / `ALTER` / `DROP` / `CREATE` / `SET` 等 |
| 出力ガードレール | **secret・raw ID・payload 本文**は結果 SSOT に含めない設計／運用どおり |

---

## 2. 診断結果（SECTION 9 サマリ中心）

以下はテーブルの **構造情報**および **フラグ項目**であり、アプリデータ行そのものではない。

| 観点 | 観察 |
|------|------|
| **Wallet / Ledger** | `wallet_table_exists` = **true**、`ledger_table_exists` = **true** |
| **cap 関連列の充足** | `wallet_cap_columns_distinct_hit_count_expect_5` = **5**、`wallet_ready_for_count_update` = **true** |
| **監査 Ledger 前提列** | `ledger_audit_required_columns_hit_count_expect_7` = **7**、`ledger_ready_for_audit_insert` = **true** |
| **report_instance_id 軸** | Wallet／Ledger について **catalog 上利用可能**（診断定義および **report_instance に基づく wallet 一意化**は §3・gap review で継続検証） |
| **冪等テーブル系** | `idempotency_table_exists` = **true**、`idempotency_stripe_events_table_exists` = **true**（**`stripe_events` テーブルが存在する**旨と整合） |
| **処理済 Stripe 名前テーブル** | `stripe_processed_events_like_table_exists` = **false**（名前パターン `%processed%stripe%` でのヒット無し・**別名で存在する場合は別途確認**） |
| **購買マスタテーブル** | `purchases_table_exists` = **false**（**`public.purchases` は未存在**。Checkout 関連の永続が別にあるかはアプリ側・別診断で要確認） |
| **Stripe 参照／保存の下限シグナル** | `stripe_reference_storage_exists` = **true**（冪等先または Ledger の参照ライク列の **存在の下限**。詳細は **§4**） |
| **Entitlement / bundle 周辺** | **entitlement 系および wallet bundle 関連のテーブルは存在**（名前レベルの LIST にて確認。本条は DDL のみ） |
| **Ledger CHECK / Stripe 列候補** | **Ledger 側に payload／Stripe 参照専用列および CHECK の Fulfillment 用拡張は、追加設計候補**（本条 §4 と **additive migration design review** で固定） |

**補足（未転記項目）:** `migration_needed_count` と `migration_candidate_dimension_sum_heuristic` の **数値は本条に転記しない**。**0 でない場合**は **§3 の第 4 項および §4** に従い、**最小 additive migration 候補**をレビューで列挙する。

---

## 3. 判定（本文）

1. **Wallet／Ledger は Fulfillment の土台として利用可能な水準にある。**  
   両テーブルが存在し、cap／監査に必要な列名のカウントが診断定義どおり充足している。

2. **Webhook 実装へは直行しない。**  
   スキーマが揃っていることと、運用上の **二重付与防止・処理順・エラー復帰**は別次元である。

3. **次に固定すべき論点（レビュー必須）**  
   - **二重付与防止の永続先**（`stripe_events` のみで足りるか、**`stripe_processed_events` 相当の新規**か）  
   - **Stripe 参照 ID**（checkout session／event／payment intent）の **保存場所・列単位／JSON 可否**  
   - **`reply_wallet_ledgers` の CHECK**（`event_type`／`source_of_grant`）の **Fulfillment 文言との両立**：**緩い拡張（nullable additive から）か、アプリ側の付番か**

4. **`migration_needed_count ≠ 0` のとき**は、強 UNIQUE・NOT NULL・厳密 FK は採らず、**nullable／additive を最小セット**として **additive migration design review** で収束させる。

---

## 4. additive migration design review で検討する候補（あくまで候補）

| # | 候補論点 | メモ |
|---|----------|------|
| 1 | **`stripe_processed_events` 相当の冪等新設** | 現状 `stripe_processed*` 名テーブルは検出されていない。**新設 vs 既存 `stripe_events` の再利用**は本章で決める。 |
| 2 | **既存 `stripe_events`** | **処理済みイベント一意・冪等**として読める DDL（列・一意制約）か。SECTION 9 の **`stripe_events` は存在**。 |
| 3 | **`checkout_session_id`／`stripe_event_id`／`payment_intent_id`** | **Ledger 専用列**か、**別テーブル**か、purchases 代替の **運用未定義**。`purchases` テーブルは無し。 |
| 4 | **`reply_wallet_ledgers` に payload または Stripe 参照列** | **`payload_json` または stripe 参照列（nullable）**を足す可否。監査のみ・PII 禁止ポリシーと両立。 |
| 5 | **`event_type`／`source_of_grant` の CHECK** | **`purchase_grant` 続用＋メタ**か **CHECK の緩拡張**か。Fulfillment と gap review と整合させる。 |
| 進め方 | **すべて nullable／additive を初期位置づけ** | **NOT NULL・FK・強 UNIQUE** は **まだ GO しない**。 |

---

## 5. 引き続き NO-GO

次は **許可しない**（本条の達成のみでは開始しない）。

- Webhook 実装  
- Checkout API 実装  
- Stripe Dashboard 変更  
- **migration APPLY**（ドラフト作成も本条では未許可／**別レビュー後**）  
- **DB を更新する一切の操作**  
- **商品棚 UI**  
- **env／secret／Webhook secret の出力・転記**

---

## 6. 次の候補（順序の目安）

1. **`M55_REPLY_TICKET_FULFILLMENT_*` に相当する additive migration design review SSOT（新規）**  
2. **SELECT-only の preflight スクリプト／パケット**（適用可否はレビュー後）  
3. **migration candidate（ドラフトのみ・APPLY は別ゲート）**  
4. **その後**：Checkout／Webhook／API の設計（別チケット）

---

## CHANGELOG

- **2026-04-28:** v1 初版。m55-soul-core / main / PRODUCTION における Fulfillment schema gap diagnostic の結果を SSOT 化。
