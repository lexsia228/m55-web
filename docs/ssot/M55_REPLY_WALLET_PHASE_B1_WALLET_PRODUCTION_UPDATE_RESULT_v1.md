# M55_REPLY_WALLET_PHASE_B1_WALLET_PRODUCTION_UPDATE_RESULT_v1

Status: **Evidence SSOT — production B1 wallet-only update + postflight log** — **本条の編集のみ。DB は本文から操作しない。**  

Recorded date: **2026-04-28**

---

## 1. 実施内容

| # | 内容 |
|---|------|
| 1 | **環境:** **m55-soul-core · main · PRODUCTION** |
| 2 | **対象テーブル:** **`reply_ticket_wallets` のみ更新** — **`reply_wallet_ledgers`／`reply_sessions` は更新しない** |
| 3 | **投入値:** **`report_instance_id` に **`dtr_report_snapshots.id`（uuid）** を書き込む** |
| 4 | **対象条件（要約）:** **`DTR_CORE_STATIC_V1` の snapshot が **ユーザーあたりちょうど 1 件**存在し、**smoke パターンではない** wallet** — **smoke／quarantine に該当する **3** 行は除外**（機械的投入の対象外のまま）。** |
| 5 | **`UPDATE` 実行時出力:** **`RETURNING` では **`hashed_wallet_id`（`md5(wallet_id::text)` 相当）**のみ **5** 行。** **raw `user_id`、`checkout_session_id`、snapshot 本文／payload 本文は返さない。** |
| 6 | **DDL:** **実施しない** |
| 7 | **`entitlements` archive:** **実施しない** |
| 8 | **Stripe／Webhook／商品棚 UI:** **変更しない（触らない）。** |

Related:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_EXECUTION_GATE_v1.md`**
- **`scripts/sql/production/m55_reply_wallet_phase_b1_wallet_update_candidate.sql`**
- **`docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_PREFLIGHT_RESULT_v1.md`**
- **`docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_BACKFILL_DESIGN_REVIEW_v1.md`**

秘密鍵・service role・DB URL・生の `user_id` を本条に転記しない。

---

## 2. `UPDATE` の結果

| メトリクス | 値 |
|------------|-----|
| **`UPDATE` で `RETURNING hashed_wallet_pk` とみなされる行（**`hashed_wallet_id`**）** | **5** rows |
| **生 `user_id`／checkout／snapshot／payload をクライアントに返したか** | **返していない**（上記のみ） |

※ 実行に用いたクエリ構造・列名は **EXECUTION GATE** および **`m55_reply_wallet_phase_b1_wallet_update_candidate.sql`** に準拠。

---

## 3. Postflight の結果（集計のみ）

| メトリクス | 値 |
|------------|-----|
| **`wallet_report_instance_non_null`**（`reply_ticket_wallets` で `report_instance_id` が非 NULL） | **5** |
| **`ledger_report_instance_non_null`** | **0** |
| **`session_report_instance_non_null`** | **0** |
| **`wallet_total_count`** | **8** |
| **`wallet_smoke_or_quarantine_still_null`**（smoke／quarantine コホートで **`NULL` が維持**した件数の呼称） | **3** |

---

## 4. 判定（Phase B1 の読み）

| # | 判定 |
|---|------|
| 1 | **B1 wallet-only `UPDATE` は **PASS**。** **`UPDATE` 影響行および postflight が **想定どおり整合**。** |
| 2 | **正常 wallet とみなしていた **5** 件のみ **`report_instance_id` が設定**された読み。** |
| 3 | **Quarantine 側 **3** 件は `report_instance_id` が **`NULL` のまま**。** |
| 4 | **Ledger／session は `report_instance_id` が **`NULL` のまま**。** |
| 5 | **wallet 総行数 **8** を維持**（増減なし）。** |
| 6 | **Phase B1（wallet 列のみの値投入）は **完了候補**として本条で確定ログ化する。** **B2／B3 へ自動で進んでいない。** |

---

## 5. 限界（本条で達成しないこと）

| # | 限界 |
|---|------|
| 1 | **B2 ledger の継承は未実施** — **`reply_wallet_ledgers` は本条の範囲外。** |
| 2 | **B3 session は運用上 **quarantine を継続**する設計判断の対象であり、本条では変更しない。** |
| 3 | **`NOT NULL`／FK／厳格 UNIQUE は未実施** — **DDL の強制はしない。** |
| 4 | **`report_instance_id` の意味論は、`dtr_report_snapshots.id` の **参照として暫定**（将来的に **`report_instances` などを正とするときに再整理**が必要となる可能性）。** |

---

## 6. 引き続き NO-GO（維持）

| 区分 | NO-GO |
|------|--------|
| Phase B の残 | **B2 ledger `UPDATE`／B3 session `UPDATE`** |
| DDL | **`NOT NULL`／FK／厳格 UNIQUE** |
| 運用／データ | **`entitlements` archive 一括、smoke／orphan 向け **専用 DML**** |
| 課金／UI | **Stripe 追加課金動線の改修、Webhook、商品棚 UI** |

本条の **PASS** は **Phase B1（wallet のみ）に限定**。上記には **本条で GO を出さない**。

---

## 7. 次の候補

| # | 候補 |
|---|------|
| 1 | **`M55_REPLY_WALLET_PHASE_B1_WALLET_PRODUCTION_UPDATE_RESULT_v1.md`（本条）をコミット**し証跡を固定。** |
| 2 | **B2 ledger inherit の **設計レビュー SSOT** に進める（**実行 SQL はまだ不可／別承認**。）。** |
| 3 | **Stripe の追加課金動線**は **B2／B3 の方針が固まるまで据え置き**。**

---

## 8. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — 本番 B1 wallet-only UPDATE と postflight 証跡 |
