#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  alignmentFailureChecklistV1,
  evaluateIsolatedSupabaseAlignmentLiveV1,
  evaluateIsolatedSupabaseLocalStackVerificationLiveV1,
  expectedLocalStackSupabaseContainerNameV1,
  listIsolatedSupabaseAlignmentChecklistV1,
  loadM55R8IsolatedAlignmentEnvV1,
  localStackVerificationFailureChecklistV1,
  M55_R8_ISOLATED_SUPABASE_STACK_PROJECT_ID_ENV_V1,
  M55_R8_ISOLATED_SUPABASE_STACK_DOCKER_NETWORK_ENV_V1,
} from '../lib/m55/creatorProvider/r8IsolatedSupabaseAlignment.ts';

const localStackVerification = process.argv.includes('--local-stack-verification');
const execFileAsync = promisify(execFile);

function hostPortsFromDockerPortsJson(portsJson) {
  const portsRaw = JSON.parse(portsJson || '{}');
  const hostPorts = [];
  for (const [key, bindings] of Object.entries(portsRaw)) {
    const segments = String(key).split('/');
    const containerPort = Number(segments[0]);
    const protocol = (segments[1] ?? '').toLowerCase();
    if (!Number.isFinite(containerPort)) continue;
    if (protocol !== 'tcp' && protocol !== 'udp') continue;
    for (const binding of bindings ?? []) {
      if (!binding?.HostPort) continue;
      hostPorts.push({
        hostIp: binding.HostIp ?? '',
        hostPort: Number(binding.HostPort),
        containerPort,
        protocol,
      });
    }
  }
  return hostPorts;
}

function networksFromDockerNetworksJson(networksJson) {
  const networksRaw = JSON.parse(networksJson || '{}');
  const attachments = [];
  for (const [networkName, value] of Object.entries(networksRaw)) {
    attachments.push({
      networkName,
      networkId: value?.NetworkID ?? '',
    });
  }
  return attachments;
}

async function inspectLocalStackRoleBindingV1(stackProjectId, role) {
  const name = expectedLocalStackSupabaseContainerNameV1(role, stackProjectId);
  const [runningOut, portsOut, networksOut] = await Promise.all([
    execFileAsync('docker', ['inspect', name, '--format', '{{.State.Running}}'], {
      timeout: 15_000,
    }),
    execFileAsync('docker', ['inspect', name, '--format', '{{json .NetworkSettings.Ports}}'], {
      timeout: 15_000,
    }),
    execFileAsync('docker', ['inspect', name, '--format', '{{json .NetworkSettings.Networks}}'], {
      timeout: 15_000,
    }),
  ]);
  return {
    name,
    stateRunning: runningOut.stdout.trim() === 'true',
    hostPorts: hostPortsFromDockerPortsJson(portsOut.stdout.trim()),
    networks: networksFromDockerNetworksJson(networksOut.stdout.trim()),
  };
}

async function inspectLocalStackDockerBindingV1(stackProjectId) {
  try {
    const [kong, db, auth] = await Promise.all([
      inspectLocalStackRoleBindingV1(stackProjectId, 'kong'),
      inspectLocalStackRoleBindingV1(stackProjectId, 'db'),
      inspectLocalStackRoleBindingV1(stackProjectId, 'auth'),
    ]);
    return { stackProjectId, kong, db, auth };
  } catch {
    return null;
  }
}

const loaded = loadM55R8IsolatedAlignmentEnvV1();
if (!loaded.ok) {
  console.error('M55_R8_ISOLATED_SUPABASE_ALIGNMENT_FAILED');
  for (const line of loaded.checklist) console.error(`- ${line}`);
  process.exit(2);
}

console.error(`M55_R8_ISOLATED_ENV: ${loaded.envFile}`);

const structural = listIsolatedSupabaseAlignmentChecklistV1(loaded.env);
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
