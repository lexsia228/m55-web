# M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_DIAGNOSTIC_PACKET_v1

Status: **本番 DDL 実測用・SELECT-only 診断パケット定義** — **この文書単体では migration GO／Webhook GO／実装 GO にしない。**  

Recorded: **2026-04-28**

Upstream:

- **Gap レビュー SSOT:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_REVIEW_v1.md`
- **診断 SQL:** `scripts/sql/production/m55_reply_ticket_fulfillment_schema_gap_diagnostic.sql`

**秘密鍵・DB URL・Webhook secret・Stripe secret・生 `user_id`・payload 本文は診断出力に含めない。**

---

## 1. 診断目的

追加相談返書チケットの **Fulfillment** に向け、**現行本番スキーマ**が次を満たせるかを **カタログ情報のみ**で把握する。

- **Wallet／Ledger 更新**に必要な列・制約・索引
- **Stripe 冪等性**の永続先（`stripe_events` 等）の有無
- **監査 Ledger**（`event_type`／`source_of_grant`／残高系）と **CHECK** 文言
- **上限（cap）**と **report_instance スコープ**に必要な列・一意制約の実態

実測結果は **additive migration design review** の入力とし、**migration 本文・コード・Stripe Dashboard・Webhook・UI・商品棚**は本フェーズでは扱わない。

---

## 2. SELECT-only の厳守事項

- **許可:** `SELECT` のみ（`information_schema`／`pg_catalog` 参照）。
- **禁止:** `INSERT`／`UPDATE`／`DELETE`／`ALTER`／`DROP`／`CREATE`／`SET` 等の変更系。
- **出力:** 列名・データ型・制約定義・索引定義・件数・存在フラグ。**アプリ行の本文・`payload_json` の中身・識別子の列挙（生 `user_id` 等）は出さない。**

---

## 3. この packet だけでは GO しない理由

- 診断は **スキーマのスナップショット**であり、**業務ルール（上限 5 件・冪等キー設計）の完全妥当性**はアプリ・運用設計とセットで判断する。
- **gap 結果を転記・整理したうえで**、**additive migration design review** を別途開催する。
- **Webhook 実装・Stripe 本番連携**は引き続き **NO-GO**（本 packet の合格だけでは開始しない）。

---

## 4. SQL セクション対応表

| Section | 内容 |
|--------|------|
| 1 | `reply_ticket_wallets` 列カタログ |
| 2 | 同テーブル CHECK／UNIQUE／PK／索引（`pg_constraint`／`pg_indexes`） |
| 3 | `reply_wallet_ledgers` 列カタログ |
| 4 | 同テーブル制約・索引 |
| 5 | `public` 内 Stripe／購入／entitlement 系テーブル名の存在確認 |
| 6 | Ledger の列名で stripe／checkout／payment_intent／payload 系の **有無** |
| 7 | `stripe_events` 列カタログ（テーブルが無ければ 0 行） |
| 8 | Ledger の **CHECK 定義全文の連結**と、文言スキャン用ブール（`purchase_additional_reply_ticket`／`purchase_grant` 等） |
| 9 | **診断サマリ**（単一行のフラグ・ヒューリスティック件数） |
| 10 | `purchases` 列カタログ（無ければ 0 行） |

---

## 5. 診断項目（要件トレーサビリティ）

### 5.1 Wallet columns

- `reply_ticket_wallets` の **列一覧**（§1）
- 重点列: `report_instance_id`、`initial_included_count`、`purchased_count`、`consumed_count`、`available_count`、`status`、`created_at`／`updated_at`
- **CHECK**／**UNIQUE**／**index**（§2）

### 5.2 Ledger columns

- `reply_wallet_ledgers` の **列一覧**（§3）
- 重点列: `report_instance_id`、`wallet_id`、`delta`、`balance_after`、`event_type`、`source_of_grant`、`reply_session_id`
- **`payload_json` 相当**（`payload`／`metadata_json` 等の列名一致のみ・§6）
- **Stripe checkout／session／payment 参照列**の有無（列名パターン・§6）
- **CHECK**／**index**（§4）

### 5.3 Stripe / idempotency objects

- **`stripe_events` テーブル**の有無（§5 の一覧・§7）
- **`stripe_processed_events` 相当**（名前パターン `%processed%stripe%` の件数・§9）
- **`purchases`／entitlement 系**の有無（§5／§10）
- **`checkout_session_id`／`stripe_event_id`／`payment_intent_id`** を保存しうる **列の有無**（§6–7・§10）
- **UNIQUE 制約**の有無（§2／§4／§10 の制約クエリ結果）

### 5.4 Constraints / check values

- **§8** の **`concatenated_check_definitions`** で `reply_wallet_ledgers` の CHECK 全文を確認する。
- **`event_type`／`source_of_grant`** の許容セットは **§8 と §9** のフラグと照合する。
- **`purchase_additional_reply_ticket`** および **`stripe_checkout`** が **CHECK に文字として含まれるか**（別 CHECK 定義に分かれていてよい）は §9 の  
  `check_def_includes_*` / `ledger_check_allows_new_event_type` を参照する。

**許容されない場合の読み替え（文書側の整理）**

| 状況 | 代替候補（設計レビューで検討） |
|------|--------------------------------|
| 新イベント名のみ不足 | `purchase_grant` ＋ **メタデータ列**での区別、アプリ側で ticket 種別を保証する |
| `source_of_grant` に `stripe_checkout` が無い | 既存の `PURCHASE` と Stripe 参照列の組み合わせで表現する、または **additive CHECK 緩和**（別レビュー） |
| CHECK が狭いまま | **DDL 変更なしでは**Fulfillment が DB 拘束と矛盾しない書き方に寄せる、または migrations レビューで拡張 |

### 5.5 Cap enforcement readiness

- **上限チェックに必要な列**: `initial_*`／`purchased_*`／`consumed_*`／`available_*`／`status` が揃っているか → §9 `wallet_cap_columns_distinct_hit_count_expect_5` と §1 を照合する。
- **active のみ許可**: §1 に **`status`** があり §2 に active 系 CHECK が読み取れるか。
- **`report_instance_id` で対象 wallet を一意に寄せられるか**: §9 `wallet_has_report_instance_id_column` と **§2 の UNIQUE／索引**で、`(user_id, report_instance_id)` など **スコープ付き一意**があるか確認する。**`user_id` のみ UNIQUE のままか**も §2 の定義から判断する（単独付与を避けるには複合 UNIQUE またはアプリ側の厳守が必要）。
- Ledger 側でも **`report_instance_id`** が **`ledger_ready_for_audit_insert`** の前提列に含まれる（§9）。

### 5.6 Diagnostic summary（SECTION 9 の意味）

結果は **ヒューリスティック（目安）**。**0 でも NO-GO 解除にはならない。**

| 列名（例） | 意味の目安 |
|------------|------------|
| `wallet_ready_for_count_update` | cap 関連 5 列＋`report_instance_id`＋テーブル存在の粗い判定 |
| `ledger_ready_for_audit_insert` | 監査に必須とした 7 列名が **すべて**あるか |
| `idempotency_table_exists` | `stripe_events` **または** `%processed%stripe%` 名のテーブルが存在する |
| `idempotency_stripe_events_table_exists` | **`stripe_events` テーブル**のみ |
| `stripe_reference_storage_exists` | 冪等テーブル系 **または** Ledger に Stripe 参照ライク列がある（保管可能性の下限） |
| `ledger_has_stripe_reference_like_column_match` | Ledger 側の Stripe 参照列パターン |
| `ledger_check_allows_new_event_type` | いずれかの Ledger CHECK が **`purchase_additional_reply_ticket`** を含む **かつ** いずれかが **`stripe_checkout`** を含むか（**異なる CONSTRAINT に分かれてよい**） |
| `migration_candidate_dimension_sum_heuristic` / `migration_needed_count` | **同じ値**。**欠落次元の件数（0〜6）**／テーブル不在・cap 列不足・`report_instance_id` 欠落・Stripe 側シグナル等の **粗い合算** |
| `blocking_gap_count` | **両方の中核テーブル** (`reply_ticket_wallets` / `reply_wallet_ledgers`) のいずれかが無ければ **1**、両方あれば **0** |

実行 UI によっては **複数ステートメントの最終結果だけ**が表示される。必要なら **SECTION 単位で**実行する。

---

## 6. 実行後の次ステップ（GO しないものの明示）

1. §1–10 と §9 の結果を **`M55_REPLY_TICKET_FULFILLMENT_SCHEMA_GAP_REVIEW_v1`** に **転記**し、ギャップを更新する。  
2. **Additive migration design review** に材料を渡す（**migration ドラフト作成はレビュー合意後**）。  
3. **Webhook・Stripe Dashboard・商品棚・本番コード**は **別チケット・別 GO** とする。

---

## 7. CHANGELOG

- **2026-04-28:** v1 初版（SELECT-only diagnostic packet／SQL と整合）。
