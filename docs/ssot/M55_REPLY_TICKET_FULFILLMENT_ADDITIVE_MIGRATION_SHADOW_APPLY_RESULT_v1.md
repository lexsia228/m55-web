# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_APPLY_RESULT_v1

Status: **m55-soul-shadow における candidate DDL 適用の証跡 SSOT** — **本条は production APPLY GO ではない。**  

Recorded: **2026-04-28**

Upstream:

- **適用ゲート:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_APPLY_GATE_v1.md`
- **候補 SQL:** `scripts/sql/staging/m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql`
- **静的監査:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_CANDIDATE_STATIC_AUDIT_v1.md`

**本条にシークレット・DB URL・Webhook secret を記載しない。**

---

## 1. 実行環境

| 項目 | 内容 |
|------|------|
| 接続対象 | **`m55-soul-shadow`** |
| 本番実行 | **実施していない**（**`m55-soul-core` / `main` / `PRODUCTION`** では実行していない） |
| **`supabase/migrations`** | **配置していない** |
| アプリ・外部 | **Webhook／Checkout API／Stripe Dashboard／商品棚 UI** は **触っていない** |

---

## 2. 実施内容

| 項目 | 内容 |
|------|------|
| **新規テーブル** | **`public.stripe_processed_events`** を **作成**した |
| **`reply_wallet_ledgers` への列追加**（いずれも **text**、**nullable**） | `stripe_event_id`、`stripe_checkout_session_id`、`stripe_payment_intent_id`、`product_key` |
| **CHECK** | **変更なし** |
| **NOT NULL** | **付与なし** |
| **FK** | **なし** |
| **UNIQUE** | **なし** |
| **`payload_json`** | **追加なし**（**raw payload 保存列なし**） |
| **既存行** | **`UPDATE` は意図しない**（DDL は **CREATE TABLE** および **ADD COLUMN** のみ） |

---

## 3. Postflight 結果

### 3.1 列の存在・型・nullable（確認済み）

**`reply_wallet_ledgers`**

| 列 | 型 | nullable（カタログ） |
|----|----|---------------------|
| `stripe_event_id` | text | YES |
| `stripe_checkout_session_id` | text | YES |
| `stripe_payment_intent_id` | text | YES |
| `product_key` | text | YES |

**`stripe_processed_events`**

| 列 | 型 | nullable（カタログ） |
|----|----|---------------------|
| `id` | uuid | YES |
| `stripe_event_id` | text | YES |
| `checkout_session_id` | text | YES |
| `payment_intent_id` | text | YES |
| `product_key` | text | YES |
| `report_instance_id` | uuid | YES |
| `user_ref_hash` | text | YES |
| `status` | text | YES |
| `processed_at` | timestamptz | YES |
| `created_at` | timestamptz | YES |
| `updated_at` | timestamptz | YES |

### 3.2 件数（適用後）

| メトリクス | 値 |
|------------|:--:|
| `wallet_count` | **0** |
| `ledger_count` | **0** |
| `session_count` | **0** |
| `wallet_ri_non_null` | **0** |
| `ledger_ri_non_null` | **0** |
| `session_ri_non_null` | **0** |

※ **全テーブル行数がゼロ**のため、「**既存行が更新されていないこと**」は **行数不変の観点では自明**（データ行が存在しない環境）。

---

## 4. 判定

| 項目 | 読み |
|------|------|
| **shadow APPLY** | **PASS**（意図した **additive／nullable** DDL が **shadow 上で成立**） |
| **スキーマ検証** | **成立** |
| **データ面の実効検証** | **未実施に等しい** — **shadow は **0 件 DB** のため、**本番相当の行・RI 分布・競合**は検証できていない |
| **production APPLY** | **GO ではない**（本条は **証跡のみ**） |

---

## 5. 引き続き NO-GO

- **production APPLY**  
- **`supabase/migrations` 昇格**  
- **Webhook 実装**  
- **Checkout API 実装**  
- **Stripe Dashboard 変更**  
- **商品棚 UI**  
- **env／secret／Webhook secret の出力**  
- **NOT NULL／FK／strict UNIQUE**（本条の範囲外の **強制**は未導入。**本番前は冪等 UNIQUE 等が別ゲート**）  
- **payload 全文保存**  

---

## 6. 次の候補

| 順序 | 内容 |
|------|------|
| 1 | **production 用 preflight packet**（または本番接続の **SELECT-only** で **行数／列有無／CHECK／RI 件数**を再取得） |
| 2 | **production apply gate**（別文書・別承認） |
| 3 | 本番適用前に **本番の行数・既存列・制約・RI 件数**を **必ず再確認**する |
| 4 | **本番に適用してよいか**は **本条の PASS では自動承認されず**、**別承認**とする |

---

## CHANGELOG

- **2026-04-28:** v1 初版。m55-soul-shadow での適用結果と postflight を SSOT 化。
