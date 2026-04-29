# M55_REPLY_WALLET_PHASE_B2_LEDGER_PREFLIGHT_PACKET_v1

Status: **SELECT-only operational packet SSOT — 本文と SQL は読み取りのみ。** **`UPDATE`／backfill／本番 DDL は本条に含めず、本条単体で実施しない。**  

Scope: **Phase B2 — `reply_wallet_ledgers` の `report_instance_id` に対し、親 **`reply_ticket_wallets.report_instance_id`** から **同一値を継承**する実行前チェック。** **`reply_sessions` は読み取りカウントのみ。** **wallet は B2 では書き換えない。**

Prerequisite:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_PRODUCTION_UPDATE_RESULT_v1.md`**（B1 PASS）
- **`docs/ssot/M55_REPLY_WALLET_PHASE_B2_LEDGER_INHERIT_DESIGN_REVIEW_v1.md`**

Script:

- **`scripts/sql/production/m55_reply_wallet_phase_b2_ledger_preflight.sql`**

Related:

- **`scripts/sql/production/m55_reply_wallet_phase_b_backfill_candidate_diagnostic.sql`** — との差分：**B1 完了後は診断の `wallet_safe_candidate` ラベルをそのまま使うと親 wallet と ledger の組が崩れる**。本.packet の SQL は **親 **`report_instance_id`** の有無**で **`ledger_safe_inherit_candidate`** を定義する（§2.6 参照）。

**秘密情報・サービスキー・DB URL・生 `user_id`・snapshot／payload／`checkout_session_id` は転記しない。**

Packet revision **v1** · Last updated: **2026-04-28**

---

## 1. B2 の目的（本 packet の位置）

| # | 内容 |
|---|------|
| 1 | **親 wallet に **`report_instance_id` が載っている（B1 済み）行**だけをソースとし、その **`wallet_id`** にぶら下がる **ledger が **`report_instance_id` をまだ **`NULL`** のときのみ**、「継承候補」として数えられるかを読み取りで確認する。** |
| 2 | **親 **`report_instance_id` が **`NULL`**（quarantine cohort）または **親行なし orphan** は **自動継承の対象外**。** |
| 3 | **session は変更しない。** **wallet は追記しない（B2 スコープ）。** |

---

## 2. Preflight で見る項目（SQL SECTION）

### 2.1 SECTION 1 — 集約（Aggregate）

実行後に **観察する列名**。本番ログの一例（**前提に合わせた期待論点**)：

| メトリクス | 観測例／論点 |
|------------|----------------|
| **`total_ledger_count`** | **10** |
| **`ledger_report_instance_non_null_count`** | **0** |
| **`wallet_report_instance_non_null_count`** | **5** |
| **`session_report_instance_non_null_count`** | **0** |
| **`ledger_safe_inherit_candidate_count`** | **5** |
| **`ledger_parent_quarantine_count`** | **5** |
| **`ledger_orphan_count`** | **0** |
| **`ledger_already_set_count`**（`ledger_already_set_manual_review` 相当） | **0** |

件数は環境により変わり得る。**矛盾（inherit 件数と wallet の RI 件、`orphan`、`already_set` など論理的矛盾）がある場合は実行前に確認する。** 

---

### 2.2 SECTION 2 — 候補詳細（Hash-only）

出力列（**生 UUID は出さず `md5` のみ**。）：

- **`hashed_ledger_id`**
- **`hashed_wallet_id`**
- **`hashed_parent_report_instance_key`** — 親 `report_instance_id` が非 NULL なら `md5`（親値のハッシュのみ）。親が NULL の行は **`NULL`。**
- **`parent_wallet_report_instance_is_non_null`**
- **`ledger_report_instance_is_null`**
- **`candidate_status`** — `ledger_safe_inherit_candidate` 等。

**返し方針（安全性）：** SQL ヘッダのとおり **デフォルトは全 ledger 行**（例：**10** 行。**分類確認に有利**）。最小出力が必要なら **`WHERE candidate_status = 'ledger_safe_inherit_candidate'` を有効化**して約 **5** 行のみ。

---

### 2.3 SECTION 3 — バケット再集約（Exclusion verification）

SECTION 2 と論理同等の **`bucket_*`** で **inherit／parent_quarantine／orphan／already_set** の件数を再読。

---

### 2.4 SECTION 4 — ソース検証（Source validation）

| ブロック | 内容 |
|----------|------|
| **§4a** | **`ledger_missing_parent_wallet_pk_count`** — **親 wallet が存在しない ledger**。** **`ledger_orphan`** と整合。** **0 が期待**。 |
| **§4b** | **`coherence_inherit_but_parent_wallet_ri_null`** — **inherit に分類されたのに親 RI が **`NULL`。** **`0`。** |
| **§4c** | **`tri_table_report_instance_non_null_sum`** ほかベースライン — **B2 で wallet/session を変更しない**。 |

設計論点：**ledger は **`dtr_report_snapshots` を **`JOIN`** しない** — **値は親 wallet の **`report_instance_id`** のみ**。**

---

### 2.5 Postflight を想定（本文のみ）

B2 **`UPDATE`** 成功後の **読むべき状態**として（**本条は実行しない**。）：

| 論点 | 想定 |
|------|------|
| Ledger 非 NULL | **5**（親が RI 済みで ledger が埋まった行のみ） |
| Wallet 非 NULL | **5** のまま |
| Session 非 NULL | **0** |
| Ledger 総行 | **10** |
| Parent quarantine レジャー **5** | **`NULL`** 維持 |
| orphan | **0** |

---

### 2.6 B1 後の分類との差異（読み）

**Phase B 候補診断**は **B1 前の `wallet_safe_candidate`** が親である前提で **`ledger_inherit_from_safe_wallet_candidate`** を付けていた。**  

**B1 後**、その **5 wallet は **`report_instance_id` 非 **`NULL`** で **`wallet_already_set_manual_review`** 側になる。**  

本 preflight は **「親 wallet が RI をすでにもつ」ことを直接見る**ので、**`ledger_safe_inherit_candidate`** の **名前は維持しつつ、意味が「B1 で RI が付いた親の子 ledger」のみ**となる。

---

## 3. SELECT-only であること

| # | 制約 |
|---|------|
| 1 | **SQL は `SELECT` のみ。** |
| 2 | **DML／DDL／`SET` なし。** |
| 3 | **生 `user_id`、`checkout_session_id`、snapshot／payload は出さない。** |
| 4 | **DML／backfill を本文に書かない。** |

---

## 4. 本条だけでは UPDATE GO にしない

| Verdict | 内容 |
|---------|------|
| **肯定するもの** | **読み取りで ledger 継承前の状態を確認できる。** |
| **否定するもの** | **本条単体での B2 `UPDATE` GO、実行ウィンドウ承認**。 |
| **次** | **B2 execution gate**（**実行候補 SQL は別。** **まだ作らなくてよい**。） |

**Rollback 手順の詳細は別 SSOT。**

---

## 5. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — B2 SELECT-only ledger preflight |
