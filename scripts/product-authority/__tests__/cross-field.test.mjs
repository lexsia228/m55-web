import assert from 'node:assert/strict';
import test from 'node:test';
import { readAuthority } from '../validate.mjs';
import { readObservations } from '../observations.mjs';
import { validateAuthorityStructure } from '../validate.mjs';

test('diagnostics URL host matches canonical host', () => {
  const authority = readAuthority(process.cwd());
  const diagnostics = /** @type {{ value: string }} */ (authority.production.diagnosticsUrl).value;
  const canonicalHost = /** @type {{ value: string }} */ (authority.production.canonicalHost).value;
  assert.ok(diagnostics.includes(canonicalHost));
});

test('non-authoritative host differs from canonical host', () => {
  const authority = readAuthority(process.cwd());
  const canonicalHost = /** @type {{ value: string }} */ (authority.production.canonicalHost).value;
  const nonAuthHost = /** @type {{ value: string }} */ (authority.production.nonAuthoritativeHost).value;
  assert.notEqual(canonicalHost, nonAuthHost);
});

test('vercel production branch matches repository default branch', () => {
  const authority = readAuthority(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (authority.deployment.vercelProductionBranch).value,
    /** @type {{ value: string }} */ (authority.repository.defaultBranch).value,
  );
});

test('branch-local self funnel head is not treated as merged runtime authority', () => {
  const authority = readAuthority(process.cwd());
  const observations = readObservations(process.cwd());
  assert.equal(/** @type {{ value: boolean }} */ (authority.runtimeAuthority.branchLocalNotMergedRuntime).value, true);
  assert.notEqual(
    /** @type {{ value: string }} */ (observations.lanes.selfFunnel.head).value,
    /** @type {{ value: string }} */ (observations.repository.lastObservedOriginMainSha).value,
  );
});

test('production observed sha uses diagnostics source not git observation conflation', () => {
  const observations = readObservations(process.cwd());
  const prodSha = /** @type {{ value: unknown, source: { kind: string } }} */ (
    observations.production.lastObservedSha
  );
  if (prodSha.value !== null) {
    assert.equal(prodSha.source.kind, 'DIAGNOSTICS_HTTP_OBSERVATION');
  }
});

test('provider production and preview environments are separate objects', () => {
  const authority = readAuthority(process.cwd());
  for (const provider of ['supabase', 'clerk', 'stripe']) {
    const prod = /** @type {Record<string, unknown>} */ (
      /** @type {Record<string, unknown>} */ (authority.providers)[provider]
    ).production;
    const preview = /** @type {Record<string, unknown>} */ (
      /** @type {Record<string, unknown>} */ (authority.providers)[provider]
    ).preview;
    assert.notEqual(prod, preview);
  }
});

test('canonical origin uses https scheme', () => {
  const authority = readAuthority(process.cwd());
  assert.match(
    /** @type {{ value: string }} */ (authority.production.canonicalOrigin).value,
    /^https:\/\//,
  );
});

test('promoting m55.jp to canonical host fails validation', () => {
  const authority = readAuthority(process.cwd());
  /** @type {{ value: string }} */ (authority.production.canonicalHost).value = 'm55.jp';
  /** @type {{ value: string }} */ (authority.production.nonAuthoritativeHost).value = 'm55.jp';
  assert.throws(() => validateAuthorityStructure(authority));
});

test('missing non-authoritative reason still has envelope in authority', () => {
  const authority = readAuthority(process.cwd());
  assert.ok(authority.production.nonAuthoritativeReason);
});

test('git main sha observation classification is OBSERVED_CURRENT not merged runtime claim', () => {
  const observations = readObservations(process.cwd());
  assert.equal(
    /** @type {{ classification: string }} */ (observations.repository.lastObservedOriginMainSha).classification,
    'OBSERVED_CURRENT',
  );
});
