import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { STEM_LANE_TEN_VIEWS_IMAGE } from './publicStemDisplay';
import { TEN_ASSET_PUBLIC_CATALOG } from './tenAssetPublicCatalog';
import { TEN_STEM_DISPLAY } from './tenStemCatalog';

describe('tenAssetPublicCatalog — engine display parity', () => {
  it('matches TEN_STEM_DISPLAY order, stem chars, and persona names', () => {
    assert.equal(TEN_ASSET_PUBLIC_CATALOG.length, TEN_STEM_DISPLAY.length);

    TEN_ASSET_PUBLIC_CATALOG.forEach((entry, index) => {
      const stem = TEN_STEM_DISPLAY[index]!;
      assert.equal(entry.stemChar, stem.stemChar, `index ${index}: stemChar`);
      assert.equal(entry.persona, stem.publicTitle, `index ${index}: persona`);
    });
  });

  it('keeps ten canonical public assets with image paths', () => {
    assert.equal(TEN_ASSET_PUBLIC_CATALOG.length, 10);
    const qualityLabels = TEN_ASSET_PUBLIC_CATALOG.map((entry) => entry.qualityLabel);
    assert.equal(new Set(qualityLabels).size, qualityLabels.length);

    TEN_ASSET_PUBLIC_CATALOG.forEach((entry, index) => {
      assert.equal(
        entry.imageSrc,
        STEM_LANE_TEN_VIEWS_IMAGE[index]!,
        `index ${index}: imageSrc`,
      );
      assert.match(entry.imageSrc, /^\/ten-views\/[a-z-]+\.webp$/);
      assert.ok(entry.qualityLabel.length > 0);
    });
  });
});
