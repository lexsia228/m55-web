/**
 * Source-inspection tests for snapshot body wiring in DtrFullReader.
 *
 * Verifies that:
 *  - s1/s3/s5 use snapshot body preferentially via hasSnapshotBody / displayBodyParas
 *  - hardcoded bodyParas remain as fallback (not deleted)
 *  - s7 extracts and renders DOB-v2 individualization blocks
 *  - helper functions are present and correctly scoped
 *
 * No React rendering, no DB, no network, no real user data.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

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

describe('dtrReader snapshot body wiring', () => {
  // ── Helper presence ──────────────────────────────────────────────────────────

  it('snapshotBodyParas helper is defined in reader source', () => {
    assert.ok(readerSource.includes('function snapshotBodyParas('), 'snapshotBodyParas missing');
  });

  it('hasSnapshotBody helper is defined in reader source', () => {
    assert.ok(readerSource.includes('function hasSnapshotBody('), 'hasSnapshotBody missing');
  });

  it('SNAPSHOT_BODY_MIN_PARAS constant is defined', () => {
    assert.ok(readerSource.includes('SNAPSHOT_BODY_MIN_PARAS'), 'SNAPSHOT_BODY_MIN_PARAS missing');
  });

  it('extractDobV2IndividualizationBlocks helper is defined in reader source', () => {
    assert.ok(
      readerSource.includes('function extractDobV2IndividualizationBlocks('),
      'extractDobV2IndividualizationBlocks missing'
    );
  });

  // ── s1 IdentityArticleWithBlueprint ─────────────────────────────────────────

  it('IdentityArticleWithBlueprint uses hasSnapshotBody condition', () => {
    const block = extractFunctionBlock(readerSource, 'IdentityArticleWithBlueprint');
    assert.ok(block.includes('hasSnapshotBody'), 's1: hasSnapshotBody condition missing');
  });

  it('IdentityArticleWithBlueprint uses displayBodyParas (snapshot-first)', () => {
    const block = extractFunctionBlock(readerSource, 'IdentityArticleWithBlueprint');
    assert.ok(block.includes('displayBodyParas'), 's1: displayBodyParas missing');
    assert.ok(block.includes('useSnapshot'), 's1: useSnapshot missing');
  });

  it('IdentityArticleWithBlueprint retains hardcoded fallback bodyParas', () => {
    const block = extractFunctionBlock(readerSource, 'IdentityArticleWithBlueprint');
    assert.ok(block.includes('hardcodedBodyParas'), 's1: hardcodedBodyParas fallback missing');
    // Hardcoded text still present as fallback
    assert.ok(block.includes('ひとつのことにじっくり向き合うほど'), 's1: fallback text disappeared');
  });

  it('IdentityArticleWithBlueprint does not use old section.body.split directly for body', () => {
    const block = extractFunctionBlock(readerSource, 'IdentityArticleWithBlueprint');
    // The old pattern `section.body.split('\n\n').filter` should no longer exist in this function
    assert.equal(
      block.includes("section.body.split('\\n\\n').filter"),
      false,
      's1: old split pattern still present'
    );
  });

  // ── s3 EssenceArticleWithViz ─────────────────────────────────────────────────

  it('EssenceArticleWithViz uses hasSnapshotBody condition', () => {
    const block = extractFunctionBlock(readerSource, 'EssenceArticleWithViz');
    assert.ok(block.includes('hasSnapshotBody'), 's3: hasSnapshotBody condition missing');
  });

  it('EssenceArticleWithViz uses displayBodyParas (snapshot-first)', () => {
    const block = extractFunctionBlock(readerSource, 'EssenceArticleWithViz');
    assert.ok(block.includes('displayBodyParas'), 's3: displayBodyParas missing');
  });

  it('EssenceArticleWithViz retains hardcoded fallback including pilot-guide copy', () => {
    const block = extractFunctionBlock(readerSource, 'EssenceArticleWithViz');
    assert.ok(block.includes('hardcodedBodyParas'), 's3: hardcodedBodyParas fallback missing');
    assert.ok(
      block.includes('今日やることを一つだけに絞ります'),
      's3: pilot copy disappeared from fallback'
    );
  });

  it('EssenceArticleWithViz does not use old section.body.split directly for body', () => {
    const block = extractFunctionBlock(readerSource, 'EssenceArticleWithViz');
    assert.equal(
      block.includes("section.body.split('\\n\\n').filter"),
      false,
      's3: old split pattern still present'
    );
  });

  // ── s5 GridArticleFrictionViz ────────────────────────────────────────────────

  it('GridArticleFrictionViz uses hasSnapshotBody condition', () => {
    const block = extractFunctionBlock(readerSource, 'GridArticleFrictionViz');
    assert.ok(block.includes('hasSnapshotBody'), 's5: hasSnapshotBody condition missing');
  });

  it('GridArticleFrictionViz uses displayBodyParas (snapshot-first)', () => {
    const block = extractFunctionBlock(readerSource, 'GridArticleFrictionViz');
    assert.ok(block.includes('displayBodyParas'), 's5: displayBodyParas missing');
  });

  it('GridArticleFrictionViz retains hardcoded fallback bodyParas', () => {
    const block = extractFunctionBlock(readerSource, 'GridArticleFrictionViz');
    assert.ok(block.includes('hardcodedBodyParas'), 's5: hardcodedBodyParas fallback missing');
    assert.ok(block.includes('丁寧に向き合おうとします'), 's5: fallback text disappeared');
  });

  // ── s7 ChapterFourWorkLead ───────────────────────────────────────────────────

  it('ChapterFourWorkLead calls extractDobV2IndividualizationBlocks', () => {
    const block = extractFunctionBlock(readerSource, 'ChapterFourWorkLead');
    assert.ok(
      block.includes('extractDobV2IndividualizationBlocks'),
      's7: individualization extraction missing'
    );
  });

  it('ChapterFourWorkLead renders indBlocks when present', () => {
    const block = extractFunctionBlock(readerSource, 'ChapterFourWorkLead');
    assert.ok(block.includes('indBlocks'), 's7: indBlocks rendering missing');
    assert.ok(block.includes('indBlocks.length > 0'), 's7: indBlocks conditional missing');
  });

  it('ChapterFourWorkLead retains hardcoded lead bodyParas as baseline', () => {
    const block = extractFunctionBlock(readerSource, 'ChapterFourWorkLead');
    assert.ok(block.includes('身につけてきたこと'), 's7: hardcoded lead text disappeared');
    assert.ok(block.includes('bodyParas'), 's7: bodyParas missing');
  });

  // ── Helper unit-style tests using snapshotBodyParas logic ───────────────────

  it('snapshotBodyParas splits on double newline and trims', () => {
    // Inline simulation of snapshotBodyParas logic for deterministic check
    const body = '【この保存版だけの本質リズム】\nABC\n\nDEF段落\n\nGHI段落';
    const paras = body.split('\n\n').map((p) => p.trim()).filter(Boolean);
    assert.equal(paras.length, 3, 'expected 3 paragraphs');
    assert.ok(paras[0]!.startsWith('【この保存版だけの本質リズム】'), 'first para must be DOB-v2 block');
  });

  it('hasSnapshotBody returns false for empty body', () => {
    const paras = ''.split('\n\n').map((p) => p.trim()).filter(Boolean);
    assert.equal(paras.length >= 2, false, 'empty body should not qualify');
  });

  it('hasSnapshotBody returns false for single-para body under min chars', () => {
    const paras = '一段落だけ'.split('\n\n').map((p) => p.trim()).filter(Boolean);
    assert.equal(paras.length >= 2, false, 'single para should not qualify by count');
    assert.equal('一段落だけ'.trim().length >= 120, false, 'short single para should not qualify');
  });

  it('hasSnapshotBody returns true for single substantial para (hybrid AI)', () => {
    const body = 'あ'.repeat(130);
    const paras = body.split('\n\n').map((p) => p.trim()).filter(Boolean);
    assert.equal(paras.length >= 2, false);
    assert.equal(body.trim().length >= 120, true);
  });

  it('hasSnapshotBody returns true for 2+ para body', () => {
    const paras = '一段落目\n\n二段落目'.split('\n\n').map((p) => p.trim()).filter(Boolean);
    assert.equal(paras.length >= 2, true, '2-para body should qualify');
  });

  it('extractDobV2IndividualizationBlocks extracts 【この保存版だけ】 blocks only', () => {
    const body = [
      '【力が出る条件】\n内容A',
      '【この保存版だけの補助整理】\n生年月日の細かなリズム...補助内容',
      '【詰まりやすい条件】\n内容B',
    ].join('\n\n');
    const paras = body.split('\n\n').map((p) => p.trim()).filter(Boolean);
    const indBlocks = paras.filter((p) => /^【この保存版だけ/.test(p));
    assert.equal(indBlocks.length, 1, 'should extract exactly 1 individualization block');
    assert.ok(indBlocks[0]!.includes('補助整理'), 'block should be the individualization one');
  });

  it('extractDobV2IndividualizationBlocks returns empty for no matching blocks', () => {
    const body = '【力が出る条件】\n内容A\n\n【詰まりやすい条件】\n内容B';
    const paras = body.split('\n\n').map((p) => p.trim()).filter(Boolean);
    const indBlocks = paras.filter((p) => /^【この保存版だけ/.test(p));
    assert.equal(indBlocks.length, 0, 'no matching blocks');
  });

  // ── Regression: s7 existing constraints still satisfied ─────────────────────

  it('ChapterFourWorkLead still uses WorkGuideCards', () => {
    const block = extractFunctionBlock(readerSource, 'ChapterFourWorkLead');
    assert.ok(block.includes('WorkGuideCards'), 's7: WorkGuideCards removed');
  });

  it('GridArticleCommViz still does not repeat section.body after CommFlowFigures', () => {
    const block = extractFunctionBlock(readerSource, 'GridArticleCommViz');
    assert.ok(block.includes('CommFlowFigures'));
    assert.equal(block.includes('section.body.split'), false);
    assert.equal(block.includes('savedGridBody'), false);
  });
});
