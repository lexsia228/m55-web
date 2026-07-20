#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeHandoffPacket } from './packet.mjs';

const output = path.join(os.tmpdir(), 'm55-control-plane-demo');
const samples = path.resolve('scripts/m55-handoff/samples');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const cases = [['CLEAN_READY', 'ready-report.json'], ['DOCUMENTED_TRANSITION_WARNING', 'documented-transition-warning-report.json'], ['DIRTY_HOLD', 'dirty-hold-report.json'], ['UNEXPLAINED_DRIFT_HOLD', 'unexplained-drift-hold-report.json'], ['MISSING_AUTHORITY_HOLD', 'missing-authority-hold-report.json']];
for (const [name, source] of cases) {
  const report = JSON.parse(fs.readFileSync(path.join(samples, source), 'utf8'));
  writeHandoffPacket(path.join(output, name), report);
}
console.log(`Synthetic judge artifacts: ${output}`);
