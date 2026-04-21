-- マイグレ適用を待たずに PostgREST だけ即時リロードしたいとき用（SQL Editor で単体実行可）
-- テーブル自体が無い場合は先に 20260420000000_dtr_drafts_and_report_snapshots.sql を適用すること。

NOTIFY pgrst, 'reload schema';
