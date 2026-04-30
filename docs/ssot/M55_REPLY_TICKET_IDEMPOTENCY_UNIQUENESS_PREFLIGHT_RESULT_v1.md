# M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_RESULT_v1

Status: **`m55_reply_ticket_idempotency_uniqueness_preflight.sql` を本番（m55-soul-core／`main`／**PRODUCTION**）で **SELECT のみ実行した記録**。DB 変更なし。**本条は UNIQUE 適用または Webhook の GO にはならない。**  

Recorded: **2026-04-28**

Upstream:

- **実行 SQL:** `scripts/sql/production/m55_reply_ticket_idempotency_uniqueness_preflight.sql`
- **手順説明:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_PACKET_v1.md`

**本条に環境固有のシークレット・DB URL・Webhook signing secret を記載しない。** 列名や集計フラグのみを転記する。

---

## 1. 実行条件

| 項目 | 内容 |
|------|------|
| 対象 | **本番 m55-soul-core／`main`／PRODUCTION** |
| SQL | **SELECT のみ**。`UPDATE`／`INSERT`／`DELETE`／`ALTER`／`DROP`／`CREATE`／`SET` は **実行していない** |
| DB 変更 | **なし** |
| アプリ／Dashboard | Webhook／Checkout API／Stripe Dashboard／商品棚 UI は **触っていない** |

---

## 2. SECTION 7 サマリ一行の結果（本番）

| 列名 | 値 |
|------|-----|
| `processed_events_table_exists` | **true** |
| `stripe_event_id_column_exists` | **true** |
| `stripe_event_id_nullable` | **true** |
| `processed_events_row_count` | **0** |
| `stripe_event_id_non_null_count` | **0** |
| `stripe_event_id_null_count` | **0** |
| `stripe_event_id_duplicate_count` | **0** |
| `stripe_event_id_unique_index_exists` | **false** |
| `stripe_event_id_partial_unique_index_exists` | **false** |
| `uniqueness_candidate_needed` | **true** |
| `uniqueness_candidate_safe_to_design` | **true** |
| `blocking_gap_count` | **0** |

読み替え:

- **`public.stripe_processed_events` は存在**する。
- **`stripe_event_id` 列は存在**し、**nullable**である。
- 表は **0 件**のため、`stripe_event_id` の **重複カウントも 0**（データ面の競合なし）。
- **`stripe_event_id` に載る UNIQUE／partial UNIQUE インデックスは検出されない**（ヒューリスティック）。
- **`uniqueness_candidate_needed = true`:** DB 側に **`event.id` 軸の一意制約インデックスはまだない**。
- **`uniqueness_candidate_safe_to_design = true`:** （SQL 定義どおり）表・列あり **かつ重複超過 **0**。設計レビューに載せる **必要条件の一端**として良い。**単独で DDL GO とはみなさない。**（詳細はパケット SSOT）。
- **`blocking_gap_count = 0`:** パケット定義どおりの **ブロッキング総合フラグなし**。

---

## 3. 判定（本条に基づく運用上の読み）

| 判定 | 内容 |
|------|------|
| **unique／index candidate の設計レビュー** | **進めてよい（GO を本条で宣言）** → `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_INDEX_DESIGN_REVIEW_v1.md` |
| **UNIQUE／partial UNIQUE の DB 適用** | **まだ NO-GO**（本条・本実行では実施しない） |
| **Webhook 実装** | **まだ NO-GO** |
| **二重防御** | **DB 制約（将来適用）とアプリ側 idempotency の両方が必要**（設計レビュー SSOT で展開する） |

---

## 4. 現時点ゲート一覧（本条だけの範囲）

| ゲート | 判定 |
|--------|------|
| preflight 結果の SSOT 化（本条） | **GO** |
| index／unique 設計レビュー SSOT の作成・参照 | **GO**（別文書に委ねる） |
| UNIQUE／partial UNIQUE 作成 | **NO-GO** |
| Webhook／Checkout／Dashboard／商品棚 UI | **NO-GO** |

---

## 5. CHANGELOG — v1

- 初版: 本番 SELECT-only preflight SECTION 7 サマリの記録および判定の入口を固定した。
