WITH tracked(relation_name) AS (
  VALUES
  ('consult_messages'::text),
  ('consult_send_commits'::text),
  ('consult_threads'::text),
  ('dtr_guest_drafts'::text),
  ('dtr_report_snapshots'::text),
  ('entitlement_rights'::text),
  ('entitlements'::text),
  ('failed_fulfillments'::text),
  ('one_time_fulfillments'::text),
  ('reply_documents'::text),
  ('reply_sessions'::text),
  ('reply_ticket_wallets'::text),
  ('reply_wallet_ledgers'::text),
  ('stripe_events'::text),
  ('stripe_processed_events'::text),
  ('clerk_webhook_events'::text)
),
existing AS (
  SELECT t.relation_name
  FROM tracked t
  INNER JOIN pg_class c ON c.relname = t.relation_name
  INNER JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  WHERE c.relkind = 'r'
),
count_rows AS (
  SELECT
    e.relation_name,
    xpath(
      '/row/row_count/text()',
      query_to_xml(
        format('SELECT count(*)::bigint AS row_count FROM %I.%I', 'public', e.relation_name),
        false,
        true,
        ''
      )
    ) AS row_count_nodes
  FROM existing e
),
parsed AS (
  SELECT
    cr.relation_name,
    CASE
      WHEN cardinality(cr.row_count_nodes) = 1
        AND (cr.row_count_nodes[1])::text ~ '^[0-9]+$'
      THEN (cr.row_count_nodes[1])::text::bigint
      ELSE (('m55_invalid_' || cr.relation_name))::bigint
    END AS row_count_bigint
  FROM count_rows cr
),
bounded AS (
  SELECT
    p.relation_name,
    p.row_count_bigint::int AS row_count_int
  FROM parsed p
)
SELECT COALESCE(
  jsonb_object_agg(b.relation_name, b.row_count_int ORDER BY b.relation_name),
  '{}'::jsonb
)::text AS application_relation_counts
FROM bounded b;
