# M55_REPLY_TICKET_PHASE_IV_RPC_CANDIDATE_STATIC_AUDIT_v1

Status: **`scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql` の **静的監査記録**。**本条は staging／production 適用・Webhook 実装・DB 実行の承認ではない。**  

Recorded: **2026-04-28**

Upstream:

- **候補 SQL:** `scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql`
- **ドラフト証跡:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_MIGRATION_CANDIDATE_DRAFT_v1.md`
- **RPC 仕様:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_FUNCTION_SPEC_v1.md`

**秘密・DB URL・Webhook secret・実キー値は記載しない。**

---

## 1. 対象ファイル

| パス |
|------|
| `scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql` |

---

## 2. 許可されている DDL（観測）

| 許可 | 監査結果 |
|------|-----------|
| **`CREATE OR REPLACE FUNCTION public.m55_reply_ticket_fulfill_checkout_event`** | **該当のみ**（他オブジェクトの CREATE なし） |
| **`LANGUAGE plpgsql`** | **あり** |
| **`SECURITY DEFINER`** | **あり** |
| **`SET search_path = public`** | **あり** |
| **`RETURNS jsonb`** | **あり** |
| **`REVOKE`／`GRANT`** | **実行文なし**（**コメントブロックのみ**、L297–306） |

---

## 3. 禁止事項が無いこと（キーワード・構造）

| カテゴリ | 監査結果 |
|----------|-----------|
| **`DROP`** | **実行文なし**（コメント内の方針説明のみ） |
| **`ALTER TABLE`** | **なし** |
| **`CREATE TABLE`** | **なし** |
| **`CREATE INDEX`** | **なし** |
| **`DELETE`** | **なし** |
| **`TRUNCATE`** | **なし** |
| **payload 全文保存** | **`jsonb`/生 payload 列への書込みなし** |
| **secret／DB URL／Webhook secret** | **リテラルなし** |
| **`m55_reply_generate_commit` を含む他関数の定義変更** | **当該ファイルに **なし**** |
| **新規 CHECK／FK／NOT NULL／UNIQUE DDL** | **なし** |

**注:** 関数内 **`INSERT`**／**`UPDATE`** は **許容される DML**（fulfillment 本体）。本条の禁止リスト対象外。

---

## 4. 関数 signature 監査

| 項目 | 監査結果 |
|------|-----------|
| **完全修飾名** | **`public.m55_reply_ticket_fulfill_checkout_event`** |
| **引数（8）** | 1 **`p_stripe_event_id text`**（必須）、2 **`p_checkout_session_id text`**（必須）、3 **`p_payment_intent_id text DEFAULT NULL`**、4 **`p_product_key text DEFAULT NULL::text`**、5 **`p_report_instance_id uuid DEFAULT NULL`**、6 **`p_wallet_scope_user_id text DEFAULT NULL::text`**、7 **`p_user_ref_hash text DEFAULT NULL`**、8 **`p_quantity integer DEFAULT 1`** |
| **DEFAULT 並び** | **必須 2 個の後ろにのみ DEFAULT**。**PostgreSQL として有効**な並び |
| **`p_stripe_event_id`** | **空／NULL で早期 RETURN**（`missing_stripe_event_id`）。**`stripe_processed_events` 未作成**で終了 ✅ |
| **`p_checkout_session_id`** | **同上**（`missing_checkout_session_id`）✅ |
| **`p_product_key`** | **`additional_reply_ticket` と case-insensitive 一致**のみ通過 ✅ |
| **`p_report_instance_id`** | **NULL 拒否** ✅ |
| **`p_wallet_scope_user_id`** | **空／NULL 拒否** ✅ |
| **`p_quantity`** | **`IS DISTINCT FROM 1` で拒否** ✅ |
| **raw PII／本文を引数化** | **なし**（**`user_ref_hash` は短いハッシュ想定のみ**。**レポート／相談本文は未取得**） |

**GRANT コメント末尾のシグネチャ：** `(text, text, text, text, uuid, text, text, integer)` が **ソース定義の 8 型と一致**。

---

## 5. Transaction 処理監査（単一関数＝単一 Tx）

| # | 要件 | 監査結果 |
|---|------|-----------|
| 1 | **`stripe_processed_events` 先行 INSERT** | **L114–141、`status='received'`** ✅ |
| 2 | **`unique_violation` → `duplicate_noop`** | **L142–151** ✅ |
| 3 | **duplicate 時 wallet／ledger 非更新** | **`RETURN` のみ** ✅ |
| 4 | **wallet `FOR UPDATE`** | **L179–184** ✅ |
| 5 | **`active` 確認** | **L202–217** ✅ |
| 6 | **cap** | **`initial+purchased >= 5` OR `purchased >= 4`**（**L219–236**）✅ |
| 7 | **`purchased_count`／`available_count` +1** | **L239–246** ✅ |
| 8 | **ledger `delta=+1` INSERT** | **L249–277** ✅ |
| 9 | **`balance_after` = 更新後 `available_count`** | **`v_new_avail` を INSERT に使用** ✅ |
| 10 | **`processed_events` を `processed` + `processed_at`** | **L279–284** ✅ |

**分離更新なし:** 成功経路では **wallet UPDATE の直後に ledger INSERT、その後 processed UPDATE**。**duplicate／rejected／skipped では wallet／ledger に触れない**。  

**論点（運用確認）:** 所有権 NG／inactive／cap で **`stripe_processed_events` は `received` を経て **UPDATE で終状態**となる。**これは許容される副作用**であり **wallet／ledger と不整合になる経路なし**（該当 UPDATE のみ）。

---

## 6. CHECK 制約整合（`reply_wallet_ledgers`）

| 要件 | SQL 値 |
|------|--------|
| **`event_type`** | **`purchase_grant`**（列挙内） ✅ |
| **`source_of_grant`** | **`PURCHASE`**（列挙内） ✅ |
| **`reply_session_id`** | **明示 **`NULL`**（**`purchase_grant` + delta>0** の分岐では **session ID 不要**と整合）✅ |
| **禁止値** | **`purchase_additional_reply_ticket`／`stripe_checkout` など本文で禁じたものは不使用** ✅ |

**wallet 側不変チェック:** **`available_count = initial_included_count + purchased_count - consumed_count`** に対し、**`purchased` と `available` を同時 +1、`consumed` 不変**のため **同式を維持**（論理チェックのみ；適用環境での **トリガ／追加 CHECK** は preflight で再確認）。

---

## 7. 重要 preflight 項目（適用前・対象 DB）

| # | 確認 |
|---|------|
| 1 | **`reply_wallet_ledgers.report_instance_id` 列が存在**（ファイル冒頭 NOTE どおり。**無ければこの RPC は適用不可**） |
| 2 | **Stripe 4 列:** `stripe_event_id`/`stripe_checkout_session_id`/`stripe_payment_intent_id`/`product_key` **存在・型** |
| 3 | **`public.stripe_processed_events` 存在**、想定カラム（`stripe_event_id`/`status`/…）あり |
| 4 | **`stripe_event_id` partial UNIQUE INDEX** が **本番適用済みであること**（冪等の前提） |
| 5 | **`dtr_report_snapshots` が参照可能**であり **`id`・`user_id`** で存在検証可能 |
| 6 | **`reply_ticket_wallets` に対象ユーザー行が存在するか**の **ベースライン件数**（運用ログ用） |
| 7 | **`reply_wallet_ledgers`／sessions の件数ベースライン**（回帰比較用） |
| 8 | **`reply_wallet_ledgers` の CHECK 文言**（**`pg_constraint`** で **ドラフト代入値との一致**を再読） |

---

## 8. STOP 条件

| STOP |
|------|
| **`CREATE FUNCTION` が対象環境 PostgreSQL で拒否される**署名／構文／拡張不足 |
| **`report_instance_id` 列が無い環境へ適用**しようとする |
| **CHECK／運用規則が変わっているのにイベント／付与ソースを増やして運用する** |
| **wallet と ledger を RPC 外で別トランザクションに分離**して付与する |
| **`unique_violation` を無視したうえ wallet を更新する**ような改変 |
| **`m55_reply_generate_commit` を同一 PR で書き換える**など **DTR 系変更の混入** |
| **staging／production に **監査・preflight・apply gateなしで**適用** |
| **Webhook 本体実装と **同一運用ウィンドウに無計画で**バンドル** |

---

## 9. 現時点の判定

| ゲート | 判定 |
|--------|------|
| **static audit（本条）** | **GO** |
| **staging 適用** | **NO-GO** |
| **production 適用** | **NO-GO** |
| **Webhook 本実装** | **NO-GO** |

---

## 10. 静的監査サマリ（結論）

対象ファイルは **単一 RPC の CREATE OR REPLACE** に閉じ、**禁止 DDL／DELETE／TRUNCATE／DROP／他関数改変／秘密リテラル**は見当たらない。**signature・冪等・cap・wallet ロック・ledger CHECK 適合値**は **ドラフト意図と整合**。適用可否は **`report_instance_id` 列**と **対象環境 CONSTRAINT** の **preflight が必須**。

---

## 11. CHANGELOG — v1

- 初版: Phase IV RPC candidate の静的監査 SSOT。
