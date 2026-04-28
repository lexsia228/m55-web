# M55_REPLY_WALLET_PHASE0_PRE_EXECUTION_CHECKLIST_v1（PR1.9e）

Status: **直前ゲート** — 本ドキュメントは **SQL を実行しない**。  

Date: 2026-04-28  

Related:

- `scripts/sql/staging/m55_reply_wallet_report_instance_phase0_only.sql`（**貼り付け対象はこのファイル全文のみ**）
- `docs/ssot/M55_REPLY_WALLET_PHASE0_PREFLIGHT_EXECUTION_PREP_v1.md`
- `docs/ssot/M55_REPLY_WALLET_STAGING_RUNBOOK_HARDENING_REVIEW_v1.md`

---

## 1. `phase0_only.sql` の再確認結果（リポジトリ上）

| 確認項目 | 結果 |
|----------|------|
| **実行可能文は `SELECT` のみ** | **Yes**。先頭が `SELECT` のブロックが **27 本**（`SELECT COUNT` 等を含む）。 |
| **`ALTER` / `UPDATE` / `INSERT` / `DELETE` / `DROP` / `CREATE` / `TRUNCATE` / `SET` / `COPY` 等の非コメント行** | **なし**（キーワード行頭 grep で該当なし）。 |
| **CTE 以外の DDL/DML** | **なし**（ファイル内に `WITH` も未使用）。 |
| **Phase A〜H** | **含まない**。 |

※ サブクエリ内の `SELECT 1` は **`SELECT` 文の一部**であり読み取りのみ。

---

## 2. 実行者が Supabase Dashboard で確認すべき項目（最終リスト）

**`.env` や CLI の接続文字列だけに依拠しない**。**Dashboard の表示を正**とする。

| # | 項目 | 実行者が記入・確認 |
|---|------|---------------------|
| 1 | **Project ref** | Settings → General 等で表示される ref（**チームの staging/dev 一覧と照合**） |
| 2 | **Project name** | 画面上部のプロジェクト表示名 |
| 3 | **URL host** | `https://<ref>.supabase.co` の `<ref>` と host |
| 4 | **staging/dev である証拠** | 社内の **許可リスト**、命名規則、または **非本番専用の証跡**（運用に従う。**推測のみでは不可**） |
| 5 | **本番 project ref と異なること** | チームが管理する **本番 ref** と **文字列一致しない**こと（**不明なら STOP**） |
| 6 | **branch** | 実行時点の Git ブランチ名（`git branch --show-current`） |
| 7 | **commit hash** | `git rev-parse HEAD` のフル SHA または短縮 |
| 8 | **実行日時（UTC 推奨）** | Phase 0 実行の実時刻 |

**二次確認（推奨）**:

- SQL Editor を開いた状態で、**ブラウザタブのプロジェクト名・ref**が Dashboard で控えたものと **目視で一致**すること。  
- **秘密鍵・service_role・Webhook secret をチケットに貼らない**。

---

## 3. SQL Editor での実行手順（貼るものの最終定義）

1. リポジトリで **`scripts/sql/staging/m55_reply_wallet_report_instance_phase0_only.sql` を開く**。  
2. **ファイルの全文**（1 行目のコメントからファイル末尾の `-- END OF PHASE 0 ONLY FILE` まで）を **選択してコピー**する。  
3. Supabase の **staging/dev プロジェクト**の **SQL Editor** を開く（§2 で確認済みのプロジェクト）。  
4. エディタを **空にしてから**、**コピーした全文だけ**を貼り付ける。  

**厳守**:

- **貼るのは `phase0_only.sql` の全文のみ**。**`m55_reply_wallet_report_instance_scope_staging_packet.sql` は貼らない**（誤って Phase A 以降をアンコメントするリスクを避けるため）。  
- Phase A〜H の断片、別チケットの SQL、**他環境からのクエリを混ぜない**。  
- **実行前**に、貼り付けテキストに **`ALTER`/`UPDATE`/`INSERT`/`DELETE`/`DROP`/`CREATE` が含まれていない**ことを目視で確認する（想定外なら **実行しない**）。  

---

## 4. 実行後にチケットへ貼る結果テンプレート

```text
=== M55 Phase 0 (phase0_only.sql) 実行結果 ===
executed_at_utc: <ISO8601 UTC>
executor: <id or name>
supabase_project_ref: <Dashboard より>
project_name: <Dashboard より>
project_url_host: <e.g. <ref>.supabase.co>
git_branch: <branch>
git_commit: <hash>
confirmed_not_production: YES (Dashboard で確認)

-- meta
phase0_current_database: <結果>

-- counts
reply_ticket_wallets_count: <n>
reply_wallet_ledgers_count: <n>
reply_sessions_count: <n>
dtr_report_snapshots_all: <n>
dtr_report_snapshots_entry_report: <n>
reply_sessions_users_without_entry_snapshot: <n>
succeeded_sessions_without_document: <n>

-- UNIQUE(reply_ticket_wallets)
<paste 行>

-- ハード STOP 系（行数 0 または説明必須）
wallet_user_without_snapshot: <0 または user_id 列挙>
dup_snapshots_user_product: <0 または rows>
dup_snapshots_entry_per_user: <0 または rows>
orphan_ledger_id: <0 または rows>
orphan_document_id: <0 または rows>

-- ハードニングその他（非ゼロでも説明でよい — PREP §F.4）
wallet_invariant_violations: <paste or 0 rows>
wallet_bad_status: <0 or list>
wallet_null_timestamps: <0 or list>
ledger_reply_consume_missing_session: <0 or list>
ledger_grant_weak_source: <0 or list>
wallet_vs_last_ledger_balance: <0 or list>
wallet_no_ledger_nonzero: <0 or list>
dtr_snapshot_invalid_nulls: <0 or list>
snapshot_user_no_wallet: <0 or list info>
entitlement_without_snapshot: <0 or list>
snapshot_without_core_origin_right: <0 or list>
fulfillment_without_snapshot_row: <0 or list>
doc_session_user_mismatch: <0 or list>

=== 判定: GO / STOP（§5） ===
```

---

## 5. GO / STOP 判定表

### 5.1 STOP（Phase A 以降へ進まない。結果記録のみ可）

| 条件 |
|------|
| 接続先が **staging/dev と断言できない**、または **本番 ref と同一・疑い** |
| **`wallet_user_without_snapshot`** が **1 行でも**返る |
| **`duplicate (user_id, product_id)`** の snapshot が **1 行でも**返る |
| **Entry Report（`DTR_CORE_STATIC_V1`）限定の duplicate user** が **1 行でも**返る |
| **`orphan_ledger_id`** または **`orphan_document_id`** が返り、**FK 破損として説明できない** |

### 5.2 GO（Phase 0 read-only の記録として完了）

| 条件 |
|------|
| §2 の Dashboard 確認が完了し、**本番ではない** |
| §5.1 の **STOP 条件をすべて満たさない**（上記ハード項目が **0 行または説明済み**） |

### 5.3 GO でも Phase A〜H は別承認まで実施しない

| ルール |
|--------|
| **Phase A〜H は NO-GO**（DDL/DML 禁止）。 |
| **ハードニング由来の非ゼロ行**は PREP **§F.4** に従い、**自動 STOP にしない**が **チケットに理由を記載**。 |

---

## 6. 実行してよいかの最終判定（本テンプレートの位置づけ）

- **実行者が §2 をすべて満たし、§3 に従い `phase0_only.sql` 全文のみを貼る**場合に限り、**staging/dev で Phase 0 を実行してよい**。  
- **本ドキュメント・エージェントは DB に接続せず SQL を実行しない**。適用可否は **実行者の Dashboard 確認**に依存する。

---

## 7. 改廃

| バージョン | 内容 |
|-----------|------|
| v1 | PR1.9e Phase 0 実行直前チェックリスト |
