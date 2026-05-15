#!/usr/bin/env node
/**
 * M55 baseline evidence capture helper.
 * Runs public and reserve SSOT audits, saves JSON, writes manifest.json.
 *
 * Usage: node scripts/capture-baseline-evidence.js <output-directory>
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const outDirArg = process.argv[2];

if (!outDirArg || outDirArg.startsWith('-')) {
  console.error('Usage: node scripts/capture-baseline-evidence.js <output-directory>');
  process.exit(1);
}

const outDir = path.resolve(ROOT, outDirArg);
fs.mkdirSync(outDir, { recursive: true });

const auditScript = path.join(ROOT, 'scripts', 'run-sonnet-audit.js');

function runAudit(extraArgs) {
  const r = spawnSync(process.execPath, [auditScript, ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    status: r.status === null ? 1 : r.status,
  };
}

const publicResult = runAudit([]);
const reserveResult = runAudit(['--reserve-scan']);

const PUBLIC_NAME = 'ssot-public.json';
const RESERVE_NAME = 'ssot-reserve.json';
const publicPath = path.join(outDir, PUBLIC_NAME);
const reservePath = path.join(outDir, RESERVE_NAME);

fs.writeFileSync(publicPath, publicResult.stdout.trimEnd() + '\n', 'utf8');
fs.writeFileSync(reservePath, reserveResult.stdout.trimEnd() + '\n', 'utf8');

function violationInfo(jsonStr) {
  try {
    const o = JSON.parse(jsonStr.trim());
    const v = o.violations;
    if (!Array.isArray(v)) return { count: null, ok: false };
    return { count: v.length, ok: true };
  } catch {
    return { count: null, ok: false };
  }
}

const pubInfo = violationInfo(publicResult.stdout);
const resInfo = violationInfo(reserveResult.stdout);

const gitHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
const gitShort = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' });
const gitSha = (gitHead.stdout || '').trim() || null;
const gitShaShort = (gitShort.stdout || '').trim() || null;

const capturedAt = new Date().toISOString();
const manifest = {
  capturedAt,
  gitSha,
  gitShaShort,
  outputDirectory: path.relative(ROOT, outDir) || '.',
  files: {
    publicScan: PUBLIC_NAME,
    reserveScan: RESERVE_NAME,
  },
  audits: {
    public: {
      exitCode: publicResult.status,
      violationCount: pubInfo.count,
      jsonOk: pubInfo.ok,
    },
    reserve: {
      exitCode: reserveResult.status,
      violationCount: resInfo.count,
      jsonOk: resInfo.ok,
    },
  },
};

const manifestPath = path.join(outDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.error(`[capture-baseline-evidence] Wrote ${PUBLIC_NAME}, ${RESERVE_NAME}, manifest.json under ${outDir}`);
console.error(
  `[capture-baseline-evidence] git ${gitShaShort ?? '?'} public violations=${pubInfo.count ?? 'parse-error'} reserve violations=${resInfo.count ?? 'parse-error'}`,
);

const green =
  pubInfo.ok &&
  resInfo.ok &&
  pubInfo.count === 0 &&
  resInfo.count === 0 &&
  publicResult.status === 0 &&
  reserveResult.status === 0;

process.exit(green ? 0 : 1);
