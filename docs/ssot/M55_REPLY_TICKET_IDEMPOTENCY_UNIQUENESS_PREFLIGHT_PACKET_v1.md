# M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_PACKET_v1

Status: **本番（m55-soul-core／想定 PRODUCTION）における Stripe 処理済みイベント表の一意性／冪等性を実装する前の SELECT-only 観測パケット。** **本条および本 SQL だけでは UNIQUE／partial UNIQUE 作成 GO にしない。** Webhook／Checkout API／Stripe Dashboard／商品棚 UI の実装変更は **本条の範囲外かつ当面 NO-GO**（運用ゲートは設計 SSOT を参照）。

Recorded: **2026-04-28**

Upstream:

- **設計（冪等性・一意性方針）:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_IDEMPOTENCY_UNIQUENESS_DESIGN_REVIEW_v1.md`
- **本 preflight SQL:** `scripts/sql/production/m55_reply_ticket_idempotency_uniqueness_preflight.sql`

**秘密鍵・DB URL・Webhook secret・raw `user_id`・payload 本文を SSOT やログ共有に載せない。** この SQL はカタログ・件数・制約／索引定義のテキストのみを返す想定である。

---

## 1. 診断目的

Fulfillment 用スキーマ受け皿（`public.stripe_processed_events` と `reply_wallet_ledgers` の Stripe 参照列）が **本番に存在する前提**で、Webhook 本番運用や UNIQUE 適用に先立ち以下を **現状値として固定**する。

- **処理済みイベント表**: 列一覧、`stripe_event_id` の型と nullable、補助列の存在、行数、非NULL・NULL、`stripe_event_id` の **重複超過（非 DISTINCT との差）**
- **制約・索引**: PK／UNIQUE／FK／CHECK、全索引、`stripe_event_id` に載る UNIQUE（全文／WHERE ありのヒューリスティック）
- **Ledger**: Stripe 関連 4 列の存在と nullable（カタログ）、総行数、各参照列の非NULL件数
- **単一行サマリ**（SECTION 7）: 「一意制約を設計レビューに載せられるか」の **入力**（自動 GO／STOP 判定ではない）

---

## 2. SELECT-only であること

- **許可:** `SELECT` のみ（および `WITH` で囲んだ読み取り集計）。
- **禁止:** `INSERT`／`UPDATE`／`DELETE`／`ALTER`／`DROP`／`CREATE`／`SET`／その他副作用。
- **返却:** 件数、列名、型、`nullable`、制約／索引の定義文言、テーブル・列の存在フラグのみ（生識別子の羅列や payload は返さない）。

---

## 3. 本条単体では UNIQUE 適用 GO にしない

| 項目 | 内容 |
|------|------|
| **本パケット** | **観測のみ**。DDL 適用・Webhook ON の承認ではない。 |
| **unique／index candidate** | 結果を入力に **別途 design review（SSOT／PR／承認ゲート）**へ進む。 |
| **`uniqueness_candidate_safe_to_design = true`** | **ヒューリスティック**: テーブル存在・`stripe_event_id` 列存在・重複超過 **0** のとき **TRUE**。NOT NULL／部分一意の妥当性・アプリ要件は **別判断**。 |

---

## 4. 実装スクープ外（当面 NO-GO）

- **Webhook／Checkout API／Stripe Dashboard 操作／商品棚 UI**: 本条では **変更しない・本番可否を断定しない**。`event.id` 欠損時の STOP 必須化などは設計レビュー SSOT が正本。
- **migration／UNIQUE／partial UNIQUE の DDL 作成**: 本条では **行わない**。

---

## 5. SQL セクション対応

| Section | 内容 |
|---------|------|
| 1 | `current_database()` — **対象が PRODUCTION かは UI／運用で照合** |
| 2 | `stripe_processed_events` 存在、`information_schema` による **全列**カタログ、`stripe_event_id`／`checkout_session_id`／`payment_intent_id`／`report_instance_id`／`status` の **存在フラグ**と `stripe_event_id` の型・nullable |
| 3 | **`stripe_processed_events` の総行数**、`stripe_event_id` の non-null／null／distinct 非NULL、`stripe_event_id_duplicate_count`（同一非NULL値の **超過行数** = Σ(count−1) per value） |
| 4 | `pg_constraint`（PK／UNIQUE／FK／CHECK 等）、`pg_indexes` 全件 |
| 5 | `pg_indexes.indexdef` の **ILIKE ヒューリスティック**で `stripe_event_id` に紐づく UNIQUE 相当／`WHERE` を含む partial 風 UNIQUE の **有無** |
| 6 | `reply_wallet_ledgers` の **4 列**（`stripe_event_id`／`stripe_checkout_session_id`／`stripe_payment_intent_id`／`product_key`）の存在・nullable、総行数、3 参照列の非NULL件数 |
| 7 | **サマリ一行**（§6） |

**注意:** `stripe_processed_events` が存在しない環境では Section 3 以降（および Section 7）が **`FROM public.stripe_processed_events` でエラー**になる。先に Section 2 の `processed_events_table_exists` を確認すること。

---

## 6. SECTION 7 サマリ列の意味

| 列 | 意味 |
|----|------|
| `processed_events_table_exists` | `public.stripe_processed_events` の存在 |
| `stripe_event_id_column_exists` | 列 `stripe_event_id` の存在（カタログ） |
| `stripe_event_id_nullable` | カタログ上 `is_nullable = YES` のとき **TRUE**（NOT NULL 制約なし） |
| `processed_events_row_count` | 表の総行数 |
| `stripe_event_id_non_null_count` / `stripe_event_id_null_count` | `stripe_event_id` の non-null／null 件数 |
| `stripe_event_id_duplicate_count` | 非NULL `stripe_event_id` について **重複により余分に存在する行数**（総 non-null − distinct non-null）。**0 でなければ** full UNIQUE on `(stripe_event_id)` は **データ整備前は不適合** |
| `stripe_event_id_unique_index_exists` | `indexdef` に UNIQUE かつ `stripe_event_id` を含むと **TRUE**（文言マッチの近似） |
| `stripe_event_id_partial_unique_index_exists` | 上に加え `WHERE` を含むと **TRUE**（partial UNIQUE の **候補検出用**） |
| `uniqueness_candidate_needed` | 上記 UNIQUE 系が **いずれも検出されない** と **TRUE**（制約未整備の観測） |
| `uniqueness_candidate_safe_to_design` | 表・列あり **かつ** `stripe_event_id_duplicate_count = 0` のとき **TRUE**（設計に進む **必要条件の一部**） |
| `blocking_gap_count` | 次を **加算した smallint**: 表なし(+1)、`stripe_event_id` 列なし(+1)、重複超過>0(+1)、Ledger の **4 列すべてが存在しない**わけではないが **どれか欠ける**ときは **満たす列数<4 で +1** |

---

## 7. Unique 候補判断の読み替え（人間レビュー用）

| 観測 | 読み |
|------|------|
| 総行数 0 | データ面の重複は未発生。partial UNIQUE（WHERE non-null）等の **設計論点**は残る |
| `stripe_event_id_nullable = true` かつ一意を non-null に限りたい | **partial unique** (`WHERE stripe_event_id IS NOT NULL`) が典型的候補。full UNIQUE と NOT NULL は **複数NULL行**との整合で別検討 |
| `stripe_event_id_duplicate_count > 0` | **適用ブロッカー**: クリーニングまたは根本調査まで UNIQUE 適用は設計レビューで **STOP** とみなす |
| Webhook 側 `event.id` | 欠損時の **処理停止（STOP）必須**は設計 SSOT の正本（本条は観測のみ） |

---

## 8. 次のステップ（本パケット完了後）

1. PRODUCTION で本 SQL を **SECTION 単位または全文**実行し、結果を設計レビューやチケット用に整理する（秘密や生データは含めない）。
2. **unique／index candidate design review**（および必要ならデータ整備プラン）に進むかは **結果と product ゲート**で決める。本条のみでは GO にしない。
3. Webhook／Checkout 等は **別承認まで NO-GO**。

---

## 9. CHANGELOG — v1

- 初版: Fulfillment 受け皿追加後の **idempotency／uniqueness 事前観測**用 SELECT-only パケットと SSOT。
