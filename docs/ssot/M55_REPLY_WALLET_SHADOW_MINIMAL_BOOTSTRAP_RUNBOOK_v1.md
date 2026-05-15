# M55_REPLY_WALLET_SHADOW_MINIMAL_BOOTSTRAP_RUNBOOK_v1

Status: **Human execution runbook** — **この文書は DB を変更しない。** 実施は **オーナー承認・非本番接続確認のうえ手操作のみ。** **本文に実行可能 DDL を新規掲載しない。手書き `CREATE TABLE` は扱わない。**

Date: 2026-04-29  

Related:

- `docs/ssot/M55_REPLY_WALLET_SHADOW_MINIMAL_BOOTSTRAP_DRAFT_v1.md`（設計ドラフト、正本）
- `docs/ssot/M55_REPLY_WALLET_SHADOW_SCHEMA_DEPENDENCY_MAP_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SHADOW_BOOTSTRAP_EXECUTION_PACKET_v1.md`
- `scripts/sql/staging/m55_reply_wallet_shadow_bootstrap_preflight.sql`
- `scripts/sql/staging/m55_reply_wallet_phase_a_nullable_only_staging.sql`（適用後の **PART 1 検証**用）
- `supabase/migrations/` 内の **下記ファイル名**（適用ソースは **リポジトリ上の該当ファイル**のみ）

---

## 1. 目的

| # | 内容 |
|---|------|
| 1 | **m55-soul-shadow（非本番・shadow プロジェクト想定）** を、`m55_reply_wallet_phase_a_nullable_only_staging.sql` の **Phase A PART 1（読み取りのみ）** が **成立する見通しがある** **最小 public スキーマ**に近づける。 |
| 2 | **本番 DB は一切触らない。** 接続対象・適用承認は **本番でないこと**を何度も確認する。 |
| 3 | **本番からのデータコピー・実在 PII の持ち込みをしない。** 空表または将来のダミー入力は **別承認** とし、本条の成功定義に必須とはしない。 |
| 4 | **手書き DDL／手貼り簡易スキーマは使わない。** **リポジトリ `supabase/migrations` のファイルを唯一の正として、ファイル単位で**反映する（`M55_REPLY_WALLET_SHADOW_PREFLIGHT_OBSERVATION_AND_MANUAL_CREATE_REJECTION_v1.md` と同旨）。 |

---

## 2. 適用候補 migration（Phase A PART 1 最小 bootstrap）

**読み取り検証の一次ソースは常にリポ内の該当ファイル全文。** 本条は **ファイル名のみ**列挙する。

| migration ファイル（`supabase/migrations/`） | 役割（概念） |
|----------------------------------------------|--------------|
| **`20260416000000_reply_system_data_layer_v1.sql`** | reply データ層（sessions / documents / ticket wallets / wallet ledgers を **同一 migration**で定義）。 |
| **`20260420000000_dtr_drafts_and_report_snapshots.sql`** | `dtr_guest_drafts` と `dtr_report_snapshots` を **同一 migration**で定義（PART 1 の orphan カウントに `dtr_report_snapshots` が必要）。 |
| **`20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql`** | **上記 DTR 両表**に対する後追い列の整合（論点名はファイル頭コメント準拠）。**先に `202604200...` が済んでいること。** 末尾に **スキーマキャッシュ再読込用の通知のみ**が含まれる場合がある。 |

### `20260421000000_dtr_postgrest_schema_reload.sql` の扱い

| 選択 | 説明 |
|------|------|
| **任意／保留** | 当該ファイルは **DDL を含まず通知のみ** が主目的のスキーマ。**`202604220...` の末尾にも同種の通知があれば二重になる可能性がある**（害は通常小さいが、運用で重複を避けてもよい）。 |
| **含める場合** | Supabase API（PostgREST）が新規列を認識しない事象が疑われるときの **追加の再読込**、または **本番適用順の忠実再現**をしたいとき。 |
| **省略する場合** | **テーブル／列の DDL 完了だけ**を先に満たしたいとき。API 経路の検証は別タスク。 |

**本番準拠を壊す論点ではなく、クライアント／ゲートウェイのキャッシュ挙動のみに関わる。**

---

## 3. 適用しない migration（この runbook の範囲外）

| migration または区分 | 理由 |
|----------------------|------|
| **`20260417000000_m55_reply_generate_commit_rpc.sql`** | Phase A PART 1 の **SELECT は必須でない。** **データ挿入を含むため**、最小セットから **除外**（別承認で検討）。 |
| **`20260306000000_phase1_entitlements_ssot.sql`** | **`stripe_events` 基底への前提**が無いと失敗しうる。購入／権利 SSOT 周辺は **最小 bootstrap 外**。 |
| **`20260308000000_one_time_checkout_fulfillment.sql`** | **`one_time_fulfillments` 等は PART 1 必須ではない。** |
| **`20260306100000_premium_invoice_dtr_grants.sql`** / **`20260325000000_consult_room.sql`** | **PART 1 核と無関係**（dependency map と同様）。 |
| **`entitlements`／`stripe_events`** を前提とするチェーン全般 | **本条のスコープ外**。既存 shadow の `entitlements` との **共存衝突** が出たら §7 で停止。 |

---

## 4. 実行前チェック（適用の直前までに必ず確認）

| # | チェック項目 |
|---|----------------|
| 1 | **接続先が m55-soul-shadow（許可リスト上の shadow プロジェクト）であること。** ダッシュボードの **project 名／ref** を人間が目視で照合する。 |
| 2 | **本番 project ではないこと。** 本番 URL・本番 ref・本番環境変数と混同していないこと。 |
| 3 | （可能なら）**Table Editor または preflight** で **`public` に既存テーブルが `entitlements` のみ**（または本条で想定する残骸のみ）であることを記録する。** 想定外の大量オブジェクトがあるときは停止し、差分を確認する。** |
| 4 | **失敗時に shadow を捨て直せる**こと（Branching の新規 branch、別 project、または許可された破棄）。**本番は論外。** |
| 5 | **service role キー・DB 接続 URL・秘密鍵をチケット・チャット・本 runbook に書かない。** 本人が安全な場所からのみ使用。 |
| 6 | （推奨）**`m55_reply_wallet_shadow_bootstrap_preflight.sql`** を **適用前にも**実行し、現状をログに残す（読み取りのみ）。 |

---

## 5. 適用手順案（概念 — 本文に SQL 本体は書かない）

1. **環境:** Supabase SQL Editor または **同等の非本番 DDL 実行手段**で、**単一トランザクションにするかどうかはオペレータ判断**（ホストの制限に従う）。
2. **単位:** **migration ファイル単位**で順に実行する。**複数ファイルを結合して貼り付けず、失敗箇所を特定しやすくする。**  
3. **順序（固定）:**  
   - 第1: `20260416000000_reply_system_data_layer_v1.sql`  
   - 第2: `20260420000000_dtr_drafts_and_report_snapshots.sql`  
   - 第3: `20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql`  
4. **任意:** **`20260421000000_dtr_postgrest_schema_reload.sql`** — **第2と第3のあいだ**、または **第3のあと**（環境の再読込論点に応じて **1 回だけ**を目安）。 **`202604220` ですでに通知が走るなら省略可**（§2 参照）。  
5. **各ファイルの適用後:** **Table Editor** または **`information_schema` 相当の読み取り**で、**その段階で期待されるテーブル名の出現**を確認してから次へ進む。  
6. **いずれかの段階でエラーが出たら即 STOP** — 続行しない。原因を記録し §8 を参照。  

**禁止:** 複数 migration を **順不同**に貼る、**手書き DDL で不足を補う**、**本文にないファイルを混ぜる**（承認なし）。

---

## 6. 成功条件

| # | 条件 |
|---|------|
| 1 | **`reply_ticket_wallets` が存在する。** |
| 2 | **`reply_wallet_ledgers` が存在する。** |
| 3 | **`reply_sessions` が存在する。** |
| 4 | **`reply_documents` が存在する**（`202604160...` 由来の単一ファイル整合）。 |
| 5 | **`dtr_report_snapshots` が存在する。** |
| 6 | **`dtr_guest_drafts` が存在する**（`202604200...` 由来の単一ファイル整合）。 |
| 7 | **`m55_reply_wallet_phase_a_nullable_only_staging.sql` の PART 1** が **すべて `SELECT` として**論理的に実行可能な見通し（**実際の実行は適用承認後かつ非本番のみ**）。 |
| 8 | **PART 2（nullable の列追加）は本条の成功には含めない — さらに別承認。** |

---

## 7. 停止条件

| # | 内容 |
|---|------|
| 1 | **対象環境が本番に見える**、または **確信が持てない**とき。 |
| 2 | **migration が前提不足で失敗**（例: 必要な組み込み関数が無い、権限不足など）。 |
| 3 | **既存 `entitlements`／残存オブジェクトとの衝突**（名前、RLS、または手元の方針矛盾）で解消できないとき。 |
| 4 | **手書き DDL が必要になりそうなとき** — 停止し、`MINIMAL_BOOTSTRAP_DRAFT` の停止条件に戻る。 |
| 5 | **本番と列定義が一致しない**という **既知のずれ** が残り、verbatim 適用以外が必要なとき。 |
| 6 | **`202604170...` を「ついでに」流そうとするとき** — **本条の範囲外。別承認。** |

---

## 8. Rollback／破棄方針

| # | 方針 |
|---|------|
| 1 | **shadow 専用プロジェクト**であり、**許可された場合はプロジェクト／branch の再作成で捨て直す**を **DROP 乱発より優先**。 |
| 2 | **個々のテーブルを手作業で `DROP` して部分ロールバックする**のは、**参照関係の誤りリスクが高い**。原則 **一覧どおりの clean 再構築または新規 shadow**。 |
| 3 | **本番 DB はロールバック対象に含めない。** |

---

## 9. 次のゲート

| 順序 | ゲート |
|------|--------|
| 1 | **本 runbook のコミットおよびレビュー**。 |
| 2 | **適用する／しない**の **別承認**（インフラオーナー・DBA）。 |
| 3 | **承認後のみ**、非本番 shadow で migration を **ファイル順に**適用（本条 §5）。 |
| 4 | **適用後、`m55_reply_wallet_phase_a_nullable_only_staging.sql` の PART 1 を読み取りのみ実行**し、結果を記録。 |
| 5 | **PART 2（nullable 列の追加）はさらに別承認** — `M55_REPLY_WALLET_PHASE_A_NULLABLE_ONLY_EXECUTION_PACKET_v1.md` 等と整合。 |

---

## 10. 厳守（再掲）

**文書のみのアーティファクト作成時点では SQL 実行・DB 接続・migration 適用をしない。** **実行可能 DDL を新規ファイルとして追加しない。** **手書き `CREATE TABLE` は使わない。** **本番 DB を触らない。** **Phase A APPLY（PART 2）を本条だけで実施しない。** **Stripe／Webhook／商品棚 UI は触らない。** **秘密鍵・service role・DB URL を記載しない。**

---

## 11. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-29 | 初版 — shadow 最小 bootstrap の手操作 runbook |
