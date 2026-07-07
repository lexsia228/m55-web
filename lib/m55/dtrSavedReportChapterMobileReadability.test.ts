/**
 * Static checks for saved-report chapter mobile readability styling.
 * CSS / layout only — no copy, snapshot, generation, or API changes.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { PAID_DTR_CHAPTER_DRAWER_INTRO } from './paidDtrProductCopy';

const READER_CSS = join(process.cwd(), 'components/dtr/DtrFullReader.module.css');
const HUB_CSS = join(process.cwd(), 'components/dtr/PremiumDrawerHub.module.css');
const CONSULT_ROOM = join(process.cwd(), 'components/dtr/ConsultRoom.tsx');
const PAID_COPY = join(process.cwd(), 'lib/m55/paidDtrProductCopy.ts');

describe('dtrSavedReportChapterMobileReadability', () => {
  it('keeps chapter drawer labels in paidDtrProductCopy SSOT', () => {
    assert.equal(PAID_DTR_CHAPTER_DRAWER_INTRO['1'].hubLabelJa, '自分の形を知る');
    assert.equal(PAID_DTR_CHAPTER_DRAWER_INTRO['2'].hubLabelJa, '仕事・これからの進め方');
    assert.equal(PAID_DTR_CHAPTER_DRAWER_INTRO['3'].hubLabelJa, '恋人・近い人との向き合い方');
    assert.equal(PAID_DTR_CHAPTER_DRAWER_INTRO['4'].hubLabelJa, 'お金・生活・疲れの整え方');
  });

  it('DtrFullReader.module.css defines chapter mobile readability rhythm', () => {
    const css = readFileSync(READER_CSS, 'utf8');
    for (const selector of [
      '.savedWidePara',
      '.savedWideBody',
      '.savedWideStack',
      '.drawerChapterPersonalLead',
      '.chapterOpeningLede',
      '.chapterPersonalHeading',
      '.chapterOpeningPoints',
      '.sectionBlockGroup',
      '.sectionBlockLabel',
      '.drawerDeepReadBlock',
      '.pmInDrawer',
    ]) {
      assert.ok(css.includes(selector), `missing ${selector}`);
    }
    assert.ok(css.includes('Saved report chapter mobile readability'));
    assert.ok(css.includes('@media (max-width: 639px)'));
    assert.equal(/\n:root\s*\{/.test(css), false);
    assert.equal(/\nbody\s*\{/.test(css), false);
    assert.equal(/\nhtml\s*\{/.test(css), false);
  });

  it('PremiumDrawerHub reading surface keeps mobile padding and safe-area', () => {
    const css = readFileSync(HUB_CSS, 'utf8');
    assert.ok(css.includes('.drawerHubReadingSurface'));
    assert.ok(css.includes('safe-area-inset-bottom'));
    assert.equal(/\n:root\s*\{/.test(css), false);
  });

  it('does not modify ConsultRoom or paidDtrProductCopy source in this lane', () => {
    const consult = readFileSync(CONSULT_ROOM, 'utf8');
    assert.ok(consult.includes('replyWizard'));
    assert.equal(consult.includes('savedWidePara'), false);
    const copy = readFileSync(PAID_COPY, 'utf8');
    assert.ok(copy.includes('PAID_DTR_CHAPTER_DRAWER_INTRO'));
    assert.equal(copy.includes('savedWidePara'), false);
  });
});
