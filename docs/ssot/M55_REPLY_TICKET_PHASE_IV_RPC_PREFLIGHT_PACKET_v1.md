# M55_REPLY_TICKET_PHASE_IV_RPC_PREFLIGHT_PACKET_v1

Status: **`public.m55_reply_ticket_fulfill_checkout_event`（Phase IV RPC 候補）適用前の、対象 DB 前提確認用パケット定義**。**RPC 適用 GO／staging・production の承認文書ではない。**  

Recorded: **2026-04-28**

Upstream:

- **静的監査（PASS 済み前提）:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_CANDIDATE_STATIC_AUDIT_v1.md`
- **RPC 候補 SQL:** `scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql`
- **本パケット実行文（SELECT のみ）:** `scripts/sql/production/m55_reply_ticket_fulfillment_rpc_preflight.sql`

**秘密・DB URL・Webhook secret・生の `user_id`・payload 本文は返さない。**

---

## 1. 目的

対象環境において、`m55_reply_ticket_fulfill_checkout_event` を **`CREATE OR REPLACE` 適用できるか** を判断するために、必要な **`information_schema` / `pg_catalog` / 安全な集約件数** だけを集める。

- **読取専用**（下記準拠）
- **RPC・DDL・Webhook 本実装は行わない**
- **この packet と summary だけで RPC の staging／production 適用 GO にしない**

---

## 2. SELECT-only 契約（厳守）

| 許可 | 禁止 |
|------|------|
| `SELECT` のみの文 | `INSERT` / `UPDATE` / `DELETE` / DDL / `SET` |
| メタデータ・集約件数 | raw `user_id`、payload、secret、鍵類の出力 |
| 必要に応じた **集約のみ** の `md5(user_id::text)` カーディナリティ | **行単位のハッシュリスト**による識別性の明示（本 packet には含めない） |

結果の読みは **セクション単位**で実施すること（実行 UI が最終結果のみ表示する場合に備える）。

---

## 3. Gates（本条で固定）

| Gate | 判定 |
|------|------|
| **本 packet が示す適用 READY**（`rpc_preflight_ready=true` のみでは不十分な場合あり） | **別 SSOT での staging apply gate と合わせて判断** |
| **staging 適用** | **本条単体では許可しない**（別ゲート／ロールバック計画込みで記録済み運用のみ） |
| **production 適用** | **NO-GO** |
| **Webhook 本実装（fulfillment での RPC 呼び出し等）** | **NO-GO** |

---

## 4. SQL ファイル構成と確認内容対応表

ファイル: **`scripts/sql/production/m55_reply_ticket_fulfillment_rpc_preflight.sql`**

| SECTION | 内容 | ユーザー要求への対応 |
|---------|------|----------------------|
| 1 | `current_database()` | 接続先の手動照合 |
| 2 | `pg_proc` による **関数存在**・**identity 引数**・**戻り型**・期待シグネチャ一致 | **§4.1 関数既存状態** |
| 3 | `stripe_processed_events` / `reply_ticket_wallets` / `reply_wallet_ledgers` / `dtr_report_snapshots` 存在 | **§4.2 必須テーブル** |
| 4–5 | 必須列の **presence 行列** と **列カタログ（型／nullable）** | **§4.2／§4.3 baseline** |
| 6 | `stripe_processed_events` の **stripe_event_id 系 partial UNIQUE** の有無ヒューリスティック、`pg_indexes` 一覧 | **§4.3 index** |
| 7 | ledger の CHECK 一覧 + **`purchase_grant` / `PURCHASE` の文字列入り**ヒューリスティック、`report_instance_id` 存在 | **§4.3 CHECK** |
| 8 | 上記 4 テーブルの **制約一覧**（`contype` 付き） | **§4.3 FK/CHECK baseline** |
| 9 | 同テーブルの **NOT NULL メタ情報**（`is_nullable`） | **§4.3 NOT NULL baseline（カタログ）** |
| 10 | baseline **行数**（processed / wallet / ledger / session） | **§4.4 baseline** |
| 11 | **RI 異常カウント**（`user_id` / `wallet_id` の NULL 行のみ件数） | **§4.4 RI sentinel** |
| 12 | cap／active／safe candidate、`report_instance_id` 非 null wallet 件数、`md5(user_id)` カーディナリティのみ | **§4.5 sample 安全** |
| 13 | **summary 1 行**（下記 §5） | **§4.6 summary** |

### 4.1 必須列の補足（RPC 実装と packet の差分）

利用者が列挙した必須列に加え、候補 RPC が参照するため **本 packet では次も必須として数える**。

- **`public.stripe_processed_events.updated_at`** — RPC の `INSERT`／`UPDATE` で使用
- **`public.reply_ticket_wallets.id`** — `UPDATE ... WHERE w.id = r_wallet.id`

---

## 5. SECTION 13 — summary 列の意味

**ヒューリスティック**であり、特に `ledger_check_allows_*` は **CHECK 定義文字列の部分一致**であり、**実行時に必ず INSERT が通ることの証明ではない**。

| 列名 | true の解釈 |
|------|-------------|
| `rpc_function_already_exists` | `public.m55_reply_ticket_fulfill_checkout_event` が **既に存在** |
| `required_tables_exist` | 依存 4 テーブルがすべて存在 |
| `required_columns_exist` | 必須 **30** 列がカタログ上すべて存在 |
| `required_columns_matched_out_of_30` | 一致列数（診断用） |
| `partial_unique_index_exists` | `stripe_processed_events` に **UNIQUE + stripe_event_id + WHERE** 風の index 定義が見つかった |
| `ledger_check_allows_purchase_grant` | ledger の CHECK 定義に **`purchase_grant`** が含まれる |
| `ledger_check_allows_purchase_source` | ledger の CHECK に **`source_of_grant` と `PURCHASE`** が含まれる |
| `baseline_counts_ready` | 上記 4 テーブル **かつ** `reply_sessions` が存在（session 件数 baseline の前提） |
| `rpc_preflight_ready` | **SECTION 13 のブロッキング条件がすべて無し**（下記カウント 0 と同義） |
| `blocking_gap_count` | **次の項目ごとに最大 1 加算**：必須テーブル不全／必須列不全／partial unique 不在／両 CHECK ヒューリスティック失敗／**既存 RPC の署名が候補と不一致**／wallet cap 公式違反行が 1 件以上／wallet `user_id` NULL／ledger `user_id` または `wallet_id` NULL／session `user_id` NULL／**`reply_sessions` テーブル不在** |

**既に同名関数がある場合:** `blocking_gap_count` に **署名不一致があると加算**される。署名が **`text, text, text, text, uuid, text, text, integer`** かつ戻り **`jsonb`** であれば競合無し。**別シグネチャの同名がある場合は適用判断を STOP** とする（運用側で関数名変更やドロップ方針を別途決める必要がある）。

---

## 6. 静的監査・他 preflight との関係

- **静的監査済み RPC ファイル**とは独立に、**各環境の実スキーマ**を本条で確認すること。
- `stripe_processed_events` の一意性、`reply_wallet_ledgers` の Stripe 列や `report_instance_id` は、**Additive migration preflight／idempotency preflight**と併せて読む。

---

## 7. CHANGELOG — v1

- 初版: Phase IV RPC 候補用 preflight packet（SELECT-only SQL + 本条）
