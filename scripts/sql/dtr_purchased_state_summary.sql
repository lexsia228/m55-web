-- 1 行で「未購入 vs 既購入（どの段階か）」を明示するサマリ
-- Supabase SQL Editor: 下の PUT_CLERK_USER_ID_HERE を1箇所だけ実値に置換して実行

WITH p AS (
  SELECT 'PUT_CLERK_USER_ID_HERE'::text AS user_id
),
flags AS (
  SELECT
    EXISTS (
      SELECT 1 FROM entitlement_rights e WHERE e.user_id = (SELECT user_id FROM p) AND e.right_key = 'm55_p:core_origin'
    ) AS has_entitlement_rights,
    EXISTS (
      SELECT 1 FROM entitlements e
      WHERE e.user_id = (SELECT user_id FROM p)
        AND e.product_id = 'DTR_CORE_STATIC_V1'
        AND e.status = 'active'
    ) AS has_active_entitlement,
    EXISTS (
      SELECT 1 FROM one_time_fulfillments o
      WHERE o.user_id = (SELECT user_id FROM p) AND o.product_id = 'DTR_CORE_STATIC_V1'
    ) AS has_one_time_fulfillment,
    EXISTS (
      SELECT 1 FROM dtr_report_snapshots s
      WHERE s.user_id = (SELECT user_id FROM p) AND s.product_id = 'DTR_CORE_STATIC_V1'
    ) AS has_report_snapshot,
    EXISTS (
      SELECT 1 FROM dtr_guest_drafts g WHERE g.user_id = (SELECT user_id FROM p)
    ) AS has_guest_draft
  FROM p
)
SELECT
  (SELECT user_id FROM p) AS clerk_user_id,
  f.has_entitlement_rights,
  f.has_active_entitlement,
  f.has_one_time_fulfillment,
  f.has_report_snapshot,
  f.has_guest_draft,
  CASE
    WHEN f.has_report_snapshot THEN
      '既購入: 保存版スナップショットあり → /dtr/core / report-snapshot-ready は ready=true になり得る'
    WHEN f.has_one_time_fulfillment OR f.has_active_entitlement THEN
      '既購入: 決済・履行記録あり・保存版なし → gate owned、checkout は 409 fulfillment_pending になり得る。PGRST205 解消後に snapshot 作成・processing 完了で core へ。'
    WHEN f.has_entitlement_rights AND NOT f.has_active_entitlement AND NOT f.has_one_time_fulfillment THEN
      '不整合疑い: entitlement_rights のみ（残骸）→ gate は locked 想定・要調査'
    ELSE
      '未購入: entitlements / one_time_fulfillments の記録なし → checkout は Stripe URL が返る想定'
  END AS purchase_state;
