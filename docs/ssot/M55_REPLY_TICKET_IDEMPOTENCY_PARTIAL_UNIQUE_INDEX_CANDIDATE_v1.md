# M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_CANDIDATE_v1

Status: **`public.stripe_processed_events (stripe_event_id)` の **partial UNIQUE index** DDL **候補（ドラフトのみ）**。**最終承認なしでの実行禁止。** **`supabase/migrations` に未配置。**  

Recorded: **2026-04-28**

Upstream:

- **Index 設計レビュー（推奨根拠）:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_INDEX_DESIGN_REVIEW_v1.md`
- **本番 preflight 観測:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_RESULT_v1.md`
- **冪等設計（正本の一部）:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_IDEMPOTENCY_UNIQUENESS_DESIGN_REVIEW_v1.md`

**候補 DDL ファイル:** `scripts/sql/production/m55_reply_ticket_idempotency_partial_unique_index_candidate.sql`

**環境固有のシークレット・DB URL・Webhook signing secret は記載しない。**

---

## 1. DDL draft の目的

設計レビューで確定した **候補 B（partial unique）** を、将来の **本番適用ゲート**に持ち込むための **単一ステートメント候補**として固定する。レビュー・静的監査・shadow／staging／本番 preflight の **入力物**であり、**本条または当該 SQL ファイル単体では実行 GO にならない。**

---

## 2. Partial unique を推奨する理由（本候補に反映）

| 要点 | 内容 |
|------|------|
| **意図の明確さ** | **非NULLの `stripe_event_id`（Stripe `event.id`）だけ**を一意に束ねる。Webhook 再送時の二重 INSERT を DB で弾ける。 |
| **nullable 維持** | 列は **NOT NULL にしない**方針と整合。 **`WHERE stripe_event_id IS NOT NULL`** で **値が載った行**にだけ一意制約を効かせる。 |
| **preflight 整合** | 本番観測では **行数 0・重複 0・既存 UNIQUE なし**。候補適用の **データ衝突リスクは当時点で低い**（適用直前に再 preflight すること）。 |
| **正本の位置づけ** | `payment_intent_id` **単独主キーは避ける**、`checkout_session_id` は **補助照合**（上位 SSOT）。DB 一意の核は **`event.id` 軸**に揃える。 |

---

## 3. NOT NULL を入れない理由

- スキーマ上 **`stripe_event_id` は nullable** のまま運用し、**必須化は別ゲート**（データ・アプリ・バックフィルが揃ってから）とする。  
- Partial unique は **「書き込むレコードはアプリが必ず `event.id` を載せる」契約**とセットで初めて意味が通るため、**NOT NULL の省略は意図的**（Webhook 側の **欠損 STOP** と二重防御する）。

---

## 4. Webhook 側 `event.id` 欠損 STOP が必須であること

Partial unique は **NULL 行を複数許容**する。**`event.id` が取れないイベントを処理続行**すると、**同一決済の二重付与**や **曖昧行の蓄積**に繋がりうる。  
したがって **Webhook では `event.id` 欠損時は処理しない（STOP）** を **必須**とする（実装は別承認・別フェーズ）。**DB 制約だけに依存しない。**

---

## 5. Preflight 条件（適用前に満たすこと）

| 条件 | 本番観測時点（参考） |
|------|----------------------|
| `stripe_processed_events` が存在 | **true** |
| `stripe_event_id` 列が存在 | **true** |
| **行数 0** または **`stripe_event_id` 重複 0** | **0 件・重複 0** |
| **`stripe_event_id` 用の既存 UNIQUE／partial UNIQUE なし** | **いずれも false（＝未有り）** |

**注意:** 実際の適用直前に **同梱 preflight を再実行**し、行数・重複・索引の有無が **この条件をまだ満たすこと**を確認する。

---

## 6. Postflight 条件（適用後に確認すること）

| 確認 | 期待 |
|------|------|
| **本 partial unique index が存在** | `pg_indexes` 等で **定義どおり**存在 |
| **`stripe_processed_events` の行数** | **適用前後で変化なし**（本 DDL は行を増やさないが、計測で固定） |
| **wallet／ledger／session 等の参照行数** | **当該適用のみでは不要な変化なし**（別トラフィックと切り分け） |
| **NOT NULL／FK／CHECK の増分** | **なし**（本条候補は **CREATE UNIQUE INDEX のみ**） |

---

## 7. STOP 条件（適用・Review で止める）

| STOP |
|------|
| **`stripe_event_id` に重複行が存在する**状態で本 index を貼ろうとする |
| **既存 UNIQUE／partial unique** が **想定外に存在**する（命名・定義の衝突） |
| 同一変更に **full unique** や **NOT NULL 化**を **混ぜる**（別ゲートに分離） |
| **本 DDL の承認と同時に Webhook 実装を本番化**する（手順の混線） |
| **`payment_intent_id` 単独**で正本化する、`checkout_session_id` **のみ**で二重防止する等、上位 SSOT に反する設計 |

---

## 8. Candidate DDL（本文と同一）

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_processed_events_stripe_event_id_unique_not_null
ON public.stripe_processed_events (stripe_event_id)
WHERE stripe_event_id IS NOT NULL;
```

- **`IF NOT EXISTS`:** 再実行安全性のため（運用ポリシーで **CONCURRENTLY** 等を要する場合は **別ドラフト**で検討）。  
- **配置:** 現時点では **`supabase/migrations` には置かない。**

---

## 9. 現時点ゲート一覧

| ゲート | 判定 |
|--------|------|
| **DDL draft（候補ファイル＋本条）の作成** | **GO** |
| **本 SQL の本番実行** | **NO-GO**（最終承認・apply gate 後） |
| **Webhook／Checkout API** | **NO-GO** |
| **Stripe Dashboard／商品棚 UI** | **NO-GO** |

---

## 10. CHANGELOG — v1

- 初版: partial unique index 候補 DDL と適用前後条件・STOP の SSOT 化。
