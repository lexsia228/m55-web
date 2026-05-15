# M55_REPLY_WALLET_ORPHAN_ENTITLEMENT_PART1_RESULT_TEMPLATE_v1

Status: **Audit record template** — paste **`m55_reply_wallet_entitlement_without_snapshot_hash_diagnostic.sql` PART 1** results here (or in the linked ticket).  

Date: 2026-04-29  

Related:

- Source SQL PART 1: `scripts/sql/staging/m55_reply_wallet_entitlement_without_snapshot_hash_diagnostic.sql`
- Policy: `docs/ssot/M55_REPLY_WALLET_ORPHAN_ENTITLEMENT_REMEDIATION_POLICY_v1.md`

---

## 1. 結果を貼る列一覧（順不同可・欠損は空欄）

SQL Editor の PART 1 結果グリッドを **次の論理列名で**転記すること（**ヘッダー行をコピーしてもよい**）。

| 列名（論理名） | 貼り付け例の型 |
|----------------|----------------|
| `hashed_user_id` | 32 桁 hex 相当の文字列 |
| `wallet_status` | 例: `active` |
| `available_count` | 整数 |
| `initial_included_count` | 整数 |
| `purchased_count` | 整数 |
| `consumed_count` | 整数 |
| `wallet_ledger_count` | 整数 |
| `reply_session_count` | 整数 |
| `reply_document_count` | 整数 |
| `entitlement_count` | 整数（DTR_CORE_STATIC_V1 行数） |
| `entitlement_product_ids_count` | 整数（distinct product_id） |
| `entitlement_status_list` | カンマ区切りの列挙値 |
| `entitlement_created_day_min` | **日単位のみ**（`YYYY-MM-DD` または SQL の day _trunc 出力） |
| `entitlement_created_day_max` | 同上 |
| `entitlement_grant_type_list` | カンマ区切り |
| `entitlement_source_list` | カンマ区切り（**Stripe/checkout の生 ID は貼らない**） |
| `core_right_count` | 整数 |
| `right_key_list_count` | 整数（distinct `right_key` 数） |
| `one_time_fulfillment_count` | 整数 |
| `dtr_snapshot_count` | 整数（フィルタ上 0 の想定） |
| `any_snapshot_count` | 整数 |
| `any_snapshot_product_count` | 整数 |
| `likely_reason` | §3 のコードいずれか |

### 転記テンプレート（表を複製）

| hashed_user_id | wallet_status | available_count | initial_included_count | purchased_count | consumed_count | wallet_ledger_count | reply_session_count | reply_document_count | entitlement_count | entitlement_product_ids_count | entitlement_status_list | entitlement_created_day_min | entitlement_created_day_max | entitlement_grant_type_list | entitlement_source_list | core_right_count | right_key_list_count | one_time_fulfillment_count | dtr_snapshot_count | any_snapshot_count | any_snapshot_product_count | likely_reason |
|----------------|---------------|----------------|------------------------|-----------------|----------------|---------------------|---------------------|----------------------|-------------------|-------------------------------|--------------------------|----------------------------|----------------------------|-----------------------------|--------------------------|------------------|----------------------|------------------------------|--------------------|-------------------|---------------------------|---------------|
| | | | | | | | | | | | | | | | | | | | | | | |

---

## 2. 記録ルール（厳守）

**許可**：§1 に列挙された値のみ転記。**`hashed_user_id` は可**。日付は **日単位**（`entitlement_created_day_min` / `max` に相当）。`status` / `grant_type` / `source` の**列挙文字列**（アプリコード）および**集計整数**。

**禁止**：**raw `user_id`**、**メール**、**氏名**。**`checkout_session_id`**、**Stripe の customer / payment_intent / checkout session の実 ID**。**UUID をそのまま貼った行 ID**。**`created_at` の秒までの値**。**秘密鍵・Webhook secret・service_role**。

運用：**チケット番号／実行者／実施日時（UTC）／接続先プロジェクト種別（社内規程に従い ref を載せてよい場合のみ）**を冒頭メタに書くこと。

---

## 3. 判定ルール（`likely_reason` と対応）

下記は **PART 1 の `CASE`** が返すコードと **政策上の読み**。疑義があれば `REMEDIATION_POLICY_v1` と突き合わせること。

| コード | 意味（要約） |
|--------|----------------|
| `reply_used_without_snapshot` | 返書経路で **消費・セッション・文書のいずれかあり**。**削除禁止**。snapshot 復元・履歴整合の議論対象。 |
| `unused_wallet_with_entitlement_no_snapshot` | 上記なく **権利・残高のみ**。**削除禁止**。復元または `manual_review`。 |
| `legacy_entitlement_without_fulfillment` | entitlement と rights はあるが **one_time_fulfillment が 0** 等。**旧経路／手動／中断**の調査。**自動判断しない**。 |
| `entitlement_exists_but_no_snapshot_and_no_right` | DTR entitlement はあるが **`m55_p:core_origin` 行が無い**等。**部分失敗・手動・要 repair** の調査。 |
| `entitlement_and_right_exist_but_no_snapshot` | entitlement と right は揃うが **snapshot 無し**。**Fulfillment 後の欠落**や **upsert 順序**の調査。 |
| `needs_manual_review` | 上記に当てはまらない／矛盾。**人がラベル付け直し**。 |

---

## 4. Phase A へ進めない条件（いずれか該当なら NO-GO）

次の **いずれか**が残る間は **Phase A・DDL・DML・migration・Stripe・商品棚 UI には進まない**（`REMEDIATION_POLICY_v1` §8 と整合）。

| # | 条件 |
|---|------|
| 1 | **`likely_reason` が行ごとに未確定**（空欄・矛盾・再診断待ち）。 |
| 2 | **`one_time_fulfillment_count` / grant_type / source / core_right／right_key 系**が **未収集または未読合せ**。 |
| 3 | **snapshot 復元の可否が未判定**（データソース・手順オーナーの合意無し）。 |
| 4 | **`manual_review` 対象が残っている**（隔離リスト未確定）。 |
| 5 | **返書利用済み行の扱い**（復元・読み取り専用・隔離が **未決**）。 |

上記すべて **クローズ済みかつ別紙 GO** があるまで Phase A は開始しない。

---

## 5. 厳守

- **このファイルは転記テンプレートのみ**。**SQL 実行・DB 更新はしない**。  
- **UPDATE / INSERT / DELETE / ALTER / DROP / CREATE** の例文は **載せない**。  
- **Phase A 以降・Stripe / Webhook / 商品棚 UI**に **本文だけで進めない**（§4）。  
- **秘密鍵・Webhook secret を記載しない**。  

---

## 6. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | PART1 結果の監査転記テンプレートとして初版 |
