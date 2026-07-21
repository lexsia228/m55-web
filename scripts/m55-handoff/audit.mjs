#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';
import { collectRepository, EXIT_USAGE, exitCodeForStatus } from './engine.mjs';
import { inspectM55 } from './m55-adapter.mjs';
import { writeHandoffPacket } from './packet.mjs';

const TOOL_VERSION = '1.0.0';
function usage(message) { if (message) console.error(message); console.error('Usage: npm run audit:m55-handoff -- --repo <path> [--out <outside-repo-dir>]'); process.exit(EXIT_USAGE); }
function args(argv) { const value = {}; for (let i = 0; i < argv.length; i += 1) { if (!argv[i].startsWith('--')) usage(`Unexpected argument: ${argv[i]}`); value[argv[i].slice(2)] = argv[++i]; } return value; }
const options = args(process.argv.slice(2));
if (!options.repo) usage('--repo is required.');
const repo = path.resolve(options.repo);
let identity;
try { identity = collectRepository(repo); } catch (error) { usage(error.message); }
const out = path.resolve(options.out || path.join(os.tmpdir(), 'm55-handoff-report'));
if (out === identity.root || out.startsWith(`${identity.root}${path.sep}`)) usage('--out must be outside the repository.');
const inspection = inspectM55(identity.root, identity);
const hold = inspection.status === 'HOLD';
const report = {
  schemaVersion: '1.0.0', toolVersion: TOOL_VERSION,
  evidenceClassification: 'PRIVATE_MACHINE_LOCAL',
  projectIdentity: 'M55 Control Plane',
  targetRepositoryDisplayIdentity: 'M55 product repository',
  status: inspection.status,
  reasonCodes: inspection.reasonCodes,
  reasonDetails: inspection.reasonDetails,
  implementationPermission: hold ? 'NO' : 'YES_WITHIN_DOCUMENTED_AUTHORITY',
  nextAction: hold
    ? 'Resolve the listed HOLD reason codes, then rerun the audit. Do not implement while HOLD.'
    : inspection.authority.nextSingleAction,
  prohibitedActions: [...new Set([...(hold ? ['Implementation while HOLD'] : []), ...inspection.authority.prohibitedLanes])],
  checks: inspection.checks,
  repository: { ...identity, displayIdentity: 'M55 product repository' },
  authority: inspection.authority,
  generatedAt: new Date().toISOString(),
};
writeHandoffPacket(out, report);
console.log(`M55 handoff: ${report.status}`);
console.log(`Reasons: ${report.reasonCodes.length ? report.reasonCodes.join(', ') : 'none'}`);
console.log(`JSON: ${path.join(out, 'handoff-report.json')}`);
console.log(`HTML: ${path.join(out, 'handoff-report.html')}`);
process.exit(exitCodeForStatus(report.status));
