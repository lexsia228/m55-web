-- =============================================================================
-- M55 Production History-Only Backfill — EXECUTE (MUTATION)
-- Path: scripts/sql/production/m55_production_history_recovery_execute.sql
--
-- *** EXECUTION NOT AUTHORIZED UNTIL HUMAN AUTHORITY GATE ***
--
-- Human target: Supabase organization m55-soul / project m55-soul-core ONLY
-- Forbidden: m55-preview / m55-soul-preview
--
-- Scope: canonical migration history bootstrap + P1-P7 version rows ONLY.
-- Object migration SQL is NOT executed. Application rows are NOT touched.
-- Phase 2 version 20260617000001 is EXCLUDED from this recovery artifact.
--
-- Run only after history_recovery_precheck.sql returns HISTORY_RECOVERY_PRECHECK_GREEN
-- and Human authority packet binds this exact file SHA256.
--
-- Same Run convention: prepend the three GUC SET statements before this file.
-- =============================================================================

BEGIN;

DO $m55_hist_rec_guard$
BEGIN
  IF COALESCE(current_setting('m55.production.human_supabase_org_confirmed', true), '') IS DISTINCT FROM 'm55-soul' THEN
    RAISE EXCEPTION 'HOLD_IDENTITY_MISMATCH:human_org';
  END IF;
  IF COALESCE(current_setting('m55.production.human_supabase_project_confirmed', true), '') IS DISTINCT FROM 'm55-soul-core' THEN
    RAISE EXCEPTION 'HOLD_IDENTITY_MISMATCH:human_project';
  END IF;
  IF COALESCE(current_setting('m55.production.human_supabase_environment_confirmed', true), '') IS DISTINCT FROM 'PRODUCTION' THEN
    RAISE EXCEPTION 'HOLD_IDENTITY_MISMATCH:human_environment';
  END IF;
  IF current_database()::text IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'HOLD_IDENTITY_MISMATCH:database';
  END IF;
  IF current_user::text IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'HOLD_IDENTITY_MISMATCH:role';
  END IF;
  IF to_regnamespace('supabase_migrations') IS NOT NULL THEN
    RAISE EXCEPTION 'HOLD_HISTORY_SCHEMA_ALREADY_EXISTS';
  END IF;
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    RAISE EXCEPTION 'HOLD_CANONICAL_HISTORY_ALREADY_EXISTS';
  END IF;
END;
$m55_hist_rec_guard$;

CREATE SCHEMA supabase_migrations;
ALTER SCHEMA supabase_migrations OWNER TO postgres;
CREATE TABLE supabase_migrations.schema_migrations (
  version text NOT NULL PRIMARY KEY,
  statements text[],
  name text
);
ALTER TABLE supabase_migrations.schema_migrations OWNER TO postgres;

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20260614000000',
  ARRAY[
      'SET LOCAL search_path = pg_catalog, public',
      'CREATE TABLE public."consult_threads" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "report_key" text NOT NULL,
  "credits_total" integer NOT NULL DEFAULT 1,
  "credits_remaining" integer NOT NULL DEFAULT 1,
  "state" text NOT NULL DEFAULT ''writable''::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
)',
      'CREATE TABLE public."dtr_guest_drafts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "nickname" text,
  "birth_date" date,
  "extra_json" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "linked_at" timestamp with time zone
)',
      'CREATE TABLE public."dtr_report_snapshots" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "product_id" text NOT NULL,
  "checkout_session_id" text,
  "nickname" text,
  "birth_date" date,
  "snapshot" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "draft_snapshot" jsonb,
  "envelope_json" jsonb,
  "profile_snapshot" jsonb,
  "engine_context_json" jsonb,
  "engine_version" text,
  "user_hidden_at" timestamp with time zone,
  "user_hidden_source" text,
  "user_hidden_reason" text
)',
      'CREATE TABLE public."entitlement_rights" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "right_key" text NOT NULL,
  "right_value" text,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
)',
      'CREATE TABLE public."entitlements" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "product_id" text NOT NULL,
  "grant_type" text NOT NULL,
  "source" text NOT NULL,
  "status" text NOT NULL DEFAULT ''active''::text,
  "purchase_ref" text,
  "stripe_event_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone,
  "stripe_session_id" text
)',
      'CREATE TABLE public."failed_fulfillments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "event_id" text NOT NULL,
  "checkout_session_id" text NOT NULL,
  "failure_reason" text NOT NULL,
  "raw_metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
)',
      'CREATE TABLE public."one_time_fulfillments" (
  "checkout_session_id" text NOT NULL,
  "payment_intent_id" text,
  "event_id" text NOT NULL,
  "user_id" text NOT NULL,
  "product_id" text NOT NULL,
  "fulfilled_at" timestamp with time zone NOT NULL DEFAULT now()
)',
      'CREATE TABLE public."reply_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "theme" text NOT NULL,
  "input_mode" text NOT NULL,
  "selected_subquestions_json" jsonb NOT NULL,
  "free_text" text,
  "schema_version" text NOT NULL DEFAULT ''1.1''::text,
  "idempotency_key" text NOT NULL,
  "status" text NOT NULL,
  "core_profile_ref" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "report_instance_id" uuid
)',
      'CREATE TABLE public."reply_ticket_wallets" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "initial_included_count" integer NOT NULL,
  "purchased_count" integer NOT NULL,
  "consumed_count" integer NOT NULL,
  "available_count" integer NOT NULL,
  "status" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "report_instance_id" uuid
)',
      'CREATE TABLE public."stripe_events" (
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "received_at" timestamp with time zone NOT NULL DEFAULT now()
)',
      'CREATE TABLE public."stripe_processed_events" (
  "id" uuid DEFAULT gen_random_uuid(),
  "stripe_event_id" text,
  "checkout_session_id" text,
  "payment_intent_id" text,
  "product_key" text,
  "report_instance_id" uuid,
  "user_ref_hash" text,
  "status" text,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
)',
      'CREATE TABLE public."consult_messages" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "thread_id" uuid NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
)',
      'CREATE TABLE public."reply_documents" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "reply_session_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "theme" text NOT NULL,
  "payload_json" jsonb NOT NULL,
  "version" text NOT NULL,
  "generator_version" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
)',
      'CREATE TABLE public."consult_send_commits" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "report_instance_id" uuid NOT NULL,
  "idempotency_key" text NOT NULL,
  "payload_fingerprint" text NOT NULL,
  "consult_thread_id" uuid NOT NULL,
  "status" text NOT NULL,
  "user_message_id" uuid,
  "assistant_message_id" uuid,
  "wallet_id" uuid,
  "wallet_before" integer,
  "wallet_after" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
)',
      'CREATE TABLE public."reply_wallet_ledgers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "wallet_id" uuid NOT NULL,
  "reply_session_id" uuid,
  "delta" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "event_type" text NOT NULL,
  "source_of_grant" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "report_instance_id" uuid,
  "stripe_event_id" text,
  "stripe_checkout_session_id" text,
  "stripe_payment_intent_id" text,
  "product_key" text,
  "consult_commit_id" uuid
)',
      'ALTER TABLE public."consult_threads" ADD CONSTRAINT "consult_threads_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."consult_threads" ADD CONSTRAINT "consult_threads_state_check" CHECK (state = ANY (ARRAY[''writable''::text, ''read_only''::text]))',
      'ALTER TABLE public."consult_threads" ADD CONSTRAINT "consult_threads_user_id_report_key_key" UNIQUE (user_id, report_key)',
      'ALTER TABLE public."dtr_guest_drafts" ADD CONSTRAINT "dtr_guest_drafts_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."dtr_report_snapshots" ADD CONSTRAINT "dtr_report_snapshots_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."dtr_report_snapshots" ADD CONSTRAINT "dtr_report_snapshots_user_product_key" UNIQUE (user_id, product_id)',
      'ALTER TABLE public."entitlement_rights" ADD CONSTRAINT "entitlement_rights_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."entitlements" ADD CONSTRAINT "entitlements_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."entitlements" ADD CONSTRAINT "entitlements_user_id_product_id_key" UNIQUE (user_id, product_id)',
      'ALTER TABLE public."failed_fulfillments" ADD CONSTRAINT "failed_fulfillments_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."one_time_fulfillments" ADD CONSTRAINT "one_time_fulfillments_pkey" PRIMARY KEY (checkout_session_id)',
      'ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_idempotency_key_check" CHECK (length(btrim(idempotency_key)) > 0)',
      'ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_input_mode_check" CHECK (length(btrim(input_mode)) > 0)',
      'ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_schema_version_check" CHECK (schema_version = ''1.1''::text)',
      'ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_selected_subquestions_json_check" CHECK (jsonb_typeof(selected_subquestions_json) = ''array''::text)',
      'ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_status_check" CHECK (status = ANY (ARRAY[''accepted''::text, ''generating''::text, ''succeeded''::text, ''failed''::text, ''cancelled''::text]))',
      'ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_theme_check" CHECK (length(btrim(theme)) > 0)',
      'ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_user_id_check" CHECK (length(btrim(user_id)) > 0)',
      'ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_user_id_idempotency_key_key" UNIQUE (user_id, idempotency_key)',
      'ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_available_count_check" CHECK (available_count >= 0)',
      'ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_check" CHECK (available_count = (initial_included_count + purchased_count - consumed_count))',
      'ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_consumed_count_check" CHECK (consumed_count >= 0)',
      'ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_initial_included_count_check" CHECK (initial_included_count >= 0)',
      'ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_purchased_count_check" CHECK (purchased_count >= 0)',
      'ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_status_check" CHECK (status = ANY (ARRAY[''active''::text, ''suspended''::text, ''closed''::text]))',
      'ALTER TABLE public."stripe_events" ADD CONSTRAINT "stripe_events_pkey" PRIMARY KEY (event_id)',
      'ALTER TABLE public."consult_messages" ADD CONSTRAINT "consult_messages_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."consult_messages" ADD CONSTRAINT "consult_messages_role_check" CHECK (role = ANY (ARRAY[''user''::text, ''assistant''::text]))',
      'ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_check" CHECK ((payload_json ->> ''version''::text) IS NOT NULL AND (payload_json ->> ''version''::text) = version)',
      'ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_check1" CHECK ((payload_json ->> ''theme''::text) IS NOT NULL AND (payload_json ->> ''theme''::text) = theme)',
      'ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_payload_json_check" CHECK (jsonb_typeof(payload_json) = ''object''::text)',
      'ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_reply_session_id_key" UNIQUE (reply_session_id)',
      'ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_theme_check" CHECK (length(btrim(theme)) > 0)',
      'ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_user_id_check" CHECK (length(btrim(user_id)) > 0)',
      'ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_version_check" CHECK (length(btrim(version)) > 0 AND version = ''1.1''::text)',
      'ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_idempotency_key_check" CHECK (length(btrim(idempotency_key)) >= 8 AND length(btrim(idempotency_key)) <= 128)',
      'ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_status_check" CHECK (status = ANY (ARRAY[''pending''::text, ''succeeded''::text, ''failed''::text]))',
      'ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_user_id_check" CHECK (length(btrim(user_id)) > 0)',
      'ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_user_id_report_instance_id_idempotency_key" UNIQUE (user_id, report_instance_id, idempotency_key)',
      'ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_balance_after_check" CHECK (balance_after >= 0)',
      'ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_event_type_check" CHECK (event_type = ANY (ARRAY[''included_grant''::text, ''purchase_grant''::text, ''reply_consume''::text, ''recovery_adjust''::text, ''admin_adjust''::text]))',
      'ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_pkey" PRIMARY KEY (id)',
      'ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_reply_consume_ref_check" CHECK (event_type = ''reply_consume''::text AND delta < 0 AND (reply_session_id IS NOT NULL OR consult_commit_id IS NOT NULL) OR (event_type = ANY (ARRAY[''included_grant''::text, ''purchase_grant''::text])) AND delta > 0 OR (event_type = ANY (ARRAY[''recovery_adjust''::text, ''admin_adjust''::text])))',
      'ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_source_of_grant_check" CHECK (source_of_grant IS NULL OR (source_of_grant = ANY (ARRAY[''PURCHASE''::text, ''INCLUDED''::text, ''RECOVERY''::text, ''ADMIN_ADJUST''::text])))',
      'ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_user_id_check" CHECK (length(btrim(user_id)) > 0)',
      'CREATE UNIQUE INDEX reply_sessions_id_theme_key ON public.reply_sessions USING btree (id, theme)',
      'ALTER TABLE public."consult_messages" ADD CONSTRAINT "consult_messages_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.consult_threads(id) ON DELETE CASCADE',
      'ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_reply_session_id_fkey" FOREIGN KEY (reply_session_id) REFERENCES public.reply_sessions(id) ON DELETE CASCADE',
      'ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_session_theme_fk" FOREIGN KEY (reply_session_id, theme) REFERENCES public.reply_sessions(id, theme) ON UPDATE RESTRICT ON DELETE RESTRICT',
      'ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_assistant_message_id_fkey" FOREIGN KEY (assistant_message_id) REFERENCES public.consult_messages(id) ON DELETE SET NULL',
      'ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_consult_thread_id_fkey" FOREIGN KEY (consult_thread_id) REFERENCES public.consult_threads(id) ON DELETE RESTRICT',
      'ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_user_message_id_fkey" FOREIGN KEY (user_message_id) REFERENCES public.consult_messages(id) ON DELETE SET NULL',
      'ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES public.reply_ticket_wallets(id) ON DELETE SET NULL',
      'ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_consult_commit_id_fkey" FOREIGN KEY (consult_commit_id) REFERENCES public.consult_send_commits(id) ON DELETE SET NULL',
      'ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_reply_session_id_fkey" FOREIGN KEY (reply_session_id) REFERENCES public.reply_sessions(id) ON DELETE SET NULL',
      'ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES public.reply_ticket_wallets(id) ON DELETE CASCADE',
      'CREATE INDEX idx_consult_messages_thread ON public.consult_messages USING btree (thread_id, created_at)',
      'CREATE INDEX idx_consult_send_commits_user_report_created ON public.consult_send_commits USING btree (user_id, report_instance_id, created_at DESC)',
      'CREATE INDEX idx_consult_threads_key ON public.consult_threads USING btree (user_id, report_key)',
      'CREATE INDEX idx_consult_threads_user ON public.consult_threads USING btree (user_id)',
      'CREATE INDEX idx_dtr_guest_drafts_user_id ON public.dtr_guest_drafts USING btree (user_id)',
      'CREATE UNIQUE INDEX dtr_report_snapshots_one_visible_per_user_product_uq ON public.dtr_report_snapshots USING btree (user_id, product_id) WHERE (user_hidden_at IS NULL)',
      'CREATE INDEX idx_dtr_report_snapshots_product_id ON public.dtr_report_snapshots USING btree (product_id)',
      'CREATE INDEX idx_dtr_report_snapshots_user_id ON public.dtr_report_snapshots USING btree (user_id)',
      'CREATE INDEX idx_entitlement_rights_user ON public.entitlement_rights USING btree (user_id)',
      'CREATE UNIQUE INDEX uq_entitlement_rights_user_key ON public.entitlement_rights USING btree (user_id, right_key)',
      'CREATE UNIQUE INDEX entitlements_user_product_uq ON public.entitlements USING btree (user_id, product_id)',
      'CREATE UNIQUE INDEX uq_entitlements_user_product ON public.entitlements USING btree (user_id, product_id)',
      'CREATE INDEX idx_one_time_fulfillments_user ON public.one_time_fulfillments USING btree (user_id)',
      'CREATE INDEX idx_reply_documents_theme ON public.reply_documents USING btree (theme)',
      'CREATE INDEX idx_reply_documents_user_created ON public.reply_documents USING btree (user_id, created_at DESC)',
      'CREATE INDEX idx_reply_sessions_status ON public.reply_sessions USING btree (status)',
      'CREATE INDEX idx_reply_sessions_user_created ON public.reply_sessions USING btree (user_id, created_at DESC)',
      'CREATE INDEX idx_reply_ticket_wallets_status ON public.reply_ticket_wallets USING btree (status)',
      'CREATE UNIQUE INDEX reply_ticket_wallets_user_report_uidx_nonnull ON public.reply_ticket_wallets USING btree (user_id, report_instance_id) WHERE (report_instance_id IS NOT NULL)',
      'CREATE INDEX idx_reply_wallet_ledgers_consult_commit ON public.reply_wallet_ledgers USING btree (consult_commit_id) WHERE (consult_commit_id IS NOT NULL)',
      'CREATE INDEX idx_reply_wallet_ledgers_session ON public.reply_wallet_ledgers USING btree (reply_session_id) WHERE (reply_session_id IS NOT NULL)',
      'CREATE INDEX idx_reply_wallet_ledgers_user_created ON public.reply_wallet_ledgers USING btree (user_id, created_at DESC)',
      'CREATE INDEX idx_reply_wallet_ledgers_wallet_created ON public.reply_wallet_ledgers USING btree (wallet_id, created_at DESC)',
      'CREATE INDEX m55_idx_reply_wallet_ledgers_stripe_event_id_lookup ON public.reply_wallet_ledgers USING btree (stripe_event_id)',
      'CREATE UNIQUE INDEX idx_stripe_processed_events_stripe_event_id_unique_not_null ON public.stripe_processed_events USING btree (stripe_event_id) WHERE (stripe_event_id IS NOT NULL)',
      'CREATE UNIQUE INDEX m55_uidx_stripe_processed_events_stripe_event_id ON public.stripe_processed_events USING btree (stripe_event_id) WHERE ((stripe_event_id IS NOT NULL) AND (length(btrim(stripe_event_id)) > 0))',
      'ALTER TABLE public."consult_threads" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."dtr_guest_drafts" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."dtr_report_snapshots" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."entitlement_rights" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."entitlements" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."failed_fulfillments" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."one_time_fulfillments" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."reply_sessions" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."reply_ticket_wallets" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."stripe_events" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."stripe_processed_events" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."consult_messages" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."reply_documents" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."consult_send_commits" ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public."reply_wallet_ledgers" ENABLE ROW LEVEL SECURITY',
      'CREATE POLICY "Enable read access for all users" ON public."entitlements" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true)',
      'REVOKE ALL ON TABLE public."consult_threads" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_threads" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_threads" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_threads" TO "service_role"',
      'REVOKE ALL ON TABLE public."dtr_guest_drafts" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_guest_drafts" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_guest_drafts" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_guest_drafts" TO "service_role"',
      'REVOKE ALL ON TABLE public."dtr_report_snapshots" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_report_snapshots" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_report_snapshots" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_report_snapshots" TO "service_role"',
      'REVOKE ALL ON TABLE public."entitlement_rights" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlement_rights" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlement_rights" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlement_rights" TO "service_role"',
      'REVOKE ALL ON TABLE public."entitlements" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlements" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlements" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlements" TO "service_role"',
      'REVOKE ALL ON TABLE public."failed_fulfillments" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."failed_fulfillments" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."failed_fulfillments" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."failed_fulfillments" TO "service_role"',
      'REVOKE ALL ON TABLE public."one_time_fulfillments" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."one_time_fulfillments" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."one_time_fulfillments" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."one_time_fulfillments" TO "service_role"',
      'REVOKE ALL ON TABLE public."reply_sessions" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_sessions" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_sessions" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_sessions" TO "service_role"',
      'REVOKE ALL ON TABLE public."reply_ticket_wallets" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_ticket_wallets" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_ticket_wallets" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_ticket_wallets" TO "service_role"',
      'REVOKE ALL ON TABLE public."stripe_events" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_events" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_events" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_events" TO "service_role"',
      'REVOKE ALL ON TABLE public."stripe_processed_events" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_processed_events" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_processed_events" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_processed_events" TO "service_role"',
      'REVOKE ALL ON TABLE public."consult_messages" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_messages" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_messages" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_messages" TO "service_role"',
      'REVOKE ALL ON TABLE public."reply_documents" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_documents" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_documents" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_documents" TO "service_role"',
      'REVOKE ALL ON TABLE public."consult_send_commits" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_send_commits" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_send_commits" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_send_commits" TO "service_role"',
      'REVOKE ALL ON TABLE public."reply_wallet_ledgers" FROM PUBLIC',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_wallet_ledgers" TO "anon"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_wallet_ledgers" TO "authenticated"',
      'GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_wallet_ledgers" TO "service_role"',
      'CREATE OR REPLACE FUNCTION public.m55_consult_reply_commit(p_user_id text, p_report_instance_id uuid, p_consult_thread_id uuid, p_idempotency_key text, p_user_message text, p_assistant_message text, p_message_created_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
DECLARE
  v_fingerprint text;
  v_commit_id uuid;
  v_commit_status text;
  v_commit_fingerprint text;
  v_commit_user_msg_id uuid;
  v_commit_asst_msg_id uuid;
  v_thread_user text;
  v_wallet_id uuid;
  v_wallet_status text;
  v_wallet_report_instance_id uuid;
  v_avail_before int;
  v_avail_after int;
  v_consumed_before int;
  v_initial int;
  v_purchased int;
  v_user_msg_id uuid;
  v_asst_msg_id uuid;
  v_thread_credits_total int;
  v_thread_credits_remaining int;
  v_thread_state text;
  v_assistant_content text;
  v_cap constant int := 5;
BEGIN
  IF p_user_id IS NULL OR length(btrim(p_user_id)) = 0 THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''INVALID_ARGUMENT'',
      ''message'', ''user_id required''
    );
  END IF;

  IF p_report_instance_id IS NULL THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''INVALID_ARGUMENT'',
      ''message'', ''report_instance_id required''
    );
  END IF;

  IF p_consult_thread_id IS NULL THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''INVALID_ARGUMENT'',
      ''message'', ''consult_thread_id required''
    );
  END IF;

  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 OR length(btrim(p_idempotency_key)) > 128 THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''INVALID_ARGUMENT'',
      ''message'', ''idempotency_key length must be 8-128''
    );
  END IF;

  IF p_user_message IS NULL OR length(btrim(p_user_message)) < 10 OR length(p_user_message) > 500 THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''INVALID_ARGUMENT'',
      ''message'', ''user_message length must be 10-500''
    );
  END IF;

  IF p_assistant_message IS NULL OR length(btrim(p_assistant_message)) < 1 OR length(p_assistant_message) > 1000 THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''INVALID_ARGUMENT'',
      ''message'', ''assistant_message length must be 1-1000''
    );
  END IF;

  v_fingerprint := md5(concat_ws(''|'', p_user_message, p_assistant_message));

  SELECT id, status, payload_fingerprint, user_message_id, assistant_message_id, wallet_after
  INTO v_commit_id, v_commit_status, v_commit_fingerprint, v_commit_user_msg_id, v_commit_asst_msg_id, v_avail_after
  FROM consult_send_commits
  WHERE user_id = p_user_id
    AND report_instance_id = p_report_instance_id
    AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_commit_status = ''succeeded'' THEN
      IF v_commit_fingerprint IS DISTINCT FROM v_fingerprint THEN
        RETURN jsonb_build_object(
          ''ok'', false,
          ''error_code'', ''IDEMPOTENCY_CONFLICT'',
          ''message'', ''idempotency key reused with different payload''
        );
      END IF;

      IF v_commit_asst_msg_id IS NOT NULL THEN
        SELECT content INTO v_assistant_content
        FROM consult_messages
        WHERE id = v_commit_asst_msg_id;
      END IF;

      SELECT credits_total, credits_remaining, state
      INTO v_thread_credits_total, v_thread_credits_remaining, v_thread_state
      FROM consult_threads
      WHERE id = p_consult_thread_id;

      RETURN jsonb_build_object(
        ''ok'', true,
        ''mode'', ''replay'',
        ''consumption_applied'', false,
        ''wallet_before'', COALESCE(v_avail_after, 0),
        ''wallet_after'', COALESCE(v_avail_after, 0),
        ''thread_state'', COALESCE(v_thread_state, ''read_only''),
        ''thread_credits_remaining'', COALESCE(v_thread_credits_remaining, 0),
        ''thread_credits_total'', COALESCE(v_thread_credits_total, 0),
        ''assistant_content'', COALESCE(v_assistant_content, p_assistant_message)
      );
    END IF;

    IF v_commit_status = ''pending'' THEN
      RETURN jsonb_build_object(
        ''ok'', false,
        ''error_code'', ''COMMIT_IN_PROGRESS'',
        ''message'', ''commit already in progress for this idempotency key''
      );
    END IF;
  ELSE
    INSERT INTO consult_send_commits (
      user_id,
      report_instance_id,
      idempotency_key,
      payload_fingerprint,
      consult_thread_id,
      status
    )
    VALUES (
      p_user_id,
      p_report_instance_id,
      p_idempotency_key,
      v_fingerprint,
      p_consult_thread_id,
      ''pending''
    )
    RETURNING id INTO v_commit_id;
  END IF;

  SELECT user_id
  INTO v_thread_user
  FROM consult_threads
  WHERE id = p_consult_thread_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE consult_send_commits
    SET status = ''failed'', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''THREAD_NOT_FOUND'',
      ''message'', ''consult thread not found''
    );
  END IF;

  IF v_thread_user IS DISTINCT FROM p_user_id THEN
    UPDATE consult_send_commits
    SET status = ''failed'', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''THREAD_USER_MISMATCH'',
      ''message'', ''consult thread user mismatch''
    );
  END IF;

  SELECT
    id,
    status,
    report_instance_id,
    available_count,
    consumed_count,
    initial_included_count,
    purchased_count
  INTO
    v_wallet_id,
    v_wallet_status,
    v_wallet_report_instance_id,
    v_avail_before,
    v_consumed_before,
    v_initial,
    v_purchased
  FROM reply_ticket_wallets
  WHERE user_id = p_user_id
    AND report_instance_id = p_report_instance_id
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE consult_send_commits
    SET status = ''failed'', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''WALLET_NOT_FOUND'',
      ''message'', ''scoped wallet not found''
    );
  END IF;

  IF v_wallet_report_instance_id IS NULL THEN
    UPDATE consult_send_commits
    SET status = ''failed'', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''FORBIDDEN_NULL_SCOPE'',
      ''message'', ''null-scope wallet forbidden''
    );
  END IF;

  IF v_wallet_status <> ''active'' THEN
    UPDATE consult_send_commits
    SET status = ''failed'', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''WALLET_NOT_ACTIVE'',
      ''message'', ''wallet not active''
    );
  END IF;

  IF v_avail_before <= 0 THEN
    UPDATE consult_send_commits
    SET status = ''failed'', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''WALLET_NO_BALANCE'',
      ''message'', ''no available balance''
    );
  END IF;

  v_avail_after := v_avail_before - 1;

  INSERT INTO consult_messages (thread_id, role, content, created_at)
  VALUES (p_consult_thread_id, ''user'', p_user_message, p_message_created_at)
  RETURNING id INTO v_user_msg_id;

  INSERT INTO consult_messages (thread_id, role, content, created_at)
  VALUES (p_consult_thread_id, ''assistant'', p_assistant_message, p_message_created_at)
  RETURNING id INTO v_asst_msg_id;

  UPDATE reply_ticket_wallets
  SET
    available_count = v_avail_after,
    consumed_count = v_consumed_before + 1,
    updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO reply_wallet_ledgers (
    user_id,
    wallet_id,
    reply_session_id,
    consult_commit_id,
    delta,
    balance_after,
    event_type,
    source_of_grant
  )
  VALUES (
    p_user_id,
    v_wallet_id,
    NULL,
    v_commit_id,
    -1,
    v_avail_after,
    ''reply_consume'',
    NULL
  );

  v_thread_credits_remaining := GREATEST(0, v_avail_after);
  v_thread_state := CASE WHEN v_thread_credits_remaining <= 0 THEN ''read_only'' ELSE ''writable'' END;
  v_thread_credits_total := LEAST(
    v_cap,
    GREATEST(
      (SELECT credits_total FROM consult_threads WHERE id = p_consult_thread_id),
      COALESCE(v_initial, 0) + COALESCE(v_purchased, 0)
    )
  );

  UPDATE consult_threads
  SET
    credits_remaining = v_thread_credits_remaining,
    credits_total = v_thread_credits_total,
    state = v_thread_state,
    updated_at = now()
  WHERE id = p_consult_thread_id;

  UPDATE consult_send_commits
  SET
    status = ''succeeded'',
    user_message_id = v_user_msg_id,
    assistant_message_id = v_asst_msg_id,
    wallet_id = v_wallet_id,
    wallet_before = v_avail_before,
    wallet_after = v_avail_after,
    updated_at = now()
  WHERE id = v_commit_id;

  RETURN jsonb_build_object(
    ''ok'', true,
    ''mode'', ''consumed'',
    ''consumption_applied'', true,
    ''wallet_before'', v_avail_before,
    ''wallet_after'', v_avail_after,
    ''thread_state'', v_thread_state,
    ''thread_credits_remaining'', v_thread_credits_remaining,
    ''thread_credits_total'', v_thread_credits_total,
    ''assistant_content'', p_assistant_message
  );
EXCEPTION
  WHEN OTHERS THEN
    IF v_commit_id IS NOT NULL THEN
      UPDATE consult_send_commits
      SET status = ''failed'', updated_at = now()
      WHERE id = v_commit_id AND status = ''pending'';
    END IF;
    RAISE;
END;
$function$',
      'COMMENT ON FUNCTION public.m55_consult_reply_commit IS
  ''Atomically commits consult send: idempotency, messages, scoped wallet decrement, reply_consume ledger with consult_commit_id, thread display sync.''',
      'ALTER FUNCTION "public"."m55_consult_reply_commit"(text, uuid, uuid, text, text, text, timestamp with time zone) OWNER TO "postgres"',
      'REVOKE ALL ON FUNCTION "public"."m55_consult_reply_commit"(text, uuid, uuid, text, text, text, timestamp with time zone) FROM PUBLIC',
      'GRANT EXECUTE ON FUNCTION "public"."m55_consult_reply_commit"(text, uuid, uuid, text, text, text, timestamp with time zone) TO "anon"',
      'GRANT EXECUTE ON FUNCTION "public"."m55_consult_reply_commit"(text, uuid, uuid, text, text, text, timestamp with time zone) TO "authenticated"',
      'GRANT EXECUTE ON FUNCTION "public"."m55_consult_reply_commit"(text, uuid, uuid, text, text, text, timestamp with time zone) TO "service_role"',
      'CREATE OR REPLACE FUNCTION public.m55_reply_generate_commit(p_user_id text, p_reply_session_id uuid, p_payload_json jsonb, p_theme text, p_generator_version text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $function$
DECLARE
  v_wallet_id uuid;
  v_avail_before int;
  v_avail_after int;
  v_wstatus text;
  v_sess_user text;
  v_sess_status text;
  v_sess_theme text;
  v_doc_id uuid;
BEGIN
  IF p_user_id IS NULL OR length(trim(p_user_id)) = 0 THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''INVALID_ARGUMENT'',
      ''message'', ''user_id required''
    );
  END IF;

  IF p_reply_session_id IS NULL THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''INVALID_ARGUMENT'',
      ''message'', ''reply_session_id required''
    );
  END IF;

  IF p_theme IS NULL OR length(trim(p_theme)) = 0 THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''INVALID_ARGUMENT'',
      ''message'', ''theme required''
    );
  END IF;

  IF p_payload_json IS NULL OR jsonb_typeof(p_payload_json) <> ''object'' THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''INVALID_ARGUMENT'',
      ''message'', ''payload_json must be object''
    );
  END IF;

  IF (p_payload_json->>''theme'') IS DISTINCT FROM p_theme THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''PAYLOAD_THEME_MISMATCH'',
      ''message'', ''payload_json.theme must match p_theme''
    );
  END IF;

  SELECT user_id, status, theme
  INTO v_sess_user, v_sess_status, v_sess_theme
  FROM reply_sessions
  WHERE id = p_reply_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''SESSION_NOT_FOUND'',
      ''message'', ''Session not found''
    );
  END IF;

  IF v_sess_user IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''SESSION_USER_MISMATCH'',
      ''message'', ''Session user mismatch''
    );
  END IF;

  IF v_sess_theme IS DISTINCT FROM p_theme THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''THEME_MISMATCH'',
      ''message'', ''theme does not match session''
    );
  END IF;

  SELECT id INTO v_doc_id
  FROM reply_documents
  WHERE reply_session_id = p_reply_session_id;

  IF FOUND THEN
    SELECT id, available_count, status
    INTO v_wallet_id, v_avail_before, v_wstatus
    FROM reply_ticket_wallets
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        ''ok'', true,
        ''mode'', ''replay'',
        ''reply_document_id'', v_doc_id,
        ''wallet_before'', 0,
        ''wallet_after'', 0,
        ''consumption_applied'', false
      );
    END IF;

    RETURN jsonb_build_object(
      ''ok'', true,
      ''mode'', ''replay'',
      ''reply_document_id'', v_doc_id,
      ''wallet_before'', v_avail_before,
      ''wallet_after'', v_avail_before,
      ''consumption_applied'', false
    );
  END IF;

  SELECT id, available_count, status
  INTO v_wallet_id, v_avail_before, v_wstatus
  FROM reply_ticket_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''FORBIDDEN'',
      ''message'', ''Wallet not found''
    );
  END IF;

  IF v_wstatus <> ''active'' THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''FORBIDDEN'',
      ''message'', ''Wallet not active''
    );
  END IF;

  IF v_avail_before <= 0 THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''FORBIDDEN'',
      ''message'', ''No available replies''
    );
  END IF;

  IF v_sess_status NOT IN (''accepted'', ''generating'', ''failed'') THEN
    IF v_sess_status = ''cancelled'' THEN
      RETURN jsonb_build_object(
        ''ok'', false,
        ''error_code'', ''FORBIDDEN'',
        ''message'', ''Session cancelled''
      );
    END IF;
    RETURN jsonb_build_object(
      ''ok'', false,
      ''error_code'', ''SESSION_NOT_CONSUMABLE'',
      ''message'', ''Session status does not allow consume''
    );
  END IF;

  v_avail_after := v_avail_before - 1;

  INSERT INTO reply_documents (
    reply_session_id,
    user_id,
    theme,
    payload_json,
    version,
    generator_version
  )
  VALUES (
    p_reply_session_id,
    p_user_id,
    p_theme,
    p_payload_json,
    ''1.1'',
    p_generator_version
  )
  ON CONFLICT (reply_session_id) DO NOTHING
  RETURNING id INTO v_doc_id;

  IF v_doc_id IS NULL THEN
    SELECT id INTO v_doc_id
    FROM reply_documents
    WHERE reply_session_id = p_reply_session_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        ''ok'', false,
        ''error_code'', ''INTERNAL_RACE'',
        ''message'', ''Document insert race failed''
      );
    END IF;

    SELECT available_count INTO v_avail_before
    FROM reply_ticket_wallets
    WHERE id = v_wallet_id;

    RETURN jsonb_build_object(
      ''ok'', true,
      ''mode'', ''replay'',
      ''reply_document_id'', v_doc_id,
      ''wallet_before'', v_avail_before,
      ''wallet_after'', v_avail_before,
      ''consumption_applied'', false
    );
  END IF;

  UPDATE reply_ticket_wallets
  SET
    consumed_count = consumed_count + 1,
    available_count = available_count - 1,
    updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO reply_wallet_ledgers (
    user_id,
    wallet_id,
    reply_session_id,
    delta,
    balance_after,
    event_type,
    source_of_grant
  )
  VALUES (
    p_user_id,
    v_wallet_id,
    p_reply_session_id,
    -1,
    v_avail_after,
    ''reply_consume'',
    NULL
  );

  UPDATE reply_sessions
  SET
    status = ''succeeded'',
    updated_at = now()
  WHERE id = p_reply_session_id;

  RETURN jsonb_build_object(
    ''ok'', true,
    ''mode'', ''consumed'',
    ''reply_document_id'', v_doc_id,
    ''wallet_before'', v_avail_before,
    ''wallet_after'', v_avail_after,
    ''consumption_applied'', true
  );
END;
$function$',
      'COMMENT ON FUNCTION public.m55_reply_generate_commit IS
  ''Atomically persists reply document, decrements wallet, records reply_consume ledger, completes session; replay when document already exists (no double consume).''',
      'ALTER FUNCTION "public"."m55_reply_generate_commit"(text, uuid, jsonb, text, text) OWNER TO "postgres"',
      'REVOKE ALL ON FUNCTION "public"."m55_reply_generate_commit"(text, uuid, jsonb, text, text) FROM PUBLIC',
      'GRANT EXECUTE ON FUNCTION "public"."m55_reply_generate_commit"(text, uuid, jsonb, text, text) TO "anon"',
      'GRANT EXECUTE ON FUNCTION "public"."m55_reply_generate_commit"(text, uuid, jsonb, text, text) TO "authenticated"',
      'GRANT EXECUTE ON FUNCTION "public"."m55_reply_generate_commit"(text, uuid, jsonb, text, text) TO "service_role"',
      'ALTER TABLE public."consult_threads" OWNER TO "postgres"',
      'ALTER TABLE public."dtr_guest_drafts" OWNER TO "postgres"',
      'ALTER TABLE public."dtr_report_snapshots" OWNER TO "postgres"',
      'ALTER TABLE public."entitlement_rights" OWNER TO "postgres"',
      'ALTER TABLE public."entitlements" OWNER TO "postgres"',
      'ALTER TABLE public."failed_fulfillments" OWNER TO "postgres"',
      'ALTER TABLE public."one_time_fulfillments" OWNER TO "postgres"',
      'ALTER TABLE public."reply_sessions" OWNER TO "postgres"',
      'ALTER TABLE public."reply_ticket_wallets" OWNER TO "postgres"',
      'ALTER TABLE public."stripe_events" OWNER TO "postgres"',
      'ALTER TABLE public."stripe_processed_events" OWNER TO "postgres"',
      'ALTER TABLE public."consult_messages" OWNER TO "postgres"',
      'ALTER TABLE public."reply_documents" OWNER TO "postgres"',
      'ALTER TABLE public."consult_send_commits" OWNER TO "postgres"',
      'ALTER TABLE public."reply_wallet_ledgers" OWNER TO "postgres"'
    ]::text[],
  'preview_production_aligned_baseline_p1'
);

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20260615000001',
  ARRAY[
      '-- M55 failed_fulfillments user_ref_hash identifiability (2026-06-07)
-- Account deletion lookup lane. No backfill. Existing rows remain NULL.

ALTER TABLE public.failed_fulfillments
  ADD COLUMN IF NOT EXISTS user_ref_hash text NULL',
      'ALTER TABLE public.failed_fulfillments
  ADD CONSTRAINT failed_fulfillments_user_ref_hash_format_check
  CHECK (
    user_ref_hash IS NULL
    OR user_ref_hash ~ ''^[0-9a-f]{16}$''
  )',
      'CREATE INDEX IF NOT EXISTS idx_failed_fulfillments_user_ref_hash
  ON public.failed_fulfillments (user_ref_hash)
  WHERE user_ref_hash IS NOT NULL',
      'REVOKE SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.failed_fulfillments
  FROM anon, authenticated'
    ]::text[],
  'failed_fulfillments_user_ref_hash'
);

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20260615000002',
  ARRAY[
      '-- M55 Account Deletion — clerk webhook ledger (2026-06-08)
-- LOCAL only until Human apply gate. No raw Clerk ID or event body storage.

CREATE TABLE public.clerk_webhook_events (
  svix_id text PRIMARY KEY,
  event_type text NOT NULL,
  deletion_subject_id text NULL,
  status text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  error_code text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NULL,
  CONSTRAINT clerk_webhook_events_status_check
    CHECK (status IN (''pending'', ''processing'', ''succeeded'', ''failed'')),
  CONSTRAINT clerk_webhook_events_deletion_subject_id_check
    CHECK (
      deletion_subject_id IS NULL
      OR deletion_subject_id ~ ''^m55-del:[0-9a-f]{32}$''
    ),
  CONSTRAINT clerk_webhook_events_attempt_count_check
    CHECK (attempt_count >= 0),
  CONSTRAINT clerk_webhook_events_error_code_check
    CHECK (
      error_code IS NULL
      OR error_code IN (
        ''INVALID_PROCESSING_STATE'',
        ''CLEANUP_FAILED'',
        ''VERIFICATION_FAILED''
      )
    )
)',
      'ALTER TABLE public.clerk_webhook_events ENABLE ROW LEVEL SECURITY',
      'REVOKE ALL ON TABLE public.clerk_webhook_events FROM PUBLIC',
      'REVOKE ALL ON TABLE public.clerk_webhook_events FROM anon',
      'REVOKE ALL ON TABLE public.clerk_webhook_events FROM authenticated, service_role',
      'GRANT SELECT, INSERT, UPDATE ON TABLE public.clerk_webhook_events TO service_role',
      'COMMENT ON TABLE public.clerk_webhook_events IS
  ''Account deletion webhook ledger. Pseudonymous deletion_subject_id only; no raw Clerk ID storage.'''
    ]::text[],
  'm55_account_deletion_ledger_v1'
);

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20260615000003',
  ARRAY[
      '-- M55 Account Deletion — process RPC v1 (2026-06-08)
-- LOCAL only until Human apply gate. SECURITY DEFINER; service_role EXECUTE only.

CREATE OR REPLACE FUNCTION public.m55_account_deletion_process_v1(
  p_svix_id text,
  p_event_type text,
  p_clerk_user_id text,
  p_user_ref_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_svix_id text;
  v_clerk_user_id text;
  v_deletion_subject_id text;
  v_ledger_status text;
  v_ledger_attempt_count integer;
  v_error_code text;
  v_claim_continue boolean := false;
  target_consult_thread_ids uuid[];
  target_reply_session_ids uuid[];
  target_reply_wallet_ids uuid[];
  target_consult_commit_ids uuid[];
  target_checkout_session_ids text[];
  target_failed_fulfillment_ids uuid[];
  target_entitlements_count integer;
  target_otf_count integer;
  v_otf_before jsonb;
  v_otf_after jsonb;
  v_count integer;
BEGIN
  v_svix_id := btrim(p_svix_id);
  v_clerk_user_id := btrim(p_clerk_user_id);

  -- ── input validation (before lock, before ledger) ─────────────────────────
  IF p_svix_id IS NULL
    OR v_svix_id = ''''
    OR length(v_svix_id) > 128
    OR p_svix_id IS DISTINCT FROM v_svix_id
  THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''status'', ''failed'',
      ''error_code'', ''INVALID_INPUT'',
      ''svix_id'', v_svix_id
    );
  END IF;

  IF p_event_type IS DISTINCT FROM ''user.deleted'' THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''status'', ''failed'',
      ''error_code'', ''INVALID_EVENT_TYPE'',
      ''svix_id'', v_svix_id
    );
  END IF;

  IF p_clerk_user_id IS NULL
    OR v_clerk_user_id = ''''
    OR length(v_clerk_user_id) > 128
    OR p_clerk_user_id IS DISTINCT FROM v_clerk_user_id
  THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''status'', ''failed'',
      ''error_code'', ''INVALID_INPUT'',
      ''svix_id'', v_svix_id
    );
  END IF;

  IF p_user_ref_hash IS NULL
    OR p_user_ref_hash !~ ''^[0-9a-f]{16}$''
  THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''status'', ''failed'',
      ''error_code'', ''INVALID_INPUT'',
      ''svix_id'', v_svix_id
    );
  END IF;

  -- ── advisory lock ─────────────────────────────────────────────────────────
  PERFORM pg_advisory_xact_lock(
    hashtextextended(''m55_acct_del:'' || v_clerk_user_id, 0)
  );

  -- ── ledger claim ──────────────────────────────────────────────────────────
  BEGIN
    v_deletion_subject_id :=
      ''m55-del:'' || replace(gen_random_uuid()::text, ''-'', '''');

    INSERT INTO public.clerk_webhook_events (
      svix_id,
      event_type,
      deletion_subject_id,
      status,
      attempt_count,
      error_code,
      completed_at
    )
    VALUES (
      v_svix_id,
      p_event_type,
      v_deletion_subject_id,
      ''processing'',
      1,
      NULL,
      NULL
    )
    ON CONFLICT (svix_id) DO NOTHING;

    IF FOUND THEN
      v_claim_continue := true;
    ELSE
      SELECT
        cwe.status,
        cwe.attempt_count,
        cwe.deletion_subject_id
      INTO
        v_ledger_status,
        v_ledger_attempt_count,
        v_deletion_subject_id
      FROM public.clerk_webhook_events AS cwe
      WHERE cwe.svix_id = v_svix_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          ''ok'', false,
          ''status'', ''failed'',
          ''error_code'', ''LEDGER_CLAIM_FAILED'',
          ''svix_id'', v_svix_id
        );
      END IF;

      IF v_ledger_status = ''succeeded'' THEN
        RETURN jsonb_build_object(
          ''ok'', true,
          ''status'', ''succeeded'',
          ''svix_id'', v_svix_id
        );
      ELSIF v_ledger_status = ''processing'' THEN
        UPDATE public.clerk_webhook_events AS cwe
        SET
          error_code = ''INVALID_PROCESSING_STATE'',
          updated_at = now()
        WHERE cwe.svix_id = v_svix_id;

        RETURN jsonb_build_object(
          ''ok'', false,
          ''status'', ''failed'',
          ''error_code'', ''INVALID_PROCESSING_STATE'',
          ''svix_id'', v_svix_id
        );
      ELSIF v_ledger_status = ''pending'' THEN
        UPDATE public.clerk_webhook_events AS cwe
        SET
          error_code = ''INVALID_PROCESSING_STATE'',
          updated_at = now()
        WHERE cwe.svix_id = v_svix_id;

        RETURN jsonb_build_object(
          ''ok'', false,
          ''status'', ''failed'',
          ''error_code'', ''INVALID_PROCESSING_STATE'',
          ''svix_id'', v_svix_id
        );
      ELSIF v_ledger_status = ''failed'' THEN
        UPDATE public.clerk_webhook_events AS cwe
        SET
          attempt_count = cwe.attempt_count + 1,
          status = ''processing'',
          error_code = NULL,
          updated_at = now(),
          completed_at = NULL
        WHERE cwe.svix_id = v_svix_id
        RETURNING cwe.deletion_subject_id INTO v_deletion_subject_id;

        v_claim_continue := true;
      ELSE
        RETURN jsonb_build_object(
          ''ok'', false,
          ''status'', ''failed'',
          ''error_code'', ''LEDGER_CLAIM_FAILED'',
          ''svix_id'', v_svix_id
        );
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        ''ok'', false,
        ''status'', ''failed'',
        ''error_code'', ''LEDGER_CLAIM_FAILED'',
        ''svix_id'', v_svix_id
      );
  END;

  IF NOT v_claim_continue OR v_deletion_subject_id IS NULL THEN
    RETURN jsonb_build_object(
      ''ok'', false,
      ''status'', ''failed'',
      ''error_code'', ''LEDGER_CLAIM_FAILED'',
      ''svix_id'', v_svix_id
    );
  END IF;

  -- ── cleanup block (subtransaction) ────────────────────────────────────────
  BEGIN
    -- capture (typed empty arrays; no NULL arrays)
    SELECT COALESCE(array_agg(ct.id), ARRAY[]::uuid[])
    INTO target_consult_thread_ids
    FROM public.consult_threads AS ct
    WHERE ct.user_id = v_clerk_user_id;

    SELECT COALESCE(array_agg(rs.id), ARRAY[]::uuid[])
    INTO target_reply_session_ids
    FROM public.reply_sessions AS rs
    WHERE rs.user_id = v_clerk_user_id;

    SELECT COALESCE(array_agg(rtw.id), ARRAY[]::uuid[])
    INTO target_reply_wallet_ids
    FROM public.reply_ticket_wallets AS rtw
    WHERE rtw.user_id = v_clerk_user_id;

    SELECT COALESCE(array_agg(csc.id), ARRAY[]::uuid[])
    INTO target_consult_commit_ids
    FROM public.consult_send_commits AS csc
    WHERE csc.user_id = v_clerk_user_id;

    SELECT COALESCE(array_agg(otf.checkout_session_id), ARRAY[]::text[])
    INTO target_checkout_session_ids
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_clerk_user_id;

    SELECT COALESCE(array_agg(ff.id), ARRAY[]::uuid[])
    INTO target_failed_fulfillment_ids
    FROM public.failed_fulfillments AS ff
    WHERE ff.checkout_session_id = ANY(target_checkout_session_ids)
       OR ff.user_ref_hash = p_user_ref_hash;

    SELECT COUNT(*)::integer
    INTO target_entitlements_count
    FROM public.entitlements AS e
    WHERE e.user_id = v_clerk_user_id;

    SELECT COUNT(*)::integer
    INTO target_otf_count
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_clerk_user_id;

    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          ''checkout_session_id'', otf.checkout_session_id,
          ''payment_intent_id'', otf.payment_intent_id,
          ''event_id'', otf.event_id,
          ''product_id'', otf.product_id,
          ''fulfilled_at'', otf.fulfilled_at
        )
        ORDER BY otf.checkout_session_id
      ),
      ''[]''::jsonb
    )
    INTO v_otf_before
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_clerk_user_id;

    -- direct DELETE (fixed order)
    DELETE FROM public.consult_send_commits AS csc
    WHERE csc.user_id = v_clerk_user_id;

    DELETE FROM public.reply_wallet_ledgers AS rwl
    WHERE rwl.user_id = v_clerk_user_id
       OR rwl.wallet_id = ANY(target_reply_wallet_ids)
       OR rwl.reply_session_id = ANY(target_reply_session_ids)
       OR rwl.consult_commit_id = ANY(target_consult_commit_ids);

    DELETE FROM public.reply_documents AS rd
    WHERE rd.user_id = v_clerk_user_id
       OR rd.reply_session_id = ANY(target_reply_session_ids);

    DELETE FROM public.reply_sessions AS rs
    WHERE rs.user_id = v_clerk_user_id;

    DELETE FROM public.reply_ticket_wallets AS rtw
    WHERE rtw.user_id = v_clerk_user_id;

    DELETE FROM public.consult_threads AS ct
    WHERE ct.user_id = v_clerk_user_id;

    DELETE FROM public.dtr_guest_drafts AS dgd
    WHERE dgd.user_id = v_clerk_user_id;

    DELETE FROM public.dtr_report_snapshots AS drs
    WHERE drs.user_id = v_clerk_user_id;

    DELETE FROM public.entitlement_rights AS er
    WHERE er.user_id = v_clerk_user_id;

    -- pseudonymize
    UPDATE public.entitlements AS e
    SET user_id = v_deletion_subject_id
    WHERE e.user_id = v_clerk_user_id;

    UPDATE public.one_time_fulfillments AS otf
    SET user_id = v_deletion_subject_id
    WHERE otf.user_id = v_clerk_user_id;

    -- failed_fulfillments scrub (captured IDs only)
    UPDATE public.failed_fulfillments AS ff
    SET
      raw_metadata = NULL,
      user_ref_hash = NULL
    WHERE ff.id = ANY(target_failed_fulfillment_ids);

    -- targeted verification
    SELECT COUNT(*)::integer INTO v_count
    FROM public.consult_send_commits AS csc
    WHERE csc.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.reply_wallet_ledgers AS rwl
    WHERE rwl.user_id = v_clerk_user_id
       OR rwl.wallet_id = ANY(target_reply_wallet_ids)
       OR rwl.reply_session_id = ANY(target_reply_session_ids)
       OR rwl.consult_commit_id = ANY(target_consult_commit_ids);
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.reply_documents AS rd
    WHERE rd.user_id = v_clerk_user_id
       OR rd.reply_session_id = ANY(target_reply_session_ids);
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.reply_sessions AS rs
    WHERE rs.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.reply_ticket_wallets AS rtw
    WHERE rtw.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.consult_threads AS ct
    WHERE ct.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.consult_messages AS cm
    WHERE cm.thread_id = ANY(target_consult_thread_ids);
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.dtr_guest_drafts AS dgd
    WHERE dgd.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.dtr_report_snapshots AS drs
    WHERE drs.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.entitlement_rights AS er
    WHERE er.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.entitlements AS e
    WHERE e.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.entitlements AS e
    WHERE e.user_id = v_deletion_subject_id;
    IF v_count IS DISTINCT FROM target_entitlements_count THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_clerk_user_id;
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_deletion_subject_id
      AND otf.checkout_session_id = ANY(target_checkout_session_ids);
    IF v_count IS DISTINCT FROM target_otf_count THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          ''checkout_session_id'', otf.checkout_session_id,
          ''payment_intent_id'', otf.payment_intent_id,
          ''event_id'', otf.event_id,
          ''product_id'', otf.product_id,
          ''fulfilled_at'', otf.fulfilled_at
        )
        ORDER BY otf.checkout_session_id
      ),
      ''[]''::jsonb
    )
    INTO v_otf_after
    FROM public.one_time_fulfillments AS otf
    WHERE otf.user_id = v_deletion_subject_id
      AND otf.checkout_session_id = ANY(target_checkout_session_ids);

    IF v_otf_before IS DISTINCT FROM v_otf_after THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    SELECT COUNT(*)::integer INTO v_count
    FROM public.failed_fulfillments AS ff
    WHERE ff.id = ANY(target_failed_fulfillment_ids)
      AND (ff.raw_metadata IS NOT NULL OR ff.user_ref_hash IS NOT NULL);
    IF v_count > 0 THEN
      v_error_code := ''VERIFICATION_FAILED'';
      RAISE EXCEPTION ''verification_failed'';
    END IF;

    UPDATE public.clerk_webhook_events AS cwe
    SET
      status = ''succeeded'',
      error_code = NULL,
      updated_at = now(),
      completed_at = now()
    WHERE cwe.svix_id = v_svix_id;

    RETURN jsonb_build_object(
      ''ok'', true,
      ''status'', ''succeeded'',
      ''svix_id'', v_svix_id
    );
  EXCEPTION
    WHEN OTHERS THEN
      v_error_code := COALESCE(v_error_code, ''CLEANUP_FAILED'');

      UPDATE public.clerk_webhook_events AS cwe
      SET
        status = ''failed'',
        error_code = v_error_code,
        updated_at = now(),
        completed_at = NULL
      WHERE cwe.svix_id = v_svix_id;

      RETURN jsonb_build_object(
        ''ok'', false,
        ''status'', ''failed'',
        ''error_code'', v_error_code,
        ''svix_id'', v_svix_id
      );
  END;
END;
$$',
      'DO $$
BEGIN
  EXECUTE format(
    ''ALTER FUNCTION public.m55_account_deletion_process_v1(text, text, text, text) OWNER TO %I'',
    current_user
  );
END $$',
      'REVOKE ALL ON FUNCTION public.m55_account_deletion_process_v1(text, text, text, text)
  FROM PUBLIC',
      'REVOKE ALL ON FUNCTION public.m55_account_deletion_process_v1(text, text, text, text)
  FROM anon',
      'REVOKE ALL ON FUNCTION public.m55_account_deletion_process_v1(text, text, text, text)
  FROM authenticated',
      'GRANT EXECUTE ON FUNCTION public.m55_account_deletion_process_v1(text, text, text, text)
  TO service_role',
      'COMMENT ON FUNCTION public.m55_account_deletion_process_v1 IS
  ''Account deletion cleanup RPC v1. Pseudonymizes entitlements/OTF; retains stripe_events/stripe_processed_events.'''
    ]::text[],
  'm55_account_deletion_process_rpc_v1'
);

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20260615000004',
  ARRAY[
      'DO $m55$
DECLARE
  v_entitlements_oid oid;
  v_entitlements_owner oid;
  v_entitlements_relkind "char";
  v_entitlements_rls boolean;
  v_entitlements_force boolean;
  v_entitlements_columns integer;
  v_entitlements_constraints integer;
  v_entitlements_indexes integer;

  v_rights_oid oid;
  v_rights_owner oid;
  v_rights_relkind "char";
  v_rights_rls boolean;
  v_rights_force boolean;
  v_rights_columns integer;
  v_rights_constraints integer;
  v_rights_indexes integer;

  v_entitlements_policy_count integer;
  v_rights_policy_count integer;

  v_policy_name name;
  v_policy_cmd "char";
  v_policy_permissive boolean;
  v_policy_roles oid[];
  v_policy_qual text;
  v_policy_withcheck text;
  v_policy_qual_norm text;

  v_role_name text;
  v_privilege_name text;
  v_roles text[] := ARRAY[''anon'', ''authenticated''];
  v_privileges text[] := ARRAY[
    ''SELECT'', ''INSERT'', ''UPDATE'', ''DELETE'',
    ''TRUNCATE'', ''REFERENCES'', ''TRIGGER''
  ];

  v_post_oid oid;
  v_post_owner oid;
  v_post_relkind "char";
  v_post_rls boolean;
  v_post_force boolean;
  v_post_columns integer;
  v_post_constraints integer;
  v_post_indexes integer;

  v_service_role_bypass boolean;
BEGIN
  -- -------------------------------------------------------------------------
  -- A. Relations: capture pre-state and validate shape
  -- -------------------------------------------------------------------------
  SELECT
    c.oid,
    c.relowner,
    c.relkind,
    c.relrowsecurity,
    c.relforcerowsecurity
  INTO
    v_entitlements_oid,
    v_entitlements_owner,
    v_entitlements_relkind,
    v_entitlements_rls,
    v_entitlements_force
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = ''public''
    AND c.relname = ''entitlements''
    AND c.relkind = ''r'';

  IF v_entitlements_oid IS NULL THEN
    RAISE EXCEPTION ''precondition failed: public.entitlements missing or not ordinary table'';
  END IF;

  IF pg_get_userbyid(v_entitlements_owner) <> ''postgres'' THEN
    RAISE EXCEPTION ''precondition failed: public.entitlements owner is not postgres'';
  END IF;

  IF v_entitlements_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION ''precondition failed: public.entitlements RLS is not enabled'';
  END IF;

  IF v_entitlements_force IS DISTINCT FROM false THEN
    RAISE EXCEPTION ''precondition failed: public.entitlements FORCE RLS is not disabled'';
  END IF;

  SELECT
    c.oid,
    c.relowner,
    c.relkind,
    c.relrowsecurity,
    c.relforcerowsecurity
  INTO
    v_rights_oid,
    v_rights_owner,
    v_rights_relkind,
    v_rights_rls,
    v_rights_force
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = ''public''
    AND c.relname = ''entitlement_rights''
    AND c.relkind = ''r'';

  IF v_rights_oid IS NULL THEN
    RAISE EXCEPTION ''precondition failed: public.entitlement_rights missing or not ordinary table'';
  END IF;

  IF pg_get_userbyid(v_rights_owner) <> ''postgres'' THEN
    RAISE EXCEPTION ''precondition failed: public.entitlement_rights owner is not postgres'';
  END IF;

  IF v_rights_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION ''precondition failed: public.entitlement_rights RLS is not enabled'';
  END IF;

  IF v_rights_force IS DISTINCT FROM false THEN
    RAISE EXCEPTION ''precondition failed: public.entitlement_rights FORCE RLS is not disabled'';
  END IF;

  SELECT count(*)::integer
  INTO v_entitlements_columns
  FROM information_schema.columns
  WHERE table_schema = ''public''
    AND table_name = ''entitlements'';

  SELECT count(*)::integer
  INTO v_entitlements_constraints
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = ''public''
    AND rel.relname = ''entitlements'';

  SELECT count(*)::integer
  INTO v_entitlements_indexes
  FROM pg_index i
  JOIN pg_class rel ON rel.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = ''public''
    AND rel.relname = ''entitlements''
    AND i.indisvalid;

  SELECT count(*)::integer
  INTO v_rights_columns
  FROM information_schema.columns
  WHERE table_schema = ''public''
    AND table_name = ''entitlement_rights'';

  SELECT count(*)::integer
  INTO v_rights_constraints
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = ''public''
    AND rel.relname = ''entitlement_rights'';

  SELECT count(*)::integer
  INTO v_rights_indexes
  FROM pg_index i
  JOIN pg_class rel ON rel.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = ''public''
    AND rel.relname = ''entitlement_rights''
    AND i.indisvalid;

  -- -------------------------------------------------------------------------
  -- B. Roles exist
  -- -------------------------------------------------------------------------
  IF to_regrole(''anon'') IS NULL THEN
    RAISE EXCEPTION ''precondition failed: role anon missing'';
  END IF;

  IF to_regrole(''authenticated'') IS NULL THEN
    RAISE EXCEPTION ''precondition failed: role authenticated missing'';
  END IF;

  IF to_regrole(''service_role'') IS NULL THEN
    RAISE EXCEPTION ''precondition failed: role service_role missing'';
  END IF;

  -- -------------------------------------------------------------------------
  -- C. service_role BYPASSRLS and core privileges (pre)
  -- -------------------------------------------------------------------------
  SELECT rolbypassrls
  INTO v_service_role_bypass
  FROM pg_roles
  WHERE rolname = ''service_role'';

  IF v_service_role_bypass IS DISTINCT FROM true THEN
    RAISE EXCEPTION ''precondition failed: service_role.rolbypassrls is not true'';
  END IF;

  FOREACH v_privilege_name IN ARRAY ARRAY[''SELECT'', ''INSERT'', ''UPDATE'', ''DELETE'']
  LOOP
    IF NOT has_table_privilege(''service_role'', v_entitlements_oid, v_privilege_name) THEN
      RAISE EXCEPTION
        ''precondition failed: service_role missing % on public.entitlements'',
        v_privilege_name;
    END IF;

    IF NOT has_table_privilege(''service_role'', v_rights_oid, v_privilege_name) THEN
      RAISE EXCEPTION
        ''precondition failed: service_role missing % on public.entitlement_rights'',
        v_privilege_name;
    END IF;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- D. entitlements policy inventory
  -- -------------------------------------------------------------------------
  SELECT count(*)::integer
  INTO v_entitlements_policy_count
  FROM pg_policy p
  WHERE p.polrelid = v_entitlements_oid;

  IF v_entitlements_policy_count = 0 THEN
  ELSIF v_entitlements_policy_count = 1 THEN
    SELECT
      p.polname,
      p.polcmd,
      p.polpermissive,
      p.polroles,
      pg_get_expr(p.polqual, p.polrelid),
      pg_get_expr(p.polwithcheck, p.polrelid)
    INTO
      v_policy_name,
      v_policy_cmd,
      v_policy_permissive,
      v_policy_roles,
      v_policy_qual,
      v_policy_withcheck
    FROM pg_policy p
    WHERE p.polrelid = v_entitlements_oid;

    v_policy_qual_norm := regexp_replace(
      lower(COALESCE(v_policy_qual, '''')),
      ''[[:space:]()]'',
      '''',
      ''g''
    );

    IF v_policy_name IS DISTINCT FROM ''Enable read access for all users'' THEN
      RAISE EXCEPTION
        ''precondition failed: entitlements policy name mismatch: %'',
        v_policy_name;
    END IF;

    IF v_policy_cmd IS DISTINCT FROM ''r'' THEN
      RAISE EXCEPTION
        ''precondition failed: entitlements policy command mismatch: %'',
        v_policy_cmd;
    END IF;

    IF v_policy_permissive IS DISTINCT FROM true THEN
      RAISE EXCEPTION ''precondition failed: entitlements policy is not PERMISSIVE'';
    END IF;

    IF v_policy_roles IS DISTINCT FROM ARRAY[0::oid] THEN
      RAISE EXCEPTION ''precondition failed: entitlements policy roles are not PUBLIC-only'';
    END IF;

    IF v_policy_qual_norm IS DISTINCT FROM ''true'' THEN
      RAISE EXCEPTION
        ''precondition failed: entitlements policy USING mismatch: %'',
        v_policy_qual;
    END IF;

    IF v_policy_withcheck IS NOT NULL THEN
      RAISE EXCEPTION ''precondition failed: entitlements policy WITH CHECK is not NULL'';
    END IF;
  ELSE
    RAISE EXCEPTION
      ''precondition failed: unexpected entitlements policy count %'',
      v_entitlements_policy_count;
  END IF;

  -- -------------------------------------------------------------------------
  -- E. entitlement_rights policy inventory
  -- -------------------------------------------------------------------------
  SELECT count(*)::integer
  INTO v_rights_policy_count
  FROM pg_policy p
  WHERE p.polrelid = v_rights_oid;

  IF v_rights_policy_count <> 0 THEN
    RAISE EXCEPTION
      ''precondition failed: entitlement_rights policy count must be 0, found %'',
      v_rights_policy_count;
  END IF;

  -- -------------------------------------------------------------------------
  -- Mutation
  -- -------------------------------------------------------------------------
  IF v_entitlements_policy_count = 1 THEN
    EXECUTE ''DROP POLICY "Enable read access for all users" ON public.entitlements'';
  END IF;

  REVOKE ALL PRIVILEGES ON TABLE public.entitlements
    FROM PUBLIC, anon, authenticated;

  REVOKE ALL PRIVILEGES ON TABLE public.entitlement_rights
    FROM PUBLIC, anon, authenticated;

  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.entitlements TO service_role;

  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.entitlement_rights TO service_role;

  -- -------------------------------------------------------------------------
  -- Postconditions: policy count zero
  -- -------------------------------------------------------------------------
  SELECT count(*)::integer
  INTO v_entitlements_policy_count
  FROM pg_policy p
  WHERE p.polrelid = v_entitlements_oid;

  IF v_entitlements_policy_count <> 0 THEN
    RAISE EXCEPTION
      ''postcondition failed: entitlements policy count % after mutation'',
      v_entitlements_policy_count;
  END IF;

  SELECT count(*)::integer
  INTO v_rights_policy_count
  FROM pg_policy p
  WHERE p.polrelid = v_rights_oid;

  IF v_rights_policy_count <> 0 THEN
    RAISE EXCEPTION
      ''postcondition failed: entitlement_rights policy count % after mutation'',
      v_rights_policy_count;
  END IF;

  -- -------------------------------------------------------------------------
  -- Postconditions: anon/authenticated effective privileges (28 false)
  -- -------------------------------------------------------------------------
  FOREACH v_role_name IN ARRAY v_roles
  LOOP
    FOREACH v_privilege_name IN ARRAY v_privileges
    LOOP
      IF has_table_privilege(v_role_name, v_entitlements_oid, v_privilege_name) THEN
        RAISE EXCEPTION
          ''postcondition failed: % still has % on public.entitlements'',
          v_role_name,
          v_privilege_name;
      END IF;

      IF has_table_privilege(v_role_name, v_rights_oid, v_privilege_name) THEN
        RAISE EXCEPTION
          ''postcondition failed: % still has % on public.entitlement_rights'',
          v_role_name,
          v_privilege_name;
      END IF;
    END LOOP;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- Postconditions: PUBLIC explicit ACL (grantee = 0)
  -- -------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1
    FROM aclexplode(
      COALESCE(
        (SELECT c.relacl FROM pg_class c WHERE c.oid = v_entitlements_oid),
        acldefault(''r'', v_entitlements_owner)
      )
    ) acl
    WHERE acl.grantee = 0
  ) THEN
    RAISE EXCEPTION ''postcondition failed: PUBLIC ACL remains on public.entitlements'';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM aclexplode(
      COALESCE(
        (SELECT c.relacl FROM pg_class c WHERE c.oid = v_rights_oid),
        acldefault(''r'', v_rights_owner)
      )
    ) acl
    WHERE acl.grantee = 0
  ) THEN
    RAISE EXCEPTION ''postcondition failed: PUBLIC ACL remains on public.entitlement_rights'';
  END IF;

  -- -------------------------------------------------------------------------
  -- Postconditions: service_role core + BYPASSRLS
  -- -------------------------------------------------------------------------
  SELECT rolbypassrls
  INTO v_service_role_bypass
  FROM pg_roles
  WHERE rolname = ''service_role'';

  IF v_service_role_bypass IS DISTINCT FROM true THEN
    RAISE EXCEPTION ''postcondition failed: service_role.rolbypassrls is not true'';
  END IF;

  FOREACH v_privilege_name IN ARRAY ARRAY[''SELECT'', ''INSERT'', ''UPDATE'', ''DELETE'']
  LOOP
    IF NOT has_table_privilege(''service_role'', v_entitlements_oid, v_privilege_name) THEN
      RAISE EXCEPTION
        ''postcondition failed: service_role missing % on public.entitlements'',
        v_privilege_name;
    END IF;

    IF NOT has_table_privilege(''service_role'', v_rights_oid, v_privilege_name) THEN
      RAISE EXCEPTION
        ''postcondition failed: service_role missing % on public.entitlement_rights'',
        v_privilege_name;
    END IF;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- Structural invariant postconditions: entitlements
  -- -------------------------------------------------------------------------
  SELECT
    c.oid,
    c.relowner,
    c.relkind,
    c.relrowsecurity,
    c.relforcerowsecurity
  INTO
    v_post_oid,
    v_post_owner,
    v_post_relkind,
    v_post_rls,
    v_post_force
  FROM pg_class c
  WHERE c.oid = v_entitlements_oid;

  IF v_post_oid IS DISTINCT FROM v_entitlements_oid THEN
    RAISE EXCEPTION ''postcondition failed: entitlements relation OID changed'';
  END IF;

  IF v_post_owner IS DISTINCT FROM v_entitlements_owner THEN
    RAISE EXCEPTION ''postcondition failed: entitlements owner OID changed'';
  END IF;

  IF v_post_relkind IS DISTINCT FROM ''r'' THEN
    RAISE EXCEPTION ''postcondition failed: entitlements relkind changed'';
  END IF;

  IF v_post_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION ''postcondition failed: entitlements RLS changed'';
  END IF;

  IF v_post_force IS DISTINCT FROM false THEN
    RAISE EXCEPTION ''postcondition failed: entitlements FORCE RLS changed'';
  END IF;

  SELECT count(*)::integer
  INTO v_post_columns
  FROM information_schema.columns
  WHERE table_schema = ''public''
    AND table_name = ''entitlements'';

  IF v_post_columns IS DISTINCT FROM v_entitlements_columns THEN
    RAISE EXCEPTION ''postcondition failed: entitlements column count changed'';
  END IF;

  SELECT count(*)::integer
  INTO v_post_constraints
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = ''public''
    AND rel.relname = ''entitlements'';

  IF v_post_constraints IS DISTINCT FROM v_entitlements_constraints THEN
    RAISE EXCEPTION ''postcondition failed: entitlements constraint count changed'';
  END IF;

  SELECT count(*)::integer
  INTO v_post_indexes
  FROM pg_index i
  JOIN pg_class rel ON rel.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = ''public''
    AND rel.relname = ''entitlements''
    AND i.indisvalid;

  IF v_post_indexes IS DISTINCT FROM v_entitlements_indexes THEN
    RAISE EXCEPTION ''postcondition failed: entitlements index count changed'';
  END IF;

  -- -------------------------------------------------------------------------
  -- Structural invariant postconditions: entitlement_rights
  -- -------------------------------------------------------------------------
  SELECT
    c.oid,
    c.relowner,
    c.relkind,
    c.relrowsecurity,
    c.relforcerowsecurity
  INTO
    v_post_oid,
    v_post_owner,
    v_post_relkind,
    v_post_rls,
    v_post_force
  FROM pg_class c
  WHERE c.oid = v_rights_oid;

  IF v_post_oid IS DISTINCT FROM v_rights_oid THEN
    RAISE EXCEPTION ''postcondition failed: entitlement_rights relation OID changed'';
  END IF;

  IF v_post_owner IS DISTINCT FROM v_rights_owner THEN
    RAISE EXCEPTION ''postcondition failed: entitlement_rights owner OID changed'';
  END IF;

  IF v_post_relkind IS DISTINCT FROM ''r'' THEN
    RAISE EXCEPTION ''postcondition failed: entitlement_rights relkind changed'';
  END IF;

  IF v_post_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION ''postcondition failed: entitlement_rights RLS changed'';
  END IF;

  IF v_post_force IS DISTINCT FROM false THEN
    RAISE EXCEPTION ''postcondition failed: entitlement_rights FORCE RLS changed'';
  END IF;

  SELECT count(*)::integer
  INTO v_post_columns
  FROM information_schema.columns
  WHERE table_schema = ''public''
    AND table_name = ''entitlement_rights'';

  IF v_post_columns IS DISTINCT FROM v_rights_columns THEN
    RAISE EXCEPTION ''postcondition failed: entitlement_rights column count changed'';
  END IF;

  SELECT count(*)::integer
  INTO v_post_constraints
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = ''public''
    AND rel.relname = ''entitlement_rights'';

  IF v_post_constraints IS DISTINCT FROM v_rights_constraints THEN
    RAISE EXCEPTION ''postcondition failed: entitlement_rights constraint count changed'';
  END IF;

  SELECT count(*)::integer
  INTO v_post_indexes
  FROM pg_index i
  JOIN pg_class rel ON rel.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = ''public''
    AND rel.relname = ''entitlement_rights''
    AND i.indisvalid;

  IF v_post_indexes IS DISTINCT FROM v_rights_indexes THEN
    RAISE EXCEPTION ''postcondition failed: entitlement_rights index count changed'';
  END IF;
END
$m55$'
    ]::text[],
  'm55_entitlements_and_rights_access_security_v1'
);

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20260615000005',
  ARRAY[
      'DO $m55$
DECLARE
  v_relation_oid oid;
  v_owner_oid oid;
  v_column_count integer;
  v_constraint_count integer;
  v_index_count integer;

  v_pre_state text;
  v_constraint_delta integer;
  v_index_delta integer;

  v_global_con_oid oid;
  v_global_con_ind_oid oid;
  v_global_con_validated boolean;

  v_partial_index_oid oid;
  v_partial_index_valid boolean;
  v_partial_index_ready boolean;
  v_partial_index_live boolean;
  v_partial_predicate_norm text;

  v_pre_same_key_index_names text[];
  v_post_same_key_index_names text[];
  v_fk_target_count integer;

  v_unrelated_constraint_names text[];
  v_unrelated_index_names text[];

  v_post_relation_oid oid;
  v_post_owner_oid oid;
  v_post_column_count integer;
  v_post_constraint_count integer;
  v_post_index_count integer;
  v_post_unrelated_constraint_names text[];
  v_post_unrelated_index_names text[];
BEGIN
  -- -------------------------------------------------------------------------
  -- A. Relation shape
  -- -------------------------------------------------------------------------
  SELECT c.oid, c.relowner
  INTO v_relation_oid, v_owner_oid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = ''public''
    AND c.relname = ''dtr_report_snapshots''
    AND c.relkind = ''r'';

  IF v_relation_oid IS NULL THEN
    RAISE EXCEPTION ''precondition failed: public.dtr_report_snapshots missing or not ordinary table'';
  END IF;

  IF pg_get_userbyid(v_owner_oid) <> ''postgres'' THEN
    RAISE EXCEPTION ''precondition failed: public.dtr_report_snapshots owner is not postgres'';
  END IF;

  SELECT count(*)::integer
  INTO v_column_count
  FROM information_schema.columns
  WHERE table_schema = ''public''
    AND table_name = ''dtr_report_snapshots'';

  SELECT count(*)::integer
  INTO v_constraint_count
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  SELECT count(*)::integer
  INTO v_index_count
  FROM pg_index i
  WHERE i.indrelid = v_relation_oid
    AND i.indisvalid;

  -- -------------------------------------------------------------------------
  -- B. Expected partial UNIQUE index (full shape; common to both states)
  -- -------------------------------------------------------------------------
  SELECT ic.oid, i.indisvalid, i.indisready, i.indislive
  INTO v_partial_index_oid, v_partial_index_valid, v_partial_index_ready, v_partial_index_live
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  JOIN pg_namespace n ON n.oid = ic.relnamespace
  JOIN pg_am am ON am.oid = ic.relam
  WHERE n.nspname = ''public''
    AND ic.relname = ''dtr_report_snapshots_one_visible_per_user_product_uq''
    AND i.indrelid = v_relation_oid
    AND ic.relkind = ''i''
    AND am.amname = ''btree''
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indnatts = 2
    AND i.indnkeyatts = 2
    AND i.indpred IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint c2
      WHERE c2.conindid = ic.oid
        AND c2.contype IN (''u'', ''p'')
    );

  IF v_partial_index_oid IS NULL THEN
    RAISE EXCEPTION ''precondition failed: partial unique index dtr_report_snapshots_one_visible_per_user_product_uq missing'';
  END IF;

  SELECT regexp_replace(
    lower(btrim(btrim(pg_get_expr(i.indpred, i.indrelid), ''(''), '')'')),
    ''[[:space:]]'', '''', ''g''
  )
  INTO v_partial_predicate_norm
  FROM pg_index i
  WHERE i.indexrelid = v_partial_index_oid;

  IF v_partial_predicate_norm IS DISTINCT FROM ''user_hidden_atisnull'' THEN
    RAISE EXCEPTION ''precondition failed: partial unique predicate is not user_hidden_at IS NULL'';
  END IF;

  IF (
    SELECT array_agg(a.attname::text ORDER BY k.ord)
    FROM pg_index i
    JOIN unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
    WHERE i.indexrelid = v_partial_index_oid
      AND k.attnum > 0
  ) IS DISTINCT FROM ARRAY[''user_id'', ''product_id'']::text[] THEN
    RAISE EXCEPTION ''precondition failed: partial unique key columns are not (user_id, product_id)'';
  END IF;

  IF (SELECT count(*)::integer FROM unnest((SELECT indkey FROM pg_index WHERE indexrelid = v_partial_index_oid)) AS x(attnum) WHERE x.attnum = 0) <> 0 THEN
    RAISE EXCEPTION ''precondition failed: partial unique expression key count is not 0'';
  END IF;

  IF v_partial_index_valid IS DISTINCT FROM true
     OR v_partial_index_ready IS DISTINCT FROM true
     OR v_partial_index_live IS DISTINCT FROM true THEN
    RAISE EXCEPTION ''precondition failed: partial unique index is not valid/ready/live'';
  END IF;

  -- -------------------------------------------------------------------------
  -- C. Exact same-key index name set and state classification
  -- -------------------------------------------------------------------------
  SELECT coalesce(array_agg(ic.relname::text ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_pre_same_key_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.relkind = ''i''
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indnkeyatts = 2
    AND (
      SELECT count(*)::integer
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      WHERE k.ord <= i.indnkeyatts
        AND k.attnum = 0
    ) = 0
    AND (
      SELECT array_agg(a.attname::text ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.ord <= i.indnkeyatts
        AND k.attnum > 0
    ) = ARRAY[''user_id'', ''product_id'']::text[];

  IF v_pre_same_key_index_names = ARRAY[
    ''dtr_report_snapshots_one_visible_per_user_product_uq'',
    ''dtr_report_snapshots_user_product_key''
  ]::text[] THEN
    v_pre_state := ''STATE_A_PRODUCTION'';
    v_constraint_delta := 1;
    v_index_delta := 1;
  ELSIF v_pre_same_key_index_names = ARRAY[
    ''dtr_report_snapshots_one_visible_per_user_product_uq''
  ]::text[] THEN
    v_pre_state := ''STATE_B_PREVIEW_REPLAY'';
    v_constraint_delta := 0;
    v_index_delta := 0;
    v_global_con_oid := NULL;
    v_global_con_ind_oid := NULL;
    v_global_con_validated := NULL;
  ELSE
    RAISE EXCEPTION ''precondition failed (%): same-key index name set is %, expected STATE_A {dtr_report_snapshots_one_visible_per_user_product_uq,dtr_report_snapshots_user_product_key} or STATE_B {dtr_report_snapshots_one_visible_per_user_product_uq}'',
      COALESCE(v_pre_state, ''UNCLASSIFIED''), v_pre_same_key_index_names;
  END IF;

  -- -------------------------------------------------------------------------
  -- D. STATE_A exact global UNIQUE contract
  -- -------------------------------------------------------------------------
  IF v_pre_state = ''STATE_A_PRODUCTION'' THEN
    SELECT con.oid, con.conindid, con.convalidated
    INTO v_global_con_oid, v_global_con_ind_oid, v_global_con_validated
    FROM pg_constraint con
    WHERE con.conrelid = v_relation_oid
      AND con.conname = ''dtr_report_snapshots_user_product_key''
      AND con.contype = ''u'';

    IF v_global_con_oid IS NULL THEN
      RAISE EXCEPTION ''precondition failed (STATE_A_PRODUCTION): global constraint dtr_report_snapshots_user_product_key missing'';
    END IF;

    IF (
      SELECT array_agg(a.attname::text ORDER BY u.ord)
      FROM pg_constraint con
      JOIN unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
      JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = u.attnum
      WHERE con.oid = v_global_con_oid
    ) IS DISTINCT FROM ARRAY[''user_id'', ''product_id'']::text[] THEN
      RAISE EXCEPTION ''precondition failed (STATE_A_PRODUCTION): global constraint key columns are not (user_id, product_id)'';
    END IF;

    IF v_global_con_validated IS DISTINCT FROM true THEN
      RAISE EXCEPTION ''precondition failed (STATE_A_PRODUCTION): global constraint is not validated'';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_class ic
      JOIN pg_index i ON i.indexrelid = ic.oid
      JOIN pg_am am ON am.oid = ic.relam
      WHERE ic.oid = v_global_con_ind_oid
        AND i.indrelid = v_relation_oid
        AND ic.relkind = ''i''
        AND am.amname = ''btree''
        AND i.indisunique
        AND NOT i.indisprimary
        AND i.indnatts = 2
        AND i.indnkeyatts = 2
        AND i.indpred IS NULL
        AND i.indisvalid
        AND i.indisready
        AND i.indislive
        AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
        AND (
          SELECT array_agg(a.attname::text ORDER BY k.ord)
          FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
          WHERE k.attnum > 0
        ) = ARRAY[''user_id'', ''product_id'']::text[]
    ) THEN
      RAISE EXCEPTION ''precondition failed (STATE_A_PRODUCTION): global constraint backing index shape mismatch'';
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- E. STATE_B exact global absence contract
  -- -------------------------------------------------------------------------
  IF v_pre_state = ''STATE_B_PREVIEW_REPLAY'' THEN
    IF EXISTS (
      SELECT 1
      FROM pg_constraint con
      WHERE con.conrelid = v_relation_oid
        AND con.conname = ''dtr_report_snapshots_user_product_key''
    ) THEN
      RAISE EXCEPTION ''precondition failed (STATE_B_PREVIEW_REPLAY): global constraint dtr_report_snapshots_user_product_key must be absent'';
    END IF;

    IF to_regclass(''public.dtr_report_snapshots_user_product_key'') IS NOT NULL THEN
      RAISE EXCEPTION ''precondition failed (STATE_B_PREVIEW_REPLAY): global backing index dtr_report_snapshots_user_product_key must be absent'';
    END IF;
  END IF;

  -- -------------------------------------------------------------------------
  -- F. Referencing FK count
  -- -------------------------------------------------------------------------
  SELECT count(*)::integer
  INTO v_fk_target_count
  FROM pg_constraint con
  WHERE con.contype = ''f''
    AND con.confrelid = v_relation_oid
    AND (
      SELECT array_agg(a.attname::text ORDER BY u.ord)
      FROM unnest(con.confkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = u.attnum
    ) = ARRAY[''user_id'', ''product_id'']::text[];

  IF v_fk_target_count <> 0 THEN
    RAISE EXCEPTION ''precondition failed: referencing FK count is %, expected 0'', v_fk_target_count;
  END IF;

  -- -------------------------------------------------------------------------
  -- G. Structural pre-state
  -- -------------------------------------------------------------------------
  SELECT coalesce(array_agg(con.conname::text ORDER BY con.conname), ARRAY[]::text[])
  INTO v_unrelated_constraint_names
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid
    AND con.conname <> ''dtr_report_snapshots_user_product_key'';

  SELECT coalesce(array_agg(ic.relname::text ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_unrelated_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.oid IS DISTINCT FROM v_global_con_ind_oid;

  -- -------------------------------------------------------------------------
  -- H. Exact conditional mutation
  -- -------------------------------------------------------------------------
  IF v_pre_state = ''STATE_A_PRODUCTION'' THEN
    ALTER TABLE public.dtr_report_snapshots
      DROP CONSTRAINT dtr_report_snapshots_user_product_key;
  ELSIF v_pre_state = ''STATE_B_PREVIEW_REPLAY'' THEN
    NULL;
  ELSE
    RAISE EXCEPTION ''mutation branch failed: unsupported pre-state %'', v_pre_state;
  END IF;

  -- -------------------------------------------------------------------------
  -- I. Postconditions
  -- -------------------------------------------------------------------------
  IF EXISTS (
    SELECT 1
    FROM pg_constraint con
    WHERE con.conrelid = v_relation_oid
      AND con.conname = ''dtr_report_snapshots_user_product_key''
  ) THEN
    RAISE EXCEPTION ''postcondition failed (%): global constraint still present'', v_pre_state;
  END IF;

  IF to_regclass(''public.dtr_report_snapshots_user_product_key'') IS NOT NULL THEN
    RAISE EXCEPTION ''postcondition failed (%): global backing index still present'', v_pre_state;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class ic
    JOIN pg_index i ON i.indexrelid = ic.oid
    JOIN pg_namespace n ON n.oid = ic.relnamespace
    JOIN pg_am am ON am.oid = ic.relam
    WHERE n.nspname = ''public''
      AND ic.relname = ''dtr_report_snapshots_one_visible_per_user_product_uq''
      AND i.indrelid = v_relation_oid
      AND ic.relkind = ''i''
      AND am.amname = ''btree''
      AND i.indisunique
      AND NOT i.indisprimary
      AND i.indnkeyatts = 2
      AND i.indnatts = 2
      AND i.indpred IS NOT NULL
      AND i.indisvalid
      AND i.indisready
      AND i.indislive
      AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint c2
        WHERE c2.conindid = ic.oid
          AND c2.contype IN (''u'', ''p'')
      )
      AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
      AND regexp_replace(
        lower(btrim(btrim(pg_get_expr(i.indpred, i.indrelid), ''(''), '')'')),
        ''[[:space:]]'', '''', ''g''
      ) = ''user_hidden_atisnull''
      AND (
        SELECT array_agg(a.attname::text ORDER BY k.ord)
        FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE k.attnum > 0
      ) = ARRAY[''user_id'', ''product_id'']::text[]
  ) THEN
    RAISE EXCEPTION ''postcondition failed (%): partial unique index full shape mismatch after mutation'', v_pre_state;
  END IF;

  SELECT coalesce(array_agg(ic.relname::text ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_post_same_key_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.relkind = ''i''
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indnkeyatts = 2
    AND (
      SELECT count(*)::integer
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      WHERE k.ord <= i.indnkeyatts
        AND k.attnum = 0
    ) = 0
    AND (
      SELECT array_agg(a.attname::text ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.ord <= i.indnkeyatts
        AND k.attnum > 0
    ) = ARRAY[''user_id'', ''product_id'']::text[];

  IF v_post_same_key_index_names IS DISTINCT FROM ARRAY[
    ''dtr_report_snapshots_one_visible_per_user_product_uq''
  ]::text[] THEN
    RAISE EXCEPTION ''postcondition failed (%): same-key index name set is %, expected {dtr_report_snapshots_one_visible_per_user_product_uq}'',
      v_pre_state, v_post_same_key_index_names;
  END IF;

  SELECT c.oid, c.relowner
  INTO v_post_relation_oid, v_post_owner_oid
  FROM pg_class c
  WHERE c.oid = v_relation_oid;

  IF v_post_relation_oid IS DISTINCT FROM v_relation_oid THEN
    RAISE EXCEPTION ''postcondition failed (%): relation OID changed'', v_pre_state;
  END IF;

  IF v_post_owner_oid IS DISTINCT FROM v_owner_oid THEN
    RAISE EXCEPTION ''postcondition failed (%): owner OID changed'', v_pre_state;
  END IF;

  SELECT count(*)::integer
  INTO v_post_column_count
  FROM information_schema.columns
  WHERE table_schema = ''public''
    AND table_name = ''dtr_report_snapshots'';

  IF v_post_column_count IS DISTINCT FROM v_column_count THEN
    RAISE EXCEPTION ''postcondition failed (%): column count changed'', v_pre_state;
  END IF;

  SELECT count(*)::integer
  INTO v_post_constraint_count
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  IF v_post_constraint_count IS DISTINCT FROM v_constraint_count - v_constraint_delta THEN
    RAISE EXCEPTION ''postcondition failed (%): constraint count changed from % to %, expected %'',
      v_pre_state, v_constraint_count, v_post_constraint_count, v_constraint_count - v_constraint_delta;
  END IF;

  SELECT count(*)::integer
  INTO v_post_index_count
  FROM pg_index i
  WHERE i.indrelid = v_relation_oid
    AND i.indisvalid;

  IF v_post_index_count IS DISTINCT FROM v_index_count - v_index_delta THEN
    RAISE EXCEPTION ''postcondition failed (%): index count changed from % to %, expected %'',
      v_pre_state, v_index_count, v_post_index_count, v_index_count - v_index_delta;
  END IF;

  SELECT coalesce(array_agg(con.conname::text ORDER BY con.conname), ARRAY[]::text[])
  INTO v_post_unrelated_constraint_names
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  IF v_post_unrelated_constraint_names IS DISTINCT FROM v_unrelated_constraint_names THEN
    RAISE EXCEPTION ''postcondition failed (%): unrelated constraint names changed'', v_pre_state;
  END IF;

  SELECT coalesce(array_agg(ic.relname::text ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_post_unrelated_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.relname <> ''dtr_report_snapshots_user_product_key'';

  IF v_post_unrelated_index_names IS DISTINCT FROM v_unrelated_index_names THEN
    RAISE EXCEPTION ''postcondition failed (%): unrelated index names changed'', v_pre_state;
  END IF;
END
$m55$'
    ]::text[],
  'm55_dtr_visible_report_uniqueness_v1'
);

INSERT INTO supabase_migrations.schema_migrations (version, statements, name)
VALUES (
  '20260615000006',
  ARRAY[
      'DO $m55$
DECLARE
  v_relation_oid oid;
  v_owner_oid oid;
  v_column_count integer;
  v_constraint_count integer;
  v_index_count integer;

  v_canonical_con_oid oid;
  v_canonical_con_ind_oid oid;
  v_canonical_con_validated boolean;

  v_dup1_index_oid oid;
  v_dup2_index_oid oid;

  v_pre_same_key_index_names text[];
  v_post_same_key_index_names text[];
  v_fk_target_count integer;

  v_constraint_names text[];
  v_unrelated_index_names text[];

  v_post_relation_oid oid;
  v_post_owner_oid oid;
  v_post_column_count integer;
  v_post_constraint_count integer;
  v_post_index_count integer;
  v_post_constraint_names text[];
  v_post_unrelated_index_names text[];
BEGIN
  -- -------------------------------------------------------------------------
  -- A. Relation shape
  -- -------------------------------------------------------------------------
  SELECT c.oid, c.relowner
  INTO v_relation_oid, v_owner_oid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = ''public''
    AND c.relname = ''entitlements''
    AND c.relkind = ''r'';

  IF v_relation_oid IS NULL THEN
    RAISE EXCEPTION ''precondition failed: public.entitlements missing or not ordinary table'';
  END IF;

  IF pg_get_userbyid(v_owner_oid) <> ''postgres'' THEN
    RAISE EXCEPTION ''precondition failed: public.entitlements owner is not postgres'';
  END IF;

  SELECT count(*)::integer
  INTO v_column_count
  FROM information_schema.columns
  WHERE table_schema = ''public''
    AND table_name = ''entitlements'';

  SELECT count(*)::integer
  INTO v_constraint_count
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  SELECT count(*)::integer
  INTO v_index_count
  FROM pg_index i
  WHERE i.indrelid = v_relation_oid
    AND i.indisvalid;

  -- -------------------------------------------------------------------------
  -- B. Canonical UNIQUE constraint + backing index (full shape)
  -- -------------------------------------------------------------------------
  SELECT con.oid, con.conindid, con.convalidated
  INTO v_canonical_con_oid, v_canonical_con_ind_oid, v_canonical_con_validated
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid
    AND con.conname = ''entitlements_user_id_product_id_key''
    AND con.contype = ''u'';

  IF v_canonical_con_oid IS NULL THEN
    RAISE EXCEPTION ''precondition failed: canonical constraint entitlements_user_id_product_id_key missing'';
  END IF;

  IF (
    SELECT array_agg(a.attname::text ORDER BY u.ord)
    FROM pg_constraint con
    JOIN unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = u.attnum
    WHERE con.oid = v_canonical_con_oid
  ) IS DISTINCT FROM ARRAY[''user_id'', ''product_id'']::text[] THEN
    RAISE EXCEPTION ''precondition failed: canonical constraint key columns are not (user_id, product_id)'';
  END IF;

  IF v_canonical_con_validated IS DISTINCT FROM true THEN
    RAISE EXCEPTION ''precondition failed: canonical constraint is not validated'';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class ic
    JOIN pg_index i ON i.indexrelid = ic.oid
    JOIN pg_am am ON am.oid = ic.relam
    WHERE ic.oid = v_canonical_con_ind_oid
      AND i.indrelid = v_relation_oid
      AND ic.relkind = ''i''
      AND am.amname = ''btree''
      AND i.indisunique
      AND NOT i.indisprimary
      AND i.indnatts = 2
      AND i.indnkeyatts = 2
      AND i.indpred IS NULL
      AND i.indisvalid
      AND i.indisready
      AND i.indislive
      AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
      AND (
        SELECT array_agg(a.attname::text ORDER BY k.ord)
        FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE k.attnum > 0
      ) = ARRAY[''user_id'', ''product_id'']::text[]
  ) THEN
    RAISE EXCEPTION ''precondition failed: canonical constraint backing index shape mismatch'';
  END IF;

  -- -------------------------------------------------------------------------
  -- C. Duplicate index 1 (full shape)
  -- -------------------------------------------------------------------------
  SELECT ic.oid
  INTO v_dup1_index_oid
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  JOIN pg_namespace n ON n.oid = ic.relnamespace
  JOIN pg_am am ON am.oid = ic.relam
  WHERE n.nspname = ''public''
    AND ic.relname = ''entitlements_user_product_uq''
    AND i.indrelid = v_relation_oid
    AND ic.relkind = ''i''
    AND am.amname = ''btree''
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indpred IS NULL
    AND i.indisvalid
    AND i.indisready
    AND i.indislive
    AND i.indnatts = 2
    AND i.indnkeyatts = 2
    AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint c2
      WHERE c2.conindid = ic.oid
        AND c2.contype IN (''u'', ''p'')
    )
    AND (
      SELECT array_agg(a.attname::text ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.attnum > 0
    ) = ARRAY[''user_id'', ''product_id'']::text[];

  IF v_dup1_index_oid IS NULL THEN
    RAISE EXCEPTION ''precondition failed: duplicate index entitlements_user_product_uq missing or shape mismatch'';
  END IF;

  -- -------------------------------------------------------------------------
  -- D. Duplicate index 2 (full shape)
  -- -------------------------------------------------------------------------
  SELECT ic.oid
  INTO v_dup2_index_oid
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  JOIN pg_namespace n ON n.oid = ic.relnamespace
  JOIN pg_am am ON am.oid = ic.relam
  WHERE n.nspname = ''public''
    AND ic.relname = ''uq_entitlements_user_product''
    AND i.indrelid = v_relation_oid
    AND ic.relkind = ''i''
    AND am.amname = ''btree''
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indpred IS NULL
    AND i.indisvalid
    AND i.indisready
    AND i.indislive
    AND i.indnatts = 2
    AND i.indnkeyatts = 2
    AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
    AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint c2
      WHERE c2.conindid = ic.oid
        AND c2.contype IN (''u'', ''p'')
    )
    AND (
      SELECT array_agg(a.attname::text ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.attnum > 0
    ) = ARRAY[''user_id'', ''product_id'']::text[];

  IF v_dup2_index_oid IS NULL THEN
    RAISE EXCEPTION ''precondition failed: duplicate index uq_entitlements_user_product missing or shape mismatch'';
  END IF;

  -- -------------------------------------------------------------------------
  -- E. Exact same-key index name set (pg_index canonical inventory)
  -- -------------------------------------------------------------------------
  SELECT coalesce(array_agg(ic.relname::text ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_pre_same_key_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  JOIN pg_am am ON am.oid = ic.relam
  WHERE i.indrelid = v_relation_oid
    AND ic.relkind = ''i''
    AND am.amname = ''btree''
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indnkeyatts = 2
    AND i.indnatts = 2
    AND i.indpred IS NULL
    AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
    AND (
      SELECT array_agg(a.attname::text ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.attnum > 0
    ) = ARRAY[''user_id'', ''product_id'']::text[];

  IF v_pre_same_key_index_names IS DISTINCT FROM ARRAY[
    ''entitlements_user_id_product_id_key'',
    ''entitlements_user_product_uq'',
    ''uq_entitlements_user_product''
  ]::text[] THEN
    RAISE EXCEPTION ''precondition failed: same-key index name set is %, expected {entitlements_user_id_product_id_key,entitlements_user_product_uq,uq_entitlements_user_product}'',
      v_pre_same_key_index_names;
  END IF;

  -- -------------------------------------------------------------------------
  -- F. Referencing FK count
  -- -------------------------------------------------------------------------
  SELECT count(*)::integer
  INTO v_fk_target_count
  FROM pg_constraint con
  WHERE con.contype = ''f''
    AND con.confrelid = v_relation_oid
    AND (
      SELECT array_agg(a.attname::text ORDER BY u.ord)
      FROM unnest(con.confkey) WITH ORDINALITY AS u(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = con.confrelid AND a.attnum = u.attnum
    ) = ARRAY[''user_id'', ''product_id'']::text[];

  IF v_fk_target_count <> 0 THEN
    RAISE EXCEPTION ''precondition failed: referencing FK count is %, expected 0'', v_fk_target_count;
  END IF;

  -- -------------------------------------------------------------------------
  -- G. Structural pre-state
  -- -------------------------------------------------------------------------
  SELECT coalesce(array_agg(con.conname::text ORDER BY con.conname), ARRAY[]::text[])
  INTO v_constraint_names
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  SELECT coalesce(array_agg(ic.relname::text ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_unrelated_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.oid NOT IN (v_canonical_con_ind_oid, v_dup1_index_oid, v_dup2_index_oid);

  -- -------------------------------------------------------------------------
  -- H. Exact mutations
  -- -------------------------------------------------------------------------
  DROP INDEX public.entitlements_user_product_uq;
  DROP INDEX public.uq_entitlements_user_product;

  -- -------------------------------------------------------------------------
  -- I. Postconditions
  -- -------------------------------------------------------------------------
  IF (
    SELECT count(*)::integer
    FROM pg_constraint con
    WHERE con.conrelid = v_relation_oid
      AND con.conname = ''entitlements_user_id_product_id_key''
      AND con.contype = ''u''
  ) <> 1 THEN
    RAISE EXCEPTION ''postcondition failed: canonical constraint missing'';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_class ic
    JOIN pg_index i ON i.indexrelid = ic.oid
    JOIN pg_am am ON am.oid = ic.relam
    WHERE ic.oid = v_canonical_con_ind_oid
      AND i.indrelid = v_relation_oid
      AND ic.relkind = ''i''
      AND am.amname = ''btree''
      AND i.indisunique
      AND NOT i.indisprimary
      AND i.indnatts = 2
      AND i.indnkeyatts = 2
      AND i.indpred IS NULL
      AND i.indisvalid
      AND i.indisready
      AND i.indislive
      AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
      AND (
        SELECT array_agg(a.attname::text ORDER BY k.ord)
        FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
        WHERE k.attnum > 0
      ) = ARRAY[''user_id'', ''product_id'']::text[]
  ) THEN
    RAISE EXCEPTION ''postcondition failed: canonical backing index full shape mismatch after mutation'';
  END IF;

  IF to_regclass(''public.entitlements_user_product_uq'') IS NOT NULL THEN
    RAISE EXCEPTION ''postcondition failed: entitlements_user_product_uq still present'';
  END IF;

  IF to_regclass(''public.uq_entitlements_user_product'') IS NOT NULL THEN
    RAISE EXCEPTION ''postcondition failed: uq_entitlements_user_product still present'';
  END IF;

  SELECT coalesce(array_agg(ic.relname::text ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_post_same_key_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  JOIN pg_am am ON am.oid = ic.relam
  WHERE i.indrelid = v_relation_oid
    AND ic.relkind = ''i''
    AND am.amname = ''btree''
    AND i.indisunique
    AND NOT i.indisprimary
    AND i.indnkeyatts = 2
    AND i.indnatts = 2
    AND i.indpred IS NULL
    AND (SELECT count(*)::integer FROM unnest(i.indkey) AS x(attnum) WHERE x.attnum = 0) = 0
    AND (
      SELECT array_agg(a.attname::text ORDER BY k.ord)
      FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum
      WHERE k.attnum > 0
    ) = ARRAY[''user_id'', ''product_id'']::text[];

  IF v_post_same_key_index_names IS DISTINCT FROM ARRAY[
    ''entitlements_user_id_product_id_key''
  ]::text[] THEN
    RAISE EXCEPTION ''postcondition failed: same-key index name set is %, expected {entitlements_user_id_product_id_key}'',
      v_post_same_key_index_names;
  END IF;

  SELECT c.oid, c.relowner
  INTO v_post_relation_oid, v_post_owner_oid
  FROM pg_class c
  WHERE c.oid = v_relation_oid;

  IF v_post_relation_oid IS DISTINCT FROM v_relation_oid THEN
    RAISE EXCEPTION ''postcondition failed: relation OID changed'';
  END IF;

  IF v_post_owner_oid IS DISTINCT FROM v_owner_oid THEN
    RAISE EXCEPTION ''postcondition failed: owner OID changed'';
  END IF;

  SELECT count(*)::integer
  INTO v_post_column_count
  FROM information_schema.columns
  WHERE table_schema = ''public''
    AND table_name = ''entitlements'';

  IF v_post_column_count IS DISTINCT FROM v_column_count THEN
    RAISE EXCEPTION ''postcondition failed: column count changed'';
  END IF;

  SELECT count(*)::integer
  INTO v_post_constraint_count
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  IF v_post_constraint_count IS DISTINCT FROM v_constraint_count THEN
    RAISE EXCEPTION ''postcondition failed: constraint count changed'';
  END IF;

  SELECT count(*)::integer
  INTO v_post_index_count
  FROM pg_index i
  WHERE i.indrelid = v_relation_oid
    AND i.indisvalid;

  IF v_post_index_count IS DISTINCT FROM v_index_count - 2 THEN
    RAISE EXCEPTION ''postcondition failed: index count changed from % to %, expected %'',
      v_index_count, v_post_index_count, v_index_count - 2;
  END IF;

  SELECT coalesce(array_agg(con.conname::text ORDER BY con.conname), ARRAY[]::text[])
  INTO v_post_constraint_names
  FROM pg_constraint con
  WHERE con.conrelid = v_relation_oid;

  IF v_post_constraint_names IS DISTINCT FROM v_constraint_names THEN
    RAISE EXCEPTION ''postcondition failed: constraint names changed'';
  END IF;

  SELECT coalesce(array_agg(ic.relname::text ORDER BY ic.relname), ARRAY[]::text[])
  INTO v_post_unrelated_index_names
  FROM pg_class ic
  JOIN pg_index i ON i.indexrelid = ic.oid
  WHERE i.indrelid = v_relation_oid
    AND ic.oid <> v_canonical_con_ind_oid;

  IF v_post_unrelated_index_names IS DISTINCT FROM v_unrelated_index_names THEN
    RAISE EXCEPTION ''postcondition failed: unrelated index names changed'';
  END IF;
END
$m55$'
    ]::text[],
  'm55_entitlements_unique_index_cleanup_v1'
);

COMMIT;
