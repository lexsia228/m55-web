# M55_REPLY_WALLET_PHASE_A_PRODUCTION_PREFLIGHT_PACKET_v1

Status: **Human execution packet — read-only SQL only** — **この文書は DB を変更しない。** **本番への `ALTER`／migration 追加は本条だけでは行わない。**  

Date: **2026-04-30**

Related:

- `scripts/sql/production/m55_reply_wallet_phase_a_nullable_production_preflight_postflight.sql`（**SELECT のみ**）
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_READINESS_REVIEW_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SHADOW_PHASE_A_NULLABLE_POSTFLIGHT_RESULT_v1.md`（shadow 証跡・十分条件ではない）
- `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`、`docs/ssot/M55_REPLY_WALLET_SMOKE_ORPHAN_QUARANTINE_POLICY_v1.md`

**秘密鍵・service role・DB URL をチケットや本文に記載しない。** **実行可能 `ALTER` や migration 本文は本条に書かない。**

---

## 1. 実行前チェック（ゲートを開ける前）

| # | チェック |
|---|----------|
| 1 | **ダッシュボードで接続先が本番 project であると人間が確信できる**（許可された手順でのみ `SELECT`）。 |
| 2 | **オーナー（プロダクト＋インフラ／DBA）の事前承認**がある。 |
| 3 | **バックアップ／PITR／ロールバック方針**が文書で YES。 |
| 4 | **今回の目的は `SELECT` のみ** — DML／DDL は **このパケットに含まれない**。 |
| 5 | **結果をチケットに貼るとき、生 `user_id`・メール・payload・checkout 文字列を出さない** — **集計・件数・制約定義のみ**。 |

---

## 2. 本番 project 確認

- **Supabase（または許可された SQL クライアント）で、project 名／ref を目視し、意図した本番であることを記録する。**  
- **ステージング／shadow と混同しない。**  
- **接続情報はダッシュボード等の安全な入口からのみ使用** — URL やキーをチャットへ貼らない。

---

## 3. Backup／rollback 確認

- **本番で列追加を検討する前に**、直近バックアップ／PITR 可能範囲を確認（オペレーション手順書に従う）。  
- **nullable 列の取り消しは `DROP COLUMN` 等別承認の DDL** — **本条では定義しない。**  
- **rollback 計画が「未記載」のままでは `ALTER` は承認しない**（READINESS REVIEW と同旨）。

---

## 4. Preflight 実行手順

1. **SQL Editor または承認済みクライアント**で、`m55_reply_wallet_phase_a_nullable_production_preflight_postflight.sql` の **PART A（PREFLIGHT）** のブロックを **上から順に**実行する。  
2. **PART A の A4** — **列がまだ無い初期状態では実行しない**（ファイル内コメント参照）。**列が既にある場合のみ**コメント解除して非 NULL 件数を取得。  
3. 出力を **スクリーンショットまたはテキストに **PII を含まない形**で**保存し、チケットに紐づける。  
4. **実行 UTC、実行者、git commit hash（リポの当該 SQL の版）**を記録する。  
5. **期待どおりでない行があれば POSTFLIGHT に進まず STOP**（§7）。

---

## 5. `ALTER` はまだ別承認であること

- **本条および当該 `.sql` ファイルには `ALTER`/`CREATE`/`DROP`/DML は含めていない。**  
- **本番への nullable 列追加は** `M55_REPLY_WALLET_PHASE_A_PRODUCTION_READINESS_REVIEW_v1.md` の **GO 条件**を満たした **別承認**のうえ、**ロック済み DDL**（本文はパケット外）で実施する。  
- **`supabase/migrations` への本番 migration 追記は**同じく **別 PR／別承認**。

---

## 6. Postflight 実行手順

1. **承認済み `ALTER` のみ**が本番に適用された**後**（順序はオペレーション計画に従う）、同じ SQL ファイルの **PART B（POSTFLIGHT）** を上から実行する。  
2. **PART A のベースライン**（行数・orphan 件数・制約定義文字列）と **突き合わせる。**  
3. **B3** は **各 `report_instance_id` 非 NULL が 0** であること（Phase A は backfill なし）。  
4. **B4 二番目** — orphan ウォレットに **非 NULL の `report_instance_id` が付いていないこと**（**0 期待**）。  
5. 結果を **preflight と同様に**記録する。

---

## 7. STOP 条件

| # | 内容 |
|---|------|
| 1 | **Preflight で必須テーブルが不足**（4 テーブル期待のところが欠ける）。 |
| 2 | **初回適用前なのに `report_instance_id` に非 NULL が存在**（A4 利用時）。 |
| 3 | **orphan／smoke／行数が SSOT で想定する運用と矛盾**（例: `wallet_user_without_snapshot_count` の説明不能な変化）。 |
| 4 | **制約名・`UNIQUE(user_id)` 定義が preflight 記録と整合しない**（postflight で）。 |
| 5 | **接続先が本番でない／不明** — 即中断。 |
| 6 | **チケットに秘密情報を貼りそうになった** — 実行を止め手順をやり直す。 |

---

## 8. GO 条件（postflight 完了の「読み取り上の」OK）

**本条は本番 `ALTER` 全体の GO ではない — **postflight SELECT の一致**に限る。**

| # | 条件 |
|---|------|
| 1 | **3 テーブルに `report_instance_id` が存在し、`is_nullable = YES`。** |
| 2 | **A2 と B2 の行数が一致。** |
| 3 | **B3 の非 NULL 件数がすべて 0。** |
| 4 | **`wallet_user_without_entry_snapshot_count` が preflight と一致**（意図された運用でない変化がない）。 |
| 5 | **B5 の UNIQUE 定義が preflight と同一。** |
| 6 | **B6／B7／B8 の件数が orphan・コホートの説明と矛盾しない**（通常は preflight と一致）。 |

---

## 9. 本番 `ALTER` へ進めるかどうかの判定はこの packet だけでは出さない

| 論点 | 内容 |
|------|------|
| **本条の位置づけ** | **読み取りのみの証跡収集**。 |
| **不足しうる情報** | **shadow はデータ 0 件で十分条件ではなかった**という READINESS と同様、**本パケットだけでは負荷・履歴すべてを代替しない**。 |
| **判定の正本** | **`M55_REPLY_WALLET_PHASE_A_PRODUCTION_READINESS_REVIEW_v1.md` の GO 条件すべて** と **オーナー承認** を満たしたうえでの **別判断**。 |

Phase B／backfill／課金・商品棚：**READINESS と同様 NO-GO がデフォルト**。

---

## 10. Preflight が確認する一覧（論理）

| § | SQL 論点 |
|---|----------|
| A0 | `current_database()` |
| A1 | 対象 4 テーブル存在（reply 三つ + `dtr_report_snapshots`） |
| A2 | 三テーブル行数 |
| A3 | `report_instance_id` 列の有無／型／nullable |
| A4 | 列がある場合のみ非 NULL（**列なしではスキップ**） |
| A5／A6 | UNIQUE／PRIMARY |
| A7 | `wallet_user_without_snapshot` |
| A8 | `smoke_user_%` pattern orphan **件数のみ** |
| A9／A10 | snapshot ありコホート、線形 orphan 集計 |
| A11 | 一行サマリー（ベースライン記録） |

---

## 11. Postflight が確認する一覧（論理）

| § | SQL 論点 |
|---|----------|
| B1 | 三列とも存在、`uuid`/`is_nullable=YES` |
| B2 | 行数が preflight と一致 |
| B3 | 非 NULL すべて 0 |
| B4／B7／B8 | orphan／smoke／snapshot コホートが異常変化しない |
| B5／B6 | UNIQUE 維持、FK 孤児件数がベースラインと一致 |

---

## 12. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-30 | 初版 — production SELECT-only preflight／postflight packet |
