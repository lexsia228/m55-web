# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_CANDIDATE_v1

Status: **shadow／staging 専用の実行可能 DDL 候補** — **production 適用禁止。`supabase/migrations` 配置禁止。**  

Recorded: **2026-04-28**

Upstream:

- **ゲート SSOT:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_STAGING_GATE_v1.md`
- **論理ドラフト:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_CANDIDATE_DRAFT_v1.md`
- **実行候補 SQL:** `scripts/sql/staging/m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql`

**秘密鍵・DB URL・Webhook secret・payload 本文を本条に記載しない。**

---

## 1. shadow／staging 専用であること

| 項目 | 内容 |
|------|------|
| 目的 | **shadow／staging** でのみ **スキーマ追加**を検証する |
| 想定接続 | **本番（PRODUCTION）以外**の DB エンドポイント |
| SQL ファイル先頭 | **SHADOW/STAGING ONLY**／**DO NOT RUN IN PRODUCTION**／**NOT FOR supabase/migrations** を明記済み |

---

## 2. production／`supabase/migrations` 禁止

- **本番 APPLY は NO-GO**（本条・当該 SQL の存在が **許可を意味しない**）。
- **`supabase/migrations` には置かない** — 本番昇格は **別 migration パッケージと別承認**で行う。

---

## 3. DDL 範囲（当該ファイルに含まれるもの）

### 3.1 Candidate A — `public.stripe_processed_events`

| 列 | 備考 |
|----|------|
| `id` | `uuid DEFAULT gen_random_uuid()`（**NOT NULL 制約は付けない**） |
| `stripe_event_id` | text |
| `checkout_session_id` | text |
| `payment_intent_id` | text |
| `product_key` | text |
| `report_instance_id` | uuid |
| `user_ref_hash` | text（生 `user_id` の代替の **ハッシュ格納用**。値はアプリ責務） |
| `status` | text |
| `processed_at` | timestamptz |
| `created_at` | timestamptz default `now()` |
| `updated_at` | timestamptz default `now()` |

`CREATE TABLE IF NOT EXISTS` を使用（shadow での再実行耐性）。

### 3.2 Candidate B — `public.reply_wallet_ledgers`

`ADD COLUMN IF NOT EXISTS`（いずれも **text**、**既存行は NULL**）:

- `stripe_event_id`
- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `product_key`

---

## 4. 入れないもの（当該ファイルから意図的に除外）

| 除外 | 理由 |
|------|------|
| **`stripe_event_id` の strict UNIQUE** | **本番 Webhook 前の別ゲート**で必須化する。**本候補では入れない** |
| **CHECK の追加・変更** | 初回範囲外（ledger の既存 CHECK は不変） |
| **NOT NULL** | nullable additive のみ |
| **FK** | 参照ポリシーは未確定 |
| **raw payload 列** | PII／保管方針の観点 |
| **既存行の `UPDATE`** | ベースライン比較のため行わない |

### 4.1 任意 index（比較用・未適用）

- **強い UNIQUE index**は **入れない**。
- **非 UNIQUE index**（例: `stripe_event_id` 上の検索用）は **SQL 末尾にコメント例**のみ。**採用可否は運用負荷・重複行許容とセットで比較**する。

---

## 5. Preflight（適用前・SELECT のみ）

`docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_STAGING_GATE_v1.md` の §5 および  
`scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_preflight.sql` の **同等確認**を **shadow／staging 接続**で実施する。

要点:

- `stripe_processed_events` **未存在**
- 追加予定の **ledger 列が未存在**
- wallet／ledger／session の **行数**および **`report_instance_id` の NULL／非NULL 件数**のベースライン記録

---

## 6. Postflight（適用後・SELECT のみ）

ゲート SSOT §6 に準拚:

- 新表・新列の **存在**
- **行数**および **RI 件数**が **変化していない**こと
- **CHECK 定義**が **変わっていない**こと
- 当該 DDL が **INSERT／UPDATE を含まない**ため、**データ本文・secret は増えない**こと

---

## 7. STOP 条件

ゲート SSOT §7 と同じ。**本番実行**、**migrations 昇格**、**CHECK／NOT NULL／FK／UNIQUE／payload** の逸脱、**Webhook 実装への短絡**。

---

## 8. shadow／staging 適用はまだ別承認

- 本条および当該 SQL の **コミットだけでは APPLY しない**。
- **別承認**が出た環境でのみ、**プランしたメンテ枠**で実行する。

---

## 9. production APPLY は NO-GO

- **本番では実行しない。**
- 本番用 DDL は **別ファイル・別タイムスタンプ・別レビュー**で起案する。

---

## CHANGELOG

- **2026-04-28:** v1 初版。shadow/staging 実行可能候補と SSOT。
