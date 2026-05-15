# M55_REPLY_TICKET_PHASE_IV_RPC_MIGRATION_CANDIDATE_DRAFT_v1

Status: **`public.m55_reply_ticket_fulfill_checkout_event` の **migration candidate ドラフト**（**`scripts/sql/staging/`**）。**本条および当該 SQL の存在だけでは適用 GO にならない。**  

Recorded: **2026-04-28**

Upstream:

- **RPC 仕様:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_RPC_FUNCTION_SPEC_v1.md`
- **Transaction 方式:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_TRANSACTION_MODE_DECISION_v1.md`
- **SQL ファイル:** `scripts/sql/staging/m55_reply_ticket_fulfillment_rpc_candidate.sql`

**秘密・環境固有の値を記載しない。**

---

## 1. candidate draft の目的

| # | 内容 |
|---|------|
| 1 | Stripe **`checkout.session.completed`**（追加チケット）に対応する **fulfillment を 1 RPC＝1 トランザクション**で載せられる形にするドラフトとして **レビュー対象を固定**。 |
| 2 | **`stripe_processed_events`／wallet／ledger** の **一貫更新**、`partial UNIQUE` による **duplicate no-op**。 |
| 3 | **Staging／shadow での適用検証／静的監査**の **入力**。 |

---

## 2. 関数名・入力・戻り値

| 項目 | 確定値 |
|------|--------|
| **関数名** | **`public.m55_reply_ticket_fulfill_checkout_event`** |
| **属性** | **`SECURITY DEFINER`**、**`LANGUAGE plpgsql`**、**`SET search_path = public`** |

**引数:**

| 引数 | 型 | 備考 |
|------|-----|------|
| `p_stripe_event_id` | `text` | 必須 |
| `p_checkout_session_id` | `text` | 必須 |
| `p_payment_intent_id` | `text DEFAULT NULL` | |
| `p_product_key` | `text` | `additional_reply_ticket` |
| `p_report_instance_id` | `uuid` | |
| `p_wallet_scope_user_id` | `text` | サーバー検証済み |
| `p_user_ref_hash` | `text DEFAULT NULL` | |
| `p_quantity` | `integer DEFAULT 1` | **`<> 1` は rejected** |

**戻り `jsonb` キー:** `status`、`wallet_id`、`ledger_id`、`available_count`、`purchased_count`、`reason`

---

## 3. Transaction 内処理順序（ドラフト準拠）

1. **`p_stripe_event_id`／セッション ID／SKU／quantity／ユーザー／報告実体 ID** を検証。失敗は **`stripe_processed_events` なし**で `rejected_invalid_product` 系を返す。  
2. **`stripe_processed_events` INSERT**（`status = received`）。**unique_violation** → **`duplicate_noop`** 即 RETURN。  
3. **`dtr_report_snapshots`** で **所有権**。NG → **`rejected_not_owner`**（行を **`rejected_not_owner`** に UPDATE）。  
4. **`reply_ticket_wallets` FOR UPDATE`。無し → **`rejected_not_owner`**（`**reason`: `wallet_not_found`**。**status 文言はユーザー指定により `rejected_not_owner`**）。  
5. **`status = active`** 以外 → **`rejected_wallet_inactive`**。  
6. **cap**。NG → **`skipped_cap`**。  
7. **wallet UPDATE**、`ledger INSERT`（`purchase_grant`／`PURCHASE`／`reply_session_id NULL`／Stripe 4 列／`report_instance_id`）、**processed_events を `processed` + `processed_at`**。  

---

## 4. duplicate_noop 方針

- **`stripe_processed_events`** への **`INSERT`** で **`stripe_event_id` partial UNIQUE に抵触**した場合のみ **`EXCEPTION unique_violation`** を捕捉。**wallet／ledger は未更新**。  
- **RETURN `status`: `duplicate_noop`**。Stripe 側は Webhook が **HTTP 成功**になり **再試行を収束**。  

---

## 5. skipped_cap／rejected_* 方針

| outcome | **`stripe_processed_events.status`** |
|---------|--------------------------------------|
| 所有権 NG | **`rejected_not_owner`** |
| wallet 無／inactive | **`rejected_*` 相当で UPDATE**（inactive は **`rejected_wallet_inactive`**） |
| cap | **`skipped_cap`** |
| 正常 | **`processed`** |

**skipped_cap で wallet／ledger は触らない。** **二重請求／CS／返金**は別 SSOT。

---

## 6. SECURITY DEFINER／search_path

- **`SECURITY DEFINER`** と **`SET search_path = public`** で **関数本文を固定**。  
- **関数内に secret は埋め込まない。**

---

## 7. GRANT 方針（後続）

SQL ドラフト末尾の **`REVOKE`／`GRANT EXECUTE`** を **コメント**で記載済み。**最終 migration パッケージ**で **`service_role` のみ EXECUTE** 等を明示する。**本条では確定 APPLY しない。**

---

## 8. Static audit で見る項目

| # | 項目 |
|---|------|
| 1 | **`DROP`**／既存 **`ALTER TABLE`**／**新 CHECK／FK／UNIQUE／NOT NULL** が **無い**こと |
| 2 | **`m55_reply_generate_commit` が変更されていない**こと |
| 3 | Ledger の **`event_type`／`source_of_grant`** が **既存 CHECK 内の列挙**のみ |
| 4 | **`report_instance_id`** 列が **対象環境で存在する**こと（ドラフト NOTE 参照） |
| 5 | **`stripe_processed_events`** の列名が **環境カタログと一致**すること |
| 6 | **`payload`/PII/raw 全文**を **書き込んでいない**こと |

---

## 9. staging 適用前 preflight（例）

- **`information_schema`**／**`pg_proc`** で **`m55_reply_ticket_fulfill_checkout_event`** の **重複関数シグネチャ**。  
- **`reply_wallet_ledgers.report_instance_id` の存在**（無い場合は **先行 migration**）。  
- **`stripe_processed_events.stripe_event_id` partial UNIQUE** の **存在**。  
- **テストユーザー**での **単発 RPC 試行（最低限 rollback 可能環境またはトランザクション sandbox）**。  

---

## 10. production 適用

**NO-GO**（本条・当該 candidate だけでは許可しない）。**別ゲート（preflight／apply／メンテ窓）。**

---

## 11. Webhook 本実装

**NO-GO**。RPC 適用検証 **`→` server helper `→`** Webhook 呼び出しは **順序を守る**。  

Checkout／Stripe Dashboard／env／商品棚 UI は **本条の範囲外**。**ファイルも未変更**。  

---

## 12. 既知のドラフト論点（実装／レビューで解消）

| 論点 | メモ |
|------|------|
| **`wallet_not_found` の JSON `status`** | API では `wallet_not_found` コードがある一方、本条ドラフトでは **DB `status`/JSON `status` を `rejected_not_owner`** に統一（ユーザー指示「`**など`**」）。運用監査が厳しい場合は **`rejected_wallet_not_found`** など **列挙拡張**を検討。 |
| **早期引数 NG** | **`stripe_processed_events` は作らず**RETURN（再送での **無駄行**を防ぐ）。 |
| **`report_instance_id` 列** | **ledger に INSERT**する。**環境未取得ならドラフト適用不可**。 |

---

## 13. CHANGELOG — v1

- 初版: staging candidate SQL のドラフト証跡、適用順、監査項目、Webhook／本番 NO-GO。
