# M55_REPLY_WALLET_PHASE_B1_WALLET_EXECUTION_GATE_v1

Status: **Execution gate SSOT（手順・承認境界）** — **本条は本番 `UPDATE` を承認しない。実行は別チケット・別承認。**  

Scope: **Phase B1 — `reply_ticket_wallets` のみ**（**`reply_wallet_ledgers` / `reply_sessions` は更新しない**）。

Evidence（preflight PASS）:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_PREFLIGHT_RESULT_v1.md`**（コミット済み）

Execution candidate SQL（**未実行**）:

- **`scripts/sql/production/m55_reply_wallet_phase_b1_wallet_update_candidate.sql`**

Related:

- `docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_BACKFILL_DESIGN_REVIEW_v1.md`
- `docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_PREFLIGHT_PACKET_v1.md`
- `scripts/sql/production/m55_reply_wallet_phase_b1_wallet_preflight.sql`

**秘密鍵・service role・DB URL・生 `user_id`／snapshot 本文／`checkout_session_id` をチケットに貼らない。**

Packet revision **v1** · Last updated: **2026-04-28**

---

## 1. 実行対象

| # | 内容 |
|---|------|
| 1 | **テーブル:** **`public.reply_ticket_wallets` のみ** — **最大 **5** 行**（**safe candidate** と preflight で一致したコホート）。** |
| 2 | **含む:** **`DTR_CORE_STATIC_V1` に対し snapshot が **ユーザーあたり 1 件**、`report_instance_id` が **`NULL`**、**smoke パターンでない**行（候補 SQL の `WHERE` と一致）。** |
| 3 | **除外:** **smoke／quarantine 側 **3** 行** — **機械投入の対象外**（preflight の分類と一致）。** |
| 4 | **対象外（触れない）:** **`reply_wallet_ledgers` / `reply_sessions`** — **B1 では `UPDATE` しない。** |

---

## 2. 値のソース

| # | 内容 |
|---|------|
| 1 | **代入値:** **`dtr_report_snapshots.id`**（型 **`uuid`**）。** |
| 2 | **結合条件:** **`s.user_id = w.user_id`** かつ **`s.product_id = 'DTR_CORE_STATIC_V1'`**。** |
| 3 | **一意性:** スキーマ上 **`UNIQUE (user_id, product_id)`** により、**当該プロダクトキーではユーザーあたり **1** 行**。** さらに **`WHERE` 内の副問い合わせで **`count(*) = 1`** を要求**し、**複数 snapshot の怪しい状態を除外**。** |
| 4 | **意味:** **暫定の「報告インスタンス ID」として `report_instance_id` に載せる。** **利点：** 捏造せず immutable snapshot と一致。** **リスク：** 将来 **`report_instances` 正式表**との再整理、FK／NOT NULL 化やアプリ読み替えが必要になり得る（**DESIGN REVIEW に同旨**。）。** |

---

## 3. 実行前チェック（必須）

| # | チェック |
|---|----------|
| 1 | **Preflight が再実行され、結果が **`M55_REPLY_WALLET_PHASE_B1_WALLET_PREFLIGHT_RESULT_v1.md`** と **矛盾しない**（少なくとも **safe 5／quarantine 3／総 8／重複 0／三表 non-null 0**）。** |
| 2 | **Wallet の `report_instance_id` 非 NULL = **0**（ベースライン）。** |
| 3 | **Safe candidate = **5**、quarantine = **3**。** |
| 4 | **Duplicate snapshot cluster = **0**。** |
| 5 | **オーナー承認**（データ／プロダクト／運用の観点）。** |
| 6 | **バックアップおよび rollback／ロールフォワード方針**が **読める状態**であること（**rollback SQL 本文は別承認**。）。** |
| 7 | **適用コード／マイクロサービス側の **`commit`** または **`git sha`** を運用ログに記録**（監査）。** |

---

## 4. 実行後 postflight（期待する読み）

**実施本体は **`SELECT`**（preflight 系または postflight SSOT。**ledger／session は引き続き読みのみ可能）。**

| # | 期待 |
|---|------|
| 1 | **`reply_ticket_wallets` で `report_instance_id` が非 NULL の行 = **exactly **5**。** |
| 2 | **`reply_wallet_ledgers` の `report_instance_id` 非 NULL = **0**。** |
| 3 | **`reply_sessions` の `report_instance_id` 非 NULL = **0**。** |
| 4 | **Wallet 総行数 = **8**。** |
| 5 | **Quarantine **3** 行は `report_instance_id` が **`NULL` のまま**（投入されない）。** |
| 6 | **Smoke／orphan 系 **3** 行も **`NULL` 維持**（preflight の除外コホートと整合）。** |
| 7 | **Safe 候補 **5** 行のみが非 NULL** — **他行は非 NULL にならない。** |
| 8 | **Duplicate snapshot cluster = **0**（再確認）。** |
| 9 | **Ledger／session／orphan 指標**は **B1 以外の変更が無い限り** preflight 前と **矛盾しない**（例：ゼロ件のまま）。** |

---

## 5. Rollback 方針

| # | 内容 |
|---|------|
| 1 | **対象:** 理論上 **B1 で埋めた **5** 行** — **`report_instance_id` を **`NULL` に戻す**候補（**候補 SQL は `m55_reply_wallet_phase_b1_wallet_update_candidate.sql` 末尾のコメントブロック参照**。**まだ承認・実行しない。**）。** |
| 2 | **rollback 用 `UPDATE` は別承認** — **本条単体では実行しない。** |
| 3 | **rollback の前後で postflight 必須**（件数・整合・ledger／session 非触の再確認）。** |

---

## 6. STOP 条件（実行中止・ロールバック検討）

| # | 条件 |
|---|------|
| 1 | **Safe candidate が **5** でない**（再 preflight で変化）。** |
| 2 | **Quarantine が **3** でない**（期待と不一致）。** |
| 3 | **`any_existing_report_instance_id` 合算（三表）が **0** でない**（汚染・中間状態）。** |
| 4 | **`UPDATE` の影響行が **5** でない**（**`RETURNING` 行数／クライアント rowcount** を含む）。** |
| 5 | **`RETURNING` または postflight で想定外**（例：想定外のハッシュ出現、件数齟齬）。** |
| 6 | **Ledger または session に **`report_instance_id` が入る**（B1 スコープ逸脱・別バグ）。** |
| 7 | **SQL 実行時エラー**、**デッドロック**、**権限エラー**。** |

---

## 7. 現時点の判定

| 判定 | Verdict |
|------|---------|
| **Execution gate 文書・候補 SQL のリポジトリ化** | **GO** |
| **本番での当該 `UPDATE` 実行** | **NO-GO（別承認まで）** |
| **備考** | **実行ウィンドウ・担当・ロールバック責任者をチケットに明記すること。** |

---

## 8. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — B1 wallet-only execution gate + 単一 UPDATE 候補パス |
