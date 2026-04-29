# M55_REPLY_WALLET_PHASE_B1_WALLET_BACKFILL_DESIGN_REVIEW_v1

Status: **設計レビュー SSOT（文書のみ）** — **`UPDATE`／backfill／DDL は本条に書かず、本条単体でも実行しない。**  

Scope: **Phase B1 — wallet テーブルのみ**、`reply_ticket_ledgers` / `reply_sessions` は対象外。  

Evidence:

- **`docs/ssot/M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_RESULT_v1.md`**（コミット済み · 本番 SELECT-only）

Prerequisites（共有前提）:

- **Phase A** により **`report_instance_id`（uuid、`NULL` 可）** は **wallet／ledger／session の 3 テーブルに存在**。**現時点 **`report_instance_id` は運用上すべて `NULL`**（候補診断上 **`any_existing_report_instance_id_count = 0`**）。**
- **`dtr_report_snapshots`** は **`id uuid`** を主キーとし、`**product_id`** 含む運用モデルがある（immutable snapshot）。**

**秘密鍵・service role・DB URL・生 `user_id` は記載しない。**

Related:

- `docs/ssot/M55_REPLY_WALLET_PHASE_B_BACKFILL_DESIGN_REVIEW_v1.md`
- `scripts/sql/production/m55_reply_wallet_phase_b_backfill_candidate_diagnostic.sql`
- （将来）**B1 SELECT-only preflight packet** · **UPDATE 実行文は別 SSOT／別 PR**

---

## 1. B1 の目的

| # | 内容 |
|---|------|
| 1 | **製品データとして一意に決まる **`DTR_CORE_STATIC_V1`** に紐づく snapshot が **ちょうど 1 つ**あり、論理上分類が **`wallet_safe_candidate`** となる正常 wallet **最大 5 件**のみを対象として、**その行の `reply_ticket_wallets.report_instance_id` にのみ値を入れる設計を検証・文書化する。** |
| 2 | **`smoke`／snapshot 無し／snapshot 複数／既に値あり** に該当する **残りの wallet（現観測では quarantine／review とまとめて **3 件****）へは入れない。** |
| 3 | **ledger と session は B1 で更新しない。** B2／B3 は別ラベルの別フェーズであり、本条の **GO で暗黙移行しない。** |

---

## 2. 候補数（証拠ログと一致させる値）

**出典：** `M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_RESULT_v1.md`  

| メトリクス（観測名） | 値 | メモ |
|----------------------|-----|------|
| **`wallet_safe_candidate_count`** | **5** | B1 の機械的起案上限（wallet のみ） |
| **`wallet_quarantine_or_review_count`** | **3** | B1 で **除外維持**（smoke／orphan を含む quarantine／review cohort） |
| **`any_existing_report_instance_id_count`**（三表合算） | **0** | Phase A 直後との整合：**非 NULL がまだ存在しないこと** の確認済みログ |

本条では **ledger／session の件数は B1 実行可否の必要条件ではなく**（B1 は wallet のみ）、**参照用にのみ**親 SSOTまたは診断に触れる：**`ledger_safe_inherit_candidate`** = 5 は **将来 B2** の論点。

---

## 3. `report_instance_id` の値ソース設計（要決裁事項）

**列 `reply_ticket_wallets.report_instance_id`** に入れる **`uuid`** の **意味論**を本条で明示する。**まだ DDL は変えず、本条はソースの選定のみ。**

### 3.1 案 A — **`dtr_report_snapshots.id` をそのまま指す**

| 項目 | 内容 |
|------|------|
| **概要** | 対象 `user_id` と **`product_id = 'DTR_CORE_STATIC_V1'`** の snapshot 行を **JOIN／相関により 1 行に限定したうえで**、その行の **`dtr_report_snapshots.id`** を wallet に載せる。 |
| **`UNIQUE (user_id, product_id)`**（snapshot） | **同一ユーザー・同一プロダクトキーで複数行が許されない**ため、snapshot が複数となるケースと **クエリ側の単一証明が矛盾する論点がある**ときは **`wallet_multiple_snapshot_manual_review`** 側で止める（別プロセス／手順）。 |

### 3.2 案 B — 将来 **`report_instances` のような別テーブル**を正とする

| 項目 | 内容 |
|------|------|
| **概要** | 購読・請求・アクセス境界の単位として **独立した **`report_instances`**（または類似名）** を導入し、wallet がそこへの **FK** を持つ。 |
| **本条での位置づけ** | **未導入のため B1 で即採用はしない。** 将来案として **DDD／運用モデルとの整合が取れたときに別マイルストーンで評価。** |

### 3.3 **`dtr_report_snapshots.id` を暫定の「報告インスタンス ID」として扱うときの是非**

| | 内容 |
|--|------|
| **利点** | **既存・不変データ**にのみ基づき、値を捏造しない。** **`uuid`** 型 **`dtr_report_snapshots.id`** と **wallet の `report_instance_id`** の **型整合**。** **Phase B 実行のたたき台がある（ドラフト staging 資料と整合できる）。 |
| **リスク** | 名称が **`report_instances`** と混同されると、後から **モデル変更で列意味が変わる**リスク。** 将来 FK／NOT NULL 化するときに **migration の再解釈**が必要。** **アプリケーションが「報告」の境界を別列で持つように進化すると**、`report_instance_id` の意味読みが二重になる。 |

### 3.4 型

| # | 内容 |
|---|------|
| 1 | **`dtr_report_snapshots.id`** はスキーマ上 **`uuid`**。** **`reply_ticket_wallets.report_instance_id`** も **`uuid`** で追加されている前提。** **案 A の場合、代入は型について **そのままで整合**。 |
| 2 | **`product_id`** は **`WHERE product_id = 'DTR_CORE_STATIC_V1'`** に **限定すること**。** 他 **`product_id`** の snapshot が同一ユーザに複数種ある場合でも、本 B1 で参照する **`dtr_report_snapshots`** の行集合は **`DTR_CORE_STATIC_V1`** のみ。** |

---

## 4. 絶対禁止（B1 が守るべき線）

本文は **運用規約**。**本条だけで DDL／DML を実施しない。**

| # | 禁止 |
|---|------|
| 1 | **snapshot が **0** の wallet に **`report_instance_id` を捏造して入れない**（JOIN 結果が無い行は対象外）。 |
| 2 | **`smoke_user%`** パターン（診断で定義した smoke 論理相当）への **自動投入はしない。** |
| 3 | **`DTR_CORE_STATIC_V1` に対応する snapshot が **複数現れる**状態の wallet は **自動投入しない**（複数検出はレビューや別手順）。 |
| 4 | **ledger／session は B1 と同じトランザクションまたは同一フェーズでは更新しない。** |
| 5 | **`entitlements` の archive 一括**を B1 と混ぜない。 |
| 6 | **wallet／ledger／session／reply_documents などの削除**を B1 の前提にしない。 |
| 7 | **NOT NULL 化／FK／厳格 UNIQUE／制約強化は B1 ではしない** — **Phase A と同様、`NULL` でのロールフォワードのみを許容**。 |
| 8 | **Stripe 追加課金・請求モデル変更・商品棚／フロントの契約コード変更は B1 の範囲外**。 |

---

## 5. 必要な SELECT-only 事前診断（B1 UPDATE より前）

**すべて `SELECT` のみ**。**結果は hashed id のみまたは件数のみ**でチケット化し、**生 `user_id` を転記しない。**

| # | 診断の目的 |
|---|------------|
| 1 | **候補 5 件**が、実行直前にも **`wallet_safe_candidate` と同等の条件**で **snapshot が **ちょうど 1 つ** に留まっているか。** |
| 2 | **`dtr_report_snapshots.id`** がすべて **`uuid`** として読めること（情報スキーマや型の再確認のみ・本文はログにしない）。 |
| 3 | **対象 wallet の **`report_instance_id` がすべて `NULL`**。 |
| 4 | **`smoke`／orphan に該当する 3 件**が **JOIN 側から除外されている**ことを **集計またはハッシュ行単位**で確認。 |
| 5 | **`wallet_safe_candidate_count` が実行前も **5**（または運用側が承認した件数のみに一致）**。 |
| 6 | **`UPDATE` 成功後に三表あわせ **`report_instance_id` が非 NULL の行が wallet で **ちょうど 5**になる想定**か（ledger／session は引き続き `NULL`**）を **postflight 集計として定義**。** |
| 7 | **ロールバック可能性：** Phase A と同様 **`report_instance_id` は Nullable** のため、**承認済み運用手順のもとでのみ**、問題時は **`NULL` に戻す経路が理論上可能**（実行は別変更管理・本条は文言のみ）。 |

---

## 6. B1 実行 GO 条件（まだ本条では達成しない）

| # | 条件 |
|---|------|
| 1 | **`report_instance_id` の値ソース**が **運用・アプリ・データオーナーの合意として確定している**（案 A / 案 B など）。 |
| 2 | **対象 5 行**が **ハッシュのみ**で **再現可能に特定済み**。 |
| 3 | **smoke／orphan の 3 件除外**が **preflight で再確認済み**。 |
| 4 | **preflight／postflight／ロールバック手順が文書化されている**（**`UPDATE` 本文は別 SSOT**。）。 |
| 5 | **`UPDATE` SQL と実行ウィンドウ**は **別 SSOT と別の承認**（本条は設計のみ）。 |
| 6 | **オーナー承認**。 |

本条は **これらすべてを満たすものではなく**、満たすまで **実行 NO-GO**。

---

## 7. 現時点の判定

| 判定 | Verdict |
|------|---------|
| **B1 設計レビュー（本条）** | **GO** |
| **B1 実行（`UPDATE`／backfill／本番適用）** | **NO-GO** |
| **次の成果物（推奨）** | **`B1 SELECT-only preflight` 用 PACKET SSOT を新規作成** — **UPDATE 本文はまだ書かない** |

---

## 8. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-28 | 初版 — B1 wallet-only backfill の設計レビュー |
