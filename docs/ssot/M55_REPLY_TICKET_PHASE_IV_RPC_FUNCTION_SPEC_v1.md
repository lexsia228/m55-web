# M55_REPLY_TICKET_PHASE_IV_RPC_FUNCTION_SPEC_v1

Status: **追加相談返書チケット（M55）Stripe Checkout 完了の **fulfillment 専用 Postgres RPC** の **仕様 SSOT**。** **本条は migration／SQL／アプリコード／DB 適用の承認ではない。**  

Recorded: **2026-04-28**

Upstream:

- **Transaction 方式決定:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_TRANSACTION_MODE_DECISION_v1.md`
- **Fulfillment gate:** `docs/ssot/M55_REPLY_TICKET_PHASE_IV_FULFILLMENT_TRANSACTION_HELPER_GATE_v1.md`
- **DB transaction 設計:** `docs/ssot/M55_REPLY_TICKET_FULFILLMENT_DB_TRANSACTION_IMPLEMENTATION_DESIGN_v1.md`
- **API 契約:** `docs/ssot/M55_REPLY_TICKET_CHECKOUT_WEBHOOK_API_CONTRACT_DESIGN_v1.md`
- **partial UNIQUE 証跡:** `docs/ssot/M55_REPLY_TICKET_IDEMPOTENCY_PARTIAL_UNIQUE_INDEX_PRODUCTION_APPLY_RESULT_v1.md`

**秘密・PII 原文・Webhook secret を記載しない。** **`p_*` の識別子も SSOT 本文に例値を載せない。**

---

## 1. RPC の目的

| # | 目的 |
|---|------|
| 1 | **`checkout.session.completed`** に紐づく **追加相談返書チケット決済**を **単一 DB トランザクション**で処理する。 |
| 2 | **`stripe_processed_events`／`reply_ticket_wallets`／`reply_wallet_ledgers`** を **一貫して更新**する（**wallet のみ／ledger なし**を禁止）。 |
| 3 | **Stripe Webhook 再送**でも **`stripe_event_id` 軸で二重付与**しない。 |
| 4 | **1 `report_instance_id` あたり合計 5 件**上限（**同梱 1 ＋ 追加最大 4**）を **DB 側でも強制**する（Checkout との **TOCTOU** 対策）。 |

---

## 2. 関数名・配置（本条で固定）

| 項目 | 値 |
|------|-----|
| **schema** | **`public`** |
| **関数名（確定）** | **`m55_reply_ticket_fulfill_checkout_event`** |
| **命名規則** | 既存 **`public.m55_reply_generate_commit`** と **`m55_reply_*` プレフィックス**で揃える。 |

---

## 3. 入力引数候補（確定方針）

関数は **Stripe／Checkout から取れる最小識別子**と **業務キー**のみを受け取る。**レポート本文・相談本文・生年月日などは引数に含めない。**

| 引数名 | 型 | NULL | 説明 |
|--------|-----|------|------|
| **`p_stripe_event_id`** | **`text`** | **NOT NULL** | Stripe **`event.id`**。冪等の正本。 |
| **`p_checkout_session_id`** | **`text`** | **NOT NULL** | Stripe Checkout Session ID。 |
| **`p_payment_intent_id`** | **`text`** | **nullable** | PaymentIntent ID（文字列）。未取得時は **`NULL`**。 |
| **`p_product_key`** | **`text`** | **NOT NULL** | 期待値 **`additional_reply_ticket`**（アプリ定数と一致）。 |
| **`p_report_instance_id`** | **`uuid`** | **NOT NULL** | **`dtr_report_snapshots.id`** と整合するレポート実体。 |
| **`p_wallet_scope_user_id`** | **`text`** | **NOT NULL** | **Webhook が検証済みの購入者ユーザ ID**（当面 Clerk `user_id` と一致）。**RPC は検証結果を信頼せず、§5 でスナップショット所有者と突合**する。引数名に **`clerk`** を含めず、**サーバー専用**であることを migration コメントで明示。 |
| **`p_user_ref_hash`** | **`text`** | **nullable** | メタデータ検証用の **`user_ref_hash`**（あれば）。**ログ相関用であり必須ではない。** |
| **`p_quantity`** | **`integer`** | **default 1** | **常に 1**。将来拡張で **`<> 1` は拒否**。 |

**意図的に渡さないもの**

- **raw PII 全文**、`birth data`、レポート本文、相談本文、Stripe secret、DB URL。

---

## 4. 戻り値候補（論理形）

**実装時は `RETURNS jsonb`** とし、既存 **`m55_reply_generate_commit`** と同様 **アプリがパースしやすいオブジェクト**を返す（**最終キー名は migration でこの表と一致**）。

| フィールド | 型（論理） | 説明 |
|------------|------------|------|
| **`status`** | **`text`** | **`processed`／`duplicate_noop`／`skipped_cap`／`rejected_*`** のいずれか（下表）。 |
| **`wallet_id`** | **`uuid`** | **nullable**。成功時のみ。 |
| **`ledger_id`** | **`uuid`** | **nullable**。成功時のみ。 |
| **`available_count`** | **`integer`** | **nullable**。成功時 Wallet の更新後値。 |
| **`purchased_count`** | **`integer`** | **nullable**。成功時 Wallet の更新後値。 |
| **`reason`** | **`text`** | **nullable**。機密・PII を含めない短文コード（例: **`CAP_REACHED`**）。 |

**`status` 列挙（首期間）**

| value | 意味 |
|-------|------|
| **`processed`** | **wallet＋ledger＋`stripe_processed_events` が正常完了** |
| **`duplicate_noop`** | **`stripe_event_id` が既に処理済み（partial UNIQUE 競合）**／**冪等 no-op** |
| **`skipped_cap`** | **cap により付与せず**、**`stripe_processed_events` に結果を残した** |
| **`rejected_invalid_product`** | **`p_product_key` 不一致** |
| **`rejected_not_owner`** | **`p_report_instance_id` が `p_wallet_scope_user_id` に属さない** |
| **`rejected_wallet_inactive`** | **wallet が `active` でない** |
| **`failed_technical`** | **原則は関数内で例外を投げ**、**トランザクション rollback**。**レスポンスで返さない案**をデフォルトとする（**ログ／アラート**は呼び出し側）。 |

**禁止:** **`jsonb` に raw PII や payload 全文を載せない**。

---

## 5. transaction 内処理順序（論理アルゴリズム）

PostgreSQL は **関数本体が 1 トランザクション**として実行される（明示 `BEGIN…COMMIT` は関数外で不要）。以下は **推奨順序**。

| 順序 | 処理 |
|------|------|
| 1 | **引数検証。** `p_stripe_event_id` 空・NULL → **`rejected_invalid_product` 同等の論理エラー**または **`RAISE EXCEPTION`**（**rollback**）。**本条では「欠損は付与しない」が絶対条件。** |
| 2 | **`p_report_instance_id`／`p_product_key`** 検証。 |
| 3 | **`p_product_key` ≠ `additional_reply_ticket`** → **早抜け `rejected_invalid_product`**（副作用なし）。 |
| 4 | **所有権:** **`dtr_report_snapshots`** を **`id = p_report_instance_id` かつ `user_id = p_wallet_scope_user_id`** で確認。不一致 → **`rejected_not_owner`**。 |
| 5 | **`stripe_processed_events` に `p_stripe_event_id` を INSERT**（初期 **`status`** は **`pending`** 等、migration で列挙固定）。**`partial UNIQUE (stripe_event_id) WHERE stripe_event_id IS NOT NULL` に抵触**したら → **`duplicate_noop`** で **確定レスポンス**（**wallet／ledger は触らない**）。※挿入順序は **実装 PR で「明示 savepoint」または **`EXCEPTION WHEN unique_violation`**」に落とす。 |
| 6 | **Wallet 行の取得:** **`reply_ticket_wallets`** を **`user_id = p_wallet_scope_user_id`** で取得（**現行スキーマは user 単位 wallet**。将来 **`report_instance_id` スコープ列**が入った場合は **SELECT 条件を拡張** — **実装 migration でスキーマと突合**）。 |
| 7 | **存在・`status = active`**。否 → **`wallet_not_found` を `rejected_*` にマップ**（方針: 無しは **not found**、非 active は **`rejected_wallet_inactive`**）。 |
| 8 | **cap:** **`initial_included_count + purchased_count < 5`** かつ **`purchased_count < 4`**。違反 → **`skipped_cap`**（§7）。 |
| 9 | **Wallet UPDATE:** `purchased_count += 1`, `available_count += 1`（**期待行ロック `FOR UPDATE`**）。 |
| 10 | **Ledger INSERT:** `delta = 1`, **`balance_after` = 更新後 `available_count`**, **`event_type` = `purchase_grant`**, **`source_of_grant` = `PURCHASE`**, **`reply_session_id` = `NULL`**, **`report_instance_id` = `p_report_instance_id`**, Stripe 参照列 4 つを設定。 |
| 11 | **`stripe_processed_events` の当該行を `status = processed`**（および設計どおりのタイムスタンプ列）。 |
| 12 | **正常終了 `processed`。** |

**原則:** **`processed` 状態の `stripe_processed_events` だけが残り wallet が未更新**、という **中間状態をコミットしない**（同一関数内で完結）。

---

## 6. duplicate／no-op 方針

| 論点 | 方針 |
|------|------|
| **検出** | **`stripe_event_id` の INSERT が partial UNIQUE に違反** → **重複 Webhook**。 |
| **副作用** | **wallet／ledger を更新しない**。 |
| **戻り** | **`status = duplicate_noop`**。呼び出し側 Webhook は **200** を返し **再送を抑制**（セキュリティ SSOT と整合）。 |
| **実装詳細** | **`EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object(...)`** か、**事前 `SELECT EXISTS`**。**どちらを採るかは migration で明示**する。 |

---

## 7. cap 到達時の方針

| 論点 | 方針 |
|------|------|
| **wallet／ledger** | **更新しない** |
| **`stripe_processed_events`** | **同一 `p_stripe_event_id` で 1 行**残す。**`status = skipped_cap`**（INSERT は §5 が先に実行済みのパターンと整合させる。**設計：** cap 判定は INSERT 後に行い、失敗時は同一 Tx 内で **status を `skipped_cap` に更新**）。 |
| **再送** | **同一 `event.id` の再実行は `duplicate_noop`** になり **二重評価に無駄インフラを使わない** |
| **二重請求／返金／CS** | **別 SSOT** |

---

## 8. SECURITY DEFINER／権限方針

| 項目 | 内容 |
|------|------|
| **`SECURITY`** | **`SECURITY DEFINER`** を **候補のデフォルト**（**`m55_reply_generate_commit` と同型**）。 |
| **`search_path`** | **`SET search_path = public`**（**関数属性で固定**）。 |
| **呼び出し元** | **service role を使うサーバーのみ**（**Next.js Route／server helper**）。 |
| **クライアント** | **ブラウザ・匿名ユーザーから `.rpc` 禁止**。RLS／API レイヤで遮断済みであること。 |
| **`GRANT`** | **後続 migration** で **`service_role` に限定 EXECUTE** 等を **明文**化する（**具体 GRANT は SQL ドラフト側**）。 |
| **secret** | **関数内に API 鍵／Webhook secret を埋め込まない** |

---

## 9. CHECK 制約との整合

| 列／値 | 固定 |
|--------|------|
| **`reply_wallet_ledgers.event_type`** | **`purchase_grant` のみ**（**`purchase_additional_reply_ticket` は使わない** — 本条方針） |
| **`reply_wallet_ledgers.source_of_grant`** | **`PURCHASE` のみ**（**`stripe_checkout` 等本条では使わない**） |
| **禁止** | 既存の **CHECK 制約**が許さない `event_type`／`source_of_grant` を代入しない。実装 PR では `pg_get_constraintdef` で本番文言と突合する。 |

---

## 10. STOP 条件

| STOP |
|------|
| **RPC なしで** **wallet と ledger を別々**に更新する |
| **`p_stripe_event_id`（= `event.id`）欠損**で処理を進める |
| **`p_report_instance_id` 欠損**で処理を進める |
| **`stripe_processed_events`／partial UNIQUE を使わない**冪等 |
| **cap 未検証** |
| **CHECK 許容外の `event_type`／`source_of_grant` を使う** |
| **`fulfillDtrCoreFromCheckoutSessionId` を変更**／**Reply を DTR 経路へ混入** |
| **`payment_intent.succeeded`** を **付与主経路**にする |
| **本番決済テストのみ**先行 |

---

## 11. 次の候補（順序は運用で確定）

1. **RPC migration 候補ドラフト**（`CREATE OR REPLACE FUNCTION …` + `GRANT`）  
2. **静的監査**（副作用・`search_path`・権限）  
3. **shadow／staging 適用**  
4. **production preflight／apply gate**  
5. **server helper**（`getSupabaseAdmin().rpc('m55_reply_ticket_fulfill_checkout_event', …)`）  
6. **Webhook Reply lane** から **helper 経由で RPC 呼び出し**  

---

## 12. 現時点の判定

| ゲート | 判定 |
|--------|------|
| **RPC function spec（本条）** | **GO** |
| **SQL／migration 作成** | **NO-GO** |
| **コード実装** | **NO-GO** |
| **DB 更新** | **NO-GO** |
| **本番決済テスト** | **NO-GO** |

---

## 13. CHANGELOG — v1

- 初版: `m55_reply_ticket_fulfill_checkout_event` 入出力、Tx 順、duplicate／cap、`SECURITY DEFINER`、CHECK 整合、STOP、次工程を固定。
