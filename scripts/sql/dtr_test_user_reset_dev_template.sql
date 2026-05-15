-- DEV / staging のみ: 指定 Clerk user_id の DTR テスト購入データをまとめて消し「未購入」に戻す。
-- :clerk_user_id を置換してから実行。本番では使わないこと。
--
-- 実行前に dtr_entitlement_diagnostic.sql で対象行を確認すること。

BEGIN;

DELETE FROM dtr_report_snapshots
WHERE user_id = :clerk_user_id AND product_id = 'DTR_CORE_STATIC_V1';

DELETE FROM one_time_fulfillments
WHERE user_id = :clerk_user_id AND product_id = 'DTR_CORE_STATIC_V1';

DELETE FROM entitlements
WHERE user_id = :clerk_user_id AND product_id = 'DTR_CORE_STATIC_V1';

DELETE FROM entitlement_rights
WHERE user_id = :clerk_user_id AND right_key = 'm55_p:core_origin';

COMMIT;
