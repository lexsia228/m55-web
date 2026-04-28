# M55_REPLY_WALLET_REPORT_INSTANCE_STAGING_MIGRATION_RUNBOOK_v1

Status: **Staging / Dev only** — manual runbook. **Do not execute on production.** Do not add production migrations under `supabase/migrations/` from this document.  

Date: 2026-04-28  

Related:

- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_EXECUTION_REVIEW_v1.md`
- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1.md`
- `scripts/sql/draft/m55_reply_wallet_report_instance_scope_draft.sql`

Owner: M55 / Reflect Note by M55

---

## 1. 目的

- **user 単位 1 行の `reply_ticket_wallet` から、`report_instance_id`（`dtr_report_snapshots.id` を正）を軸としたスコープへの移行**について、**staging / dev のみ**で **DDL・backfill・制約変更・rollback の可否**を検証するための安全実行手順書である。
- **本番適用の代替ではない**。成功しても **`supabase/migrations` に本番 migration を置くゲートは別ドキュメント**（EXECUTION REVIEW の GO 条件）による。
- ドラフト SQL（`scripts/sql/draft/m55_reply_wallet_report_instance_scope_draft.sql`）は **コメントアウト縦並び**であり、本書では **Phase ごとの検証ゲート・停止条件**を明示する。

---

## 2. 前提条件

| 項目 | 内容 |
|------|------|
| **対象 DB** | **staging または dev の Postgres（Supabase）のみ**。本番プロジェクト・本番 URL・本番サービスロールは **対象外**。 |
| **本番ではないこと** | Supabase ダッシュボードの **Project ref / Project name / PostgreSQL host** を確認し、**本番用の値と一致しないこと**をチェックリストで記録する。 |
| **バックアップ** | 適用前に **logical dump、または Supabase のスナップショット / PITR ポリシー**で **リストア可能**な状態にしておく。**失敗時は DB 丸ごとリストア**が最後の手段になりうる。 |
| **秘密情報** | SQL 例・ログに **service_role キー・JWT 秘密・Webhook secret を貼らない**。本書にも **秘密鍵や Webhook secret を出力しない**。 |
| **環境取り違え防止** | 実行セッション開始時に **Project ref を口頭またはチケットに再記載**し、**接続先 `current_database()` と `inet_server_addr()`（許可される範囲）**で相互確認する（チーム手順に合わせる）。 |
| **ソース整合** | 実行日時点の **branch 名・commit SHA** を記録する。以下を **開いた状態で Phase 0 に入る**：<br>• `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_PLAN_v1.md`<br>• `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_EXECUTION_REVIEW_v1.md`<br>• `scripts/sql/draft/m55_reply_wallet_report_instance_scope_draft.sql`<br>ドラフトと矛盾する列名・`product_id` があれば **適用を止めて SSOT を更新してから再開**。 |

---

## 3. 実行前チェック SQL（読み取りのみ）

**すべて read-only**。結果をテーブルまたはチケットに記録する。

製品コードは **`DTR_CORE_STATIC_V1`**（アプリの `lib/oneTimeCheckout.ts` と一致させる）。

### 3.1 件数・制約

```sql
-- reply_ticket_wallets 件数
SELECT COUNT(*) AS wallet_count FROM public.reply_ticket_wallets;

-- user_id 上の UNIQUE 制約名（Phase F の DROP 前に実名を記録）
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'reply_ticket_wallets'
  AND con.contype IN ('u')
ORDER BY con.conname;
```

### 3.2 スナップショット件数

```sql
SELECT COUNT(*) AS snapshot_all FROM public.dtr_report_snapshots;

SELECT COUNT(*) AS snapshot_entry_report
FROM public.dtr_report_snapshots
WHERE product_id = 'DTR_CORE_STATIC_V1';
```

### 3.3 wallet はあるが snapshot が無いユーザー（orphan wallet 候補）

```sql
SELECT w.user_id
FROM public.reply_ticket_wallets w
LEFT JOIN public.dtr_report_snapshots s
  ON s.user_id = w.user_id
 AND s.product_id = 'DTR_CORE_STATIC_V1'
WHERE s.id IS NULL;
```

### 3.4 複数 snapshot 候補（`(user_id, product_id)` 単位で 2 件以上）

現行スキーマでは `UNIQUE(user_id, product_id)` により **通常は 0 件**。将来・データ不整合の検出用。

```sql
SELECT user_id, product_id, COUNT(*) AS cnt
FROM public.dtr_report_snapshots
GROUP BY 1, 2
HAVING COUNT(*) > 1;
```

エントリー製品に限定する場合：

```sql
SELECT user_id, COUNT(*) AS cnt
FROM public.dtr_report_snapshots
WHERE product_id = 'DTR_CORE_STATIC_V1'
GROUP BY user_id
HAVING COUNT(*) > 1;
```

### 3.5 ledgers / sessions 件数

```sql
SELECT COUNT(*) AS ledger_count FROM public.reply_wallet_ledgers;

SELECT COUNT(*) AS reply_sessions_count FROM public.reply_sessions;
```

### 3.6 orphan 検出（代表的）

| 観点 | SQL の考え方 |
|------|----------------|
| **ledger に wallet が無い** | `LEFT JOIN reply_ticket_wallets w ON w.id = l.wallet_id WHERE w.id IS NULL`（通常 FK で存在しないはずだが、検証用）。 |
| **wallet があるが snapshot が無い** | §3.3 と同じ。 |

Phase B 後まで待つ検証は Phase E で再度実行する。

### 3.7 Phase E 用検証クエリ（Phase B〜D 完了後、`UNIQUE` 入替・`NOT NULL` の前）

ドラフト `m55_reply_wallet_report_instance_scope_draft.sql` と同一意図。

```sql
-- wallet: NULL が manual_review 以外に残っていないこと（0 または承認済みのみ）
SELECT COUNT(*) AS wallets_null_not_reviewed
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NULL
  AND COALESCE(migration_status, '') <> 'manual_review';

-- wallet: (user_id, report_instance_id) の重複なし（NOT NULL 行のみ対象）
SELECT user_id, report_instance_id, COUNT(*) AS cnt
FROM public.reply_ticket_wallets
WHERE report_instance_id IS NOT NULL
GROUP BY 1, 2
HAVING COUNT(*) > 1;

-- （任意）ledger: wallet と instance の不整合スポットチェック
SELECT l.id, l.wallet_id, l.report_instance_id AS ledger_ri, w.report_instance_id AS wallet_ri
FROM public.reply_wallet_ledgers l
JOIN public.reply_ticket_wallets w ON w.id = l.wallet_id
WHERE l.report_instance_id IS DISTINCT FROM w.report_instance_id
  AND w.report_instance_id IS NOT NULL;
```

---

## 4. Phase 分割

| Phase | 内容 | DDL / DML |
|-------|------|-----------|
| **0** | **制約名・件数・backfill 可否のみ**（読み取り）。上記 §3 を実施。ドラフトの STEP 0 と同等。 | 読み取りのみ |
| **A** | **NULL 可能列のみ追加**（`reply_ticket_wallets.report_instance_id`, `migration_status`（任意）, `reply_wallet_ledgers.report_instance_id`, `reply_sessions.report_instance_id`）。 | `ALTER TABLE ... ADD COLUMN` |
| **B** | **wallet** に `dtr_report_snapshots.id` を backfill。snapshot が無い行は **`migration_status = 'manual_review'`**（ドラフト準拠）。勝手な UUID は発行しない。 | `UPDATE ... FROM` |
| **C** | **ledger** に wallet の `report_instance_id` を伝播 | `UPDATE ... FROM` wallet |
| **D** | **reply_sessions** に snapshot を結合して backfill | `UPDATE ... FROM` snapshots |
| **E** | **NULL / 重複 / orphan** の検証クエリ（ドラフト Phase E）。 | 読み取り为主 |
| **F** | **UNIQUE 制約の入替検証**（staging でのみ）：旧 `UNIQUE(user_id)` を DROP し **`UNIQUE(user_id, report_instance_id)` を ADD**。**制約名は Phase 0 の実名**。複数 `(user_id, NULL)` が残ると PostgreSQL は複数行を許すため **Phase E で前提クリア**。 | `ALTER TABLE` |
| **G** | **NOT NULL / FK の可否判定**（staging で試す場合のみ）。wallet に **`report_instance_id SET NOT NULL`**、FK は `NOT VALID` から等。**本番 GO は別ゲート**。 | `ALTER TABLE` |
| **H** | **rollback 演習**：許容される範囲で **DROP COLUMN / 制約復旧**を試すか、**バックアップからリストア**の手順をタイムボックス付きで実施。 | 運用依存 |

**参照 DDL の正本**：`scripts/sql/draft/m55_reply_wallet_report_instance_scope_draft.sql`（実行時は **1 Phase ずつコピー**し、**本番 migration ファイル化しない**）。

---

## 5. 各 Phase の停止条件

次のいずれかで **Phase を進めず**、原因調査・SSOT 更新・データ修正・または **staging DB のリストア**を検討する。

| 停止トリガー | Phase |
|---------------|--------|
| **snapshot が無い wallet が想定外件数で残る**（自動で UUID を捏造しない方針と矛盾） | **B 以降**は **manual_review の方針確定**まで停止 |
| **複数 snapshot 候補が 1 件でもある**（§3.4） | **B 前**は **どの行を正とするか手動方針**まで停止 |
| **`report_instance_id` が埋まらない ledger（C 後）または session（D 後）が、説明不能** | **E で合格せず** |
| **UNIQUE 移行前に `(user_id, report_instance_id)` の重複がある** | **F を実行しない** |
| **RPC / アプリが旧 user 単位のまま本番に向けて適用されようとしている** | **本 runbook の対象外**。staging のみで **コードは触らない**前提（§8）なら、**Phase F/G は「検証のみ・本番コード未接続の DB」に限定 |
| **rollback 手順が未確認**（チーム内で合意した復旧パスが無い） | **H を完了するまで本番 GO に進めない** |

---

## 6. rollback 方針

| 状態 | 方針 |
|------|------|
| **Phase A のみ適用** | **`ALTER TABLE ... DROP COLUMN`** で追加列を削除可能なら削除（依存オブジェクトに注意）。チームで **DDL を記録**。 |
| **Phase B 済（backfill 後）** | **列を DROP するだけでは監査上の意味が異なる**。必要なら **リストア**または **backfill 前のダンプから復元**。部分的に `UPDATE ... NULL` に戻すことは **運用上の再現性**が低い。 |
| **Phase F 済（UNIQUE 入替後）** | **旧 `UNIQUE(user_id)` を再作成**するには **重複行が無いこと**。複数 `(user_id, NULL)` があれば **復旧不能に近い**。事前に **バックアップ**。 |
| **Phase G（NOT NULL / FK）** | **NOT NULL を DROP**、`FK` を `DROP` は可能だが **順序とロック**に注意。**バリデーション済み FK** の解除は影響大。 |
| **途中で破綻** | **PITR またはプロジェクトのスナップショットから DB 復元**が最も確実な場合がある。**「いつまで戻せるか」**はプロバイダ設定に依存。 |

---

## 7. 本番適用へ進むための GO 条件（本 runbook 完了後に必要なもの）

次を **すべて満たす**こと（詳細は EXECUTION REVIEW に同梱の考え方）。

- staging で **Phase 0〜H のうち、計画した範囲が成功**（環境ごとに記録）。
- **件数・差分がゼロまたは説明可能**（wallet / snapshot / ledger / session）。
- **quarantine / manual_review がゼロ**、または **手動処理のオペ手順が文書化済み**。
- **RPC 新版の設計・実装計画が確定**（`m55_reply_generate_commit` のスコープ）。
- **walletGrants 新版の設計・実装計画が確定**。
- **`/api/reply/generate` 新版の設計・実装計画が確定**。
- **ConsultRoom は Phase 切替の対象にまだ含めない**（ユーザー指示どおり本番 GO 条件に明記）。
- **Stripe / Webhook は本ゲートでは触らない**（ユーザー指示）。

---

## 8. 禁止事項（本 runbook の実行にあたって）

実行担当者・レビュー担当者は以下を **行わない**。

- **本番 DB で本手順の DDL を実行しない**。
- **`supabase/migrations` に本番用 migration として配置しない**。
- **既存の `supabase/migrations/*.sql` を編集しない**。
- **walletGrants を変更しない**。
- **RPC を変更しない**。
- **`/api/reply/generate` を変更しない**。
- **ConsultRoom を変更しない**。
- **MAX_CREDITS を変更しない**。
- **Stripe Checkout を新規作成しない**。
- **Webhook を変更しない**。
- **商品棚 UI を出さない**。
- **Home を変更しない**。
- **Ⅰ〜Ⅳ章の本文を変更しない**。
- **プレミアム深読みの本文を変更しない**。
- **秘密鍵や Webhook secret をログ・チケット・チャットに出力しない**。

---

## 9. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | PR1.9a staging/dev 安全手順書として初版 |
