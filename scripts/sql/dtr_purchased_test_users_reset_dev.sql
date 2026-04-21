-- DEV のみ: 既知のテスト purchased ユーザーを未購入に戻す（新規決済フロー検証用）
-- 本番では実行しないこと。
-- user_id を実 Clerk ID に置換してから実行。
--
-- 運用正本: scripts/dev/DTR_PURCHASE_FLOW_OPERATIONS.txt
-- 固定テストユーザー例: user_3BZ9... / user_3Cb8...（実 ID に置換）

BEGIN;

DELETE FROM dtr_report_snapshots
WHERE user_id IN ('PUT_CLERK_USER_ID_1', 'PUT_CLERK_USER_ID_2')
  AND product_id = 'DTR_CORE_STATIC_V1';

DELETE FROM one_time_fulfillments
WHERE user_id IN ('PUT_CLERK_USER_ID_1', 'PUT_CLERK_USER_ID_2')
  AND product_id = 'DTR_CORE_STATIC_V1';

DELETE FROM entitlements
WHERE user_id IN ('PUT_CLERK_USER_ID_1', 'PUT_CLERK_USER_ID_2')
  AND product_id = 'DTR_CORE_STATIC_V1';

DELETE FROM entitlement_rights
WHERE user_id IN ('PUT_CLERK_USER_ID_1', 'PUT_CLERK_USER_ID_2')
  AND right_key = 'm55_p:core_origin';

COMMIT;
