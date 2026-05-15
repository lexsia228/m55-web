# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_APPLY_RESULT_v1

Status: **本番（m55-soul-core）additive migration APPLY の証跡 SSOT** — **本条は Webhook／Checkout／課金付与実装の GO ではない。**  

Recorded: **2026-04-28**

Upstream:

- **最終ゲート:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_FINAL_PRODUCTION_APPLY_APPROVAL_GATE_v1.md`
- **実行 SQL:** `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql`
- **静的監査:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_CANDIDATE_STATIC_AUDIT_v1.md`

**本条にシークレット・DB URL・Webhook secret を記載しない。**

---

## 1. 実行環境

| 項目 | 内容 |
|------|------|
| 対象 | **m55-soul-core** / **main** / **PRODUCTION** |
| 実行ファイル | **`m55_reply_ticket_fulfillment_additive_migration_production_candidate.sql` のみ** |
| **staging 用 SQL** | **実行していない** |
| **`supabase/migrations`** | **配置していない** |
| アプリ／外部 | **Webhook／Checkout API／Stripe Dashboard／商品棚 UI** は **触っていない** |

---

## 2. 実施内容（DDL）

| 項目 | 内容 |
|------|------|
| **新規** | **`public.stripe_processed_events`** を **作成** |
| **列追加** | **`public.reply_wallet_ledgers`** に **4** つの **nullable text** 列：`stripe_event_id`、`stripe_checkout_session_id`、`stripe_payment_intent_id`、`product_key` |
| **性質** | **additive／nullable のみ**。**既存行に対する `UPDATE` は実行していない**（DDL のみ）。 |
| **CHECK** | **変更なし** |
| **`NOT NULL`／FK／UNIQUE** | **追加なし** |
| **`payload_json`** | **追加なし** |

---

## 3. Postflight 結果

### 3.1 列（存在・型・nullable）

**`reply_wallet_ledgers`**（すべて **text／nullable YES**）

| 列 |
|-----|
| `stripe_event_id` |
| `stripe_checkout_session_id` |
| `stripe_payment_intent_id` |
| `product_key` |

**`stripe_processed_events`**（カタログ上 **nullable YES**）

| 列 | 型（記録値） |
|----|----------------|
| `id` | uuid |
| `stripe_event_id` | text |
| `checkout_session_id` | text |
| `payment_intent_id` | text |
| `product_key` | text |
| `report_instance_id` | uuid |
| `user_ref_hash` | text |
| `status` | text |
| `processed_at` | timestamptz |
| `created_at` | timestamptz |
| `updated_at` | timestamptz |

### 3.2 件数維持

| メトリクス | 適用後の値 |
|------------|:----------:|
| `wallet_count`（`reply_ticket_wallets`） | **8** |
| `ledger_count`（`reply_wallet_ledgers`） | **10** |
| `session_count`（`reply_sessions`） | **11** |
| `wallet_ri_non_null` | **5** |
| `ledger_ri_non_null` | **5** |
| `session_ri_non_null` | **0** |

※ **総行数・RI の非NULL 件数**は **適用ゲートで固定した事前ベースラインと一致**した。

### 3.3 制約・増分・データ操作

| 観点 | 結果 |
|------|:----:|
| **CHECK 変更** | **なし** |
| **`NOT NULL` の追加** | **なし** |
| **FK 追加** | **なし** |
| **`UNIQUE` の追加** | **なし** |
| **`payload_json`** | **なし** |
| **既存行のデータ更新（意図した UPDATE）** | **なし** |

---

## 4. 判定

| 読み |
|------|
| **production additive migration の APPLY は PASS** とする。 |
| **Stripe 追加相談返書チケット Fulfillment** 向けの **スキーマ受け皿**（ **`stripe_processed_events`** ＋ Ledger 参照列）が **本番に存在**。 |
| 本条は **課金付与・Webhook の業務ロジック実装ではない**。 |
| **Webhook 実装へは直行しない**（§5〜6 と整合）。 |

---

## 5. 限界／残論点

| # | 内容 |
|---|------|
| 1 | **`stripe_event_id`（または運用で定める冪等キー）の一意／冪等の実効担保**は **未実装**。 |
| 2 | **`stripe_processed_events`** は **nullable 中心の受け皿**。**運用規則・アプリ側の書き込み契約が未決の部分がある。** |
| 3 | **Webhook 本番前**に **`UNIQUE`／部分一意／ロック戦略**等を **別ゲート**で **必須化**する。 |
| 4 | **Checkout API／Webhook／商品棚 UI** は **未実装**。 |
| 5 | **Stripe Dashboard** は **未変更**。 |

---

## 6. 引き続き NO-GO

| 項目 |
|------|
| **Webhook 実装** |
| **Checkout API 実装** |
| **Stripe Dashboard 変更** |
| **商品棚 UI** |
| **`supabase/migrations` 昇格のみで本論を十分とみなす** |
| **`NOT NULL`／FK／strict UNIQUE**／**payload 全文保存**（**別 ADR／ゲート**まで） |
| **secret／Webhook secret／DB URL の転記・露出** |

---

## 7. 次の候補

| 順序 | 内容 |
|------|------|
| 1 | **本条 SSOT をリポジトリに確定コミット**（運用手順どおり）。 |
| 2 | **idempotency／uniqueness design review SSOT**（`stripe_event_id` を軸とした **別文書／別ゲート**）。 |
| 3 | **その後** Checkout API／Webhook／UI 設計（**本条 PASS をもって自動 GO にしない**）。 |

---

## CHANGELOG

- **2026-04-28:** v1 初版。m55-soul-core における production candidate DDL 適用と postflight を記録。
