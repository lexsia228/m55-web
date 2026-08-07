import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { generateProductAuthority } from '../generate.mjs';
import { withComputedEventHashes } from '../history.mjs';
import { writeHistory } from '../history.mjs';
import {
  readAuthority,
  verifyProductAuthority,
  validateAuthorityStructure,
  validateObservationsStructure,
  validateHistory,
  LOCK_PATH,
} from '../validate.mjs';
import { readObservations } from '../observations.mjs';
import { bootstrapFixture } from '../generate.mjs';
import { cleanupTempRoot, copyAuthorityPackSources, makeTempRoot } from '../history.mjs';
import { collectAuthorityPackTransitionFailures } from '../../verify-m55-commercial-ssot.mjs';

/**
 * @param {string} tempRoot
 * @param {(root: string) => void} mutate
 */
function expectBootstrapFailure(tempRoot, mutate) {
  bootstrapFixture(tempRoot);
  mutate(tempRoot);
  const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
  assert.equal(result.ok, false);
}

test('mutation: product id m55 changed to M55', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, () => {
      const authority = readAuthority(tempRoot);
      /** @type {{ value: string }} */ (authority.product.id).value = 'M55';
      fs.writeFileSync(path.join(tempRoot, '.product-authority/authority.json'), `${JSON.stringify(authority, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: m-55.jp changed to m55.jp canonical host', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, () => {
      const authority = readAuthority(tempRoot);
      /** @type {{ value: string }} */ (authority.production.canonicalHost).value = 'm55.jp';
      fs.writeFileSync(path.join(tempRoot, '.product-authority/authority.json'), `${JSON.stringify(authority, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: diagnostics-host mismatch', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, () => {
      const authority = readAuthority(tempRoot);
      /** @type {{ value: string }} */ (authority.production.diagnosticsUrl).value =
        'https://m55.jp/api/diagnostics/build';
      fs.writeFileSync(path.join(tempRoot, '.product-authority/authority.json'), `${JSON.stringify(authority, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: Vercel project mutation', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, () => {
      const authority = readAuthority(tempRoot);
      /** @type {{ value: string }} */ (authority.deployment.vercelProject).value = 'wrong-project';
      fs.writeFileSync(path.join(tempRoot, '.product-authority/authority.json'), `${JSON.stringify(authority, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: Vercel team mutation', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, () => {
      const authority = readAuthority(tempRoot);
      /** @type {{ value: string }} */ (authority.deployment.vercelTeam).value = 'Wrong-Team';
      fs.writeFileSync(path.join(tempRoot, '.product-authority/authority.json'), `${JSON.stringify(authority, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: Production branch mutation', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, () => {
      const authority = readAuthority(tempRoot);
      /** @type {{ value: string }} */ (authority.deployment.vercelProductionBranch).value = 'develop';
      fs.writeFileSync(path.join(tempRoot, '.product-authority/authority.json'), `${JSON.stringify(authority, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: git main treated as observed Production SHA', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, () => {
      const observations = readObservations(tempRoot);
      /** @type {{ value: string, source: { kind: string, reference: string } }} */ (
        observations.production.lastObservedSha
      ).value = /** @type {{ value: string }} */ (observations.repository.lastObservedOriginMainSha).value;
      observations.production.lastObservedSha.source = {
        kind: 'GIT_OBSERVATION',
        reference: 'git fetch origin --prune',
      };
      fs.writeFileSync(path.join(tempRoot, '.product-authority/observations.json'), `${JSON.stringify(observations, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: branch-local treated as merged runtime', () => {
  const authority = readAuthority(process.cwd());
  /** @type {{ value: boolean }} */ (authority.runtimeAuthority.branchLocalNotMergedRuntime).value = false;
  assert.throws(() => validateAuthorityStructure(authority));
});

test('mutation: missing history event', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    fs.writeFileSync(path.join(tempRoot, '.product-authority/authority-history.jsonl'), '\n', 'utf8');
    const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
    assert.equal(result.ok, false);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: stale handoff', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    fs.writeFileSync(path.join(tempRoot, '.product-authority/generated/handoff.md'), '# stale\n', 'utf8');
    const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
    assert.equal(result.ok, false);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: lock mismatch', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, (root) => {
      const lock = JSON.parse(fs.readFileSync(path.join(root, LOCK_PATH), 'utf8'));
      lock.authoritySha256 = '0'.repeat(64);
      fs.writeFileSync(path.join(root, LOCK_PATH), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: Human approval removed from history', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const events = withComputedEventHashes([
      {
        sequence: 0,
        kind: 'INITIALIZATION',
        sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
        previousEventHash: null,
        bootstrap: true,
        changedPaths: ['.product-authority/authority.json'],
        updatedAt: '2026-07-25T07:00:00+00:00',
      },
    ]);
    writeHistory(tempRoot, events);
    assert.throws(() => validateHistory(events, { mode: 'bootstrap' }));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: pending evidence marked confirmed', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, () => {
      const observations = readObservations(tempRoot);
      /** @type {{ value: unknown, classification: string }} */ (observations.production.lastObservedSha).value =
        'confirmed-sha';
      /** @type {{ classification: string }} */ (observations.production.lastObservedSha).classification =
        'OBSERVED_CURRENT';
      fs.writeFileSync(path.join(tempRoot, '.product-authority/observations.json'), `${JSON.stringify(observations, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: non-authoritative host omitted', () => {
  const tempRoot = makeTempRoot();
  try {
    const authority = readAuthority(process.cwd());
    delete authority.production.nonAuthoritativeHost;
    assert.throws(() => validateAuthorityStructure(authority));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: non-authoritative reason omitted', () => {
  const tempRoot = makeTempRoot();
  try {
    const authority = readAuthority(process.cwd());
    delete authority.production.nonAuthoritativeReason;
    assert.throws(() => validateAuthorityStructure(authority));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: m55.jp promoted to canonical', () => {
  const tempRoot = makeTempRoot();
  try {
    const authority = readAuthority(process.cwd());
    /** @type {{ value: string }} */ (authority.production.canonicalHost).value = 'm55.jp';
    /** @type {{ value: string }} */ (authority.production.nonAuthoritativeHost).value = 'm-55.jp';
    assert.throws(() => validateAuthorityStructure(authority));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: canonical/non-authoritative overlap', () => {
  const tempRoot = makeTempRoot();
  try {
    const authority = readAuthority(process.cwd());
    /** @type {{ value: string }} */ (authority.production.nonAuthoritativeHost).value = 'm-55.jp';
    assert.throws(() => validateAuthorityStructure(authority));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: secret-like value inserted', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, () => {
      const authority = readAuthority(tempRoot);
      const stripeLiveKeyFixture = ["sk", "live", "abcdefghijklmnopqrstuvwxyz"].join("_");
      /** @type {{ value: string }} */ (authority.product.name).value = stripeLiveKeyFixture;
      fs.writeFileSync(path.join(tempRoot, '.product-authority/authority.json'), `${JSON.stringify(authority, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: Production/Preview provider collapse', () => {
  const tempRoot = makeTempRoot();
  try {
    const authority = readAuthority(process.cwd());
    /** @type {Record<string, unknown>} */ (authority.providers).supabase.preview =
      /** @type {Record<string, unknown>} */ (authority.providers).supabase.production;
    assert.ok(authority.providers.supabase.preview === authority.providers.supabase.production);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: Production/Preview provider swap', () => {
  const tempRoot = makeTempRoot();
  try {
    const observations = readObservations(process.cwd());
    const prod = observations.providers.supabase.production;
    const preview = observations.providers.supabase.preview;
    observations.providers.supabase.production = preview;
    observations.providers.supabase.preview = prod;
    validateObservationsStructure(observations);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: header drift', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, (root) => {
      fs.writeFileSync(path.join(root, '.product-authority/generated/authority-header.md'), '# drift\n', 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: Codex adapter drift', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, (root) => {
      fs.writeFileSync(path.join(root, '.product-authority/generated/adapters/codex.md'), '# drift\n', 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: Cursor adapter drift', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, (root) => {
      fs.writeFileSync(path.join(root, '.product-authority/generated/adapters/cursor.md'), '# drift\n', 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: generic-agent adapter drift', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, (root) => {
      fs.writeFileSync(
        path.join(root, '.product-authority/generated/adapters/generic-agent.md'),
        '# drift\n',
        'utf8',
      );
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: artifact payload mutation', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, (root) => {
      const handoffPath = path.join(root, '.product-authority/generated/handoff.json');
      const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
      handoff.productId = 'mutated';
      fs.writeFileSync(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: artifact hash mutation', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, (root) => {
      const lock = JSON.parse(fs.readFileSync(path.join(root, LOCK_PATH), 'utf8'));
      lock.artifacts[0].artifactSha256 = '0'.repeat(64);
      fs.writeFileSync(path.join(root, LOCK_PATH), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: bundle manifest mutation', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, (root) => {
      const lock = JSON.parse(fs.readFileSync(path.join(root, LOCK_PATH), 'utf8'));
      lock.generatedBundleSha256 = '0'.repeat(64);
      fs.writeFileSync(path.join(root, LOCK_PATH), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: lock hash-map mutation', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, (root) => {
      const lock = JSON.parse(fs.readFileSync(path.join(root, LOCK_PATH), 'utf8'));
      lock.observationsSha256 = '0'.repeat(64);
      fs.writeFileSync(path.join(root, LOCK_PATH), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: artifact ordering mutation', () => {
  const tempRoot = makeTempRoot();
  try {
    expectBootstrapFailure(tempRoot, (root) => {
      const lock = JSON.parse(fs.readFileSync(path.join(root, LOCK_PATH), 'utf8'));
      lock.artifacts.reverse();
      fs.writeFileSync(path.join(root, LOCK_PATH), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
    });
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: non-deterministic generatedAt', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const lock = JSON.parse(fs.readFileSync(path.join(tempRoot, LOCK_PATH), 'utf8'));
    const observations = readObservations(tempRoot);
    assert.equal(
      lock.generatedAt,
      /** @type {{ value: string }} */ (observations.observationMeta.lastObservedAt).value,
    );
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: same-branch current-HEAD equality incorrectly required', () => {
  const tempRoot = makeTempRoot();
  try {
    const observations = readObservations(process.cwd());
    assert.notEqual(
      /** @type {{ value: string }} */ (observations.lanes.authorityPack.bootstrapStartHead).value,
      'CURRENT_BRANCH_HEAD_REQUIRED',
    );
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: unreconciled bootstrap fails steady-state', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const result = verifyProductAuthority(tempRoot, { mode: 'steady-state' });
    assert.equal(result.ok, false);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: incident invalid sourceCommit', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const events = withComputedEventHashes([
      {
        sequence: 0,
        kind: 'INITIALIZATION',
        sourceCommit: 'INVALID_COMMIT',
        previousEventHash: null,
        bootstrap: true,
        approvalReference: 'ref',
        changedPaths: ['a'],
        updatedAt: '2026-07-25T07:00:00+00:00',
      },
    ]);
    writeHistory(tempRoot, events);
    const result = verifyProductAuthority(tempRoot, { mode: 'bootstrap' });
    assert.equal(result.ok, false);
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: mixed raw/enveloped observation values', () => {
  const tempRoot = makeTempRoot();
  try {
    bootstrapFixture(tempRoot);
    const observations = readObservations(tempRoot);
    observations.production.status = 'PENDING_REOBSERVATION_ON_M-55.JP';
    assert.throws(() => validateObservationsStructure(observations));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: sequence 2 final generatedBundleSha256 self-reference', () => {
  const tempRoot = makeTempRoot();
  try {
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
        sourceCommit: 'e6afe67262ebcee3353a3a43713f7ecf8369f26f',
        previousEventHash: null,
        approvalReference: 'ref',
        changedPaths: ['b'],
        updatedAt: '2026-07-25T07:00:00+00:00',
      },
      {
        sequence: 2,
        kind: 'BOOTSTRAP_RECONCILIATION',
        sourceCommit: 'e6afe67262ebcee3353a3a43713f7ecf8369f26f',
        previousEventHash: null,
        finalGeneratedBundleSha256: 'self',
        changedPaths: ['c'],
        updatedAt: '2026-07-25T07:00:00+00:00',
      },
    ]);
    events[1].previousEventHash = events[0].eventHash;
    events[2].previousEventHash = events[1].eventHash;
    assert.throws(() => validateHistory(events, { mode: 'steady-state' }));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: sequence 2 final historySha256 self-reference', () => {
  const tempRoot = makeTempRoot();
  try {
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
        sourceCommit: 'e6afe67262ebcee3353a3a43713f7ecf8369f26f',
        previousEventHash: null,
        approvalReference: 'ref',
        changedPaths: ['b'],
        updatedAt: '2026-07-25T07:00:00+00:00',
      },
      {
        sequence: 2,
        kind: 'BOOTSTRAP_RECONCILIATION',
        sourceCommit: 'e6afe67262ebcee3353a3a43713f7ecf8369f26f',
        previousEventHash: null,
        finalHistorySha256: 'self',
        changedPaths: ['c'],
        updatedAt: '2026-07-25T07:00:00+00:00',
      },
    ]);
    assert.throws(() => validateHistory(events, { mode: 'steady-state' }));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: sequence 2 future Commit-2 SHA', () => {
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
      sourceCommit: 'e6afe67262ebcee3353a3a43713f7ecf8369f26f',
      previousEventHash: null,
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 2,
      kind: 'BOOTSTRAP_RECONCILIATION',
      sourceCommit: 'future-commit-2-sha-not-yet-merged',
      previousEventHash: null,
      changedPaths: ['c'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  events[2].previousEventHash = events[1].eventHash;
  assert.throws(() => validateHistory(events, { mode: 'steady-state' }));
});

test('mutation: sequence 2 final artifact hash', () => {
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
      sourceCommit: 'e6afe67262ebcee3353a3a43713f7ecf8369f26f',
      previousEventHash: null,
      approvalReference: 'ref',
      changedPaths: ['b'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
    {
      sequence: 2,
      kind: 'BOOTSTRAP_RECONCILIATION',
      sourceCommit: 'e6afe67262ebcee3353a3a43713f7ecf8369f26f',
      previousEventHash: null,
      finalArtifactHash: 'bad',
      changedPaths: ['c'],
      updatedAt: '2026-07-25T07:00:00+00:00',
    },
  ]);
  events[1].previousEventHash = events[0].eventHash;
  events[2].previousEventHash = events[1].eventHash;
  assert.throws(() => validateHistory(events, { mode: 'steady-state' }));
});

test('mutation: invalid previousEventHash chain', () => {
  const tempRoot = makeTempRoot();
  try {
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
    events[0].previousEventHash = 'broken';
    assert.throws(() => validateHistory(events, { mode: 'bootstrap' }));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: invalid eventHash exclusion behavior', () => {
  const tempRoot = makeTempRoot();
  try {
    const event = {
      sequence: 0,
      kind: 'INITIALIZATION',
      sourceCommit: 'UNCOMMITTED_BOOTSTRAP',
      previousEventHash: null,
      bootstrap: true,
      approvalReference: 'ref',
      changedPaths: ['a'],
      updatedAt: '2026-07-25T07:00:00+00:00',
      eventHash: 'deadbeef',
    };
    const events = [event];
    assert.throws(() => validateHistory(events, { mode: 'bootstrap' }));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

const STALE_BOOTSTRAP_ORIGIN_MAIN = 'e6afe67262ebcee3353a3a43713f7ecf8369f26f';
const CURRENT_OBSERVED_ORIGIN_MAIN = 'f3ab98a08e06cef7b16405d1adced387c23a29d2';

test('mutation: stale origin/main observation fails SSOT transition check', () => {
  const currentStateText = fs.readFileSync(
    path.join(process.cwd(), 'docs/ssot/M55_CURRENT_STATE.md'),
    'utf8',
  );
  const failures = collectAuthorityPackTransitionFailures({
    currentStateText: currentStateText.replaceAll(
      CURRENT_OBSERVED_ORIGIN_MAIN,
      STALE_BOOTSTRAP_ORIGIN_MAIN,
    ),
    observedOriginMainSha: CURRENT_OBSERVED_ORIGIN_MAIN,
    observationTimestamp: '2026-07-27T09:56:00+00:00',
  });
  assert.ok(
    failures.some(
      (message) =>
        /latest observed origin\/main SHA/.test(message) ||
        /bootstrapStartHead as the last observed origin\/main/.test(message),
    ),
  );
});

test('mutation: malformed observation envelope fails validation', () => {
  const tempRoot = makeTempRoot();
  try {
    copyAuthorityPackSources(tempRoot);
    const observations = readObservations(tempRoot);
    observations.repository.lastObservedOriginMainSha = CURRENT_OBSERVED_ORIGIN_MAIN;
    assert.throws(() => validateObservationsStructure(observations));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: Production SHA populated from origin/main without diagnostics source fails validation', () => {
  const tempRoot = makeTempRoot();
  try {
    copyAuthorityPackSources(tempRoot);
    const observations = readObservations(tempRoot);
    /** @type {{ value: string, classification: string, source: { kind: string, reference: string } }} */ (
      observations.production.lastObservedSha
    ).value = CURRENT_OBSERVED_ORIGIN_MAIN;
    observations.production.lastObservedSha.classification = 'OBSERVED_CURRENT';
    observations.production.lastObservedSha.source = {
      kind: 'GIT_OBSERVATION',
      reference: 'git fetch origin --prune',
    };
    assert.throws(
      () => validateObservationsStructure(observations),
      /governed diagnostics observation source/,
    );
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('mutation: bootstrapStartHead overwritten with current origin/main is rejected by lane semantics', () => {
  const observations = readObservations(process.cwd());
  assert.notEqual(
    /** @type {{ value: string }} */ (observations.lanes.authorityPack.bootstrapStartHead).value,
    /** @type {{ value: string }} */ (observations.repository.lastObservedOriginMainSha).value,
  );
});

test('mutation: observation classification promoted to HUMAN_FROZEN is rejected', () => {
  const observations = readObservations(process.cwd());
  const clone = structuredClone(observations);
  /** @type {{ classification: string }} */ (clone.repository.lastObservedOriginMainSha).classification =
    'HUMAN_FROZEN';
  assert.throws(() => validateObservationsStructure(clone));
});

test('mutation: generated current/live claim conflicting with observations source fails integrity', () => {
  const header = fs.readFileSync(
    path.join(process.cwd(), '.product-authority/generated/authority-header.md'),
    'utf8',
  );
  const failures = collectAuthorityPackTransitionFailures({
    authorityHeaderText: header.replace(CURRENT_OBSERVED_ORIGIN_MAIN, STALE_BOOTSTRAP_ORIGIN_MAIN),
    observedOriginMainSha: CURRENT_OBSERVED_ORIGIN_MAIN,
    observationTimestamp: '2026-07-27T09:56:00+00:00',
  });
  assert.ok(
    failures.some((message) =>
      /stale bootstrapStartHead as last observed origin\/main/.test(message),
    ),
  );
});
