-- Postgres 側にテーブル行が存在するか（マイグレ適用確認用）
-- PostgREST の schema cache は別途 NOTIFY または Dashboard「Reload schema」で更新。

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('dtr_guest_drafts', 'dtr_report_snapshots')
ORDER BY table_name;

-- 上記が 0 行なら 20260420000000_dtr_drafts_and_report_snapshots.sql を未適用。
-- テーブルがあるのに API が PGRST205 なら 20260421000000_dtr_postgrest_schema_reload.sql または:
-- NOTIFY pgrst, 'reload schema';
