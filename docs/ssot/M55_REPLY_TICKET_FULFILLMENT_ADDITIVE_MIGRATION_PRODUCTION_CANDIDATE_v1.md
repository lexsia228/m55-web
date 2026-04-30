# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_CANDIDATE_v1

Status: **本番（PRODUCTION）適用候補の DDL（production 専用ファイル）** — **コミットのみでは実行承認にならない。**  

Recorded: **2026-04-28**

Upstream:

- **適用ゲート:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_APPLY_GATE_v1.md`
- **本番 preflight 結果:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_PREFLIGHT_RESULT_v1.md`
- **本 DDL:** `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql`
- **Staging／shadow 側候補（本番で流用禁止）:** `scripts/sql/staging/m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql`

**秘密鍵・DB URL・Webhook secret を本条に記載しない。**

---

## 1. production DDL candidate の目的

**m55-soul-core（PRODUCTION）** に、Fulfillment 用の **additive／nullable** スキーマのみを **意図どおり**適用するための **レビュー済み・本番専用の実行候補ファイル**を用意する。  
**staging 用ファイルの誤貼り**を防ぎ、**本文・コメント・運用文脈**が本番レビューと一致した **一本**に固定する。

---

## 2. staging 用 SQL を直接使わず production 専用に分ける理由

| 理由 | 内容 |
|------|------|
| **誤適用防止** | staging ファイルは **環境ラベル／注意文**が **staging 向け**であり、本番コンソールでの **取り違えリスク**がある。 |
| **監査トレーサビリティ** | **「どのコミット・どのファイルが本番適用対象か」** を **production パス**で一意に残す。 |
| **レビュー責務** | 本番は **shadow（0 件 DB）を超えた** preflight・承認が必要。**同一論理でもファイルを分ける**。 |

---

## 3. DDL 範囲（当該 SQL に含まれるもの）

| # | 内容 |
|---|------|
| A | `CREATE TABLE IF NOT EXISTS public.stripe_processed_events ( … )` — 列は **nullable のみ**（`NOT NULL` 句なし）。**payload 列なし**。 |
| B | `ALTER TABLE public.reply_wallet_ledgers` に **`ADD COLUMN IF NOT EXISTS`** ×4：`stripe_event_id`、`stripe_checkout_session_id`、`stripe_payment_intent_id`、`product_key`（すべて **text**）。 |

**末尾の `CREATE INDEX` 例はコメント** — 実行されない。

---

## 4. 入れないもの

| 除外 |
|------|
| `UPDATE`／`INSERT`／`DELETE`／`DROP`／`SET` |
| **CHECK** の追加・変更 |
| **NOT NULL**、**FK**、**strict UNIQUE** |
| **`payload_json`**／raw payload |
| **secret** の埋め込み |

**Webhook 本番前**に必須となる **`stripe_event_id` の一意性／冪等性の実効担保**は **本ファイルには含めず**、**別ゲート**で追加する。

---

## 5. APPLY 前 preflight

**`m55_reply_ticket_fulfillment_additive_migration_production_preflight.sql`** を **実行直前に再実行**。  
**`M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_APPLY_GATE_v1.md`** の **§3** に従い、**対象 DB・コミット記録・レビュー全文**を確認する。

---

## 6. APPLY 後 postflight

**`M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_APPLY_GATE_v1.md`** の **§4** と同じ：**新表・4 列・nullable・行数／RI 不変・制約不変・禁止制約の未増加・payload なし**。

---

## 7. STOP 条件

ゲート **§5** と同一。特に **staging 用 SQL の本番実行**、**混在 DDL／DML／payload**、**preflight 異常**、**secret 露出**。

---

## 8. 本番 APPLY はまだ別承認

- 本条・本 SQL の **存在＝GO ではない**。  
- **メンテ時間・責任者・ロールバック方針・最終全文 diff** の **別承認**が prerequisite。

---

## 9. Webhook 本番前の別ゲート（冪等性）

**`stripe_event_id`（または運用で定める鍵）の一意性／冪等性の実効担保**は、**本 DDL 適用後でも** **Webhook 接続本番化の前に**満たすこと。  
**本ファイルはその制約を載せない**（方針どおり **後続 migration／index ゲート**）。

---

## CHANGELOG

- **2026-04-28:** v1 初版。
