# M55 Preview Baseline Implementation Contract v1

**Revision:** `M55-PREVIEW-BASELINE-IMPLEMENTATION-CONTRACT-v1-REVISION-7`
**Strategy:** `PREVIEW_ONLY_BASELINE_PLUS_ORIGINAL_CANONICAL_CHAIN`
**Generator:** `preview-baseline-tool-v7` (`scripts/m55/previewBaselineTool.ts`)
**Static readiness:** `STATIC_READY_EXECUTION_VALIDATION_REQUIRED`

## 1. Purpose

Establish a Preview-only P1 baseline (`20260614000000`) aligned to Production PATCH-4 + P3 evidence, plus a byte-identical canonical migration chain `20260615000001`–`20260615000006`, without modifying `supabase/migrations` canonical sources or applying SQL to any database in this gate.

## 2. Revision history disposition

### Revision-5 (fixed in Revision-6)

| ID | Defect | Revision-6 disposition |
|---|---|---|
| R6-1 | Internal triggers falsely bound to exact FK IDs by sort order | `InternalTriggerSemanticGroup` equivalence classes; ambiguous groups retain `candidate_constraint_contract_ids` only |
| R6-2 | Raw inventory relation not verified against parsed ON relation | `parseInternalTriggerStrict` fail-closed on inventory mismatch |
| R6-3 | Authoritative trigger fields used fallbacks | No fallback for definition/function/schema/enabled/classification/event/ON relation |
| R6-4 | State transition coverage compared `transition_id` only | `stateTransitionFingerprint` includes from/to/version/row_count/history_prefix |
| R6-5 | Absence coverage ignored `state` | `stateSpecificAbsenceFingerprint` as `state\|object` |
| R6-6 | Wallet coverage trusted stored fingerprint only | Recompute from `actual_json`; verify stored fingerprint integrity |
| R6-7 | Function coverage omitted algorithm/parity status | `functionIdentityFingerprintV6` + `functionParityPendingFingerprint` |
| R6-8 | Harness revision out of sync with tool | Help/comment derived from `HARNESS_REVISION` and `EXECUTE_LOCAL_DISABLED_ERROR` |
| R6-9 | Mutation tests did not prove raw assignment path | Raw inventory move, FK/trigger order reversal, ambiguous group exposure tests |

### Revision-4 (fixed in Revision-5)

| ID | Defect | Revision-5 disposition |
|---|---|---|
| R5-1 | Internal trigger identity under-specified (function name only) | Structured semantic records with relation/event/timing |
| R5-2 | Relation coverage compared cell IDs only | `relationSecurityFingerprint` compares owner/RLS/force values |
| R5-3 | `functions_identity` bypassed normalized matrix | Actual fingerprints from matrix `functions[]` operational fields |
| R5-4 | `functions_body_source_provenance` dropped extraction fields | Full `functionSourceFingerprint` on matrix `function_sources[]` |
| R5-5 | `cleanWorkspace` lacked full safety verification | `verifyWorkspaceForCleanup` before `rmSync` |
| R5-6 | FK fields used silent fallbacks | `validateForeignKeyRecord` fail-closed, exact 10 FK count |
| R5-7 | Internal trigger tests lacked relation reassignment | Relation/enabled_state mutation tests |
| R5-8 | Output-connected mutation suite incomplete | `evaluateSerializedMatrixCoverage` + per-category mutations |

## 3. Immutable source evidence

| artifact_id | path | SHA-256 | bytes | newlines |
|---|---|---:|---:|---:|
| `GAP_DIAGNOSTIC_PATCH4_RESULT` | `docs/planning/preview-baseline/source/m55_production_gap_diagnostic_patch4_result.raw` | `59095b8fa0ed5c386a5127ef612eae3f08efc1ca519348fc169cba54b5827c9f` | 1078883 | 2 |
| `CONTRACT_FREEZE_P3_COLUMN_RESULT` | `docs/planning/preview-baseline/source/m55_production_contract_freeze_p3_columns_result.raw` | `8cb8e4f685fad93e7669f2e053f32624ce019066ec07dfb7437621dc9f4f3ed9` | 98669 | 142 |

Evidence bundle SHA-256: `2ef8b8375f1b92379a13c4c38cba5650e93085e38130a77196246f77f14629e0`

## 4. Revision synchronization (REVISION-7)

| artifact | revision constant |
|---|---|
| Generator | `preview-baseline-tool-v7` / `GENERATOR_VERSION=7` |
| Matrix | `PREVIEW-BASELINE-CONTRACT-MATRIX-v1-REVISION-7` |
| SQL header | `PREVIEW-BASELINE-SQL-v1-REVISION-7` |
| Manifest | `PREVIEW-BASELINE-MANIFEST-v1-REVISION-7` |
| Harness | `PREVIEW-BASELINE-DISPOSABLE-FIXTURE-v1-REVISION-7` |
| SSOT | `M55-PREVIEW-BASELINE-IMPLEMENTATION-CONTRACT-v1-REVISION-7` |

## 5. Portable internal trigger contract

Layer A — raw inventory integrity (40 internal triggers):
- inventory relation must equal parsed ON relation
- definition, function_name, function_schema, enabled_state, trigger_classification required (no fallbacks)

Layer B — semantic equivalence classes (`internal_trigger_semantic_groups`):
- group key excludes constraint ID
- `binding_status`: `UNAMBIGUOUS` or `AMBIGUOUS_EQUIVALENCE_CLASS`
- ambiguous groups expose `candidate_constraint_contract_ids`; `exact_constraint_contract_id` is null
- OID trigger names remain evidence-only in `internal_trigger_inventory`

## 6. Output-connected fingerprints

Coverage compares authoritative evidence/source registries to normalized matrix output via:
- `relationSecurityFingerprint`
- `functionIdentityFingerprintV6`
- `functionSourceFingerprint`
- `internalTriggerSemanticGroupFingerprint` (multiset by group count)
- `stateTransitionFingerprint`
- `stateSpecificAbsenceFingerprint`
- `walletFingerprintFromNormalizedOutput`

`evaluateSerializedMatrixCoverage(authoritativeInputs, serializedMatrix)` re-evaluates coverage from emitted matrix JSON.

## 7. Cleanup safety

`cleanWorkspace` calls `verifyWorkspaceForCleanup` (read-only full integrity check) before deletion. Any mismatch refuses cleanup and leaves the workspace untouched.

## 8. Coverage status model

`functions_body_production_parity` remains `PENDING_EXECUTION` only. All other static categories must be `COMPLETE`.

## 9. Tests

Run: `node --test lib/m55/previewBaseline*.local.test.ts`
Typecheck: `npx tsc --noEmit`

## 10. Prohibitions

- No Production/Preview SQL execution
- No DB connection, container, migration apply
- No stage/commit/push in this gate
- Disposable DB execution remains unauthorized

## 11. Execution oracle (PREVIEW-BASELINE-EXECUTION-ORACLE-v1-PATCH-1)

Static P0–P7 semantic oracle at `docs/planning/preview-baseline/preview_baseline_execution_oracle_v1.json`.

- `deriveExecutionOracle` / `buildExecutionOracle` / `verifyExecutionOracle` are pure/static (no DB, no container).
- P1 derives from pinned Revision-7 matrix/manifest without semantic loss.
- P2–P7 derive semantic deltas from byte-exact canonical migrations `20260615000001`–`20260615000006`.
- Each phase exposes `oracle_contract_hash` (static semantic contract) and leaves `runtime_snapshot_hash=null`, `runtime_validation_status=NOT_RUN`.
- Function parity uses `definition_character_length` (PostgreSQL `length(text)` authority), not UTF-8 byte length.
- Fixture marker contract uses schema `m55_fixture_meta.fixture_identity` (not `public`).
- Connection contract accepts Unix socket (`inet_server_addr()` null) or TCP loopback (`127.0.0.1` / `::1`).

## 12. Disposable execution runtime (REVISION-4)

Module: `scripts/m55/previewBaselineDisposableRuntime.ts`

- Revision: `PREVIEW-BASELINE-DISPOSABLE-RUNTIME-v1-REVISION-4`
- Strategy: `DOCKER_EXEC_ISOLATED_NO_HOST_PORT`
- Pinned image: `postgres@sha256:5d11ffb37e58a7c9a2285359e50f7674e216c99b9114e47b0e7f21187c11252c`
- Platform: `linux/arm64` with `--network none`, no host port, no bind mount, tmpfs data dir, immutable M55 labels
- PostgreSQL init: child env supplies `POSTGRES_PASSWORD` (merged with host env); password never in argv/report/log
- All PostgreSQL access via `docker exec` / `docker exec -i ... psql --no-align --tuples-only --quiet` with single-line JSON parsing
- P0 JSON preflight validation + P0–P7 full-category oracle snapshot compare (`SNAPSHOT_COMPARE_CATEGORIES`)
- Function parity parses actual `md5` + PostgreSQL `length(text)`; no fabricated PASS
- Migration apply re-verifies SHA/bytes/lines immediately before each stdin stream (TOCTOU closed)
- Container lifecycle: `NOT_CREATED` → `CREATED` → `REMOVED`; cleanup inspects labels, proves post-rm absence, no cleanup before run
- Readiness: bounded retry (`READINESS_MAX_ATTEMPTS` × `READINESS_INTERVAL_MS`)
- No exported mutation-capable executor API; `executeDisposablePlanInternal` remains module-private; tests use `executeDisposablePlanWithInjectedRunner` only
- `EXECUTION_ENABLEMENT_STATUS = IMPLEMENTED_REVIEW_REQUIRED_NOT_AUTHORIZED`
- Runtime catalog extraction via `collectRuntimeCatalogSql` + `deriveRuntimePhaseSnapshot` (no oracle-clone snapshots)
- `forbidden_violations` evaluated against catalog; Docker read-only evidence via `collectDockerReadOnlyEvidence`
- Child env allowlist strips inherited cloud/PG secrets; only ephemeral `POSTGRES_PASSWORD`/`PGPASSWORD` are injected
- CLI `--execute-local` exits `local_execution_implemented_but_not_authorized_revision_4`
- P0 application row counts use `pg_class` existence discovery plus per-relation exact `COUNT(*)`; missing tracked relations never cause `undefined_table`
- FK catalog normalization includes match/delete/update actions, target schema/relation, and ordered source/target columns
- Index `constraint_backed` is true only when `pg_constraint.conindid` matches; standalone unique indexes remain false
- Internal FK trigger semantic groups derive from `tgconstraint` → `pg_constraint` catalog rows (34 frozen groups)
- Function config fingerprints preserve `provolatile`, `proparallel`, exact `proconfig[]`, and `search_path`
- Trigger `enabled_state` preserves PostgreSQL `tgenabled` codes (e.g. `O`); no `ENABLED` conversion
- State object presence resolves relations, functions, dotted columns, constraint/index names, and `app.user_profiles`
- Happy-path execution uses independently-authored catalog fixtures; no oracle clone or `catalog_row_seed` shortcut
- Docker read-only evidence rejects inherited `DOCKER_HOST`, uses `docker context show`, runs all read-only commands with explicit `docker --context <ctx>`; only approved Docker Desktop local socket endpoints pass; metadata env excludes DB password
- Image absence classification accepts only exact `No such image`; generic not-found/daemon errors fail
- Migration authority re-derives from frozen manifest/workspace; supplied attacker paths/SHA overrides fail closed

## 13. Next gate

`CATEGORY-1-M55-ACCOUNT-DELETION-PREVIEW-DB-BASELINE-LOCAL-DISPOSABLE-EXECUTION-HUMAN-ENABLEMENT`

Static code status: **STATIC CODE READY / ACTUAL DISPOSABLE EXECUTION REQUIRED**

Runtime GREEN is not claimed before one actual local disposable PostgreSQL 17.6 run using the pinned digest.

## Revision-7 static coverage closure

Revision-7 separates static prerequisites from runtime validation. The sole approved pending category, `functions_body_production_parity`, may be `PENDING_EXECUTION` only when its authoritative PATCH-4 identities, MD5 hashes, lengths, algorithms, source provenance, and per-function pending status are all statically exact. Invalid static data is `FAILED`, never pending.

Serialized matrix coverage includes relation security, columns, constraints, indexes, policies, privileges, user-defined triggers, internal-trigger semantic groups, the exact evidence-only internal-trigger inventory, functions, function sources, wallet scope, the ordered P0–P7 state registry, state-specific presence, state-specific absence, and transitions. No emitted contract component in this registry is outside semantic coverage.

Function normalization is fail-closed: authoritative PATCH-4 properties are required by presence and type. No fallback is permitted for resolved identity arguments, definition-hash algorithm, `proconfig`, search path, parallel safety, counts, or execute ACL booleans.

Coverage entries record `static_prerequisites_pass` and `runtime_validation_status`. For the pending function-body comparison the required state is `static_prerequisites_pass=true`, `runtime_validation_status=NOT_RUN`, and zero missing, duplicate, or unexpected identities.

## Execution Oracle PATCH-1 closure

`PREVIEW-BASELINE-EXECUTION-ORACLE-v1-PATCH-1` closes the pre-execution oracle defects found during independent actual-file review:

- `state_specific_presence` and `state_specific_absence` are phase-local assertions. They contain no future-state leakage, stale phase labels, or duplicate entries.
- tracked relation, column, constraint, index, and function `present`/`absent` arrays are exact complements of one frozen tracked universe across P0–P7.
- P2 `failed_fulfillments.user_ref_hash` and all P3 `clerk_webhook_events` columns use the same eight-field column fingerprint format as P1, including exact ordinal positions.
- P3 includes the constraint-backed `clerk_webhook_events_pkey` index expected from the primary key.
- the oracle remains a static semantic contract; runtime snapshots and function body parity remain `NOT_RUN`.

## Execution Runtime Revision-2 closure

Revision-2 closes disposable runtime false-GREEN findings from independent actual-file review:

- `POSTGRES_PASSWORD` is supplied through merged child process env, not argv inheritance of an empty key.
- psql output is machine-readable (`--tuples-only`) and parsed as exactly one JSON object per query.
- P0 preflight JSON is validated field-by-field before any migration apply.
- Runtime snapshots compare the full `SNAPSHOT_COMPARE_CATEGORIES` registry for P0 and P1–P7.
- Function parity compares parsed PostgreSQL MD5/character-length actuals; never synthesizes expected values.
- Migration bytes are re-verified immediately before each apply.
- Container cleanup requires M55 labels, lifecycle state `CREATED`, inspect-before-rm, and post-rm absence proof.

## Execution Runtime Revision-3 closure

Revision-3 closes Revision-2 independent-review RED/HOLD findings without redesign:

- `docker run` argv includes `-e` / `POSTGRES_PASSWORD` key forwarding; password value remains only in child env.
- `collectRuntimeCatalogSql` extracts every `RUNTIME_CATALOG_EXTRACTORS` category from PostgreSQL catalog queries; `deriveRuntimePhaseSnapshot` normalizes actual rows and derives present/absent complements.
- `forbidden_violations` evaluates Oracle `forbidden_delta` registry against actual catalog state; PASS requires an empty violation list.
- P0 preflight uses `current_database()`, validates full marker fields (`fixture_revision`, `oracle_revision`, `migration_tuple_hash`, `local_only_assertion`), and exact one marker row.
- Function parity binds `pg_get_function_identity_arguments(p.oid)` to exact PATCH-1 identities; duplicate/missing overloads fail closed.
- `--verify-frozen-inputs` collects read-only Docker evidence (`version`, `buildx version`, `image inspect`); image-not-present is allowed without pull/run/create/rm.
- Child env uses an explicit allowlist; inherited `DATABASE_URL`, `SUPABASE*`, `CLERK*`, `STRIPE*`, and host PG variables are stripped.
- Cleanup absence proof accepts only exact “No such object” or filtered empty `docker ps -a`; daemon/permission errors fail cleanup proof.
- Execution plan templates are rebound to the active creation nonce before run; nonce mismatch fails closed.
- GREEN runtime reports require P0–P7 PASS, complete category registries, function parity actuals, valid cleanup proof, and lifecycle `REMOVED`.

## Execution Runtime Revision-4 closure

Revision-4 closes Revision-3 independent-review blockers with minimal delta only:

- P0 application counts query only relations confirmed in `pg_class`; no direct `FROM public.<missing>` references.
- FK normalization exports match/delete/update actions, target schema/relation, and ordered column lists with validated/deferrable flags.
- Index `constraint_backed` binds exclusively to `pg_constraint.conindid`; standalone unique indexes stay false.
- Internal trigger semantic groups rebuild from actual `internal_trigger_catalog_rows` via `tgconstraint` binding (34 groups, exact ambiguous/unambiguous rules).
- Function and trigger catalog rows preserve PostgreSQL-native volatility/parallel/config/enabled codes without semantic renaming.
- State-specific presence/absence resolves dotted columns, constraint/index names, and `app.*` relations with fail-close on invalid syntax.
- Execution happy path removes oracle clone / `catalog_row_seed`; tests use matrix-independent catalog fixtures.
- `obtainDisposableTestAuthority` export removed; only in-test `createTestDisposableExecutor(local.test url)` can reach the executor.
- Docker metadata collection verifies local Unix-socket context; remote endpoints and non-exact image-absence errors fail closed without password injection.
- Success reports enforce exact ordered P0–P7, category set, nonempty snapshot hashes, function identity order, and cleanup absence proof.
- Migration apply always re-derives from frozen manifest/workspace; external plan/path SHA injection is not authority.

## Execution Runtime REVISION-4-PATCH-1 closure

`REVISION-4-PATCH-1` closes independent REV4 delta-review residual blockers only; D2/D3/D5/D6/D7/D11/D13/D14 remain fixed.

- P1 application row counts use session-local `pg_temp` bootstrap with `pg_class` existence checks and exact `EXECUTE format('SELECT count(*) FROM %I.%I', ...)` per tracked relation (`REQUIRED_RELATIONS` + `clerk_webhook_events`); `pg_stat_user_tables.n_live_tup` is not used.
- P2 PUBLIC table privileges derive from `aclexplode` grantee OID `0`; `has_table_privilege('PUBLIC', ...)` is not used.
- P3 internal FK trigger `constraint_contract_id` always uses `con.conrelid` source schema/relation; trigger relation and side remain catalog-accurate.
- P4 happy-path fixtures are matrix/literal catalog rows; `buildMatrixIndependentCatalogFixture` is not exported; production runtime has no oracle-clone catalog constructor.
- P5 no exported function reaches `executeDisposablePlanInternal`; `createTestDisposableExecutor` removed; `oraclePhases` / `migrationBytesOverride` are not public execution seams.
- P6 Docker read-only proof rejects inherited `DOCKER_HOST`, obtains active context via `docker context show`, and executes read-only commands only as `docker --context <validated_context>` against approved Docker Desktop local socket endpoints.
- P7 `validateExecutionReportSuccess` requires nonempty `oracle_contract_hash`, exact per-phase history prefixes, exact function hash/length actuals, and `cleanup_proof.container_removed=true`.

## Execution Runtime REVISION-4-PATCH-2-FINAL-STATIC closure

`REVISION-4-PATCH-2-FINAL-STATIC` closes actual-execution SQL blockers and test-truthfulness gaps only.

- S1 application relation count bootstrap uses `jsonb` accumulator and `jsonb_build_object`; no `json` `||` concatenation.
- S2 PUBLIC ACL compares `upper(aclexplode.privilege_type)` to frozen privilege tokens.
- S3 `pg_policies` roles canonicalize lowercase `public` pseudo-role to frozen `PUBLIC` with stable ordering.
- T1 tests remove Oracle-decoded happy-path catalog fixtures (`FROZEN_LITERAL_CATALOG_BY_PHASE`); matrix literals and deliberate small raw fixtures only.
- T2 `executeDisposablePlanWithInjectedRunner` is the sole test-only injected-runner entry point to the production executor; duplicated harness removed.
- T3 `buildRawCatalogFromOraclePhase` export removed; decoder utility remains isolated from execution/happy path.
- Full P0–P7 runtime GREEN remains **PENDING_HUMAN_DISPOSABLE_EXECUTION** until actual Docker/PostgreSQL run.

## Execution Runtime REVISION-4-PATCH-3 closure

`REVISION-4-PATCH-3` fixes the final pre-execution function ACL blocker: PUBLIC EXECUTE is derived from `pg_proc.proacl` via `aclexplode` with grantee OID `0`; `has_function_privilege('public', ...)` is prohibited because PUBLIC is a pseudo-role rather than a normal role lookup target. Static status remains **STATIC CODE READY / ACTUAL DISPOSABLE EXECUTION REQUIRED**.


## Local disposable execution correction after first concrete run

The first Human-approved local disposable run failed closed before P0 snapshot with two concrete compatibility findings. The correction is limited to those findings:

- `docker context show` is invoked without the unsupported `--format` flag; the trimmed stdout remains the active context authority.
- P0 accepts a packaged PostgreSQL server label beginning with the exact frozen `17.6` token, while `server_version_num=170006` remains an exact mandatory check. Labels for a different version remain rejected.
- No baseline, migration, manifest, matrix, Oracle, image digest, phase order, or Preview/Production contract changes are introduced.

## Local disposable execution correction after Retry-1

The first retry passed P0 preflight and then failed closed at `p0_snapshot` because the user-defined-trigger extractor selected `fn.nspname` from `pg_proc`. PostgreSQL stores the function namespace OID in `pg_proc.pronamespace`; `pg_proc` has no `nspname` column.

The concrete correction joins `pg_namespace fn_ns ON fn_ns.oid = fn.pronamespace` and emits `fn_ns.nspname AS function_schema`. No baseline, migration, manifest, matrix, Oracle, image digest, phase order, or Preview/Production contract changes are introduced. Runtime GREEN remains pending a separately authorized local retry.

## Local disposable execution correction after Retry-2 (baseline DDL order)

Retry-2 passed P0 preflight and snapshot, then failed closed at `p1_apply` because the generated P1 baseline emitted composite FK `reply_documents_session_theme_fk` before standalone unique index `reply_sessions_id_theme_key`. PostgreSQL requires the referenced `(id, theme)` unique index to exist before the composite FK can be added.

The generator now classifies standalone non-partial unique indexes whose key columns exactly match a generated FK target as `pre_fk_prerequisite_indexes`, emitting them after non-FK constraints and before FK constraints. For the current P1 matrix the registry is exactly `reply_sessions_id_theme_key`. DDL statement definitions and final catalog semantics are unchanged; only statement order changes. Matrix SHA and per-phase `oracle_contract_hash` values remain unchanged; baseline, manifest, and top-level execution-oracle identity hashes update from regeneration only.


## Local P1 catalog fingerprint correction after diagnostic

The exact P1 diagnostic reproduced only four comparison mismatches: constraint present/absent and index present/absent. Constraint names and counts were identical; all 29 constraint pairs differed only because runtime used the non-pretty `pg_get_constraintdef(con.oid)` form while the frozen Production inventory uses the pretty deparse form. Runtime catalog extraction now uses `pg_get_constraintdef(con.oid, true)`.

The sole index pair was `reply_sessions_id_theme_key`. PostgreSQL records the referencing foreign key's supporting index in `pg_constraint.conindid`, but this does not make that standalone unique index constraint-backed. Runtime `constraint_backed` now considers only owning primary, unique, or exclusion constraints (`contype IN ('p','u','x')`), excluding foreign keys. Baseline, matrix, manifest, Oracle, canonical migration definitions, and phase order are unchanged. Runtime GREEN remains pending the next authorized local disposable execution.

## Production function definition embed (REVISION-8 baseline / manifest)

4-way review classified `A-FORMAT-PROVENANCE-DRIFT` for `public.m55_consult_reply_commit` and `public.m55_reply_generate_commit`. Production `pg_get_functiondef` bodies embed CRLF; canonical migration sources remain provenance-only. Frozen evidence:

| artifact_id | path | SHA-256 | bytes | newlines |
|---|---|---:|---:|---:|
| `PRODUCTION_FUNCTION_DEFINITION_EXPORT_v1` | `docs/planning/preview-baseline/source/m55_production_function_definition_export_v1.json` | `af13d58b7b30cbb8f750d9077e28c3ac27f17b49732c3418f2fb89c7afcb7eb9` | 18495 | 1 |

Post-regeneration artifact identities (matrix semantics unchanged):

| artifact | SHA-256 |
|---|---|
| baseline P1 SQL | `a897251fe465294918f69aad5a2fc120fb594c71d5f51cbfd90eb1a36aec01f0` |
| contract matrix | `d5d34b135acabe3cd7fc41144069d9deee133472810264e1b397cf5bd3a19257` |
| manifest | `5c698f95448f823bf19bd12f44f36ea07d3c52befcf903708ab6d65442f37e20` |
| execution oracle | `52832c14d55bba8b6194065aa17901c7373d39d208e8175781d729be17855062` |

Production function parity frozen targets remain `6a157d3b1d54ff91c85fceac209e4b26` / `9635` and `4a9ce16d8fad737c10a7cf8b15ea94fe` / `6141`. Baseline SQL header/manifest revision: `REVISION-8`. Matrix revision stays `REVISION-7`. `.gitattributes` marks baseline SQL `-text` so embedded CRLF bytes are not normalized on checkout.

### P2 constraint canonicalization (2026-06-12)

`buildP2Phase` now pins `failed_fulfillments_user_ref_hash_format_check` to the runtime extractor contract:

`public|failed_fulfillments|failed_fulfillments_user_ref_hash_format_check|c|CHECK (user_ref_hash IS NULL OR user_ref_hash ~ '^[0-9a-f]{16}$'::text)|true|false|false| | | |||user_ref_hash|`

This matches `pg_get_constraintdef(con.oid, true)`, non-FK metadata single-space placeholders, and `source_columns=user_ref_hash`. Stale `pretty=false` parentheses and empty `source_columns` fingerprints are absent from P2 present/absent complements. P3–P7 inherit the corrected fingerprint exactly once via phase chaining plus complement normalization.

### P3 constraint canonicalization (2026-06-12)

`buildP3Phase` now pins all five `public.clerk_webhook_events` constraints to the runtime extractor contract (`pg_get_constraintdef(con.oid, true)`, single-space non-FK metadata, ordered `source_columns`, empty `target_columns` tail). Stale `pretty=false` fingerprints are absent from P3 present/absent; P3 `constraints_absent` remains empty. P4–P7 inherit each canonical fingerprint exactly once.

### P4 function_config canonicalization (2026-06-13)

`buildP4Phase` now pins `public.m55_account_deletion_process_v1` `function_config` to the runtime extractor contract: `stableStringify(["search_path=public, pg_temp"])` for the proconfig field and `search_path=public, pg_temp` for the search_path tail. Stale empty `[]` proconfig fingerprints are absent from P4–P7. P0–P3 `function_config` arrays and phase contract hashes remain unchanged.

### P5 fixture role bootstrap (2026-06-13)

`buildRoleBootstrapSql()` in the disposable LOCAL harness now models Production’s frozen `service_role.rolbypassrls = true` precondition: `service_role` is created or altered to `NOLOGIN BYPASSRLS`; `anon` and `authenticated` remain `NOLOGIN NOBYPASSRLS`. Post-bootstrap SQL assertions fail closed on contract violation. Execution reports capture `role_bootstrap_proof` before P1 apply. Oracle, baseline, matrix, manifest, and canonical migrations are unchanged.

### P5 privilege expectation semantics (2026-06-13)

`buildP5Phase` now models the canonical migration’s additive SQL semantics on `public.entitlements` and `public.entitlement_rights`: `REVOKE ALL` from `PUBLIC`, `anon`, and `authenticated`; `GRANT SELECT, INSERT, UPDATE, DELETE` to `service_role`; preserve pre-P5 `service_role` `REFERENCES`, `TRIGGER`, and `TRUNCATE` because the migration does not revoke them. P0–P4 privilege arrays and contract hashes remain unchanged. P5–P7 inherit the corrected privilege state.

### P6 catalog name-array type canonicalization (2026-06-13)

`20260615000005_m55_dtr_visible_report_uniqueness_v1.sql` now casts catalog identifier elements to `text` before `array_agg` wherever the result crosses a `text[]` boundary (`array_agg(a.attname::text ...)`, `array_agg(ic.relname::text ...)`, `array_agg(con.conname::text ...)`). This removes the unapplied migration’s `name[] IS DISTINCT FROM text[]` operator failure without changing predicates, mutation targets, or phase semantics. Migration SHA: `b283aa73ea4b004c006229dfc6afec222b44ea71422b34cb7a3fa3f46862d8f6`.

### P7 catalog name-array type canonicalization (2026-06-13)

`20260615000006_m55_entitlements_unique_index_cleanup_v1.sql` now casts catalog identifier elements to `text` before `array_agg` wherever the result crosses a `text[]` boundary (`array_agg(a.attname::text ...)` ×8, `array_agg(ic.relname::text ...)` ×4, `array_agg(con.conname::text ...)` ×2). This removes the P7 apply `name[] = text[]` operator failure without changing DROP targets (`public.entitlements_user_product_uq`, `public.uq_entitlements_user_product`), canonical constraint `entitlements_user_id_product_id_key`, predicates, or phase semantics. Migration SHA: `c9ddd37396985fdfb116365073a330fbd4b31b4b592f7cec661ec157b2f8903e`.
