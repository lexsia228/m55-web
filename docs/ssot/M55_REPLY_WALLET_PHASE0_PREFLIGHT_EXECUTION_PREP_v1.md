# M55_REPLY_WALLET_PHASE0_PREFLIGHT_EXECUTION_PREP_v1（PR1.9c）

Status: **READ-ONLY Preflight readiness** — **Phase A〜H は未実施**。  

Date: 2026-04-28  

Related:

- `scripts/sql/staging/m55_reply_wallet_report_instance_scope_staging_packet.sql`
- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_STAGING_EXECUTION_PACKET_v1.md`
- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_EXECUTION_REVIEW_v1.md`

---

## A. Phase 0 が SELECT のみである根拠

対象ファイルの **行 41〜114** を機械的に確認した結果、**アクティブな（`--` で始まっていない）SQL は `SELECT` 文のみ**である。

| 区分 | 行（目安） | 内容 |
|------|-------------|------|
| `SELECT` のみブロック | 46〜113 | `current_database()`、各種 `COUNT(*)`、`JOIN`/`GROUP BY`/`HAVING` を伴う読み取り、`pg_constraint` 参照 |

- **ALTER / UPDATE / INSERT / DELETE / DROP / CREATE / TRUNCATE / SET** は **Phase 0 ブロック内に無い**。  
- **行 127 以降**は Phase A ラベルから始まり、**DDL/DML はすべて行頭 `--` によるコメント**で無効化されている（次節）。

---

## B. Phase A〜H が実行されない根拠

1. **Phase A（行 131 付近）以降**の `ALTER` / `UPDATE` 等は、**行全体が `--` でコメントアウト**されている。既定のまま **Postgres に送るとパーサが無視**し、実行されない。  
2. **Phase E** 内の `SELECT` も **コメント内**のため、**アンコメントしない限り実行されない**（現行ポリシー: **アンコメント禁止**）。  
3. **Phase F / G / H** の DDL および rollback 例はすべて **`--`** かコメント説明のみ。  
4. **推奨**: SQL エディタで **行 46〜113（Phase 0 の `SELECT` のみ）をコピーして実行**する。ファイル全体を実行しても Phase 0 の `SELECT` のみが有効だが、**将来のファイル編集による誤実行を防ぐため、ブロック単位の実行を推奨**する。

---

## C. staging / dev であることを確認する手順（実行前チェックのみ）

以下を **すべて満たしてから** Phase 0 を実行する。**本番プロジェクトでは実行しない**。

| # | 手順 |
|---|------|
| 1 | **Supabase Dashboard** で接続先プロジェクトを開き、**Project ref** を控える（チームの「staging/dev 一覧」と照合）。 |
| 2 | **本番用**の ref / URL / 表示名と **一致しない**ことを口頭またはチケットで二重確認する。 |
| 3 | **SQL Editor** または **psql** の接続先が上記プロジェクトであることを確認する。 |
| 4 | （任意）社内規程に従い、**staging/dev の許可リスト**に ref が載っていることを確認する。 |
| 5 | Phase 0 実行後、`current_database()` の結果を記録し、想定 DB 名と一致するか確認する。 |

**否定条件（即中止）**: 接続先が不明、本番と思われる、または project ref が本番と一致する可能性がある。

---

## D. `current_database()` / project ref / branch / commit / 実行日時の記録方法

チケット（Linear / Jira / Notion 等）に **次の表をコピーして埋める**。**秘密鍵・service_role・Webhook secret は記載しない**。

| フィールド | 記入例 | 備考 |
|------------|--------|------|
| `executed_at_utc` | `2026-04-28T12:00:00Z` | 実行開始時刻（UTC 推奨） |
| `supabase_project_ref` | `abcdefghijklmnop` | Dashboard の ref（**本番と一致しないこと**） |
| `connection_method` | `Supabase SQL Editor` / `psql` 等 | — |
| `phase0_current_database` | （Phase 0 の `SELECT current_database()` 結果） | 実行**後**に追記 |
| `git_branch` | `main` / `feature/...` | パケットを参照したブランチ |
| `git_commit_hash` | 40 文字の SHA または短縮 SHA | `git rev-parse HEAD` |
| `packet_path` | `scripts/sql/staging/m55_reply_wallet_report_instance_scope_staging_packet.sql` | 監査用 |
| `confirmed_not_production` | `YES` | 合意者名を任意で追記可 |
| `read_only_scope` | `Phase 0 only` | Phase A 以降は **未実行** |

---

## E. Phase 0 実行結果を貼るべきフォーマット

チケットにそのまま貼り付けられる **結果テンプレート**（数値・行数は例）。

```text
=== M55 Phase 0 READ-ONLY PREFLIGHT ===
executed_at_utc: <UTC>
project_ref: <staging ref>
commit: <hash>
database (current_database): <name>

-- Counts
reply_ticket_wallets_count: <n>
reply_wallet_ledgers_count: <n>
reply_sessions_count: <n>
dtr_report_snapshots_all: <n>
dtr_report_snapshots_entry_report (DTR_CORE_STATIC_V1): <n>
reply_sessions_users_without_entry_snapshot: <n>

-- UNIQUE on reply_ticket_wallets (paste rows)
unique_constraint_name | constraint_def
<paste>

-- STOP checks (must be empty or explain)
wallet_user_without_snapshot rows: <0 or list user_id>
duplicate (user_id, product_id) groups: <0 or rows>
duplicate DTR_CORE_STATIC_V1 per user: <0 or rows>
orphan_ledger_id rows: <0 or rows>
orphan_document_id rows: <0 or rows>

=== GO/STOP: <GO or STOP — see section F> ===
```

**個人情報**: `user_id` を貼る場合は **必要最小限**とし、社内ポリシーに従う。

---

## F. Phase 0 実行後の GO / STOP 判定基準

### F.1 STOP（Phase A 以降に進まない・本フェーズのみで中断）

次のいずれか。**DDL/DML は実行しない**（現行ゲート）。

| 条件 |
|------|
| **staging/dev でない**と判断した |
| **`wallet_user_without_snapshot` が 1 行でも返る**（パケット STOP: 自動 backfill の前提が無いユーザーがいる） |
| **`duplicate (user_id, product_id)` またはエントリー製品のみの duplicate user クエリが 1 行でも返る** |
| **`orphan_ledger_id`** または **`orphan_document_id`** が 1 行でも返り、FK 異常として未説明 |

### F.2 GO（Phase 0 の記録・監査として完了 — いまのところ Phase A は NO-GO）

次を **すべて**満たす。

| 条件 |
|------|
| 接続先が **staging/dev** と確認できた |
| **`wallet_user_without_snapshot` が 0 行** |
| **snapshot 重複の 2 クエリがいずれも 0 行** |
| **`orphan_ledger_id` / `orphan_document_id` が 0 行**（または FK 破損でないと説明済み） |
| Phase 0 の結果を **§E 形式でチケットに保存**した |

**補足**: `reply_sessions_users_without_entry_snapshot` は **0 でなくても GO の妨げにしない**（staging で Entry Report を持たないユーザーのセッションがありうる）。**Phase A 以降は別ゲート**で禁止のまま。

### F.3 Phase 0 実行「許可」と Phase A の関係

- **PR1.9c で許可するのは Phase 0 の read-only のみ**。  
- **Phase A〜H は NO-GO**（アンコメントしない・実行しない）。  
- **GO（Phase 0）**は **「preflight 記録の完了」**であり、**マイグレーション GO ではない**。

---

## G. 厳守（本ドキュメントの利用範囲）

- 本番 DB で Phase 0 を含む当該パケットを **本番向けに悪用しない**（本番では **実行しない**）。  
- **Phase A 以降を実行しない**。**ALTER / UPDATE / DROP / CREATE UNIQUE / NOT NULL / FK を実行しない**。  
- **`supabase/migrations` に本番 migration を置かない**（本タスク範囲）。  
- **walletGrants / RPC / `/api/reply/generate` / ConsultRoom / MAX_CREDITS / Stripe / Webhook / 商品棚 UI / Home / 本文**は **変更しない**。  
- **秘密鍵・Webhook secret をログやチケットに貼らない**。

---

## H. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | PR1.9c Phase 0 実行準備 SSOT |
