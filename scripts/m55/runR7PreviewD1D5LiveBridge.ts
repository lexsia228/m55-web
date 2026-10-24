#!/usr/bin/env node --experimental-strip-types
import { realpathSync } from 'node:fs';

import {
  R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED,
  R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN,
  assertR7LiveBridgeRuntimeAuthorization,
  type R7LiveBridgeCliResult,
} from '../../lib/m55/previewRemoteApply/r7D1D5LiveBridge.ts';
import {
  SESSION_POOLER_HOST,
  SESSION_POOLER_TLS_SERVER_NAME,
  TLS_TRUST_PROFILE,
} from '../../lib/m55/previewRemoteApply/remoteConnectionAuthority.ts';
import { R7_PR249_FROZEN_REPO_ROOT, type R7DeltaStepId } from '../../lib/m55/previewRemoteApply/r7D1D5OfflinePlan.ts';
import { R7_DELTA_STEP_ORDER } from '../../lib/m55/previewRemoteApply/r7D1D5RemoteExecution.ts';

export const R7_SECURE_STDIN_CONNECTION_CONFIG_WIRE_VERSION = 'SECURE_STDIN_CONNECTION_CONFIG_v1' as const;

export type R7SecureStdinConnectionConfigWireV1 = {
  readonly wireVersion: typeof R7_SECURE_STDIN_CONNECTION_CONFIG_WIRE_VERSION;
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly sslmode: string;
  readonly tlsTrustProfile: string;
  readonly tlsServerName: string;
};

/** Dormant schema-only parser — never reads stdin or opens network in local code-only gate. */
export function parseSecureStdinConnectionConfigWireV1(
  payload: unknown,
): { readonly ok: true; readonly config: R7SecureStdinConnectionConfigWireV1 } | { readonly ok: false } {
  if (payload === null || typeof payload !== 'object') {
    return { ok: false };
  }
  const record = payload as Record<string, unknown>;
  if (record.wireVersion !== R7_SECURE_STDIN_CONNECTION_CONFIG_WIRE_VERSION) {
    return { ok: false };
  }
  const required = ['host', 'database', 'user', 'password', 'sslmode', 'tlsTrustProfile', 'tlsServerName'] as const;
  for (const key of required) {
    if (typeof record[key] !== 'string' || record[key].length === 0) {
      return { ok: false };
    }
  }
  if (typeof record.port !== 'number' || !Number.isInteger(record.port) || record.port <= 0) {
    return { ok: false };
  }
  if (record.port !== 5432) {
    return { ok: false };
  }
  if (record.host !== SESSION_POOLER_HOST) {
    return { ok: false };
  }
  if (record.sslmode !== 'require') {
    return { ok: false };
  }
  if (record.tlsTrustProfile !== TLS_TRUST_PROFILE) {
    return { ok: false };
  }
  if (record.tlsServerName !== SESSION_POOLER_TLS_SERVER_NAME) {
    return { ok: false };
  }
  if (record.database !== 'postgres') {
    return { ok: false };
  }
  return {
    ok: true,
    config: {
      wireVersion: R7_SECURE_STDIN_CONNECTION_CONFIG_WIRE_VERSION,
      host: record.host as string,
      port: record.port as number,
      database: record.database as string,
      user: record.user as string,
      password: record.password as string,
      sslmode: record.sslmode as string,
      tlsTrustProfile: record.tlsTrustProfile as string,
      tlsServerName: record.tlsServerName as string,
    },
  };
}

/** Live CLI transport remains closed until remote execution and stdin wiring are separately authorized. */
export function redactSecureStdinConnectionConfigForEvidence(
  config: R7SecureStdinConnectionConfigWireV1,
): Record<string, string | number> {
  return {
    wireVersion: config.wireVersion,
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: '[REDACTED]',
    sslmode: config.sslmode,
    tlsTrustProfile: config.tlsTrustProfile,
    tlsServerName: config.tlsServerName,
  };
}

export function assertR7SecureStdinLiveCliWiringDormant(): {
  readonly ok: false;
  readonly holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED';
} {
  return { ok: false, holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED' };
}

const FORBIDDEN_FLAG_FRAGMENTS = [
  'apply',
  'execute-live',
  'execute',
  'remote',
  'credential',
  'password',
  'token',
  'secret',
  'supabase',
  'database-url',
  'db-url',
  'url',
  'push',
  'repair',
  'link',
  'env',
  'stdin',
  'authorization-document',
  'repo-root',
  'manifest-path',
  'multi',
  'all-steps',
  'live',
  'connect',
  'dsn',
] as const;

export type { R7LiveBridgeCliResult };

export function parseR7LiveBridgeArgv(argv: readonly string[]): {
  stepId: R7DeltaStepId | null;
  unknownFlags: string[];
} {
  const unknownFlags: string[] = [];
  let stepId: R7DeltaStepId | null = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--step') {
      const value = argv[i + 1];
      if (!value || !R7_DELTA_STEP_ORDER.includes(value as R7DeltaStepId)) {
        unknownFlags.push(arg);
      } else {
        stepId = value as R7DeltaStepId;
        i += 1;
      }
      continue;
    }
    if (arg.startsWith('-')) {
      unknownFlags.push(arg);
    }
  }
  return { stepId, unknownFlags };
}

export async function runR7PreviewD1D5LiveBridgeCli(
  argv: readonly string[],
  repoRoot = R7_PR249_FROZEN_REPO_ROOT,
): Promise<R7LiveBridgeCliResult> {
  for (const fragment of FORBIDDEN_FLAG_FRAGMENTS) {
    for (const arg of argv) {
      if (arg.toLowerCase().includes(fragment)) {
        return {
          mode: 'R7_D1_D5_LIVE_BRIDGE_HOLD',
          holdReasonCode: 'HOLD_FORBIDDEN_CLI_FLAG',
          evidence: null,
        };
      }
    }
  }

  const { stepId, unknownFlags } = parseR7LiveBridgeArgv(argv);
  if (unknownFlags.length > 0 || !stepId) {
    return {
      mode: 'R7_D1_D5_LIVE_BRIDGE_HOLD',
      holdReasonCode: 'HOLD_CLI_ARGUMENT_INVALID',
      evidence: null,
    };
  }

  const canonicalRoot = realpathSync(repoRoot);
  if (canonicalRoot !== R7_PR249_FROZEN_REPO_ROOT) {
    return {
      mode: 'R7_D1_D5_LIVE_BRIDGE_HOLD',
      holdReasonCode: 'HOLD_REPO_IDENTITY_MISMATCH',
      evidence: null,
    };
  }

  const auth = assertR7LiveBridgeRuntimeAuthorization(false, false);
  if (!auth.ok) {
    return {
      mode: 'R7_D1_D5_LIVE_BRIDGE_HOLD',
      holdReasonCode: auth.holdReasonCode,
      evidence: null,
    };
  }

  if (!R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED || R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN) {
    return {
      mode: 'R7_D1_D5_LIVE_BRIDGE_HOLD',
      holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED',
      evidence: null,
    };
  }

  const stdinWiring = assertR7SecureStdinLiveCliWiringDormant();
  return {
    mode: 'R7_D1_D5_LIVE_BRIDGE_HOLD',
    holdReasonCode: stdinWiring.holdReasonCode,
    evidence: null,
  };
}

async function main(): Promise<void> {
  const result = await runR7PreviewD1D5LiveBridgeCli(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(result.mode === 'R7_D1_D5_LIVE_BRIDGE_HOLD' ? 2 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
