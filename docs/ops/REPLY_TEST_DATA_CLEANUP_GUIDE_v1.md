# REPLY Test Data Cleanup Guide v1

## 目的
- `smoke_user_reply_*` 系テストデータの扱いを固定し、監査証跡を損なわずに必要時のみ安全に cleanup する。
- 固定基点: commit `4f04553`, tag `snapshot-reply-release-gate-green-2026-04-17`

## 現在方針（固定）
- `smoke_user_reply_*` 証跡データは、現時点では監査証跡として保持中。
- 定常運用では削除しない。容量・検証要件・監査要件が揃った時のみ cleanup 実施。

## cleanup 前に残すべき証跡
- 対象 `user_id` と実施理由（問い合わせ番号/障害番号）。
- 実施者、実施日時、対象環境。
- cleanup 前の件数スナップショット（各対象テーブル件数）。
- 代表レコードのエクスポート（最低: wallet ledger の最新履歴、document の最新履歴）。

## 対象テーブル
- `reply_wallet_ledgers`
- `reply_documents`
- `reply_sessions`
- `reply_ticket_wallets`

## cleanup 実施順（必須）
1. `reply_wallet_ledgers`
2. `reply_documents`
3. `reply_sessions`
4. `reply_ticket_wallets`

## user_id 単位 cleanup SQL 例（`<USER_ID>` を置換）

```sql
-- 1) reply_wallet_ledgers
delete from public.reply_wallet_ledgers
where user_id = '<USER_ID>';
```

```sql
-- 2) reply_documents
delete from public.reply_documents
where user_id = '<USER_ID>';
```

```sql
-- 3) reply_sessions
delete from public.reply_sessions
where user_id = '<USER_ID>';
```

```sql
-- 4) reply_ticket_wallets
delete from public.reply_ticket_wallets
where user_id = '<USER_ID>';
```

## 実施後確認（最小）
- 各テーブルで `user_id = '<USER_ID>'` の残件数が 0 であることを確認。
- 誤削除防止のため、実施ログに SQL 実行時刻と対象件数を記録。
