import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

const headerSource = readSource('components/shell/PublicHeader.tsx');
const shellCss = readSource('components/shell/ShellLayout.module.css');

describe('publicHeaderContract — legacy compact-label removal', () => {
  it('no longer uses shortLabel or compactNav', () => {
    assert.doesNotMatch(headerSource, /shortLabel/);
    assert.doesNotMatch(headerSource, /compactNav/);
  });

  it('does not render compact 無料 / 複合 / マイ single-character labels', () => {
    assert.doesNotMatch(headerSource, /label:\s*'無料'/);
    assert.doesNotMatch(headerSource, /label:\s*'複合'/);
    assert.doesNotMatch(headerSource, /label:\s*'マイ'/);
    assert.doesNotMatch(headerSource, /複合解析/);
    assert.doesNotMatch(headerSource, /保存版/);
  });

  it('does not rely solely on title attributes for destination meaning', () => {
    assert.doesNotMatch(headerSource, /title=\{/);
    assert.doesNotMatch(headerSource, /title="/);
  });
});

describe('publicHeaderContract — desktop (≥960px) primary nav', () => {
  it('exposes exact desktop labels and destinations', () => {
    const navBlockStart = headerSource.indexOf('const DESKTOP_PRIMARY_NAV');
    const navBlockEnd = headerSource.indexOf('];', navBlockStart);
    const navBlock = headerSource.slice(navBlockStart, navBlockEnd);
    assert.match(navBlock, /href:\s*'\/core',\s*label:\s*'無料で見る'/);
    assert.match(navBlock, /href:\s*'\/dtr\/lp',\s*label:\s*'プレミアム'/);

    const aboutBlockStart = headerSource.indexOf('const ABOUT_DROPDOWN_NAV');
    const aboutBlockEnd = headerSource.indexOf('];', aboutBlockStart);
    const aboutBlock = headerSource.slice(aboutBlockStart, aboutBlockEnd);
    assert.match(aboutBlock, /href:\s*'\/how-m55-works',\s*label:\s*'M55の仕組み'/);
    assert.match(aboutBlock, /href:\s*'\/ten-views',\s*label:\s*PUBLIC_NAV_TEN_VIEWS_LABEL_JA/);
    assert.match(aboutBlock, /href:\s*'\/support',\s*label:\s*'サポート'/);
  });

  it('includes M55について and アカウント dropdown triggers', () => {
    assert.match(headerSource, /triggerLabel="M55について"/);
    assert.match(headerSource, /triggerLabel="アカウント"/);
    assert.match(headerSource, /aria-haspopup="menu"/);
    assert.match(headerSource, /aria-expanded=\{open\}/);
  });

  it('account dropdown links to マイレポート and マイページ', () => {
    const accountBlockStart = headerSource.indexOf('const ACCOUNT_DROPDOWN_NAV');
    const accountBlockEnd = headerSource.indexOf('];', accountBlockStart);
    const accountBlock = headerSource.slice(accountBlockStart, accountBlockEnd);
    assert.match(accountBlock, /href:\s*'\/dtr',\s*label:\s*'マイレポート'/);
    assert.match(accountBlock, /href:\s*'\/my',\s*label:\s*'マイページ'/);
  });

  it('marks aria-current only on the active destination via isActiveRoute', () => {
    assert.match(headerSource, /aria-current=\{active \? 'page' : undefined\}/);
    assert.match(headerSource, /aria-current=\{pathname === '\/home' \? 'page' : undefined\}/);
  });

  it('signed-out shows ログイン and signed-in reuses the existing Clerk UserButton', () => {
    assert.match(headerSource, /<SignedOut>[\s\S]*?ログイン[\s\S]*?<\/SignedOut>/);
    assert.match(headerSource, /<SignedIn>[\s\S]*?<UserButton afterSignOutUrl="\/" \/>[\s\S]*?<\/SignedIn>/);
  });

  it('hides full desktop nav below 960px via CSS', () => {
    assert.match(shellCss, /@media \(max-width: 959px\)\s*\{[\s\S]*?\.topNav\s*\{\s*display:\s*none;/);
    assert.match(shellCss, /@media \(min-width: 960px\)\s*\{[\s\S]*?\.topNav\s*\{\s*display:\s*flex;/);
  });

  it('uses visible overflow on desktop topNav so dropdown panels are not clipped', () => {
    const desktopTopNavBlock = shellCss.match(
      /@media \(min-width: 960px\)\s*\{[\s\S]*?\.topNav\s*\{[\s\S]*?\}/,
    )?.[0];
    assert.ok(desktopTopNavBlock, 'expected desktop topNav media block');
    assert.match(desktopTopNavBlock!, /overflow:\s*visible/);
  });
});

describe('publicHeaderContract — compact (≤959px) structure', () => {
  it('keeps only M55, 無料で見る, and メニュー directly visible below 960px', () => {
    assert.match(headerSource, /無料で見る/);
    assert.match(headerSource, />\s*メニュー\s*</);
    assert.match(shellCss, /@media \(max-width: 959px\)[\s\S]*?\.mobileFreeLink\s*\{[\s\S]*?display:\s*inline-flex/);
  });

  it('mobile menu contains the exact required public items in order', () => {
    const navBlockStart = headerSource.indexOf('const MOBILE_MENU_PUBLIC');
    const navBlockEnd = headerSource.indexOf('];', navBlockStart);
    const navBlock = headerSource.slice(navBlockStart, navBlockEnd);
    const order = ['/dtr/lp', '/how-m55-works', '/ten-views', '/support'];
    const indices = order.map((href) => navBlock.indexOf(`href: '${href}'`));
    for (const [i, href] of order.entries()) {
      assert.notEqual(indices[i], -1, `mobile menu missing item: ${href}`);
    }
    for (let i = 1; i < indices.length; i += 1) {
      assert.ok(indices[i] > indices[i - 1], `mobile menu order broken at ${order[i]}`);
    }
    assert.match(navBlock, /label:\s*'プレミアムレポート'/);
    assert.match(navBlock, /label:\s*'M55の仕組み'/);
    assert.match(navBlock, /label:\s*PUBLIC_NAV_TEN_VIEWS_LABEL_JA/);
    assert.match(navBlock, /label:\s*'サポート'/);
  });

  it('includes signed-in マイレポート and マイページ in the mobile menu', () => {
    const navBlockStart = headerSource.indexOf('const MOBILE_MENU_SIGNED_IN');
    const navBlockEnd = headerSource.indexOf('];', navBlockStart);
    const navBlock = headerSource.slice(navBlockStart, navBlockEnd);
    assert.match(navBlock, /href:\s*'\/dtr',\s*label:\s*'マイレポート'/);
    assert.match(navBlock, /href:\s*'\/my',\s*label:\s*'マイページ'/);
  });

  it('includes signed-out ログイン and signed-in アカウント + UserButton inside the mobile menu', () => {
    const menuPanelStart = headerSource.indexOf('id="m55-public-mobile-menu"');
    const menuPanelSource = headerSource.slice(menuPanelStart);
    assert.match(menuPanelSource, /<SignedOut>[\s\S]*?ログイン[\s\S]*?<\/SignedOut>/);
    assert.match(menuPanelSource, /アカウント/);
    assert.match(menuPanelSource, /<UserButton afterSignOutUrl="\/" \/>/);
  });
});

describe('publicHeaderContract — menu accessibility contract', () => {
  it('mobile trigger has exact visible text and toggling aria-label', () => {
    assert.match(headerSource, />\s*メニュー\s*<\/button>/);
    assert.match(headerSource, /aria-label=\{menuOpen \? 'メニューを閉じる' : 'メニューを開く'\}/);
  });

  it('mobile trigger wires aria-expanded and aria-controls to the menu id', () => {
    assert.match(headerSource, /aria-expanded=\{menuOpen\}/);
    assert.match(headerSource, /aria-controls="m55-public-mobile-menu"/);
    assert.match(headerSource, /id="m55-public-mobile-menu"/);
  });

  it('dropdown closes on Escape and returns focus to trigger', () => {
    assert.match(headerSource, /event\.key === 'Escape'/);
    assert.match(headerSource, /closeAndReturnFocus/);
  });

  it('dropdown opens on Enter/Space/ArrowDown keyboard', () => {
    assert.match(headerSource, /event\.key === 'Enter'/);
    assert.match(headerSource, /event\.key === ' '/);
    assert.match(headerSource, /event\.key === 'ArrowDown'/);
  });

  it('does not implement a focus trap (non-modal navigation)', () => {
    assert.doesNotMatch(headerSource, /focus-?trap/i);
    assert.doesNotMatch(headerSource, /inert\b/);
  });
});

describe('publicHeaderContract — layout, sizing, and reduced motion', () => {
  it('gives interactive header controls a minimum 44px hit target', () => {
    assert.match(shellCss, /\.menuTrigger\s*\{[\s\S]*?min-(width|height):\s*44px/);
    assert.match(shellCss, /\.mobileFreeLink\s*\{[\s\S]*?min-height:\s*44px/);
    assert.match(shellCss, /\.mobileMenuLink\s*\{[\s\S]*?min-height:\s*44px/);
    assert.match(shellCss, /\.navDropdownLink\s*\{[\s\S]*?min-height:\s*44px/);
  });

  it('disables new header control transitions under prefers-reduced-motion', () => {
    const reducedMotionBlock = shellCss.slice(shellCss.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.match(reducedMotionBlock, /\.navDropdownLink/);
    assert.match(reducedMotionBlock, /\.navDropdownTrigger/);
  });
});

describe('publicHeaderContract — Clerk auth and configuration untouched', () => {
  it('imports the same Clerk primitives without adding new auth logic', () => {
    assert.match(
      headerSource,
      /import \{ SignInButton, SignedIn, SignedOut, UserButton \} from '@clerk\/nextjs';/,
    );
    assert.match(headerSource, /<SignInButton mode="redirect">/);
    assert.equal(headerSource.includes('clerkClient'), false);
    assert.equal(headerSource.includes('process.env'), false);
  });
});

describe('lower HOME 481–767px padding contract', () => {
  const homePanelCss = readSource('components/home/HomePanel.module.css');

  it('sets lowerSection horizontal padding to 24px between 481px and 767px', () => {
    assert.match(
      homePanelCss,
      /@media \(min-width: 481px\) and \(max-width: 767px\) \{\s*\.lowerSection \{\s*padding: 0 24px;\s*\}\s*\}/,
    );
  });

  it('keeps ≤480px, 768–1023px, and ≥1024px padding unchanged', () => {
    assert.match(homePanelCss, /@media \(max-width: 480px\) \{\s*\.lowerSection \{\s*padding: 0 20px;/);
    assert.match(homePanelCss, /@media \(min-width: 768px\) \{\s*\.lowerSection \{\s*padding: 0 32px;/);
    assert.match(homePanelCss, /@media \(min-width: 1024px\) \{\s*\.lowerSection \{\s*padding: 0 40px;/);
  });
});
