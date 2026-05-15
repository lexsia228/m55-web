# M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_REVIEW_v1

Status: **Gap 診断 SSOT（調査チェックリスト）** — **`information_schema` 等の結果は本条に転記しない。本条単体でも migration／SQL は実行しない。**  

Upstream fulfillment 設計:

- **`docs/ssot/M55_REPLY_TICKET_FULFILLMENT_DB_API_DESIGN_REVIEW_v1.md`**

架橋資料:

- **`docs/ssot/M55_REPLY_CREDIT_LEDGER_ARCHITECTURE_ADR_v1.md`**
- **`docs/ssot/M55_REPLY_DATA_MODEL_AND_DB_CONTRACT_v1.md`**

**秘密鍵・Stripe secret／Webhook secret／DB URL は記載しない。**

Recorded: **2026-04-28**

---

## 0. リポジトリ上のコードベースにおけるベースライン（要 **本番 DDL で確認**）

| 根拠 | 内容 |
|------|------|
| **`supabase/migrations/20260416000000_reply_system_data_layer_v1.sql`** | **`reply_ticket_wallets`** と **`reply_wallet_ledgers`** の **初期 CREATE**。 |
| **`supabase/migrations/20260306000000_phase1_entitlements_ssot.sql`**（抜粋） | **`stripe_events` への **`ALTER`**（`**processed_at`／`type`／`payload_hash`** など）— **本体の **`CREATE`** は本条のリポジトリgrepでは未確定**。 |
| Phase A 運用／スクリプト | **`report_instance_id`（uuid、`NULL` 可能）を 3 表に **`ADD COLUMN`** した旨**（実テーブルの列有無・型は **`information_schema`** で検証**。）。** |

※ **本番の真実 DDL は本条の断言ではなく、§5 の **SELECT-only 診断**で確認する。**

---

## 1. 現在 Fulfillment が必要とする DB オブジェクト（論理）

| # | オブジェクト／関心 |
|---|---------------------|
| 1 | **`reply_ticket_wallets`** — **`purchased_count`／`available_count`／`consumed_count`／`initial_included_count`**、**`status`**、**スコープ識別子 **`report_instance_id`**（Fulfillment と整合）。** |
| 2 | **`reply_wallet_ledgers`** — **`delta`／`balance_after`**、監査種別 **`event_type`**／**`source_of_grant`**、**`wallet_id`／`user_id`／オプション `reply_session_id`**、**`report_instance_id`**（親 wallet と揃える）。** |
| 3 | **Stripe に対応する処理済み記録先 — `stripe_events` の再利用**または **新規テーブル（本条では未定）**。 |
| 4 | **Checkout／Payment を追跡する参照** — **`checkout_session.id`／`payment_intent.id`** を **Fulfillment と突合できる列または JSON**。 |
| 5 | **`report_instance_id` 単位の上限チェックに必要なインデックス／クエリ効率**。 |

---

## 2. 既存 Schema で足りている可能性があるもの（ベース DDL との照合）

| # | 内容 |
|---|------|
| 1 | **Wallet は **`purchased_count` と `available_count` の増分** が **チェック拘束 **`available_count = initial + purchased - consumed`** に整合** — **初期スキーマに存在**。** |
| 2 | **Ledger は **`delta` と `balance_after`** — **初期スキーマに存在**。** |
| 3 | **`reply_wallet_ledgers.event_type`** — **`purchase_grant`** など **プラス方向の付与**が **許容**。** **`reply_consume` は **`delta < 0`** と **`reply_session_id` 必須**のルール**。** |
| 4 | **`source_of_grant`** は **`NULL` または列挙**（`'PURCHASE'` 等）。** |
| 5 | **`status IN ('active','suspended','closed')`** — **Fulfillment が **`active`** だけを許す条件**。** |
| 6 | **Phase A／B が進んだ環境では **`report_instance_id` 列**が **wallet／ledger／session に **存在**。** （**本番で **SELECT** 済み**。）** |

---

## 3. 不足・拡張候補（gap の可能性がある領域）

| # | 候補 | 論点 |
|---|------|------|
| 1 | 冪等の永続先 | **`stripe_event.id`** 軸。** **`stripe_events` の有無**と **`processed_at`**／**一意 **`stripe_event_id`** の実装可否**。不足なら別テーブル候補。 |
| 2 | **`checkout_session.id` の処理記録** | **`stripe_events`／`purchases.meta_json`** への格納可否。 |
| 3 | **`payment_intent id` の補助** | Ledger に **専用列または JSON** があるか。**リポ baseline には **`payload_json`** 列は **ない**。** |
| 4 | **`event_type` の粒度** | SSOT が **`purchase_additional_reply_ticket`** とした場合は **現行 **`CHECK`**（**`included_grant`／`purchase_grant`／…）**のみと差分**。** **`purchase_grant` + メタまたは **`CHECK`** 拡張**。**強 UNIQUE／NOT NULL はまだ NO-GO。** |
| 5 | **`source_of_grant`** | **`stripe_checkout` と書くなら、`PURCHASE` 許容セットと **`CHECK`**／アプリ側の両立。** |
| 6 | Webhook のエラー記録 | 別テーブルまたは **`stripe_events`** での拡張。 |
| 7 | Disable switch | アプリまたは env が主。DB で持つ場合は `site_settings` 等をプロジェクトで定める。 |

---

## 4. 追加 migration が必要か（候補のみ · **本条では作らない**）

| # | migration 候補（additive／nullable を優先） | 備考 |
|---|-----------------------------------------------|------|
| 1 | **`stripe_events` 再利用が不十分なら** `processed_stripe_webhook_events` 等。**`event.id` 一意**。 | 既存 **UNIQUE** の有無は §5 で確認。 |
| 2 | Ledger に **`stripe_checkout_session_id`／`stripe_payment_intent_id`（nullable text）**。 | Fulfillment と監査。 |
| 3 | Ledger に **`payload_json` または `metadata_json`**（Stripe 参照のみ・PII 禁止）。 | 既定スキーマに **ない**ので **候補**。 |
| 4 | **`CHECK` の緩やかな拡張**（`**`purchase_grant`** のまま細分化または列挙拡張**）。 | **NOT NULL／FK／強 UNIQUE は NO-GO。** |
| 5 | **`UNIQUE(user_id)` 単独** と **複数 `report_instance_id` 行**の両立問題。 | **`UNIQUE (user_id, report_instance_id)`** は **将来**。**ADR と整合。** |

---

## 5. SELECT-only 診断が必要な項目（本条に結果を載せず実施側で記録）

| # | 診断 |
|---|------|
| 1 | `information_schema.columns` で wallet／ledger の **`report_instance_id`** とカウント列。 |
| 2 | `stripe_events`／`purchases` の有無と列。 |
| 3 | `reply_wallet_ledgers` に **`payload_json` 相当列の有無**（既定 baseline では **無**）。 |
| 4 | `pg_constraint` で **`event_type`／`source_of_grant`** の **CHECK** 全文確認。 |
| 5 | インデックス・**`wallet_id`／`report_instance_id`** の利用計画との整合。 |

---

## 6. STOP 条件（migration／実装前）

| STOP | 内容 |
|------|------|
| 1 | **冪等記録先が未定義／未 DDL のまま Webhook を実装しようとする** |
| 2 | **Ledger なしに wallet のみ更新しようとする** |
| 3 | **`user_id` のみでの付与** |
| 4 | **`initial + purchased` ≤ **5 の二重チェック機構なしで追加購入を開放** |
| 5 | **Stripe test／live 混同** |
| 6 | **Secret 露出／ログ混入** |
| 7 | **Rollback／disable switch 未定義** |

---

## 7. 次の候補

| # | 次 |
|---|---|
| 1 | **`schema_gap` 用 SELECT-only packet の新規ファイル**を作り、結果をログ化 |
| 2 | 結果を読んで **additive migration の設計レビュー SSOT** を起票する（まだ APPLY しない）。 |
| 3 | **Checkout API／Webhook 実装フェーズへ** |

---

## 8. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — Fulfillment に対する Schema gap レビュー（診断手順のみ） |
