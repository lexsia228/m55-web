import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { PAID_DTR_CHAPTER_BRIDGE_COPY } from './paidDtrProductCopy';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readerSource = readFileSync(join(repoRoot, 'components/dtr/DtrFullReader.tsx'), 'utf8');

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

describe('dtrReader chapter duplicate guard', () => {
  it('GridArticleCommViz does not repeat section.body after CommFlowFigures', () => {
    const block = extractFunctionBlock(readerSource, 'GridArticleCommViz');
    assert.ok(block.includes('CommFlowFigures'));
    assert.equal(block.includes('section.body.split'), false);
    assert.equal(block.includes('savedGridBody'), false);
  });

  it('ChapterFourWorkLead does not hardcode chapter-4 bridge lifeJa', () => {
    const block = extractFunctionBlock(readerSource, 'ChapterFourWorkLead');
    const bridgeLifeJa = PAID_DTR_CHAPTER_BRIDGE_COPY['4'].lifeJa;
    assert.equal(block.includes(bridgeLifeJa), false);
  });
});
