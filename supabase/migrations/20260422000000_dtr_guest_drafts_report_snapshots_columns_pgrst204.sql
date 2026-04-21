-- PGRST204: アプリが参照する列が実DBに無い場合の整合（CREATE 済みテーブルへの後追い ADD）
-- リポジトリの 20260420000000 には定義済みだが、手作業DDL・部分適用だと欠けることがある。
-- 参照: lib/m55/dtrDraftDb.ts, app/api/dtr/draft/route.ts

-- dtr_guest_drafts: UPSERT で extra_json を使用
ALTER TABLE public.dtr_guest_drafts
  ADD COLUMN IF NOT EXISTS extra_json jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.dtr_guest_drafts.extra_json IS '任意拡張フィールド（ローカル保存用）';

-- dtr_report_snapshots: UPSERT で draft_snapshot を使用
ALTER TABLE public.dtr_report_snapshots
  ADD COLUMN IF NOT EXISTS draft_snapshot jsonb;

COMMENT ON COLUMN public.dtr_report_snapshots.draft_snapshot IS '購入時点のドラフトスナップショット（無料入力由来; null 可）';

NOTIFY pgrst, 'reload schema';
