# M55 追加相談返書 — Stripe test price ローカル env setup 結果 SSOT（v1）

**文書種別:** [`M55_REPLY_TICKET_STRIPE_TEST_PRICE_ENV_SETUP_EXECUTION_PACKET_v1.md`](./M55_REPLY_TICKET_STRIPE_TEST_PRICE_ENV_SETUP_EXECUTION_PACKET_v1.md) に沿った **ローカルのみ**の **test price env** セットアップ実施結果  
**バージョン:** v1

**記録ポリシー:** **price id 実値・Stripe/Clerk/Supabase/Webhook の secret・DB URL・cookie/token**は本文に**含めない**。

---

## 1. 実施内容

| 項目 | 内容 |
|------|------|
| **Stripe** | **test mode** にて、追加相談返書チケット用 **Product / Price** を**作成済み**。 |
| **金額・型** | **500 JPY**、**one-time**。 |
| **アプリ SKU 論理** | **`product_key` = `additional_reply_ticket`**（Checkout metadata 契約と整合）。 |
| **env** | **キー名 `STRIPE_PRICE_ADDITIONAL_REPLY_TICKET`** を **ローカルの `.env.local` のみ**に設定。**Vercel は未変更**。 |
| **確認** | **Next / runtime** において変数が **truthy かどうか**を **boolean のみ**で確認（**値は印字・転記していない**）。 |

---

## 2. 確認結果

| フィールド | 値 |
|------------|-----|
| **`key_exists`** | **true** |
| **`runtime_env_present`** | **true** |
| **`value_printed`** | **false** |
| **`secret_exposed`** | **no** |

※ **タイムスタンプ**は結果をクローズするとき運用側で添付してよい。

---

## 3. 判定

| 観点 | 結論 |
|------|------|
| **local test price env setup** | **PASS**（ローカルに **キーが存在し、runtime が truthy** と観測。**値・id は出力なし**。） |
| **`POST /api/reply-tickets/checkout` の前提** | **ローカルでは** Stripe Price を **env から参照できる前提**が成立したと記録する。 |
| **Checkout Session** | **未実施**のため **作成成功は未検証**。 |
| **price id の Stripe 上妥当性** | **Stripe API を実行していない**ため **未検証**（Dashboard 上で test price を作成した事実とは別）。 |

---

## 4. 引き続き NO-GO

- **Vercel env の変更**
- **price id 実値の出力・共有**
- **Checkout Session の作成テスト**（別ゲートまで）
- **実決済**
- **実 Webhook**
- **DB を更新する smoke**
- **商品棚 UI** の露出・変更
- **secret / cookie / token / Authorization** の転記

---

## 5. 次の候補

1. **Checkout Session creation test gate**（**test mode のみ**）。  
2. **Checkout URL が返る**場合の **記録ルール固定**（**URL 全文は SSOT に貼らない**／マスクまたは「返却あり」の boolean のみ等 — ゲート文書で確定）。  
3. **決済画面で支払わない**運用で **Session まで**に留める。  
4. **test webhook → RPC fulfillment** は**さらに後**のゲート。

---

## 厳守事項（本ファイル作成に関して）

- **文書作成のみ**。コード・SQL・DB・Stripe API・Dashboard 追加変更・**秘密の記載**・商品棚 UI を本エージェントは実施していない。

---

*END OF DOCUMENT — M55_REPLY_TICKET_STRIPE_TEST_PRICE_LOCAL_ENV_SETUP_RESULT_v1*
