import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCoreResultClient } from './coreResult/buildCoreResult.client';
import {
  coreTraitDisplayFromCoreType,
  freeCoreAxisRowsForResult,
  freeCorePersonalizationFingerprint,
} from './coreFreePublicDisplay';
import { buildCopySelectContext, composeAxisRows } from './coreFreeCompositionalGrammar';
import { tendencyAxesForResult } from '../../components/core/corePublicCopy';
import { AXIS_FORMAL_JA } from '../../components/core/corePublicAxisLabels';

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

const PAID_LEAK_MARKERS = [
  'dtrDobPersonalizationV2',
  'PAID_DTR',
  'buildPaidDtrIndividualization',
  'chapter_id',
  's3_essence',
  's7_work',
] as const;

const ANCHOR_DATES = ['1983-02-01', '1983-02-28', '1992-12-19'] as const;

function buildFor(birthDate: string) {
  return buildCoreResultClient({ nickname: 't', birthDate });
}

function renderedBlob(birthDate: string): string {
  const result = buildFor(birthDate);
  return [
    coreTraitDisplayFromCoreType(result.coreType),
    ...freeCoreAxisRowsForResult(result).flatMap((row) => [row.tendency, row.life, row.load]),
    freeCorePersonalizationFingerprint(result),
  ].join('\n');
}

describe('/core compositional copy grammar — micro-fix guards', () => {
  const DANGLING_TRAIT_RE = /。(順番が見える|全体をつなげて整える|相手の温度を受け取りながら|ながら|と)。/;
  const DEHA_DUP_RE = /[^。]{0,30}では、[^。]{0,30}では/;

  for (const birthDate of ANCHOR_DATES) {
    it(`${birthDate} life lines avoid dangling trait micro and double では`, () => {
      const rows = freeCoreAxisRowsForResult(buildFor(birthDate));
      for (const row of rows) {
        assert.doesNotMatch(row.life, DANGLING_TRAIT_RE, `life dangling: ${row.life}`);
        assert.doesNotMatch(row.life, DEHA_DUP_RE, `life double では: ${row.life}`);
        assert.match(row.life, /。$/, `life must end with 。: ${row.life}`);
      }
    });
  }

  it('1983-02-01 and 1983-02-28 month rhythm tails differ on axis0', () => {
    const feb01 = freeCoreAxisRowsForResult(buildFor('1983-02-01'))[0]!.life;
    const feb28 = freeCoreAxisRowsForResult(buildFor('1983-02-28'))[0]!.life;
    assert.match(feb01, /始め方が自然に決まりやすくなります。/);
    assert.match(feb28, /区切りを置きやすくなります。/);
  });
});

describe('/core compositional copy grammar — CATEGORY-2-M55-CORE-FREE-COMPOSITIONAL-COPY-GRAMMAR-REV1', () => {
  it('maps TYPE_03 and TYPE_10 to living-language display alias', () => {
    assert.equal(coreTraitDisplayFromCoreType('TYPE_03'), '納得して組み立てる');
    assert.equal(coreTraitDisplayFromCoreType('TYPE_10'), '全体をつなげて整える');
  });

  it('DOB anchors resolve to expected living-language trait display', () => {
    assert.equal(coreTraitDisplayFromCoreType(buildFor('1983-02-01').coreType), '納得して組み立てる');
    assert.equal(coreTraitDisplayFromCoreType(buildFor('1983-02-28').coreType), '全体をつなげて整える');
    assert.equal(coreTraitDisplayFromCoreType(buildFor('1992-12-19').coreType), '関係の温度を受け取る');
  });

  it('1983-02-01 / 1983-02-28 / 1992-12-19 produce distinct personalization fingerprints', () => {
    const fps = ANCHOR_DATES.map((d) => freeCorePersonalizationFingerprint(buildFor(d)));
    assert.notEqual(fps[0], fps[1]);
    assert.notEqual(fps[1], fps[2]);
    assert.notEqual(fps[0], fps[2]);
  });

  it('1983-02-01 and 1983-02-28 differ by day band on first-axis life line', () => {
    const feb01 = tendencyAxesForResult(buildFor('1983-02-01'));
    const feb28 = tendencyAxesForResult(buildFor('1983-02-28'));
    assert.match(feb01[0]!.life, /月初めに近い生まれでは、/);
    assert.match(feb28[0]!.life, /月の後半に近い生まれでは、/);
    assert.notEqual(feb01[0]!.life, feb28[0]!.life);
  });

  it('1992-12-19 differs from 1983-02-28 beyond trait name alone', () => {
    const dec = buildFor('1992-12-19');
    const feb = buildFor('1983-02-28');
    const decRows = freeCoreAxisRowsForResult(dec);
    const febRows = freeCoreAxisRowsForResult(feb);
    assert.notEqual(dec.coreType, feb.coreType);
    assert.notDeepEqual(
      decRows.map((r) => r.life),
      febRows.map((r) => r.life),
    );
  });

  it('5-axis life bodies avoid verbatim repetition for one profile', () => {
    const rows = tendencyAxesForResult(buildFor('1983-02-28'));
    const lifeBodies = rows.map((row) => row.life);
    const uniqueLife = new Set(lifeBodies);
    assert.ok(uniqueLife.size >= 4, `expected >=4 unique life lines, got ${uniqueLife.size}`);
  });

  it('axis score band changes copy when band is toggled for one axis', () => {
    const result = buildFor('1983-02-01');
    const ctx = buildCopySelectContext(
      result,
      '1983-02-01',
      coreTraitDisplayFromCoreType(result.coreType),
    );
    const hiRows = composeAxisRows(ctx, result.axisDetails, AXIS_FORMAL_JA);
    const flipped = result.axisDetails.map((d) =>
      d.key === 'openness'
        ? { ...d, band: d.band === 'low' || d.band === 'mid-low' ? ('high' as const) : ('low' as const) }
        : d,
    );
    const loRows = composeAxisRows(ctx, flipped, AXIS_FORMAL_JA);
    const oi = result.axisDetails.findIndex((d) => d.key === 'openness');
    assert.notEqual(hiRows[oi]!.tendency, loRows[oi]!.tendency);
    assert.notEqual(hiRows[oi]!.life, loRows[oi]!.life);
  });

  it('keeps forbidden internal labels out of rendered free-core copy surfaces', () => {
    for (const birthDate of ANCHOR_DATES) {
      const blob = renderedBlob(birthDate);
      for (const term of FORBIDDEN_DISPLAY_TERMS) {
        assert.equal(blob.includes(term), false, `${birthDate}: forbidden term ${term}`);
      }
    }
  });

  it('uses paid-style living language without paid corpus leakage', () => {
    const grammarSrc = readFileSync(join(process.cwd(), 'lib/m55/coreFreeCompositionalGrammar.ts'), 'utf8');
    const displaySrc = readFileSync(join(process.cwd(), 'lib/m55/coreFreePublicDisplay.ts'), 'utf8');
    for (const marker of PAID_LEAK_MARKERS) {
      assert.equal(grammarSrc.includes(marker), false, `grammar leak: ${marker}`);
      assert.equal(displaySrc.includes(marker), false, `display leak: ${marker}`);
    }
    assert.match(grammarSrc, /力が出やすい/);
    assert.match(grammarSrc, /無理がたまりやすい/);
    assert.match(grammarSrc, /戻しやすい/);
    assert.match(grammarSrc, /整え/);
    assert.match(grammarSrc, /読み返/);
  });

  it('does not define per-trait full-paragraph copy maps', () => {
    const grammarSrc = readFileSync(join(process.cwd(), 'lib/m55/coreFreeCompositionalGrammar.ts'), 'utf8');
    assert.doesNotMatch(grammarSrc, /TYPE_0[1-9]: ['"]{10,}/);
    assert.doesNotMatch(grammarSrc, /FREE_.*TYPE_/);
  });
});

describe('/core free public display — legacy personalization guards', () => {
  it('does not import paid saved-report deep-read corpus into free display module', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/coreFreePublicDisplay.ts'), 'utf8');
    assert.doesNotMatch(src, /dtrDobPersonalizationV2/);
    assert.doesNotMatch(src, /PAID_DTR/);
    assert.doesNotMatch(src, /buildPaidDtrIndividualization/);
  });
});
