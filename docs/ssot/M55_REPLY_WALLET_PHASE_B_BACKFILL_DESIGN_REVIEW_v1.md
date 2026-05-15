# M55_REPLY_WALLET_PHASE_B_BACKFILL_DESIGN_REVIEW_v1

Status: **Design-review SSOT only** — **DB を変更しない。** **SQL は実行しない。** **`UPDATE`/backfill 本文・本番 DML は記載しない。**  

Date: **2026-05-03**

Related:

- `docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_POSTFLIGHT_RESULT_v1.md`
- `docs/ssot/M55_REPLY_WALLET_ORPHAN_THREE_CASE_CLASSIFICATION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SMOKE_ORPHAN_QUARANTINE_POLICY_v1.md`
- `scripts/sql/staging/` 配下の **hash/count 系診断**（参照のみ — 本条にコピペしない）

---

## 1. Phase A 完了事実（運用ログ・証跡に基づく固定）

| # | 事実 |
|---|------|
| 1 | **本番での `report_instance_id`（uuid, nullable）単独追加が PASS と記録済み** — 正本は `M55_REPLY_WALLET_PHASE_A_PRODUCTION_POSTFLIGHT_RESULT_v1`。 |
| 2 | **DDL のみ。意図的な `UPDATE` や backfill は Phase A では実施していない。** |
| 3 | **三表とも `report_instance_id` はすべて NULL。** |
| 4 | **`wallet_user_without_snapshot_count = 3` と、smoke orphan に相当する監査単位 3 件は別 SSOT（隔離／quarantine）で管理。** |
| 5 | **`wallet_with_dtr_core_snapshot_count = 5` を、snapshot 側に根拠のある正常コホートとして設計資料上は保護論点に連結。** |

---

## 2. Phase B の目的（設計論点のみ）

| # | 目的 |
|---|------|
| 1 | **DTR_CORE_STATIC_V1 snapshot が存在し、ユーザー／wallet の対応が検証済みである場合のみ、返書側 `report_instance_id` に論理 ID を載せる道筋を検討する。推測・穴埋め一括適用は禁止（§4）。** |
| 2 | **orphan および smoke 監査線の 3 件には、`report_instance_id` を自動で載せない**（既存ガードと完全一致）。 |
| 3 | **`sessions_without_dtr_core_snapshot_count = 11` は、core snapshot を伴わない session 件数の総量である。一括 backfill の根拠にならない。** 誤結合は履歴保全と矛盾するため、§3・§7 とあわせ別途定義する。 |

---

## 3. Backfill 「候補」の論理的筋（クエリ文言は本条に載せない）

※ **本条は論理モデルのみ。** 実装には **別途 SELECT-only 診断パケット**と **証跠付きのキー選択**がある。

### 3.1 `reply_ticket_wallets`

| 論点 | 内容 |
|------|------|
| **候補根拠** | **`user_id` と、`dtr_report_snapshots`（**`product_id = DTR_CORE_STATIC_V1`**）の対応関係が **一意に証明できる**ときだけ、**返書側の **`report_instance_id`** に載せる **値のソース**を決める（ソースは **`dtr_report_snapshots` の主キー・アプリ SSOT が定める envelope 由来 ID など、契約上の単一ソース** と整合させる——**本条は実装名を確定しない**）。 |
| **注意** | **snapshot が無い `user_id`** は **論理候補外**。 |

※ **論理モデルだけを書く。** カラム名・型・参照式は **`M55_REPLY_*` のデータモデル／migration／アプリ実装との突合結果** が別資料で YES となること。  

### 3.2 `reply_wallet_ledgers`

| 論点 | 内容 |
|------|------|
| **継承候補** | **`wallet_id` が指す親ウォレット**の **`report_instance_id`** と **同一論理値に揃える**のが最小の依存グラフになる場合がある。**これは親が NULL でないときに限り安全。** |

### 3.3 `reply_sessions`

| 論点 | 内容 |
|------|------|
| **難しい理由** | **セッションは wallet とは独立した生成フロー**を持ち得る。**`user_id`・`core_profile_ref`・`theme`・`created_at`** などは **単独では証明ではない**。 |
| **リスク** | **`sessions_without_dtr_core_snapshot_count = 11` は総数のみ知っており **即 backfill で全件を繋ぐと誤リンクのリスク**が高い**。** **一括自動は最初から禁止候補**（§4）。 |

---

## 4. 絶対禁止（本条の読者が読み飛ばさないリスト）

| # | 禁止 |
|---|------|
| 1 | **smoke／orphan 確定監査単位としての 3 件**に **`report_instance_id` を機械的投入**しない。 |
| 2 | **`dtr_report_snapshots` が無い `user`** を **捏造 snapshot**や **推測 ID** で **埋める**こと。 |
| 3 | **`reply_sessions` を **一括**で任意の snapshot に紐付ける**。 |
| 4 | **`entitlements` の **`archived`** 一括・権利状態の恣意変更**。 |
| 5 | **`reply_ticket_wallets` / ledger / session / **`reply_documents` の削除**。 |
| 6 | **Phase C と呼ばれる段階** — **`NOT NULL` / FK / 厳格 UNIQUE の導入**を **本条の成果だけで自動 GO** しない。 |
| 7 | **Stripe での追加課金経路変更**および **商品棚 UI の変更**。 |

---

## 5. Phase B で先に済ますべき「診断」（すべて **SELECT-only／count-only／hash-only**）

| # | 診断論点 | 目的 |
|---|----------|------|
| 1 | **snapshot ありと判定される 5 wallet のうち、** **実際に **一意に** `report_instance_id`（または契約上の同一 ID）へ写せる候補が何件か** | **Backfill 上限の安全上界** |
| 2 | **wallet 行ごとの候補キー**（**生 `user_id` を出さず**、hash または集計のみ） | **誤結合の排除** |
| 3 | **ledger 行と wallet の対応**で **親 wallet に NULL 以外の候補が立つ行数** | **継承可否** |
| 4 | **session 行の候補** — **根拠のある場合のみ** | **誤結合防止** |
| 5 | **`sessions_without_dtr_core_snapshot_count = 11` の内在分類**（例：**smoke と非 smoke**、履歴種別との交差） — **カウントと分布のみ**。 |
| 6 | **`reply_sessions.core_profile_ref` の** **値あり／NULL／重複構造の分布** — **値本文はログにしない。** |
| 7 | **session と snapshot が **同一ユーザー**で **どう対応証明できるかの根拠**（仕様書・Webhook 順序・immutable 親キー） | **紐付けの正当性** |

**実装形態:** 既存の **hash 診断 SQL** 群を拡張するか、**新規 `SELECT` パケット**を **別 PR**で追加。**本条はパケット本文を持たない。**

---

## 6. Phase B を複数段階に分ける案（実行はいずれも **別承認**）

| 段階 | 名称 | 内容（設計） |
|------|------|----------------|
| **B0** | **SELECT-only 候補診断** | §5 の診断を **本番 READ 権限**で実施し、**チケットに集計のみ**保存。 |
| **B1** | **wallet のみ** | **snapshot 根拠が立つ行に限る**案内の **UPDATE 設計**（本文は別紙・承認後）。 |
| **B2** | **ledger のみ** | **B1 後の親 wallet からの継承**（親 NULL の行は **触れない**）。 |
| **B3** | **session** | **保留**または **追加診断が通った少数パターンのみ** — **11 件一括は初期案から外す**。 |
| **B4** | **postflight** | **件数・非 NULL・orphan 指標の再測定** — **preflight 相当の差分ゼロを定義**。 |
| **B5** | **rollback 設計** | **逆算 `UPDATE` または PITR** — **本文は DBA 管轄で別文書**。 |

---

## 7. Phase B の **実行** GO 条件（設計が揃うまで実施しない）

| # | 条件 |
|---|------|
| 1 | **書き込み対象が **snapshot 実在が証明された正常コホート**に **理論上閉じる**（手計算で **5 を超えない**など明文化）。 |
| 2 | **smoke orphan 3 件が **WHERE 条件で機械的に除外**される**ことの **プレビュー証明**（SELECT のみで再現可能）。 |
| 3 | **`sessions` 11 件**について **一括方針が却下され**、**ケース分割または保留**が文書化されている。 |
| 4 | **UPDATE 前後の期待件数**と **非 NULL 件数上限**が **チケットに先に書ける**。 |
| 5 | **rollback** が **オーナー承認済み**。 |
| 6 | **本番実行は `PHASE_B` 専用 execution gate**（未起案なら起案）— **本条単体では GO しない**。 |

---

## 8. 現時点の判定（本条の verdict）

| 項目 | 判定 |
|------|------|
| **Phase B backfill の本番実行** | **NO-GO。** |
| **Phase B の設計レビュー・診断計画の整理** | **GO**（本条を正本のたたき台とする）。 |
| **次の成果物候補** | **SELECT-only candidate diagnostic packet**（§5・B0） — **別ファイル・別承認**。 |

---

## 9. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-05-03 | 初版 — Phase B backfill 設計レビュー SSOT（実行なし） |
