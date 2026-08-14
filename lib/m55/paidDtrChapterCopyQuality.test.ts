import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { essenceStabilityVizForStem } from './dtrEngine';
import { buildPaidDtrS3IndividualizationPrefix } from './dtrPaidIndividualization';
import {
  PAID_DTR_CHAPTER_BRIDGE_COPY,
  PAID_DTR_CHAPTER_OPENING_COPY,
  PAID_DTR_DEEP_READING_TAKEAWAYS,
  type PaidDtrReportPartId,
} from './paidDtrProductCopy';

const PART_IDS: readonly PaidDtrReportPartId[] = ['1', '2', '3', '4'];

const READER_SRC = readFileSync(
  join(process.cwd(), 'components/dtr/DtrFullReader.tsx'),
  'utf8',
);

/** Everything the chapter-2 display copy contributes to one rendered chapter. */
function chapter2DisplayCopy(): string[] {
  const opening = PAID_DTR_CHAPTER_OPENING_COPY['2'];
  const bridge = PAID_DTR_CHAPTER_BRIDGE_COPY['2'];
  const takeaways = PAID_DTR_DEEP_READING_TAKEAWAYS['2'];
  return [
    opening.tendencyJa,
    opening.reasonJa ?? '',
    opening.lifeJa,
    opening.actionJa,
    ...opening.pointsJa,
    takeaways.closedLeadJa,
    ...takeaways.itemsJa,
    bridge.tendencyJa,
    bridge.lifeJa,
    bridge.actionJa,
    bridge.consultQuestionJa,
  ];
}

describe('paid chapter copy — no line is rendered twice in one chapter', () => {
  it('asks the additional-reading question exactly once per chapter', () => {
    for (const partId of PART_IDS) {
      const question = PAID_DTR_CHAPTER_BRIDGE_COPY[partId].consultQuestionJa;
      for (const item of PAID_DTR_DEEP_READING_TAKEAWAYS[partId].itemsJa) {
        assert.ok(
          !item.includes(question),
          `chapter ${partId} takeaway repeats the consult question: ${item}`,
        );
      }
    }
  });

  it('keeps the takeaway list free of questions', () => {
    for (const partId of PART_IDS) {
      for (const item of PAID_DTR_DEEP_READING_TAKEAWAYS[partId].itemsJa) {
        assert.doesNotMatch(item, /？$/, `chapter ${partId} takeaway is a question: ${item}`);
        assert.doesNotMatch(item, /追加読み解きで深める問い/);
      }
    }
  });

  it('does not restate the chapter-2 stability panel verbatim', () => {
    const panelLines = [
      '安定する条件',
      '力が出やすい条件',
      '崩れやすい条件',
      '守る条件',
    ];
    for (const line of panelLines) {
      assert.ok(READER_SRC.includes(line), `panel line must still be rendered: ${line}`);
      for (const item of PAID_DTR_DEEP_READING_TAKEAWAYS['2'].itemsJa) {
        assert.ok(!item.includes(line), `takeaway restates the panel verbatim: ${item}`);
      }
    }
  });

  it('gives every chapter three distinct takeaways', () => {
    for (const partId of PART_IDS) {
      const items = PAID_DTR_DEEP_READING_TAKEAWAYS[partId].itemsJa;
      assert.equal(items.length, 3);
      assert.equal(new Set(items).size, 3);
    }
  });
});

describe('paid chapter copy — chapter 2 specificity', () => {
  it('opens on an observed contrast rather than a bare affirmation', () => {
    const tendency = PAID_DTR_CHAPTER_OPENING_COPY['2'].tendencyJa;
    assert.doesNotMatch(tendency, /ひとつずつ整えながら前に進める力があります/);
    assert.match(tendency, /\{nickname\}/);
    assert.match(tendency, /止まりやすい/);
  });

  it('states what the chapter shows instead of promising to look somewhere', () => {
    const action = PAID_DTR_CHAPTER_OPENING_COPY['2'].actionJa;
    assert.doesNotMatch(action, /^まずは、/);
    assert.match(action, /どこで崩れやすいか/);
  });

  it('stops repeating 先に整える場所 across the chapter copy', () => {
    const occurrences = chapter2DisplayCopy().filter((line) =>
      line.includes('先に整える場所'),
    );
    assert.deepEqual(occurrences, []);
  });

  it('keeps the chapter opening at full depth', () => {
    const opening = PAID_DTR_CHAPTER_OPENING_COPY['2'];
    assert.ok(opening.reasonJa);
    assert.ok(opening.lifeJa.length > 0);
    assert.equal(opening.pointsJa.length, 3);
  });
});

describe('paid chapter copy — Japanese naturalness', () => {
  it('drops the doubled causal marker in every chapter opening', () => {
    for (const partId of PART_IDS) {
      const life = PAID_DTR_CHAPTER_OPENING_COPY[partId].lifeJa;
      assert.doesNotMatch(life, /理由は、[\s\S]*ためです/, `chapter ${partId}: ${life}`);
    }
  });
});

describe('paid report — strong passages stay in place', () => {
  it('keeps the stem stability conditions the buyer already reads', () => {
    const viz = essenceStabilityVizForStem(1);
    assert.equal(viz.collapse, '誰が何をするか決まらないまま、気づけば一人で抱えすぎているとき');
    assert.equal(viz.maximize, '話がまとまる前に、次に何をするかを短く確かめられるとき');
  });

  it('keeps the concrete chapter-2 recovery move in the takeaway, not a second visual', () => {
    assert.ok(
      PAID_DTR_DEEP_READING_TAKEAWAYS['2'].itemsJa.some((item) => item.includes('後回しにする作業を先に決める')),
    );
    assert.equal(READER_SRC.includes('今日進めることを一つに絞り、「まずここから」と決めること。'), false);
  });
});

describe('本質リズム block — density is bounded by the frozen catalog', () => {
  /**
   * The s3 body still renders as one paragraph on a phone. Splitting it needs the s3 prefix
   * or the base catalog to change, and both are pinned by the cross-surface parity audit
   * freeze (golden s3_essence fingerprints). This locks in the current shape so the blocker
   * stays visible until that gate reopens.
   */
  it('is still a single reading unit, pending the catalog gate', () => {
    const prefix = buildPaidDtrS3IndividualizationPrefix({
      essenceRhythmNote: '冬の入り口に近い時期の生まれです。',
      auxiliaryReading: 'x',
      handlingHint: 'y',
      fingerprint: 'f',
    });
    const body = `${prefix}本質は、いま起きていることを早く感じ取り、…\n安定は、…`;
    const paragraphs = body
      .split('\n\n')
      .map((p) => p.trim())
      .filter(Boolean);

    assert.equal(paragraphs.length, 1);
    assert.match(paragraphs[0]!, /^【このプレミアムレポートだけの本質リズム】/);
  });
});
