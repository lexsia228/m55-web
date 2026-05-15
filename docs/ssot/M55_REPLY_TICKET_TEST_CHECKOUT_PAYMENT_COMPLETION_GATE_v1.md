# M55 追加相談返書 — test checkout payment completion ゲート（v1）

**文書種別:** **Stripe test mode** に限定し、**Checkout URL を開いて test 支払い完了まで進める可否・条件・記録規約**を固定するゲート SSOT  
**バージョン:** v1  

**確定済み baseline:** [`M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1.md`](./M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1.md) — **pre fulfillment baseline PASS**  
**Checkout Session:** [`M55_REPLY_TICKET_CHECKOUT_SESSION_CREATION_TEST_RESULT_v1.md`](./M55_REPLY_TICKET_CHECKOUT_SESSION_CREATION_TEST_RESULT_v1.md) — **Session creation PASS**（当時 `payment_completed = false`）

**記録ポリシー:** **Checkout URL 全文・session id 全文・price id 実値・secret** は記録しない（セクション 4–5）。

---

## 1. このゲートの目的

| 観点 | 内容 |
|------|------|
| **判断対象** | **Stripe test mode** で **Checkout URL を開き**、**test 支払い完了**まで進めるかを **ゲートとして定義**する（本ファイルは **設計のみ** — **まだ URL を開かない・決済しない**）。 |
| **課金モード** | **live 決済ではない**。 |
| **Webhook と DB** | 支払い完了後は **Webhook fulfillment が起きうる**ため、**DB post baseline** と **セット**で扱う（支払いだけ孤立させない）。 |
| **実施形態** | **商品棚 UI からではなく**、**非公開検証**（限定オペレータ・限定手順）として行う。 |

---

## 2. 前提条件

以下を **満たしてから** execution packet に従い **test payment** を検討する。

| 前提 | 状態 |
|------|------|
| **Checkout Session creation test** | **PASS**（`http_status = 200`、`has_checkout_url` / `has_session_id` **true**、`payment_completed = false`、機密未露出 — 詳細は結果 SSOT）。 |
| **pre fulfillment baseline** | **PASS** — 例: `stripe_processed_events_total_count = 0`、`baseline_ready_bool = true`、`summary_blocking_gap_count = 0`、`wallet_status = active`、`target_wallet_cap_reached_bool = false`、`purchased_count = 0`、`available_count = 1` 等（全文は baseline 結果 SSOT）。 |
| **target wallet** | **active** |
| **cap** | **利用可能**（未到達） |
| **Stripe** | **test mode のみ** |
| **runtime / env** | **ローカル env のみ**（アプリ・Stripe test keys の運用は execution packet で固定）。 |
| **Vercel** | **env 未変更** |
| **商品棚 UI** | **未公開**（本検証の入口にしない）。 |
| **記録** | **Checkout URL 全文 / session id 全文 / price id / secret** は **記録しない**。 |

---

## 3. 実施範囲

| 項目 | 方針 |
|------|------|
| **Session の出所** | 実施直前に、**(A) 既に生成済みの Checkout URL を使う**か **(B) 新規に test Checkout Session を作る**かを **文書または実行チケットで明示**してから進める（いずれも **test mode**）。 |
| **URL の取り扱い** | Checkout URL を開いてもよいのは **execution 承認後**のみ。**URL 全文は SSOT・チャット・ログ共有に貼らない**。 |
| **カード** | **Stripe test card** のみ使用。 |
| **結果の最小記録** | **`payment_completed = true/false`** を中心に記録（ほかはセクション 4）。 |
| **完了後の流れ** | **`payment_completed = true`** の場合、**すぐ**（同一検証セッション内で）**DB post baseline**（同一 pre baseline SQL の再実行）へ進める。 |
| **分支** | **途中キャンセル・戻る・期限切れ**は **別 SSOT**（本ゲートの「成功系完了」の対象外として切り出す）。 |

---

## 4. 記録してよいもの

- **`mode` = `test`**
- **`amount` = 500 JPY**（SKU 仕様に準拠する宣言として）
- **`payment_completed`** = **true / false**
- **`checkout_url_full_printed`** = **false**
- **`session_id_full_printed`** = **false**
- **`secret_exposed`** = **no**
- **timestamp**
- **`case_name`**（例: test checkout payment completion）

---

## 5. 記録禁止

- **Checkout URL 全文**
- **session id 全文**
- **price id 実値**
- **Stripe secret**
- **Webhook secret**
- **DB URL**
- **cookie / token / Authorization**
- **raw `user_id`**
- **生年月日**
- **report 本文**
- **相談本文**
- **カード情報のスクリーンショット**

---

## 6. 支払い完了後に見る予定（DB / fulfillment 観測）

**post fulfillment baseline**（pre と同一の SELECT packet）および fulfillment 結果 SSOT で、少なくとも以下を **差分**確認する設計とする。

- **`stripe_processed_events_total_count` +1**
- **対象 `report_instance_id` の processed_events 件数 +1**
- **`reply_wallet_ledgers_total_count`（グローバル）+1**
- **`target_wallet_ledger_row_count` +1**
- **`purchased_count`:** 0 → 1  
- **`available_count`:** 1 → 2  
- **最新 ledger:** **`purchase_grant` / `PURCHASE` / `additional_reply_ticket`**
- **`balance_after` = 2**
- **Stripe 参照列:** **あり**（**値は記録しない**／boolean のみ）

詳細は [`M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1.md`](./M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1.md) セクション 4 と整合。

---

## 7. STOP 条件

以下に該当しそうになったら **中断**する。

- **live mode** での課金・URL・Dashboard 操作
- **Checkout URL 全文**や **session id 全文**を **貼りそう**になる
- **secret・price id** を **貼りそう**になる
- **カード情報や機微スクショ**を **共有しそう**になる
- **商品棚 UI** に状態や導線を **出す**
- **Vercel env** を **変更**する
- **DTR checkout route** を **本検証用に触る**（スコープ逸脱）
- **post baseline なし**で **支払いだけ**進める
- **DB 更新が想定外**に起きたのに **記録・停止せず**進める

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **payment completion gate（本文書の作成）** | **GO** |
| **test payment execution** | **別承認**（execution packet + 環境確認） |
| **post baseline packet** | **次**に作成・または既存 packet の **post 実行節**を確定 |
| **duplicate replay** | **NO-GO**（別ゲート） |
| **live 決済** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 9. 後続予定（順序は運用で調整可）

1. **test checkout payment completion execution packet**  
2. **post fulfillment baseline packet**（同一 SELECT・タイミング規約）  
3. **payment completion 実施**（別承認）  
4. **post baseline SELECT**  
5. **fulfillment result SSOT**  
6. **duplicate replay gate**  
7. **cancel / expired / refund SSOT**  
8. **observability / incident response SSOT**  

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**Checkout URL 未開封**。**決済なし**。**SQL 実行なし**。**DB 更新なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_TEST_CHECKOUT_PAYMENT_COMPLETION_GATE_v1*
