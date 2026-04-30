# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_APPLY_GATE_v1

Status: **shadow／staging に限る candidate DDL 適用直前ゲート** — **本条の作成は APPLY の承認ではない。本条単体でも SQL は実行しない。**  

Recorded: **2026-04-28**

Upstream:

- **静的監査 PASS:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_CANDIDATE_STATIC_AUDIT_v1.md`
- **候補 SQL:** `scripts/sql/staging/m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql`
- **候補 SSOT:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_CANDIDATE_v1.md`

**本条にシークレット・DB URL・Webhook secret を記載しない。チケット・チャットにも貼らない。**

---

## 1. APPLY 対象

| 項目 | 内容 |
|------|------|
| **ファイル** | `scripts/sql/staging/m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql` |
| **許可環境** | **shadow／staging のみ**（非本番） |
| **禁止** | **production** での実行 |
| **`supabase/migrations`** | **昇格しない** — 本条は migrations とは無関係の **検証用適用のみ** を想定 |

実行可能構文は静的監査どおり **`CREATE TABLE IF NOT EXISTS public.stripe_processed_events`** と、**`ALTER TABLE public.reply_wallet_ledgers` の `ADD COLUMN IF NOT EXISTS` 4 本**のみ。

---

## 2. APPLY 前チェック

以下を **適用実行前に満たすこと**。クエリ結果は SSOT に **件数・有無フラグのみ**転記する（**secret や DB URL は貼らない**）。

| # | チェック |
|---|----------|
| 1 | **接続先プロジェクト／インスタンス**が **`m55-soul-shadow`** または **運用ドキュメントで明示された非本番 DB** であること。**`m55-soul-core` / `main` / `PRODUCTION` ではない**こと。**画面タイトル・URL・プロジェクト名で二重確認**する。 |
| 2 | `public.stripe_processed_events` は **存在しないことが望ましい**。存在する場合は **`IF NOT EXISTS` により DDL が no-op でよいこと** をチームで了承済みであること（衝突名の別用途が無いこと）。 |
| 3 | `reply_wallet_ledgers` に **`stripe_event_id`／`stripe_checkout_session_id`／`stripe_payment_intent_id`／`product_key` が未作成**であるか、または **`IF NOT EXISTS` で安全**であることを確認済みであること。 |
| 4 | **wallet／ledger／session の総行数**の **baseline を記録**する。 |
| 5 | 各テーブルの **`report_instance_id` に関する NULL／非NULL の件数**の **baseline を記録**する。 |
| 6 | **`reply_wallet_ledgers` の CHECK 制約全文** (`pg_catalog`/`information_schema`) の **baseline を保存**する。 |

再利用: `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_preflight.sql` を **同一 shadow／staging 接続で**実行し、転記してよい（**本番接続では実行しない**）。

---

## 3. APPLY 手順

| # | 手順 |
|---|------|
| 1 | **§2 が完了**していること。**別承認**が出ていること。 |
| 2 | **対象ファイルのみ**を SQL エディタに貼る／読み込ませる。**実行可能文以外を足さない**。 |
| 3 | **途中で手修正しない**（コメントの有無のみの差は許容しない運用でも可。**「ファイル原本をそのまま」** が原則）。 |
| 4 | **先頭から一括実行**または **ブロック順実行**。**エラーが出たら即 STOP**。ロールフォワード試行や **追加 DDL／DML を混ぜない**。 |
| 5 | **成功ログ**のみを証跡に残す。**secret がログに映らない**ようマスク運用する。 |

---

## 4. APPLY 後 postflight

適用後、**shadow／staging 接続のまま**以下を確認する。

| # | 条件 |
|---|------|
| 1 | **`public.stripe_processed_events`** が存在する。 |
| 2 | **`reply_wallet_ledgers`** に次の **4 列が存在する:** `stripe_event_id`、`stripe_checkout_session_id`、`stripe_payment_intent_id`、`product_key`。 |
| 3 | 上記 **4 列はすべて nullable** であること（カタログ上 `is_nullable = YES`）。 |
| 4 | **既存**の wallet／ledger／session の **総行数が §2 の baseline と一致**する。 |
| 5 | **既存 RI**（§2 と同じカウント定義）の **NULL／非NULL 件数が baseline と一致**する。 |
| 6 | **`reply_wallet_ledgers` の CHECK 定義文字列が baseline と変化していない**。 |
| 7 | **`NOT NULL`／`FK`／`UNIQUE`（制約および `CREATE UNIQUE INDEX`）が新規に増えていない**。 |
| 8 | **`payload_json` および raw payload を保存する新列が増えていない**。 |

本条の DDL は **`UPDATE`/`INSERT` を含まない**ため、データ行は **増減しない**設計。**件数不一致は即異常**として調査する。

---

## 5. STOP 条件

以下が **いずれか一つでも**確認された場合、**適用を中止または中断**し、エスカレーションする。

| STOP | 内容 |
|------|------|
| 1 | **本番と思える画面／接続ラベル**（例: **`m55-soul-core`、`PRODUCTION`、本番ダッシュボード**）である |
| 2 | **`supabase/migrations` への昇格**や「本番 migration セット」への **混入**が発生している |
| 3 | **CHECK／NOT NULL／FK／UNIQUE** が **適用ステートメントまたは直後確認**で現れる |
| 4 | **`payload_json`／raw payload 保存列** が現れる |
| 5 | **`UPDATE`／`INSERT`／`DELETE`／`DROP`** 等が **同一セッションで混ざる** |
| 6 | この APPLY をトリガに **Stripe／Webhook／Checkout 実装**へ **ジャンプして本番構成を変える** |
| 7 | **secret が画面・ログ・チケットに表示される** |

---

## 6. 現時点の判定

| 項目 | 判定 |
|------|------|
| **本条（APPLY gate の文書）の作成** | **GO** |
| **shadow／staging APPLY の実施** | **別承認**（本条単体では未実施・未許可とする） |
| **production APPLY** | **NO-GO** |

---

## CHANGELOG

- **2026-04-28:** v1 初版。candidate DDL の適用直前チェックリストと STOP を固定。
