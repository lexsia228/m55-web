-- DEV / テスト環境のみ: 診断で特定したテストユーザー権利の残骸を削除する。
-- 本番で実行する前に、user_id が意図したテスト用であることを必ず確認すること。
--
-- 対象ユーザー: user_3Cb8myvncNIh4GSGQT0KdwQ3amH
-- 根拠: entitlement_rights に m55_p:core_origin が存在するため resolveEntryReportOwnership が owned になる。
--       entitlements にも stripe_checkout / cs_test_* のテスト決済に紐づく active 行がある。
--
-- 実行前に SELECT で再確認:
-- SELECT * FROM entitlement_rights WHERE user_id = 'user_3Cb8myvncNIh4GSGQT0KdwQ3amH';
-- SELECT * FROM entitlements WHERE user_id = 'user_3Cb8myvncNIh4GSGQT0KdwQ3amH' AND product_id = 'DTR_CORE_STATIC_V1';

BEGIN;

DELETE FROM entitlement_rights
WHERE id = 'c3ffb3e2-5746-447a-b05c-00a066fcb619'
  AND user_id = 'user_3Cb8myvncNIh4GSGQT0KdwQ3amH'
  AND right_key = 'm55_p:core_origin';

DELETE FROM entitlements
WHERE id = '25c59fde-be26-47cf-b45a-4e3a50061e9c'
  AND user_id = 'user_3Cb8myvncNIh4GSGQT0KdwQ3amH'
  AND product_id = 'DTR_CORE_STATIC_V1';

COMMIT;
