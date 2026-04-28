# M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1

Status: Draft — **not approved for production `supabase/migrations` without ADR gate + QA**  
Date: 2026-04-28  
Related:

- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_SCOPE_ADR_v1.md`（推奨案 A）

Draft SQL mirror: `scripts/sql/draft/m55_reply_wallet_report_instance_scope_draft.sql`

Owner: M55 / Reflect Note by M55

---

## 0. 本ドキュメントの位置づけ

- **migration を本番 DB に適用しない**。`supabase/migrations/` に本番適用用ファイルとして **追加しない**。  
- 適用するのは **PR1.8（staging/dev）ゲート後** とする。  
- アプリコード（ConsultRoom、`/api/room/core`、`/api/reply/generate`、`walletGrants`、RPC）は **別 PR** で追従（本 PLAN のスコープ外）。

---

## 1. 調査結果サマリ

### 1.1 `dtr_report_snapshots` のキー構造

| 項目 | 内容 |
|------|------|
| **PK** | `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`（`20260420000000_dtr_drafts_and_report_snapshots.sql`）。 |
| **ビジネス一意** | **`UNIQUE (user_id, product_id)`**。現行スキーマでは **同一ユーザー・同一製品につきスナップショットは最大 1 行**。 |
| **意味** | 購入完了時に固定される **immutable Entry Report**。**1 行＝「その購入に対応する实例」**。 |

ソース: `supabase/migrations/20260420000000_dtr_drafts_and_report_snapshots.sql`

### 1.2 `entitlements` / `entitlement_rights` と `dtr_report_snapshots` の紐づき

- **migration 内に `dtr_report_snapshots` への FK は無い**。  
- アプリは **Fulfillment で `entitlements`/`entitlement_rights` 更新と `dtr_report_snapshots` UPSERT を別処理**している（コード: `lib/m55/dtrCoreCheckoutFulfillment.ts` + `upsertDtrReportSnapshotAtFulfillment`）。  
- **権利キーとスナップショット**は **`user_id` + product コンテキスト**で論理結合され、DB 外部キー一元化はされていない。

### 1.3 `report_instance_id` の正規候補（推奨）

| 候補 | 採否 | 理由 |
|------|------|------|
| **`dtr_report_snapshots.id`（uuid）** | **採用推奨** | PK で一意。**本質レポートの「immutable 实例」を 1 行で指す**。正本 SSOT の **report_instance** と整合しやすい。 |
| `(user_id, product_id)` の合成 | 代替 | UNIQUE は既にあるが、アプリでは **uuid の `id`** の方が FK・JOIN が簡潔。**ledger に uuid 1 本で持たせる方針がよい**。 |
| 新規 `gen_random_uuid()` を wallet と無関係に発行 | 非推奨 | **スナップショットと結びつかず**監査が崩れる。 |

**製品キー**: 現行エントリーは **`DTR_CORE_STATIC_V1`**（`lib/oneTimeCheckout.ts` と一致）。バックフィル時の JOIN は **`dtr_report_snapshots.product_id = 'DTR_CORE_STATIC_V1'`** を前提とする（将来製品増加時は **別製品ごとに行が分かれる**ことを `UNIQUE (user_id, product_id)` が許容）。

### 1.4 `reply_ticket_wallets`

- **`user_id text NOT NULL UNIQUE`** — PostgreSQL が **単一列 UNIQUE**，デフォルト名は慣例で **`reply_ticket_wallets_user_id_key`**（**適用前に `pg_constraint` で実名確認必須**）。  
- **`report_*` / `report_instance*` 列は無い**。  
- **`available_count` 等チェック**：`available_count = initial_included_count + purchased_count - consumed_count`。

ソース: `20260416000000_reply_system_data_layer_v1.sql`

**既存行数**: migration 適用後は **環境ごとに `SELECT COUNT(*) FROM reply_ticket_wallets`** で確認（本 PLAN に数値固定はしない）。

### 1.5 `reply_wallet_ledgers`

- **PK**：`id`。**`(user_id)` または `(wallet_id)` の UNIQUE は無い**。  
- **FK**：`wallet_id → reply_ticket_wallets(id) ON DELETE CASCADE`。  
- **CHECK**：consume 時 `reply_session_id IS NOT NULL` 等。

### 1.6 `reply_sessions` / `reply_documents`

- `reply_sessions`：`UNIQUE(user_id, idempotency_key)`、**`report_instance_id` 列なし**。`core_profile_ref` のみオプション。  
- `reply_documents`：`reply_session_id` UNIQUE FK。

### 1.7 アプリコード（ユーザー ID のみ）

| 箇所 | 現状 |
|------|------|
| `grantInitialIncludedReplyIfNeeded` | `.eq('user_id', userId)` のみ。 |
| `grantPurchasedReplyTickets` | 同上 + 枚数更新。 |
| **`m55_reply_generate_commit`（RPC）** | `FROM reply_ticket_wallets WHERE user_id = p_user_id FOR UPDATE`。 |

ソース: `lib/m55/reply/walletGrants.ts`、`supabase/migrations/20260417000000_m55_reply_generate_commit_rpc.sql`

---

## 2. Migration 案（段階）

**原則:** `nullable 追加 → backfill → 検証 → UNIQUE 移行 → NOT NULL`。いきなり NOT NULL にしない。

| 段階 | 内容 |
|------|------|
| **Phase A** | `reply_ticket_wallets.report_instance_id uuid NULL`、`reply_wallet_ledgers.report_instance_id uuid NULL`、`reply_sessions.report_instance_id uuid NULL` を **追加のみ**（FK は任意・別検討）。 |
| **Phase B** | **バックフィル**：`reply_ticket_wallets` を `dtr_report_snapshots` と **`user_id` + `product_id = 'DTR_CORE_STATIC_V1'`** で結合し **`report_instance_id = dtr_report_snapshots.id`** をセット。 |
| **Phase C** | **ledger**：`wallet_id` 経由で wallet の `report_instance_id` を **ledger にコピー**。既存 consume 行は **同じ实例**を付ける（履歴説明として最低限）。 |
| **Phase D** | **`reply_sessions`**：同一ユーザー・製品前提で **`dtr_report_snapshots.id` を 1 件選び**セット（複数無い現在は単純 UPDATE）。将来的に複数行が立つ場合は **別論点**。 |
| **Phase E** | **検証**：NULL 残存を **カウント**。意図しない NULL は **自動破壊的紐づけをしない**。**quarantine / manual_review** に回す（下記 §4）。 |
| **Phase F** | **`UNIQUE (user_id)` を DROP** 前に **制約名を実環境で確認**。同一トランザクションまたはメンテ窓で **`UNIQUE (user_id, report_instance_id)`** を追加。**NULL が残る間は複数 NULL の危険**があるため NOT NULL より先に重複チェックを厳守。PostgreSQL は **NULL を distinct とみなす**ため、`UNIQUE (user_id, report_instance_id)` でも **複数 `(user_id, NULL)` が存在可能** → **NOT NULL 前提で UNIQUE**。 |
| **Phase G** | **`report_instance_id` NOT NULL**（対象テーブルごとにゲート）、必要なら **`FOREIGN KEY (report_instance_id) REFERENCES dtr_report_snapshots(id)`** を追加。 |

**RPC / アプリ**: **RPC はこの migration だけでは自動更新されない**。**適用順序**：DB 適用後、**staging で RPC・アプリを实例対応へ出す**ことを推奨（でないと `FOR UPDATE` が旧前提のまま）。

---

## 3. 複数 DTR instance を持つユーザーの例外

**現行 `UNIQUE (user_id, product_id)` により、同一 `product_id` で複数 snapshot 行は想定されていない**。  
将来 **再購入・複数行** が入る場合は：

- 本 PLAN の **自動 backfill は「単一snapshot」前提**を宣言し、  
- **2 行以上**検出されたユーザーは **`manual_review`** フラグ（wallet 側列または別テーブル）へ退避して **自動割当禁止** とする。

---

## 4. Backfill 不能ユーザー（quarantine / manual_review）

| 状態 | 扱い |
|------|------|
| wallet 行はあるが **対応する `dtr_report_snapshots` が無い** | **自動 UPDATE しない**。**ステータス `suspended` またはフラグ列 `needs_manual_review = true`** 等で **管理者対応**。 |
| **複数 snapshot**（将来 unique 変更後） | 上記と同様 **手動**。 |
| **`report_instance_id` が付かない ledger 古行** | **履歴として残し**、可能なら **wallet と同じ UUID を後から UPDATE**（監査ログで承認済みのみ）。 |

---

## 5. Rollback 方針（概念）

1. **`NOT NULL` / `UNIQUE` 追加を未実施なら**：追加列のみ `DROP COLUMN` で戻せる場合あり。  
2. **データ投入後**：**復元は事前バックアップリストア**または **逆方向 UPDATE**。  
3. **`reply_ticket_wallets_user_id_key` を DROP 済み**の場合：再作成前に **重複 user_id が無い**ことを確認。  
4. **推奨**：適用前に **ロールバック手順付きバックアップ**（スナップショット）を取得。

---

## 6. 適用前チェック SQL（例）

- `reply_ticket_wallets` 行数。  
- `dtr_report_snapshots` で `product_id = 'DTR_CORE_STATIC_V1'` の行数。  
- **wallet ユーザーのうち snapshot 無し**の件数。  
- **同一 user に snapshot 2 行以上**（現行 UNIQUE では通常 0 件）。

詳細は `scripts/sql/draft/` 内ドラフト末尾。

---

## 7. 適用後チェック SQL（例）

- `reply_ticket_wallets.report_instance_id IS NULL` = 0（または許容のみ quarantine）。  
- **`COUNT(DISTINCT (user_id, report_instance_id)) = COUNT(*)`**。  
- **ledger の `report_instance_id` が wallet と一致**（許容ルール記載済み）。

---

## 8. まだ **実行してはいけない** 理由（ゲート）

1. ADR と **staging 適用結果**・**アプリ／RPC の追従計画**の合意なしで本番 DDL を流すと **書き込み経路が user 単位のまま**になり **不整合**。  
2. **`m55_reply_generate_commit` が user で wallet をロック**している。**DB だけ先に変更して RPC が旧前提**だと重大障害リスク。  
3. **`UNIQUE(user_id)` DROP** は障害復旧コストが高い。  
4. 本ドラフト SQL は **`CONCURRENTLY`** や **メンテナンスウィンドウ**検討なく **参考用**であり **コピペ即実行しない**こと。

---

## 9. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | PR1.7 初版。ドラフトのみ。 |
