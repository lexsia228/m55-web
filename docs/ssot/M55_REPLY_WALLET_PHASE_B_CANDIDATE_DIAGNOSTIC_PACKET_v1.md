# M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_PACKET_v1

Status: **Read-only diagnostic packet — SQL script + operational SSOT** — **この文書は本文以外で DB に触れない。** **UPDATE／backfill／本番は別承認。**  

Packet revision: **v2**（本文） · Last updated: **2026-04-28**

Script:

- `scripts/sql/production/m55_reply_wallet_phase_b_backfill_candidate_diagnostic.sql`

Related:

- `docs/ssot/M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_RESULT_v1.md` — **本番 SELECT-only 診断の観測値・判定 SSOT（件数のみ）**
- `docs/ssot/M55_REPLY_WALLET_PHASE_B_BACKFILL_DESIGN_REVIEW_v1.md`
- `docs/ssot/M55_REPLY_WALLET_PHASE_A_PRODUCTION_POSTFLIGHT_RESULT_v1.md`

**秘密情報・サービスキー・DB の URL は記載しない。**

---

## 1. 診断の目的（なぜあるか）

| # | 目的 |
|---|------|
| 1 | Phase B で将来あり得る backfill 対象の **件数目安**を読み取りだけで得る。 |
| 2 | **smoke orphan 3 件および snapshot 無し側** が **自動候補に混ざらない**論理になるか **`candidate_status`** で可視化する。 |
| 3 | **session 側は一括自動 backfill が危険**という設計判断を、**カウントと `session_candidate_needs_stronger_proof`** で強調する。 |

---

## 2. 実行対象・禁止

| # | 内容 |
|---|------|
| 1 | **本番データベース上で **SELECT のみ** を許可運用側が実行。**（staging／shadow での論理検証は別許可。** |
| 2 | **本条・当該 SQL に `UPDATE`／`DELETE`／`INSERT`／`ALTER`／`CREATE`／`DROP` は含まれない**。 |
| 3 | **backfill は実行しない** — **`PHASE_B_BACKFILL_DESIGN_REVIEW`** の NO-GO を維持**。 |

---

## 3. 実行モデル（SECTION 単独実行を推奨）

| # | 内容 |
|---|------|
| 1 | **Supabase SQL Editor**では、**複数 `SELECT` を一度に実行すると結果パネルが最後の結果セットに偏りやすい。** 集計を確実に読むには **SECTION ごとにコピーして実行**する。 |
| 2 | **推奨読み取り順（集計のみ）:** **SECTION 2（wallet aggregate）→ SECTION 4（ledger aggregate）→ SECTION 6（global summary）。** 各 SECTION は **`WITH`** を含む **単一クエリとして自己完結**している。 |
| 3 | **SECTION 1 / 3 / 5**は行単位・補助分布用。**集計だけなら SECTION 2 / 4 / 6 で足りる**ことが多い。 |
| 4 | **`SET` で search_path を変えない。** DDL／DML は含めない。 |

---

## 4. Fixed SQL 方針と既知修正（ソース）

| # | 内容 |
|---|------|
| 1 | **`SELECT` のみ。** **`UPDATE` / `INSERT` / `DELETE` / `ALTER` / `DROP` / `CREATE` / `SET` は禁止**（本条・スクリプト本文に記載しない）。 |
| 2 | **生 `user_id`**は返さない（**`md5` 済みのみ**許容）。 **payload／snapshot JSON 本文／メールなどは返さない。** |
| 3 | **SECTION 2（wallet aggregate）**の初版に **`FROM ws_class` が欠落**しており **`candidate_status`** が **`ws_class`** のスコープ外として解決できずエラーになった。** **DB への書き込みはなかった。** Fixed 版では **`FROM ws_class`** を付与済み。 |
| 4 | **DML／backfill 候補の実行文は本パケットに書かない** — 別 SSOT と別承認。 |

※ **スクリプト構成一覧**は §7。

---

## 5. Phase B の分割ラベル（B1 / B2 / B3）

**観測値と GO／NO-GO の固定は **`M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_RESULT_v1.md`** が SSOT。**

| ラベル | スコープ | 本条での位置づけ |
|--------|-----------|-------------------|
| **B1** | **wallet のみ** | 機械的起案となる **safe wallet** 件数目安は **SECTION 2**。 |
| **B2** | **ledger のみ**（親 wallet と整合） | **SECTION 4** で **inherit 候補／親 quarantine／orphan** を読む。 |
| **B3** | **session** | **`session_candidate_needs_stronger_proof`** と **`session_quarantine`**（列の意味は §10）を **SECTION 5（行）／SECTION 6（一行サマリー）** で読む。**一括自動 backfill は設計上リスクが高く、観測だけでは実行 GO を出さない。** |

---

## 6. 出力ポリシー（プライバシー）

| # | 方針 |
|---|------|
| 1 | **`md5` で **user_id 相当の文字列**をハッシュ。** payload、envelope、checkout 文字列、snapshot JSON、email は返さない。** |
| 2 | **ユーザ由来の識別には `md5(text)`（PostgreSQL 組み込み、32 hex）を使用。より強いハッシュは環境判断。** |
| 3 | **snapshot の PK（uuid）については、`md5(id::text)` を **`hashed_report_instance_key_candidate_order1`** とし **生 UUID を避ける。** |
| 4 | **theme は辞書粒度の値としてのみ**出力（PII とみなされるカスタム文字列環境では **追加マスク**。 |

---

## 7. スクリプト構成（論理）

| Section | 内容 |
|---------|------|
| **1** | **wallet：行単位、`candidate_status`、`dtr_core_snapshot_count`、ハッシュ。** |
| **2** | **wallet：集計 safe／quarantine／smoke に近いカウント。** |
| **3** | **ledger：行単位・親walletの候補に対する説明フラグ。** |
| **4** | **ledger：集計。** |
| **5** | **session：行単位＋ `core_profile_ref`／theme のバケツ分布のみ。** |
| **6** | **一行サマリー：設計レビューで命名したカウンターに近い名前。** |

**`candidate_status` の文言**は **設計レビュー §と一致**させることを意図する。

---

## 8. `candidate_status` 語彙と意味（固定）

### Wallets（例）

| 値 | 意味（概ね） |
|----|----------------|
| **`wallet_safe_candidate`** | **`DTR_CORE_STATIC_V1` snapshot がちょうど 1、`report_instance_id` NULL、`smoke_user%` でない**。 |
| **`wallet_no_snapshot_quarantine`** | **snapshot が 0／smoke とみなされるパターン／（smoke と 1 snapshot の稀ケースでも安全側へ）**。 |
| **`wallet_multiple_snapshot_manual_review`** | **同一プロダクトキー関連で複数行とみなれる場合（手動確認）。** |
| **`wallet_already_set_manual_review`** | **`report_instance_id` が埋まっている**。 |

### Ledgers（例）

| 値 | 意味 |
|----|------|
| **`ledger_inherit_from_safe_wallet_candidate`** | 親 wallet が `wallet_safe_candidate`。 |
| **`ledger_parent_quarantine`** | **親が safe ではない**。 |
| **`ledger_orphan_manual_review`** | **親wallet行が無い**。 |
| **`ledger_already_set_manual_review`** | ledger 側で既に `report_instance_id` が非 NULL。 |

### Sessions（例）

| 値 | 意味 |
|----|------|
| **`session_candidate_needs_stronger_proof`** | **ユーザに core snapshot が 1つ以上見えるがセッション紐付けは別証明がいる**。 |
| **`session_no_snapshot_quarantine`** | **ユーザに対応 snapshot が無い**。 |
| **`session_smoke_quarantine`** | **`smoke_user%` とみなすパターンに一致**。 |
| **`session_already_set_manual_review`** | **session の `report_instance_id` が非 NULL**。 |

---

## 9. wallet／session に関する方針（本文に DDL は書かない）

| # | 方針 |
|---|------|
| 1 | `wallet_safe_candidate` を満たす論理だけを第一段階の将来 UPDATE 検討に使う（本条ではコード化しない）。 |
| 2 | ledger は親 wallet から同値継承が自然だが、親が quarantine のときは inherit 前提にしない。 |
| 3 | `session_candidate_needs_stronger_proof` が付いても、自動 UPDATE は書かない（厳密証明が別途必要）。 |
| 4 | **`sessions_without_dtr_core_snapshot_count` の総量問題**は **`session_no_snapshot_quarantine`** 等のカウントと関連して読むが **本条単体では解決宣言しない**。 |

---

## 10. 集約一行（SECTION 6）の列説明（参考）

| 列名方向 | メモ |
|----------|------|
| `wallet_safe_candidate_count` | `wallet_candidate_status = wallet_safe_candidate`。 |
| `wallet_quarantine_or_review_count` | wallet_safe 以外。 |
| `ledger_safe_candidate_count` | inherit が付く親 safe。 |
| `ledger_quarantine_count` | 親が quarantine 側。 |
| `ledger_orphan_manual_review_count` | 親 wallet 不存在。 |
| `ledger_already_set_manual_review_count` | ledger が既に non-NULL。 |
| `session_candidate_needs_stronger_proof_count` | 証明追加が前提。 |
| `session_quarantine_count` | `session_no_snapshot_quarantine` と `session_smoke_quarantine` の合計。 |
| `session_already_set_manual_review_count` | session が既に non-NULL。 |
| `any_existing_report_instance_id_count` | 三表の non-NULL の合計。 |

※ Phase A 後は `any_existing_report_instance_id_count` が **0** が期待値。

---

## 11. STOP・GO はこのパケットでは出さない

| Verdict | 内容 |
|---------|------|
| **本条が肯定するもの** | **読み取り診断の設計のみ。** |
| **否定するもの** | **本条単体での backfill 実行 GO、`UPDATE` のリポへの追加**。 |
| **観測ログ（件数）** | **`M55_REPLY_WALLET_PHASE_B_CANDIDATE_DIAGNOSTIC_RESULT_v1.md`** に本番 SELECT-only 結果を SSOT 化済み。 |
| **次の成果物案** | **B1／B2 設計レビュー SSOT**、**B3 session quarantine 継続 SSOT**（**実行用 SQL はまだ作らない** — **BACKFILL_DESIGN_REVIEW** の NO-GO と整合）。 |

---

## 12. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-05-03 | 初版 — Phase B SELECT-only diagnostic packet |
| v2 | 2026-04-28 | **SECTION 単独実行・Supabase 表示の注意**、**fixed SQL（`FROM ws_class`）**、**RESULT SSOT へのリンク**、**B1／B2／B3 ラベル**、節番号整理 |
