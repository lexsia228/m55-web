/**
 * Static checks for saved-report chapter mobile readability styling.
 * CSS / layout only — no copy, snapshot, generation, or API changes.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { PAID_DTR_CHAPTER_DRAWER_INTRO, PAID_DTR_CHAPTERS } from './paidDtrProductCopy';

const READER_CSS = join(process.cwd(), 'components/dtr/DtrFullReader.module.css');
const HUB_CSS = join(process.cwd(), 'components/dtr/PremiumDrawerHub.module.css');
const CONSULT_ROOM = join(process.cwd(), 'components/dtr/ConsultRoom.tsx');
const PAID_COPY = join(process.cwd(), 'lib/m55/paidDtrProductCopy.ts');

describe('dtrSavedReportChapterMobileReadability', () => {
  it('keeps chapter drawer labels in paidDtrProductCopy SSOT', () => {
    const partIds = ['1', '2', '3', '4'] as const;
    for (let i = 0; i < PAID_DTR_CHAPTERS.length; i++) {
      const ch = PAID_DTR_CHAPTERS[i]!;
      const intro = PAID_DTR_CHAPTER_DRAWER_INTRO[partIds[i]!];
      assert.equal(intro.hubLabelJa, ch.title);
      assert.equal(intro.hubSublabelJa.includes('恋人'), false);
      assert.equal(intro.hubSublabelJa.includes('お金'), false);
    }
  });

  it('DtrFullReader renders canonical chapter title from drawer intro SSOT', () => {
    const reader = readFileSync(join(process.cwd(), 'components/dtr/DtrFullReader.tsx'), 'utf8');
    assert.ok(reader.includes('PAID_DTR_CHAPTER_DRAWER_INTRO'));
    assert.ok(reader.includes('intro.hubLabelJa'));
    assert.ok(reader.includes('reportPartBandTitle'));
  });

  it('DtrFullReader avoids duplicate canonical title in chapter band aria', () => {
    const reader = readFileSync(join(process.cwd(), 'components/dtr/DtrFullReader.tsx'), 'utf8');
    assert.equal(reader.includes('生活の4つの場面で読み返せます'), false);
    assert.ok(reader.includes('4章の流れで読み返せます'));
    assert.ok(reader.includes('legacyTitle !== intro.hubLabelJa'));
    assert.ok(reader.includes('第${partId}章'));
    assert.equal(reader.includes('第${partId}部'), false);
    assert.equal(
      reader.includes('`第${partId}部 ${intro.hubLabelJa}。${intro.legacyChapterTitleJa}`'),
      false
    );
  });

  it('Q2-B.1: chapter path has no pseudo-personalized opening chrome', () => {
    const reader = readFileSync(join(process.cwd(), 'components/dtr/DtrFullReader.tsx'), 'utf8');
    assert.equal(reader.includes('function DrawerChapterPersonalLead'), false);
    assert.equal(reader.includes('PAID_DTR_CHAPTER_OPENING_COPY'), false);
    assert.equal(reader.includes('function shouldSuppressDrawerChapterOpeningLead'), false);
    assert.equal(reader.includes('function ChapterPersonalHeading'), false);
    assert.ok(reader.includes('function ReportPartBand'));
    assert.ok(reader.includes('<ReportPartBand partId="1" />'));
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
