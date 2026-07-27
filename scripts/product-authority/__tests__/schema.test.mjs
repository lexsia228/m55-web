import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { validateAuthorityStructure } from '../validate.mjs';
import { readAuthority } from '../validate.mjs';
import {
  cleanupTempRoot,
  copyAuthorityPackSources,
  makeTempRoot,
} from '../history.mjs';
import { bootstrapFixture } from '../generate.mjs';

test('schema file exists', () => {
  const schemaPath = path.resolve('.product-authority/schema/authority-pack.schema.json');
  assert.ok(fs.existsSync(schemaPath));
});

test('authority includes schemaVersion', () => {
  const authority = readAuthority(process.cwd());
  assert.equal(authority.schemaVersion, '1.0.0');
});

test('authority product.id is m55', () => {
  const authority = readAuthority(process.cwd());
  assert.equal(/** @type {{ value: string }} */ (authority.product.id).value, 'm55');
});

test('authority canonical host is m-55.jp', () => {
  const authority = readAuthority(process.cwd());
  assert.equal(/** @type {{ value: string }} */ (authority.production.canonicalHost).value, 'm-55.jp');
});

test('authority non-authoritative host is m55.jp', () => {
  const authority = readAuthority(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (authority.production.nonAuthoritativeHost).value,
    'm55.jp',
  );
});

test('authority repository is lexsia228/m55-web', () => {
  const authority = readAuthority(process.cwd());
  assert.equal(
    /** @type {{ value: string }} */ (authority.repository.github).value,
    'lexsia228/m55-web',
  );
});

test('authority default branch is main', () => {
  const authority = readAuthority(process.cwd());
  assert.equal(/** @type {{ value: string }} */ (authority.repository.defaultBranch).value, 'main');
});

test('authority includes all six provider environments', () => {
  const authority = readAuthority(process.cwd());
  for (const provider of ['supabase', 'clerk', 'stripe']) {
    for (const env of ['production', 'preview']) {
      assert.ok(/** @type {Record<string, unknown>} */ (authority.providers)[provider]);
      assert.ok(
        /** @type {Record<string, unknown>} */ (
          /** @type {Record<string, unknown>} */ (authority.providers)[provider]
        )[env],
      );
    }
  }
});

test('authority leaf facts use envelope shape', () => {
  const tempRoot = makeTempRoot();
  try {
    copyAuthorityPackSources(tempRoot);
    validateAuthorityStructure(readAuthority(tempRoot));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});

test('schema rejects missing product.id envelope fields in validator', () => {
  const tempRoot = makeTempRoot();
  try {
    copyAuthorityPackSources(tempRoot);
    const authority = readAuthority(tempRoot);
    /** @type {Record<string, unknown>} */ (authority.product.id).classification = 'INVALID';
    assert.throws(() => validateAuthorityStructure(authority));
  } finally {
    cleanupTempRoot(tempRoot);
  }
});
