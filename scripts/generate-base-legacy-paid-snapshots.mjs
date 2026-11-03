#!/usr/bin/env node
/**
 * READ-ONLY: builds paid snapshots from Base HEAD builder (detached worktree path).
 * Synthetic inputs only (A1/T3/E0). No DB / no purchaser data.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BASE_HEAD = 'feeffe335649e2892b521f5fea6462618044d4bf';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const worktree =
  process.env.M55_BASE_BUILDER_WORKTREE ??
  join(dirname(repoRoot), 'M55_BASE_RO_feeffe33');

const builderPath = join(worktree, 'lib/m55/compatibility/buildPaidCompatibilityReportV1.ts');
if (!readFileSync(builderPath, 'utf8').includes('buildPaidCompatibilityReportV1')) {
  throw new Error(`Base builder missing at ${builderPath}`);
}

const { buildPaidCompatibilityReportV1 } = await import(
  pathToFileURL(builderPath).href
);

const SYNTHETIC_INPUT = Object.freeze({
  pairAxisId: 'A1',
  paidTopicId: 'T3',
  temperatureId: 'E0',
});

const STATUSES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];
const outDir = join(repoRoot, 'lib/m55/compatibility/fixtures');
mkdirSync(outDir, { recursive: true });

const manifest = {
  baseHead: BASE_HEAD,
  builderWorktree: worktree,
  syntheticInput: SYNTHETIC_INPUT,
  generatedAt: new Date().toISOString().slice(0, 10),
  snapshots: {},
};

for (const relationStatusId of STATUSES) {
  for (const personAUsesFirstPerspective of [true, false]) {
    const snapshot = buildPaidCompatibilityReportV1({
      ...SYNTHETIC_INPUT,
      relationStatusId,
      personAUsesFirstPerspective,
    });
    const key = `${relationStatusId}_${personAUsesFirstPerspective ? 'true' : 'false'}`;
    manifest.snapshots[key] = snapshot;
  }
}

const outPath = join(outDir, 'baseLegacyPaidSnapshots.feeffe33.v1.json');
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outPath}`);
