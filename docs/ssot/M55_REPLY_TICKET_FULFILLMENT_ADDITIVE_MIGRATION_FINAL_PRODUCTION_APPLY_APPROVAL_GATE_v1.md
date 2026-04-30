# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_FINAL_PRODUCTION_APPLY_APPROVAL_GATE_v1

Status: **本番 additive migration 実行可否の最終承認ゲート** — **本条の作成は「承認済み」や「DDL 実行済み」を意味しない。**  

Recorded: **2026-04-28**

Upstream:

- **静的監査 PASS:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_CANDIDATE_STATIC_AUDIT_v1.md`
- **本番候補 DDL:** `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql`
- **候補 SSOT:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_CANDIDATE_v1.md`
- **先行ゲート:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_APPLY_GATE_v1.md`
- **Preflight SELECT:** `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_preflight.sql`

**本条にシークレット・DB URL・Webhook secret を転記しない。** コミット hash は **運用証跡**にのみ書き、本文では **プレースホルダ**運用とする。

---

## 1. APPLY 対象

| 項目 | 内容 |
|------|------|
| **唯一の実行ファイル** | `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql` |
| **接続環境** | **m55-soul-core**／**main**／**PRODUCTION**（**本番**） |
| **混在禁止** | **同一セッションに他 SQL を貼らない**。**staging 用 (`scripts/sql/staging/…shadow_candidate.sql`) は使わない**。 |
| **`supabase/migrations`** | **本条の承認だけでは配置しない**（昇格は **別ゲート**）。 |

---

## 2. APPLY 範囲

| 許可 | 内容 |
|------|------|
| **新規テーブル** | **`public.stripe_processed_events`** を **追加**（既存行の **UPDATE なし**。`CREATE TABLE IF NOT EXISTS`。） |
| **列追加** | **`reply_wallet_ledgers`** に **4 列**（すべて **text／nullable**。`IF NOT EXISTS`）：`stripe_event_id`、`stripe_checkout_session_id`、`stripe_payment_intent_id`、`product_key` |

| 明示禁止（同一ウィンドウ） |
|---------------------------|
| **既存行 `UPDATE`**、**CHECK の変更、`NOT NULL`、FK、strict UNIQUE、`payload_json`／ペイロード全文**、`UPDATE`/`INSERT`/`DELETE`/`DROP`/`SET` の混在 |

---

## 3. 実行直前 preflight（必須順）

適用まで **すべて満たすこと**。不明点は **STOP**。

| # | 条件 |
|---|------|
| 1 | **`m55_reply_ticket_fulfillment_additive_migration_production_preflight.sql`** を **再実行**し、転記結果を本条の **§5 と突合できる**状態にする。 |
| 2 | `production_additive_schema_preflight_pass_summary_heuristic` = **TRUE**。 |
| 3 | **`stripe_processed_events`** は **未存在**であること（衝突がないこと）。 |
| 4 | 上記 **Ledger 4 列** は **いずれも未存在**。 |
| 5 | **`payload_json` が `reply_wallet_ledgers` に存在しない**。 |
| 6 | **wallet cap** 式違反が **無い**（違反行数 **0**）。 |
| 7 | **件数ベースライン**が **次値と一致**すること（適用後 **§5 でも変わってはならない**）： |

| メトリクス | 実行直前の期待値（本ゲートで固定） |
|------------|-------------------------------------|
| `wallet_count`（`reply_ticket_wallets` 総行数） | **8** |
| `ledger_count`（`reply_wallet_ledgers` 総行数） | **10** |
| `session_count`（`reply_sessions` 総行数） | **11** |
| `wallet_ri_non_null`（`report_instance_id IS NOT NULL` 件数・wallet） | **5** |
| `ledger_ri_non_null`（同上・ledger） | **5** |
| `session_ri_non_null`（同上・session） | **0** |

※ **NULL 側件数**は preflight SQL の出力から **導出可能**なら **§5 で再計算して突合**してよい。

| # | 条件（続き） |
|---|--------------|
| 8 | **`reply_wallet_ledgers` の CHECK 等の定義全文**を **baseline として保存**（文字列比較用）。 |
| 9 | **適用コミット hash** を **運用証跡に記録**（本条本文へ **秘密を含めて貼らない**）。 |
| 10 | **実行先が本番**であることを **UI・プロジェクト名・責任者の二重確認**で **明示**する。 |

上記 **数値は直前 preflight の実測に基づく**。**直前に変化していたら §6 STOP** とし、本条の数値を **更新して再ゲート**する。

---

## 4. 実行手順

| # | 手順 |
|---|------|
| 1 | **§3 完了**および **責任者の口頭／書面承認**（運用規程に従う）。 |
| 2 | **本番 SQL Editor** に **`production_candidate.sql` の本文のみ**を貼る。**手修正禁止**。 |
| 3 | **追加 DDL／DML を混ぜない**。 |
| 4 | **一括実行**。**エラー即 STOP**。**ロールフォワードでの自己流修正禁止**。 |
| 5 | **成功直後 §5 を実行**。 |

---

## 5. Postflight 条件（適用後すぐ）

**すべて YES／一致**になること。**一つでも外れたら異常対応へ。**

| # | 条件 |
|---|------|
| 1 | **`public.stripe_processed_events`** が **存在**。 |
| 2 | **`reply_wallet_ledgers`** に **4 列**が **存在**。 |
| 3 | **4 列は text／`is_nullable` = YES**。 |
| 4 | **`payload_json`** は **`reply_wallet_ledgers` に存在しない**。 |
| 5 | **総行数:** `wallet_count` = **8**、`ledger_count` = **10**、`session_count` = **11**。 |
| 6 | **RI 非NULL 件数:** `wallet_ri_non_null` = **5**、`ledger_ri_non_null` = **5**、`session_ri_non_null` = **0**。 |
| 7 | **CHECK 等の定義文字列**が **§3 baseline と一致**。 |
| 8 | **`NOT NULL`／`FK`／`UNIQUE` が新規に増えていない**。 |

---

## 6. STOP 条件

| STOP | 内容 |
|------|------|
| 1 | **preflight 結果**が **前回転記（本条 §3）と矛盾**する |
| 2 | `production_additive_schema_preflight_pass_summary_heuristic` ≠ **TRUE** |
| 3 | **staging 用 SQL** を貼ろうとしている |
| 4 | **`UPDATE`／`INSERT`／`DELETE`／`DROP`／`SET`** が **貼り付け SQL に含まれる** |
| 5 | **CHECK／NOT NULL／FK／UNIQUE** が **混ざる** |
| 6 | **`payload_json`／payload 保存**が **混ざる** |
| 7 | **secret／DB URL／Webhook secret** が **ログ・チケットに出る** |
| 8 | **Webhook／Checkout／Dashboard／UI** の **本番変更を同時に進めようとする**（スキーマだけの承認に **越権**しない） |
| 9 | **実行対象が本番でない**、または **本番確認が曖昧** |

---

## 7. 現時点の判定

| 項目 | 判定 |
|------|------|
| **本条（final approval gate 文書）の作成** | **GO** |
| **本条を読んだだけでの本番 DDL 実行** | **NO-GO** |
| **本番 APPLY の実施** | **本条 §3〜4 と運用規程に基づく「別承認」後のみ** |

**Webhook／Checkout API／Stripe Dashboard／商品棚 UI** は **引き続き NO-GO**（本条では触らない）。

---

## 8. 重要な残論点

| # | 内容 |
|---|------|
| 1 | **Webhook 本番前**：**`stripe_event_id`（または運用キー）の一意／冪等の実効担保**は **別ゲートで必須**。本 APPLY **だけでは済まない**。 |
| 2 | **今回 migration** は **スキーマの受け皿**（テーブル＋nullable 参照列）。**課金付与・Webhook の業務ロジックは実装しない。** |
| 3 | **`supabase/migrations` 昇格・CI CD 連動**は **別途設計**。 |

---

## CHANGELOG

- **2026-04-28:** v1 初版。実行直前 preflight で得た件数（8/10/11 と RI 件数）を **postflight と同一に固定**。
