# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_CANDIDATE_STATIC_AUDIT_v1

Status: **`m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql` の静的監査 SSOT（DB 未接続・未実行）** — **本条は本番 APPLY の承認ではない。**  

Recorded: **2026-04-28**

監査対象: **コミット済み** `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql` の **実行可能トークン列**（末尾の **`--` で始まる行はコメント**として監査対象外としたDDL本文）。

Upstream:

- **候補 SSOT:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_CANDIDATE_v1.md`
- **適用ゲート:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_APPLY_GATE_v1.md`

**本条にシークレット・DB URL・Webhook secret を転記しない。**

---

## 1. 対象ファイル

| パス | 役割 |
|------|------|
| `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql` | **本番専用** additive DDL 候補（**頭書で最終承認なし実行禁止**。**`supabase/migrations` 未昇格**。） |

---

## 2. 許可されている DDL（検出結果）

実行可能ステートメントは **次の 5 文のみ**。

| # | 実行可能構文 |
|---|----------------|
| 1 | `CREATE TABLE IF NOT EXISTS public.stripe_processed_events ( … );` |
| 2 | `ALTER TABLE public.reply_wallet_ledgers ADD COLUMN IF NOT EXISTS stripe_event_id text;` |
| 3 | `ALTER TABLE public.reply_wallet_ledgers ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;` |
| 4 | `ALTER TABLE public.reply_wallet_ledgers ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;` |
| 5 | `ALTER TABLE public.reply_wallet_ledgers ADD COLUMN IF NOT EXISTS product_key text;` |

新規表の **列リスト**において **`NOT NULL`／`PRIMARY KEY`／`CHECK (...)`／`REFERENCES`** は **検出されない**（PostgreSQL が暗黙付与するオブジェクトのみ）。末尾の **`CREATE INDEX` はコメントのみ**であり **実行対象ではない**。コメントブロック文中の **`UNIQUE`** という単語は **注釈**であり実行 SQL ではない。

---

## 3. 禁止事項が無いこと（静的チェック結果）

| 禁止カテゴリ | **実行可能文に対する結果** |
|--------------|---------------------------|
| `UPDATE` | **なし**（コメント行の単語のみ） |
| `INSERT` | **なし** |
| `DELETE` | **なし** |
| `DROP` | **なし** |
| `TRUNCATE` | **なし** |
| `SET` | **なし** |
| **CHECK の追加・変更** | **実行可能 DDL に** **なし** |
| **`NOT NULL` 制約** | **実行可能 DDL に** **なし** |
| **FK (`REFERENCES`)** | **なし** |
| **`UNIQUE` 制約／`CREATE UNIQUE INDEX`**（実行ブロック） | **なし**（注釈の **non-unique** `CREATE INDEX` 例のみ **コメント**） |
| **`payload_json`／ペイロード列** | **なし** |
| **secrets／DB URL／Webhook secret** | **なし** |

---

## 4. 本番実行前条件（監査視点での必須手順）

| # | 条件 |
|---|------|
| 1 | **`m55_reply_ticket_fulfillment_additive_migration_production_preflight.sql`** を **適用直前に再実行**し、転記結果が **異常なし**であること。 |
| 2 | **適用時点のコミット hash** を **運用証跡に記録**すること（本条本文には転記しない）。 |
| 3 | **実行 SQL が本ファイル全文と完全一致**であり、**手修正／追記されていない**こと。 |
| 4 | **実行先が `m55-soul-core`／想定 `PRODUCTION`** であることを **画面・責任者で明示確認**。 |
| 5 | **追加 DDL／DML を同一セッションで混ぜない**。 |
| 6 | **適用後、即座に postflight**（ゲートおよび preflight と同系の査定）。 |

---

## 5. APPLY 後 postflight 候補

`docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_APPLY_GATE_v1.md` **§4** と整合:

| # | 条件 |
|---|------|
| 1 | **`public.stripe_processed_events`** が存在。 |
| 2 | **`reply_wallet_ledgers`** に **4 列**が存在し、すべて **text／nullable YES**。 |
| 3 | **`payload_json` が存在しない**（および raw payload 列なし）。 |
| 4 | **wallet／ledger／session の総行数が preflight直前 と同一**。 |
| 5 | **RI（`report_instance_id` に関する件数カウント）が同一**。 |
| 6 | **Ledger の CHECK 等の制約テキストが不変**。 |
| 7 | **`NOT NULL`／`FK`／`UNIQUE` が新規増加していない**。 |

---

## 6. STOP 条件

| STOP | 内容 |
|------|------|
| 1 | **§3 と矛盾する DML／DDL**が **混入**していた（**再監査または差し戻し**） |
| 2 | **staging 用 `shadow_candidate.sql`** と **取り違えている** |
| 3 | **`supabase/migrations`** へ **意図せず昇格**する運用になる |
| 4 | **CHECK／NOT NULL／FK／UNIQUE／payload** が **同一ウィンドウに混ざる** |
| 5 | **secret／Webhook secret／DB URL** が証跡に露出する |
| 6 | **本 DDL 適用と同時タイムボックスで** **Webhook／Checkout 実装**を **無計画に本番化**する |

---

## 7. 現時点の判定

| 項目 | 判定 |
|------|------|
| **本条（静的監査 SSOT）の作成** | **GO** |
| **対象ファイル当リビジョンの静的充足**（§2〜3） | **合格** |
| **本番 APPLY の実行** | **NO-GO**（**final apply approval** は **次ゲート・別承認**） |

---

## CHANGELOG

- **2026-04-28:** v1 初版。production candidate SQL をソース単位で監査。
