import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONSULT_BODY_PRESENT_GENERATION_INSTRUCTION_JA,
  CONSULT_QUESTION_SELECT_GENERATION_INSTRUCTION_JA,
  CONSULT_THEME_ONLY_GENERATION_INSTRUCTION_JA,
  buildConsultUserAnchors,
  buildQuestionSelectConsultMessage,
  buildThemeOnlyConsultMessage,
  composeReplyUserMessage,
  parseConsultUserMessage,
  validateComposedReplyMessage,
  validateConsultSendInput,
} from './consultSendMessage';
import { resolveReplyQuestion, REPLY_THEME_IDS, getQuestionsForTheme } from './consultQuestionCatalog.v1';
import {
  CONSULT_REPLY_GENERATION,
  CONSULT_REPLY_QUALITY_VOICE_JA,
} from './consultReplyGenerationContract';
import {
  PAID_DTR_CONSULT_ENTRY_LAYOUT,
  PAID_DTR_CONSULT_REPLY,
  PAID_DTR_CONSULT_ROOM_UI,
} from '../paidDtrProductCopy';

const SEND_ROUTE = join(process.cwd(), 'app/api/room/core/send/route.ts');
const CONSULT_ROOM = join(process.cwd(), 'components/dtr/ConsultRoom.tsx');
const CONSULT_ROOM_CSS = join(process.cwd(), 'components/dtr/ConsultRoom.module.css');
const DTR_FULL_READER_CSS = join(process.cwd(), 'components/dtr/DtrFullReader.module.css');
const CONSULT_REPLY_CARD = join(process.cwd(), 'components/dtr/ConsultReplyCard.tsx');

describe('consultSendMessage', () => {
  it('composes exact question-select format', () => {
    const composed = composeReplyUserMessage('仕事・これからの進め方', 'いま優先に焦点を置きたい');
    assert.equal(composed, '【テーマ】仕事・これからの進め方\n【質問】いま優先に焦点を置きたい');
  });

  it('parses question-select composed message', () => {
    const msg = buildQuestionSelectConsultMessage('人との距離感', '距離の取り方を読み返したい');
    const parsed = parseConsultUserMessage(msg);
    assert.equal(parsed.theme, '人との距離感');
    assert.equal(parsed.question, '距離の取り方を読み返したい');
    assert.equal(parsed.freeBody, '');
    assert.equal(parsed.isQuestionSelect, true);
    assert.equal(parsed.isThemeOnlyLegacy, false);
    assert.equal(parsed.isThemeOnly, false);
  });

  it('compose roundtrip stays valid', () => {
    const entry = resolveReplyQuestion('tendency', 'tendency.lens');
    assert.ok(entry);
    const composed = composeReplyUserMessage(entry!.themeLabelJa, entry!.labelJa);
    const validation = validateComposedReplyMessage(composed);
    assert.equal(validation.ok, true);
    const parsed = parseConsultUserMessage(composed);
    assert.equal(parsed.isQuestionSelect, true);
  });

  it('parses legacy theme-only composed message', () => {
    const msg = buildThemeOnlyConsultMessage('仕事・これからの進め方');
    const parsed = parseConsultUserMessage(msg);
    assert.equal(parsed.theme, '仕事・これからの進め方');
    assert.equal(parsed.question, null);
    assert.equal(parsed.freeBody, '');
    assert.equal(parsed.isThemeOnlyLegacy, true);
    assert.equal(parsed.isThemeOnly, true);
  });

  it('parses legacy theme plus free body', () => {
    const msg = `【テーマ】疲れたときの戻り方\n\n今日は休むタイミングが分からず、疲れが抜けません。`;
    const parsed = parseConsultUserMessage(msg);
    assert.equal(parsed.theme, '疲れたときの戻り方');
    assert.ok(parsed.freeBody.includes('疲れが抜けません'));
    assert.equal(parsed.isQuestionSelect, false);
    assert.equal(parsed.isThemeOnlyLegacy, false);
  });

  it('accepts valid legacy theme-only send without minimum body length', () => {
    const msg = buildThemeOnlyConsultMessage('お金・生活・疲れの整え方');
    const result = validateConsultSendInput(msg);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.parsed.isThemeOnlyLegacy, true);
  });

  it('rejects missing theme', () => {
    const result = validateConsultSendInput('相談文だけです。');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, 'テーマを選択してください。');
  });

  it('rejects unknown theme for non-legacy payloads', () => {
    const result = validateConsultSendInput('【テーマ】存在しないテーマ');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, '有効なテーマを選択してください。');
  });

  it('question-select anchors include snapshot and focus contract', () => {
    const entry = resolveReplyQuestion('report', 'report.next_step');
    assert.ok(entry);
    const parsed = parseConsultUserMessage(
      composeReplyUserMessage(entry!.themeLabelJa, entry!.labelJa),
    );
    const anchors = buildConsultUserAnchors(parsed, entry);
    assert.ok(anchors.includes('選択式 — 自由記述なし'));
    assert.ok(anchors.includes('自由記述はありません'));
    assert.ok(anchors.includes(entry!.promptFocusAnchor));
    assert.ok(anchors.includes(entry!.grounding_target));
    assert.ok(anchors.includes(CONSULT_QUESTION_SELECT_GENERATION_INSTRUCTION_JA));
    assert.ok(anchors.includes('snapshot内の語彙'));
  });

  it('theme-only legacy anchors remain available', () => {
    const parsed = parseConsultUserMessage(buildThemeOnlyConsultMessage('仕事・これからの進め方'));
    const anchors = buildConsultUserAnchors(parsed);
    assert.ok(anchors.includes('テーマのみ — 有効'));
    assert.ok(anchors.includes(CONSULT_THEME_ONLY_GENERATION_INSTRUCTION_JA));
  });

  it('body-present legacy anchors remain available', () => {
    const parsed = parseConsultUserMessage(
      '【テーマ】疲れたときの戻り方\n\n休むタイミングが分かりません。',
    );
    const anchors = buildConsultUserAnchors(parsed);
    assert.ok(anchors.includes('ユーザー原文'));
    assert.ok(anchors.includes(CONSULT_BODY_PRESENT_GENERATION_INSTRUCTION_JA));
    assert.equal(anchors.includes('選択式 — 自由記述なし'), false);
  });

  it('generation instructions include quality voice contract', () => {
    assert.ok(CONSULT_BODY_PRESENT_GENERATION_INSTRUCTION_JA.includes('弱い一般論を避ける'));
    assert.ok(CONSULT_THEME_ONLY_GENERATION_INSTRUCTION_JA.includes('弱い一般論を避ける'));
    assert.ok(CONSULT_QUESTION_SELECT_GENERATION_INSTRUCTION_JA.includes('弱い一般論を避ける'));
    assert.ok(CONSULT_REPLY_QUALITY_VOICE_JA.includes('区切り動作'));
  });

  it('send route uses strict request validation and question-select prompt path', () => {
    const src = readFileSync(SEND_ROUTE, 'utf8');
    assert.ok(src.includes('validateConsultSendRequest'));
    assert.ok(src.includes('buildConsultUserAnchors'));
    assert.equal(src.includes('validateConsultSendInput'), false);
    assert.equal(src.includes('CONSULT_BODY_PRESENT'), false);
    assert.ok(src.includes('isQuestionSelect'));
    assert.ok(src.includes('countConsultReplyBlocks(aiContent)'));
  });

  it('ConsultRoom removes textarea and sends reply_theme_id + reply_question_id', () => {
    const src = readFileSync(CONSULT_ROOM, 'utf8');
    assert.equal(src.includes('<textarea'), false);
    assert.equal(src.includes('inputText'), false);
    assert.ok(src.includes('reply_theme_id'));
    assert.ok(src.includes('reply_question_id'));
    assert.ok(src.includes('今いちばん近い入口を選ぶ'));
    assert.ok(src.includes('今回深く見るところを選ぶ'));
    assert.ok(src.includes('selectionMemory'));
    assert.ok(src.includes('WizardProgress'));
    assert.equal(src.includes('相談内容を入力'), false);
    assert.equal(src.includes('自由に相談'), false);
    assert.equal(src.includes('追加解析'), false);
    assert.ok(src.includes('追加読み解き1件を使用します'));
    assert.equal(PAID_DTR_CONSULT_ROOM_UI.submitLabelJa, '追加読み解きを作成する');
    assert.match(PAID_DTR_CONSULT_REPLY.consumeNoteJa, /追加読み解き1件/);
    assert.equal(src.includes('相談返書を作成する'), false);
    assert.equal(src.includes('Ⅲ無理 + 対話章'), false);
    assert.equal(src.includes('Ⅰ + 傾向語'), false);
    assert.equal(src.includes('4章 + Ⅰ土台'), false);
  });

  it('ConsultRoom shows 4 question chips per theme and disables send until both are selected', () => {
    const src = readFileSync(CONSULT_ROOM, 'utf8');
    for (const themeId of REPLY_THEME_IDS) {
      assert.equal(getQuestionsForTheme(themeId).length, 4);
    }
    assert.ok(src.includes('getQuestionsForTheme(selectedThemeId)'));
    assert.ok(src.includes('themeQuestions.map'));
    assert.ok(src.includes('!selectedThemeId'));
    assert.ok(src.includes('!selectedQuestionId'));
    assert.ok(src.includes('submitDisabled'));
    assert.ok(src.includes('disabled={submitDisabled}'));
    assert.ok(src.includes('confirmPanel'));
    assert.ok(src.includes('Step 1 / 3'));
    assert.ok(src.includes('aria-current={active ? \'step\' : undefined}'));
    assert.ok(src.includes('aria-selected={selected}'));
    assert.ok(src.includes('submitBtnPrimary'));
    assert.equal(src.includes('送信するまで相談返書は使いません'), false);
    assert.ok(
      PAID_DTR_CONSULT_ENTRY_LAYOUT.essentialNotesJa.some((note) =>
        note.includes('送信するまで追加読み解きは使いません'),
      ),
    );
  });

  it('ConsultRoom wizard uses scoped typography hierarchy classes', () => {
    const src = readFileSync(CONSULT_ROOM, 'utf8');
    const css = readFileSync(CONSULT_ROOM_CSS, 'utf8');
    for (const className of [
      'wizTypoPanelTitle',
      'wizTypoStepHeading',
      'wizTypoCaption',
      'wizTypoBody',
      'wizTypoEmphasis',
      'wizTypoEmphasisNote',
      'wizTypoCardTitle',
      'wizTypoCardCaption',
      'wizTypoCtaNote',
    ]) {
      assert.ok(src.includes(className), `missing ${className} in ConsultRoom.tsx`);
      assert.ok(css.includes(`.replyWizard .${className}`), `missing scoped ${className} in CSS`);
    }
    assert.ok(css.includes('--wiz-text-primary'));
    assert.ok(css.includes('--wiz-space-steps'));
    assert.equal(/\n:root\s*\{/.test(css), false);
    assert.equal(/\nbody\s*\{/.test(css), false);
    assert.equal(/\nhtml\s*\{/.test(css), false);
    assert.ok(src.includes('inputNote'));
    assert.ok(src.includes('stepConsumeNote'));
  });

  it('ConsultRoom page context keeps secondary surfaces below replyWizard hierarchy', () => {
    const css = readFileSync(CONSULT_ROOM_CSS, 'utf8');
    const wizardStart = css.indexOf('.replyWizard {');
    assert.ok(wizardStart > 0, 'replyWizard block missing');
    const preWizardCss = css.slice(0, wizardStart);
    for (const selector of [
      '.usageStatusCard',
      '.entryEssentialNotes',
      '.historyTitle',
      '.historyShowMoreBtn',
      '.entryDetailsLower',
      '.replyCardCompact',
      '.replyLatestBadge',
    ]) {
      assert.ok(preWizardCss.includes(selector), `missing secondary selector ${selector}`);
    }
    assert.ok(preWizardCss.includes('.usageStatAvailable'));
    assert.equal(/\n:root\s*\{/.test(css), false);
    assert.equal(/\nbody\s*\{/.test(css), false);
    assert.equal(/\nhtml\s*\{/.test(css), false);
    assert.ok(css.includes('.replyWizard .wizTypoPanelTitle'));
    assert.ok(css.includes('--wiz-text-primary'));
  });

  it('DtrFullReader consult supplement and report meta use tertiary page context styling', () => {
    const css = readFileSync(DTR_FULL_READER_CSS, 'utf8');
    for (const selector of [
      '.consultEntryDetails',
      '.consultEntryDetailsSummary',
      '.reportMetaCard',
      '.reportMetaHeading',
      '.reportMetaWalletAvailable',
    ]) {
      assert.ok(css.includes(selector), `missing tertiary selector ${selector}`);
    }
    assert.equal(/\n:root\s*\{/.test(css), false);
    assert.equal(/\nbody\s*\{/.test(css), false);
    assert.equal(/\nhtml\s*\{/.test(css), false);
    const heroStart = css.indexOf('.premiumHero');
    const metaStart = css.indexOf('.reportMetaCard');
    assert.ok(heroStart >= 0 && metaStart > heroStart, 'report meta should follow hero block');
  });

  it('ConsultReplyCard prioritizes question quote label for history', () => {
    const roomSrc = readFileSync(CONSULT_ROOM, 'utf8');
    assert.ok(roomSrc.includes('【質問】'));
    const cardSrc = readFileSync(CONSULT_REPLY_CARD, 'utf8');
    assert.ok(cardSrc.includes('読み返したい焦点'));
  });

  it('compose length stays within max for all catalog entries', () => {
    const themes = ['work', 'relation', 'fatigue', 'tendency', 'report'] as const;
    for (const themeId of themes) {
      for (const suffix of ['priority', 'pace', 'start', 'boundary', 'distance', 'words']) {
        const entry = resolveReplyQuestion(themeId, `${themeId}.${suffix}`);
        if (!entry) continue;
        const composed = composeReplyUserMessage(entry.themeLabelJa, entry.labelJa);
        assert.ok(composed.length <= 500);
      }
    }
  });

  it('theme-only instruction includes minimum and target length contract', () => {
    const instruction = CONSULT_THEME_ONLY_GENERATION_INSTRUCTION_JA;
    assert.ok(instruction.includes(String(CONSULT_REPLY_GENERATION.minimumAcceptableJa)));
    assert.ok(instruction.includes(String(CONSULT_REPLY_GENERATION.targetMinJa)));
    assert.ok(instruction.includes(String(CONSULT_REPLY_GENERATION.targetMaxJa)));
  });
});
