# M55_REPLY_WALLET_PHASE_B1_WALLET_PREFLIGHT_PACKET_v1

Status: **SELECT-only operational packet SSOT — 本文と SQL は読み取りのみ。** **`UPDATE`／backfill／本番 DDL は含めず、本条単体で実施しない。**  

Scope: **`reply_ticket_wallets` の Phase B1（wallet のみ）**の **実行直前チェック**。**ledger／session の行は読みません** — **SECTION 5** は **`report_instance_id` の非 NULL 件数ベースラインのみ。**

Evidence（観測ログの一例）:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_RESULT_v1.md`**

Related:

- `scripts/sql/production/m55_reply_wallet_phase_b1_wallet_preflight.sql`（本条の SQL ソース）
- `docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_BACKFILL_DESIGN_REVIEW_v1.md`
- `scripts/sql/production/m55_reply_wallet_phase_b_backfill_candidate_diagnostic.sql`（候補分類の共通 CASE 論理）

秘密情報・サービスキー・DB URL・本番の生 `user_id`・snapshot 本文・`checkout_session_id` などは転記しない。

Packet revision **v1** · Last updated: **2026-04-28**

---

## 1. B1 の目的（本 packet の位置）

| # | 内容 |
|---|------|
| 1 | **暫定の値ソース** `dtr_report_snapshots.id`（論理上 `report_instance_id` 相当）を `wallet.report_instance_id` にのみ将来書き込む前提で、書き込み前に **集計・除外・ソース整合だけ**検証できるようにする。 |
| 2 | **`DTR_CORE_STATIC_V1` に対し snapshot が **一意**にある **`wallet_safe_candidate` 最大 5 行**のみを対象に据えることが、読み取り結果で確認できる状態にする。** |
| 3 | **smoke／quarantine が意図した通り **`report_instance_id` 投入から外れたままであること**検証できるようにする。** |
| 4 | **実行はしない。**本条は **`SELECT`** のみ。 |

---

## 2. preflight で見る項目（SQL SECTION 対応）

### 2.1 SECTION 1 — 集約（Aggregate）

実行後、列名単位で **期待する形の観察値**として（本番ログの一例）：

| メトリクス | 観測例／期待論点 |
|------------|-------------------|
| **`total_wallet_count`** | **8**（wallet 総行） |
| **`wallet_report_instance_non_null_count`** | **0**（Phase A 運用準拠：**まだすべて `NULL`**） |
| **`wallet_safe_candidate_count`** | **5** |
| **`wallet_quarantine_or_review_count`** | **3** |
| **`smoke_orphan_wallet_count`** | **3**（定義：**`is_smoke_pattern OR dtr_core_snapshot_count = 0`** — snapshot 複数済みユーザーは **`dtr_core_snapshot_count > 0`** ゆえ、この **OR は「smoke 由来」および「snapshot ゼロ行」由来**への寄与をカウント） |
| **`wallet_multiple_snapshot_count`** | **0**（**`DTR_CORE_STATIC_V1` に対して **複数 snapshot** とみなす件数**) |
| **`wallet_safe_candidate_snapshot_id_distinct_count`** | **5**（safe に付く **`md5(snapshot.id)`** の **重複無し証明**) |
| **`safe_candidate_existing_report_instance_count`** | **0**（safe と分類した行が **`report_instance_id` を既に持っている**異常係数。**0 が正常**) |

環境により件数が異なる。**本パケットは「論理チェック」を提供し、ログの一例を上書き固定しない。** ただし **矛盾（例：safe があるのに複数カウント > 0）** があれば **止まる。** 

### 2.2 SECTION 2 — 候補詳細（Hash-only）

出力列（すべて **識別子はハッシュ**）：

- **`hashed_wallet_id`** — `md5(wallet_id::text)`
- **`hashed_user_id`** — `md5(user_id)`
- **`hashed_snapshot_id_candidate`** — `md5(dtr_report_snapshots.id::text)`（**生 UUID は出さない**）
- **`snapshot_count`** — `dtr_core_snapshot_count`（製品 **`DTR_CORE_STATIC_V1`** のみ）
- **`is_smoke_pattern`**
- **`wallet_report_instance_is_null`**
- **`candidate_status`**

**表示方針（安全性優先）：** SQL ヘッダのとおり **デフォルトは全 wallet 行**（例：**8** 行）。**監査ログが最小要件なら、`WHERE candidate_status = 'wallet_safe_candidate'` を有効にして **5** 行に絞れる。**

### 2.3 SECTION 3 — 除外バケット別件数（Exclusion verification）

**`bucket_*`** カウンターは **`candidate_status` と整合する件数のみ。** smoke／snapshot 無し／snapshot 複数／already_set に該当する行が B1 で自動投入されるべきではないことを **件数**で確認する。

### 2.4 SECTION 4 — ソース検証（Source validation）

| ブロック | 内容 |
|----------|------|
| **§4a** | `dtr_report_snapshots` の `id`／`user_id`／`product_id` の **データ型のみ** — snapshot 本文／payload は出さない。 |
| **§4b** | `product_id = 'DTR_CORE_STATIC_V1'` で同一ユーザーに複数 snapshot クラスターがある異常（**`duplicate_user_product_snapshot_cluster_count`**）。一意との整合：**0 が期待**。 |
| **§4c** | **`wallet_safe_candidate`** と **`dtr_core_snapshot_count`** の整合異常指標：**§4c の 2 列とも 0** がよい。 |

**`user_id` + `product_id`** の一意は **`dtr_report_snapshots`** の DDL（**`UNIQUE (user_id, product_id)`**）と **`§4b`** で読む。wallet と snapshot の **`user_id` 組一致は、カウンタが相関済みクエリで定義済み。**

### 2.5 SECTION 5 — ベースライン（Ledger / Session を触らない）

| メトリクス | 論点 |
|------------|------|
| **`wallet_report_instance_non_null_count_baseline`** | B1 前：**0**。 |
| **`ledger_report_instance_non_null_count`／`session_report_instance_non_null_count`** | B1 では変更しない：**0 維持**が前提。 |
| **`tri_table_report_instance_non_null_sum`** | 三表合算の **現在の非 NULL 総数**。B1 前：**0**。 |

---

## 3. SELECT-only であること

| # | 制約 |
|---|------|
| 1 | **SQL は `SELECT` のみ。** **`UPDATE`／`INSERT`／`DELETE`／DDL／`SET`** を含まない。** |
| 2 | **`raw user_id`、`report_instance_id` の生 UUID、snapshot／payload、`checkout_session_id` の生値**出力なし。** |
| 3 | **候補 snapshot の surrogate は **`md5(id::text)`** のみ。** |
| 4 | **DML／backfill を本文に書かない。** |

---

## 4. 本条だけでは UPDATE GO にならない

| Verdict | 内容 |
|---------|------|
| **本条／本 SQL が肯定するもの** | **読み取りで preflight が通る状態を **観察**すること。** |
| **本条が付与しないもの** | **本番での `UPDATE` GO、自動 backfill、`NOT NULL`/FK/`UNIQUE` 変更**。 |
| **次のフェーズ（ガード別）** | **B1 execution gate**：**適用ウィンドウ、承認済み実行文、`UPDATE` SSOT、運用順序**。— **本条の段階では **実行 SQL はまだ作成しない**。** |

---

## 5. Postflight の想定（本文のみ／別実行で読み）

**前提：** rollback の手順詳細や **`UPDATE` と逆操作の DDL**は **別 SSOT**（本条では規定しない）。  

**論理的には**実行成功後／検証ウィンドウに **同じ読み集め**または **postflight パケット**で以下を読むことを想定する：

| 論点 | 想定する整合 |
|------|----------------|
| **`reply_ticket_wallets` の `report_instance_id` が非 NULL** | exactly **5**（対象のみ）。 |
| **ledger／session の `report_instance_id` 非 NULL** | **0 のまま**（B1 スコープ外）。 |
| **wallet 総行数** | **8** 維持（行を増やさない）。 |
| **smoke／quarantine の 3 行** | **`NULL` 維持**（投入されない）。 |
| **三表合算 non-NULL** | **5**（wallet だけが非 NULL になる想定）。 |

---

## 6. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — B1 SELECT-only preflight packet + production SQL |
