-- DTR Core 静的レポート: 指定 Clerk user_id の entitlement と snapshot を照会する。
-- 実行前に :clerk_user_id を置換するか、Supabase SQL エディタでパラメータを指定。

-- entitlement_rights（DTR_CORE_RIGHT_KEY = m55_p:core_origin）
SELECT 'entitlement_rights' AS src, *
FROM entitlement_rights
WHERE user_id = :clerk_user_id
  AND right_key = 'm55_p:core_origin';

-- entitlements（product DTR_CORE_STATIC_V1）
SELECT 'entitlements' AS src, *
FROM entitlements
WHERE user_id = :clerk_user_id
  AND product_id = 'DTR_CORE_STATIC_V1';

-- dtr_report_snapshots
SELECT 'dtr_report_snapshots' AS src, user_id, product_id, checkout_session_id IS NOT NULL AS has_checkout_session
FROM dtr_report_snapshots
WHERE user_id = :clerk_user_id
  AND product_id = 'DTR_CORE_STATIC_V1';

-- 未購入なのに owned になる典型: entitlements に active の行だけ残っている（テスト決済の残骸・手動投入など）
