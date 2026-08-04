/**
 * Additional-reading wizard quality matrix — 20 combo × 15 DOB = 300 CI cases.
 * Dry-run only: no POST, no ticket consume, no AI, no DB/RPC.
 * Ticket policy under test: success-only-consume (RPC commit must stay uncalled).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyM55ConsultReplyQualityPasses } from '../ai/m55ConsultReplyQualitySanitizer';
import {
  CONSULT_QUESTION_CATALOG_V1,
  REPLY_THEME_IDS,
  getQuestionsForTheme,
  resolveReplyQuestion,
} from './consultQuestionCatalog.v1';
import {
  WIZARD_ENTRY_CARD_DISPLAY,
  wizardQuestionLabelJa,
} from './consultReplyWizardDisplay.v1';
import { buildConsultReportContextFromEnvelope } from './consultReportContext';
import {
  CI_CASE_COUNT,
  CI_COMBO_COUNT,
  CI_DOB_COUNT,
  DOB_ARCHETYPES_15,
  FIXED_NICKNAME,
  INVALID_DOB_FIXTURES,
  NIGHTLY_CASE_COUNT,
  STRESS_CASE_COUNT,
  assertRpcUncalled,
  assertWizardDisplayKeysCoverCatalog,
  buildAll300ConsultQualityCases,
  buildSyntheticConsultCase,
  buildSyntheticSavedReportEnvelope,
  buildUiServerLabelCorrespondenceTable,
  catalogSourcedPromptBlob,
  emptySnapshotEnvelope,
} from './consultReplyWizard20ComboDobQuality.fixtures';
import { renderDeterministicConsultReply } from './consultReplyWizard20ComboDobQuality.renderer';

const FORBIDDEN_TERMS = [
  '鑑定',
  '診断',
  '相談返書',
  '返書',
  '相談サービス',
  'アドバイス',
  '解決する',
  '未来を見る',
  '当たる',
  '的中',
  '必ず',
  '絶対',
  'スコア',
  'ランキング',
  '病名',
  '投資助言',
  '法的助言',
  'rawPrompt',
  'rawResponse',
  'serviceRole',
  'stripeSecret',
  'userId',
  'email',
] as const;

const DAILY_REQUIRED = ['出やすい', '場面', 'まず', '入口', '小さく'] as const;
const DAILY_FORBIDDEN = ['すべき', '正解は', '改善しましょう'] as const;
const TYPE_ASSERT_RE = /あなたは.+タイプです/;

/**
 * Strip safety-negation windows and known generation-instruction stems
 * before denylist scan.
 * SAFE examples: 「新しい鑑定ではない」「診断ではありません」.
 * Instruction contract may say 必ず「今日やることは1つだけです。」 — strip that window.
 */
function stripSafetyNegations(blob: string): string {
  return blob
    .replace(/新しい鑑定ではない/g, '')
    .replace(/新しい鑑定ではなく/g, '')
    .replace(/[^。\n]{0,24}(鑑定|診断|助言)ではありません/g, '')
    .replace(/[^。\n]{0,24}(鑑定|診断)ではない/g, '')
    .replace(/必ず「今日やることは1つだけです。」/g, '「今日やることは1つだけです。」')
    .replace(/5段落目は必ず/g, '5段落目は');
}

function assertNoForbidden(blob: string, label: string): void {
  const scanned = stripSafetyNegations(blob);
  for (const term of FORBIDDEN_TERMS) {
    assert.equal(
      scanned.includes(term),
      false,
      `${label} contains forbidden term: ${term}`,
    );
  }
}

function assertNoPii(blob: string, birthDate: string, label: string): void {
  assert.equal(blob.includes(birthDate), false, `${label} leaks birthDate`);
  assert.equal(
    blob.includes(FIXED_NICKNAME),
    false,
    `${label} leaks nickname`,
  );
  assert.doesNotMatch(blob, /\b\d{4}-\d{2}-\d{2}\b/, `${label} has YYYY-MM-DD`);
}

function assertDailyLanguage(text: string, label: string): void {
  const hasRequired = DAILY_REQUIRED.some((w) => text.includes(w));
  assert.ok(hasRequired, `${label} missing daily-language required token`);
  for (const bad of DAILY_FORBIDDEN) {
    assert.equal(text.includes(bad), false, `${label} has ${bad}`);
  }
  assert.equal(TYPE_ASSERT_RE.test(text), false, `${label} type assertion`);
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  assert.ok(paragraphs.length >= 5, `${label} needs ≥5 paragraphs`);
  assert.ok(
    paragraphs[paragraphs.length - 1]!.startsWith('今日やることは1つだけです。'),
    `${label} last paragraph contract`,
  );
}

describe('consultReplyWizard20ComboDobQuality — design constants', () => {
  it('documents CI 300 and optional nightly/stress sizes', () => {
    assert.equal(CI_CASE_COUNT, 300);
    assert.equal(CI_COMBO_COUNT, 20);
    assert.equal(CI_DOB_COUNT, 15);
    assert.equal(DOB_ARCHETYPES_15.length, 15);
    assert.equal(NIGHTLY_CASE_COUNT, 900);
    assert.equal(STRESS_CASE_COUNT, 1800);
  });
});

describe('A. combo coverage', () => {
  it('has entrance 5/5 and question 20/20 with unique ids', () => {
    assert.equal(REPLY_THEME_IDS.length, 5);
    assert.equal(CONSULT_QUESTION_CATALOG_V1.length, 20);
    const ids = CONSULT_QUESTION_CATALOG_V1.map((e) => e.reply_question_id);
    assert.equal(new Set(ids).size, 20);
    for (const themeId of REPLY_THEME_IDS) {
      assert.equal(getQuestionsForTheme(themeId).length, 4);
    }
  });

  it('UI↔server correspondence table covers all 20 keys', () => {
    assertWizardDisplayKeysCoverCatalog();
    const table = buildUiServerLabelCorrespondenceTable();
    assert.equal(table.length, 20);
    for (const row of table) {
      assert.equal(
        WIZARD_ENTRY_CARD_DISPLAY[row.reply_theme_id].label,
        row.uiThemeLabel,
      );
      assert.equal(
        wizardQuestionLabelJa(row.reply_question_id, row.serverQuestionLabel),
        row.uiQuestionLabel,
      );
      assert.ok(row.serverThemeLabel.length > 0);
      assert.ok(row.serverQuestionLabel.length > 0);
      // Drift is allowed; key mapping must resolve.
      assert.ok(
        resolveReplyQuestion(row.reply_theme_id, row.reply_question_id),
      );
    }
  });
});

describe('B–G. CI matrix 300 — routing / DOB / grounding / ticket / forbidden / daily (success-only-consume dry-run)', () => {
  const cases = buildAll300ConsultQualityCases();

  it('builds exactly 300 cases', () => {
    assert.equal(cases.length, 300);
  });

  it('covers all 20 combos and 15 DOBs', () => {
    const combos = new Set(cases.map((c) => c.catalogEntry.reply_question_id));
    const dobs = new Set(cases.map((c) => c.birthDate));
    assert.equal(combos.size, 20);
    assert.equal(dobs.size, 15);
    for (const dob of DOB_ARCHETYPES_15) {
      assert.ok(dobs.has(dob.birthDate));
    }
  });

  it('runs Phase A/B/C assertions across all 300 cases without RPC/AI/POST', () => {
    const renderedByCombo = new Map<string, Set<string>>();

    for (const c of cases) {
      const entry = c.catalogEntry;

      // B. routing / prompt
      assert.ok(c.anchors.includes(entry.themeLabelJa), `${c.caseId} theme`);
      assert.ok(c.anchors.includes(entry.labelJa), `${c.caseId} question`);
      assert.ok(
        c.anchors.includes(entry.promptFocusAnchor),
        `${c.caseId} promptFocusAnchor`,
      );
      assert.ok(
        c.anchors.includes(entry.primaryChapterRoman),
        `${c.caseId} primaryChapter`,
      );
      assert.ok(
        c.anchors.includes(entry.grounding_target),
        `${c.caseId} grounding_target`,
      );
      // forbidden_scope is catalog denylist metadata (may contain stems like 診断/鑑定).
      assert.ok(entry.forbidden_scope.length > 0, `${c.caseId} forbidden_scope`);
      // Must not appear as an explicit echoed field; safety-negation text may share stems.
      assert.equal(
        /forbidden_scope|禁止範囲/.test(c.anchors),
        false,
        `${c.caseId} must not surface forbidden_scope as a labeled field`,
      );

      // C. DOB / snapshot variance + PII
      assert.ok(
        c.reportContext.includes('【プレミアムレポートの本質リズム（購入時固定）】') ||
          c.reportContext.includes('【プレミアムレポートの補助整理（購入時固定）】') ||
          c.reportContext.includes('【プレミアムレポートの扱い方ヒント（購入時固定）】'),
        `${c.caseId} missing v2 individualization meta`,
      );
      assertNoPii(c.reportContext, c.birthDate, `${c.caseId} context`);
      assertNoPii(c.anchors, c.birthDate, `${c.caseId} anchors`);

      // D. grounding
      assert.ok(c.reportContext.length > 0, `${c.caseId} empty context`);
      assert.ok(
        c.reportContext.includes('主章候補') ||
          c.reportContext.includes('傾向語') ||
          c.reportContext.includes('本質リズム'),
        `${c.caseId} missing grounding cue`,
      );

      // E. ticket safety — success-only-consume dry-run
      assertRpcUncalled(c.rpc);
      assert.equal(c.wallet.available_count, 1);

      // F. forbidden on catalog-sourced + context + renderer.
      // Full production instruction templates inside anchors may still contain
      // legacy stems (e.g. 返書 in instruction headers) — do not scan those here.
      assertNoForbidden(
        catalogSourcedPromptBlob(entry),
        `${c.caseId} catalog blob`,
      );
      assertNoForbidden(c.reportContext, `${c.caseId} context`);
      const selectionAnchorBlob = [
        entry.themeLabelJa,
        entry.labelJa,
        entry.promptFocusAnchor,
        entry.grounding_target,
        entry.primaryChapterRoman,
        entry.secondaryChapterRoman ?? '',
      ].join('\n');
      assertNoForbidden(selectionAnchorBlob, `${c.caseId} selection anchors`);

      // Phase B/C — deterministic renderer + quality passes
      const rendered = renderDeterministicConsultReply({
        catalogEntry: entry,
        reportContext: c.reportContext,
        uiThemeLabel: c.uiThemeLabel,
        uiQuestionLabel: c.uiQuestionLabel,
      });
      const sanitized = applyM55ConsultReplyQualityPasses(rendered).text;

      assert.ok(
        sanitized.includes(c.uiThemeLabel) || sanitized.includes(entry.themeLabelJa),
        `${c.caseId} missing theme token`,
      );
      assert.ok(
        sanitized.includes(c.uiQuestionLabel) ||
          sanitized.includes(entry.labelJa) ||
          sanitized.includes(entry.promptFocusAnchor),
        `${c.caseId} missing focus token`,
      );
      assertNoForbidden(sanitized, `${c.caseId} renderer`);
      assertNoPii(sanitized, c.birthDate, `${c.caseId} renderer`);
      assertDailyLanguage(sanitized, `${c.caseId} daily`);

      const set = renderedByCombo.get(entry.reply_question_id) ?? new Set();
      set.add(sanitized);
      renderedByCombo.set(entry.reply_question_id, set);

      // Keep RPC uncalled after render path
      assertRpcUncalled(c.rpc);
    }

    // G. 20 combo must not collapse to one generic body
    assert.equal(renderedByCombo.size, 20);
    const firstBodies = [...renderedByCombo.values()].map((s) => [...s][0]!);
    assert.equal(new Set(firstBodies).size, 20, 'all combos rendered identical');
  });

  it('D04 vs D05 approximate DOB contexts are not identical', () => {
    const a = buildSyntheticConsultCase({ comboIndex: 0, dobIndex: 3 }); // 1982-02-28
    const b = buildSyntheticConsultCase({ comboIndex: 0, dobIndex: 4 }); // 1983-02-28
    assert.equal(a.birthDate, '1982-02-28');
    assert.equal(b.birthDate, '1983-02-28');
    assert.notEqual(a.contextHash, b.contextHash);
    assert.notEqual(a.reportContext, b.reportContext);
  });

  it('D13 leap day fixture builds non-empty context', () => {
    const leap = buildSyntheticConsultCase({ comboIndex: 0, dobIndex: 12 });
    assert.equal(leap.birthDate, '2000-02-29');
    assert.ok(leap.reportContext.length > 0);
    assertNoPii(leap.reportContext, leap.birthDate, 'leap context');
  });

  it('invalid theme/question pair fail-closes', () => {
    assert.equal(resolveReplyQuestion('work', 'relation.distance'), null);
    assert.equal(resolveReplyQuestion('work', 'work.not_a_real_id'), null);
  });

  it('empty snapshot yields empty context (fail-closed caller contract)', () => {
    const empty = emptySnapshotEnvelope();
    assert.equal(buildConsultReportContextFromEnvelope(empty), '');
  });

  it('invalid DOB fixtures fail-close at envelope build', () => {
    for (const bad of INVALID_DOB_FIXTURES) {
      assert.throws(
        () => buildSyntheticSavedReportEnvelope({ birthDate: bad }),
        (err: unknown) => err instanceof Error,
      );
    }
  });
});

describe('optional nightly/stress metadata (not executed)', () => {
  it('keeps 900/1800 design constants available for future suites', () => {
    assert.equal(NIGHTLY_CASE_COUNT, 900);
    assert.equal(STRESS_CASE_COUNT, 1800);
  });
});
