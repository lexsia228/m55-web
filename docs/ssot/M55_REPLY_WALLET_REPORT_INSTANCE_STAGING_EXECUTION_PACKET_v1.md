# M55_REPLY_WALLET_REPORT_INSTANCE_STAGING_EXECUTION_PACKET_v1

Status: **Staging / dev execution packet (reference)** — **not** a production migration.  

Date: 2026-04-29  

Companion SQL:

- `scripts/sql/staging/m55_reply_wallet_report_instance_scope_staging_packet.sql`

Related:

- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_STAGING_MIGRATION_RUNBOOK_v1.md`
- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_EXECUTION_REVIEW_v1.md`
- `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`（**quarantine exclusion**）
- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1.md`（§0.1）

Owner: M55 / Reflect Note by M55

---

## 1. このパケットの位置づけ

- **`supabase/migrations` に置かない**。本番 DDL 自動適用ではない。
- **リポジトリの DB への適用はしない**（CI / 開発者環境での手動適用のみを想定）。
- **コード変更を伴わない**：`walletGrants`、`RPC`、`/api/reply/generate`、`ConsultRoom` 等は本パケットでは触らない（下記§9）。

### 1.1 Quarantine exclusion（Orphan 3 件）

**正本:** `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`

- **`DTR_CORE_STATIC_V1` の `dtr_report_snapshots` が無い wallet** に対して、**自動 backfill で `report_instance_id` を埋めない**（推測禁止）。Phase B の `UPDATE ... FROM dtr_report_snapshots` は **snapshot 行がある場合のみ** wallet を更新する。  
- Known orphan **3** 件は **migration 自動対象から除外**。識別は **条件式**（本 WHERE と同様の `NOT EXISTS`）またはチケット上の **`hashed_user_id` のみ**（`m55_wallet_diag_v1` ソルト）。  
- **`NOT NULL` / FK / strict UNIQUE の完成（Phase F/G）は** 当該 quarantine が解消するまで **NO-GO**。Phase **F/G は引き続き NO-GO**（本番・staging いずれもゲート SSOT 優先）。  
- **Phase A（nullable 列のみ）**は **設計・オーナー合意下で再開候補**。**Backfill（B〜D）は別ゲート。**

---

## 2. 実行順

順番は ** Phase 数字どおり**。必ず **`m55_reply_wallet_report_instance_scope_staging_packet.sql` 内のブロック順**に従う。

| 順序 | Phase | 概要 |
|:----:|--------|------|
| 1 | **0_READ_ONLY_PREFLIGHT** | SELECT のみ。**DDL より先**に必ず完走・記録。 |
| 2 | **STOP ゲート** | 下記§5の停止条件を満たさなければ **ここで終了**。 |
| 3 | **A_nullable_columns** | 列追加（SQL ではコメントアウト — 手で解除して実行）。 |
| 4 | **B_backfill_wallets** | wallet の `report_instance_id` / `migration_status`。 |
| 5 | **C_backfill_ledgers** | ledger 伝播 + 不一致検出。 |
| 6 | **D_backfill_sessions** | sessions の backfill。 |
| 7 | **E_validation** | NULL・重複・ledger 不一致・document/session `user_id` 整合。 |
| 8 | **F_unique_constraint_trial** | **staging のみ**。`UNIQUE(user_id)` DROP は本番では禁止（§7）。 |
| 9 | **G_not_null_fk_trial** | **staging のみ**。RPC/アプリ追従前の本番は禁止（§7）。 |
| 10 | **H_rollback** | 復旧案の参照のみ。運用で実行するかは DBA/オーナー判断。 |

---

## 3. 実行者チェックリスト（実行開始前）

- [ ] Supabase の **project ref が staging/dev** と一致している（本番と一致しない）。
- [ ] 接続先で `SELECT current_database();` が想定どおりである。
- [ ] **バックアップ取得**または **PITR / リストア手順が確認済み**である。
- [ ] **`git_commit_hash`** とブランチ名をチケットに記載した。
- [ ] **`M55_REPLY_WALLET_REPORT_INSTANCE_STAGING_MIGRATION_RUNBOOK_v1`** を開いている。
- [ ] **`M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_EXECUTION_REVIEW_v1`** の「DB だけ先行 NG」を理解している。
- [ ] SQL ファイルの **HEADER コメント**に、`target_database_name` / `executed_at_utc` / `confirmed_not_production: YES` 等を **チケットに記入した**（ファイル内に秘密鍵は書かない）。

---

## 4. 各 Phase の開始条件

| Phase | 開始条件 |
|--------|----------|
| **0** | 接続先確認済み。バックアップ方針の合意。 |
| **A** | Phase 0 完了。**複数 snapshot 行が 0 件**。Ledger/document の FK 起因 orphan が空（または説明済み）。**「snapshot が無い wallet」の件数**は SSOT と突合（**既知 3** 件 quarantine の場合は **件数のみ**記録し **Phase B 以降では自動埋めしない**方針を確認済みであること。**生 `user_id` をチケットに貼らない**。） |
| **B** | Phase A 適用済み（列が存在する）。 |
| **C** | Phase B 適用済み。 |
| **D** | Phase C 適用済み（または運用上 C をスキップしない方針で合意）。 |
| **E** | Phase D 適用済み（または運用による）。 |
| **F** | Phase E の成功条件を満たす。**制約名は Phase 0 で取得した実名**に置換済み。**staging/dev のみ**。 |
| **G** | Phase F の結果が期待どおり。**本番では RPC/アプリ追従まで禁止**（§7）。 |
| **H** | ロールバック演習の計画が立っている。 |

---

## 5. 各 Phase の停止条件（STOP）

次のいずれかで **次 Phase に進まない**（データ修正、クリーンな staging DB への切替、またはリストア）。

| 条件 |
|------|
| **Phase B を「snapshot が無い wallet にまで誤って backfill を当てようとしている」場合** — **STOP**。**Known orphan は SSOT（3 件）で quarantine**。件数のみ突合し、**自動で `report_instance_id` を捏造しない**。 |
| **`(user_id, product_id)` またはエントリー製品限定で snapshot が複数行**の user がいる。 |
| **Phase 0 の `unique_constraint_name` が手元メモの想定と一致しない**（`reply_ticket_wallets_user_id_key` 等は慣例に過ぎない）。手動で突合してから Phase F。 |
| **本番 DB だと思われる接続**（project ref / ホスト / 運用ラベルが本番）。 |
| **バックアップまたは PITR の復旧経路が未確認**。 |
| Phase E で **重複 `(user_id, report_instance_id)`**、`ledger` と `wallet` の `report_instance_id` 不一致、**document と session の `user_id` 不一致**が説明不能。 |

**補足:** `reply_sessions_users_without_entry_snapshot` は **snapshot が無いユーザーのセッション件数**で、staging では 0 でないことがある。運用ポリシーで **許容するか、Phase D で NULL を残すことと矛盾しないか**だけ確認する。**wallet 側 orphan が 0 であること**とは別クエリである。

---

## 6. 各 Phase の成功条件（概要）

| Phase | 成功条件 |
|--------|----------|
| **0** | 件数・制約名が記録された。STOP に該当しない。 |
| **A** | 列追加がエラーなく完了（IF NOT EXISTS 使用）。 |
| **B** | `report_instance_id` が付いた件数・NULL 残りが運用許容または `migration_status='manual_review'` と整合。**Wallet orphan は事前 0**。 |
| **C** | 親 wallet と ledger の不一致クエリが **0 行**。 |
| **D** | `sessions_null_report_instance` が方針どおり説明可能。 |
| **E** | 重複 0、`wallet_null_not_manual_review` が許容、`ledger`/`session` の方針が文書化。 |
| **F**（試行のみ） | 新複合 UNIQUE が存在し、アプリ無し環境でのみ検証済み。**quarantine が NULL 例外を残す限り本フェーズは原則 NO-GO**（§1.1）。 |
| **G**（試行のみ） | NOT NULL が方針どおり。**本番では別 GO**。**quarantine 未解決なら NO-GO**。 |

---

## 7. 本番適用禁止理由（本パケットを本番に流さない）

1. **`EXECUTION_REVIEW`**：DB だけ先行適用は原則 **NO**。`UNIQUE` 入替・`NOT NULL` は **RPC（`m55_reply_generate_commit` の `FOR UPDATE` 前提）** と **walletGrants（user_id 単位）** と整合が必要。
2. **Phase F**：`UNIQUE(user_id)` を DROP すると **単一行前提の RPC** が破綻しうる。
3. **Phase G**：`NOT NULL` / FK は **INSERT 失敗**や **Fulfillment 経路**に影響しうる。
4. 本パケットは **`scripts/sql/staging/`** にあり、**レビュー・検証用**である。

---

## 8. 本番適用へ進むために残っているアプリ / RPC 変更（参照）

本パケットの実行では実装しない。GO 前に **設計・実装・デプロイ計画**が必要な例：

- **`m55_reply_generate_commit`**：`report_instance_id`（または複合キー）での wallet ロック。
- **`walletGrants`**：`report_instance_id` を引数・WHERE に含める。
- **`POST /api/reply/generate`**：上記と整合する入力と RPC 呼び出し。
- **`readReplyWalletProbe` / room API**：スコープ移行後の SELECT 切替（別 PR のスケジュール）。

**ConsultRoom**、**Stripe**、**Webhook** は **本 GO 条件では切り替えない・触らない**方針（ユーザー指示と `EXECUTION_REVIEW` に整合）。

---

## 9. 厳守（本ドキュメント・パケット利用時）

- **本番 DB で実行しない**。
- **`supabase/migrations` に本番用として置かない**。
- **既存 migration を編集しない**。
- **walletGrants / RPC / `/api/reply/generate` / ConsultRoom / MAX_CREDITS / Stripe Checkout 新規 / Webhook / 商品棚 UI / Home / Ⅰ〜Ⅳ章本文 / プレミアム深読み本文を変更しない**（本タスク範囲）。
- **秘密鍵・Webhook secret を出力・貼り付けしない**。

---

## 10. staging / dev 実行後に記録すべき証跡

以下を **チケットまたは社内 SSOT 追記**に残す。

| 項目 | 内容 |
|------|------|
| **環境** | project ref、DB 名、実行日時（UTC）、実行者。 |
| **コミット** | リポジトリの commit hash（パケットを含むブランチ）。 |
| **Phase 0 出力** | 各件数、`unique_constraint_name` の実名。 |
| **STOP の有無** | 該当しなければ「該当なし」と明記。 |
| **適用した Phase** | A〜G のどこまで（未実施は「未実施」）。 |
| **Phase B〜D** | 更新件数スナップショット、NULL 残存件数。 |
| **Phase E** | 重複有無、不一致クエリの行数 0 の証明。 |
| **Phase F/G** | 試行したか、制約名、エラー有無、ロールバック有無。 |
| **ロールバック** | 実施した場合は手段（列 DROP / 制約復元 / PITR）。 |

---

## 11. rollback ブロック（SQL パケット側の要約）

| 範囲 | パケット内の位置 |
|------|------------------|
| **Phase F 失敗時** | 新 `UNIQUE` を `DROP` し、Phase 0 で記録した名前で **`UNIQUE(user_id)` を再 ADD**（重複 `user_id` が無いことが前提）。 |
| **列のみ追加まで** | Phase H コメント：`migration_status` / `report_instance_id` 等の **DROP COLUMN** 案。 |
| **破綻** | **PITR またはプロジェクトスナップショットからの DB 復元**。 |

全文は `m55_reply_wallet_report_instance_scope_staging_packet.sql` の **PHASE F / PHASE H** を参照。

---

## 12. read-only preflight（Phase 0）の内容要約

- 件数：`reply_ticket_wallets`、`reply_wallet_ledgers`、`reply_sessions`、`dtr_report_snapshots`（全件・`DTR_CORE_STATIC_V1` 限定）。
- **UNIQUE 制約の実名**（`reply_ticket_wallets`）。
- **Wallet あり・Entry snapshot 無し**の `user_id` 列挙。
- **Snapshot 重複**（`(user_id, product_id)` およびエントリー限定）。
- **Ledger orphan**（wallet 欠損）、**document orphan**（session 欠損）。
- **Entry snapshot を持たないユーザーの session 件数**（参考）。

---

## 13. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | PR1.9b staging/dev 実行パケット SSOT として初版 |
| v1.1 | 2026-04-29: quarantine exclusion、Phase A と backfill の分離、Phase F/G NO-GO、STOP 文言の調整（§1.1）。 |
