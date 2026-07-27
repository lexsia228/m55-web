import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  computeEventHash,
  parseHistoryLines,
  serializeHistory,
  withComputedEventHashes,
} from '../history.mjs';
import { validateHistory } from '../validate.mjs';
import { cleanupTempRoot, makeTempRoot, writeBootstrapHistory } from '../history.mjs';

const COMMIT_ONE_SHA = 'e6afe67262ebcee3353a3a43713f7ecf8369f26f';
const BOOTSTRAP_AUTHORITY_SHA = 'a'.repeat(64);
const BOOTSTRAP_OBSERVATIONS_SHA = 'b'.repeat(64);
const BOOTSTRAP_HISTORY_SHA = 'c'.repeat(64);
const BOOTSTRAP_GENERATED_BUNDLE_SHA = 'd'.repeat(64);

test('sequence 0 initializes bootstrap history', () => {
  const tempRoot = makeTempRoot();
  try {
    writeBootstrapHistory(tempRoot);
    const events = parseHistoryLines(
      fs.readFileSync(`${tempRoot}/.product-authority/authority-history.jsonl`, 'utf8'),
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].sequence, 0);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('sequence 0 kind is INITIALIZATION', () => {
  const tempRoot = makeTempRoot();
  try {
    writeBootstrapHistory(tempRoot);
    const events = parseHistoryLines(
      fs.readFileSync(`${tempRoot}/.product-authority/authority-history.jsonl`, 'utf8'),
    );
    assert.equal(events[0].kind, 'INITIALIZATION');
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('sequence 0 sourceCommit is UNCOMMITTED_BOOTSTRAP', () => {
  const tempRoot = makeTempRoot();
  try {
    writeBootstrapHistory(tempRoot);
    const events = parseHistoryLines(
      fs.readFileSync(`${tempRoot}/.product-authority/authority-history.jsonl`, 'utf8'),
    );
    assert.equal(events[0].sourceCommit, 'UNCOMMITTED_BOOTSTRAP');
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('sequence 0 previousEventHash is null', () => {
  const tempRoot = makeTempRoot();
  try {
    writeBootstrapHistory(tempRoot);
    const events = parseHistoryLines(
      fs.readFileSync(`${tempRoot}/.product-authority/authority-history.jsonl`, 'utf8'),
    );
    assert.equal(events[0].previousEventHash, null);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('eventHash excludes only eventHash field', () => {
  const event = {
    sequence: 0,
    kind: 'INITIALIZATION',
    sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
    previousEventHash: null,
    bootstrap: true,
    approvalReference: 'ref',
    changedPaths: ['a'],
    updatedAt: '2026-07-25T07:00:00+00:00',
  };
  const hash = computeEventHash(event);
  assert.match(hash, /^[a-f0-9]{64}$/);
});

test('previousEventHash remains in hashed object', () => {
  const first = {
    sequence: 0,
    kind: 'INITIALIZATION',
    sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
    previousEventHash: null,
    bootstrap: true,
    approvalReference: 'ref',
    changedPaths: ['a'],
    updatedAt: '2026-07-25T07:00:00+00:00',
  };
  const second = {
    ...first,
    sequence: 1,
    kind: 'AUTHORITY_PROCESS_INCIDENT',
    sourceCommit: COMMIT_ONE_SHA,
    previousEventHash: computeEventHash(first),
  };
  assert.notEqual(computeEventHash(first), computeEventHash(second));
});

test('bootstrap validator accepts single sequence', () => {
  const tempRoot = makeTempRoot();
  try {
    writeBootstrapHistory(tempRoot);
    const events = parseHistoryLines(
      fs.readFileSync(`${tempRoot}/.product-authority/authority-history.jsonl`, 'utf8'),
    );
    validateHistory(events, { mode: 'bootstrap' });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('steady-state validator rejects bootstrap-only history', () => {
  const tempRoot = makeTempRoot();
  try {
    writeBootstrapHistory(tempRoot);
    const events = parseHistoryLines(
      fs.readFileSync(`${tempRoot}/.product-authority/authority-history.jsonl`, 'utf8'),
    );
    assert.throws(() => validateHistory(events, { mode: 'steady-state' }));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('serializeHistory uses LF endings', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  const text = serializeHistory(events);
  assert.ok(text.endsWith('\n'));
  assert.ok(!text.includes('\r'));
});

test('invalid previousEventHash chain fails validation', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 1,
      kind: 'AUTHORITY_PROCESS_INCIDENT',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: 'deadbeef',
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  assert.throws(() => validateHistory(events, { mode: 'steady-state' }));
});

test('invalid HUMAN_APPROVAL event kind rejected', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 1,
      kind: 'HUMAN_APPROVAL',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 2,
      kind: 'BOOTSTRAP_RECONCILIATION',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      changedPaths: ['c'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  events[2].previousEventHash = events[1].eventHash;
  assert.throws(() => validateHistory(events, { mode: 'steady-state' }), /AUTHORITY_PROCESS_INCIDENT/);
});

test('invalid RECONCILIATION event kind rejected', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 1,
      kind: 'AUTHORITY_PROCESS_INCIDENT',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 2,
      kind: 'RECONCILIATION',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      changedPaths: ['c'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  events[2].previousEventHash = events[1].eventHash;
  assert.throws(() => validateHistory(events, { mode: 'steady-state' }), /BOOTSTRAP_RECONCILIATION/);
});

test('valid AUTHORITY_PROCESS_INCIDENT and BOOTSTRAP_RECONCILIATION accepted', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 1,
      kind: 'AUTHORITY_PROCESS_INCIDENT',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      approvalReference: 'human-approval-metadata-only',
      actorClass: 'HUMAN',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 2,
      kind: 'BOOTSTRAP_RECONCILIATION',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      bootstrapAuthoritySha256: BOOTSTRAP_AUTHORITY_SHA,
      bootstrapObservationsSha256: BOOTSTRAP_OBSERVATIONS_SHA,
      changedPaths: ['c'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  events[1].eventHash = computeEventHash(events[1]);
  events[2].previousEventHash = events[1].eventHash;
  events[2].eventHash = computeEventHash(events[2]);
  validateHistory(events, { mode: 'steady-state' });
});

test('sequence 1 and 2 require exact same Commit-1 SHA', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 1,
      kind: 'AUTHORITY_PROCESS_INCIDENT',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 2,
      kind: 'BOOTSTRAP_RECONCILIATION',
      sourceCommit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      previousEventHash: null,
      changedPaths: ['c'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  events[2].previousEventHash = events[1].eventHash;
  assert.throws(() => validateHistory(events, { mode: 'steady-state' }), /Commit-1/);
});

test('sequence 2 accepts bootstrapHistorySha256 as Commit-1 pre-reconciliation evidence', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 1,
      kind: 'AUTHORITY_PROCESS_INCIDENT',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 2,
      kind: 'BOOTSTRAP_RECONCILIATION',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      bootstrapHistorySha256: BOOTSTRAP_HISTORY_SHA,
      changedPaths: ['c'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  events[2].previousEventHash = events[1].eventHash;
  validateHistory(events, { mode: 'steady-state' });
});

test('sequence 2 accepts full Commit-1 bootstrap evidence set', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 1,
      kind: 'AUTHORITY_PROCESS_INCIDENT',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 2,
      kind: 'BOOTSTRAP_RECONCILIATION',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      bootstrapAuthoritySha256: BOOTSTRAP_AUTHORITY_SHA,
      bootstrapObservationsSha256: BOOTSTRAP_OBSERVATIONS_SHA,
      bootstrapHistorySha256: BOOTSTRAP_HISTORY_SHA,
      bootstrapGeneratedBundleSha256: BOOTSTRAP_GENERATED_BUNDLE_SHA,
      commitOneArtifactEvidence: 'Commit-1 artifact bundle @ .product-authority/generated/',
      changedPaths: ['c'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  events[2].previousEventHash = events[1].eventHash;
  events[2].sequence0EventHash = events[0].eventHash;
  events[2].eventHash = computeEventHash(events[2]);
  validateHistory(events, { mode: 'steady-state' });
});

test('sequence 2 rejects finalHistorySha256 self-reference field', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 1,
      kind: 'AUTHORITY_PROCESS_INCIDENT',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 2,
      kind: 'BOOTSTRAP_RECONCILIATION',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      finalHistorySha256: 'f'.repeat(64),
      changedPaths: ['c'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  events[2].previousEventHash = events[1].eventHash;
  assert.throws(() => validateHistory(events, { mode: 'steady-state' }), /finalHistorySha256/);
});

test('sequence 2 rejects finalGeneratedBundleSha256 self-reference field', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 1,
      kind: 'AUTHORITY_PROCESS_INCIDENT',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 2,
      kind: 'BOOTSTRAP_RECONCILIATION',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      finalGeneratedBundleSha256: 'f'.repeat(64),
      changedPaths: ['c'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  events[2].previousEventHash = events[1].eventHash;
  assert.throws(() => validateHistory(events, { mode: 'steady-state' }), /finalGeneratedBundleSha256/);
});

test('sequence 2 rejects finalArtifactHash self-reference field', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 1,
      kind: 'AUTHORITY_PROCESS_INCIDENT',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 2,
      kind: 'BOOTSTRAP_RECONCILIATION',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      finalArtifactHash: 'f'.repeat(64),
      changedPaths: ['c'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  events[2].previousEventHash = events[1].eventHash;
  assert.throws(() => validateHistory(events, { mode: 'steady-state' }), /finalArtifactHash/);
});

test('bootstrap mode rejects extra sequences', () => {
  const events = withComputedEventHashes([
    {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 1,
      kind: 'AUTHORITY_PROCESS_INCIDENT',
      sourceCommit: COMMIT_ONE_SHA,
      previousEventHash: null,
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  assert.throws(() => validateHistory(events, { mode: 'bootstrap' }));
});
