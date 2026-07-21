#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConsistency, memoryReader, repositoryReader } from './consistency-engine.mjs';
import { writeConsistencyPacket } from './consistency-packet.mjs';
import { m55ConsistencyManifest } from './m55-consistency-adapter.mjs';
import { orbitConsistencyManifest } from './examples/orbit-consistency-adapter.mjs';
import { runGit } from './engine.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUTPUT = path.join(os.tmpdir(), 'm55-consistency-preview');
const fixedEvidence = { branch: 'synthetic/main', commit: '0000000000000000000000000000000000000000', timestamp: '2026-07-21T00:00:00.000Z' };
fs.rmSync(OUTPUT, { recursive: true, force: true });
fs.mkdirSync(OUTPUT, { recursive: true });

const consistent = orbitConsistencyManifest();
const review = orbitConsistencyManifest({ humanReview: [{ ruleId: 'human_review.editorial_rhythm', summary: 'Human editorial rhythm review remains required.', evidenceLevel: 'VISUAL_CAPTURE' }] });
const hold = orbitConsistencyManifest({ mutate: (files) => { files['src/landing.html'] = files['src/landing.html'].replace('href="/start"', 'href="/wrong"'); return files; } });
for (const [name, fixture] of [['SYNTHETIC_CONSISTENT', consistent], ['SYNTHETIC_REVIEW_REQUIRED', review], ['SYNTHETIC_HOLD', hold]]) {
  const report = evaluateConsistency(fixture.manifest, { readText: memoryReader(fixture.files), provenance: fixedEvidence, generatedAt: fixedEvidence.timestamp });
  writeConsistencyPacket(path.join(OUTPUT, name), report, { repositoryRoot: ROOT });
}

const evidence = { branch: runGit(ROOT, ['branch', '--show-current']) || 'unavailable', commit: runGit(ROOT, ['rev-parse', 'HEAD']) || 'unavailable', timestamp: new Date().toISOString() };
const m55 = evaluateConsistency(m55ConsistencyManifest(), { readText: repositoryReader(ROOT), provenance: evidence, generatedAt: evidence.timestamp });
writeConsistencyPacket(path.join(OUTPUT, 'M55_READ_ONLY'), m55, { repositoryRoot: ROOT });
console.log(`Consistency preview artifacts: ${OUTPUT}`);
console.log(`M55 read-only verdict: ${m55.status}`);
