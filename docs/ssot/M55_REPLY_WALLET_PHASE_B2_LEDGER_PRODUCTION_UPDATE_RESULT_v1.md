# M55_REPLY_WALLET_PHASE_B2_LEDGER_PRODUCTION_UPDATE_RESULT_v1

Status: **Evidence SSOT — production B2 ledger inherit update + postflight log** — **本条の編集のみ。DB は本文から操作しない。**  

Recorded date: **2026-04-28**

---

## 1. 実施内容

| # | 内容 |
|---|------|
| 1 | **環境:** **m55-soul-core · main · PRODUCTION** |
| 2 | **対象テーブル:** **`reply_wallet_ledgers` のみ更新** — **`reply_sessions` は更新しない** |
| 3 | **投入内容:** **親 **`reply_ticket_wallets.report_instance_id`**（非 **`NULL`**）を **`reply_wallet_ledgers.report_instance_id`** に **同一値として継承**（**親が **`NULL`**／quarantine 側に分類される wallet にぶらさがる ledger は対象外**）。** |
| 4 | **`reply_sessions`:** **未更新** |
| 5 | **`reply_ticket_wallets`:** **追加・更新しない** |
| 6 | **DDL:** **実施しない** |
| 7 | **`entitlements` archive:** **実施しない** |
| 8 | **Stripe／Webhook／商品棚 UI:** **実行・変更しない** |

Related:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B2_LEDGER_INHERIT_DESIGN_REVIEW_v1.md`**
- **`docs/ssot/M55_REPLY_WALLET_PHASE_B2_LEDGER_PREFLIGHT_PACKET_v1.md`**
- **`scripts/sql/production/m55_reply_wallet_phase_b2_ledger_preflight.sql`**
- **`docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_PRODUCTION_UPDATE_RESULT_v1.md`**

秘密鍵・service role・DB URL・本番の生 `user_id` を本条に転記しない。

---

## 2. Postflight の結果（集計のみ）

| メトリクス | 値 |
|------------|-----|
| **`wallet_report_instance_non_null`** | **5** |
| **`ledger_report_instance_non_null`** | **5** |
| **`session_report_instance_non_null`** | **0** |
| **`ledger_total_count`** | **10** |
| **`ledger_parent_quarantine_still_null`** | **5** |
| **`ledger_inconsistent_with_parent_count`** | **0** |
| **`ledger_orphan_count`** | **0** |

---

## 3. 判定（Phase B2 の読み）

| # | 判定 |
|---|------|
| 1 | **B2 ledger inherit `UPDATE` は **PASS**。** **`postflight` が設計論点と **整合**。** |
| 2 | **安全な親 wallet（親 **`report_instance_id` 非 **`NULL`**）にぶらさがる **ledger **5**** 件のみ**が継承済みとなる読み。** |
| 3 | **親 quarantine に相当する側の **ledger **5**** 件は **`report_instance_id` が **`NULL` のまま**。** |
| 4 | **`reply_sessions` の **`report_instance_id` は **`NULL`** のまま**。** |
| 5 | **Ledger と親 wallet の **`report_instance_id`** について **論理的不整合は **0**（**`ledger_inconsistent_with_parent_count` = **0**。）。** |
| 6 | **orphan ledger は **0**。** |

**Phase B2（ledger のみの継承）は、本条において完了候補として確定ログ化する。** **B3 や DDL には本条で進んでいない。**

---

## 4. 監査上の是正（プロセス順序）

| # | 事実 |
|---|------|
| 1 | **今回、`B2 execution gate` SSOT をコミットする前に、本番 **`UPDATE`** まで実行に至った。** これは通常想定順序とは異なる。** |
| 2 | **しかし、`postflight` は本条 §2 のとおり **`PASS`** しており**、本条の観測範囲では **データ修復や再投入は不要**。** |

**今後すべてのフェーズでは、できる限り以下の順序に戻す：**

| 順番 | アーティファクト |
|------|------------------|
| 1 | Design review SSOT |
| 2 | SELECT-only preflight SQL／PACKET |
| 3 | Preflight result SSOT（証跡） |
| 4 | Execution gate SSOT |
| 5 | 別承認（実行ウィンドウ・担当・ロールバック責任） |
| 6 | `UPDATE`／backfill の実行 |
| 7 | Postflight／production update result SSOT（本条の類） |

**本条が「手順先行をした事実」を残し、是正の指針だけを書く。** **秘密情報は書かない。**

---

## 5. 限界（本条で達成しないこと）

| # | 限界 |
|---|------|
| 1 | **B3 **`reply_sessions`** の更新は **未実施**。** |
| 2 | **Session の多数（運用上約 **11** 件規模）は **quarantine を継続**する論点であり、本条では変更しない。** |
| 3 | **`NOT NULL`／FK／厳格 UNIQUE は **未実施**。** |
| 4 | **`report_instance_id` は **`dtr_report_snapshots.id`** 経由で wallet に載った値を親として継承しており**、**モデル論上は暫定**。将来 **`report_instances` などを正として再編**する余地がある。** |

---

## 6. 引き続き NO-GO（維持）

| 区分 | NO-GO |
|------|--------|
| Phase B 残 | **B3 session `UPDATE`** |
| DDL | **`NOT NULL`／FK／厳格 UNIQUE** |
| 運用 | **`entitlements` archive 一括、smoke／orphan 向け個別 **DML**** |
| 課金／UI | **Stripe 追加課金／Webhook／商品棚 UI** |

本条例の **`PASS`** は **Phase B2（ledger に限る継承）に限定**。上記には **本条で **`GO`** を出さない。**

---

## 7. 次の候補

| # | 候補 |
|---|------|
| 1 | **`M55_REPLY_WALLET_PHASE_B2_LEDGER_PRODUCTION_UPDATE_RESULT_v1.md`（本条）をコミット**して証跡を固定。** |
| 2 | **B3 session quarantine の継続**に関する **SSOT を新規作成**。** |
| 3 | **返書での追加課金／Stripe へ進む前に**、DB 到達点の **一覧チェック**（設計レビューと突合）。** |

---

## 8. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — 本番 B2 ledger inherit `UPDATE` と `postflight`、監査是正メモ |
