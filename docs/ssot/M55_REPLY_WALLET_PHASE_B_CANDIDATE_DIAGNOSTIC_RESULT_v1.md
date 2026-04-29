# M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_RESULT_v1

Status: **Evidence SSOT — SELECT-only observation log** — **本条の編集のみ。DB は変更しない。**  

Recorded date: **2026-04-28**

Execution context:

- **Environment:** **m55-soul-core / main / PRODUCTION**
- **Operations performed:** **`SELECT` のみ** · **`UPDATE` / `INSERT` / `DELETE` / DDL / `SET` は実施していない。** · **backfill なし。**  

Related:

- `scripts/sql/production/m55_reply_wallet_phase_b_backfill_candidate_diagnostic.sql`（fixed 版）
- `docs/ssot/M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_PACKET_v1.md`
- `docs/ssot/M55_REPLY_WALLET_PHASE_B_BACKFILL_DESIGN_REVIEW_v1.md`
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_POSTFLIGHT_RESULT_v1.md`

**秘密鍵・service role・DB URL・生 `user_id` は記載しない。**

---

## 1. 実施経緯と既知バグ修正（ソース）

| # | 事項 |
|---|------|
| 1 | **初版 diagnostic SQL の SECTION 2（wallet aggregate）において、`ws_class` に対する **`FROM` が欠落**しており、`candidate_status` が **スコープエラー**になった。** |
| 2 | **DB には書き込みなく、論理のみのクエリ誤り。** **`FROM ws_class`** を追加した fixed 版を **`m55_reply_wallet_phase_b_backfill_candidate_diagnostic.sql`** に反映済み。** |
| 3 | **複数 SELECT を一度に実行すると Supabase SQL Editor が **最終結果のみ**強調しやすい** — **SECTION 単位での貼り付け実行**を推奨（PACKET SSOT に同旨記載）。 |

---

## 2. 診断結果（集計値のみ）

### 2.1 SECTION 2 — WALLET aggregate

| メトリクス | 値 |
|------------|-----|
| **`wallet_safe_candidate_count`** | **5** |
| **`wallet_quarantine_or_review_count`** | **3** |

### 2.2 SECTION 4 — LEDGER aggregate

| メトリクス | 値 |
|------------|-----|
| **`ledger_safe_inherit_candidate_count`**（本番出力列名） | **5** |
| **`ledger_parent_quarantine_count`**（本番では `ledger_quarantine` と呼ぶ場合あり） | **5** |
| **`ledger_orphan_manual_review_count`** | **0** |

### 2.3 SECTION 6 — GLOBAL summary（抜粋）

| メトリクス | 値 |
|------------|-----|
| **`session_candidate_needs_stronger_proof_count`** | **0** |
| **`session_quarantine_count`** | **11** |
| **`any_existing_report_instance_id_count`** | **0** |

※ **`session_quarantine_count`** は **`session_no_snapshot_quarantine`** と **`session_smoke_quarantine`** の合算ロジック。

---

## 3. 判定（設計論点の固定）

| # | 判定 |
|---|------|
| 1 | **B1 wallet backfill の「機械的起案」候補は **最大 5 件****（`wallet_safe_candidate` = 5）。** 実行は **まだしない。** |
| 2 | **B2 ledger は親 wallet からの継承候補が **5 件****（`ledger_inherit_from_safe_wallet_candidate` = 5）。** 親が quarantine の row が **5**。** |
| 3 | **B3 session は **session_cand needs_stronger_proof = 0**、**quarantine 合算 11** — **本観測では **一括 backfill の根拠にならない**。** **全件 quarantine 側の扱いを継続検討。** |
| 4 | **smoke／orphan 系 3 件**は **quarantine 維持**（先行 SSOT と整合する件数構造）。 |
| 5 | **`report_instance_id` 非 NULL は三表合算 **0** — Phase A 後の期待と一致。** |
| 6 | **Phase B 実行（`UPDATE`／backfill）は **NO-GO**。** |

---

## 4. Phase B の分割案（この結果を踏まえたラベル）

| 段階 | 内容 | 本条での位置づけ |
|------|------|-------------------|
| **B1** | **wallet のみ** — 候補 **5** | **設計レビュー SSOT 起案可。実行は別承認。** |
| **B2** | **ledger のみ** — inherit 候補 **5** | **B1 の値との整合を前提に設計レビュー可。実行は別承認。** |
| **B3** | **session** — **quarantine 継続、自動 backfill なし** | **現状観測では **needs_stronger_proof = 0** のため **別証明なしの機械投入は不可**。** |

---

## 5. 引き続き NO-GO（継続禁止・本条では着手しない）

| 区分 | NO-GO 項目 |
|------|-------------|
| DML／移行 | **`UPDATE`**、backfill、smoke／orphan 向け個別 **DML** |
| DDL | **`NOT NULL` 変更**、**FK** 追加変更、厳格 **UNIQUE** 変更 |
| 運用 | **`entitlements` archive** の一括、**Stripe／Webhook／商品棚 UI** に手を触れる変更 |

**本条の証拠のみでは Phase B は実行 GO しない**（設計レビュー SSOT と整合）。

---

## 6. 次の候補（文書のみ・SQL 本文はまだ作らない）

| # | 候補 |
|---|------|
| 1 | **B1 wallet-only backfill 設計レビュー SSOT** |
| 2 | **B2 ledger inherit 設計レビュー SSOT** |
| 3 | **B3 session quarantine 継続 SSOT** |

---

## 7. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — 本番 SELECT-only candidate diagnostic 結果と SQL 修正経緯 |
