-- DTR Core: 指定 Clerk user_id の entitlement / draft / snapshot を照会する
-- Supabase SQL Editor: PUT_CLERK_USER_ID_HERE を実 user_id に1箇所だけ置換して実行
-- まとめ一行は dtr_purchased_state_summary.sql を併用

-- entitlement_rights（DTR_CORE_RIGHT_KEY = m55_p:core_origin）
SELECT 'entitlement_rights' AS src, *
FROM entitlement_rights
WHERE user_id = 'PUT_CLERK_USER_ID_HERE'
  AND right_key = 'm55_p:core_origin';

-- entitlements（product DTR_CORE_STATIC_V1）
SELECT 'entitlements' AS src, *
FROM entitlements
WHERE user_id = 'PUT_CLERK_USER_ID_HERE'
  AND product_id = 'DTR_CORE_STATIC_V1';

-- one_time_fulfillments（Stripe Checkout 完了の監査行）
SELECT 'one_time_fulfillments' AS src, checkout_session_id, user_id, product_id, fulfilled_at
FROM one_time_fulfillments
WHERE user_id = 'PUT_CLERK_USER_ID_HERE'
  AND product_id = 'DTR_CORE_STATIC_V1'
ORDER BY fulfilled_at DESC
LIMIT 5;

-- dtr_report_snapshots
SELECT 'dtr_report_snapshots' AS src, user_id, product_id, checkout_session_id IS NOT NULL AS has_checkout_session
FROM dtr_report_snapshots
WHERE user_id = 'PUT_CLERK_USER_ID_HERE'
  AND product_id = 'DTR_CORE_STATIC_V1';

-- dtr_guest_drafts（無料入力のサーバー側ドラフト）
SELECT 'dtr_guest_drafts' AS src, id, user_id, nickname, birth_date, updated_at
FROM dtr_guest_drafts
WHERE user_id = 'PUT_CLERK_USER_ID_HERE'
ORDER BY updated_at DESC
LIMIT 3;

-- 判定メモ:
-- entitlements + one_time_fulfillments に行があれば「既購入（決済記録あり）」。
-- dtr_report_snapshots まであれば「保存版あり＝読了相当」。
-- 決済記録あり・スナップショットなし → checkout 409 fulfillment_pending / processing。PGRST205 なら先に schema reload。
