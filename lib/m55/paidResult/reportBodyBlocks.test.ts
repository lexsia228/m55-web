import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { STEM_SEED_BODIES } from '../dtrEngine';
import { normalizePaidReportPublicDisplayText } from '../paidReportPublicDisplayTerminology';
import { parseReportBodyBlocks } from './reportBodyBlocks';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/** The stem behind the delivered Light report: relational flow, distance, 関わり方. */
const DELIVERED_STEM = STEM_SEED_BODIES[1]!;

const ESSENCE_RHYTHM_NOTE =
  '関わりの数が増える時期ほど、自分の位置を先に置き直すと戻りやすくなります。';

/** Exactly how buildPaidDtrSectionIndividualizationPrefix composes the s3 body. */
const DELIVERED_S3_BODY =
  ['【このプレミアムレポートだけの本質リズム】', ESSENCE_RHYTHM_NOTE, ''].join('\n') +
  DELIVERED_STEM.essence;

describe('abstract catalog phrasing is corrected at display, not in the catalog', () => {
  it('leaves the stored catalog wording untouched so fingerprints hold', () => {
    assert.ok(
      DELIVERED_STEM.essence.includes('「自分は何の関わりとして呼ばれているか」'),
      'the frozen catalog must still carry its original wording',
    );
  });

  it('shows the reader natural Japanese instead of the analytical label', () => {
    const displayed = normalizePaidReportPublicDisplayText(DELIVERED_STEM.essence);
    assert.doesNotMatch(displayed, /何の関わりとして呼ばれて/);
    assert.match(displayed, /「自分がどんな関わり方を求められているか」が言えるときに起きます/);
  });

  it('changes that phrase and nothing else', () => {
    const displayed = normalizePaidReportPublicDisplayText(DELIVERED_STEM.essence);
    assert.match(displayed, /曖昧な期待のまま抱え込むほど、エネルギーは漏れます。/);
    const restored = displayed.replace(
      '「自分がどんな関わり方を求められているか」',
      '「自分は何の関わりとして呼ばれているか」',
    );
    assert.equal(restored, DELIVERED_STEM.essence);
  });

  it('is idempotent', () => {
    const once = normalizePaidReportPublicDisplayText(DELIVERED_STEM.essence);
    assert.equal(normalizePaidReportPublicDisplayText(once), once);
  });

  it('reaches the reader through the shared body parser', () => {
    const units = parseReportBodyBlocks(DELIVERED_S3_BODY).flatMap((b) => b.units);
    assert.ok(units.some((u) => u.includes('どんな関わり方を求められているか')));
    assert.ok(!units.some((u) => u.includes('何の関わりとして呼ばれているか')));
  });
});

describe('single-newline units become separate reading units', () => {
  it('splits the delivered 本質リズム section instead of fusing it', () => {
    const blocks = parseReportBodyBlocks(DELIVERED_S3_BODY);
    const totalUnits = blocks.reduce((n, b) => n + b.units.length, 0);
    assert.equal(totalUnits, 4, 'rhythm note plus the three essence units');
    for (const block of blocks) {
      for (const unit of block.units) {
        assert.doesNotMatch(unit, /\n/, 'no unit may still contain a fused newline');
      }
    }
  });

  it('scopes the individualization label to the line it was written for', () => {
    const blocks = parseReportBodyBlocks(DELIVERED_S3_BODY);
    const labelled = blocks[0]!;
    assert.equal(labelled.label, 'このプレミアムレポートだけの本質リズム');
    assert.deepEqual(labelled.units, [ESSENCE_RHYTHM_NOTE]);

    const catalogFollowOn = blocks[1]!;
    assert.equal(catalogFollowOn.label, null, 'catalog prose must not inherit the bespoke label');
    assert.equal(catalogFollowOn.units.length, 3);
    assert.match(catalogFollowOn.units[0]!, /^本質は、/);
  });

  it('keeps a 【…】 sub-section together with its own body', () => {
    const blocks = parseReportBodyBlocks(DELIVERED_STEM.strengths);
    const flexibility = blocks.find((b) => b.label === '場を読んで動く柔軟性');
    assert.ok(flexibility, 'catalog sub-section label must survive');
    assert.equal(flexibility.units.length, 1);
    assert.match(flexibility.units[0]!, /毎週の予定や急な用事/);
  });

  it('separates the figure lead from the prose that follows it', () => {
    const lead = parseReportBodyBlocks(DELIVERED_STEM.friction)[0]!;
    assert.equal(lead.label, null);
    assert.equal(lead.units.length, 2);
    assert.match(lead.units[0]!, /悪いところを決めるものではありません/);
  });

  it('never invents or drops text', () => {
    for (const body of [
      DELIVERED_S3_BODY,
      DELIVERED_STEM.identity,
      DELIVERED_STEM.composition,
      DELIVERED_STEM.relation,
      DELIVERED_STEM.work,
    ]) {
      const rendered = parseReportBodyBlocks(body)
        .flatMap((b) => (b.label != null ? [`【${b.label}】`, ...b.units] : b.units))
        .join('\n');
      const source = normalizePaidReportPublicDisplayText(body)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n');
      assert.equal(rendered, source);
    }
  });

  it('falls back to the raw paragraph when there is nothing to group', () => {
    assert.deepEqual(parseReportBodyBlocks(''), []);
    assert.deepEqual(parseReportBodyBlocks('   \n  '), []);
  });
});

describe('unit rhythm sits below paragraph rhythm', () => {
  const css = read('components/dtr/DtrFullReader.module.css');

  it('gives newline units their own smaller gap', () => {
    assert.match(css, /\.bodyParaUnits\s*\{[^}]*gap:\s*clamp\(13px, 2\.6vw, 16px\)/);
  });

  it('stays tighter than the gap between paragraphs', () => {
    const paragraphGap = /\.savedWideBody\s*\{[^}]*gap:\s*clamp\((\d+)px/.exec(css)?.[1];
    const unitGap = /\.bodyParaUnits\s*\{[^}]*gap:\s*clamp\((\d+)px/.exec(css)?.[1];
    assert.ok(paragraphGap && unitGap);
    assert.ok(Number(unitGap) < Number(paragraphGap), 'units must read as a pause, not a break');
  });
});
