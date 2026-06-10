-- M55 Entitlements and Rights — access security v1 (2026-06-15)
-- Purpose: service-role-only access contract for
--   public.entitlements and public.entitlement_rights
--
-- Production evidence:
--   - both relations ordinary tables
--   - owner postgres
--   - RLS true
--   - FORCE RLS false
--   - anon/authenticated direct all-seven grants
--   - no inherited target grants
--   - service_role BYPASSRLS true
--   - entitlements exact public SELECT policy
--   - entitlement_rights policy count zero
--
-- Forbidden in this migration:
--   application-row read/write
--   index cleanup
--   runtime change
--   classifier change

BEGIN;

DO $m55$
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
  v_roles text[] := ARRAY['anon', 'authenticated'];
  v_privileges text[] := ARRAY[
    'SELECT', 'INSERT', 'UPDATE', 'DELETE',
    'TRUNCATE', 'REFERENCES', 'TRIGGER'
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
  WHERE n.nspname = 'public'
    AND c.relname = 'entitlements'
    AND c.relkind = 'r';

  IF v_entitlements_oid IS NULL THEN
    RAISE EXCEPTION 'precondition failed: public.entitlements missing or not ordinary table';
  END IF;

  IF pg_get_userbyid(v_entitlements_owner) <> 'postgres' THEN
    RAISE EXCEPTION 'precondition failed: public.entitlements owner is not postgres';
  END IF;

  IF v_entitlements_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'precondition failed: public.entitlements RLS is not enabled';
  END IF;

  IF v_entitlements_force IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'precondition failed: public.entitlements FORCE RLS is not disabled';
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
  WHERE n.nspname = 'public'
    AND c.relname = 'entitlement_rights'
    AND c.relkind = 'r';

  IF v_rights_oid IS NULL THEN
    RAISE EXCEPTION 'precondition failed: public.entitlement_rights missing or not ordinary table';
  END IF;

  IF pg_get_userbyid(v_rights_owner) <> 'postgres' THEN
    RAISE EXCEPTION 'precondition failed: public.entitlement_rights owner is not postgres';
  END IF;

  IF v_rights_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'precondition failed: public.entitlement_rights RLS is not enabled';
  END IF;

  IF v_rights_force IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'precondition failed: public.entitlement_rights FORCE RLS is not disabled';
  END IF;

  SELECT count(*)::integer
  INTO v_entitlements_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'entitlements';

  SELECT count(*)::integer
  INTO v_entitlements_constraints
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'entitlements';

  SELECT count(*)::integer
  INTO v_entitlements_indexes
  FROM pg_index i
  JOIN pg_class rel ON rel.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'entitlements'
    AND i.indisvalid;

  SELECT count(*)::integer
  INTO v_rights_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'entitlement_rights';

  SELECT count(*)::integer
  INTO v_rights_constraints
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'entitlement_rights';

  SELECT count(*)::integer
  INTO v_rights_indexes
  FROM pg_index i
  JOIN pg_class rel ON rel.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'entitlement_rights'
    AND i.indisvalid;

  -- -------------------------------------------------------------------------
  -- B. Roles exist
  -- -------------------------------------------------------------------------
  IF to_regrole('anon') IS NULL THEN
    RAISE EXCEPTION 'precondition failed: role anon missing';
  END IF;

  IF to_regrole('authenticated') IS NULL THEN
    RAISE EXCEPTION 'precondition failed: role authenticated missing';
  END IF;

  IF to_regrole('service_role') IS NULL THEN
    RAISE EXCEPTION 'precondition failed: role service_role missing';
  END IF;

  -- -------------------------------------------------------------------------
  -- C. service_role BYPASSRLS and core privileges (pre)
  -- -------------------------------------------------------------------------
  SELECT rolbypassrls
  INTO v_service_role_bypass
  FROM pg_roles
  WHERE rolname = 'service_role';

  IF v_service_role_bypass IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'precondition failed: service_role.rolbypassrls is not true';
  END IF;

  FOREACH v_privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
  LOOP
    IF NOT has_table_privilege('service_role', v_entitlements_oid, v_privilege_name) THEN
      RAISE EXCEPTION
        'precondition failed: service_role missing % on public.entitlements',
        v_privilege_name;
    END IF;

    IF NOT has_table_privilege('service_role', v_rights_oid, v_privilege_name) THEN
      RAISE EXCEPTION
        'precondition failed: service_role missing % on public.entitlement_rights',
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
      lower(COALESCE(v_policy_qual, '')),
      '[[:space:]()]',
      '',
      'g'
    );

    IF v_policy_name IS DISTINCT FROM 'Enable read access for all users' THEN
      RAISE EXCEPTION
        'precondition failed: entitlements policy name mismatch: %',
        v_policy_name;
    END IF;

    IF v_policy_cmd IS DISTINCT FROM 'r' THEN
      RAISE EXCEPTION
        'precondition failed: entitlements policy command mismatch: %',
        v_policy_cmd;
    END IF;

    IF v_policy_permissive IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'precondition failed: entitlements policy is not PERMISSIVE';
    END IF;

    IF v_policy_roles IS DISTINCT FROM ARRAY[0::oid] THEN
      RAISE EXCEPTION 'precondition failed: entitlements policy roles are not PUBLIC-only';
    END IF;

    IF v_policy_qual_norm IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION
        'precondition failed: entitlements policy USING mismatch: %',
        v_policy_qual;
    END IF;

    IF v_policy_withcheck IS NOT NULL THEN
      RAISE EXCEPTION 'precondition failed: entitlements policy WITH CHECK is not NULL';
    END IF;
  ELSE
    RAISE EXCEPTION
      'precondition failed: unexpected entitlements policy count %',
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
      'precondition failed: entitlement_rights policy count must be 0, found %',
      v_rights_policy_count;
  END IF;

  -- -------------------------------------------------------------------------
  -- Mutation
  -- -------------------------------------------------------------------------
  IF v_entitlements_policy_count = 1 THEN
    EXECUTE 'DROP POLICY "Enable read access for all users" ON public.entitlements';
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
      'postcondition failed: entitlements policy count % after mutation',
      v_entitlements_policy_count;
  END IF;

  SELECT count(*)::integer
  INTO v_rights_policy_count
  FROM pg_policy p
  WHERE p.polrelid = v_rights_oid;

  IF v_rights_policy_count <> 0 THEN
    RAISE EXCEPTION
      'postcondition failed: entitlement_rights policy count % after mutation',
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
          'postcondition failed: % still has % on public.entitlements',
          v_role_name,
          v_privilege_name;
      END IF;

      IF has_table_privilege(v_role_name, v_rights_oid, v_privilege_name) THEN
        RAISE EXCEPTION
          'postcondition failed: % still has % on public.entitlement_rights',
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
        acldefault('r', v_entitlements_owner)
      )
    ) acl
    WHERE acl.grantee = 0
  ) THEN
    RAISE EXCEPTION 'postcondition failed: PUBLIC ACL remains on public.entitlements';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM aclexplode(
      COALESCE(
        (SELECT c.relacl FROM pg_class c WHERE c.oid = v_rights_oid),
        acldefault('r', v_rights_owner)
      )
    ) acl
    WHERE acl.grantee = 0
  ) THEN
    RAISE EXCEPTION 'postcondition failed: PUBLIC ACL remains on public.entitlement_rights';
  END IF;

  -- -------------------------------------------------------------------------
  -- Postconditions: service_role core + BYPASSRLS
  -- -------------------------------------------------------------------------
  SELECT rolbypassrls
  INTO v_service_role_bypass
  FROM pg_roles
  WHERE rolname = 'service_role';

  IF v_service_role_bypass IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'postcondition failed: service_role.rolbypassrls is not true';
  END IF;

  FOREACH v_privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
  LOOP
    IF NOT has_table_privilege('service_role', v_entitlements_oid, v_privilege_name) THEN
      RAISE EXCEPTION
        'postcondition failed: service_role missing % on public.entitlements',
        v_privilege_name;
    END IF;

    IF NOT has_table_privilege('service_role', v_rights_oid, v_privilege_name) THEN
      RAISE EXCEPTION
        'postcondition failed: service_role missing % on public.entitlement_rights',
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
    RAISE EXCEPTION 'postcondition failed: entitlements relation OID changed';
  END IF;

  IF v_post_owner IS DISTINCT FROM v_entitlements_owner THEN
    RAISE EXCEPTION 'postcondition failed: entitlements owner OID changed';
  END IF;

  IF v_post_relkind IS DISTINCT FROM 'r' THEN
    RAISE EXCEPTION 'postcondition failed: entitlements relkind changed';
  END IF;

  IF v_post_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'postcondition failed: entitlements RLS changed';
  END IF;

  IF v_post_force IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'postcondition failed: entitlements FORCE RLS changed';
  END IF;

  SELECT count(*)::integer
  INTO v_post_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'entitlements';

  IF v_post_columns IS DISTINCT FROM v_entitlements_columns THEN
    RAISE EXCEPTION 'postcondition failed: entitlements column count changed';
  END IF;

  SELECT count(*)::integer
  INTO v_post_constraints
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'entitlements';

  IF v_post_constraints IS DISTINCT FROM v_entitlements_constraints THEN
    RAISE EXCEPTION 'postcondition failed: entitlements constraint count changed';
  END IF;

  SELECT count(*)::integer
  INTO v_post_indexes
  FROM pg_index i
  JOIN pg_class rel ON rel.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'entitlements'
    AND i.indisvalid;

  IF v_post_indexes IS DISTINCT FROM v_entitlements_indexes THEN
    RAISE EXCEPTION 'postcondition failed: entitlements index count changed';
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
    RAISE EXCEPTION 'postcondition failed: entitlement_rights relation OID changed';
  END IF;

  IF v_post_owner IS DISTINCT FROM v_rights_owner THEN
    RAISE EXCEPTION 'postcondition failed: entitlement_rights owner OID changed';
  END IF;

  IF v_post_relkind IS DISTINCT FROM 'r' THEN
    RAISE EXCEPTION 'postcondition failed: entitlement_rights relkind changed';
  END IF;

  IF v_post_rls IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'postcondition failed: entitlement_rights RLS changed';
  END IF;

  IF v_post_force IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'postcondition failed: entitlement_rights FORCE RLS changed';
  END IF;

  SELECT count(*)::integer
  INTO v_post_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'entitlement_rights';

  IF v_post_columns IS DISTINCT FROM v_rights_columns THEN
    RAISE EXCEPTION 'postcondition failed: entitlement_rights column count changed';
  END IF;

  SELECT count(*)::integer
  INTO v_post_constraints
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'entitlement_rights';

  IF v_post_constraints IS DISTINCT FROM v_rights_constraints THEN
    RAISE EXCEPTION 'postcondition failed: entitlement_rights constraint count changed';
  END IF;

  SELECT count(*)::integer
  INTO v_post_indexes
  FROM pg_index i
  JOIN pg_class rel ON rel.oid = i.indrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'entitlement_rights'
    AND i.indisvalid;

  IF v_post_indexes IS DISTINCT FROM v_rights_indexes THEN
    RAISE EXCEPTION 'postcondition failed: entitlement_rights index count changed';
  END IF;
END
$m55$;

COMMIT;
