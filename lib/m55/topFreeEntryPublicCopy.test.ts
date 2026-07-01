import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { STATIC_M55_READ_STEPS } from '../../components/core/corePublicCopy';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';

const FORBIDDEN_PUBLIC_TERMS = [
  'Entry Report',
  'DTR Core Static V1',
  '購入者専用ルーム',
  '相談ルーム',
  '永久閲覧',
  '永久',
  '無期限',
  '相談1回付属',
  '付属1件＋追加購入最大4件',
  '8章',
  '人物像と傾向',
  '本質と安定の条件',
  '活きる力',
  '占い',
  '鑑定',
  '運勢',
  '複数テーマ',
  '後から追加',
] as const;

const COPY_FILE = 'lib/m55/topFreeEntryPublicCopy.ts';

const ROUTE_FILES = {
  '/': 'app/page.tsx',
  '/home': 'components/home/HomePanel.tsx',
  '/core-static': 'components/core/corePublicCopy.ts',
  '/core-boundary': 'components/core/CoreFreeSavedBoundarySection.tsx',
  '/core-cta': 'components/core/CoreEntryReportCTASection.tsx',
  '/how-m55-works': 'app/how-m55-works/page.tsx',
  '/how-m55-works/receive': 'app/how-m55-works/components/what-you-can-do-section.tsx',
  '/how-m55-works/next': 'app/how-m55-works/components/next-step-section.tsx',
  '/how-m55-works/framework': 'app/how-m55-works/components/framework-section.tsx',
  '/how-m55-works/what-is': 'app/how-m55-works/components/what-is-section.tsx',
  '/support': 'app/support/page.tsx',
} as const;

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');

function readPage(relativePath: string): string {
  const abs = join(repoRoot, relativePath);
  assert.ok(existsSync(abs), `missing page file: ${relativePath}`);
  return readFileSync(abs, 'utf8');
}

function combinedPublicCopy(): string {
  return [COPY_FILE, ...Object.values(ROUTE_FILES)]
    .map((rel) => readPage(rel))
    .join('\n');
}

describe('topFreeEntryPublicCopy — Product Truth alignment', () => {
  it('maps top/free routes to existing page files', () => {
    for (const [route, rel] of Object.entries(ROUTE_FILES)) {
      assert.ok(existsSync(join(repoRoot, rel)), `${route} -> ${rel}`);
    }
  });

  it('includes M55 definition and three-layer free/saved/consult copy', () => {
    const blob = combinedPublicCopy();
    assert.match(blob, /10資質レーン/);
    assert.match(blob, /動き方・疲れ方・戻し方|動き方/);
    assert.match(blob, /無料の見取り図/);
    assert.match(blob, /4章の保存版/);
    assert.match(TOP_FREE_ENTRY_PUBLIC_COPY.home.algorithmNoteJa, /生年月日/);
    assert.match(TOP_FREE_ENTRY_PUBLIC_COPY.home.algorithmNoteJa, /10資質レーン/);
    assert.match(blob, /相談返書/);
    assert.match(blob, /会話を続ける形式ではありません/);
  });

  it('includes storefront and home product truth with light before FULL on home', () => {
    const copy = readPage(COPY_FILE);
    const storefront = readPage(ROUTE_FILES['/']);
    const home = readPage(ROUTE_FILES['/home']);
    const { storefront: sf, home: homeCopy, learnMore } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(sf.fullPlanNameJa, '保存版FULL');
    assert.equal(sf.fullPriceLabelJa, '¥1,480（税込）');
    assert.equal(sf.fullConsultReplyJa, '相談返書合計5件');
    assert.equal(sf.lightPlanNameJa, '保存版ライト');
    assert.equal(sf.lightPriceLabelJa, '¥1,000（税込）');
    assert.equal(sf.lightConsultReplyJa, '相談返書1件');
    assert.equal(homeCopy.reportLightEyebrowJa, '保存版ライト');
    assert.equal(homeCopy.reportLightPriceJa, '¥1,000（税込）');
    assert.equal(learnMore.rulesJa.length, 4);
    assert.match(copy, /相談返書合計5件/);
    assert.match(copy, /相談返書1件/);
    assert.match(home, /reportLightEyebrowJa/);
    assert.match(home, /reportFullLineJa/);
    assert.match(home, /reportFullUpgradeNoteJa/);
    assert.match(TOP_FREE_ENTRY_PUBLIC_COPY.home.reportFullUpgradeNoteJa, /FULL化/);
    assert.ok(
      home.indexOf('reportLightEyebrowJa') < home.indexOf('reportFullLineJa'),
      'home report card renders light before FULL',
    );
    assert.match(home, /m55-home-learn-more/);
    assert.match(home, /exploreQualitiesTitleJa/);
    assert.match(home, /tenViewsLearnLinkJa/);
    assert.equal(homeCopy.exploreQualitiesTitleJa, '10資質レーンから読む');
    assert.equal(homeCopy.tenViewsLearnLinkJa, '10資質レーン');
    assert.match(homeCopy.heroSupportJa, /自分を少し離れて見つめ直す/);
    assert.match(home, /tierStackAriaLabelJa/);
  });

  it('includes formal four chapters and saved-plan CTA targets', () => {
    const blob = combinedPublicCopy();
    const labels = TOP_FREE_ENTRY_PUBLIC_COPY.formalChapters.map((ch) => ch.labelJa);
    assert.deepEqual(labels, [
      'Ⅰ 輪郭を見る',
      'Ⅱ 構造を読む',
      'Ⅲ 無理を知る',
      'Ⅳ 楽に扱う',
    ]);
    assert.match(blob, /保存版のプランを見る/);
    assert.match(blob, /\/dtr\/lp/);
    assert.match(readPage(ROUTE_FILES['/home']), /FORMAL_CHAPTER_CHIPS/);
  });

  it('does not expose forbidden legacy terms in top/free public copy', () => {
    const blob = combinedPublicCopy();
    for (const term of FORBIDDEN_PUBLIC_TERMS) {
      assert.equal(blob.includes(term), false, `forbidden term in top/free copy: ${term}`);
    }
  });

  it('omits detailed plan arithmetic from top/free entry SSOT', () => {
    const copy = readPage(COPY_FILE);
    const homePanel = readPage(ROUTE_FILES['/home']);
    for (const term of ['合計¥1,600', '最初からFULL ¥1,480', '差額は¥120', '差額¥120'] as const) {
      assert.equal(copy.includes(term), false, `must not include: ${term}`);
    }
    for (const term of ['有料レポート', '構造化レポート', '返書まで'] as const) {
      assert.equal(copy.includes(term), false, `must not include: ${term}`);
      assert.equal(homePanel.includes(term), false, `home must not include: ${term}`);
    }
    assert.match(copy, /必要になったらFULL化/);
    assert.match(copy, /相談返書1件/);
    assert.match(copy, /相談返書合計5件/);
  });

  it('uses saved-report formal language in corePublicCopy read steps', () => {
    const activeCopy = STATIC_M55_READ_STEPS.map((step) => step.body).join('\n');
    assert.match(activeCopy, /4章の保存版/);
    assert.match(activeCopy, /相談返書で/);
    assert.match(activeCopy, /読み直せます/);
    assert.equal(activeCopy.includes('本質の読み解き'), false);
    assert.equal(activeCopy.includes('基本の出方'), false);
  });

  it('P1 surface avoids legacy ten-type-only framing on how-m55-works and support', () => {
    const blob = combinedPublicCopy();
    for (const term of ['10通りの資質', '5つの解析軸', 'パーソナルアルゴリズム', '読み解いていきます'] as const) {
      assert.equal(blob.includes(term), false, `legacy P1 term must not remain: ${term}`);
    }
    assert.match(blob, /10資質レーン/);
    assert.match(readPage(ROUTE_FILES['/support']), /TOP_FREE_ENTRY_PUBLIC_COPY/);
    assert.match(readPage(ROUTE_FILES['/how-m55-works/what-is']), /M55_LOGIC_HOME_COPY/);
  });

  it('P0 SSOT avoids hype and ten-type-only framing', () => {
    const copy = readPage(COPY_FILE);
    for (const term of [
      '完全オリジナル',
      '数千通り',
      'AI鑑定',
      '科学的証明',
      '未来を予測',
      '四柱推命',
      '宿曜',
      '算命学',
      '10通りの説明書',
    ] as const) {
      assert.equal(copy.includes(term), false, `forbidden term in topFreeEntry SSOT: ${term}`);
    }
    assert.match(copy, /10資質レーン/);
    assert.match(copy, /固定ルール/);
  });
});
