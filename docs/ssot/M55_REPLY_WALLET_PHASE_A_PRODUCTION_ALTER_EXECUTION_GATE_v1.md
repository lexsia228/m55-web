# M55_REPLY_WALLET_PHASE_A_PRODUCTION_ALTER_EXECUTION_GATE_v1

Status: **Pre-DDL gate — human-only** — **この文書は DB を変更しない。** **本条にロック済み `ALTER` の全文は載せない（実行パケットまたはチケット添付のみ）。**  

Date: **2026-05-01**

Related:

- `docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_PREFLIGHT_RESULT_v1.md`（本条の前提となる観測）
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_READINESS_REVIEW_v1.md`
- `scripts/sql/production/m55_reply_wallet_phase_a_nullable_production_preflight_postflight.sql`（実行後検証 SELECT）
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_NULLABLE_COLUMNS_REVIEW_v1.md`、`docs/ssot/M55_REPLY_WALLET_PHASE_A_NULLABLE_ONLY_EXECUTION_PACKET_v1.md`

**秘密鍵・service role・DB URL をチャットまたは本条に書かない。**

---

## 1. 対象環境（固定）

| 項目 | 値 |
|------|-----|
| **Supabase／DB コンテキスト** | **m55-soul-core** が指す **本番（PRODUCTION）** 接続 |
| **アプリ／リポの main** | **`main`** ブランチ運用側の **本番**ラベルと混同しない（DB は DB） |
| **本条が許す変更** | **`public` の `reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions` に、nullable の `report_instance_id`（uuid）を追加する操作のみ（本文に DDL 全文は書かない）。** |

---

## 2. Phase A で許容される DDL の論理範囲（全文は本条に転記しない）

| 項目 | 内容 |
|------|------|
| **対象** | **`reply_ticket_wallets`、`reply_wallet_ledgers`、`reply_sessions`** に **`report_instance_id uuid`（NULL 許容）** を追加。 |
| **操作** | **`ADD COLUMN IF NOT EXISTS`** で **nullable のみ**。 |
| **含めないもの** | **backfill、`UPDATE`、`INSERT`（種データ／修正を含む）** · **NOT NULL** · **新規 FK** · **既存 UNIQUE の変更** · **チェック削除／緩和** |

実行時は **テーブルごとに 1 文ずつ、合計 3 文の `ALTER TABLE`（各 `ADD COLUMN IF NOT EXISTS`）のみ** — 他のステートメントは同一セッションに含めない（`BEGIN`/`COMMIT` はオプション）。**ロック済みテキストはチケット単位で一元管理。** `scripts/sql/staging/m55_reply_wallet_phase_a_nullable_only_staging.sql` の PART 2 と **論理形は同型**だが、当該ファイルは **staging 宣言**付きのため — **本番実行は承認済みの本番用ロック版に従うこと。**

---

## 3. `ALTER` 実行直前チェック（すべて満たす）

| # | チェック |
|---|----------|
| 1 | **接続先が m55-soul-core／PRODUCTION とチケット記載で一致**。 |
| 2 | **直前の `git_commit_hash`（当該スキーマ変更案がロックされたリポのコミット）を実行ログに記録する。** |
| 3 | **バックアップ／rollback 方針が YES。** nullable 取消しは `DROP COLUMN` を別承認 — 計画なし実行禁止。 |
| 4 | **SQL Editor に貼るのは、承認済みの 3 文（各テーブルごとの列追加）だけ。** 他の DDL／DML／`SET` を同一セッションに混ぜない。 |
| 5 | **`M55_REPLY_WALLET_PHASE_A_PRODUCTION_PREFLIGHT_RESULT_v1`** の baseline が **未取得／矛盾** のときは **実行しない**。 |
| 6 | **Phase B 以降用の DDL／backfill／`NOTIFY` を混ぜない。** |
| 7 | **smoke orphan 向け DML、`entitlements` archive などのデータ修正を混ぜない。** Stripe／Webhook／商品棚 UI は **触らない**。 |

---

## 4. `ALTER` 実施後 Postflight（期待値）

**実行:** `scripts/sql/production/m55_reply_wallet_phase_a_nullable_production_preflight_postflight.sql` の **PART B** と、本条に列挙する **baseline 突合**。  

| # | Postflight で期待すること |
|---|----------------------------|
| 1 | **三表に `report_instance_id` が存在。** **`data_type` は uuid、`is_nullable` は YES**（`information_schema` 相当）。 |
| 2 | **行数が preflight と一致：** `reply_ticket_wallets` **= 8**、**`reply_wallet_ledgers` = 10**、**`reply_sessions` = 11**。 |
| 3 | **三表とも `report_instance_id` の非 NULL 件数 = 0**（Phase A は値を入れない）。 |
| 4 | **`wallet_user_without_snapshot_count` = 3 のまま**（行数 8 件・orphan 3 件の関係と矛盾しない）。 |
| 5 | **`smoke_orphan_wallet_count`（または当該集計ラベル）= 3 のまま**。 |
| 6 | **`wallet_with_dtr_core_snapshot_count` = 5 のまま**。 |
| 7 | **`ledger_orphan_count` = 0、`document_orphan_count` = 0 のまま**。 |
| 8 | **`UNIQUE(user_id)`（および PK／CHECK が postflight で劣化しない）**。 |

※ **`sessions_without_dtr_core_snapshot_count = 11` は DDL だけでは自動的には変わらない想定**。**異常増減があれば停止して調査**（Phase B／プロダクト論点）。

---

## 5. STOP 条件（即中止）

| # | 内容 |
|---|------|
| 1 | **`ALTER` と無関係な文が混ざる**、`UPDATE` が同じ張り付けに見える。** |
| 2 | **`report_instance_id` が既に別の状態で存在**し **preflight 観測（未作成）と矛盾**。 |
| 3 | **Postflight で非 NULL が 1 件でも出る**。 |
| 4 | **行数が preflight と一致しない**。 |
| 5 | **orphan 件数または snapshot コホート件数が、説明なく変化**。 |
| 6 | **`UNIQUE(user_id)` が無効になる／名前が変わり意図と違う。** |
| 7 | **`ERROR` が出て完了しない。** |

---

## 6. 現時点の判定（本条の verdict）

| 項目 | 判定 |
|------|------|
| **Production preflight（SELECT-only）** | **PASS とみなしていい** — 正本は `PHASE_A_PRODUCTION_PREFLIGHT_RESULT_v1`。 |
| **本番での Phase A nullable `ALTER`** | **本条全文を満たす「別承認」のうえでのみ実行候補**。本条単体での GO は出さない。 |
| **Phase B 以降** | **NO-GO 継続**（`M55_REPLY_WALLET_PHASE_A_PRODUCTION_READINESS_REVIEW_v1`／orphan／quarantine と同様）。 |
| **Stripe、商品棚 UI** | **NO-GO 継続**。 |

---

## 7. Revision

| 版 | 日時 | 変更 |
|----|------|------|
| v1 | 2026-05-01 | 初版 — 本番 Phase A nullable DDL 実行ゲート |
