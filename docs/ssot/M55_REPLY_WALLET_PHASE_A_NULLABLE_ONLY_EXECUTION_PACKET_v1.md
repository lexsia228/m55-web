# M55_REPLY_WALLET_PHASE_A_NULLABLE_ONLY_EXECUTION_PACKET_v1

Status: **Staging / dev execution packet** — **not** a production migration.  

Date: 2026-04-29  

Companion SQL:

- `scripts/sql/staging/m55_reply_wallet_phase_a_nullable_only_staging.sql`

Related:

- `docs/ssot/M55_REPLY_WALLET_PHASE_A_NULLABLE_COLUMNS_REVIEW_v1.md`
- `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`（quarantine）
- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1.md`（§0.1）

---

## 1. 目的

**Phase A のみ:** `report_instance_id` **nullable `uuid` 列**を **3 テーブル**に追加する。**backfill・NOT NULL・FK・UNIQUE 変更は行わない。**  

**本番 DB では実行しない。** `supabase/migrations` に本番用として置かない。

---

## 2. 実行前チェック

- [ ] **Project ref / プロジェクト名**が **staging または dev** と一致（本番と一致しない）。  
- [ ] `SELECT current_database();` で想定 DB 名。  
- [ ] **バックアップ**または **PITR 復旧手順**がチーム合意済み。  
- [ ] **git branch / commit hash** をチケットに記録。  
- [ ] **`ORPHAN_THREE_CASE_CLASSIFICATION_v1`** を読み、**自動 backfill 対象外の 3 件**を理解済み。  
- [ ] **`M55_REPLY_WALLET_PHASE_A_NULLABLE_COLUMNS_REVIEW_v1`** を読了。  
- [ ] SQL ファイル先頭の **コメント欄**（database / project ref / backup / 承認者）を **チケットに転記**（秘密鍵は書かない）。

---

## 3. 実行手順

1. 対象ブランチで `m55_reply_wallet_phase_a_nullable_only_staging.sql` を開く。  
2. **PART 1 PREFLIGHT** の **SELECT のみ**を順に実行し、結果をチケットに記録。  
   - 3 テーブル存在、件数ベースライン、**`wallet_user_without_entry_snapshot_count`**（SSOT では **3**）、`user_id` **UNIQUE** 定義。  
3. **PART 2 APPLY** は **デフォルトでコメントアウト**されている。**オーナー/DBA 承認後**に **該当 `ALTER` ブロックのみ**コメント解除し、**`BEGIN`/`COMMIT` はチーム方針に従う**（単一トランザクション推奨）。  
4. **PART 3 POSTFLIGHT** を実行し、成功条件（§5）を満たすか確認。  
5. 問題があれば §7 の rollback を **別承認のうえ**検討。

**含めないもの:** `migration_status` 列は **本パケットに含めない**（必要なら別チケットで nullable `text` のみ検討。CHECK は同一変更に混ぜないのが安全）。

---

## 4. 停止条件（実行しない／ロールバック検討）

次のいずれかに当てはまる場合は **APPLY を実行しない**、または **POSTFLIGHT 失敗としてロールバック検討**する。

| 条件 | 対応 |
|------|------|
| **本番 DB** だと思われる接続 | 中止 |
| **バックアップ / 復旧経路が未確認** | 中止 |
| PREFLIGHT で **3 テーブルのいずれかが存在しない** | 中止（スキーマ調査） |
| **`wallet_user_without_entry_snapshot_count` が SSOT と大きく食い違う**（例: 想定 3 以外で説明なし） | 中止・原因調査 |
| POSTFLIGHT で **行数が PREFLIGHT と一致しない** | 重大 — 想定外 DML が走っていないか確認 |
| POSTFLIGHT で **`report_instance_id` の非 NULL が 1 件でもある** | Phase A 範囲外 — 調査（backfill していないか） |
| **UNIQUE 定義が意図せず変化** | 中止（本パケットは UNIQUE を触らないはず） |

---

## 5. 成功条件

- **PART 3.1:** 3 テーブルすべてに **`report_instance_id`** が存在し、**`is_nullable = YES`**。  
- **PART 3.2:** **PART 1.3 と同一**の行数（各テーブル）。  
- **PART 3.3:** 3 テーブルとも **`report_instance_id IS NOT NULL` の行数 = 0**。  
- **PART 3.4:** **`wallet_user_without_entry_snapshot_count`** が **PREFLIGHT と同じ**。**`orphan_wallets_with_nonnull_report_instance_id = 0`**。  
- **PART 3.5:** **PART 1.5 と同一**の `user_id` UNIQUE（定義文字列が意図どおり）。

---

## 6. Rollback 方針

- SQL ファイル **PART 4** に **`DROP COLUMN IF EXISTS report_instance_id`** 案を **コメントのまま**記載。  
- **実行は別承認。** staging にのみ適用。  
- 破損が大きい場合は **PITR / プロジェクトスナップショット**（Runbook と同様）。

---

## 7. 本番適用禁止

- **本パケットは staging/dev 専用。**  
- **本番 `supabase/migrations` に同一 DDL をコミットする**ことは **`EXECUTION_REVIEW` / ADR の総合 GO なしでは行わない**。

---

## 8. Phase B 以降 NO-GO

- **backfill、NOT NULL、FK、Phase F/G の UNIQUE 入替**は **本パケットに含めない**。  
- **orphan 3 件**は **quarantine** — **自動で `report_instance_id` を埋めない**（`MIGRATION_PLAN` §0.1）。

---

## 9. 実行後の smoke test（推奨・staging）

アプリ/RPC は **変更しない**前提で、**staging** で次を **可能な範囲**で実施。

- **返書経路:** テストユーザーで **wallet consume が成功する**こと（RPC `m55_reply_generate_commit`）。  
- **回帰:** `reply_ticket_wallets` の **読み書き経路がエラーにならない**こと。  
- **（任意）** Supabase Dashboard または **`select('*')`** 利用箇所で **新列が null で返る**ことを確認。

---

## 10. 改廃

| Ver | Date | Summary |
|-----|------|---------|
| v1 | 2026-04-29 | Phase A nullable-only 実行パケット初版 |
