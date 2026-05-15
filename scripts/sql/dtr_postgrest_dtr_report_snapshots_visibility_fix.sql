-- =============================================================================
-- PGRST205: dtr_report_snapshots を PostgREST に認識させる（アプリコードは変更しない）
-- =============================================================================
-- 前提: paid session は verify で valid。upsert だけが PGRST205 で落ちている場合に実行。
--
-- 【手順】
--  A) 下の「1. テーブル存在確認」を実行 → 2 行（dtr_guest_drafts, dtr_report_snapshots）になること
--  B) 0 行なら、リポジトリの次を先に適用してから A を再実行:
--       supabase/migrations/20260420000000_dtr_drafts_and_report_snapshots.sql
--  C) 下の「2. PostgREST schema reload」を実行（または Dashboard: Settings → API → Reload schema）
--  D) アプリで /dtr/processing を同じ success URL で再読込 → upsert 成功をログで確認
--  E) GET /api/dtr/report-snapshot-ready で ready=true を確認
--
-- 【「見えるようになった」証拠の例】
--  - SQL Editor の 1 の結果が 2 行
--  - NOTIFY 実行後、アプリログに PGRST205 が出ない
--  - [dtrDraftDb] の upsert が ok になる、または [report-snapshot-ready] に ready=true
-- =============================================================================

-- 1. テーブル存在確認（Postgres 側。2 行出れば migration 相当は入っている）
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('dtr_guest_drafts', 'dtr_report_snapshots')
ORDER BY table_name;

-- 2. PostgREST schema reload（supabase/migrations/20260421000000 と同内容）
NOTIFY pgrst, 'reload schema';
