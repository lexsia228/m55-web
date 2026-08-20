import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

const SITEMAP_EXPECTED = [
  '/home',
  '/core',
  '/dtr/lp',
  '/how-m55-works',
  '/ten-views',
  '/synastry',
  '/support',
] as const;

describe('G4 organic discovery — redirects', () => {
  it('/ permanently redirects to /home', () => {
    const page = read('app/page.tsx');
    assert.match(page, /permanentRedirect\s*\(\s*['"]\/home['"]\s*\)/);
    assert.doesNotMatch(page, /\bredirect\s*\(/);
  });

  it('/pricing permanently redirects to /dtr/lp', () => {
    const page = read('app/pricing/page.tsx');
    assert.match(page, /permanentRedirect\s*\(\s*['"]\/dtr\/lp['"]\s*\)/);
    assert.doesNotMatch(page, /PLAN_COMPARISON/);
  });
});

describe('G4 organic discovery — sitemap', () => {
  it('exact public discovery set only', () => {
    const sitemap = read('app/sitemap.ts');
    const block = sitemap.match(
      /PUBLIC_DISCOVERY_PATHS\s*=\s*\[([\s\S]*?)\]\s*as const/,
    )?.[1];
    assert.ok(block);
    const paths = [...block.matchAll(/["'](\/[^"']+)["']/g)].map((m) => m[1]);
    assert.deepEqual(paths, [...SITEMAP_EXPECTED]);
    assert.match(sitemap, /PUBLIC_DISCOVERY_PATHS\.map/);
  });

  it('excludes root, /dtr shelf, /pricing, Today/Weekly', () => {
    const sitemap = read('app/sitemap.ts');
    assert.doesNotMatch(sitemap, /["']\/["']/);
    assert.doesNotMatch(sitemap, /["']\/dtr["']/);
    assert.doesNotMatch(sitemap, /["']\/pricing["']/);
    assert.doesNotMatch(sitemap, /\/today/);
    assert.doesNotMatch(sitemap, /\/weekly/);
  });

  it('does not use fake today freshness', () => {
    const sitemap = read('app/sitemap.ts');
    assert.doesNotMatch(sitemap, /lastModified/);
    assert.doesNotMatch(sitemap, /new Date\(\s*\)/);
    assert.doesNotMatch(sitemap, /2026-08-19/);
  });
});

describe('G4 organic discovery — robots and noindex', () => {
  it('preserves operational crawler boundaries', () => {
    const robots = read('app/robots.ts');
    for (const path of [
      '/dtr/core',
      '/dtr/processing',
      '/purchase/success',
      '/my',
      '/sign-in',
      '/sign-up',
      '/r/',
      '/prototype/',
      '/dev/',
      '/api/',
    ]) {
      assert.match(robots, new RegExp(path.replace(/\//g, '\\/')));
    }
    assert.match(robots, /\/dtr\$/);
    assert.match(robots, /\/dtr\/lp/);
  });

  it('/dtr, /dtr/processing, /purchase/success are noindex', () => {
    assert.match(read('app/dtr/page.tsx'), /robots:\s*\{\s*index:\s*false/);
    assert.match(read('app/dtr/processing/page.tsx'), /robots:\s*\{\s*index:\s*false/);
    assert.match(read('app/purchase/success/layout.tsx'), /robots:\s*\{\s*index:\s*false/);
  });
});

describe('G4 organic discovery — metadata identities and canonicals', () => {
  it('/home, /core, /synastry metadata identities are distinct', () => {
    const home = read('app/home/layout.tsx');
    const core = read('app/core/layout.tsx');
    const synastry = read('app/synastry/page.tsx');
    const homeTitle = home.match(/const title = ['"]([^'"]+)['"]/)?.[1];
    const coreTitle = core.match(/const title = ['"]([^'"]+)['"]/)?.[1];
    const synastryTitle = synastry.match(/const title = ['"]([^'"]+)['"]/)?.[1];
    assert.ok(homeTitle && coreTitle && synastryTitle);
    assert.notEqual(homeTitle, coreTitle);
    assert.notEqual(homeTitle, synastryTitle);
    assert.notEqual(coreTitle, synastryTitle);
  });

  it('required discovery routes have explicit canonicals', () => {
    const pairs: readonly [string, string][] = [
      ['app/home/layout.tsx', '/home'],
      ['app/core/layout.tsx', '/core'],
      ['app/dtr/lp/page.tsx', '/dtr/lp'],
      ['app/how-m55-works/page.tsx', '/how-m55-works'],
      ['app/ten-views/page.tsx', '/ten-views'],
      ['app/synastry/page.tsx', '/synastry'],
      ['app/support/page.tsx', '/support'],
    ];
    for (const [file, path] of pairs) {
      const src = read(file);
      assert.match(src, /canonical:/);
      assert.match(src, new RegExp(`canonical:\\s*['"]${path.replace(/\//g, '\\/')}['"]`));
    }
  });

  it('/dtr/lp remains authoritative Premium discovery surface', () => {
    const lp = read('app/dtr/lp/page.tsx');
    assert.match(lp, /PAID_DTR_LP_METADATA_TITLE_JA/);
    assert.match(lp, /canonical:\s*["']\/dtr\/lp["']/);
    assert.match(lp, /プレミアムレポート/);
  });
});

describe('G4 organic discovery — assets', () => {
  it('referenced root icon/OG assets exist on disk', () => {
    const layout = read('app/layout.tsx');
    assert.match(layout, /icon:\s*["']\/icons\/icon-192\.png["']/);
    assert.match(layout, /apple:\s*["']\/icons\/icon-512\.png["']/);
    assert.match(layout, /url:\s*["']\/icons\/icon-512\.png["']/);
    assert.equal(exists('public/icons/icon-192.png'), true);
    assert.equal(exists('public/icons/icon-512.png'), true);
    assert.equal(exists('public/icons/m55-core-logo.png'), false);
  });

  it('manifest references only existing icon files', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
      icons: Array<{ src: string; purpose?: string }>;
    };
    assert.equal(manifest.icons.some((i) => i.purpose === 'maskable'), false);
    assert.equal(manifest.icons.some((i) => i.src.includes('maskable')), false);
    for (const icon of manifest.icons) {
      assert.equal(exists(join('public', icon.src.replace(/^\//, ''))), true, icon.src);
    }
  });
});

describe('G4 organic discovery — hard non-changes', () => {
  it('Today/Weekly remain rejected/de-exposed', () => {
    assert.match(read('app/today/page.tsx'), /redirect\s*\(\s*['"]\/core['"]\s*\)/);
    assert.match(read('app/weekly/page.tsx'), /redirect\s*\(\s*['"]\/core['"]\s*\)/);
    assert.doesNotMatch(read('app/sitemap.ts'), /\/today|\/weekly/);
  });

  it('no Pair Premium activation and no subscription terminology in product discovery sources', () => {
    const sources = [
      'app/home/layout.tsx',
      'app/core/layout.tsx',
      'app/synastry/page.tsx',
      'app/sitemap.ts',
      'app/robots.ts',
      'app/page.tsx',
      'app/pricing/page.tsx',
    ];
    for (const rel of sources) {
      const src = read(rel);
      assert.doesNotMatch(src, /Pair Premium|PAIR_PREMIUM|subscription|サブスク|月額/);
    }
    assert.equal(read('app/synastry/page.tsx').includes('isCompatibilityCommerceEnabled'), true);
  });

  it('/how-m55-works promotes a single semantic h1', () => {
    const sections = read('components/pages/M55MethodSections.tsx');
    assert.match(sections, /<h1 id="m55-method-canonical-title"/);
    assert.equal((sections.match(/<h1\b/g) ?? []).length, 1);
    assert.doesNotMatch(sections, /<h2 id="m55-method-canonical-title"/);
  });
});
