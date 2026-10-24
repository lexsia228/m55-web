#!/usr/bin/env node --experimental-strip-types
import { readFileSync } from 'node:fs';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { R7_PR249_FROZEN_REPO_ROOT } from '../../lib/m55/previewRemoteApply/r7D1D5OfflinePlan.ts';
import {
  evaluateR7D1ReadonlyPgObservationRuntimeAuthorization,
  R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV,
  R7_D1_READONLY_PG_OBSERVATION_CHANNEL_V1,
} from '../../lib/m55/previewRemoteApply/r7D1ReadonlyPgObservationRuntimeAuthorization.ts';
import {
  executeR7D1PreviewReadonlyPgCatalogObservation,
  parseR7D1ReadonlyPgObservationWireV1,
  redactR7D1ReadonlyPgObservationWireForEvidence,
  type R7D1ReadonlyPgObservationResult,
} from '../../lib/m55/previewRemoteApply/r7D1ReadonlyPgObservationOrchestration.ts';

export async function runR7D1PreviewReadonlyPgObservationCli(
  stdinPayload: string,
  repoRoot = R7_PR249_FROZEN_REPO_ROOT,
): Promise<R7D1ReadonlyPgObservationResult> {
  const canonicalRoot = realpathSync(repoRoot);
  if (canonicalRoot !== R7_PR249_FROZEN_REPO_ROOT) {
    return { mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD', holdReasonCode: 'HOLD_REPO_IDENTITY_MISMATCH' };
  }
  const auth = evaluateR7D1ReadonlyPgObservationRuntimeAuthorization();
  if (!auth.ok) {
    return { mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD', holdReasonCode: auth.holdReasonCode };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdinPayload) as unknown;
  } catch {
    return { mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD', holdReasonCode: 'HOLD_READONLY_PG_OBSERVATION_WIRE_INVALID' };
  }
  const wire = parseR7D1ReadonlyPgObservationWireV1(parsed);
  if (!wire.ok) {
    return { mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD', holdReasonCode: 'HOLD_READONLY_PG_OBSERVATION_WIRE_INVALID' };
  }
  return await executeR7D1PreviewReadonlyPgCatalogObservation({
    repoRoot: canonicalRoot,
    wire: wire.wire,
  });
}

async function main(): Promise<void> {
  if (process.env[R7_D1_READONLY_PG_OBSERVATION_CHANNEL_ENV] !== R7_D1_READONLY_PG_OBSERVATION_CHANNEL_V1) {
    process.stdout.write(
      `${JSON.stringify({
        mode: 'R7_D1_READONLY_PG_OBSERVATION_HOLD',
        holdReasonCode: 'HOLD_READONLY_PG_OBSERVATION_NOT_AUTHORIZED',
      })}\n`,
    );
    process.exit(2);
  }
  const stdinPayload = readFileSync(0, 'utf8');
  const result = await runR7D1PreviewReadonlyPgObservationCli(stdinPayload);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(result.mode === 'R7_D1_READONLY_PG_CATALOG_OBSERVATION' ? 0 : 2);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  void main();
}
