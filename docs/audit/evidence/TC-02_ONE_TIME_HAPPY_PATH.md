# TC-02 One-time purchase happy path 証跡

## 実行条件

- **Stripe:** Test mode、STRIPE_PRICE_DTR_CORE_STATIC_V1 設定済み
- **Stripe CLI:** v1.37.2 インストール済み。`stripe login` でペアリング完了済み
- **Webhook:** `stripe listen --forward-to localhost:3000/api/stripe/webhook` 起動（ポートは app 起動ポートに合わせる）
- **STRIPE_WEBHOOK_SECRET:** stripe listen 出力の whsec_xxx を .env.local に設定
- **App:** `npm run dev` で localhost:3000（または 3001）起動
- **Clerk:** ログイン済みセッション
- **Supabase:** one_time_fulfillments / entitlements / entitlement_rights の確認可能

## 期待結果

- checkout.session.completed 受信後、one_time_fulfillments に 1 件
- entitlements: user_id + DTR_CORE_STATIC_V1 + status=active
- entitlement_rights: m55_p:core_origin
- success page → /dtr/core?post_purchase=1 redirect または delayed copy（webhook 遅延時）

## 実結果

| 項目 | 値 |
|------|-----|
| 実行日 | （実施時に記入）|
| event_id | （実施時に記入）|
| checkout_session_id | （実施時に記入）|
| payment_intent_id | （実施時に記入）|
| 判定 | 未実行 / PASS / FAIL |

## 保存証跡

| 証跡項目 | 値 |
|----------|-----|
| event_id | |
| checkout_session_id | |
| payment_intent_id | |
| one_time_fulfillments 確認結果 | 1 件、user_id / product_id / checkout_session_id / event_id 一致 |
| entitlements 確認結果 | status=active、product_id=DTR_CORE_STATIC_V1 |
| entitlement_rights 確認結果 | right_key=m55_p:core_origin 存在 |
| 購入後閲覧導線の確認結果 | success → /dtr/core?post_purchase=1 redirect、または /dtr/core で保護コンテンツ閲覧可 |

## 未解決点

- （該当時のみ記入）

---

## TC-02 E2E 実行手順（実施者用）

1. **stripe login**（初回のみ）: ターミナルで `stripe login` → ブラウザでペアリング完了
2. **stripe listen 起動:** `stripe listen --forward-to localhost:3000/api/stripe/webhook`（app が 3001 の場合は 3001 に変更）
3. 出力の `Ready! Your webhook signing secret is whsec_xxx` を .env.local の STRIPE_WEBHOOK_SECRET に設定し、app を再起動
4. `npm run dev` でアプリ起動
5. ブラウザでログイン → `/dtr/lp` を開く
6. 購入ボタンクリック、またはブラウザコンソールで以下を実行 → Stripe Checkout へ遷移

```js
fetch('/api/purchase/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ productId: 'DTR_CORE_STATIC_V1' })
})
  .then(async r => {
    const data = await r.json().catch(() => null);
    console.log('status=', r.status, 'data=', data);
    if (r.ok && data?.url) window.location.href = data.url;
  })
  .catch(console.error);
```
7. Test card `4242 4242 4242 4242` で決済完了
8. success page 表示後、`/dtr/core` へ redirect または delayed copy を確認
9. **Stripe CLI ログ**から event_id（例: evt_xxx）を取得
10. **success URL** の `session_id` クエリから checkout_session_id（例: cs_xxx）を取得
11. **Supabase** で以下を確認し、本ファイルの保存証跡に記入:
    - `SELECT * FROM one_time_fulfillments ORDER BY fulfilled_at DESC LIMIT 1;` → payment_intent_id も取得
    - `SELECT * FROM entitlements WHERE product_id='DTR_CORE_STATIC_V1' AND status='active';`
    - `SELECT * FROM entitlement_rights WHERE right_key='m55_p:core_origin';`
12. `/dtr/core` で保護コンテンツが閲覧可能であることを確認

---

## Supabase 確認用 SQL（証跡取得時）

```sql
-- one_time_fulfillments（最新1件）
SELECT checkout_session_id, payment_intent_id, event_id, user_id, product_id, fulfilled_at
FROM one_time_fulfillments
ORDER BY fulfilled_at DESC LIMIT 1;

-- entitlements
SELECT id, user_id, product_id, status, stripe_session_id
FROM entitlements
WHERE product_id = 'DTR_CORE_STATIC_V1' AND status = 'active';

-- entitlement_rights
SELECT user_id, right_key, right_value, source, updated_at
FROM entitlement_rights
WHERE right_key = 'm55_p:core_origin';
```
