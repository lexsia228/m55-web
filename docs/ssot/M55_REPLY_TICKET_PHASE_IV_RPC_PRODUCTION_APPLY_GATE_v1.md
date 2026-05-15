# M55_REPLY_TICKET_PHASE_IV_RPC_PRODUCTION_APPLY_GATE_v1

Status: **`public.m55_reply_ticket_fulfill_checkout_event` を本番（m55-soul-core／main／PRODUCTION）へ適用するかどうかの判断ゲート**。**本条単体での適用許可または実行指示ではない。**  

Recorded: **2026-04-28**

Upstream:

- **Preflight 結果 SSOT:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_PREFLIGHT_RESULT_v1.md`
- **Preflight packet:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_PREFLIGHT_PACKET_v1.md`
- **Preflight SQL:** `scripts/sql/production/m55_reply_ticket_fulfillment_rpc_preflight.sql`
- **RPC 候補（ソース既定）:** `scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql`
- **静的監査:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_CANDIDATE_STATIC_AUDIT_v1.md`
- **RPC 仕様（あれば設計側で追補）:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_FUNCTION_SPEC_v1.md`

**秘密・Webhook secret・DB URL・raw user_id・payload は本文に載せない。**

---

## 1. APPLY 対象

| 項目 | 内容 |
|------|------|
| **オブジェクト** | **`public.m55_reply_ticket_fulfill_checkout_event`** |
| **DDL のみ** | **`CREATE OR REPLACE FUNCTION`** |
| **`LANGUAGE`** | **`plpgsql`** |
| **`SECURITY DEFINER`** | **必須** |
| **`SET search_path`** | **`public`** |
| **`RETURNS`** | **`jsonb`** |
| **由来パス（リポジトリ）** | **`scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql`** |

### 1.1 production 適用時の SQL の扱い

- **本番実行直前には、適用ファイルの全文を再レビューする**（差分混入・誤ブランチの防止）。
- **選択肢:**
  - **A:** staging 候補をそのまま本番ウィンドウで実行する（レビュー痕跡を ticket／PR で残す）。
  - **B:** `scripts/sql/production/` 配下へ **production 専用コピー**を切り、**コミット hash とファイルパスを apply 記録に固定**してから実行する。
- **推奨:** 運用規律上 **B（production 専用ファイル＋適用記録でのパス一意化）**を優先検討。いずれの場合も **「どのパス／どの commit の全文を APPLY したか」** を事後 SSOT で追えるようにする。

---

## 2. APPLY 前条件（すべて満たすこと）

適用ウィンドウの **直前**に `m55_reply_ticket_fulfillment_rpc_preflight.sql` を **再度 SELECT-only 実行**し、結果が **意図と一致**していること。

| # | 条件 |
|---|------|
| 1 | **RPC preflight 再実行済み**（本番 CONNECT 先の明示確認後） |
| 2 | **`rpc_function_already_exists = false`** **または** 既存関数があり **`signature 衝突なし**（identity args / result が候補と一致）** |
| 3 | **`required_columns_matched_out_of_30 = 30`** かつ **`required_columns_exist = true`** |
| 4 | **`partial_unique_index_exists = true`** |
| 5 | **`ledger_check_allows_purchase_grant = true`** かつ **`ledger_check_allows_purchase_source = true`** — 併せて **CHECK 定義全文の目視確認**（ヒューリスティックのみに依存しない） |
| 6 | **`baseline_counts_ready = true`** |
| 7 | **`blocking_gap_count = 0`** |
| 8 | **`rpc_preflight_ready = true`** |
| 9 | **適用時点の Git commit hash（および適用ファイルパス）を記録** |
| 10 | **接続・実行先が `m55-soul-core` / `main` / PRODUCTION** であることを **オペレータが二重確認**（UI／接続ストリング方針に従う。秘密値はログに書かない） |

**補足:** 前回 preflight と結果が異なる場合は **§5 STOP** を発動して原因切り分け後にのみ再検討する。

---

## 3. APPLY 範囲（許可される変更の明示）

| 許可 | 禁止／今回しない |
|------|------------------|
| **単一関数の `CREATE OR REPLACE FUNCTION` のみ** | **`CREATE TABLE`／`ALTER TABLE`／`CREATE INDEX`／`DROP`** |
| 上記に含まれる **RPC 本体定義のみ** | **既存テーブルの行に対する DML**（wallet／ledger／`stripe_processed_events` の事前・事後データ操作を gate 対象 APPLY に含めない） |
| ファイル内 **`REVOKE`/`GRANT` はコメントのまま**、**または今回ウィンドウでは実行しない** | **権限変更を計画なく付帯実行** |
| — | **Webhook route の変更** |
| — | **Checkout API の変更** |

---

## 4. APPLY 後 postflight（観測のみ）

**適用完了後、できるだけ同一セッション／短時間内に**実施。**行改変がないことを主眼**にする。

| # | 確認 |
|---|------|
| 1 | **`public.m55_reply_ticket_fulfill_checkout_event` が存在** |
| 2 | **`pg_get_function_identity_arguments`** が **`text, text, text, text, uuid, text, text, integer`** |
| 3 | **戻り型が `jsonb`** |
| 4 | **`SECURITY DEFINER` である**（定義読取またはカタログ） |
| 5 | **`search_path` が実行定義どおり `public`** |
| 6 | **適用直前／直後で** `reply_ticket_wallets` / `reply_wallet_ledgers` / `reply_sessions` / `stripe_processed_events` の **`COUNT(*)` が不変**（SELECT-only で記録）。必要なら preflight と同種のカウントクエリのみ。 |
| 7 | **`m55_reply_generate_commit` を含む DTR 系関数が、意図せず変更されていない**（定義ハッシュまたは差分確認の運用に従う。本条では手順のみ要求） |

**記録:** 上記の結果は **別 SSOT（APPLY result）** に集約すること。

---

## 5. STOP 条件（以下のとき APPLY を中止または延期）

| 状況 | 対応 |
|------|------|
| **preflight が前回 SSOT と矛盾**（フラグずれ／件数異常など） | 原因調査まで **APPLY しない** |
| **`required_columns_matched_out_of_30 < 30`** | **STOP** |
| **`blocking_gap_count > 0`** | **STOP** |
| **既存 RPC の **署名衝突****（REPLACE で上書き不能な別シグネチャの同居など） | **STOP**（改名・削除方針は別決裁） |
| **candidate に `ALTER`／`DROP`／`CREATE TABLE`／`CREATE INDEX`** などが混入 | **STOP**（静的監査の再実行とファイル浄化） |
| **`GRANT`/`REVOKE` を本番で無計画に実行しようとする** | **STOP**（権限ゲートを別途） |
| **Webhook 本実装と同一ウィンドウでバンドル** | **STOP** |
| **本番決済テストへの移行をこのゲートだけで許可しようとする** | **STOP** |
| **secret／Webhook secret／DB URL がログ・文書・チャットに露出する** | **STOP**／取り消し |

---

## 6. 現時点の判定（本条の状態）

| ゲート | 判定 |
|--------|------|
| **apply gate SSOT の作成** | **GO** |
| **本番 RPC APPLY** | **本条確認後も別承認が必要。**本条単体では **GO としない**。 |
| **Webhook 本実装** | **NO-GO** |
| **本番決済テスト** | **NO-GO** |
| **商品棚 UI の変更** | **NO-GO** |

---

## 7. 次の候補（順序は運用で固定）

1. **本 apply gate をリポジトリにコミット**
2. **適用直前の preflight（再実行・結果保存）**
3. **本番 RPC APPLY の別承認**（承認者・時刻・適用ファイルパス・commit）
4. **APPLY 実行**（単一関数 DDL のみ）
5. **§4 postflight と結果 capture**
6. **`M55_REPLY_TICKET_PHASE_IV_RPC_PRODUCTION_APPLY_RESULT`（または相当）SSOT の作成**
7. **その後**、設計済みなら **Webhook から RPC 呼び出し**の実装・別ゲートへ

---

## 8. CHANGELOG — v1

- 初版: Phase IV RPC 本番適用ゲート。m55-soul-core PRODUCTION での preflight PASS を前提とし、`m55_reply_ticket_fulfill_checkout_event` のみを対象とする適用／postflight／STOP を定義。
