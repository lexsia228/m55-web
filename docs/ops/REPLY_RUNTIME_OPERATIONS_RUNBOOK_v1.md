# REPLY Runtime Operations Runbook v1

## 目的
- 返書機構の運用・障害対応・問い合わせ切り分けを標準化し、担当者間で同じ順序で判断できる状態を維持する。
- 固定基点は以下とする。  
  - commit: `4f04553`  
  - tag: `snapshot-reply-release-gate-green-2026-04-17`

## 日常確認項目
- 直近 webhook の受信遅延有無（監視ログ/APIログ）。
- `reply_ticket_wallets` の `available_count` と `status` の整合。
- `reply_wallet_ledgers` の grant/consume 記録が時系列で連続しているか。
- `reply_documents` の生成件数が急減していないか。
- 403/404 の急増がないか（`/reply`, `/reply/result`, `/api/reply/history`）。

## まず先に見る対象（優先順）
- ログ: middleware 判定ログ、reply APIログ、webhook 受信ログ。
- テーブル: `reply_ticket_wallets` -> `reply_wallet_ledgers` -> `reply_documents` -> `reply_sessions`。
- API: `/api/reply/history`, `/api/reply/session/*`, `/reply`, `/reply/result`。

## 障害時の確認順
1. 対象 `user_id` を特定し、wallet 状態を確認する。
2. ledger で grant/consume の差分と最終残高を確認する。
3. document/session の生成有無を確認する。
4. middleware による拒否（403）または不正ID（404）を確認する。
5. webhook 不達/遅延が疑わしい場合、受信時刻と再送有無を確認する。

## 問い合わせ時の切り分け順（最低ケース）

### 購入したのに使えない
- `reply_ticket_wallets.available_count` が 0 か確認。
- ledger に purchase 由来 grant があるか確認。
- webhook 受信遅延または失敗の有無をログで確認。

### `/reply` で 403
- production で bypass 前提になっていないか確認。
- 認証ユーザーIDと対象セッション/URLの整合を確認。
- non-prod の場合は `x-m55-test-user-id` ヘッダ有無を確認。

### `/reply/result` で 404
- `reply_documents` に対象 `reply_session_id` の結果があるか確認。
- セッションIDの取り違え・期限切れ・他ユーザー参照を確認。

### history が空
- `reply_documents` の該当 `user_id` レコード有無を確認。
- consume 実行済みだが document 未生成なら生成フロー障害を疑う。

### replay / 二重消費疑い
- ledger を時系列で確認し、consume が重複していないか確認。
- `reply_sessions` と `reply_documents` の対応関係を確認。

### webhook 不達 / 遅延
- webhook ログの受信時刻と処理時刻を確認。
- 未受信なら再送・手動補填の可否を運用手順に沿って判断。

## DB確認SQL（コピペ用）

```sql
select
  user_id,
  initial_included_count,
  purchased_count,
  consumed_count,
  available_count,
  status
from public.reply_ticket_wallets
where user_id = '<USER_ID>';
```

```sql
select
  user_id,
  event_type,
  source_of_grant,
  delta,
  balance_after,
  created_at
from public.reply_wallet_ledgers
where user_id = '<USER_ID>'
order by created_at desc;
```

```sql
select
  id,
  reply_session_id,
  user_id,
  theme,
  version,
  created_at
from public.reply_documents
where user_id = '<USER_ID>'
order by created_at desc;
```

## よくある失敗パターン
- `user_id` 取り違えで誤調査（まず本人ID確定）。
- ledger を見ずに wallet だけ見て誤判定。
- production で bypass 条件を前提にして誤切り分け。
- 404 を「データなし」と断定し、セッション不整合を見落とす。
- webhook 遅延中に重複操作し、二次障害を誘発する。
