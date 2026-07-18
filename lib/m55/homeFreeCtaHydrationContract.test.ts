import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');
const homePanelSource = readFileSync(join(repoRoot, 'components/home/HomePanel.tsx'), 'utf8');
const homePanelCss = readFileSync(join(repoRoot, 'components/home/HomePanel.module.css'), 'utf8');

const heroStartIndex = homePanelSource.indexOf('data-testid="m55-home-hero"');
const heroSource = homePanelSource.slice(
  heroStartIndex,
  homePanelSource.indexOf('</section>', heroStartIndex) + '</section>'.length,
);

const freeCtaStart = homePanelSource.indexOf('function FreeCtaButton');
const freeCtaEnd = homePanelSource.indexOf('\nexport default function HomePanel', freeCtaStart);
const freeCtaSource = homePanelSource.slice(freeCtaStart, freeCtaEnd);

describe('homeFreeCtaHydrationContract — lower FreeCtaButton loading stability', () => {
  it('does not return null solely because Clerk isLoaded is false', () => {
    assert.doesNotMatch(freeCtaSource, /if\s*\(\s*!isLoaded\s*\)\s*return\s+null/);
    assert.match(freeCtaSource, /if\s*\(\s*!isLoaded\s*\)\s*\{/);
  });

  it('renders a disabled loading control with aria-busy while auth state is unknown', () => {
    const loadingBranch = freeCtaSource.match(/if\s*\(\s*!isLoaded\s*\)\s*\{[\s\S]*?\n  \}/)?.[0];
    assert.ok(loadingBranch, 'expected a !isLoaded loading branch in FreeCtaButton');
    assert.match(loadingBranch!, /type="button"/);
    assert.match(loadingBranch!, /disabled/);
    assert.match(loadingBranch!, /aria-busy="true"/);
    assert.match(loadingBranch!, /data-testid=\{testIdLoading\}/);
    assert.match(loadingBranch!, /\{label\}/);
    assert.doesNotMatch(loadingBranch!, /onClick=/);
    assert.doesNotMatch(loadingBranch!, /<Link/);
    assert.doesNotMatch(loadingBranch!, /href=/);
  });

  it('keeps the approved visible label via copy constants at both lower call sites', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.freeResultCtaJa, '無料で見てみる');
    assert.equal(home.finalCtaPrimaryJa, '無料で見てみる');
    assert.match(homePanelSource, /label=\{homeCopy\.freeResultCtaJa\}/);
    assert.match(homePanelSource, /label=\{homeCopy\.finalCtaPrimaryJa\}/);
  });

  it('preserves loaded no-profile intake behavior', () => {
    const noProfileBranch = freeCtaSource.match(
      /if\s*\(\s*!hasProfile\s*\)\s*\{[\s\S]*?\n  \}/,
    )?.[0];
    assert.ok(noProfileBranch, 'expected a !hasProfile branch in FreeCtaButton');
    assert.match(noProfileBranch!, /type="button"/);
    assert.match(noProfileBranch!, /data-testid=\{testIdIntake\}/);
    assert.match(noProfileBranch!, /onClick=\{onOpenIntake\}/);
    assert.doesNotMatch(noProfileBranch!, /disabled/);
  });

  it('preserves loaded has-profile routing to /core', () => {
    assert.match(freeCtaSource, /<Link href=\{ctaCopy\.coreFreeHref\}/);
    assert.match(freeCtaSource, /data-testid=\{testIdCore\}/);
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.cta.coreFreeHref, '/core');
  });

  it('wires loading test ids for free preview and final CTA sections', () => {
    assert.match(homePanelSource, /testIdLoading="m55-home-free-preview-cta-loading"/);
    assert.match(homePanelSource, /testIdLoading="m55-home-final-cta-loading"/);
  });

  it('styles loading CTA as legible disabled primary without collapsing layout', () => {
    assert.match(homePanelCss, /\.ctaFreeLoading\[disabled\][\s\S]*cursor:\s*not-allowed/);
    assert.match(homePanelCss, /\.ctaFreeLoading\[disabled\][\s\S]*opacity:\s*1/);
    assert.match(homePanelCss, /\.ctaFreeLoading\[disabled\][\s\S]*background:\s*#0b1a2b/);
    assert.match(homePanelCss, /\.ctaFreeLoading\[disabled\][\s\S]*color:\s*#fffaf1/);
  });
});

describe('homeFreeCtaHydrationContract — frozen poster hero no-change proof', () => {
  it('keeps the pre-gate hero CTA gating and poster structure unchanged', () => {
    assert.match(heroSource, /\{isLoaded && !hasProfile && \(\s*<button/);
    assert.match(heroSource, /\{isLoaded && hasProfile && \(\s*<button/);
    assert.match(heroSource, /data-testid="m55-home-open-birth-intake"/);
    assert.match(heroSource, /data-testid="m55-home-has-profile-hero"/);
    assert.match(heroSource, /className=\{styles\.posterHeroCta\}/);
    assert.doesNotMatch(heroSource, /ctaFreeLoading/);
    assert.doesNotMatch(heroSource, /FreeCtaButton/);
  });

  it('matches the captured frozen hero source hash', () => {
    const heroHash = createHash('sha256').update(heroSource).digest('hex');
    assert.equal(
      heroHash,
      '33fad32de7ecb88c03780200155e50eff753846b4361533a9c955fe0d2aa6273',
    );
  });
});
