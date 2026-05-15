# M55_REPLY_WALLET_PHASE_A_PRODUCTION_PREFLIGHT_RESULT_v1

Status: **Evidence SSOT — read-only SELECT の観測記録** — **この文書は DB を変更しない。** **SELECT 以外の実行はしていない。**  

Recorded date: **2026-05-01**

Target (observational):

- **Project／ブランチ論点:** **m55-soul-core** / **main**（アプリ）/ **PRODUCTION**（本番 DB 接続コンテキスト）

Related:

- `scripts/sql/production/m55_reply_wallet_phase_a_nullable_production_preflight_postflight.sql`
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_PREFLIGHT_PACKET_v1.md`
- `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SMOKE_ORPHAN_QUARANTINE_POLICY_v1.md`

**秘密鍵・service role・DB URL・生 `user_id` は記録しない。**

---

## 1. 実施内容（操作区分）

| 区分 | 実施 |
|------|------|
| **実行したもの** | **`SELECT` のみ**（本番 preflight） |
| **実行していないもの** | **`ALTER` / `UPDATE` / `INSERT` / `DELETE` / `DROP` / `CREATE` / `SET`** |

---

## 2. Preflight 結果（観測値）

### 2.1 `report_instance_id` 列（`information_schema` 相当の照会）

| 観測 | 結果 |
|------|------|
| **`reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions` に列 `report_instance_id` が存在するか** | **未作成** — **メタクエリは 0 行**（列はまだ無い）。 |

### 2.2 `reply_ticket_wallets` の制約（観測上の整合）

| 論点 | 結果 |
|------|------|
| **PRIMARY KEY (`id`)** | **維持** |
| **UNIQUE (`user_id`)** | **維持** |
| **CHECK 制約群** | **維持** |

※ 制約名の具体文字列は **チケットや pg 出力**にのみ残し、本条では **「維持」の事実**のみ固定する。

---

## 3. リスク／コホート件数（集計のみ）

| メトリクス | 値 | 解釈メモ（本条） |
|------------|-----|------------------|
| **`smoke_orphan_wallet_count`**（smoke パターン相当の orphan wallet 件数） | **3** | **既知の smoke orphan 3 件**と **数上一致**（詳細は quarantine SSOT）。 |
| **`wallet_with_dtr_core_snapshot_count`** | **5** | **`DTR_CORE_STATIC_V1` snapshot あり wallet 側のコホート** — **保護・正常系の監査上の「5」**として扱う（行内容は出していない）。 |
| **`ledger_orphan_count`** | **0** | **ledger→wallet 親なし**の件数。 |
| **`document_orphan_count`** | **0** | **document→session 親なし**の件数。 |
| **`sessions_without_dtr_core_snapshot_count`** | **11** | **`reply_sessions` 上でユーザーに対応する core snapshot が無い件数。** **Phase A nullable 列追加とは独立し、解釈・是正は Phase B 以降の論点**（本条 §6）。 |

---

## 4. Baseline（行数・orphan ウォレット総数）

| メトリクス | 値 |
|------------|-----|
| **`reply_ticket_wallets_count`** | **8** |
| **`reply_wallet_ledgers_count`** | **10** |
| **`reply_sessions_count`** | **11** |
| **`wallet_user_without_snapshot_count`** | **3** |

**読み：** **`wallet_user_without_snapshot_count = 3`** は **§3 の `smoke_orphan_wallet_count = 3`** と **同数**。orphan と smoke 監査線の記述とは **論理的に整合することを前提として記録**。

---

## 5. Preflight に対する判定（本条のみ）

| 項目 | 判定 |
|------|------|
| **Phase A を「列がまだ無い」とみなしていいか** | **PASS** — **列未定義状態が観測された。** |
| **既存一意性／PK／CHECK が壊れている兆候があるか（この読み取りの範囲）** | **PASS** — **説明済みとして維持。** |
| **本番 DDL（`ALTER`）を本条をもって承認したか** | **いいえ** — **別ゲートおよび別承認**（`M55_REPLY_WALLET_PHASE_A_PRODUCTION_ALTER_EXECUTION_GATE_v1`）。 |

---

## 6. `sessions_without_dtr_core_snapshot_count = 11` の位置づけ

- **本条の目的は Phase A の nullable `report_instance_id` 追加可否の前提資料に限る。**  
- **値 11 そのものは、ユーザー・セッションと snapshot の対応という別ドメインに関わる。Phase A DDL だけでは自動的に是正されない。**  
- **設計レビュー・Phase B／backfill／product 側の論点**として **追跡**。**本条のみで結論しない。**

---

## 7. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-05-01 | 初版 — 本番 SELECT-only preflight 観測の固定記録 |
