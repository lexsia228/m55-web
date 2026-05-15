# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PREFLIGHT_RESULT_v1

Status: **本番 SELECT-only preflight の実測結果 SSOT** — **本条は migration APPLY／DDL 実行／Webhook／Checkout／DB 変更の許可ではない。**  

Recorded: **2026-04-28**

Upstream:

- **Preflight PACKET:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PREFLIGHT_PACKET_v1.md`
- **実行 SQL:** `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_preflight.sql`
- **設計レビュー:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_DESIGN_REVIEW_v1.md`

**本条にシークレット・DB URL・Webhook secret・生の識別子・payload 本文・実行結果の raw ダンプは記載しない。**

---

## 1. 実行環境

| 項目 | 内容 |
|------|------|
| プロジェクト / ブランチ / 環境 | **m55-soul-core** / **main** / **PRODUCTION** |
| 実行種別 | **SELECT のみ** |
| 未実行の操作 | `UPDATE` / `INSERT` / `DELETE` / `ALTER` / `DROP` / `CREATE` / `SET` |
| **出力転記ガードレール** | **secret／raw ID／payload 本文**を SSOT に含めない |

---

## 2. Preflight 結果（SECTION 10 サマリ）

| 列名（SQL 出力） | 値 |
|------------------|:--:|
| `processed_events_table_already_exists` | **false** |
| `stripe_events_reuse_possible` | **true** |
| `ledger_stripe_columns_already_exist` | **false** |
| `ledger_needs_nullable_reference_columns` | **true** |
| `check_can_use_existing_values_without_extension` | **true** |
| `wallet_ready_for_cap_enforcement` | **true** |
| `additive_migration_candidate_needed` | **true** |
| `blocking_gap_count` | **0** |

※ **§8 全文および §3 のカタログ**は人手で読み込み、本条のブールとは **両立させて**判断すること（PACKET と同様）。

---

## 3. 判定（読み）

1. **中核テーブルの欠落はない** — `blocking_gap_count = 0` および（同一 preflight で確認した前提の）wallet／ledger が存在。**cap 式違反は本サマリ上 0**。  
2. **Wallet の cap を前提とした運用／実装の土台がある** — `wallet_ready_for_cap_enforcement` = **true**。  
3. **`stripe_events` は再利用ヒューリスティックが通る一方** — `stripe_events_reuse_possible` = **true**。**一方で**、Fulfillment の **専用冪等表（名前例 `stripe_processed_events`）は未作成**と読める — `processed_events_table_already_exists` = **false**。  
4. **Ledger に Stripe 参照列の 3 点セットが未充足** — `ledger_stripe_columns_already_exist` = **false**、`ledger_needs_nullable_reference_columns` = **true**。  
5. **初回 migration で CHECK を変えなくてよい材料和音** — `check_can_use_existing_values_without_extension` = **true**（**確定には CHECK 全文の確認が必要**）。  
6. **additive migration のドラフト検討は継続** — `additive_migration_candidate_needed` = **true**。  

---

## 4. candidate DDL draft で検討するもの（まだ APPLY しない）

以下は **ドラフト論点**であり、**条文が DDL を生成しない**。

### 4.1 新規：**`stripe_processed_events` 相当**の薄い冪等テーブル（仮称）

| 項目 | 方針 |
|------|------|
| 目的 | Stripe Webhook に対する **二重付与防止** の **論理上の「正」の行** を置けるようにする |
| payload | **raw 全文は原則保存しない**（監査・冪等に **ID と最小メタのみ**を優先） |
| `stripe_event_id` | **冪等軸**。**strict UNIQUE はまだ APPLY しない**（§5）— **ドラフトでは列とアプリ側冪等の設計のみ**。**将来ゲートで UNIQUE を検討** |
| 参照列（nullable で検討） | `checkout_session_id`、`payment_intent_id`、`product_key`、`report_instance_id` |
| 運用時刻など | `status`、`processed_at`、`created_at` 等 |

### 4.2 `reply_wallet_ledgers` — **nullable 参照列**の追加検討

| 項目 | メモ |
|------|------|
| 方針 | **監査用の「写し」** — 冪等の **正は 4.1 に寄せる**ことを前提にする |
| 候補列 | `stripe_event_id`。**checkout** は **`checkout_session_id` または `stripe_checkout_session_id` のどちらか一本化**。**intent** は **`payment_intent_id` または `stripe_payment_intent_id` のどちらか一本化**。**product_key（nullable）** |
| CHECK | **初回 draft では CHECK を変更しない** |
| DB 側強制 | **NOT NULL／FK／strict UNIQUE はまだ採らない**（§5）。 |

---

## 5. 引き続き NO-GO

- **migration APPLY**  
- **production に対する DDL 実行**  
- **Webhook 実装**  
- **Checkout API 実装**  
- **Stripe Dashboard 変更**  
- **商品棚 UI**  
- **env／secret／Webhook secret の転記・露出**  
- **NOT NULL／FK／strict UNIQUE の追加**（**別レビューゲート**まで保留）

---

## 6. 次の候補（順序）

1. **additive migration candidate DDL draft** の作成（**ファイル化は repo 運用規程どおり**。**いま APPLY しない**）。  
2. **shadow／staging での適用検証**（別 runbook／別 gate）。  
3. **Production preflight の再確認**（post-migration での SECTION 転記など）。  
4. **Production apply gate** でのみ本番 APPLY を検討。

---

## CHANGELOG

- **2026-04-28:** v1 初版。m55-soul-core / main / PRODUCTION における additive migration preflight のサマリを SSOT 化。
