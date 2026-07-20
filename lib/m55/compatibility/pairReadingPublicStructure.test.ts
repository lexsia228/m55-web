import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  PAIR_READING_FREE_STRUCTURE_ITEMS,
  PAIR_READING_GUEST_SUPPORT_LINES,
} from './pairReadingPublicStructure';

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '../../..');
const guestSource = readFileSync(
  join(repoRoot, 'components/compatibility/CompatibilityGuestExperience.tsx'),
  'utf8',
);
const pairSectionSource = readFileSync(
  join(repoRoot, 'components/home/HomePairFreeSection.tsx'),
  'utf8',
);

describe('pairReadingPublicStructure — shared free result authority', () => {
  it('defines exact four structure labels in order', () => {
    assert.deepEqual(
      PAIR_READING_FREE_STRUCTURE_ITEMS.map((item) => item.titleJa),
      [
        '二人の変わりにくい土台',
        '今の二人に表れやすいこと',
        '二人の間で続きやすい連鎖',
        '次に一度だけ試すこと',
      ],
    );
    assert.deepEqual(
      PAIR_READING_FREE_STRUCTURE_ITEMS.map((item) => item.index),
      ['01', '02', '03', '04'],
    );
  });

  it('defines exact guest support lines', () => {
    assert.deepEqual(PAIR_READING_GUEST_SUPPORT_LINES, [
      '回答するのはあなた一人です。',
      '相手が回答したものではありません。',
    ]);
  });

  it('is imported by HOME pair section and CompatibilityGuestExperience', () => {
    assert.match(pairSectionSource, /pairReadingPublicStructure/);
    assert.match(pairSectionSource, /PAIR_READING_FREE_STRUCTURE_ITEMS/);
    assert.match(pairSectionSource, /PAIR_READING_GUEST_SUPPORT_LINES/);
    assert.match(guestSource, /pairReadingPublicStructure/);
    assert.match(guestSource, /PAIR_READING_FREE_STRUCTURE_ITEMS/);
  });

  it('does not leave duplicate structure title literals in consumers', () => {
    for (const item of PAIR_READING_FREE_STRUCTURE_ITEMS) {
      const titleOccurrences = guestSource.split(item.titleJa).length - 1;
      assert.equal(
        titleOccurrences,
        0,
        `CompatibilityGuestExperience must not duplicate literal: ${item.titleJa}`,
      );
      const homeOccurrences = pairSectionSource.split(item.titleJa).length - 1;
      assert.equal(
        homeOccurrences,
        0,
        `HomePairFreeSection must not duplicate literal: ${item.titleJa}`,
      );
    }
  });
});
