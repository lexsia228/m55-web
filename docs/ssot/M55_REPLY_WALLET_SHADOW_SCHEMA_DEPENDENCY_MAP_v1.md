# M55_REPLY_WALLET_SHADOW_SCHEMA_DEPENDENCY_MAP_v1

Status: **Read-only artifact** — **`supabase/migrations` を唯一の正としての依存順・差分論点のみ記録する。** **この文書に実行可能 DDL（CREATE／ALTER／DROP／DML）を書かない。** **DB は変更しない。**  

Date: 2026-04-29  

Related:

- `docs/ssot/M55_REPLY_WALLET_SHADOW_PREFLIGHT_OBSERVATION_AND_MANUAL_CREATE_REJECTION_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SHADOW_SCHEMA_BOOTSTRAP_PLAN_v1.md`
- `docs/ssot/M55_REPLY_WALLET_SHADOW_BOOTSTRAP_EXECUTION_PACKET_v1.md`
- `scripts/sql/staging/m55_reply_wallet_shadow_bootstrap_preflight.sql`
- `scripts/sql/staging/m55_reply_wallet_phase_a_nullable_only_staging.sql`

**調査ソース:** `supabase/migrations/*.sql` — **当リポでは合計 9 ファイルのみ**（名前順リストは §3 を参照）。

---

## 1. Phase A 検証に必要な最低オブジェクト（なぜ必要か）

**正本（事前検証クエリ実体）:** `m55_reply_wallet_phase_a_nullable_only_staging.sql` の **PART 1**。

**ゲート状態（参照）:** `M55_REPLY_WALLET_SHADOW_PREFLIGHT_OBSERVATION_AND_MANUAL_CREATE_REJECTION_v1.md` に従い、**shadow が本番準拠で証明されていない場合は Phase A PART 1/2 はともに NO-GO。** 本条は、「**適用済み migrations に照らしたときに不足してはならない形**」のみ列挙する。

| 区分 | 対象（論理名のみ） | なぜ必要か |
|------|---------------------|-------------|
| **Table** | `reply_ticket_wallets` | PART 1 の存在チェック・行数ベース・将来の nullable **`report_instance_id`** 載せ先。このテーブルを定義する migration がリポにある。 |
| **Table** | `reply_wallet_ledgers` | 同上。PART 2 の載せ先とも同一意図。 |
| **Table** | `reply_sessions` | 同上。PART 2 の載せ先とも同一意図。 |
| **Table** | `dtr_report_snapshots` | PART 1 の **orphan 件数算出** が「ユーザーに対応する **`DTR_CORE_STATIC_V1` 製品コードの snapshot 非存在」を参照。** テーブル欠落ではクエリ不能。 |
| **Column（概念）** | 上記 reply 三表の **`user_id`** 等、migration で宣言された検証済み列セット | 「存在するだけ」の簡易テーブルでは **NULLABLE 追加との整合証明にならない**（_PREFLIGHT_REJECT SSOT と同旨）。個別物理名・型は **`20260416000000_reply_system_data_layer_v1.sql`** および **`20260420000000_dtr_drafts_and_report_snapshots.sql`** の定義による。 |
| **Index／Constraint（論点）** | `reply_ticket_wallets` の **ユーザー単位一意性**（migration 内での一意制約） | PART 1 で一意制約名の確認が読み取り検証として含まれる。** 適用しない shadow には該当行が無い状態になる。** |
| **RPC** `m55_reply_generate_commit` | **PART 1 の SELECT は必須ではない。** | **統合・アプリ側の「消費・台帳・文書・アトミック性」証明には必要。** **`20260417000000_m55_reply_generate_commit_rpc.sql` は、`reply_sessions`／`reply_documents`／`reply_ticket_wallets`／`reply_wallet_ledgers` を前提にした本体と付与のみ。** bootstrap 順では **これらテーブルの migration の後**。 |

**あえて明示:** `entitlement_rights` / `one_time_fulfillments` / **`entitlements`** / **`stripe_events`** は、`m55_reply_wallet_phase_a_nullable_only_staging.sql` PART 1 **そのものの必須テーブル集合には含まれない**。ただし **Phase 6 論点のチェーン適用や本番準拠の全体整合**において、`20260306000000_*` と `20260308000000_*` 等で **オブジェクト側で要求される**。§3 の表で棲み分けする。

---

## 2–3. migrations 一覧とオブジェクト依存（正規のみ）

以下は **migration ファイル名の昇順に並べ、そのファイルが言及するオブジェクトとの関係**を示す。**本文に SQL 本体は書かない。**

### タイムスタンプ順リスト（ソース）

| ファイル名 |
|------------|
| `20260306000000_phase1_entitlements_ssot.sql` |
| `20260306100000_premium_invoice_dtr_grants.sql` |
| `20260308000000_one_time_checkout_fulfillment.sql` |
| `20260325000000_consult_room.sql` |
| `20260416000000_reply_system_data_layer_v1.sql` |
| `20260417000000_m55_reply_generate_commit_rpc.sql` |
| `20260420000000_dtr_drafts_and_report_snapshots.sql` |
| `20260421000000_dtr_postgrest_schema_reload.sql` |
| `20260422000000_dtr_guest_drafts_report_snapshots_columns_pgrst204.sql` |

### 依存表（適用可否の論理）

| migration ファイル | 主対象オブジェクト（作成・変更・付与など） | 前提オブジェクト | 適用可否の判定メモ |
|--------------------|--------------------------------------------|-------------------|---------------------|
| `20260306000000_*` | `stripe_events` への追加属性（列）、`purchases`、`subscriptions`、`entitlement_rights` の作成など | **`stripe_events` という名前の基底テーブルが既に存在すること** が **最初の処理で要求される**。**リポ内のほかどの migration で当該テーブルを作っていない。** | **基底 `stripe_events` が無ければ、このファイル単体適用は失敗になりうる** → **`前提不足`。土台準備または当該 migration のスキップ判断が BOOTSTRAP_PLAN と同旨で必要。** |
| `20260306100000_*` | `invoice_dtr_grants` 等（請求側月次論点） | 特になし（他テーブルの FK でない単純論点） | **単体で順序自由に適用可能**（競合しない範囲）。 |
| `20260308000000_*` | `one_time_fulfillments`、`failed_fulfillments` | 同上 | **単体適用可能。** |
| `20260325000000_*` | `consult_threads`、`consult_messages` | 同上（相互 FK のみファイル内閉鎖） | **Phase A と無関係なら優先度は下げ可能だが、migrations 順で整合する。** |
| `20260416000000_*` | `reply_sessions`、`reply_documents`、`reply_ticket_wallets`、`reply_wallet_ledgers` と付随 index／check | `gen_random_uuid` 等が使用可能であること。**拡張行は migrations ファイル未記載。** | **適用可能**（単体で一式完結）。**Phase A が要求する reply 核はここが唯一ソース。** |
| `20260417000000_*` | `fun m55_reply_generate_commit` の定義および **実行権限定**。**末尾に運用検証向けデータ挿入行あり**（開発・自動テスト経路での意図） | **`reply_ticket_wallets` ほか、`20260416000000_*` の物理オブジェクトすべて** | **202604160 適用済みのみ** → **`202604170` は後置必須。RPC が reply / document / ledger と結合**。 |
| `20260420000000_*` | `dtr_guest_drafts`、`dtr_report_snapshots` と付随 index | 特になし（相互 FK でない） | **適用可能。Phase A orphan カウントに `dtr_report_snapshots` が必須** → **論理的には Phase A と同居させる**。 |
| `20260421000000_*` | PostgREST スキーマ再読込の通知のみ | **`public` が利用可能であり API コンテキストがあること。** | **`202604200` 適用後のキャッシュ問題対策として意図**。DDL オブジェクト増は無い。** |
| `20260422000000_*` | `dtr_guest_drafts`、`dtr_report_snapshots` への追加列（論点名・目的はファイルコメント準拠） | **両テーブルが既に作成済み。** | **`202604200` 済みのみ意味あり。** **`202604200` の初期定義との重複許容論点があるが、順序だけは明示。文末に通知のみ。** **`保留`:** 依存テーブル未作成状態では順序のみ誤れば失敗になりうる。 |

**トリガ／拡張:** 調査ファイル内に **`CREATE TRIGGER` / `CREATE EXTENSION` はヒットしない。** **`m55_reply_generate_commit` は `SECURITY DEFINER` と `search_path` 設定のみ**（関数定義のみ／トリガ未使用）。

---

## 3bis. 「entitlements」問題 と `stripe_events` 前提

| 論点 | 内容 |
|------|------|
| **Repo に `CREATE TABLE entitlements` が無い** | migrations 検索結果、**`entitlements` という名前の DDL は **`20260306000000_*` のコメントのみ**。** 基底スキーマは **Stripe／Supabase 初期テンプレート・別環境適用済み状態** と想定されている。 |
| **既存 shadow の `entitlements`** | **简易版であった可能性。** **本番型と証明しない限り、「Phase A 本線の代替証明用 DB」として採らない。**（既存 SSOT と同旨） |
| **本番準拠 `entitlements` の再現** | **別ゲート。** **dump／非本番専用手順／許可リスト上のソース同期**など **この文書範囲外の意思決定が必要**。 |
| **`stripe_events` との関係** | **`20260306000000_*` の先頭は `stripe_events` を対象とする。** **Shadow に `stripe_events` が無い（preflight 観測）なら、このファイル単体適用が成立しない。** BOOTSTRAP_PLAN の「基底テーブルを先に揃えるか、当該 migration を順序外にしない」の二択と整合。 |

---

## 4. Bootstrap 順序案（論理のみ）

**原則:** **ファイル名順の単純並べのみが常に正道ではなく、オブジェクトグラフ順が先。**  

| 順位の型 | migration の扱い | 説明 |
|----------|-----------------|------|
| **土台（リポ外の論点込み）** | **基底 `stripe_events` をどう満たすかを決める前に `20260306000000_*` は流さない** | 「直接適用できる」と読んではならない。 |
| **直ちに単体適用可能（順序のみ守る論点以外）** | `20260306100000`、`20260308000000`、`20260325000000`、`20260416000000`、`20260420000000`、`20260421000000`、`20260422000000`**（順序論点のみ） | **競合しない独立オブジェクトのみ。** **`20260422000000` は `20260420000000` 後。** |
| **RPC** | **`20260417000000`** は **`20260416000000` の直後のみ**が安全 | **`m55_reply_generate_commit`** は **`reply_ticket_wallets`、`reply_documents`、`reply_sessions`、`reply_wallet_ledgers` の存在が前提**。 |
| **保留寄りの判断** | `20260306000000`**（`stripe_events` 欠落環境では） | **前提オブジェクト問題で保留。** |
| **`entitlements` 準拠** | **migration 単体では再現しない** | **別途ゲート**（BOOTSTRAP_PLAN と同旨）。 |

**PostgREST:** `NOTIFY` のみのファイルは **`dtr_guest_drafts` / `dtr_report_snapshots` などの存在がアプリ側に見える状態** とセットで評価。API コンテキストのある Supabase と **裸の PostgreSQL テストのみ** とで優先順は異なりうる。

---

## 5. この文書にできないこと（実行・DDL 禁止）

- **この文書を根拠に SQL を実行しない。** **migration を適用しない。** **Shadow に手貼りの簡易スキーマを作らない。** **本番 DB を変更しない。**  
- **`CREATE` / `ALTER` / `DROP` / `UPDATE` / `INSERT` / `DELETE` を本文に載せず、ソース migration への参照のみ。**  
- **秘密鍵・service role・DB URL は記載しない。**

---

## 6. 次の最小作業

| # | 作業 |
|---|------|
| 1 | **本ファイル（dependency map）をコミットし、レビューを通す。** |
| 2 | **その後：** **bootstrap を「draft」（設計のみ）として起案するか、Supabase Branching に切り替えてチェーン適用実験をするかは、インフラ方針とコスト次第で選択。** 「draft」にする場合も **実行可能 DDL ファイルをいきなり増やさず、順序チェックリストとゲートのみを先に出す。** |
| 3 | **Phase A PART 2（nullable の追加）は、続く EXECUTION PACKET の承認に従い、本条のオブジェクトセットが証明済みになるまで別紙とも整合して NO-GO のまま。**

---

## 7. Revision

| 版 | 日付 | 変更 |
|----|------|------|
| v1 | 2026-04-29 | 初版 — `supabase/migrations/*.sql` からのオブジェクト依存表・Phase A 論点・bootstrap 順序のみ |
