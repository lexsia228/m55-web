import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOP_FREE_ENTRY_PUBLIC_COPY } from './topFreeEntryPublicCopy';
import {
  HOME_PAIR_READING_PUBLIC_HREF,
  HOME_PAIR_READING_AVAILABILITY,
  isHomePairReadingLivePublic,
} from './homePairReadingPublicContract';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../..');
const homePanelSource = readFileSync(join(repoRoot, 'components/home/HomePanel.tsx'), 'utf8');
const productMapSource = readFileSync(join(repoRoot, 'components/home/HomeProductMap.tsx'), 'utf8');
const valueBridgeSource = readFileSync(join(repoRoot, 'components/home/HomePremiumValueBridge.tsx'), 'utf8');
const homeBlob = JSON.stringify(TOP_FREE_ENTRY_PUBLIC_COPY.home);

const PROHIBITED_HOME_WORDING = [
  '相性診断',
  '相性が良い',
  '相性が悪い',
  '運命',
  '結婚できる',
  '相手は好き',
  '復縁できる',
  '告白すべき',
  'スコア',
  'M55複合暦解析',
  '無料の見取り図',
  '追加解析',
  '近日公開',
  '診断',
] as const;

describe('homeProductStory — pair reading product truth', () => {
  it('classifies guest pair reading as LIVE_PUBLIC at /synastry', () => {
    assert.equal(HOME_PAIR_READING_AVAILABILITY, 'LIVE_PUBLIC');
    assert.equal(HOME_PAIR_READING_PUBLIC_HREF, '/synastry');
    assert.equal(isHomePairReadingLivePublic(), true);
    assert.equal(TOP_FREE_ENTRY_PUBLIC_COPY.cta.pairReadingHref, '/synastry');
  });

  it('does not expose paid compatibility checkout routes on HOME', () => {
    assert.equal(homePanelSource.includes('/synastry/purchase/confirm'), false);
    assert.equal(homePanelSource.includes('/api/compatibility/checkout'), false);
    assert.equal(homePanelSource.includes('compatibility_report_full_v1'), false);
    assert.equal(homePanelSource.includes('isCompatibilityCommerceEnabled'), false);
  });
});

describe('homeProductStory — capability map contract', () => {
  it('renders product map before free detail with editorial 01/02/03 layout', () => {
    const mapIndex = homePanelSource.indexOf('data-testid="m55-home-product-map"');
    const freeIndex = homePanelSource.indexOf('data-testid="m55-home-free-preview"');
    assert.ok(mapIndex !== -1 && freeIndex !== -1);
    assert.ok(mapIndex < freeIndex);
    assert.match(productMapSource, /productMapEditorial/);
    assert.match(productMapSource, /productMapIndex/);
    assert.doesNotMatch(productMapSource, /className=\{styles\.card\}/);
  });

  it('uses approved product map copy from SSOT', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.productMapEyebrowJa, 'M55でできること');
    assert.equal(
      home.productMapHeadlineJa,
      '自分を見る。人との関係を見る。そこから、深く読み返す。',
    );
    assert.equal(home.productMapSelfTitleJa, '自分を読み解く');
    assert.equal(home.productMapPairTitleJa, '二人の関係を読み解く');
    assert.equal(home.productMapPremiumTitleJa, 'プレミアムで深く読み返す');
  });

  it('routes self free action through existing intake or /core contract', () => {
    assert.match(productMapSource, /m55-home-product-map-self-intake/);
    assert.match(productMapSource, /m55-home-product-map-self-core/);
    assert.match(productMapSource, /onOpenIntake/);
  });

  it('shows pair link only when LIVE_PUBLIC', () => {
    assert.match(productMapSource, /isHomePairReadingLivePublic/);
    assert.match(productMapSource, /m55-home-product-map-pair-link/);
    assert.match(productMapSource, /HOME_PAIR_READING_PUBLIC_HREF/);
    assert.match(productMapSource, /m55-home-product-map-pair-preparing/);
  });
});

describe('homeProductStory — premium value bridge', () => {
  it('places value bridge at the start of premium dark stage before product preview', () => {
    const premiumStart = homePanelSource.indexOf('data-testid="m55-home-premium-preview"');
    const premiumBlock = homePanelSource.slice(premiumStart);
    const bridgeIndex = premiumBlock.indexOf('<HomePremiumValueBridge');
    const previewIndex = premiumBlock.indexOf('<HomePremiumPreviewSlice');
    const eyebrowIndex = premiumBlock.indexOf('premiumEyebrowJa');
    assert.ok(premiumStart !== -1 && bridgeIndex !== -1 && previewIndex !== -1);
    assert.ok(bridgeIndex < previewIndex);
    assert.ok(bridgeIndex < eyebrowIndex);
    assert.match(valueBridgeSource, /data-testid="m55-home-premium-value-bridge"/);
  });

  it('uses approved free-to-premium comparison copy without demeaning free tier', () => {
    const { home } = TOP_FREE_ENTRY_PUBLIC_COPY;
    assert.equal(home.premiumValueBridgeEyebrowJa, '無料から、ここまで深く');
    assert.equal(home.premiumValueBridgeHeadlineJa, '入口だけで終わらず、自分の流れを全体で読み返す。');
    assert.equal(home.premiumValueBridgeFreeItemsJa.length, 3);
    assert.equal(home.premiumValueBridgePremiumItemsJa.length, 5);
    assert.equal(homeBlob.includes('無料は不完全'), false);
    assert.equal(homeBlob.includes('無料では分からない'), false);
  });
});

describe('homeProductStory — final CTA and product facts', () => {
  it('keeps a single paid primary CTA and adds pair secondary only when LIVE_PUBLIC', () => {
    const paidSolidCount = (homePanelSource.match(/className=\{styles\.ctaPaidSolid\}/g) ?? []).length;
    assert.equal(paidSolidCount, 1);
    assert.match(homePanelSource, /m55-home-final-cta-pair/);
    assert.match(homePanelSource, /isHomePairReadingLivePublic\(\)/);
    assert.match(homePanelSource, /ctaCopy\.pairReadingHref/);
  });

  it('does not change hero poster structure or add extra hero CTAs', () => {
    const heroStart = homePanelSource.indexOf('data-testid="m55-home-hero"');
    const heroSource = homePanelSource.slice(
      heroStart,
      homePanelSource.indexOf('</section>', heroStart) + '</section>'.length,
    );
    assert.equal(heroSource.includes('HomeProductMap'), false);
    assert.equal(heroSource.includes('data-testid="m55-home-product-map"'), false);
    assert.match(heroSource, /data-testid="m55-home-open-birth-intake"/);
    assert.match(heroSource, /data-testid="m55-home-has-profile-hero"/);
  });

  it('avoids prohibited public wording in HOME SSOT copy', () => {
    for (const term of PROHIBITED_HOME_WORDING) {
      assert.equal(homeBlob.includes(term), false, `home copy must not include: ${term}`);
    }
  });
});
