import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** /core client seal + free display path — must not embed internal Japanese trait labels. */
const CLIENT_SEAL_PATH_FILES = [
  'lib/m55/coreFreePublicDisplay.ts',
  'lib/m55/coreFreeCompositionalGrammar.ts',
  'lib/m55/coreResult/store.ts',
  'lib/m55/coreResult/migrateV1.ts',
  'lib/m55/coreResult/buildCoreResult.client.ts',
  'lib/m55/coreResult/canonicalBoundary.client.ts',
  'lib/m55/coreResult/typeCatalogScores.ts',
  'lib/m55/coreResult/coreEngineVersion.ts',
  'components/core/CoreEssencePanel.tsx',
  'components/core/CoreHeroSection.tsx',
] as const;

const INTERNAL_BUNDLE_TERMS = [
  '構造探求',
  '構造探求型',
  'Blueprint of',
  'First Record',
  'パーソナルアルゴリズム',
  'typeCatalogLabels',
  "from './typeCatalog'",
  'from "./typeCatalog"',
] as const;

const REQUIRED_LIVING_TERMS = [
  '納得して組み立てる',
  '全体をつなげて整える',
  'まだ入口',
  '4章で読み返せる形',
] as const;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

function readRepoFile(relativePath: string): string {
  const abs = join(repoRoot, relativePath);
  assert.ok(existsSync(abs), `missing file: ${relativePath}`);
  return readFileSync(abs, 'utf8');
}

function combinedClientSealSources(): string {
  return CLIENT_SEAL_PATH_FILES.map(readRepoFile).join('\n');
}

describe('/core client bundle isolation — CATEGORY-2-M55-CORE-CLIENT-BUNDLE-INTERNAL-LABEL-STRIP-REV1', () => {
  it('client seal path sources exist', () => {
    for (const rel of CLIENT_SEAL_PATH_FILES) {
      assert.ok(existsSync(join(repoRoot, rel)), rel);
    }
  });

  it('client seal path does not embed internal trait labels or full typeCatalog imports', () => {
    const blob = combinedClientSealSources();
    for (const term of INTERNAL_BUNDLE_TERMS) {
      assert.equal(blob.includes(term), false, `forbidden in client seal path: ${term}`);
    }
  });

  it('free display module keeps required living-language copy', () => {
    const src = readRepoFile('lib/m55/coreFreePublicDisplay.ts');
    for (const term of REQUIRED_LIVING_TERMS.slice(0, 2)) {
      assert.equal(src.includes(term), true, `missing living term: ${term}`);
    }
    const publicCopy = readRepoFile('components/core/corePublicCopy.ts');
    for (const term of REQUIRED_LIVING_TERMS.slice(2)) {
      assert.equal(publicCopy.includes(term), true, `missing living term: ${term}`);
    }
  });

  it('coreType-based alias map covers TYPE_01 through TYPE_10', () => {
    const src = readRepoFile('lib/m55/coreFreePublicDisplay.ts');
    for (let i = 1; i <= 10; i++) {
      const id = `TYPE_${String(i).padStart(2, '0')}`;
      assert.match(src, new RegExp(`${id}:`), `missing alias key ${id}`);
    }
  });
});
