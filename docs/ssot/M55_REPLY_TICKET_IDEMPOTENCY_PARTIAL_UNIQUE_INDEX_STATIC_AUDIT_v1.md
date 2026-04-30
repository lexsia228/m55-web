# M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_STATIC_AUDIT_v1

Status: **`m55_reply_ticket_idempotency_partial_unique_index_candidate.sql` の **静的監査記録（ファイル内容の目視／キーワード観点）**。**本条は本番での SQL 実行承認でも apply gate の代替でもない。**  

Recorded: **2026-04-28**

Upstream:

- **監査対象（DDL 候補）:** `scripts/sql/production/m55_reply_ticket_idempotency_partial_unique_index_candidate.sql`
- **候補の目的・前提:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_CANDIDATE_v1.md`
- **Index 設計レビュー:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_INDEX_DESIGN_REVIEW_v1.md`
- **本番 preflight 観測:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_UNIQUENESS_PREFLIGHT_RESULT_v1.md`

**環境固有のシークレット・DB URL・Webhook signing secret は記載しない。**

---

## 1. 対象ファイル

| パス | 備考 |
|------|------|
| `scripts/sql/production/m55_reply_ticket_idempotency_partial_unique_index_candidate.sql` | 実行可能ステートメントは **1 行ブロック**（`CREATE UNIQUE INDEX ...`）のみ。 |

---

## 2. 許可 DDL（候補として一致していること）

次の **1 ステートメント**のみが executable として存在する設計になっている。

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_stripe_processed_events_stripe_event_id_unique_not_null
ON public.stripe_processed_events (stripe_event_id)
WHERE stripe_event_id IS NOT NULL;
```

| 項目 | 監査結果 |
|------|-----------|
| 構文種別 | **CREATE UNIQUE INDEX**（partial：`WHERE stripe_event_id IS NOT NULL`） |
| 対象 | **`public.stripe_processed_events`**、列 **`stripe_event_id`** のみ |
| 再実行安全性 | **`IF NOT EXISTS`** あり |
| Full unique（**WHERE なし**の一意索引） | **なし**（本条候補は **partial** のみ） |

---

## 3. 禁止事項が無いこと（静的確認）

ファイル本文（コメント含む）を対象に、**意図しない DDL／DML／設定／秘密・payload 列**の混入がないことを確認した。

| カテゴリ | 監査結果 |
|----------|-----------|
| `UPDATE` | **なし**（コメント内にも該当語なし） |
| `INSERT` | **なし** |
| `DELETE` | **なし** |
| `DROP` | **なし** |
| `SET`（セッション設定等） | **なし** |
| `ALTER` | **なし** |
| **列への NOT NULL 制約**（`ALTER ... SET NOT NULL` 等） | **なし** |
| **FK** | **なし** |
| **CHECK** | **なし** |
| **Full unique**（`WHERE` 句のない `UNIQUE` 一意索引のみ） | **なし**（本条は partial） |
| `payload_json` | **なし** |
| secret／URL／鍵のリテラル | **なし** |
| Webhook／Checkout／Dashboard／商品棚 UI の実装コード | **なし**（当該リポジトリ上の **本ファイル範囲**） |

**注（NOT NULL 語の出現）:** `WHERE stripe_event_id IS NOT NULL` は **部分一意索引の定義**であり、**列の NOT NULL 制約 DDL ではない**。禁止リストの「NOT NULL なし」は **後者（制約）を指す**。

---

## 4. Preflight 条件（適用前・再確認）

本静的監査は **ファイル妥当性**まで。実際の適用前に **DB 上で**次を満たすこと（観測は preflight SSOT／再実行で固定）。

| 条件 | 期待 |
|------|------|
| `stripe_processed_events` 存在 | **あり** |
| `stripe_event_id` 列存在 | **あり** |
| `processed_events` 行数 **0** または **`stripe_event_id` 重複 0** | **満たすこと** |
| 既存 **`stripe_event_id` 用 unique／partial unique なし** | **満たすこと** |
| `blocking_gap_count = 0`（当該 preflight 定義） | **満たすこと** |

---

## 5. Postflight 条件（適用後）

| 確認 | 期待 |
|------|------|
| **本 partial unique index** が存在 | `idx_stripe_processed_events_stripe_event_id_unique_not_null` 相当 |
| **`stripe_processed_events` 行数** | 当該 DDL 単体では **増減しない**（適用前後で **意図しない変化なし**） |
| **wallet／ledger／session** 等の行数 | **当該適用のみで不要な変化なし** |
| **NOT NULL／FK／CHECK** の増分 | **なし** |

---

## 6. STOP 条件

| STOP |
|------|
| **`stripe_event_id` に重複**（非NULL）が存在する状態で index 作成を試みる |
| **既存 unique／partial unique** が **想定外に存在**する |
| **Full unique** や **列 NOT NULL 化** を **同一変更に混入**する |
| **本 DDL の適用と Webhook 実装を同時進行・同時本番化**する（手順の混線） |
| **secret／鍵の露出** |

---

## 7. 現時点の判定

| ゲート | 判定 |
|--------|------|
| **static audit（本条）の作成** | **GO** |
| **本 SQL の本番実行** | **NO-GO** |
| **apply gate** | **次工程**（承認・preflight 再実行・適用手順の確定） |

---

## 8. 静的監査サマリ（結論）

- **対象ファイル**に含まれる executable DDL は **上記 partial UNIQUE INDEX 1 のみ**で、列示した **禁止カテゴリに該当する記述は見つからない。**  
- **実行可否・本番適用**は本条では **判断しない**（**apply gate**）。

---

## 9. CHANGELOG — v1

- 初版: partial unique index 候補 SQL の静的監査 SSOT。
