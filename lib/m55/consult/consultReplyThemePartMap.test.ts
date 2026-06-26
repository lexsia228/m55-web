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
  resolveConsultReplyLensByTheme,
  isKnownConsultTheme,
} from './consultReplyThemePartMap';

const CONSULT_ROOM = join(process.cwd(), 'components/dtr/ConsultRoom.tsx');
const CONSULT_REPLY_CARD = join(process.cwd(), 'components/dtr/ConsultReplyCard.tsx');

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

  it('ConsultRoom shows purpose sublabels without chip roman numerals or Chapter I selection note', () => {
    const src = readFileSync(CONSULT_ROOM, 'utf8');
    assert.equal(src.includes('step1ChapterBaseLensNoteJa'), false);
    assert.ok(src.includes('themeChipSublabel'));
    assert.equal(src.includes('themeChipRoman'), false);
    assert.equal(src.includes('resolveConsultReplyPartByTheme'), false);
    assert.equal(src.includes('composeStepBadgeRequired'), false);
  });

  it('uses living-language lens labels without 優先順位 or 読み返す視点', () => {
    const workLens = resolveConsultReplyLensByTheme('仕事・これからの進め方');
    assert.equal(workLens.lensTitle, 'この相談で見返すところ');
    const labels = workLens.lensRows.map((row) => row.label);
    assert.ok(labels.includes('動きやすい場面'));
    assert.ok(labels.includes('何から始めるか'));
    assert.equal(labels.includes('優先順位'), false);
    assert.equal(labels.includes('力が出る条件'), false);
  });

  it('ConsultReplyCard shows 今日の一手 without redundant step meta label', () => {
    const src = readFileSync(CONSULT_REPLY_CARD, 'utf8');
    assert.ok(src.includes('今日の一手'));
    assert.equal(src.includes('1〜3 · 今日できる小さな一歩'), false);
    assert.equal(src.includes('replyTodayMeta'), false);
  });
});
