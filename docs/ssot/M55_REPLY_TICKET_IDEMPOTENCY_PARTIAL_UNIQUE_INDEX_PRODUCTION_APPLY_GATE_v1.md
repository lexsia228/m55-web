# M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_PRODUCTION_APPLY_GATE_v1

Status: **本番（m55-soul-core／想定 `main`／**PRODUCTION**）への **partial unique index 適用可否**を運用で判断するための **APPLY gate（チェックリスト）。** **本条は本番 APPLY の承認書の代替ではなく、別承認後に手順と観測を固定するための SSOT。**  

Recorded: **2026-04-28**

Upstream:

- **DDL 候補（1 文のみ）:** `scripts/sql/production/m55_reply_ticket_idempotency_partial_unique_index_candidate.sql`
- **静的監査:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_STATIC_AUDIT_v1.md`
- **候補の目的・postflight 観点:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_CANDIDATE_v1.md`
- **Index 設計レビュー:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_INDEX_DESIGN_REVIEW_v1.md`
- **Idempotency uniqueness preflight:** `scripts/sql/production/m55_reply_ticket_idempotency_uniqueness_preflight.sql`  
  （手順説明: `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_PACKET_v1.md`）

**環境固有のシークレット・DB URL・Webhook signing secret・接続文字列を本条に記載しない。** 証跡用に **git commit hash は運用で別欄に記録**する（リポジトリの実タグ／ハッシュを **貼る場所**はチケット運用に従う）。

---

## 1. APPLY 対象

| 項目 | 内容 |
|------|------|
| **SQL ファイル** | `scripts/sql/production/m55_reply_ticket_idempotency_partial_unique_index_candidate.sql` |
| **対象環境** | **本番 m55-soul-core／`main`／PRODUCTION** |
| **実行してよいステートメント** | 当該ファイル内の **CREATE UNIQUE INDEX を含む 1 文のみ**（ファイル全体を貼り、**手で追記・削除しない**） |

**許可される executable DDL（再掲・静的監査と一致）:**

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_processed_events_stripe_event_id_unique_not_null
ON public.stripe_processed_events (stripe_event_id)
WHERE stripe_event_id IS NOT NULL;
```

---

## 2. APPLY 範囲（変更の境界）

| 含む | 含まない |
|------|-----------|
| **`stripe_processed_events(stripe_event_id)` 上の partial UNIQUE index**（`WHERE stripe_event_id IS NOT NULL`） | **`stripe_event_id` 列への NOT NULL 制約**（列定義の変更ではない） |
| 索引の新規作成のみ | **既存行の `UPDATE`**（本 DDL では発生しない設計） |
| | **CHECK の追加・変更** |
| | **FK の追加** |
| | **WHERE 句のない full unique 一意索引**としての別定義 |
| | Webhook／Checkout API／Stripe Dashboard／商品棚 UI の変更 |

---

## 3. 実行直前 preflight（必須）

適用の **直前**に、**idempotency uniqueness preflight SQL**（`m55_reply_ticket_idempotency_uniqueness_preflight.sql`）を **本番接続で再実行**し、SECTION 7 サマリを **前回観測（`M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_RESULT_v1.md`）と突合**する。

| ゲート条件 | 期待 |
|------------|------|
| `processed_events_table_exists` | **true** |
| `stripe_event_id_column_exists` | **true** |
| `processed_events_row_count` | **0** **または** **`stripe_event_id_duplicate_count` = 0** |
| `stripe_event_id_unique_index_exists` | **false** |
| `stripe_event_id_partial_unique_index_exists` | **false** |
| `uniqueness_candidate_safe_to_design` | **true** |
| `blocking_gap_count` | **0** |

そのうえで:

1. **現在のリポジトリ commit hash** を運用テンプレート（チケットまたは別 evidence）に記録する。本条は **実行時点の hash を固定しない**（適用のたびに更新する）。  
2. **SQL Editor／クライアントの接続先**が **m55-soul-core の PRODUCTION** であることを **UI・ラベル・運用チェックリストで明示的に確認**する（曖昧なら **STOP**）。

**前回結果と異なる**値（特に行数・重複・索引フラグ）が出た場合は、**原因調査まで APPLY しない**。

---

## 4. 実行手順

| # | 手順 |
|---|------|
| 1 | preflight（§3）を **すべて満たしたうえで**、**別途与えられた承認**があること。 |
| 2 | **SQL Editor に `m55_reply_ticket_idempotency_partial_unique_index_candidate.sql` の executable 部分のみ**を貼る（**ファイルの 1 文に相当するブロック**。**手修正禁止**）。 |
| 3 | **追加の DDL／DML を同じバッチに混ぜない**。 |
| 4 | 実行。**エラー発生時は即 STOP**し、ロールバック方針は **DDL の性質と運用規程**に従う（本条では手順を詳述しない）。 |
| 5 | 成功直後に **postflight（§5）** を実施する。 |

---

## 5. Postflight 条件（適用直後）

| 確認 | 期待 |
|------|------|
| 索引 **`idx_stripe_processed_events_stripe_event_id_unique_not_null`** が存在 | **あり** |
| `pg_indexes`（または同等）の **`indexdef`** に **`UNIQUE`** が含まれる | **あり** |
| **`indexdef`** に **`WHERE stripe_event_id IS NOT NULL`**（または論理同等）が含まれる | **あり** |
| **`stripe_processed_events` の行数** | preflight 時点と **変化なし**（当該 DDL のみでは増減しないが、**観測で固定**） |
| **wallet／ledger／session** 等の行数 | **当該作業による不要な変化なし** |
| **NOT NULL／FK／CHECK** | **この作業で増分なし** |

必要に応じて **適用結果 SSOT** を別途起票する（本条は gate のみ）。

---

## 6. STOP 条件（APPLY しない／中断）

| STOP |
|------|
| preflight 結果が **前回 SSOT と矛盾**する、または **ゲート条件を満たさない** |
| **`stripe_event_id_duplicate_count` > 0** |
| **`stripe_event_id_unique_index_exists` / `stripe_event_id_partial_unique_index_exists` が想定外に true** |
| **full unique** や **NOT NULL 制約**を **同一操作中に混ぜる** |
| **Webhook／Checkout API** の本番化・同時リリースと **手順を混線**する |
| **secret／Webhook secret／DB URL** が画面共有・SSOT・ログに露出する |
| **実行対象が PRODUCTION でない**、または **production である証跡が曖昧** |

---

## 7. 現時点の判定

| ゲート | 判定 |
|--------|------|
| **本 APPLY gate 文書の作成** | **GO** |
| **本番 APPLY の実行** | **本条だけでは GO にしない。本文書で条件を確認したうえで「別承認」後にのみ実施** |
| **Webhook／Checkout API／Stripe Dashboard／商品棚 UI** | **NO-GO（本条の範囲外）** |

---

## 8. 重要な残論点（適用後も有効）

| 論点 | 内容 |
|------|------|
| **DB 側の役割** | 本 partial unique は **非NULL `stripe_event_id` の一意性**という **冪等性の物理担保の一部**。**アプリ／Webhook 設計の代替ではない。** |
| **Webhook 側の必須** | **`event.id` 欠損時は STOP**（処理しない）を **将来の Webhook 実装で必須化**する（設計レビュー SSOT 正本）。 |
| **課金・付与ロジック** | **まだ実装しない**。本 index のみでは **付与は行わない**。 |

---

## 9. CHANGELOG — v1

- 初版: partial unique index の本番 APPLY 手前ゲート（preflight／手順／postflight／STOP）。
