# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PREFLIGHT_PACKET_v1

Status: **additive migration candidate 作成前の本番事前状態確認（SELECT-only）** — **本条・本 SQL 単体では migration GO／APPLY／Webhook／Checkout 実装の許可ではない。**  

Recorded: **2026-04-28**

Upstream:

- **設計レビュー（推奨最小 additive 方針）:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_DESIGN_REVIEW_v1.md`
- **本番 gap 実測:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_DIAGNOSTIC_RESULT_v1.md`
- **本 preflight の SQL:** `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_preflight.sql`

**秘密鍵・DB URL・Webhook secret・生の識別子・Stripe オブジェクト実体・payload 本文を結果転記しない。**

---

## 1. 診断目的

additive migration の **ドラフト DDL** に着手する **前に**、本番 DB が次を満たすかを **カタログと集計のみ**で確認する。

- **Fulfillment 用 processed events テーブル** を **クリーンな名前で追加できるか**
- **`stripe_events` の再利用**に足る列があるか（ヒューリスティック）
- **Ledger に付け足す Stripe 参照列**がまだ無いこと（名前衝突なし）
- **Wallet／Ledger／Session の行数および `report_instance_id` の NULL／非NULL 分布**（識別子は出さない）
- **CHECK**（初回 migration で **変えない**前提）の下で **`purchase_grant`／`PURCHASE` 等の既存許容値**で書けるかの材料
- **Unique／Index** の現状（将来の候補 UNIQUE は **別ゲート**）

---

## 2. SELECT-only の厳守

- **許可:** `SELECT` のみ。
- **禁止:** `INSERT`／`UPDATE`／`DELETE`／`ALTER`／`DROP`／`CREATE`／`SET` 等。
- **出力:** 列名・型・制約定義全文・索引定義・**件数**・フラグのみ。**ペイロード本文・アプリの行詳細・生 ID は転記しない。**

---

## 3. この packet だけでは GO しないもの

- **migration APPLY**（ドラフト SQL の作成も本条では未許可）
- **Webhook／Checkout API／Stripe Dashboard／UI／商品棚**
- DB の **状態変更**

**結果転記後、** `M55_REPLY_*` に相当する **candidate DDL draft**（ファイルは repo 運用規程に従う）および **レビューゲート** に進める。

---

## 4. SQL セクション対応（概要）

| Section | 内容 |
|---------|------|
| 1 | **`public.stripe_processed_events` が既に存在するか**（**存在しないことがクリーン追加の前提**） |
| 2 | `processed`／`stripe`／`webhook`／`fulfillment` 系に **名前が似た BASE TABLE の一覧**（衝突・混同確認） |
| 3 | **`stripe_events` の存在**、列カタログ、`event`/`checkout`/`session`/`intent` に相当する名前の列 |
| 4 | `reply_wallet_ledgers` に **`stripe_event_id`・`checkout_session_id`/`stripe_checkout_session_id`・`payment_intent_id`/`stripe_payment_intent_id`・`product_key`・`payload_json`** が **既にあるか**（名前ごと一行） |
| 5 | **Ledger／Wallet／Session** の総行数と **`report_instance_id` の NULL／非NULL 件数** |
| 6 | Wallet の cap／`status`／`report_instance_id` **6 列**の存在 |
| 7 | **cap 式違反行数**（`available_count = initial + purchased - consumed` の逸脱） |
| 8 | Ledger の **CHECK 定義全文**（`event_type`／`source_of_grant` の判定材料）＋ **`purchase_grant`／`PURCHASE` 文言含有**のブール |
| 9 | `stripe_events`／`reply_wallet_ledgers`／`reply_ticket_wallets` の **制約・索引** |
| 10 | **サマリ一行**（下表） |

---

## 5. SECTION 10 サマリ列の意味

| 列名 | 解釈（目安） |
|------|----------------|
| `processed_events_table_already_exists` | **`TRUE` なら** 同名テーブルが既にあり、**設計どおりの名前での新規 CREATE は衝突**する（DDL 名の再検討が必要）。 |
| `stripe_events_reuse_possible` | **`stripe_events` が存在し**、かつ `processed`／`event` id 系／`payload_hash` 系の **列名パターンが当たる列が一つでもある**場合に **TRUE**（再利用可否の **下限シグナル**。最終判断は列定義と運用）。 |
| `ledger_stripe_columns_already_exist` | **`stripe_event_id` かつ**（`checkout_session_id` **または** `stripe_checkout_session_id`）**かつ**（`payment_intent_id` **または** `stripe_payment_intent_id`）が **すべて存在**する。 |
| `ledger_needs_nullable_reference_columns` | 上記 **3 点セットの否定**。**TRUE なら** Nullable 参照列の **ADD が候補**。 |
| `check_can_use_existing_values_without_extension` | CHECK 文言に **`purchase_grant`** と **`source_of_grant` 系の `PURCHASE`** が **両方**見える場合 **TRUE**（初回 CHECK 非変更方針の **材料**。**正式妥当性は §8 全文で人手確認**）。 |
| `wallet_ready_for_cap_enforcement` | **6 列がそろい**、かつ **cap 式違反行数が 0**。 |
| `additive_migration_candidate_needed` | **`blocking_gap_count = 0`** かつ、（**processed テーブル未存在** **または** **Ledger 参照 3 点が未充足**）。**完了済みスキーマ**では **FALSE** になり得る。 |
| `blocking_gap_count` | **Wallet テーブル欠落**・**Ledger テーブル欠落**・**cap 式違反行が 1 件以上**に **1 点ずつ加算**（0〜3）。 |

---

## 6. 診断項目トレース（要件対応）

### 6.1 Processed events 候補（§1〜§3・§9）

- **`stripe_processed_events` 相当名の既存有無**（§1）
- **似た名前のテーブル**（§2）
- **`stripe_events` の列一覧**と **ID 保存に使えそうな列**（§3）
- **再利用可能性**（§10 `stripe_events_reuse_possible` と §3 の手読み）

### 6.2 Ledger additive 列（§4・§5・§10）

- 候補名の **重複なし**確認
- **Ledger 総行数**／**`report_instance_id` 非NULL 件数**
- **Wallet／Ledger／Session** の **RI 分布**（NULL／非NULL の **件数のみ**）

### 6.3 Wallet baseline（§5〜§7）

- **総行数**
- **cap 6 列**の存在（§6）
- **cap 違反行数**（§7）
- **上限 5 件**の業務ルールは **アプリ・設計**とセット（DB は列と式の整合）

### 6.4 CHECK（§8）

- **全文**は §8 最初の `SELECT`。**初回 CHECK 変更なし**の場合、**`purchase_grant`／`PURCHASE`** で Fulfillment 行を書けるかは **§8 のブール＋全文**で判断。

### 6.5 Index / Unique（§9）

- 各テーブルの **pg_indexes** と **制約**
- **新規 processed 表**向けの **将来 UNIQUE（`stripe_event_id` 等）**は **NOT NULL／strict UNIQUE はまだ NO-GO** — 文書 `M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_DESIGN_REVIEW_v1.md` に合わせ、**preflight では存在確認のみ**し、**候補は設計レビュー側で整理**する。

---

## 7. 引き続き NO-GO

- migration ファイル作成・**APPLY**
- **DDL 本文**の確定（別チケット）
- **Webhook／Checkout API／Stripe Dashboard／商品棚 UI**
- **env／secret／Webhook secret の出力**

---

## 8. 次の候補（順序）

1. **additive migration candidate**（ドラフト DDL・**未 APPLY**）  
2. **shadow／staging** の検証用 SELECT postflight  
3. **production preflight（再）** → **apply gate**  
4. **その後** Checkout／Webhook 設計

---

## CHANGELOG

- **2026-04-28:** v1 初版。preflight SQL と整合する PACKET。
