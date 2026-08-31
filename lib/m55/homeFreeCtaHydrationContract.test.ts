import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';
import {
  DTR_PAID_QUESTIONNAIRE_HREF,
  resolveFreeCtaLabel,
  resolveHomeCtaHref,
  resolveHomeCtaShowsLoginFreeSupport,
} from './selfFunnel/selfFunnelRuntimeState';
import { PAID_QUESTIONNAIRE_COPY_V1 } from './paidResult/questionnaireCopyV1';

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
  it('fail-opens to intake while Clerk auth state is unknown', () => {
    assert.match(freeCtaSource, /if\s*\(\s*!hydrationReady\s*\)\s*\{/);
    const loadingBranch = freeCtaSource.match(/if\s*\(\s*!hydrationReady\s*\)\s*\{[\s\S]*?\n  \}/)?.[0];
    assert.ok(loadingBranch, 'expected a !hydrationReady branch in FreeCtaButton');
    assert.match(loadingBranch!, /onClick=\{onOpenIntake\}/);
    assert.match(loadingBranch!, /data-testid=\{testIdIntake\}/);
    assert.match(loadingBranch!, /type="button"/);
    assert.doesNotMatch(loadingBranch!, /disabled/);
    assert.doesNotMatch(loadingBranch!, /aria-busy="true"/);
    assert.doesNotMatch(loadingBranch!, /<Link/);
  });

  it('uses state-aware free CTA labels at lower call sites', () => {
    assert.equal(resolveFreeCtaLabel('EMPTY'), '無料で見てみる');
    assert.equal(resolveFreeCtaLabel('FREE_RESULT_READY'), '無料結果を開く');
    assert.equal(resolveFreeCtaLabel('PAID_QUESTIONS_IN_PROGRESS'), 'プレミアムの続きを見る');
    assert.equal(
      resolveFreeCtaLabel('PAID_QUESTIONS_COMPLETE'),
      '回答を確認してプランを見る',
    );
    assert.match(homePanelSource, /label=\{freeCtaLabel\}/);
    assert.match(homePanelSource, /resolveFreeCtaLabel/);
  });

  it('preserves loaded empty-stage intake behavior', () => {
    const emptyBranch = freeCtaSource.match(
      /if\s*\(\s*stage === 'EMPTY'\s*\)\s*\{[\s\S]*?\n  \}/,
    )?.[0];
    assert.ok(emptyBranch, 'expected a stage === EMPTY branch in FreeCtaButton');
    assert.match(emptyBranch!, /type="button"/);
    assert.match(emptyBranch!, /data-testid=\{testIdIntake\}/);
    assert.match(emptyBranch!, /onClick=\{onOpenIntake\}/);
    assert.doesNotMatch(emptyBranch!, /disabled/);
  });

  it('routes premium stages to DTR questionnaire, free stages to /core', () => {
    assert.match(freeCtaSource, /resolveHomeCtaHref\(stage\)/);
    assert.equal(resolveHomeCtaHref('FREE_RESULT_READY'), '/core');
    assert.equal(resolveHomeCtaHref('BASIC_INFO_COMPLETE'), '/core');
    assert.equal(resolveHomeCtaHref('PAID_QUESTIONS_IN_PROGRESS'), DTR_PAID_QUESTIONNAIRE_HREF);
    assert.equal(resolveHomeCtaHref('PAID_QUESTIONS_COMPLETE'), DTR_PAID_QUESTIONNAIRE_HREF);
    assert.equal(resolveHomeCtaHref('PLAN_SELECTION'), DTR_PAID_QUESTIONNAIRE_HREF);
    assert.equal(resolveHomeCtaHref('PURCHASED'), '/dtr/core');
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.cta.coreFreeHref, '/core');
  });

  it('hides login-free support copy for premium purchase-state CTAs', () => {
    assert.match(homePanelSource, /resolveHomeCtaShowsLoginFreeSupport/);
    assert.equal(resolveHomeCtaShowsLoginFreeSupport('FREE_RESULT_READY'), true);
    assert.equal(resolveHomeCtaShowsLoginFreeSupport('PAID_QUESTIONS_IN_PROGRESS'), false);
    assert.equal(resolveHomeCtaShowsLoginFreeSupport('PAID_QUESTIONS_COMPLETE'), false);
    assert.equal(resolveHomeCtaShowsLoginFreeSupport('PURCHASED'), false);
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

describe('homeFreeCtaHydrationContract — poster hero state-aware CTA', () => {
  it('keeps poster hero CTA clickable for fresh guests without Clerk gate', () => {
    assert.match(heroSource, /\{\(!hydrationReady \|\| !hasProfile\) && \(\s*<button/);
    assert.match(heroSource, /\{hydrationReady && hasProfile && \(\s*<Link/);
    assert.match(heroSource, /data-testid="m55-home-open-birth-intake"/);
    assert.match(heroSource, /data-testid="m55-home-has-profile-hero"/);
    assert.match(heroSource, /\{freeCtaLabel\}/);
    assert.match(heroSource, /href=\{homeCtaHref\}/);
    assert.doesNotMatch(heroSource, /ctaFreeLoading/);
    assert.doesNotMatch(heroSource, /m55-home-hero-cta-loading/);
    assert.doesNotMatch(heroSource, /FreeCtaButton/);
  });
});

describe('homeFreeCtaHydrationContract — SSR/first-client element stability', () => {
  it('defers profile-dependent funnel reads until after client hydration', () => {
    assert.match(homePanelSource, /const \[clientHydrated, setClientHydrated\] = useState\(false\)/);
    assert.match(homePanelSource, /setClientHydrated\(true\)/);
    assert.match(homePanelSource, /if\s*\(\s*!clientHydrated\s*\)/);
    assert.match(homePanelSource, /const hydrationReady = clientHydrated && isLoaded/);
    assert.match(homePanelSource, /hydrationReady=\{hydrationReady\}/);
  });

  it('keeps neutral button shell before hydration resolves', () => {
    const neutralBranch = freeCtaSource.match(/if\s*\(\s*!hydrationReady\s*\)\s*\{[\s\S]*?\n  \}/)?.[0];
    assert.ok(neutralBranch, 'expected neutral hydration branch in FreeCtaButton');
    assert.match(neutralBranch!, /type="button"/);
    assert.doesNotMatch(neutralBranch!, /<Link/);
  });
});

describe('homeFreeCtaHydrationContract — premium Q1 universality guard', () => {
  it('does not expose employment-assumptive paid Q1 copy', () => {
    const q1 = PAID_QUESTIONNAIRE_COPY_V1[0]!;
    assert.doesNotMatch(q1.questionJa, /今の仕事で/);
    assert.equal(q1.shortLabelJa, '取り組みの焦点');
    assert.match(q1.sceneContextJa, /仕事・学業・家事・活動/);
  });
});
