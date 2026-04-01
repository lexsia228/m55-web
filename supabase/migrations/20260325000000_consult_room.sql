-- M55 Concierge Room (2026-03-25)
-- One room thread per owned report. Credits finite (SSOT: max 3, included 1).
-- consult_threads: one per user_id + report_key (UNIQUE).
-- consult_messages: ordered messages in thread.

CREATE TABLE IF NOT EXISTS consult_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  report_key text NOT NULL,           -- canonical right_key, e.g. 'm55_p:core_origin'
  credits_total integer NOT NULL DEFAULT 1,
  credits_remaining integer NOT NULL DEFAULT 1,
  state text NOT NULL DEFAULT 'writable'
    CHECK (state IN ('writable', 'read_only')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_key)
);

CREATE INDEX IF NOT EXISTS idx_consult_threads_user ON consult_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_consult_threads_key  ON consult_threads(user_id, report_key);

CREATE TABLE IF NOT EXISTS consult_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES consult_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consult_messages_thread ON consult_messages(thread_id, created_at);
