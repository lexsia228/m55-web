import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  PAID_DTR_CHAPTER_BRIDGE_COPY,
  PAID_DTR_CHAPTER_OPENING_COPY,
  PAID_DTR_DEEP_READING_TAKEAWAYS,
  type PaidDtrReportPartId,
} from './paidDtrProductCopy';
import {
  PAID_DTR_ESSENCE_RHYTHM_PUBLIC_HEADING_JA,
  normalizePaidReportPublicDisplayText,
} from './paidReportPublicDisplayTerminology';

const READER_SRC = readFileSync(join(process.cwd(), 'components/dtr/DtrFullReader.tsx'), 'utf8');
const PART_IDS: readonly PaidDtrReportPartId[] = ['1', '2', '3', '4'];

function extractFunctionBlock(source: string, name: string): string {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start >= 0, `missing function ${name}`);
  const bodyOpen = source.indexOf(') {', start);
  assert.ok(bodyOpen >= 0, `missing body for ${name}`);
  const braceStart = bodyOpen + 2;
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

describe('paid report semantic dedupe — chapter III composition', () => {
  it('renders labelled overload blocks once: cards are recognition, prose is not the same payload', () => {
    const friction = extractFunctionBlock(READER_SRC, 'GridArticleFrictionViz');
    assert.ok(friction.includes('isCatalogBlockPara'), 'prose must drop catalog 【】 blocks');
    assert.ok(friction.includes('FrictionWarningFigures'));

    const cards = extractFunctionBlock(READER_SRC, 'FrictionWarningFigures');
    assert.ok(cards.includes('it.header'));
    assert.equal(cards.includes('firstSentence(it.content)'), false);
    assert.equal(cards.includes('近い人との向き合い方と戻し方'), false);
  });

  it('keeps relationship-specific takeaways instead of generic overload restatement', () => {
    const items = PAID_DTR_DEEP_READING_TAKEAWAYS['3'].itemsJa.join('\n');
    assert.match(items, /裏の文脈/);
    assert.match(items, /感じたことを一つだけ先に返す/);
    assert.doesNotMatch(items, /落ち着いて相手の言葉を聞き/);
  });
});

describe('paid report semantic dedupe — chapter IV hierarchy', () => {
  it('does not keep a second recovery visual that restates the same 余白/減らす payload', () => {
    assert.equal(READER_SRC.includes('function LifeMarginRecoveryFigures'), false);
    assert.equal(READER_SRC.includes('まず負担を一つ軽くし、休める時間を先に置くこと。'), false);
  });

  it('gives practical action one job', () => {
    assert.ok(READER_SRC.includes("title: '今日の一手'"));
    assert.equal(READER_SRC.includes("title: '予定と余白'"), false);
    assert.equal(READER_SRC.includes("title: '生活の負荷と余白'"), false);
    assert.equal(READER_SRC.includes("title: '疲れと戻り方'"), false);
  });
});

describe('paid report semantic dedupe — chapter II action family', () => {
  it('does not push 順番 / 一つに絞る through opening, takeaway, and bridge together', () => {
    const opening = PAID_DTR_CHAPTER_OPENING_COPY['2'];
    const takeaways = PAID_DTR_DEEP_READING_TAKEAWAYS['2'].itemsJa.join('\n');
    const bridge = PAID_DTR_CHAPTER_BRIDGE_COPY['2'];
    const blob = [
      opening.tendencyJa,
      opening.reasonJa ?? '',
      opening.lifeJa,
      opening.actionJa,
      takeaways,
      bridge.tendencyJa,
      bridge.lifeJa,
      bridge.actionJa,
    ].join('\n');
    assert.doesNotMatch(blob, /順番/);
    assert.doesNotMatch(blob, /一つに絞/);
  });
});

describe('paid report semantic dedupe — template fatigue', () => {
  it('does not clone M55の読み解きでは〜出方があります across chapter bridges', () => {
    for (const partId of PART_IDS) {
      assert.doesNotMatch(
        PAID_DTR_CHAPTER_BRIDGE_COPY[partId].tendencyJa,
        /M55の読み解きでは/,
      );
    }
  });
});

describe('paid report semantic dedupe — public heading', () => {
  it('rewrites 本質リズム to a concrete public heading at display time', () => {
    assert.equal(PAID_DTR_ESSENCE_RHYTHM_PUBLIC_HEADING_JA, '判断が安定しやすい条件');
    const displayed = normalizePaidReportPublicDisplayText(
      '【このプレミアムレポートだけの本質リズム】\n見えている事実を一つ確かめてから進む。',
    );
    assert.match(displayed, /【判断が安定しやすい条件】/);
    assert.doesNotMatch(displayed, /本質リズム/);
  });
});
