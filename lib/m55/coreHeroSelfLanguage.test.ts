import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCoreResultClient } from './coreResult/buildCoreResult.client';
import { coreTraitDisplayFromCoreType } from './coreFreePublicDisplay';
import { coreHeroSelfLanguageForResult } from './coreHeroSelfLanguage';
import { resolveCorePublicStemDisplay } from './publicStemDisplay';

const HERO_DOBS = [
  { birthDate: '1983-02-01', trait: '納得して組み立てる', stemTitle: 'インフルエンサー' },
  { birthDate: '1983-02-28', trait: '全体をつなげて整える', stemTitle: 'アナリスト' },
  { birthDate: '1983-12-24', trait: '距離と言葉を読む', stemTitle: 'グローバルリーダー' },
  { birthDate: '1999-05-11', trait: '先に全体像をつかむ', stemTitle: 'プロデューサー' },
  { birthDate: '1989-09-08', trait: '落ち着いて確かめる', stemTitle: 'クリエイター' },
] as const;

const FORBIDDEN = [
  '構造探求',
  '構造探求型',
  'Blueprint of',
  'First Record',
  'パーソナルアルゴリズム',
  'このタイプ',
  '診断結果',
  '判定します',
] as const;

function buildFor(birthDate: string) {
  return buildCoreResultClient({ nickname: 't', birthDate });
}

describe('/core hero self-language — CATEGORY-2-M55-CORE-HERO-SELF-LANGUAGE-MICRO-PATCH-REV1', () => {
  it('uses compositional slots, not per-trait full-paragraph maps', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/coreHeroSelfLanguage.ts'), 'utf8');
    assert.doesNotMatch(src, /1983-02-01/);
    assert.doesNotMatch(src, /納得しながら進める人/);
    assert.doesNotMatch(src, /【タイプ名】/);
  });

  for (const { birthDate, trait, stemTitle } of HERO_DOBS) {
    it(`${birthDate} hero copy matches trait and stem, avoids 読み方/する人`, () => {
      const result = buildFor(birthDate);
      const hero = coreHeroSelfLanguageForResult(result);
      const stem = resolveCorePublicStemDisplay(result);

      assert.equal(coreTraitDisplayFromCoreType(result.coreType), trait);
      assert.equal(stem.publicTitle, stemTitle);
      assert.doesNotMatch(hero.primary, /読み方/);
      assert.doesNotMatch(hero.secondary, /読み方/);
      assert.doesNotMatch(hero.primary, /する人/);
      assert.doesNotMatch(hero.secondary, /する人/);
      assert.match(hero.primary, /(しやすくなります|動きやすくなります|探しやすくなります|整[いえ]やすくなります|保てやすくなります|出やすくなります)/);
      assert.match(hero.secondary, /形です。$/);
      for (const term of FORBIDDEN) {
        assert.equal(`${hero.primary}\n${hero.secondary}`.includes(term), false, term);
      }
    });
  }

  it('5 DOB hero fingerprints remain distinct', () => {
    const fps = HERO_DOBS.map(({ birthDate }) => {
      const { primary, secondary } = coreHeroSelfLanguageForResult(buildFor(birthDate));
      return `${primary}|${secondary}`;
    });
    for (let i = 0; i < fps.length; i++) {
      for (let j = i + 1; j < fps.length; j++) {
        assert.notEqual(fps[i], fps[j], `${HERO_DOBS[i]!.birthDate} vs ${HERO_DOBS[j]!.birthDate}`);
      }
    }
  });

  it('1983-02-01 primary uses reason/order self-language', () => {
    const hero = coreHeroSelfLanguageForResult(buildFor('1983-02-01'));
    assert.match(hero.primary, /理由や順番が見えると/);
    assert.match(hero.primary, /自分のペースで動きやすくなります|次の一手を探しやすくなります/);
  });
});
