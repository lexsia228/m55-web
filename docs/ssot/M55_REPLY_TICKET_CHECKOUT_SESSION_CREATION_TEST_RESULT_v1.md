# M55 追加相談返書 — Checkout Session creation test 結果 SSOT（v1）

**文書種別:** **Checkout Session creation test gate**（コミット済み）に沿った **Checkout Session 作成まで**の実行結果の単一記録  
**バージョン:** v1  
**記録日（運用）:** 2026-05-01（環境による）

**記録ポリシー:** **price id 実値・Checkout URL 全文・session id 全文・Stripe/Clerk/Supabase/Webhook の secret・cookie・token・Authorization** は本文に **含めない**。

---

## 1. 実施内容

| 項目 | 内容 |
|------|------|
| **実行経路** | **ログイン済みブラウザ** の **DevTools Console** から API を叩いた。 |
| **HTTP** | **`POST /api/reply-tickets/checkout`** |
| **`product_key`** | **`additional_reply_ticket`** |
| **`report_instance_id`** | **本人所有**の実 ID を用いた（値は本文に記載しない）。 |
| **Stripe** | **test mode**。Stripe API は **Checkout Session 作成のため 1 回**呼ばれた（Dashboard/API の詳細ログは本文に書かない）。 |
| **price env** | **ローカル runtime** において **Stripe test mode の price 系 env が present**（値・id は出力していない）。 |
| **到達点** | **Checkout Session 作成まで**。 |
| **Checkout URL** | **開いていない**（ブラウザで決済画面へ遷移していない）。 |
| **支払い** | **していない**。 |
| **実 Webhook fulfillment** | **未実施**。 |
| **DB 更新 smoke** | **未実施**。 |
| **商品棚 UI** | **触っていない**。 |
| **Vercel env** | **未変更**。 |

---

## 2. 結果（観測フィールド）

| フィールド | 値 |
|------------|-----|
| **`case_name`** | **Checkout Session creation test** |
| **`http_status`** | **200** |
| **`has_checkout_url`** | **true** |
| **`has_session_id`** | **true** |
| **`payment_completed`** | **false** |
| **`checkout_url_full_printed`** | **false** |
| **`secret_cookie_token_authorization_exposed`** | **no** |

※ **Checkout URL 全文・session id 全文・price id・secret** は **コンソールにも SSOT にも出力していない**。

---

## 3. PASS 判定

| 観点 | 結論 |
|------|------|
| **Checkout Session creation test** | **PASS** |
| **Checkout API** | **test mode で Stripe Checkout Session を作成できる** と記録する。 |
| **price env** | **runtime から参照できている**（present の前提で Session 作成まで到達）。 |
| **主経路** | **所有権 / wallet / cap / Stripe Session 作成** の **主経路が通った** と記録する（本ゲートのスコープ内）。 |

---

## 4. 限界（本結果が証明しないこと）

- **支払い完了**は **未実施**のため **検証対象外**。
- **実 Webhook fulfillment**は **未実施**。
- **wallet / ledger / processed_events** 等の **DB 更新は未検証**（pre/post baseline smoke なし）。
- **duplicate replay / 二重適用** は **未検証**。
- **商品棚 UI** は **未検証**。
- **Vercel env** は **未設定・未変更**のため、**本番相当 env での再現**は本 SSOT の対象外。

---

## 5. 引き続き NO-GO（別承認・別ゲートまで）

- **Checkout URL を開く**
- **支払い完了**
- **実 Webhook fulfillment**
- **DB 更新 smoke**
- **商品棚 UI の公開・変更**
- **Vercel env の変更**
- **price id / Checkout URL 全文 / session id 全文 / secret の出力・転記**

---

## 6. 次の候補（いずれも **別承認**）

1. **test checkout payment completion gate**（決済完了までの安全な手順・証跡ルールは別文書で確定）。  
2. **test webhook fulfillment gate**（Stripe → アプリ → RPC の経路）。  
3. **DB pre/post baseline gate**（wallet / ledger / processed_events 等）。  
4. **duplicate replay gate**（べき等・再送）。  

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。コード変更・SQL 実行・DB 更新・Stripe Dashboard/env の変更・秘密の記載・商品棚 UI の操作は **実施していない**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_CHECKOUT_SESSION_CREATION_TEST_RESULT_v1*
