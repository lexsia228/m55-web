# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_CANDIDATE_STATIC_AUDIT_v1

Status: **shadow／staging candidate DDL の静的監査 SSOT（DB 未接続）** — **本条は APPLY／本番昇格の承認証ではない。**  

Recorded: **2026-04-28**

監査対象リビジョン: **コミット済み** `scripts/sql/staging/m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql` の **本文（コメント／空行除外の実行可能構文のみ）**。  

Upstream:

- **候補 SSOT:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_CANDIDATE_v1.md`
- **ゲート SSOT:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_STAGING_GATE_v1.md`

**秘密鍵・DB URL・Webhook secret を本条に転記しない。**

---

## 1. 対象ファイル

| パス | 役割 |
|------|------|
| `scripts/sql/staging/m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql` | shadow／staging **専用**の **実行形式 DDL** 候補（**本番用ではない**） |

静的監査は **実行なし・接続なし**で実施した。

---

## 2. 許可されている DDL（検出結果）

実行可能ステートメントは **次の 5 文のみ**（いずれも **additive／nullable のみ**）。

| # | 構文（要約） |
|---|----------------|
| 1 | `CREATE TABLE IF NOT EXISTS public.stripe_processed_events ( … )` |
| 2〜5 | `ALTER TABLE public.reply_wallet_ledgers ADD COLUMN IF NOT EXISTS … text;` が **4 回** |

**新規表の列:** `id`、`stripe_event_id`、`checkout_session_id`、`payment_intent_id`、`product_key`、`report_instance_id`、`user_ref_hash`、`status`、`processed_at`、`created_at`、`updated_at`。いずれも **`NOT NULL` キーワードなし**。**`PRIMARY KEY`／`CHECK`／`REFERENCES` なし。**

**追加列:** `stripe_event_id`、`stripe_checkout_session_id`、`stripe_payment_intent_id`、`product_key`（いずれも **text**。**`NOT NULL` なし**。）

末尾の **`CREATE INDEX` 例はコメントアウト**されており、**実行可能構文としては含まれない**。

---

## 3. 禁止事項が無いこと（静的チェック）

| 禁止カテゴリ | 結果 |
|--------------|:----:|
| `UPDATE` | **検出されず**（コメントのみ言及） |
| `INSERT` | **検出されず** |
| `DELETE` | **検出されず** |
| `DROP` | **検出されず** |
| `TRUNCATE` | **検出されず** |
| `ALTER … ADD CONSTRAINT`／**CHECK の変更／追加** | **検出されず** |
| **`NOT NULL` 制約**（列定義） | **検出されず** |
| **`REFERENCES`**（FK） | **検出されず** |
| **`UNIQUE`**（列属性・明示制約・**`CREATE UNIQUE INDEX`**） | **実行可能構文に** **検出されず**※ |
| **`payload_json`** その他ペイロード列 | **検出されず** |
| secrets／DB URL／Webhook secret の文字列入り | **検出されず** |

※ **`CREATE UNIQUE INDEX`** は **コメントブロックにも表記なし**（オプション例は **`CREATE INDEX` のみ**。**未適用**）。

---

## 4. 設計上の注意（監査視点での固定）

| 論点 | 内容 |
|------|------|
| **`stripe_event_id` の一意性** | **本番 Webhook 稼働前に必須**。本 candidate では **UNIQUE 未適用**（ファイル先頭コメントと整合）。 |
| **CHECK** | **既存 `reply_wallet_ledgers` の CHECK は本ファイルで変更しない**。Fulfillment 行は **`purchase_grant`／`PURCHASE` 等の既存許容**に寄せる前提（別 SSOT）。 |
| **payload** | **全文保存列なし**。冪等表は **参照 ID・メタのみ**。 |
| **新表 `stripe_processed_events`** | **CHECK を定義しない**（PostgreSQL が暗黙に付けるもののみ）。監査対象として **ledger と合わせたイベント型チェックは未導入**。 |

---

## 5. APPLY 前 preflight（接続側で実施）

**本条はクエリ実行を伴わない**。**適用ゲート時**に実施すること。

| # | 確認 |
|---|------|
| 1 | **接続先が shadow／staging プロジェクト**であること（**本番ではない**） |
| 2 | `stripe_processed_events` **未作成**／追加対象の **Ledger 列 4 本が未作成** |
| 3 | **wallet／ledger／session の行数**のベースライン |
| 4 | **`report_instance_id` の NULL／非NULL 件数**のベースライン |
| 5 | **`reply_wallet_ledgers` の CHECK 全文** (`pg_constraint` 相当) の **ベースライン保存** |

既存クエリ再利用: **`m55_reply_ticket_fulfillment_additive_migration_preflight.sql`** を **同一対象環境**で実行可能。

---

## 6. APPLY 後 postflight（接続側で実施）

| # | 確認 |
|---|------|
| 1 | `public.stripe_processed_events` が **存在** |
| 2 | `reply_wallet_ledgers` に **4 つの nullable text 列**が **存在** |
| 3 | **既存** wallet／ledger／session の **総行数が不変** |
| 4 | **RI の NULL／非NULL 件数が不変** |
| 5 | **Ledger の CHECK 定義テキストが不変** |
| 6 | **`NOT NULL`／`FK`／`UNIQUE` が新増していない**（カタログ比較） |

---

## 7. STOP 条件（静的監査再実施トリガーを含む）

以下に該当したら **APPLY を中止し**、本ファイルおよび監査本条を **差し戻し**して再レビューする。

| STOP | 内容 |
|------|------|
| 1 | **本番コンソール／本番接続文字列の画面**でこの SQL を実行しようとする |
| 2 | **`supabase/migrations`** に昇格させようとする |
| 3 | **禁止 DML／DDL**（§3 と矛盾する変更）が **ファイルに混入**している |
| 4 | **`payload`** 全文保存列・**`payload_json`** が **追加**されている |
| 5 | **`UNIQUE`／`FK`／`NOT NULL`** が **実行可能構文に含まれる** |
| 6 | **`CHECK` の変更**が ledger に入る |
| 7 | **secret** がファイルに含まれる |

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **静的監査 SSOT（本条）の作成** | **GO** |
| **対象 SQL ファイル（当リビジョン）の静的充足** | **§2〜3 の範囲で合格**（**実行・接続は未実施**） |
| **shadow／staging APPLY** | **別承認** |
| **production APPLY** | **NO-GO** |
| **`supabase/migrations` 昇格** | **NO-GO** |

---

## CHANGELOG

- **2026-04-28:** v1 初版。`m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql` をソースレベルで監査し記録。
