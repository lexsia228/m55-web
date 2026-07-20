#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const output = path.join(os.tmpdir(), 'm55-control-plane-demo');
const samples = path.resolve('scripts/m55-handoff/samples');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const cases = [
  ['CLEAN_READY', 'ready-report.json'],
  ['DOCUMENTED_TRANSITION_WARNING', 'documented-transition-warning-report.json'],
  ['DIRTY_HOLD', 'dirty-hold-report.json'],
  ['UNEXPLAINED_DRIFT_HOLD', 'unexplained-drift-hold-report.json'],
  ['MISSING_AUTHORITY_HOLD', 'missing-authority-hold-report.json'],
];
for (const [name, source] of cases) {
  const folder = path.join(output, name);
  fs.mkdirSync(folder);
  const json = fs.readFileSync(path.join(samples, source), 'utf8');
  fs.writeFileSync(path.join(folder, 'handoff-report.json'), json);
  const report = JSON.parse(json);
  fs.writeFileSync(path.join(folder, 'handoff-report.html'), `<!doctype html><meta charset="utf-8"><title>${report.status}</title><main><h1>${report.status}</h1><p>${report.reasonCodes.join(', ') || 'none'}</p></main>`);
  fs.writeFileSync(path.join(folder, 'handoff.md'), `# Synthetic ${name}\n\nStatus: **${report.status}**\n\nThis is synthetic judge data; no M55 Production, secrets, DB, Clerk, or Stripe is used.\n`);
  fs.writeFileSync(path.join(folder, 'agent-bootstrap.txt'), report.status === 'HOLD' ? 'HOLD — do not begin implementation.\n' : 'Read authority before acting.\n');
}
console.log(`Synthetic judge artifacts: ${output}`);
