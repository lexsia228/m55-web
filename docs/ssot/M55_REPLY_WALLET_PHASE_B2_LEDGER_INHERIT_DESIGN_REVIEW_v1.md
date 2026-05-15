# M55_REPLY_WALLET_PHASE_B2_LEDGER_INHERIT_DESIGN_REVIEW_v1

Status: **設計レビュー SSOT（文書のみ）** — **`UPDATE`／backfill／本番実行は本条に含めず、本条単体でも実施しない。**  

Scope: **Phase B2 — `reply_wallet_ledgers` の `report_instance_id` に対し、親 **`reply_ticket_wallets`** から **同一値を継承**する案の検討。** **`reply_sessions` は触らない。**

Prerequisite（B1 完了証跡）:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_PRODUCTION_UPDATE_RESULT_v1.md`**（コミット済み）

Candidate diagnostic（分類ロジック参照）:

- **`scripts/sql/production/m55_reply_wallet_phase_b_backfill_candidate_diagnostic.sql`** — SECTION 3 / 4

**秘密鍵・service role・DB URL・生 `user_id` は記載しない。**

---

## 1. B2 の目的

| # | 内容 |
|---|------|
| 1 | **Phase B1 で **`report_instance_id` が非 NULL に設定された「安全」親 wallet** に紐づく **ledger 行だけ**に、**同じ `report_instance_id` を継承させる**設計を文書化する（**wallet の再更新はしない**）。** |
| 2 | **親 wallet が `NULL`／quarantine に分類される行に紐づく ledger には**自動投入**しない（**`ledger_parent_quarantine` 側**）。** |
| 3 | **`reply_sessions` は更新しない**（B3 と分離）。** |

---

## 2. 現在の前提（本番観測に基づく固定）

**B1 直後の状態**は **`M55_REPLY_WALLET_PHASE_B1_WALLET_PRODUCTION_UPDATE_RESULT_v1.md`** を参照。ledger の分類名は **`M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_RESULT_v1.md`** および **`m55_reply_wallet_phase_b_backfill_candidate_diagnostic.sql`** と整合させる。

| 前提 | 値 |
|------|-----|
| **Wallet `report_instance_id` 非 NULL** | **5** |
| **Ledger `report_instance_id` 非 NULL** | **0** |
| **Session `report_instance_id` 非 NULL** | **0** |
| **`ledger_inherit_from_safe_wallet_candidate`**（親が safe とみなす ledger） | **5** |
| **`ledger_parent_quarantine`**（親 wallet が safe ではない ledger） | **5** |
| **`ledger_orphan_manual_review`** | **0** |

※ **Ledger は行単位で分類される。** **`inherit`** と **`parent_quarantine`** は **同時には付けない**。上記は **異なる ledger 行**に対する件数であり、**wallet の件数 **8****（users）と **ledger 総行は一致しない**。**総行数や整合は **B2 の SELECT-only preflight** で再読する。**

---

## 3. 値のソース（機械的継承の案）

| # | 内容 |
|---|------|
| 1 | **リレーション:** **`reply_wallet_ledgers.wallet_id`** → **`reply_ticket_wallets.id`**（FK 相当の結合）。** |
| 2 | **コピー案:** **`reply_ticket_wallets.report_instance_id`** を **`reply_wallet_ledgers.report_instance_id`** に **同一の uuid 値でコピー**する（**新しい snapshot id を発行しない**。）。** |
| 3 | **前提条件（案）:** **`ledger.report_instance_id IS NULL`** であり、**親 **`wallet.report_instance_id IS NOT NULL`**。 |
| 4 | **除外（案）:** **親 wallet が quarantine 側**（`wallet_safe_candidate` に **含まれない**）に当たる ledger は **対象外**。** |
| 5 | **`dtr_report_snapshots` への ledger 直 JOIN はしない** — **真実のソースは既に wallet に載った値**とする（B1 の投入意味と整合）。** |

---

## 4. 絶対禁止

| # | 禁止 |
|---|------|
| 1 | **`reply_sessions` を `UPDATE` しない。** |
| 2 | **`reply_ticket_wallets` に **B1 以降の追加 UPDATE**を B2 と同時にしない**（本条のスコープ外・別承認）。** |
| 3 | **親 wallet が quarantine の ledger に **`report_instance_id` を機械投入**しない。** |
| 4 | **orphan ledger（親 wallet が存在しない ledger）に投入**しない。** |
| 5 | **`entitlements` archive 一括は B2 と混ぜない。** |
| 6 | **`NOT NULL`／FK／厳格 **`UNIQUE`** 追加は B2 ではしない。** |
| 7 | **Stripe 追加課金／商品棚 UI／Webhook 改修**は B2 の範囲外。** |

---

## 5. 必要な SELECT-only 診断（実行前）

**すべて `SELECT`。件数・ハッシュ／分類のみ。UPDATE 本文は別パケット。**

| # | 確認 |
|---|------|
| 1 | **`ledger_inherit_from_safe_wallet_candidate` とみなせる行が **5** 件のままか**（B1 後の再診断）。** |
| 2 | **`ledger_parent_quarantine` が **5** 件のままか**（親が safe でない ledger）。** |
| 3 | **`ledger_orphan_manual_review` が **0**か** |
| 4 | **Ledger の既存非 NULL（`ledger existing non-null`）が **0**か** |
| 5 | **親 wallet の非 NULL **`report_instance_id` が **5**件**（B1 証跡と一致）** |
| 6 | **`UPDATE` の影響見込み：** **ledger 非 NULL が **5**になる**（親 safe に紐づく対象のみが埋まる論理）**ことを **preflight 集計で読む** |
| 7 | **`reply_ticket_wallets`／`reply_sessions` の行セットが **B2 設計では変更されない**こと**（B2 は **ledger のみ**）** |

---

## 6. B2 実行 GO 条件（本条では満たさない）

| # | 条件 |
|---|------|
| 1 | **Preflight で **対象 **5** ledger 行**が **hash-only／分類**で再確認される** |
| 2 | **`ledger_parent_quarantine` **5** が **継承対象から除外**される**読み取り** |
| 3 | **orphan **0**** |
| 4 | **postflight／rollback 手順が文書化済み**（**`UPDATE` 本文は別 SSOT**。）** |
| 5 | **`UPDATE` SQL は別承認** |
| 6 | **オーナー承認** |

---

## 7. 現時点の判定

| 判定 | Verdict |
|------|---------|
| **B2 設計レビュー（本条）** | **GO** |
| **B2 実行（`UPDATE`／backfill）** | **NO-GO** |
| **次の成果物** | **B2 SELECT-only preflight packet**（**実行 SQL はまだ作らない**） |

---

## 8. Related

| Path | 用途 |
|------|------|
| `docs/ssot/M55_REPLY_WALLET_PHASE_B1_WALLET_PRODUCTION_UPDATE_RESULT_v1.md` | B1 完了証跡 |
| `docs/ssot/M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_RESULT_v1.md` | 候補件数ログ |
| `docs/ssot/M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_PACKET_v1.md` | 分類語彙 |

---

## 9. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — B2 ledger inherit 設計レビュー |
