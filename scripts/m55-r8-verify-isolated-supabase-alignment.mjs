#!/usr/bin/env node
import {
  alignmentFailureChecklistV1,
  createDefaultLocalStackDockerBindingInspectorV1,
  evaluateIsolatedSupabaseAlignmentLiveV1,
  evaluateIsolatedSupabaseLocalStackVerificationLiveV1,
  listIsolatedSupabaseAlignmentChecklistV1,
  loadM55R8IsolatedAlignmentEnvV1,
  localStackVerificationFailureChecklistV1,
  M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1,
  M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1,
} from '../lib/m55/creatorProvider/r8IsolatedSupabaseAlignment.ts';

const localStackVerification = process.argv.includes('--local-stack-verification');
const inspectLocalStackDockerBindingV1 = createDefaultLocalStackDockerBindingInspectorV1();

const loaded = loadM55R8IsolatedAlignmentEnvV1(process.cwd(), process.env, {
  projectRefOptionalV1: localStackVerification,
});
if (!loaded.ok) {
  console.error('M55_R8_ISOLATED_SUPABASE_ALIGNMENT_FAILED');
  for (const line of loaded.checklist) console.error(`- ${line}`);
  process.exit(2);
}

console.error(`M55_R8_ISOLATED_ENV: ${loaded.envFile}`);

const structural = listIsolatedSupabaseAlignmentChecklistV1(loaded.env, {
  allowLocalStackUnconfirmedProjectRefV1: localStackVerification,
});
if (structural.length > 0) {
  console.error('M55_R8_ISOLATED_SUPABASE_ALIGNMENT_FAILED');
  for (const line of structural) console.error(`- ${line}`);
  process.exit(2);
}

if (localStackVerification) {
  const stackProjectId = loaded.env[M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1]?.trim() ?? '';
  if (!stackProjectId) {
    console.error('M55_R8_ISOLATED_SUPABASE_LOCAL_STACK_VERIFICATION_FAILED');
    for (const line of localStackVerificationFailureChecklistV1(
      'LOCAL_STACK_STACK_PROJECT_ID_MISSING',
    )) {
      console.error(`- ${line}`);
    }
    process.exit(2);
  }

  const dockerNetwork =
    loaded.env[M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1]?.trim() ?? '';
  if (!dockerNetwork) {
    console.error('M55_R8_ISOLATED_SUPABASE_LOCAL_STACK_VERIFICATION_FAILED');
    for (const line of localStackVerificationFailureChecklistV1(
      'LOCAL_STACK_STACK_DOCKER_NETWORK_MISSING',
    )) {
      console.error(`- ${line}`);
    }
    process.exit(2);
  }

  const result = await evaluateIsolatedSupabaseLocalStackVerificationLiveV1(loaded.env, {
    inspectLocalStackDockerBindingImpl: inspectLocalStackDockerBindingV1,
  });
  if (!result.ok) {
    console.error('M55_R8_ISOLATED_SUPABASE_LOCAL_STACK_VERIFICATION_FAILED');
    for (const line of localStackVerificationFailureChecklistV1(result.reason)) {
      console.error(`- ${line}`);
    }
    process.exit(2);
  }

  console.log(
    JSON.stringify({
      ok: true,
      alignment: 'LOCAL_STACK_READ_PROBE',
      envFile: loaded.envFile,
      stackProjectId: result.stackProjectId,
      projectRefIdentity: result.projectRefIdentity,
      humanProjectRefConfirmed: result.humanProjectRefConfirmed,
      checks: result.checks,
      supabaseProjectRefSuffix: result.supabaseProjectRefSuffix,
      postgresConnectionKind: result.postgresConnectionKind,
      serviceRoleKeyFormat: result.serviceRoleKeyFormat,
      serviceRoleJwtRefMatched: result.serviceRoleJwtRefMatched,
      localStackServiceRoleJwtRefAbsent: result.localStackServiceRoleJwtRefAbsent === true,
    }),
  );
  process.exit(0);
}

const result = await evaluateIsolatedSupabaseAlignmentLiveV1(loaded.env);
if (!result.ok) {
  console.error('M55_R8_ISOLATED_SUPABASE_ALIGNMENT_FAILED');
  for (const line of alignmentFailureChecklistV1(result.reason)) console.error(`- ${line}`);
  process.exit(2);
}

console.log(
  JSON.stringify({
    ok: true,
    alignment: 'LIVE_READ_PROBE',
    envFile: loaded.envFile,
    supabaseProjectRefSuffix: result.supabaseProjectRefSuffix,
    postgresConnectionKind: result.postgresConnectionKind,
    humanProjectRefConfirmed: result.humanProjectRefConfirmed,
    serviceRoleKeyFormat: result.serviceRoleKeyFormat,
    serviceRoleJwtRefMatched: result.serviceRoleJwtRefMatched,
    localStackServiceRoleJwtRefAbsent: result.localStackServiceRoleJwtRefAbsent === true,
  }),
);
