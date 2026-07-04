import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const LEGACY_IFRAME_ROUTE_FILES = [
  'app/ai-chat/page.tsx',
  'app/tarot/page.tsx',
  'app/meter/page.tsx',
  'app/calendar/page.tsx',
] as const;

const CRAWLER_RISK_TERMS = [
  'AIチャット',
  '鑑定',
  'タロット',
  '運勢',
  'プレミアム鑑定',
  '占い',
  '霊視',
  '予言',
  '開運',
] as const;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

function readRepoFile(relativePath: string): string {
  const abs = join(repoRoot, relativePath);
  assert.ok(existsSync(abs), `missing file: ${relativePath}`);
  return readFileSync(abs, 'utf8');
}

function listHtmlUnderLegacy(): string[] {
  const legacyDir = join(repoRoot, 'public/legacy');
  if (!existsSync(legacyDir)) return [];

  const htmlFiles: string[] = [];
  const stack = [legacyDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (entry.isFile() && entry.name.endsWith('.html')) {
        htmlFiles.push(abs.slice(repoRoot.length + 1).replaceAll('\\', '/'));
      }
    }
  }
  return htmlFiles;
}

describe('legacyPublicExposure', () => {
  it('public/legacy must not contain crawler-servable HTML', () => {
    assert.deepEqual(listHtmlUnderLegacy(), []);
  });

  it('legacy iframe app routes must not reference /legacy/', () => {
    for (const relativePath of LEGACY_IFRAME_ROUTE_FILES) {
      const src = readRepoFile(relativePath);
      assert.doesNotMatch(src, /\/legacy\//, `${relativePath} must not iframe /legacy/`);
      assert.match(src, /notFound\(/, `${relativePath} must fail closed with notFound()`);
    }
  });

  it('public/legacy must not retain Stripe crawler risk terms when present', () => {
    const legacyDir = join(repoRoot, 'public/legacy');
    if (!existsSync(legacyDir)) return;

    const stack = [legacyDir];
    while (stack.length > 0) {
      const dir = stack.pop()!;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const abs = join(dir, entry.name);
        if (entry.isDirectory()) {
          stack.push(abs);
          continue;
        }
        if (!entry.isFile()) continue;
        const rel = abs.slice(repoRoot.length + 1).replaceAll('\\', '/');
        const text = readFileSync(abs, 'utf8');
        for (const term of CRAWLER_RISK_TERMS) {
          assert.equal(
            text.includes(term),
            false,
            `${rel} must not contain crawler risk term: ${term}`,
          );
        }
      }
    }
  });
});
