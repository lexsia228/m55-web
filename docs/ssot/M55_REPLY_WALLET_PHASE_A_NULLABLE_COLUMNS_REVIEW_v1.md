# M55_REPLY_WALLET_PHASE_A_NULLABLE_COLUMNS_REVIEW_v1

Status: **Pre-execution design review** — **DB に適用しない**。`supabase/migrations` に本番用ファイルを **置かない**。  

Date: 2026-04-29  

Related:

- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1.md`（§0.1 quarantine、`Phase A` 定義）
- `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`
- `scripts/sql/draft/m55_reply_wallet_report_instance_scope_draft.sql`
- RPC: `supabase/migrations/20260417000000_m55_reply_generate_commit_rpc.sql`

---

## 1. Phase A で許可候補となる DDL（nullable のみ）

**許可「候補」**となるのは **次のような `ADD COLUMN`** のみであり、すべて **NULL 許可・DEFAULT なし（または明示的に NULL 相当のみ）**。**既存 `UNIQUE (user_id)` 等は変更しない**。

| 対象テーブル | 列（候補名） | 型 | メモ |
|--------------|---------------|-----|------|
| `public.reply_ticket_wallets` | `report_instance_id` | `uuid` | 将来 `dtr_report_snapshots.id` を参照する想定。Phase A では **NULL のみ**。 |
| `public.reply_ticket_wallets` | `migration_status`（任意） | `text` | 運用上のラベル。**`CHECK` で列挙のみ許可**する案がドラフトにある（例: `'pending','filled','manual_review','quarantine'`）。**未追加でも Phase A は成立**（運用要件で決める）。 |
| `public.reply_wallet_ledgers` | `report_instance_id` | `uuid` | Nullable。 Phase A では未設定のまま。 |
| `public.reply_sessions` | `report_instance_id` | `uuid` | 同上。 |

**PostgreSQL の挙動:** 既存行に対して新列は **NULL**。行サイズ増・メタデータ更新のみで、**既存 UNIQUE 制約の「定義」を変えない限り**、**`user_id` 一意の前提は維持**される。

**ドラフトとの対応:** `m55_reply_wallet_report_instance_scope_draft.sql` の **PHASE A コメントブロック**が本レビューと一致する。**実行は別途 staging 手順のみ**。

---

## 2. Phase A で絶対にやらない DDL/DML

| 種別 | 例 | 理由 |
|------|-----|------|
| **データ変更** | `UPDATE` / `DELETE` による **backfill、`report_instance_id` のセット** | **Phase B 以降**のゲート。quarantine と SSOT が別途要求。 |
| **制約強化** | `NOT NULL`、**新しい `UNIQUE`/`PRIMARY KEY` の置換**、`FK` の **`VALID`** 完了 | Phase F/G および別 GO。 orphan NULL が許容されるまで NO-GO。 |
| **`UNIQUE(user_id)` の DROP** | Phase F に相当 | RPC・一意前提との整合が取れるまで禁止。 |
| **既存列の型変更／リネーム** | — | Phase A の範囲外・リスク大。 |
| **トリガー／ルールの変更** | — | アプリ未到達で検証困難ならしない。 |

**本レビューの範囲外（変更しないこと）:** `walletGrants`、`RPC`、`/api/reply/generate`、`ConsultRoom`、Stripe、Webhook、商品棚 UI。**Phase A DDL だけではそれらを改修しない前提**でレビューする。

---

## 3. 既存アプリ / RPC への影響

### 3.1 `m55_reply_generate_commit`

`reply_ticket_wallets` への **SELECT は `id`, `available_count`, `status` のみ**。**UPDATE は `consumed_count`, `available_count`, `updated_at` のみ**（該当 migration より）。  

→ **nullable 列の追加だけ**では、これら SQL の **列リストに含まれない**ため、**ロジック変更なしでも動作**する想定（PostgreSQL が新列を無視）。

### 3.2 `INSERT INTO reply_ticket_wallets`（smoke 用）

明示列のみの `INSERT`。新列は **DEFAULT または NULL**。**列を追加しない限り自動で NULL**。**互換維持**。

### 3.3 クライアント / Supabase JS / PostgREST

- **`select('*')`** をしているコードは **新しい列キーが返る**だけ（値は基本的に `null`）。アプリが **未知キーを拒否**するような極端な実装でなければ問題になりにくい。  
- **生成型（TypeScript）** は **スキーマ再生成または手動更新**が必要になりうる — **staging での smoke** で確認することが望ましい。**本レビューは DB 側のみ**。  

### 3.4 Row Level Security / Policies

Policies が **`SELECT *`** 前提で **列単位 deny** をしていない限り、**列追加のみ**で policy 変更は通常不要。**staging で policy 一覧を確認**することを推奨。

---

## 4. orphan 3件への影響

- **論理状態は変わらない:** orphan は **`dtr_report_snapshots`（DTR core）無し**。Phase A が **nullable 列のみ**追加するだけなら、`report_instance_id` は **全行 NULL のまま**（backfill はしないため）。  
- **既存 entitlement / wallet / reply 行は削除されない**。  
- **「壊れる」パスになりにくい:** アプリ/RPC が新列を **読まない／書かない限り**、挙動は現状維持。  
- **`migration_status` を追加し NULL のまま**にする運用でも、チェック約束を **`NULL OR IN (...)`** にすれば orphan は **自動で quarantine とマークされないが、NULL のままでも SSOT と矛盾しない**。（将来 Phase B で `manual_review` 等へ寄せるのは別承認）。

---

## 5. rollback 方針

| 状態 | 方針 |
|------|------|
| **Phase A のみ適用済み**かつ追加列のみ | **`ALTER TABLE ... DROP COLUMN ...`** で **追加した列のみ**順に削除可能（ロック・依存に注意）。`IF EXISTS` と **事前バックアップ**を推奨。 |
| **データ投入後（Phase B 以降）** | Phase A のみの rollback と切り離し。**逆方向 UPDATE で NULL に戻す**は運用負荷。本レビュースコープでは **Phase B はまだしない**ため、** rollback は「列 DROP」のみ検討**でよい。 |
| **本番での事故** | PITR / スナップショットに依存（Runbook と同様）。 |

---

## 6. staging / dev で実行する場合の前提条件

- **対象が staging/dev** であること（project ref / 環境ラベルの再確認）。  
- **バックアップまたは PITR 復旧パスが合意済み**。  
- **ORPHAN_THREE_CASE_CLASSIFICATION_v1 と件数・方針が突合済み**（自動 backfill は行わない）。  
- **`M55_REPLY_WALLET_REPORT_INSTANCE_STAGING_MIGRATION_RUNBOOK_v1`** および **`..._EXECUTION_PACKET_v1`** の **STOP チェック**を読み、**Phase A ブロックのみ**を手順どおり適用する（ドラフト／staging packet は **コメントアウトされている DDL を選択的に** — 本レビュー文書自体は DDL を実行しない）。  
- **実施ログ:** 実行日時、実行者、`git` SHA、適用対象ブランチ。  
- **実行後 smoke:** RPC 経由の返書 consume の **回帰**（staging のみ）。

---

## 7. 本番適用にまだ進めない理由

- **ADR / EXECUTION REVIEW にある本番 DDL 総合 GO** と、**RPC・アプリの report_instance 追従計画** が **未完了**のまま **本番 `supabase/migrations`** に載せると、**単一ソースの DDL が先行**しかねない。  
- **Phase A を本番だけ先に適用**する運用がある場合でも、**リリース手順・ロールバック・ダウンタイム** が **レビューサインオフ**されていない状態では **進めない**（本編はレビューのみ）。

---

## 8. Phase B 以降の NO-GO 条件（再掲）

次をすべて満たすまで **Phase B〜G（backfill、NOT NULL、FK、`UNIQUE` 入替 等）は NO-GO**：

| 項目 | 条件 |
|------|------|
| **自動 backfill** | **Known orphan（quarantine）以外**とも、**snapshot 無しユーザーに `report_instance_id` を捏造しない**。PLAN の Phase B と `ORPHAN_THREE_CASE_CLASSIFICATION_v1`。 |
| **NOT NULL / FK / strict UNIQUE** | **manual_review／quarantine の NULL 例外**が許容されていない状態では適用しない。 |
| **Phase F/G** | **RPC・アプリ**/walletLocks の **`user_id` 単位前提からの離脱計画がない状態では本番では実行しない**。 |
| **Stripe / 商品棚** | **別ゲート**（本レビューのスコープ外）。 |

---

## 9. 結論サマリ

| 観点 | 結論（本レビュー時点） |
|------|------------------------|
| **`UNIQUE(user_id)` を残したまま nullable のみ追加** | **一般的には安全**であり、PostgreSQL と既存 INSERT 明示リストは **両立**。 |
| **orphan 3 件が残っていること** | **nullable のみ追加**ならデータは **NULL のまま**で、RPC の既存クエリとは **競合しない**想定。 |
| **`migration_status` 省略可否** | **省略可能**。追加する場合も **CHECK 付き**がドラフトに沿う。 |

---

## 10. 改廃

| Ver | Date | Summary |
|-----|------|---------|
| v1 | 2026-04-29 | Phase A nullable のみ事前レビュー初版 |
