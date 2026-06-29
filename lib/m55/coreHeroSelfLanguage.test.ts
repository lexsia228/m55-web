import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCoreResultClient } from './coreResult/buildCoreResult.client';
import {
  CORE_HERO_EVERYDAY_LABEL,
  coreHeroSelfLanguageFingerprint,
  coreHeroSelfLanguageForResult,
} from './coreHeroSelfLanguage';
import { coreTraitDisplayFromCoreType } from './coreFreePublicDisplay';
import { resolveCorePublicStemDisplay } from './publicStemDisplay';

const HERO_DOBS = [
  { birthDate: '1983-02-01', trait: '納得して組み立てる', stemTitle: 'インフルエンサー' },
  { birthDate: '1983-02-28', trait: '全体をつなげて整える', stemTitle: 'アナリスト' },
  { birthDate: '1994-12-02', trait: '関係の空気を整える', stemTitle: 'マネージャー' },
  { birthDate: '1988-12-03', trait: '関係の空気を整える', stemTitle: 'マネージャー' },
  { birthDate: '1988-01-01', trait: 'まず動いて流れを作る', stemTitle: 'デザイナー' },
  { birthDate: '2002-06-19', trait: '静かに深く見る', stemTitle: 'プレジデント' },
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
  '1000通り',
] as const;

function buildFor(birthDate: string) {
  return buildCoreResultClient({ nickname: 't', birthDate });
}

function heroBlob(hero: ReturnType<typeof coreHeroSelfLanguageForResult>): string {
  return `${hero.everydayLabel}\n${hero.displayTrait}\n${hero.primary}\n${hero.secondary}`;
}

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

describe('/core hero first-view clarity — CATEGORY-2-M55-CORE-HERO-FIRST-VIEW-CLARITY-MICRO-PATCH-REV1', () => {
  it('CoreHeroSection removes 読み方 / and uses everyday label', () => {
    const src = readFileSync(join(process.cwd(), 'components/core/CoreHeroSection.tsx'), 'utf8');
    assert.doesNotMatch(src, /読み方\s*\//);
    assert.doesNotMatch(src, /traitLabel\s*=\s*['"]読み方['"]/);
    assert.match(src, /CORE_HERO_EVERYDAY_LABEL/);
    assert.doesNotMatch(src, /corePosterTraitRowSep/);
  });

  it('avoids double なりやすくなります in hero secondary lines', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/coreHeroSelfLanguage.ts'), 'utf8');
    assert.doesNotMatch(src, /なりやすくなります/);
    for (const { birthDate } of HERO_DOBS) {
      const hero = coreHeroSelfLanguageForResult(buildFor(birthDate));
      assert.doesNotMatch(`${hero.primary}\n${hero.secondary}`, /なりやすくなります/);
    }
  });
  it('uses compositional slots, not per-trait full-paragraph maps', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/coreHeroSelfLanguage.ts'), 'utf8');
    assert.doesNotMatch(src, /1983-02-01/);
    assert.doesNotMatch(src, /納得しながら進める人/);
    assert.doesNotMatch(src, /【タイプ名】/);
    assert.equal(CORE_HERO_EVERYDAY_LABEL, '日常で出やすい形');
  });

  for (const { birthDate, trait, stemTitle } of HERO_DOBS) {
    it(`${birthDate} hero uses everyday label, trait, and clear self-language`, () => {
      const result = buildFor(birthDate);
      const hero = coreHeroSelfLanguageForResult(result);
      const stem = resolveCorePublicStemDisplay(result);
      const blob = heroBlob(hero);

      assert.equal(hero.everydayLabel, '日常で出やすい形');
      assert.equal(hero.displayTrait, trait);
      assert.equal(coreTraitDisplayFromCoreType(result.coreType), trait);
      assert.equal(stem.publicTitle, stemTitle);
      const lines = `${hero.primary}\n${hero.secondary}`;
      assert.doesNotMatch(lines, /読み方/);
      assert.doesNotMatch(lines, /する人/);
      assert.doesNotMatch(lines, /形です/);
      assert.ok(countMatches(lines, /整える|整え|整い/g) <= 2, `${birthDate}: 整* cluster`);
      assert.ok(countMatches(lines, /保つ|保ち/g) <= 2, `${birthDate}: 保* cluster`);
      assert.match(hero.primary, /(しやすい|出やすい|選びやすい|進みやすい|すり合いやすい|整えやすい)/);
      assert.match(hero.secondary, /なります。$/);
      for (const term of FORBIDDEN) {
        assert.equal(blob.includes(term), false, term);
      }
    });
  }

  it('6 DOB hero fingerprints remain distinct', () => {
    const fps = HERO_DOBS.map(({ birthDate }) => coreHeroSelfLanguageFingerprint(buildFor(birthDate)));
    for (let i = 0; i < fps.length; i++) {
      for (let j = i + 1; j < fps.length; j++) {
        assert.notEqual(fps[i], fps[j], `${HERO_DOBS[i]!.birthDate} vs ${HERO_DOBS[j]!.birthDate}`);
      }
    }
  });

  it('1983-02-01 primary uses reason/order self-language', () => {
    const hero = coreHeroSelfLanguageForResult(buildFor('1983-02-01'));
    assert.match(hero.primary, /理由や順番が見えると/);
    assert.match(hero.primary, /次の一手を選びやすいです|自分のペースで進みやすいです/);
    assert.match(
      hero.secondary,
      /近い人の気持ちや場の流れを見ながら、動き出しやすくなります|相手の反応を先に確かめると、迷いが減りやすくなります/,
    );
  });

  it('1994-12-02 manager hero matches everyday clarity direction', () => {
    const hero = coreHeroSelfLanguageForResult(buildFor('1994-12-02'));
    assert.match(hero.primary, /相手の温度を見ながら、場が落ち着く方向へ整えやすいです/);
    assert.match(
      hero.secondary,
      /無理に合わせすぎない距離を置くと、自分らしさも保ちやすくなります|ペースを崩さないよう区切りを置くと、負荷がたまりにくくなります/,
    );
  });

  it('2002-06-19 president hero matches everyday clarity direction', () => {
    const hero = coreHeroSelfLanguageForResult(buildFor('2002-06-19'));
    assert.match(hero.primary, /意味の層まで確かめると/);
    assert.match(
      hero.secondary,
      /急がず範囲を絞るほど、次の一歩を選びやすくなります|一度立ち止まって確認すると、迷いが減りやすくなります/,
    );
  });
});
