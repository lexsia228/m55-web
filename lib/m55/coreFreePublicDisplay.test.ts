import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCoreResult } from './coreResult/buildCoreResult';
import {
  coreTraitDisplayFromCoreLabel,
  freeCoreAxisRowsForResult,
  freeCorePersonalizationFingerprint,
} from './coreFreePublicDisplay';
import { tendencyAxesForResult } from '../../components/core/corePublicCopy';

const FORBIDDEN_DISPLAY_TERMS = [
  '構造探求',
  '構造探求型',
  '特質性',
  'Blueprint of',
  'First Record',
  'パーソナルアルゴリズム',
  'このタイプ',
  'タイプの人',
  '判定します',
  '診断結果',
  '読み取れます',
] as const;

function buildFor(birthDate: string) {
  return buildCoreResult({ nickname: 't', birthDate });
}

describe('/core free public display — CATEGORY-2-M55-CORE-PAGE-FREE-TO-PAID-PERSONALIZATION-COPY', () => {
  it('maps 構造探求型 to living-language display alias', () => {
    assert.equal(coreTraitDisplayFromCoreLabel('構造探求型'), '納得して組み立てる');
    assert.equal(coreTraitDisplayFromCoreLabel('構造探求'), '納得して組み立てる');
  });

  it('keeps forbidden internal labels out of rendered free-core copy surfaces', () => {
    const dates = ['1983-02-01', '1983-02-28', '1992-12-19'];
    for (const birthDate of dates) {
      const result = buildFor(birthDate);
      const blob = [
        coreTraitDisplayFromCoreLabel(result.coreLabel),
        ...freeCoreAxisRowsForResult(result).flatMap((row) => [row.tendency, row.life, row.load]),
        freeCorePersonalizationFingerprint(result),
      ].join('\n');
      for (const term of FORBIDDEN_DISPLAY_TERMS) {
        assert.equal(blob.includes(term), false, `${birthDate}: forbidden term ${term}`);
      }
    }
  });

  it('1983-02-01 and 1983-02-28 produce clearly different free-core personalization', () => {
    const feb01 = buildFor('1983-02-01');
    const feb28 = buildFor('1983-02-28');
    const fp01 = freeCorePersonalizationFingerprint(feb01);
    const fp28 = freeCorePersonalizationFingerprint(feb28);
    assert.notEqual(fp01, fp28);

    const axes01 = tendencyAxesForResult(feb01);
    const axes28 = tendencyAxesForResult(feb28);
    assert.notDeepEqual(axes01, axes28);

    assert.match(axes01[0]!.life, /月初めに近い生まれでは、/);
    assert.match(axes28[0]!.life, /月の後半に近い生まれでは、/);
  });

  it('1992-12-19 differs from 1983-02-28 anchor personalization', () => {
    const dec19 = buildFor('1992-12-19');
    const feb28 = buildFor('1983-02-28');
    assert.notEqual(
      freeCorePersonalizationFingerprint(dec19),
      freeCorePersonalizationFingerprint(feb28),
    );
  });

  it('5-axis bodies are not identical sentence templates across axes for one profile', () => {
    const result = buildFor('1983-02-28');
    const rows = tendencyAxesForResult(result);
    const lifeBodies = rows.map((row) => row.life);
    const uniqueLife = new Set(lifeBodies);
    assert.equal(uniqueLife.size, lifeBodies.length, 'life bodies must not repeat verbatim');
    assert.equal(lifeBodies.some((body) => body.includes('読み取れます')), false);
  });

  it('does not import paid saved-report deep-read corpus into free display module', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/coreFreePublicDisplay.ts'), 'utf8');
    assert.doesNotMatch(src, /dtrDobPersonalizationV2/);
    assert.doesNotMatch(src, /PAID_DTR/);
    assert.doesNotMatch(src, /buildPaidDtrIndividualization/);
  });
});
