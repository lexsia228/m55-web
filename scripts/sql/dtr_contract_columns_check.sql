-- アプリが参照する列と information_schema の突合（PGRST204 切り分け用）
-- 期待: dtr_guest_drafts に extra_json、dtr_report_snapshots に draft_snapshot が出る

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('dtr_guest_drafts', 'dtr_report_snapshots')
ORDER BY table_name, ordinal_position;
