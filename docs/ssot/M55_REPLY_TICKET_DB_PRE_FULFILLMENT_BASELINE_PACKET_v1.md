# M55 追加相談返書 — DB pre-fulfillment baseline 実行パケット（v1）

**文書種別:** **test checkout payment completion** / **webhook fulfillment** の **pre baseline** を **SELECT のみ**で取得するための **手順・ポリシー・SQL 参照**の SSOT  
**バージョン:** v1  

**親ゲート:** [`M55_REPLY_TICKET_DB_PRE_POST_BASELINE_GATE_v1.md`](./M55_REPLY_TICKET_DB_PRE_POST_BASELINE_GATE_v1.md)  
**SQL（読み取り専用）:** [`scripts/sql/production/m55_reply_ticket_pre_fulfillment_baseline.sql`](../../scripts/sql/production/m55_reply_ticket_pre_fulfillment_baseline.sql)  

**確定済みコンテキスト:** [`M55_REPLY_TICKET_CHECKOUT_SESSION_CREATION_TEST_RESULT_v1.md`](./M55_REPLY_TICKET_CHECKOUT_SESSION_CREATION_TEST_RESULT_v1.md) — Checkout Session creation **PASS**（未決済・URL 未開封・未 fulfillment）。

---

## 1. pre baseline の目的

| 観点 | 内容 |
|------|------|
| **状態の固定** | 決済・Webhook・DB 更新のゲートに入る前に、**グローバル件数**および **対象 `report_instance_id` に紐づく wallet / ledger / processed_events の断面**を **読み取りだけ**で記録する。 |
| **差分の前提** | **post baseline**（ fulfillment 後）と **同一 SQL** で **差分検証**できるよう、観測列を固定する。 |
| **スコープ** | **SELECT のみ**。**DB 更新なし**。**決済完了なし**。**Webhook fulfillment なし**。**Checkout URL 開封なし**。 |

---

## 2. SELECT-only（本パケットの境界）

- **許可:** `SELECT`（および `WITH` でラップした読み取りクエリ）。
- **禁止:** `UPDATE` / `INSERT` / `DELETE` / `ALTER` / `DROP` / `CREATE` / `SET` / `TRUNCATE` / 副作用のある関数呼び出しでデータを変えること。
- **`digest` / `encode`:** スナップショット所有者の **SHA256 先頭 16 hex** を算出するために **DB 内で `user_id` を読む**が、**結果セットに raw `user_id` を出さない**（[`m55_reply_ticket_stage_b_ownership_wallet_data_selection.sql`](../../scripts/sql/production/m55_reply_ticket_stage_b_ownership_wallet_data_selection.sql) と同方針）。
- **Stripe / Checkout の秘密・全文 ID:** SQL は **`stripe_processed_events` の Checkout session id 等を投影しない**。ledger も **Stripe 参照列が埋まっているかの boolean のみ**。

---

## 3. このパケット単体では決済 GO にしない

- 本ファイルおよび同梱 SQL は **観測手順のパケット**であり、**実行結果それ自体を fulfillment / 決済の承認**とみなさない。
- **test payment completion** / **webhook fulfillment** は **別ゲート・別承認**。
- **duplicate replay / refund / observability / incident response** は **後続 SSOT**（本パケットの外）。

---

## 4. 実行ポリシー

| 項目 | 方針 |
|------|------|
| **実行承認** | **別承認**。ロール・接続先・読み取り専用確認後に実施。 |
| **パラメータ** | `target_report_instance_id`（UUID）と、任意で `operator_expected_owner_hash_hex16`（hex **16**）。**リポジトリにコミットされるコピーでは `NULL` のまま** — 差し替えは **ローカル限定コピー**のみ（Stage B SQL と同様）。 |
| **結果の SSOT 化** | 実行後の **件数・boolean・status・hash・タイムスタンプ** を結果 SSOT に載せる。**baseline 結果 SSOT の後**に **test payment completion gate** の議論・実施へ進める運用とする。 |

---

## 5. SQL が返す確認項目（概要）

### 5.1 Global baseline

- `stripe_processed_events_total_count`
- `reply_ticket_wallets_total_count`
- `reply_wallet_ledgers_total_count`
- `reply_sessions_total_count`

### 5.2 Target report / ownership

- `target_report_exists_bool`（`dtr_report_snapshots` に対象 id があるか）
- `owner_user_hash_hex16`（所有者の **hash 先頭 16 hex** — raw `user_id` は **返さない**）
- `ownership_matches_expected_operator_hash_bool`（オペレータが hash を渡した場合のみ意味あり）

### 5.3 Target wallet

- wallet の有無は `target_wallet_exists_bool` / `wallet_id` の存在で判断
- `wallet_status`, `initial_included_count`, `purchased_count`, `available_count`, `consumed_count`
- `target_wallet_cap_reached_bool`（cap 式は Checkout / RPC と整合した既存定義）

### 5.4 Target ledger

- `target_wallet_ledger_row_count`
- 直近 1 行: `ledger_latest_delta`, `ledger_latest_event_type`, `ledger_latest_source_of_grant`, `ledger_latest_product_key`, `ledger_latest_balance_after`
- `ledger_latest_has_stripe_reference_bool`（**値は出さず**有無のみ）

### 5.5 `stripe_processed_events` baseline

- **全体件数**は global と一致（同一テーブルの `COUNT(*)`）
- `processed_events_for_target_report_instance_count`
- `processed_events_additional_reply_ticket_product_count`（`product_key` = `additional_reply_ticket`）
- **status 別件数:** `processed`, `received`, `rejected_not_owner`, `rejected_wallet_inactive`, `skipped_cap`
- **`stripe_event_id` の重複冗長行推定:** `processed_events_stripe_event_id_surplus_duplicate_rows`（**同一 `stripe_event_id` の重複行**の粗い検知 — RPC の duplicate 応答とは別概念になり得る）

### 5.6 Summary 列（SQL 末尾）

| 列名 | 意味 |
|------|------|
| `baseline_ready_bool` | 対象が束縛され、報告・wallet・cap・（任意 hash があれば一致）まで **読取ベースで問題ない**ことの合成フラグ |
| `summary_target_report_exists` | 対象スナップショット存在 |
| `summary_target_wallet_exists` | 対象ユーザー wallet 行が取れた |
| `summary_target_wallet_active` | `active` |
| `summary_target_cap_available` | cap 未到達かつ active 経路のヒント |
| `summary_global_counts_ready_bool` | グローバル件数が取得できた |
| `summary_secret_exposed_bool` | **常に false**（クエリ設計上の宣言 — 実行環境のログ漏えいは別対策） |
| `summary_raw_user_id_returned_bool` | **常に false**（投影しない設計） |
| `summary_blocking_gap_count` | 対象束縛時の **ブロッキング要素の個数**（存在・wallet・active・cap・hash 不一致） |

---

## 6. 記録してよいもの / 禁止するもの

**記録してよいもの**は親ゲート [`M55_REPLY_TICKET_DB_PRE_POST_BASELINE_GATE_v1.md`](./M55_REPLY_TICKET_DB_PRE_POST_BASELINE_GATE_v1.md) の方針に従う（件数、boolean、status、マスク/hash、case 名、timestamp、`value_printed=false`、`secret_exposed=no`）。

**禁止:** raw `user_id`、cookie / token / Authorization、Stripe / webhook secret、DB URL、price id 実値、Checkout URL 全文、session id 全文、生年月日、report 本文、相談本文、`stripe_processed_events` / ledger の **Stripe ID 実値**。

---

## 7. STOP 条件

親ゲートの STOP に加え、以下で **中断**する。

- **SELECT 以外**を実行しようとした。
- **決済**・**Checkout URL 開封**・**実 Webhook 発火**に進んだ。
- 結果やログに **禁止項目**を載せそうになった。

---

## 8. スキーマ前提

- `public.reply_wallet_ledgers` に **`stripe_event_id` / `stripe_checkout_session_id` / `stripe_payment_intent_id` / `product_key`** が存在すること（additive migration 済み想定）。未適用環境では **列 catalog の preflight** の後に実行する。

---

## 厳守事項（本ファイル作成に関して）

- **文書および SELECT-only SQL の作成のみ**。**本対話・CI での SQL 実行なし**。**DB 更新なし**。**Checkout / 決済 / Webhook / Dashboard・env 変更なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_PACKET_v1*
