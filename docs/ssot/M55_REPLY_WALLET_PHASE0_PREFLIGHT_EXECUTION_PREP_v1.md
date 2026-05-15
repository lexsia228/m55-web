# M55_REPLY_WALLET_PHASE0_PREFLIGHT_EXECUTION_PREP_v1（PR1.9c）

Status: **READ-ONLY Preflight readiness** — **Phase A〜H は未実施**。  

Date: 2026-04-28  

Related:

- `scripts/sql/staging/m55_reply_wallet_report_instance_phase0_only.sql`（**Phase 0 のみ**。貼り付け推奨）
- `scripts/sql/staging/m55_reply_wallet_report_instance_scope_staging_packet.sql`（Phase 0 に **同一の SELECT が含まれる**／Phase A〜H はコメント）
- `docs/ssot/M55_REPLY_WALLET_STAGING_RUNBOOK_HARDENING_REVIEW_v1.md`
- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_STAGING_EXECUTION_PACKET_v1.md`
- `docs/ssot/M55_REPLY_WALLET_REPORT_INSTANCE_MIGRATION_EXECUTION_REVIEW_v1.md`

---

## A. Phase 0 が SELECT のみである根拠

**推奨**: **`m55_reply_wallet_report_instance_phase0_only.sql` 全体を実行対象とする**。このファイルには **実行可能な文は `SELECT` のみ**であり、Phase A〜H ブロックを **含まない**。

別経路として **`m55_reply_wallet_report_instance_scope_staging_packet.sql`** の **PHASE 0 と PHASE 0 (hardening)** セクションのみをコピーしてもよい。同一内容は Packet と同期させる。**Phase A ブロックより下はコピーしない**こと。

| 判定 | 内容 |
|------|------|
| `phase0_only.sql` | ファイル末尾まで **`SELECT` のみ**（DDL/DML なし） |
| `staging_packet.sql` の Phase A 以降 | **行頭 `--`** により実行されず（§B）。Phase 0 だけをコピー実行する運用でも可 |

- **ALTER / UPDATE / INSERT / DELETE / DROP / CREATE / TRUNCATE / SET** は **phase0_only に無い**。Packet の Phase A〜H は **すべてコメント**。

---

## B. Phase A〜H が実行されない根拠

1. **`phase0_only.sql` を使う場合**：Phase A〜H を **ファイルが含まない**。  
2. **`staging_packet.sql` のみ使う場合**：Phase A 以降の `ALTER` / `UPDATE` は **行頭 `--`**。Phase E の検証用 `SELECT` も **コメント内**（アンコメント禁止）。Phase F / G / H も **`--`** または注記のみ。  
3. **推奨**：**`phase0_only.sql` を実行**するか、Packet から **Phase 0〜hardening まで**のみコピー。**Packet 全文実行**でも Phase A〜H は送信されないが、`phase0_only` の方が **貼り事故が少ない**。

---

## C. staging / dev であることを確認する手順（実行前チェックのみ）

以下を **すべて満たしてから** Phase 0 を実行する。**本番プロジェクトでは実行しない**。

| # | 手順 |
|---|------|
| 1 | **Supabase Dashboard** で **Project ref** / **Project name** / **URL host**（`<ref>.supabase.co`）を **画面から**記録。**`.env` をチケットに貼らない**（秘密混入防止）。 |
| 2 | チームの **本番 project ref** と **一致・不明・あいまいなら STOP**（SQL を実行しない）。 |
| 3 | **実行者 ID / 氏名** をチケットに残す。 |
| 4 | **SQL Editor の画面**でプロジェクト名が Dashboard と **目視で一致**することを確認（タブ取り違え防止）。 |
| 5 | **SQL Editor / psql** が上記プロジェクトに接続していることを確認。 |
| 6 | （任意）**staging/dev 許可リスト**に ref があるか。 |
| 7 | 実行後、`current_database()` と想定 DB 名を照合。 |

**否定条件（即中止）**: **本番 ref と同一・疑い**、Dashboard と Editor のプロジェクト不一致、接続先不明。**`.env` だけでは「本番でない」と証明しない**。

---

## D. `current_database()` / project ref / branch / commit / 実行日時の記録方法

チケット（Linear / Jira / Notion 等）に **次の表をコピーして埋める**。**秘密鍵・service_role・Webhook secret は記載しない**。

| フィールド | 記入例 | 備考 |
|------------|--------|------|
| `executed_at_utc` | `2026-04-28T12:00:00Z` | 実行開始時刻（UTC 推奨） |
| `executor` | `<name or id>` | — |
| `supabase_project_ref` | `<from Dashboard>` | **本番一覧と照合済み** |
| `supabase_project_name` | `<from Dashboard>` | — |
| `project_url_host` | `<ref>.supabase.co` | `.env` は記載禁止 |
| `connection_method` | `Supabase SQL Editor` / `psql` | — |
| `phase0_current_database` | （`SELECT current_database()`） | 実行後 |
| `git_branch` | `main` / `feature/...` | |
| `git_commit_hash` | SHA | `git rev-parse HEAD` |
| `sql_script_used` | `m55_reply_wallet_report_instance_phase0_only.sql` または Packet Phase 0 のみ | |
| `confirmed_not_production` | `YES` | Dashboard で確認した旨 |
| `read_only_scope` | `Phase 0 only` | Phase A 以降 **未実行** |

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

### F.4 ハードニング追加クエリについて（自動 STOP としない項目）

`HARDENING_REVIEW_v1` と SQL にある **snapshot だけあって wallet が無い**、**Rights と snapshot の片方欠け**、**Fulfillment と snapshot の突合ずれ**、`succeeded_sessions_without_document`、**最終 ledger と wallet の不一致**などは、**staging のテスト順序によっては非ゼロ**になりうる。**F.1 の STOP 条件には含めず**、**返却行がある場合は理由をチケットに記載**したうえで、**migration 本体のゲートとは別オーナー判定**とする。**`wallet_user_without_snapshot` と snapshot 重複のハード STOP は変更なし**。

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
| v1.1 | PR1.9c-hardening：環境欄強化、`phase0_only.sql`、ハード STOP と情報系の区分（F.4） |
