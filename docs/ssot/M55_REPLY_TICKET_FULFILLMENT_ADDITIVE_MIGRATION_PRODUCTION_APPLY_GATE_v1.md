# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_APPLY_GATE_v1

Status: **m55-soul-core（PRODUCTION）に限定する DDL 適用直前ゲート** — **本条の作成により DDL が実行されていない。また本条単体でも APPLY は許可されない。**  

Recorded: **2026-04-28**

Upstream:

- **本番 preflight 結果:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_PREFLIGHT_RESULT_v1.md`
- **本番 preflight SELECT:** `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_preflight.sql`
- **Shadow 候補（本番では直接実行しない）:** `scripts/sql/staging/m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql`

**本条にシークレット・DB URL・Webhook secret を記載しない。**

---

## 1. Production APPLY 候補の範囲（論理的に許される DDL）

**承認済み DDL ドラフトのみ**適用すること。許容される **内容は以下に限定**（**CHECK／NOT NULL／FK／strict UNIQUE を追加しない**。**ペイロード列なし**。**既存行の UPDATE なし**）。

| 項目 | 内容 |
|------|------|
| **新規テーブル** | **`public.stripe_processed_events`** の **作成** |
| **`reply_wallet_ledgers` に列追加** | **`stripe_event_id`**（text nullable）、**`stripe_checkout_session_id`**（text nullable）、**`stripe_payment_intent_id`**（text nullable）、**`product_key`**（text nullable）、いずれも **`IF NOT EXISTS` 運用または同等の単発追加** |

**明示的禁止（同一セッション混在禁止）:**  
**CHECK の変更、`NOT NULL`、FK、`UNIQUE`、`payload_json`／payload 全文、UPDATE／INSERT／DELETE／DROP。**  

---

## 2. 重要な注意（必読）

| # | 注意 |
|---|------|
| 1 | **`scripts/sql/staging/m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql` を本番で直接実行しない。** path／コメント／履歴が **staging 固有**であり、本番昇格には **別途 production 向け DDL ファイル**と **別レビュー**が必要である。 |
| 2 | **production 用 DDL 案**は **別ファイルとして起案・承認**する（**本条はファイルを生成しない**）。 |
| 3 | **`supabase/migrations`** への昇格および **運用側の自動適用連携**は **まだ NO-GO**（別ゲート）。 |
| 4 | **Webhook 本番運用開始前に**、`stripe_event_id`（または採定する冪等キー）について **一意性／冪等性の実効担保**が **別ゲートで必須**。**本 APPLY だけで Webhook READY とはしない。** |

---

## 3. Production APPLY 前チェック（必須順）

以下をすべて満たしてから DDL を張る。**不足なら STOP。**

| # | チェック |
|---|----------|
| 1 | **接続先・プロジェクト名**が **`m55-soul-core`／想定 `PRODUCTION`** であることを **画面と責任者で明示確認**。 |
| 2 | **`m55_reply_ticket_fulfillment_additive_migration_production_preflight.sql`** を **実行直前に再実行**し、**本条が記録されたサマリ条件と矛盾しないこと**を確認。**preflight が崩れていたら STOP。** |
| 3 | **現在のコミット hash** を証跡に記録する（適用コード・DDL ドラフト参照用）。本条本文にはハッシュ値を転記しない運用でも可。**チーム内証跡必須。** |
| 4 | **バックアップ／ロールフォワード方針**（Point-in-Time Recovery、メンテ手順、`ADD COLUMN` の特性）を確認。 |
| 5 | **実行 SQL 全文レビュー**（**staging ファイルと完全一致していないことを確認**済みであること。**production ドラフトのみ**実行）。 |
| 6 | **余計な DDL／DML を混ぜない**（トリガ、アプリ側の並行変更は別チェックリスト）。 |

---

## 4. Production APPLY 後 postflight（必須）

| # | 条件 |
|---|------|
| 1 | **`public.stripe_processed_events`** が **存在**。 |
| 2 | **`reply_wallet_ledgers`** に **4 列**が **存在**。 |
| 3 | **4 列は text／nullable YES**（カタログ）。 |
| 4 | **`payload_json` が新設されていない**。 |
| 5 | **wallet／ledger／session の総行数**が **preflight と一致**。 |
| 6 | **RI（`report_instance_id` の NULL／非NULL 件数）**が **preflight と一致**。 |
| 7 | **CHECK など制約定義**が **文字列として不変**。 |
| 8 | **`NOT NULL`／`FK`／`UNIQUE` が増えていない**。 |

不一致は **異常**。原因切り分けまで **運用フラグ・アプリ側**を読む。

---

## 5. STOP 条件（即中止・差し戻し）

| STOP | 内容 |
|------|------|
| 1 | **staging 用 SQL をそのまま本番で実行**しようとする |
| 2 | **CHECK／NOT NULL／FK／UNIQUE** が **同一セッションに混ざる** |
| 3 | **`payload_json`／raw payload 保存列** が含まれる |
| 4 | **`UPDATE`／`INSERT`／`DELETE`／`DROP`** が混ざる |
| 5 | **適用直前 preflight が前回転記結果と異なる**／**異常フラグが立つ** |
| 6 | **本番 APPLY と Webhook／Checkout の本番変更を同タイムボックスで**無計画に進める |
| 7 | **secret／Webhook secret／DB URL** が **ログ／チケット／SSOT** に現れる |

---

## 6. 現時点の判定

| 項目 | 判定 |
|------|------|
| **Production preflight 結果 SSOT 化** | **GO**（別ファイル `PRODUCTION_PREFLIGHT_RESULT_v1`） |
| **Production APPLY gate 本文の作成** | **GO**（本条） |
| **Production DDL の実行** | **NO-GO**（**別承認**・**適用ウィンドウ**が必要） |
| **Production 用 DDL 候補ファイルの起案・コミット** | **NO-GO**（**本条の次ステップ別承認**） |
| **Webhook／Checkout API／Stripe Dashboard／商品棚 UI** | **NO-GO** |

---

## 7. クロスリンク

- **Staging 側ゲート参照:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_APPLY_GATE_v1.md`  
- **Shadow 適用証跡:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_APPLY_RESULT_v1.md`

---

## CHANGELOG

- **2026-04-28:** v1 初版。
