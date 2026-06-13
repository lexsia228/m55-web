-- M55 Preview Baseline P1
-- revision: PREVIEW-BASELINE-SQL-v1-REVISION-8
-- baseline_version: 20260614000000
-- strategy: PREVIEW_ONLY_BASELINE_PLUS_ORIGINAL_CANONICAL_CHAIN
-- generator_version: 7
-- source_gap_diagnostic_sha256: 59095b8fa0ed5c386a5127ef612eae3f08efc1ca519348fc169cba54b5827c9f
-- source_p3_columns_sha256: 8cb8e4f685fad93e7669f2e053f32624ce019066ec07dfb7437621dc9f4f3ed9
-- evidence_bundle_sha256: 2ef8b8375f1b92379a13c4c38cba5650e93085e38130a77196246f77f14629e0
-- contract_matrix_sha256: d5d34b135acabe3cd7fc41144069d9deee133472810264e1b397cf5bd3a19257
-- WARNING: PREVIEW-ONLY — DO NOT execute on Production
-- WARNING: Production execution STOP
-- operational_metadata_scope: OPERATIONAL_SCHEMA_ONLY

BEGIN;

SET LOCAL search_path = pg_catalog, public;

CREATE TABLE public."consult_threads" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "report_key" text NOT NULL,
  "credits_total" integer NOT NULL DEFAULT 1,
  "credits_remaining" integer NOT NULL DEFAULT 1,
  "state" text NOT NULL DEFAULT 'writable'::text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public."dtr_guest_drafts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "nickname" text,
  "birth_date" date,
  "extra_json" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "linked_at" timestamp with time zone
);

CREATE TABLE public."dtr_report_snapshots" (
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
);

CREATE TABLE public."entitlement_rights" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "right_key" text NOT NULL,
  "right_value" text,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public."entitlements" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "product_id" text NOT NULL,
  "grant_type" text NOT NULL,
  "source" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active'::text,
  "purchase_ref" text,
  "stripe_event_id" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "expires_at" timestamp with time zone,
  "stripe_session_id" text
);

CREATE TABLE public."failed_fulfillments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "event_id" text NOT NULL,
  "checkout_session_id" text NOT NULL,
  "failure_reason" text NOT NULL,
  "raw_metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public."one_time_fulfillments" (
  "checkout_session_id" text NOT NULL,
  "payment_intent_id" text,
  "event_id" text NOT NULL,
  "user_id" text NOT NULL,
  "product_id" text NOT NULL,
  "fulfilled_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public."reply_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "theme" text NOT NULL,
  "input_mode" text NOT NULL,
  "selected_subquestions_json" jsonb NOT NULL,
  "free_text" text,
  "schema_version" text NOT NULL DEFAULT '1.1'::text,
  "idempotency_key" text NOT NULL,
  "status" text NOT NULL,
  "core_profile_ref" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "report_instance_id" uuid
);

CREATE TABLE public."reply_ticket_wallets" (
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
);

CREATE TABLE public."stripe_events" (
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "received_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public."stripe_processed_events" (
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
);

CREATE TABLE public."consult_messages" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "thread_id" uuid NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public."reply_documents" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "reply_session_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "theme" text NOT NULL,
  "payload_json" jsonb NOT NULL,
  "version" text NOT NULL,
  "generator_version" text,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public."consult_send_commits" (
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
);

CREATE TABLE public."reply_wallet_ledgers" (
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
);

ALTER TABLE public."consult_threads" ADD CONSTRAINT "consult_threads_pkey" PRIMARY KEY (id);
ALTER TABLE public."consult_threads" ADD CONSTRAINT "consult_threads_state_check" CHECK (state = ANY (ARRAY['writable'::text, 'read_only'::text]));
ALTER TABLE public."consult_threads" ADD CONSTRAINT "consult_threads_user_id_report_key_key" UNIQUE (user_id, report_key);
ALTER TABLE public."dtr_guest_drafts" ADD CONSTRAINT "dtr_guest_drafts_pkey" PRIMARY KEY (id);
ALTER TABLE public."dtr_report_snapshots" ADD CONSTRAINT "dtr_report_snapshots_pkey" PRIMARY KEY (id);
ALTER TABLE public."dtr_report_snapshots" ADD CONSTRAINT "dtr_report_snapshots_user_product_key" UNIQUE (user_id, product_id);
ALTER TABLE public."entitlement_rights" ADD CONSTRAINT "entitlement_rights_pkey" PRIMARY KEY (id);
ALTER TABLE public."entitlements" ADD CONSTRAINT "entitlements_pkey" PRIMARY KEY (id);
ALTER TABLE public."entitlements" ADD CONSTRAINT "entitlements_user_id_product_id_key" UNIQUE (user_id, product_id);
ALTER TABLE public."failed_fulfillments" ADD CONSTRAINT "failed_fulfillments_pkey" PRIMARY KEY (id);
ALTER TABLE public."one_time_fulfillments" ADD CONSTRAINT "one_time_fulfillments_pkey" PRIMARY KEY (checkout_session_id);
ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_idempotency_key_check" CHECK (length(btrim(idempotency_key)) > 0);
ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_input_mode_check" CHECK (length(btrim(input_mode)) > 0);
ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_pkey" PRIMARY KEY (id);
ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_schema_version_check" CHECK (schema_version = '1.1'::text);
ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_selected_subquestions_json_check" CHECK (jsonb_typeof(selected_subquestions_json) = 'array'::text);
ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_status_check" CHECK (status = ANY (ARRAY['accepted'::text, 'generating'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text]));
ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_theme_check" CHECK (length(btrim(theme)) > 0);
ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_user_id_check" CHECK (length(btrim(user_id)) > 0);
ALTER TABLE public."reply_sessions" ADD CONSTRAINT "reply_sessions_user_id_idempotency_key_key" UNIQUE (user_id, idempotency_key);
ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_available_count_check" CHECK (available_count >= 0);
ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_check" CHECK (available_count = (initial_included_count + purchased_count - consumed_count));
ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_consumed_count_check" CHECK (consumed_count >= 0);
ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_initial_included_count_check" CHECK (initial_included_count >= 0);
ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_pkey" PRIMARY KEY (id);
ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_purchased_count_check" CHECK (purchased_count >= 0);
ALTER TABLE public."reply_ticket_wallets" ADD CONSTRAINT "reply_ticket_wallets_status_check" CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'closed'::text]));
ALTER TABLE public."stripe_events" ADD CONSTRAINT "stripe_events_pkey" PRIMARY KEY (event_id);
ALTER TABLE public."consult_messages" ADD CONSTRAINT "consult_messages_pkey" PRIMARY KEY (id);
ALTER TABLE public."consult_messages" ADD CONSTRAINT "consult_messages_role_check" CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text]));
ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_check" CHECK ((payload_json ->> 'version'::text) IS NOT NULL AND (payload_json ->> 'version'::text) = version);
ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_check1" CHECK ((payload_json ->> 'theme'::text) IS NOT NULL AND (payload_json ->> 'theme'::text) = theme);
ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_payload_json_check" CHECK (jsonb_typeof(payload_json) = 'object'::text);
ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_pkey" PRIMARY KEY (id);
ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_reply_session_id_key" UNIQUE (reply_session_id);
ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_theme_check" CHECK (length(btrim(theme)) > 0);
ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_user_id_check" CHECK (length(btrim(user_id)) > 0);
ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_version_check" CHECK (length(btrim(version)) > 0 AND version = '1.1'::text);
ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_idempotency_key_check" CHECK (length(btrim(idempotency_key)) >= 8 AND length(btrim(idempotency_key)) <= 128);
ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_pkey" PRIMARY KEY (id);
ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text]));
ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_user_id_check" CHECK (length(btrim(user_id)) > 0);
ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_user_id_report_instance_id_idempotency_key" UNIQUE (user_id, report_instance_id, idempotency_key);
ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_balance_after_check" CHECK (balance_after >= 0);
ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_event_type_check" CHECK (event_type = ANY (ARRAY['included_grant'::text, 'purchase_grant'::text, 'reply_consume'::text, 'recovery_adjust'::text, 'admin_adjust'::text]));
ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_pkey" PRIMARY KEY (id);
ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_reply_consume_ref_check" CHECK (event_type = 'reply_consume'::text AND delta < 0 AND (reply_session_id IS NOT NULL OR consult_commit_id IS NOT NULL) OR (event_type = ANY (ARRAY['included_grant'::text, 'purchase_grant'::text])) AND delta > 0 OR (event_type = ANY (ARRAY['recovery_adjust'::text, 'admin_adjust'::text])));
ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_source_of_grant_check" CHECK (source_of_grant IS NULL OR (source_of_grant = ANY (ARRAY['PURCHASE'::text, 'INCLUDED'::text, 'RECOVERY'::text, 'ADMIN_ADJUST'::text])));
ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_user_id_check" CHECK (length(btrim(user_id)) > 0);

CREATE UNIQUE INDEX reply_sessions_id_theme_key ON public.reply_sessions USING btree (id, theme);

ALTER TABLE public."consult_messages" ADD CONSTRAINT "consult_messages_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES public.consult_threads(id) ON DELETE CASCADE;
ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_reply_session_id_fkey" FOREIGN KEY (reply_session_id) REFERENCES public.reply_sessions(id) ON DELETE CASCADE;
ALTER TABLE public."reply_documents" ADD CONSTRAINT "reply_documents_session_theme_fk" FOREIGN KEY (reply_session_id, theme) REFERENCES public.reply_sessions(id, theme) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_assistant_message_id_fkey" FOREIGN KEY (assistant_message_id) REFERENCES public.consult_messages(id) ON DELETE SET NULL;
ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_consult_thread_id_fkey" FOREIGN KEY (consult_thread_id) REFERENCES public.consult_threads(id) ON DELETE RESTRICT;
ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_user_message_id_fkey" FOREIGN KEY (user_message_id) REFERENCES public.consult_messages(id) ON DELETE SET NULL;
ALTER TABLE public."consult_send_commits" ADD CONSTRAINT "consult_send_commits_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES public.reply_ticket_wallets(id) ON DELETE SET NULL;
ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_consult_commit_id_fkey" FOREIGN KEY (consult_commit_id) REFERENCES public.consult_send_commits(id) ON DELETE SET NULL;
ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_reply_session_id_fkey" FOREIGN KEY (reply_session_id) REFERENCES public.reply_sessions(id) ON DELETE SET NULL;
ALTER TABLE public."reply_wallet_ledgers" ADD CONSTRAINT "reply_wallet_ledgers_wallet_id_fkey" FOREIGN KEY (wallet_id) REFERENCES public.reply_ticket_wallets(id) ON DELETE CASCADE;

CREATE INDEX idx_consult_messages_thread ON public.consult_messages USING btree (thread_id, created_at);
CREATE INDEX idx_consult_send_commits_user_report_created ON public.consult_send_commits USING btree (user_id, report_instance_id, created_at DESC);
CREATE INDEX idx_consult_threads_key ON public.consult_threads USING btree (user_id, report_key);
CREATE INDEX idx_consult_threads_user ON public.consult_threads USING btree (user_id);
CREATE INDEX idx_dtr_guest_drafts_user_id ON public.dtr_guest_drafts USING btree (user_id);
CREATE UNIQUE INDEX dtr_report_snapshots_one_visible_per_user_product_uq ON public.dtr_report_snapshots USING btree (user_id, product_id) WHERE (user_hidden_at IS NULL);
CREATE INDEX idx_dtr_report_snapshots_product_id ON public.dtr_report_snapshots USING btree (product_id);
CREATE INDEX idx_dtr_report_snapshots_user_id ON public.dtr_report_snapshots USING btree (user_id);
CREATE INDEX idx_entitlement_rights_user ON public.entitlement_rights USING btree (user_id);
CREATE UNIQUE INDEX uq_entitlement_rights_user_key ON public.entitlement_rights USING btree (user_id, right_key);
CREATE UNIQUE INDEX entitlements_user_product_uq ON public.entitlements USING btree (user_id, product_id);
CREATE UNIQUE INDEX uq_entitlements_user_product ON public.entitlements USING btree (user_id, product_id);
CREATE INDEX idx_one_time_fulfillments_user ON public.one_time_fulfillments USING btree (user_id);
CREATE INDEX idx_reply_documents_theme ON public.reply_documents USING btree (theme);
CREATE INDEX idx_reply_documents_user_created ON public.reply_documents USING btree (user_id, created_at DESC);
CREATE INDEX idx_reply_sessions_status ON public.reply_sessions USING btree (status);
CREATE INDEX idx_reply_sessions_user_created ON public.reply_sessions USING btree (user_id, created_at DESC);
CREATE INDEX idx_reply_ticket_wallets_status ON public.reply_ticket_wallets USING btree (status);
CREATE UNIQUE INDEX reply_ticket_wallets_user_report_uidx_nonnull ON public.reply_ticket_wallets USING btree (user_id, report_instance_id) WHERE (report_instance_id IS NOT NULL);
CREATE INDEX idx_reply_wallet_ledgers_consult_commit ON public.reply_wallet_ledgers USING btree (consult_commit_id) WHERE (consult_commit_id IS NOT NULL);
CREATE INDEX idx_reply_wallet_ledgers_session ON public.reply_wallet_ledgers USING btree (reply_session_id) WHERE (reply_session_id IS NOT NULL);
CREATE INDEX idx_reply_wallet_ledgers_user_created ON public.reply_wallet_ledgers USING btree (user_id, created_at DESC);
CREATE INDEX idx_reply_wallet_ledgers_wallet_created ON public.reply_wallet_ledgers USING btree (wallet_id, created_at DESC);
CREATE INDEX m55_idx_reply_wallet_ledgers_stripe_event_id_lookup ON public.reply_wallet_ledgers USING btree (stripe_event_id);
CREATE UNIQUE INDEX idx_stripe_processed_events_stripe_event_id_unique_not_null ON public.stripe_processed_events USING btree (stripe_event_id) WHERE (stripe_event_id IS NOT NULL);
CREATE UNIQUE INDEX m55_uidx_stripe_processed_events_stripe_event_id ON public.stripe_processed_events USING btree (stripe_event_id) WHERE ((stripe_event_id IS NOT NULL) AND (length(btrim(stripe_event_id)) > 0));

ALTER TABLE public."consult_threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."dtr_guest_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."dtr_report_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."entitlement_rights" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."entitlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."failed_fulfillments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."one_time_fulfillments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reply_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reply_ticket_wallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."stripe_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."stripe_processed_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."consult_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reply_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."consult_send_commits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reply_wallet_ledgers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public."entitlements" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

REVOKE ALL ON TABLE public."consult_threads" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_threads" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_threads" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_threads" TO "service_role";
REVOKE ALL ON TABLE public."dtr_guest_drafts" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_guest_drafts" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_guest_drafts" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_guest_drafts" TO "service_role";
REVOKE ALL ON TABLE public."dtr_report_snapshots" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_report_snapshots" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_report_snapshots" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."dtr_report_snapshots" TO "service_role";
REVOKE ALL ON TABLE public."entitlement_rights" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlement_rights" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlement_rights" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlement_rights" TO "service_role";
REVOKE ALL ON TABLE public."entitlements" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlements" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlements" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."entitlements" TO "service_role";
REVOKE ALL ON TABLE public."failed_fulfillments" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."failed_fulfillments" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."failed_fulfillments" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."failed_fulfillments" TO "service_role";
REVOKE ALL ON TABLE public."one_time_fulfillments" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."one_time_fulfillments" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."one_time_fulfillments" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."one_time_fulfillments" TO "service_role";
REVOKE ALL ON TABLE public."reply_sessions" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_sessions" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_sessions" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_sessions" TO "service_role";
REVOKE ALL ON TABLE public."reply_ticket_wallets" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_ticket_wallets" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_ticket_wallets" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_ticket_wallets" TO "service_role";
REVOKE ALL ON TABLE public."stripe_events" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_events" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_events" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_events" TO "service_role";
REVOKE ALL ON TABLE public."stripe_processed_events" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_processed_events" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_processed_events" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."stripe_processed_events" TO "service_role";
REVOKE ALL ON TABLE public."consult_messages" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_messages" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_messages" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_messages" TO "service_role";
REVOKE ALL ON TABLE public."reply_documents" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_documents" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_documents" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_documents" TO "service_role";
REVOKE ALL ON TABLE public."consult_send_commits" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_send_commits" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_send_commits" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."consult_send_commits" TO "service_role";
REVOKE ALL ON TABLE public."reply_wallet_ledgers" FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_wallet_ledgers" TO "anon";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_wallet_ledgers" TO "authenticated";
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public."reply_wallet_ledgers" TO "service_role";

CREATE OR REPLACE FUNCTION public.m55_consult_reply_commit(p_user_id text, p_report_instance_id uuid, p_consult_thread_id uuid, p_idempotency_key text, p_user_message text, p_assistant_message text, p_message_created_at timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'user_id required'
    );
  END IF;

  IF p_report_instance_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'report_instance_id required'
    );
  END IF;

  IF p_consult_thread_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'consult_thread_id required'
    );
  END IF;

  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 OR length(btrim(p_idempotency_key)) > 128 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'idempotency_key length must be 8-128'
    );
  END IF;

  IF p_user_message IS NULL OR length(btrim(p_user_message)) < 10 OR length(p_user_message) > 500 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'user_message length must be 10-500'
    );
  END IF;

  IF p_assistant_message IS NULL OR length(btrim(p_assistant_message)) < 1 OR length(p_assistant_message) > 1000 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'assistant_message length must be 1-1000'
    );
  END IF;

  v_fingerprint := md5(concat_ws('|', p_user_message, p_assistant_message));

  SELECT id, status, payload_fingerprint, user_message_id, assistant_message_id, wallet_after
  INTO v_commit_id, v_commit_status, v_commit_fingerprint, v_commit_user_msg_id, v_commit_asst_msg_id, v_avail_after
  FROM consult_send_commits
  WHERE user_id = p_user_id
    AND report_instance_id = p_report_instance_id
    AND idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_commit_status = 'succeeded' THEN
      IF v_commit_fingerprint IS DISTINCT FROM v_fingerprint THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error_code', 'IDEMPOTENCY_CONFLICT',
          'message', 'idempotency key reused with different payload'
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
        'ok', true,
        'mode', 'replay',
        'consumption_applied', false,
        'wallet_before', COALESCE(v_avail_after, 0),
        'wallet_after', COALESCE(v_avail_after, 0),
        'thread_state', COALESCE(v_thread_state, 'read_only'),
        'thread_credits_remaining', COALESCE(v_thread_credits_remaining, 0),
        'thread_credits_total', COALESCE(v_thread_credits_total, 0),
        'assistant_content', COALESCE(v_assistant_content, p_assistant_message)
      );
    END IF;

    IF v_commit_status = 'pending' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error_code', 'COMMIT_IN_PROGRESS',
        'message', 'commit already in progress for this idempotency key'
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
      'pending'
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
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'THREAD_NOT_FOUND',
      'message', 'consult thread not found'
    );
  END IF;

  IF v_thread_user IS DISTINCT FROM p_user_id THEN
    UPDATE consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'THREAD_USER_MISMATCH',
      'message', 'consult thread user mismatch'
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
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'WALLET_NOT_FOUND',
      'message', 'scoped wallet not found'
    );
  END IF;

  IF v_wallet_report_instance_id IS NULL THEN
    UPDATE consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'FORBIDDEN_NULL_SCOPE',
      'message', 'null-scope wallet forbidden'
    );
  END IF;

  IF v_wallet_status <> 'active' THEN
    UPDATE consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'WALLET_NOT_ACTIVE',
      'message', 'wallet not active'
    );
  END IF;

  IF v_avail_before <= 0 THEN
    UPDATE consult_send_commits
    SET status = 'failed', updated_at = now()
    WHERE id = v_commit_id;

    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'WALLET_NO_BALANCE',
      'message', 'no available balance'
    );
  END IF;

  v_avail_after := v_avail_before - 1;

  INSERT INTO consult_messages (thread_id, role, content, created_at)
  VALUES (p_consult_thread_id, 'user', p_user_message, p_message_created_at)
  RETURNING id INTO v_user_msg_id;

  INSERT INTO consult_messages (thread_id, role, content, created_at)
  VALUES (p_consult_thread_id, 'assistant', p_assistant_message, p_message_created_at)
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
    'reply_consume',
    NULL
  );

  v_thread_credits_remaining := GREATEST(0, v_avail_after);
  v_thread_state := CASE WHEN v_thread_credits_remaining <= 0 THEN 'read_only' ELSE 'writable' END;
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
    status = 'succeeded',
    user_message_id = v_user_msg_id,
    assistant_message_id = v_asst_msg_id,
    wallet_id = v_wallet_id,
    wallet_before = v_avail_before,
    wallet_after = v_avail_after,
    updated_at = now()
  WHERE id = v_commit_id;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'consumed',
    'consumption_applied', true,
    'wallet_before', v_avail_before,
    'wallet_after', v_avail_after,
    'thread_state', v_thread_state,
    'thread_credits_remaining', v_thread_credits_remaining,
    'thread_credits_total', v_thread_credits_total,
    'assistant_content', p_assistant_message
  );
EXCEPTION
  WHEN OTHERS THEN
    IF v_commit_id IS NOT NULL THEN
      UPDATE consult_send_commits
      SET status = 'failed', updated_at = now()
      WHERE id = v_commit_id AND status = 'pending';
    END IF;
    RAISE;
END;
$function$;
COMMENT ON FUNCTION public.m55_consult_reply_commit IS
  'Atomically commits consult send: idempotency, messages, scoped wallet decrement, reply_consume ledger with consult_commit_id, thread display sync.';
ALTER FUNCTION "public"."m55_consult_reply_commit"(text, uuid, uuid, text, text, text, timestamp with time zone) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."m55_consult_reply_commit"(text, uuid, uuid, text, text, text, timestamp with time zone) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."m55_consult_reply_commit"(text, uuid, uuid, text, text, text, timestamp with time zone) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."m55_consult_reply_commit"(text, uuid, uuid, text, text, text, timestamp with time zone) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."m55_consult_reply_commit"(text, uuid, uuid, text, text, text, timestamp with time zone) TO "service_role";

CREATE OR REPLACE FUNCTION public.m55_reply_generate_commit(p_user_id text, p_reply_session_id uuid, p_payload_json jsonb, p_theme text, p_generator_version text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'user_id required'
    );
  END IF;

  IF p_reply_session_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'reply_session_id required'
    );
  END IF;

  IF p_theme IS NULL OR length(trim(p_theme)) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'theme required'
    );
  END IF;

  IF p_payload_json IS NULL OR jsonb_typeof(p_payload_json) <> 'object' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'INVALID_ARGUMENT',
      'message', 'payload_json must be object'
    );
  END IF;

  IF (p_payload_json->>'theme') IS DISTINCT FROM p_theme THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'PAYLOAD_THEME_MISMATCH',
      'message', 'payload_json.theme must match p_theme'
    );
  END IF;

  SELECT user_id, status, theme
  INTO v_sess_user, v_sess_status, v_sess_theme
  FROM reply_sessions
  WHERE id = p_reply_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'SESSION_NOT_FOUND',
      'message', 'Session not found'
    );
  END IF;

  IF v_sess_user IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'SESSION_USER_MISMATCH',
      'message', 'Session user mismatch'
    );
  END IF;

  IF v_sess_theme IS DISTINCT FROM p_theme THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'THEME_MISMATCH',
      'message', 'theme does not match session'
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
        'ok', true,
        'mode', 'replay',
        'reply_document_id', v_doc_id,
        'wallet_before', 0,
        'wallet_after', 0,
        'consumption_applied', false
      );
    END IF;

    RETURN jsonb_build_object(
      'ok', true,
      'mode', 'replay',
      'reply_document_id', v_doc_id,
      'wallet_before', v_avail_before,
      'wallet_after', v_avail_before,
      'consumption_applied', false
    );
  END IF;

  SELECT id, available_count, status
  INTO v_wallet_id, v_avail_before, v_wstatus
  FROM reply_ticket_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'FORBIDDEN',
      'message', 'Wallet not found'
    );
  END IF;

  IF v_wstatus <> 'active' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'FORBIDDEN',
      'message', 'Wallet not active'
    );
  END IF;

  IF v_avail_before <= 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'FORBIDDEN',
      'message', 'No available replies'
    );
  END IF;

  IF v_sess_status NOT IN ('accepted', 'generating', 'failed') THEN
    IF v_sess_status = 'cancelled' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error_code', 'FORBIDDEN',
        'message', 'Session cancelled'
      );
    END IF;
    RETURN jsonb_build_object(
      'ok', false,
      'error_code', 'SESSION_NOT_CONSUMABLE',
      'message', 'Session status does not allow consume'
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
    '1.1',
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
        'ok', false,
        'error_code', 'INTERNAL_RACE',
        'message', 'Document insert race failed'
      );
    END IF;

    SELECT available_count INTO v_avail_before
    FROM reply_ticket_wallets
    WHERE id = v_wallet_id;

    RETURN jsonb_build_object(
      'ok', true,
      'mode', 'replay',
      'reply_document_id', v_doc_id,
      'wallet_before', v_avail_before,
      'wallet_after', v_avail_before,
      'consumption_applied', false
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
    'reply_consume',
    NULL
  );

  UPDATE reply_sessions
  SET
    status = 'succeeded',
    updated_at = now()
  WHERE id = p_reply_session_id;

  RETURN jsonb_build_object(
    'ok', true,
    'mode', 'consumed',
    'reply_document_id', v_doc_id,
    'wallet_before', v_avail_before,
    'wallet_after', v_avail_after,
    'consumption_applied', true
  );
END;
$function$;
COMMENT ON FUNCTION public.m55_reply_generate_commit IS
  'Atomically persists reply document, decrements wallet, records reply_consume ledger, completes session; replay when document already exists (no double consume).';
ALTER FUNCTION "public"."m55_reply_generate_commit"(text, uuid, jsonb, text, text) OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."m55_reply_generate_commit"(text, uuid, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."m55_reply_generate_commit"(text, uuid, jsonb, text, text) TO "anon";
GRANT EXECUTE ON FUNCTION "public"."m55_reply_generate_commit"(text, uuid, jsonb, text, text) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."m55_reply_generate_commit"(text, uuid, jsonb, text, text) TO "service_role";

ALTER TABLE public."consult_threads" OWNER TO "postgres";
ALTER TABLE public."dtr_guest_drafts" OWNER TO "postgres";
ALTER TABLE public."dtr_report_snapshots" OWNER TO "postgres";
ALTER TABLE public."entitlement_rights" OWNER TO "postgres";
ALTER TABLE public."entitlements" OWNER TO "postgres";
ALTER TABLE public."failed_fulfillments" OWNER TO "postgres";
ALTER TABLE public."one_time_fulfillments" OWNER TO "postgres";
ALTER TABLE public."reply_sessions" OWNER TO "postgres";
ALTER TABLE public."reply_ticket_wallets" OWNER TO "postgres";
ALTER TABLE public."stripe_events" OWNER TO "postgres";
ALTER TABLE public."stripe_processed_events" OWNER TO "postgres";
ALTER TABLE public."consult_messages" OWNER TO "postgres";
ALTER TABLE public."reply_documents" OWNER TO "postgres";
ALTER TABLE public."consult_send_commits" OWNER TO "postgres";
ALTER TABLE public."reply_wallet_ledgers" OWNER TO "postgres";

COMMIT;

