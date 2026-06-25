import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PAID_DTR_CONSULT_REPLY,
  PAID_DTR_DRAWER_THEME_ENTRIES,
} from '../paidDtrProductCopy';
import {
  resolveConsultReplyPartByTheme,
  isKnownConsultTheme,
} from './consultReplyThemePartMap';

const CONSULT_ROOM = join(process.cwd(), 'components/dtr/ConsultRoom.tsx');

describe('consultReplyThemePartMap', () => {
  it('maps current theme chips to chapters including cross/support themes', () => {
    assert.deepEqual(resolveConsultReplyPartByTheme('恋人・近い人との向き合い方').roman, 'Ⅲ');
    assert.deepEqual(resolveConsultReplyPartByTheme('仕事・これからの進め方').roman, 'Ⅱ');
    assert.deepEqual(resolveConsultReplyPartByTheme('お金・生活・疲れの整え方').roman, 'Ⅳ');
    assert.deepEqual(resolveConsultReplyPartByTheme('これからの動き方').roman, 'Ⅱ');
    assert.deepEqual(resolveConsultReplyPartByTheme('疲れたときの戻り方').roman, 'Ⅳ');
  });

  it('resolves renamed legacy theme strings for stored messages', () => {
    assert.deepEqual(resolveConsultReplyPartByTheme('仕事・スキルの伸ばし方').roman, 'Ⅱ');
    assert.deepEqual(resolveConsultReplyPartByTheme('お金・生活の整え方').roman, 'Ⅳ');
  });

  it('drawer entries align with themeExamplesJa labels', () => {
    for (const theme of PAID_DTR_CONSULT_REPLY.themeExamplesJa) {
      assert.ok(isKnownConsultTheme(theme));
      const drawer = PAID_DTR_DRAWER_THEME_ENTRIES.find((e) => e.labelJa === theme);
      assert.ok(drawer, `drawer entry missing for ${theme}`);
      const part = resolveConsultReplyPartByTheme(theme);
      assert.ok(drawer!.primaryChapterJa.startsWith(part.roman));
    }
  });

  it('ConsultRoom shows purpose sublabels and Chapter I base note without chip roman numerals', () => {
    const src = readFileSync(CONSULT_ROOM, 'utf8');
    assert.ok(src.includes('step1ChapterBaseLensNoteJa'));
    assert.ok(src.includes('themeChipSublabel'));
    assert.equal(src.includes('themeChipRoman'), false);
    assert.equal(src.includes('resolveConsultReplyPartByTheme'), false);
  });
});
