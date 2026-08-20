import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = join(import.meta.dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const ACTIVE_HOME = 'components/home/HomePanel.tsx';
const TODAY_PAGE = 'app/today/page.tsx';
const WEEKLY_PAGE = 'app/weekly/page.tsx';
const SITEMAP = 'app/sitemap.ts';
const PUBLIC_HEADER = 'components/shell/PublicHeaderContainer.tsx';
const PUBLIC_FOOTER = 'app/_components/PublicFooter.tsx';
const DTR_CORE_PAGE = 'app/dtr/core/page.tsx';

describe('G3-04 — Today/Weekly de-exposure regression', () => {
  it('active Home contains no href="/today"', () => {
    const home = read(ACTIVE_HOME);
    assert.doesNotMatch(home, /href="\/today"/);
    assert.doesNotMatch(home, /href='\/today'/);
    assert.doesNotMatch(home, /href=\{\s*['"]\/today['"]\s*\}/);
  });

  it('active Home contains no href="/weekly"', () => {
    const home = read(ACTIVE_HOME);
    assert.doesNotMatch(home, /href="\/weekly"/);
    assert.doesNotMatch(home, /href='\/weekly'/);
    assert.doesNotMatch(home, /href=\{\s*['"]\/weekly['"]\s*\}/);
  });

  it('active Home does not render Today shelf as a current revisit product', () => {
    const home = read(ACTIVE_HOME);
    assert.doesNotMatch(home, /aria-label="今日の観測"/);
    assert.doesNotMatch(home, /shelfCard[\s\S]*今日/);
    assert.doesNotMatch(home, /runTodayEngine/);
  });

  it('active Home does not render Weekly shelf as a current revisit product', () => {
    const home = read(ACTIVE_HOME);
    assert.doesNotMatch(home, /aria-label="今週の観測"/);
    assert.doesNotMatch(home, /runWeeklyEngine/);
  });

  it('/today redirects internally to /core', () => {
    const page = read(TODAY_PAGE);
    assert.doesNotMatch(page, /TodayPanel/);
    assert.match(page, /redirect\s*\(\s*['"]\/core['"]\s*\)/);
  });

  it('/weekly redirects internally to /core', () => {
    const page = read(WEEKLY_PAGE);
    assert.doesNotMatch(page, /WeeklyPanel/);
    assert.match(page, /redirect\s*\(\s*['"]\/core['"]\s*\)/);
  });

  it('redirect destination is not /dtr/lp', () => {
    for (const rel of [TODAY_PAGE, WEEKLY_PAGE]) {
      const page = read(rel);
      assert.doesNotMatch(page, /redirect\s*\(\s*['"]\/dtr\/lp['"]/);
    }
  });

  it('legacy redirect pages do not use permanentRedirect', () => {
    for (const rel of [TODAY_PAGE, WEEKLY_PAGE]) {
      const page = read(rel);
      assert.doesNotMatch(page, /permanentRedirect/);
    }
  });

  it('Today/Weekly remain absent from sitemap', () => {
    const sitemap = read(SITEMAP);
    assert.doesNotMatch(sitemap, /\/today/);
    assert.doesNotMatch(sitemap, /\/weekly/);
  });

  it('header and footer do not promote Today/Weekly navigation', () => {
    for (const rel of [PUBLIC_HEADER, PUBLIC_FOOTER]) {
      const src = read(rel);
      assert.doesNotMatch(src, /href="\/today"/);
      assert.doesNotMatch(src, /href="\/weekly"/);
      assert.doesNotMatch(src, /href='\/today'/);
      assert.doesNotMatch(src, /href='\/weekly'/);
    }
  });

  it('legacy engines remain in repo (not deleted by de-exposure)', () => {
    assert.match(read('lib/m55/todayEngine.ts'), /export function runTodayEngine/);
    assert.match(read('lib/m55/weeklyEngine.ts'), /export function runWeeklyEngine/);
  });
});

describe('G3-04 — adjacent G3 lane unchanged (source contract)', () => {
  it('G3-02 /dtr/core deep return contract unchanged', () => {
    const src = read(DTR_CORE_PAGE);
    const authBlock =
      src.split('const { userId } = await auth();')[1]?.split('resolveEntryReportOwnership')[0] ?? '';
    assert.match(
      authBlock,
      /redirect\(`\/sign-in\?redirect_url=\$\{encodeURIComponent\("\/dtr\/core"\)\}`\)/,
    );
    assert.doesNotMatch(authBlock, /redirect\("\/dtr\/lp"\)/);
  });

  it('G3-03 identity-bound restore module still present', () => {
    assert.match(
      read('lib/m55/selfFunnel/applyServerDraftFreeAnswerSet.test.ts'),
      /G3-03 identity-bound free restore matrix/,
    );
  });
});
