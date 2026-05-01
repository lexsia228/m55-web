# M55 追加相談返書 — test checkout payment completion 実行パケット（v1）

**文書種別:** **Stripe test mode** で **Checkout URL を開き**、**test 支払い完了**まで実施するための **人手実行手順・記録規約**の SSOT  
**バージョン:** v1  

**ゲート:** [`M55_REPLY_TICKET_TEST_CHECKOUT_PAYMENT_COMPLETION_GATE_v1.md`](./M55_REPLY_TICKET_TEST_CHECKOUT_PAYMENT_COMPLETION_GATE_v1.md)  
**Checkout Session 結果:** [`M55_REPLY_TICKET_CHECKOUT_SESSION_CREATION_TEST_RESULT_v1.md`](./M55_REPLY_TICKET_CHECKOUT_SESSION_CREATION_TEST_RESULT_v1.md)  
**PRE baseline 結果:** [`M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1.md`](./M55_REPLY_TICKET_DB_PRE_FULFILLMENT_BASELINE_RESULT_v1.md)  
**POST baseline パケット:** [`M55_REPLY_TICKET_DB_POST_FULFILLMENT_BASELINE_PACKET_v1.md`](./M55_REPLY_TICKET_DB_POST_FULFILLMENT_BASELINE_PACKET_v1.md)

**記録ポリシー:** **Checkout URL 全文・session id 全文・price id・secret** は記録しない（セクション 4–5）。

---

## 1. 実施対象

| 項目 | 内容 |
|------|------|
| **決済経路** | **Stripe test mode Checkout** |
| **SKU** | **追加相談返書チケット**（**`product_key` = `additional_reply_ticket`**） |
| **金額・型** | **500 JPY**、**one-time** |
| **所有権** | **`report_instance_id` は本人所有**のもののみ（値・UUID は SSOT / チャットに貼らない運用） |
| **実行環境** | **ローカル**（アプリ・Stripe test keys の組み合わせはオペレータが固定） |
| **Vercel** | **env 未変更** |
| **商品棚 UI** | **未公開**（本検証の入口にしない） |

---

## 2. 実施前確認

以下を **すべて満たしてから** 実行に進む。

| 確認 | 期待 |
|------|------|
| **Checkout Session creation test** | **PASS**（結果 SSOT に準拠）。 |
| **pre fulfillment baseline** | **PASS**（結果 SSOT に準拠）。 |
| **post fulfillment baseline packet** | **準備済み**（同一 `report_instance_id` で POST SELECT を実行できる状態）。 |
| **記録方針** | **URL 全文 / session id 全文 / price id / secret** を **記録・転記しない**。 |
| **Stripe Dashboard**（参照のみ） | **test mode** であること（誤って live を触らない）。 |
| **課金モード** | **live ではない**こと。 |

---

## 3. 実施手順

1. **Session の出所を決める:** **既存の Checkout URL を使う**か、**新規に test Checkout Session を作成**するかを **明示**してから進める。  
2. **URL の鮮度:** 既存 URL が **期限切れ・無効**なら、**Checkout Session 作成テスト**（コミット済み手順に準拠）を **やり直して** 有効な **test mode** のみを使う。  
3. **Checkout を開く:** ブラウザで Checkout に遷移する（**URL 全文はログ・SSOT・チャットに貼らない**）。  
4. **支払い:** **Stripe test card** のみ使用。**カード情報は SSOT / チャットに書かない**。  
5. **結果の最小記録:** **`payment_completed` = true/false** を必ず記録する（セクション 4）。  
6. **成功時の連続動作:** **`payment_completed = true`** の場合、**同一検証セッション内で速やかに** [`m55_reply_ticket_post_fulfillment_baseline.sql`](../../scripts/sql/production/m55_reply_ticket_post_fulfillment_baseline.sql) の **SELECT のみ**へ進む（別承認済みの読み取り口のみ）。  
7. **中断:** **失敗・キャンセル・ブラウザバック等**で完了しなかった場合は **中断**し、**payment_completed = false** 等と **機微なし short note** で結果のみ記録する。

---

## 4. 記録してよいもの

- **`case_name`**
- **`mode`** = **`test`**
- **`amount`** = **500 JPY**
- **`payment_completed`** = **true / false**
- **`returned_to_app`** = **true / false**（Checkout 完了後にアプリ側の成功画面・リダイレクト等へ戻れたかの宣言 ※実装に依存）
- **`checkout_url_full_printed`** = **false**
- **`session_id_full_printed`** = **false**
- **`secret_exposed`** = **no**
- **timestamp**
- **short note**（**機微値なし**の一文メモ）

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
- **カード番号**および**カード入力画面のスクリーンショット**

---

## 6. 支払い直後に実施すること（`payment_completed = true` の場合）

| 順序 | 内容 |
|------|------|
| 1 | **`scripts/sql/production/m55_reply_ticket_post_fulfillment_baseline.sql`** を **SELECT のみ**実行（**PRE と同一パラメータ**・別承認の DB 読み取り口）。 |
| 2 | 結果は **summary 中心**に結果 SSOT へ整理する。 |
| 3 | **Stripe event id / checkout session id / payment intent id の全文**は **貼らない**（POST SQL の **boolean / tail4** ポリシーに従う）。 |
| 4 | **post baseline 結果 SSOT** を作成し、その後 **fulfillment result SSOT** / **duplicate replay gate** へ進む（別文書）。 |

---

## 7. STOP 条件

以下に該当しそうになったら **即中断**する。

- **live mode** での課金・URL 利用・Dashboard 操作
- **カード情報**を記録・共有しそうになる
- **URL / session / price id / secret** を **貼りそう**になる
- **商品棚 UI** に導線や状態を **出そう**とする
- **Vercel env** を **変更**しようとする
- **post baseline なし**で **次ゲート**へ進もうとする
- **想定外の DB 変化**を **記録せず**進もうとする
- **DTR checkout route** を検証用に **変更**しようとする

---

## 8. 現時点の判定

| 項目 | 判定 |
|------|------|
| **execution packet（本文書の作成）** | **GO** |
| **test payment execution** | **別承認** |
| **post baseline SELECT** | **支払い完了後**に **別手順・別承認**（読み取り口） |
| **duplicate replay** | **NO-GO**（別ゲート） |
| **live 決済** | **NO-GO** |
| **商品棚 UI** | **NO-GO** |

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。**Checkout URL 未開封**。**決済なし**。**post baseline SELECT 未実行**。**SQL 実行なし**。**DB 更新なし**。**Stripe Dashboard / env 変更なし**。**secret 出力なし**。**商品棚 UI 未操作**。

---

*END OF DOCUMENT — M55_REPLY_TICKET_TEST_CHECKOUT_PAYMENT_COMPLETION_EXECUTION_PACKET_v1*
