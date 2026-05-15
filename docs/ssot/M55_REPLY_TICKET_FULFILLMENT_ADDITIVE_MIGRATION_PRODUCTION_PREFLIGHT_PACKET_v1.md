# M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_PRODUCTION_PREFLIGHT_PACKET_v1

Status: **本番（m55-soul-core／想定 PRODUCTION）適用前の SELECT-only 再確認パケット** — **本条および本 SQL だけでは本番 APPLY GO にならない。**  

Recorded: **2026-04-28**

Upstream:

- **shadow 適用結果:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_APPLY_RESULT_v1.md`
- **本 preflight SQL:** `scripts/sql/production/m55_reply_ticket_fulfillment_additive_migration_production_preflight.sql`
- **候補 DDL（shadow で成立）:** `scripts/sql/staging/m55_reply_ticket_fulfillment_additive_migration_shadow_candidate.sql`
- **適用ゲート（本番側は別文書）:** `production apply gate` は **別 SSOT** とする（本条では定義しない）。

**秘密鍵・DB URL・Webhook secret・生の識別子・payload 本文を SSOT に貼らない。**

---

## 1. 本番 preflight の目的

本番に **additive／nullable の Fulfillment 用スキーマ**（`stripe_processed_events` 新規、`reply_wallet_ledgers` に **4 列追加**）を入れる **前に**、以下を **カタログ・件数のみ**で固定する。

- **未作成オブジェクト**／**未追加列**であること（衝突検出）
- **行数と `report_instance_id` 分布**の **ベースライン**（適用後に比較する）
- **CHECK／NOT NULL／FK／UNIQUE／索引**の **ベースライン**（適用後は **変化なし** が期待）

**shadow での PASS は必要条件にすぎず**、**shadow は 0 件 DB**であったため **実データ妥当性の十分条件ではない**（`M55_REPLY_TICKET_FULFILLMENT_ADDITIVE_MIGRATION_SHADOW_APPLY_RESULT_v1.md`）。

---

## 2. SELECT-only であること

- **許可:** `SELECT` のみ（カタログ／集計）。
- **禁止:** `INSERT`／`UPDATE`／`DELETE`／DDL／`SET`。
- **返却:** `current_database()` 名、列名・型・nullable、制約文言、**件数のみ**。

---

## 3. 本条単体では本番 APPLY GO にしない

| 項目 | 内容 |
|------|------|
| **本パケット** | **観測**のみ。承認・GO ではない。 |
| **production apply gate** | **別 SSOT**（承認フロー）。 |
| **本番 DDL の実行** | **別承認**（本条で SQL 実行はしない）。 |

---

## 4. SQL セクション対応

| Section | 内容 |
|---------|------|
| 1 | `current_database()` — **プロジェクトが本番であることは UI／運用で照合** |
| 2 | `stripe_processed_events` の有無、**Ledger 4 候補列**の有無、**`payload_json`** の有無、`stripe_events` の有無 |
| 3 | wallet／ledger／session **総行数**、**RI 非NULL／NULL**（NULL 側を **quarantine バケット**として件数記録） |
| 4 | **cap 式違反行数** |
| 5 | Ledger の **全制約**、**`is_nullable = NO` の列一覧**、索引 |
| 6 | Wallet の **全制約**、索引 |
| 7 | **サマリ一行**（§4.1） |

---

## 4.1 SECTION 7 サマリの読み方（ヒューリスティック）

| 列 | 望ましい（本番適用前） |
|----|-------------------------|
| `stripe_processed_events_absent_ok_for_additive` | **TRUE**（同名表が **まだ無い**） |
| `ledger_four_candidate_columns_all_absent_ok` | **TRUE**（**4 列とも未存在**） |
| `reply_wallet_ledgers_no_payload_json_ok` | **TRUE**（**`payload_json` 列が無い**） |
| `wallet_cap_formula_has_zero_violations_ok` | **TRUE**（cap 違反 **0 件**） |
| `production_additive_schema_preflight_pass_summary_heuristic` | 上記 **すべて TRUE** なら **TRUE**（**人手・別条件の最終 GO は別**） |

---

## 5. 対象 DB 確認（手動＋SQL）

1. Supabase／DB クライアントの **プロジェクト名／ラベル**で **`m55-soul-core`**（または運用で定めた **PRODUCTION**）であることを確認する。  
2. **SECTION 1** の `current_database_name` を SSOT に転記し、**期待する DB 名と一致**することを確認する。  
3. **接続文字列・パスワードをチケットや SSOT に貼らない。**

---

## 6. APPLY 後 postflight 候補（本番用・別セッション）

以下を **同一本番**で **適用後のみ**実施し、**適用前転記**と突合する。

| # | 条件 |
|---|------|
| 1 | `public.stripe_processed_events` が **存在**する。 |
| 2 | `reply_wallet_ledgers` に **4 列**（`stripe_event_id`、`stripe_checkout_session_id`、`stripe_payment_intent_id`、`product_key`）が **あり**、いずれも **text／nullable YES**。 |
| 3 | **`payload_json` は追加されていない**。 |
| 4 | **wallet／ledger／session の総行数**が preflight と **一致**。 |
| 5 | **RI 非NULL／NULL 件数**が preflight と **一致**。 |
| 6 | **Ledger の CHECK など制約定義文字列**が preflight と **一致**。 |
| 7 | **`NOT NULL`／`FK`／`UNIQUE`** が **新規に増えていない**。 |

---

## 7. STOP 条件

| STOP | 内容 |
|------|------|
| 1 | **`stripe_processed_events` が既に存在**し、設計と異なる／衝突している |
| 2 | **Ledger 4 列のいずれかが既に存在**し、**型・nullable が想定と違う** |
| 3 | **`payload_json` 等ペイロード列**が混入している |
| 4 | 本番で **CHECK／NOT NULL／FK／UNIQUE を変える DDL** と **同時適用・混在**している |
| 5 | **行数や RI 件数**が運用上の前提と整合しない（要調査） |
| 6 | **本番で DDL を即実行**しようとする（ゲート迂回） |
| 7 | **`supabase/migrations` へ昇格**してしまう運用になっている |
| 8 | **Webhook／Checkout 実装**へ **スキーマだけで飛ぶ** |

---

## 8. NO-GO（本条の達成のみでは許可しない）

- **本番 APPLY**  
- **`supabase/migrations` にのせた本番 migration の実行**  
- **Webhook／Checkout／Dashboard／商品棚 UI**  
- **secret の出力**

---

## 9. CHANGELOG

- **2026-04-28:** v1 初版。production preflight SELECT と PACKET。
