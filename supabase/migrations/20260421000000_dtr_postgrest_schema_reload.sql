-- PostgREST が新規テーブルを認識しない（PGRST205 / schema cache）場合の対策。
-- 20260420000000_dtr_drafts_and_report_snapshots.sql 適用後に実行される想定。
-- Supabase ダッシュボード: Settings → API → Reload schema と同等。
NOTIFY pgrst, 'reload schema';
