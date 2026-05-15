# M55_REPLY_WALLET_SHADOW_BOOTSTRAP_MIGRATION_FILE_AUDIT_v1

Status: **Read-only audit** — **ソースはリポジトリ上の migration ファイル本文の静的読取のみ。** **DB には接続していない。** **SQL は実行しない。**  

Date: 2026-04-29  

Audit source files (frozen at audit):

- `supabase/migrations/20260416000000_reply_system_data_layer_v1.sql`
- `supabase/migrations/20260420000000_dtr_drafts_and_report_snapshots.sql`
- `supabase/migrations/20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql`
- `supabase/migrations/20260421000000_dtr_postgrest_schema_reload.sql`

Related:

- `docs/ssot/M55_REPLY_WALLET_SHADOW_MINIMAL_BOOTSTRAP_RUNBOOK_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SHADOW_MINIMAL_BOOTSTRAP_DRAFT_v1.md`

**本文では実行可能 DDL を新規掲載しない。** オブジェクト種別・列名の照合のみ記述する。

---

## Executive summary（結論）

| 論点 | 結論 |
|------|------|
| **適用候補に残す** | **`20260416000000`、`20260420000000`、`20260422000000`** は **ソース上 DDL のみ／DML 無し**。**順序依存は `604220` が `604200` 作成済みオブジェクト前提**（本条 §5）。 |
| **任意** | **`20260421000000`** — **通知のみ**（§6）。 **`604220` 末尾にも同じ通知**。 |
| **前提不足（ソース内）** | **他テーブルへの `ALTER`/FK は無い。** **`gen_random_uuid()`** が利用できる PostgreSQL が前提（運用上は Supabase 既定で通常問題なし。**明示的な `CREATE EXTENSION` は 4 ファイルいずれにも無い**）。 |
| **`604200` と `604220` の重複列** | 現行 `604200` は **`extra_json`**（guest）および **`draft_snapshot`**（snapshot）を **既に作成時に含む。** `604220` は **`ADD COLUMN IF NOT EXISTS`** による **後追き整合**であり、**新規適用でも二重適用でも idempotent**。 |
| **`dtr_report_snapshots` の列セットに関する質問リスト訂正** | **`nickname` / `birth_date` は `dtr_guest_drafts` にあり、`dtr_report_snapshots` には無い。** **`updated_at` は現在の `604200` に `dtr_report_snapshots` 用としては無い**（詳細 §4）。 |
| **まだ shadow へ適用してよいか** | **監査ソース上は手貼り補填不要で、候補 3 と任意 1（`604210`）は論理的に整合。** 実際の適用は **`MINIMAL_BOOTSTRAP_RUNBOOK`** の別承認と接続確認のうえのみ。 |

---

## 1. 各 migration の内容（静的分類）

### 1A. `20260416000000_reply_system_data_layer_v1.sql`

| 分類 | 有無 |
|------|:----:|
| `CREATE TABLE` | はい（4 つ：`reply_sessions`、`reply_ticket_wallets`、`reply_documents`、`reply_wallet_ledgers`） |
| `ALTER TABLE` | いいえ |
| `CREATE INDEX` | はい（各表に複数、`IF NOT EXISTS`） |
| `CREATE FUNCTION` | いいえ |
| `CREATE POLICY` | いいえ |
| `COMMENT`（オブジェクト単位） | いいえ（テーブルの `COMMENT ON` 無し） |
| `NOTIFY` | いいえ |
| `INSERT` / `UPDATE` / `DELETE` | いいえ |
| `DROP` | いいえ |
| 明示 **`BEGIN`** / **`COMMIT`** のトランザクションブロック | **いいえ**（標準運用ではクライアント側がステートメント単位でコミット） |
| **Extension 明示** | **いいえ**。**`DEFAULT gen_random_uuid()`** が各所で使用。** |

---

### 1B. `20260420000000_dtr_drafts_and_report_snapshots.sql`

| 分類 | 有無 |
|------|:----:|
| `CREATE TABLE` | はい（`dtr_guest_drafts`、`dtr_report_snapshots`） |
| `ALTER TABLE` | いいえ |
| `CREATE INDEX` | はい（`IF NOT EXISTS`） |
| `COMMENT ON TABLE` | はい（2 テーブル） |
| その他 | なし |

**DML なし。`DROP` なし。** トランザクションブロック明示なし。Extension 明示なし。**`DEFAULT gen_random_uuid()` あり。**

---

### 1C. `20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql`

| 分類 | 有無 |
|------|:----:|
| `ALTER TABLE` … `ADD COLUMN IF NOT EXISTS` | はい（`dtr_guest_drafts`、`dtr_report_snapshots`） |
| `COMMENT ON COLUMN` | はい |
| **`NOTIFY pgrst, 'reload schema'`** | **はい（1 回）** |
| DML | いいえ |
| `DROP` | いいえ |
| トランザクションブロック明示 | いいえ |

---

### 1D. `20260421000000_dtr_postgrest_schema_reload.sql`

| 分類 | 有無 |
|------|:----:|
| **内容** | **`NOTIFY pgrst, 'reload schema'` のみ**（コメントのみで DDL 無し）。 |

---

## 2. 適用候補ごとの判定

| migration | そのまま shadow へ適用できるか（ソース論理） | 前提不足 | DDL のみ／DML 混ざらない | Seed／DML | 本番準拠を **このリポのみ**で保証できるか |
|-----------|--------------------------------------------|----------|---------------------------|-----------|------------------------------------------|
| **604160** | **可**。他 migration との FK はファイル内のみ。 | **DB が `gen_random_uuid()` に対応**であること。 | **DDL と index のみ。** | **なし** | **本番へも同一ファイルが適用されていれば準拠。** **本リポと別環境実体の自動照合まではしない。** |
| **604200** | **可**。 | 同上。 | **DDL／index／`COMMENT ON TABLE` のみ。** | **なし** | **同上。** |
| **604220** | **`604200` 適用済みで両テーブルが存在することが前提。** | **両テーブルが無ければ失敗。** | **`ALTER … IF NOT EXISTS` と `COMMENT`、`NOTIFY`。DML なし。** | **なし** | **同上。** **`604200` と列の論理的重複があるが後述のとおり idempotent。** |
| **604210** | **副作用は通知のみ。** | **postgres / pgrst チャネル環境のみ。** | **DDL／DML なし。** | **なし** | **本番 DDL モデルとは無関係。** |

---

## 3. `20260416000000` の監査（reply 領域）

| 質問 | 監査結果（ソース準拠） |
|------|------------------------|
| 四テーブルが正規の `CREATE TABLE IF NOT EXISTS` で作られるか | **はい** — **`reply_sessions`、`reply_ticket_wallets`、`reply_documents`、`reply_wallet_ledgers`。** |
| **`user_id` 型** | **すべて `text`。** `reply_documents.user_id`、`reply_sessions.user_id`、`reply_ticket_wallets.user_id`、`reply_wallet_ledgers.user_id`。**本番側が同一ファイル由来なら不一致にならない。** **手貼り型ズレとは無関係。** |
| **`reply_ticket_wallets` の列** | **`initial_included_count`、`purchased_count`、`consumed_count`、`available_count`、`status` および `CHECK` での整合、`created_at`、`updated_at`。** — **一覧は runbook での検証項目と整合。** |
| **`UNIQUE(user_id)`** | **あり。** `user_id text NOT NULL UNIQUE`（一意制約は列レベル `UNIQUE`）。 |
| **`reply_wallet_ledgers`** | **`delta`、`balance_after`、`event_type`、`source_of_grant`、`wallet_id`、`reply_session_id`、`created_at` および複合 CHECK。** — Phase A staging／dependency map の語彙と一致。 |

---

## 4. `20260420000000` の監査（dtr）

| 質問 | 監査結果 |
|------|----------|
| 両表が `CREATE TABLE IF NOT EXISTS` で作られるか | **はい** — **`dtr_guest_drafts`、`dtr_report_snapshots`。** |
| **`dtr_report_snapshots` の列**（現ファイル） | **`id`、`user_id`、`product_id`、`checkout_session_id`、`profile_snapshot`、`draft_snapshot`、`envelope_json`、`created_at`**、**`UNIQUE (user_id, product_id)`**。** **`nickname`、`birth_date` はここには無い** — **`dtr_guest_drafts` 側。** |
| **`nickname` / `birth_date` が snapshot に無い問題** | **設計として snapshot には未定義。** 監査質問リストの **「snapshot に両列」は誤混同**。 |
| **`updated_at` on `dtr_report_snapshots`** | **`604200` に存在しない。** 本番との差異は **環境によりうる**。手貼りで足さない運用では **migration 親の増分のみを信じる**。 |
| **`user_id` 型** | **`text NOT NULL`**（snapshot）。 **`dtr_guest_drafts.user_id` はnullable `text`。** |

---

## 5. `20260422000000` の監査

| 質問 | 監査結果 |
|------|----------|
| **何を追加するか（論点名）** | **`dtr_guest_drafts`** に **`extra_json`**（`**IF NOT EXISTS**`）。 **`dtr_report_snapshots`** に **`draft_snapshot`**（`**IF NOT EXISTS**`。NULL 許容）。 |
| **`604200` 前提か** | **はい。** 対象 `ALTER TABLE` は既存オブジェクト前提。 |
| **既に列があると失敗するか** | **いいえ** — **`ADD COLUMN IF NOT EXISTS`** で **存在時はノーオップ。** |
| **現行 `604200` と重複しないか（論理）** | **`604200` はすでに `extra_json`（guest）と `draft_snapshot`（snapshot）を含む。** よって **`604220` は新規チェーンにおいて冗長であり、部分適用で欠けていた DB への救済レイヤ**。 |
| **PostgREST reload** | **ファイル末尾 `NOTIFY pgrst`。** **`604210` 単体と論法が近い。** |

---

## 6. `20260421000000` の扱い

| 論点 | 判定 |
|------|------|
| **DDL があるか** | **いいえ（通知のみ）。** |
| **必須か** | **最小 bootstrap の「テーブル存在」だけなら **必須ではない**。** **`604220` でも通知が発火する。** |
| **`604220` との二重通知** | **同一チャネルの短い NOTIFY を連続で投げうるのみ。** DDL モデル変更なし。** shadow では **`604220` があれば `604210` 省略でも多くは問題なし**。** **`runbook`** に従う。 |
| **推奨** | API レイヤーのキャッシュ不整合が続くとき **追加実行**または **ダッシュボードの Reload schema**。 |

---

## 7. 実行前 STOP 条件（監査側のフラグ）

| # | STOP |
|---|------|
| 1 | **手貼り `CREATE` が必要になりそう** — `REJECT`/runbook と矛盾。 |
| 2 | **本ファイル群と異なる DDL が「本番正」と主張されている** — 増分確認が先。 |
| 3 | **想定しない DML が混ざる migration を同じセッションで流そうとする** — 本条対象ファイルは **DML なし** であることが監査済み。 |
| 4 | **`604200` 未適用で `604220`** — **順序エラー**。 |
| 5 | **`entitlements` 等との衝突が疑われる** — 本条の SQL は **`entitlements` を触らない** が、Table Editor で **名前解決**。 |
| 6 | **`user_id` が本番 UUID などで **text と食い違う** と判明した — **本条ではすべて text**。 |
| 7 | **rollback／破棄方針がチーム未定** — **`MINIMAL_BOOTSTRAP_RUNBOOK` §8 参照のうえ承認**。 |

---

## 8. 結論の表

| migration | 候補 | 備考 |
|-----------|------|------|
| `20260416000000` | **残す（推奨）** | DDL のみ。 |
| `20260420000000` | **残す（推奨）** | DDL のみ。dtr 核。 |
| `20260422000000` | **残す（推奨）** | **`604200` 適用後**。`IF NOT EXISTS` と NOTIFY が含まれる。 |
| `20260421000000` | **保留／任意** | 通知のみ。`604220` と二重 NOTIFY 論は runbook で判断。 |

**次のアクション:**

- **追加 runbook の新規種別は不要** — **`M55_REPLY_WALLET_SHADOW_MINIMAL_BOOTSTRAP_RUNBOOK_v1.md` が手順正本。**  
- **shadow 適用は「監査合格」≠「自動 GO」。** **`RUNBOOK` の承認チェックリストのうえ手操作のみ。**

---

## 9. DML／Seed 一覧（4 ファイル合算）

**監査対象 4 ファイル:** **`INSERT`** / **`UPDATE`** / **`DELETE`** は **いずれにも無い。**

※ **`202604170…`（RPC と smoke 挿入行）は本条の監査対象外** — runbook で除外済み。

---

## 10. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-29 | 初版 — 4 migration の静的監査 |
