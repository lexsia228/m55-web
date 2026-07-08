/**
 * Static checks for saved-report hub UX (layout / hierarchy only).
 * No copy, snapshot, generation, preselect, purchase CTA, or FAB changes.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const READER_TSX = join(process.cwd(), 'components/dtr/DtrFullReader.tsx');
const READER_CSS = join(process.cwd(), 'components/dtr/DtrFullReader.module.css');
const HUB_TSX = join(process.cwd(), 'components/dtr/PremiumDrawerHub.tsx');
const HUB_CSS = join(process.cwd(), 'components/dtr/PremiumDrawerHub.module.css');
const CONSULT_ROOM = join(process.cwd(), 'components/dtr/ConsultRoom.tsx');
const CONSULT_CSS = join(process.cwd(), 'components/dtr/ConsultRoom.module.css');
const PAID_COPY = join(process.cwd(), 'lib/m55/paidDtrProductCopy.ts');

function chapterPanelBlock(tsx: string, panel: string): string {
  const marker = `case '${panel}':`;
  const start = tsx.indexOf(marker);
  assert.ok(start >= 0, `missing ${marker}`);
  const nextCase = tsx.indexOf("\n      case '", start + marker.length);
  const nextDefault = tsx.indexOf('\n      default:', start + marker.length);
  const endCandidates = [nextCase, nextDefault].filter((i) => i >= 0);
  const end = endCandidates.length > 0 ? Math.min(...endCandidates) : tsx.length;
  return tsx.slice(start, end);
}

describe('dtrSavedReportAsHubUx', () => {
  it('places ChapterConsultNextAction after drawerDeepReadBlock in each chapter panel', () => {
    const tsx = readFileSync(READER_TSX, 'utf8');
    for (const panel of ['chapter-1', 'chapter-2', 'chapter-3', 'chapter-4'] as const) {
      const block = chapterPanelBlock(tsx, panel);
      const deepIdx = block.indexOf('drawerDeepReadBlock');
      const ctaIdx = block.indexOf('ChapterConsultNextAction');
      assert.ok(deepIdx >= 0, `${panel}: missing drawerDeepReadBlock`);
      assert.ok(ctaIdx >= 0, `${panel}: missing ChapterConsultNextAction`);
      assert.ok(
        ctaIdx > deepIdx,
        `${panel}: ChapterConsultNextAction must follow drawerDeepReadBlock`,
      );
    }
  });

  it('PremiumDrawerHub separates read zone and consult zone', () => {
    const tsx = readFileSync(HUB_TSX, 'utf8');
    assert.ok(tsx.includes('drawerHubReadZone'));
    assert.ok(tsx.includes('drawerHubConsultZone'));
    assert.ok(tsx.includes('DRAWER_HUB_CHAPTER_ROWS'));
    assert.ok(tsx.includes('DRAWER_HUB_CONSULT_ROW'));
    const readIdx = tsx.indexOf('drawerHubReadZone');
    const consultIdx = tsx.indexOf('drawerHubConsultZone');
    assert.ok(readIdx >= 0 && consultIdx > readIdx);
    const css = readFileSync(HUB_CSS, 'utf8');
    for (const selector of [
      '.drawerHubReadZone',
      '.drawerHubConsultZone',
      '.drawerHubZoneLead',
      '.drawerHubContinuousSupportSurface',
    ]) {
      assert.ok(css.includes(selector), `missing ${selector}`);
    }
  });

  it('surfaces continuousSupportBodyJa in hub consult zone and above ConsultRoom', () => {
    const hub = readFileSync(HUB_TSX, 'utf8');
    const reader = readFileSync(READER_TSX, 'utf8');
    assert.ok(hub.includes('continuousSupportBodyJa'));
    assert.ok(reader.includes('ContinuousSupportSurface'));
    assert.ok(reader.includes('consultContinuousSupportSurface'));
    assert.ok(reader.includes('continuousSupportBodyJa'));
  });

  it('strengthens chapter consult action as full-width secondary surface', () => {
    const css = readFileSync(READER_CSS, 'utf8');
    assert.ok(css.includes('.chapterConsultAction'));
    assert.match(css, /\.chapterConsultAction[\s\S]*width:\s*100%/);
    assert.match(css, /\.chapterConsultButton[\s\S]*width:\s*100%/);
  });

  it('does not wire purchaseCtaPanel or add preselect / initialThemeId', () => {
    const reader = readFileSync(READER_TSX, 'utf8');
    const hub = readFileSync(HUB_TSX, 'utf8');
    const consult = readFileSync(CONSULT_ROOM, 'utf8');
    assert.equal(reader.includes('initialThemeId'), false);
    assert.equal(hub.includes('initialThemeId'), false);
    assert.equal(consult.includes('initialThemeId'), false);
    assert.equal(consult.includes('purchaseCtaPanel'), false);
    assert.equal(readFileSync(CONSULT_CSS, 'utf8').includes('.purchaseCtaPanel'), true);
  });

  it('does not modify ConsultRoom wizard, paidDtrProductCopy source, or readingGuideFab', () => {
    const consult = readFileSync(CONSULT_ROOM, 'utf8');
    assert.ok(consult.includes('replyWizard'));
    assert.equal(consult.includes('drawerHubReadZone'), false);
    const reader = readFileSync(READER_TSX, 'utf8');
    assert.ok(reader.includes('readingGuideFab'));
    assert.ok(reader.includes('DrawerHubScrollFab'));
    const copyBefore = readFileSync(PAID_COPY, 'utf8');
    assert.ok(copyBefore.includes('PAID_DTR_CHAPTER_CONSULT_CTA_LABEL_JA'));
    assert.equal(copyBefore.includes('drawerHubReadZone'), false);
  });
});
