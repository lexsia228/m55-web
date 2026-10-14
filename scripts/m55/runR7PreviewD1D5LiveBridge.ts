#!/usr/bin/env node --experimental-strip-types
import { realpathSync } from 'node:fs';

import {
  R7_D1_D5_REMOTE_EXECUTION_AUTHORIZED,
  R7_LIVE_BRIDGE_CLI_LIVE_TRANSPORT_FORBIDDEN,
  assertR7LiveBridgeRuntimeAuthorization,
  type R7LiveBridgeCliResult,
} from '../../lib/m55/previewRemoteApply/r7D1D5LiveBridge.ts';
import { R7_PR249_FROZEN_REPO_ROOT, type R7DeltaStepId } from '../../lib/m55/previewRemoteApply/r7D1D5OfflinePlan.ts';
import { R7_DELTA_STEP_ORDER } from '../../lib/m55/previewRemoteApply/r7D1D5RemoteExecution.ts';

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

  return {
    mode: 'R7_D1_D5_LIVE_BRIDGE_HOLD',
    holdReasonCode: 'HOLD_LIVE_EXECUTION_NOT_AUTHORIZED',
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
