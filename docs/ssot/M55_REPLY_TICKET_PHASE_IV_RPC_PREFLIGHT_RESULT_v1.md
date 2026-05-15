# M55_REPLY_TICKET_PHASE_IV_RPC_PREFLIGHT_RESULT_v1

Status: **Phase IV RPC 用 preflight（SELECT-only）を本番データベースで実行した結果の SSOT**。**本条は RPC の staging／production 適用承認または Webhook／Checkout 変更の許可ではない。**  

Recorded: **2026-04-28**

Upstream:

- **Preflight packet（説明／summary 辞書）:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_PREFLIGHT_PACKET_v1.md`
- **実行した SELECT-only SQL:** `scripts/sql/production/m55_reply_ticket_fulfillment_rpc_preflight.sql`
- **RPC 候補（未適用）:** `scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql`
- **静的監査記録:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_CANDIDATE_STATIC_AUDIT_v1.md`

**本書は secret／raw user_id／payload 本文／DB URL／Webhook secret を出力しない。**

---

## 1. 実行環境

| 項目 | 記録 |
|------|------|
| **DB / 論理コンテキスト** | **m55-soul-core / main / PRODUCTION** |
| **実行文** | **`scripts/sql/production/m55_reply_ticket_fulfillment_rpc_preflight.sql` の SELECT のみ** |
| **DML** | **実行していない**（`INSERT` / `UPDATE` / `DELETE` なし） |
| **DDL** | **実行していない**（`CREATE` / `ALTER` / `DROP` なし） |
| **`SET` 等** | **実行していない** |
| **DB 更新** | **なし** |
| **RPC 作成** | **なし** |
| **出力契約** | **カタログ・集約件数・ヒューリスティックフラグのみ**（secret／raw user_id／payload 本文は出さない） |

---

## 2. Preflight 結果（SECTION 13 summary 1 行相当）

| 列 | 値 |
|----|-----|
| `rpc_function_already_exists` | **false** |
| `required_tables_exist` | **true** |
| `required_columns_exist` | **true** |
| `required_columns_matched_out_of_30` | **30** |
| `partial_unique_index_exists` | **true** |
| `ledger_check_allows_purchase_grant` | **true** |
| `ledger_check_allows_purchase_source` | **true** |
| `baseline_counts_ready` | **true** |
| `rpc_preflight_ready` | **true** |
| `blocking_gap_count` | **0** |

**補足（PACKET 定義どおり）:** `ledger_check_allows_*` は **CHECK 定義文字列に対するヒューリスティック**であり、実行時の INSERT 保証ではない。最終判断は **CHECK 全文の人手レビュー**と **RPC 最終監査**に委ねる。

---

## 3. 判定

| 観点 | 判定 |
|------|------|
| **RPC 適用の前提（スキーマ／冪等インデックス／ledger 整合の観測）** | **成立**（上記 summary に基づく） |
| **既存 RPC とのシグネチャ衝突** | **なし**（`rpc_function_already_exists = false`） |
| **必須テーブル／列** | **揃っている**（`required_tables_exist` / `required_columns_exist` / `30/30`） |
| **`reply_wallet_ledgers.report_instance_id`、Stripe 4 列、`stripe_processed_events`、partial unique index** | **利用可能と観測**（列存在・索引ヒューリスティックが true） |
| **ledger CHECK と `purchase_grant` / `PURCHASE`** | **ヒューリスティック上は許容と観測**（定義全文の再確認は引き続き推奨） |
| **本条単体で RPC 適用 GO にするか** | **しない**（下記 NO-GO／別 gate 必須） |

---

## 4. 次の候補（作業順は運用で確定）

1. **RPC production／staging apply gate SSOT の作成**（承認主体・ロールバック・実行手順の明文化）
2. **RPC candidate SQL の最終監査**（静的監査の再掲＋本結果との突合）
3. **適用そのもの**は **別承認**のもとで実施（本条は前提記録にとどまる）
4. **Webhook 本実装**は **RPC 適用結果を記録した SSOT**（ポスト適用観測）の後に計画する（ユーザー方針）

---

## 5. 引き続き NO-GO（本条の時点）

| 区分 | NO-GO |
|------|--------|
| **RPC 作成**（本番・staging を問わず、本条の成果をもって自動実施しない） | **NO-GO** |
| **production APPLY**（RPC／関連 DDL） | **NO-GO** |
| **staging APPLY**（同上） | **NO-GO** |
| **Webhook 本実装** | **NO-GO** |
| **Checkout API の追加変更** | **NO-GO** |
| **Stripe Dashboard／環境変数の変更** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |
| **本番決済テスト** | **NO-GO** |
| **secret／Webhook secret／DB URL の文書・ログへの出力** | **NO-GO** |

---

## 6. CHANGELOG — v1

- 初版: 本番 PRODUCTION における Phase IV RPC preflight（SELECT-only）結果の SSOT。`rpc_preflight_ready = true` により **apply gate 作成へ進める前提が成立**したことを記録。
