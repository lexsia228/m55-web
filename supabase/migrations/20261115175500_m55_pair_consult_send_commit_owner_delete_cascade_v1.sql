-- Pair account deletion: send commits follow the deleted owner's consult thread.
-- Forward-only. Does not rewrite rows, credits, reservations, or
-- m55_compatibility_account_delete_v1. Idempotency remains the existing
-- UNIQUE (user_id, owned_report_id, idempotency_key) while the row exists.
-- Account deletion already removes that owner's purchase contexts, which
-- cascade to that owner's reports and threads. This constraint change lets
-- those threads delete their own send commits. Another owner's thread id
-- is a different parent row, so this cascade cannot reach it.

SET LOCAL lock_timeout = '5s';

LOCK TABLE public.compatibility_consult_threads IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public.compatibility_consult_send_commits IN ACCESS EXCLUSIVE MODE;

DO $m55_pair_send_commit_owner_delete$
DECLARE
  v_name name;
  v_count integer;
BEGIN
  IF to_regclass('public.compatibility_consult_send_commits') IS NULL
    OR to_regclass('public.compatibility_consult_threads') IS NULL
  THEN
    RAISE EXCEPTION 'PRECONDITION_RELATION_MISSING: consult thread or send commit table';
  END IF;

  SELECT count(*)::integer
  INTO v_count
  FROM pg_constraint
  WHERE conrelid = 'public.compatibility_consult_send_commits'::regclass
    AND contype = 'f'
    AND confrelid = 'public.compatibility_consult_threads'::regclass;

  IF v_count IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'PRECONDITION_FK_COUNT: expected one thread FK, got %', v_count;
  END IF;

  SELECT conname
  INTO v_name
  FROM pg_constraint
  WHERE conrelid = 'public.compatibility_consult_send_commits'::regclass
    AND contype = 'f'
    AND confrelid = 'public.compatibility_consult_threads'::regclass
    AND confdeltype = 'r'
    AND confupdtype = 'a'
    AND confmatchtype = 's'
    AND convalidated
    AND NOT condeferrable
    AND NOT condeferred
    AND conkey = ARRAY[
      (
        SELECT attnum
        FROM pg_attribute
        WHERE attrelid = 'public.compatibility_consult_send_commits'::regclass
          AND attname = 'thread_id'
          AND NOT attisdropped
      )
    ]::smallint[]
    AND confkey = ARRAY[
      (
        SELECT attnum
        FROM pg_attribute
        WHERE attrelid = 'public.compatibility_consult_threads'::regclass
          AND attname = 'id'
          AND NOT attisdropped
      )
    ]::smallint[];

  IF v_name IS NULL THEN
    RAISE EXCEPTION
      'PRECONDITION_FK_IDENTITY: validated RESTRICT thread_id->id FK (NO ACTION update, simple match) not found';
  END IF;

  EXECUTE format(
    'ALTER TABLE public.compatibility_consult_send_commits DROP CONSTRAINT %I',
    v_name
  );

  ALTER TABLE public.compatibility_consult_send_commits
    ADD CONSTRAINT compatibility_consult_send_commits_thread_id_fkey
    FOREIGN KEY (thread_id)
    REFERENCES public.compatibility_consult_threads (id)
    ON DELETE CASCADE;
END
$m55_pair_send_commit_owner_delete$;
