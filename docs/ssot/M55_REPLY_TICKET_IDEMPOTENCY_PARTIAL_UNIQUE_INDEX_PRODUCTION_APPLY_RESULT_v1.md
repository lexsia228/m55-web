# M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_PRODUCTION_APPLY_RESULT_v1

Status: **本番（m55-soul-core／**PRODUCTION**）への **partial unique index** 適用の **証跡 SSOT**。**DB 側 idempotency 基盤の一段完了**を記録する。**本文は Webhook／Checkout 等の実装 GO ではない。**  

Recorded: **2026-04-28**

Upstream:

- **APPLY gate:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_PRODUCTION_APPLY_GATE_v1.md`
- **DDL 候補:** `scripts/sql/production/m55_reply_ticket_idempotency_partial_unique_index_candidate.sql`
- **静的監査:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_STATIC_AUDIT_v1.md`
- **候補・前提:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_CANDIDATE_v1.md`
- **Index 設計レビュー:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_INDEX_DESIGN_REVIEW_v1.md`

**環境固有のシークレット・DB URL・Webhook signing secret は記載しない。**

---

## 1. 実行環境

| 項目 | 内容 |
|------|------|
| **プロジェクト** | **m55-soul-core**（想定ブランチ **`main`**） |
| **論理環境** | **PRODUCTION** |
| **実行 SQL** | **partial unique index の **1 文のみ**（下記 §2） |
| **`supabase/migrations`** | **未使用**（当該 DDL を migration パスに置いていない） |
| **Webhook／Checkout API／Stripe Dashboard／商品棚 UI** | **未変更**（本条の範囲外） |

---

## 2. 実施内容

| 項目 | 内容 |
|------|------|
| **変更** | `public.stripe_processed_events` の列 **`stripe_event_id`** に対する **partial UNIQUE index** を作成 |
| **述語** | **`WHERE stripe_event_id IS NOT NULL`** |
| **列の NOT NULL 制約** | **付与していない**（索引の `WHERE` のみ） |
| **FK** | **なし** |
| **CHECK** | **なし** |
| **full unique**（`WHERE` なしの一意索引としての別物） | **本条の適用では作成していない** |
| **既存行の UPDATE** | **本 DDL では発生しない**（データ移行なし） |

**実行文（記録用・リテラル一致）:**

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_processed_events_stripe_event_id_unique_not_null
ON public.stripe_processed_events (stripe_event_id)
WHERE stripe_event_id IS NOT NULL;
```

---

## 3. Postflight 結果

### 3.1 索引メタデータ

| フィールド | 値 |
|------------|-----|
| `indexname` | `idx_stripe_processed_events_stripe_event_id_unique_not_null` |
| `has_unique` | **true** |
| `has_stripe_event_id` | **true** |
| `has_partial_where_not_null` | **true** |
| `indexdef` | `CREATE UNIQUE INDEX idx_stripe_processed_events_stripe_event_id_unique_not_null ON public.stripe_processed_events USING btree (stripe_event_id) WHERE (stripe_event_id IS NOT NULL)` |

### 3.2 件数（適用後に観測）

| 指標 | 値 |
|------|-----|
| `processed_events_count` | **0** |
| `wallet_count` | **8** |
| `ledger_count` | **10** |
| `session_count` | **11** |

**解釈:** `stripe_processed_events` は **0 件のまま**。wallet／ledger／session の件数は **当該 index 作成のみでは変化しない**ことが期待され、観測値は **ベースラインとして固定**する。

---

## 4. 判定

| 判定 | 内容 |
|------|------|
| **partial unique index の本番 APPLY** | **PASS**（postflight で意図した索引が存在し、定義が一致） |
| **DB 側** | **非NULLの `stripe_event_id` に対する一意性**が **物理的に担保**された |
| **運用上の位置づけ** | **Stripe Webhook 再送**などで同一 `event.id` の二重 INSERT を **DB で弾ける基盤**が整った（**アプリ／Webhook の冪等フローと併用**が前提） |
| **Webhook 処理** | **未実装**のまま（本条は **スキーマ／索引のみ**） |

---

## 5. 残論点

| # | 論点 |
|---|------|
| 1 | **Webhook 側で `event.id` 欠損時は STOP** を必須化する（partial unique は **NULL 行を複数許容**するため）。 |
| 2 | **`stripe_processed_events` の insert 順序・既処理 no-op** の具体フローは **未実装**。 |
| 3 | **wallet 更新と ledger insert** の **トランザクション境界・一貫性**は **未確定**（Fulfillment SSOT／別設計で詰める）。 |
| 4 | **Checkout API／Stripe Dashboard／商品棚 UI** は **未着手**。 |
| 5 | **refund／cancel／dispute** は **別 SSOT**（本条の範囲外）。 |

---

## 6. 引き続き NO-GO

| 区分 | NO-GO |
|------|--------|
| **Webhook 実装** | まだ |
| **Checkout API 実装** | まだ |
| **Stripe Dashboard 変更** | まだ |
| **商品棚 UI** | まだ |
| **secret／Webhook secret／DB URL の共有・SSOT 貼付** | 禁止 |
| **full unique**（本条以外の方針変更としての追加） | 本条の完了だけでは **着手せず** |
| **列 NOT NULL 化** | 別ゲート |
| **FK 追加** | 別ゲート |
| **CHECK 変更** | 別ゲート |
| **payload 全文保存** | 方針どおり **行わない** |

---

## 7. 次の候補

1. **本条をリポジトリにコミット**し、運用・監査で **本番索引の存在**を参照できるようにする。  
2. **Checkout API／Webhook の fulfillment transaction 設計レビュー**へ進む（**先に設計 SSOT**、**コード実装はその承認後**）。  
3. 必要に応じ **shadow／staging** での同型検証や **preflight 再実行**を、今後の変更ゲートに組み込む。

---

## 8. CHANGELOG — v1

- 初版: 本番 partial unique index 適用および postflight 観測の証跡固定。
