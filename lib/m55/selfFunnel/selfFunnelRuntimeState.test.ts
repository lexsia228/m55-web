import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  SELF_FUNNEL_SCHEMA_VERSION,
  buildFreeResultFingerprint,
  commitFreeResult,
  emptyPersistedFunnel,
  formatActiveDobSummaryJa,
  invalidateDependentResults,
  isValidBasicInfo,
  isValidCivilBirthDate,
  parsePersistedFunnel,
  resolveCoreRouteView,
  resolveDtrLpGate,
  resolveFreeCtaLabel,
  resolveResumeQuestionIndex,
  resolveSelfFunnelStage,
  EXPLICIT_RERUN_CTA_JA,
} from './selfFunnelRuntimeState';

const ROOT = join(import.meta.dirname, '../../..');

const COMPLETE_ANSWERS = {
  'free.start_style': 'free.start_style.map_first',
  'free.decision_style': 'free.decision_style.sort_first',
  'free.recovery_style': 'free.recovery_style.pause_short',
  'free.distance_style': 'free.distance_style.close_careful',
  'free.change_style': 'free.change_style.observe_first',
  'free.primary_theme': 'free.primary_theme.report_preview',
};

const BASIC = { nickname: '試験', birthDate: '1983-02-28' };

describe('selfFunnelRuntimeState — basic info predicate', () => {
  it('requires valid nickname and civil DOB', () => {
    assert.equal(isValidBasicInfo(null), false);
    assert.equal(isValidBasicInfo({ nickname: '', birthDate: '1983-02-28' }), false);
    assert.equal(isValidBasicInfo({ nickname: '試験', birthDate: '1983-02-30' }), false);
    assert.equal(isValidBasicInfo({ nickname: '試験', birthDate: 'not-a-date' }), false);
    assert.equal(isValidBasicInfo(BASIC), true);
    assert.equal(isValidCivilBirthDate('1983-02-28'), true);
    assert.equal(isValidCivilBirthDate('1983-02-30'), false);
  });

  it('formats active DOB summary in Japanese', () => {
    assert.equal(formatActiveDobSummaryJa('1983-02-28'), '1983年2月28日を使用中');
  });
});

describe('selfFunnelRuntimeState — stale / corrupt rejection', () => {
  it('rejects wrong schema version and boolean-only payloads', () => {
    assert.deepEqual(parsePersistedFunnel({ schemaVersion: 99, basicInfoComplete: true }), emptyPersistedFunnel());
    assert.deepEqual(parsePersistedFunnel({ basicInfoComplete: true }), emptyPersistedFunnel());
    assert.deepEqual(parsePersistedFunnel(null), emptyPersistedFunnel());
  });

  it('mismatched fingerprint fails closed to questions/basic', () => {
    const fp = buildFreeResultFingerprint(BASIC, COMPLETE_ANSWERS);
    const stage = resolveSelfFunnelStage({
      basicInfo: BASIC,
      draftFreeAnswers: COMPLETE_ANSWERS,
      committedFreeAnswers: COMPLETE_ANSWERS,
      freeResultFingerprint: `${fp}|tampered`,
      paidAnswers: {},
    });
    assert.equal(stage, 'FREE_QUESTIONS_IN_PROGRESS');
  });

  it('invalidates dependent results on basic-info change helper', () => {
    const committed = commitFreeResult(emptyPersistedFunnel(), BASIC, COMPLETE_ANSWERS)!;
    const wiped = invalidateDependentResults(committed);
    assert.equal(wiped.committedFreeAnswers, null);
    assert.equal(wiped.freeResultFingerprint, null);
  });
});

describe('selfFunnelRuntimeState — route decision table', () => {
  it('maps stages to /core views and /dtr/lp gates', () => {
    assert.equal(resolveCoreRouteView('EMPTY'), 'intake');
    assert.equal(resolveCoreRouteView('BASIC_INFO_COMPLETE'), 'questionnaire');
    assert.equal(resolveCoreRouteView('FREE_QUESTIONS_IN_PROGRESS'), 'questionnaire');
    assert.equal(resolveCoreRouteView('FREE_RESULT_READY'), 'result');
    assert.equal(resolveDtrLpGate('EMPTY'), 'need_free');
    assert.equal(resolveDtrLpGate('BASIC_INFO_COMPLETE'), 'need_free');
    assert.equal(resolveDtrLpGate('FREE_RESULT_READY'), 'paid_questions');
    assert.equal(resolveDtrLpGate('PAID_QUESTIONS_COMPLETE'), 'plan_selection');
    assert.equal(resolveDtrLpGate('PURCHASED'), 'owned_report');
  });

  it('resolves stages from answer progress', () => {
    assert.equal(
      resolveSelfFunnelStage({
        basicInfo: BASIC,
        draftFreeAnswers: {},
        committedFreeAnswers: null,
        freeResultFingerprint: null,
        paidAnswers: {},
      }),
      'BASIC_INFO_COMPLETE',
    );
    assert.equal(
      resolveSelfFunnelStage({
        basicInfo: BASIC,
        draftFreeAnswers: {
          'free.start_style': 'free.start_style.map_first',
          'free.decision_style': 'free.decision_style.sort_first',
        },
        committedFreeAnswers: null,
        freeResultFingerprint: null,
        paidAnswers: {},
      }),
      'FREE_QUESTIONS_IN_PROGRESS',
    );
    const fp = buildFreeResultFingerprint(BASIC, COMPLETE_ANSWERS);
    assert.equal(
      resolveSelfFunnelStage({
        basicInfo: BASIC,
        draftFreeAnswers: COMPLETE_ANSWERS,
        committedFreeAnswers: COMPLETE_ANSWERS,
        freeResultFingerprint: fp,
        paidAnswers: {},
      }),
      'FREE_RESULT_READY',
    );
  });

  it('resumes at first unanswered question', () => {
    assert.equal(resolveResumeQuestionIndex({}), 0);
    assert.equal(
      resolveResumeQuestionIndex({
        'free.start_style': 'free.start_style.map_first',
        'free.decision_style': 'free.decision_style.sort_first',
      }),
      2,
    );
  });
});

describe('selfFunnelRuntimeState — CTA labels and idempotency', () => {
  it('uses state-aware free CTA labels', () => {
    assert.equal(resolveFreeCtaLabel('EMPTY'), '無料で見てみる');
    assert.equal(resolveFreeCtaLabel('BASIC_INFO_COMPLETE'), '無料結果の続きを見る');
    assert.equal(resolveFreeCtaLabel('FREE_QUESTIONS_IN_PROGRESS'), '無料結果の続きを見る');
    assert.equal(resolveFreeCtaLabel('FREE_RESULT_READY'), '無料結果を開く');
    assert.equal(EXPLICIT_RERUN_CTA_JA, '回答を変えて、もう一度見る');
  });

  it('commitFreeResult increments generation once per new fingerprint', () => {
    const first = commitFreeResult(emptyPersistedFunnel(), BASIC, COMPLETE_ANSWERS)!;
    assert.equal(first.generationCount, 1);
    assert.equal(first.schemaVersion, SELF_FUNNEL_SCHEMA_VERSION);
    const same = commitFreeResult(first, BASIC, COMPLETE_ANSWERS)!;
    assert.equal(same.freeResultFingerprint, first.freeResultFingerprint);
    assert.equal(same.generationCount, 2);
  });
});

describe('selfFunnelRuntimeState — wiring guards', () => {
  it('panel hydrates funnel store and exposes generation count', () => {
    const panel = readFileSync(join(ROOT, 'components/core/CoreEssencePanel.tsx'), 'utf8');
    assert.match(panel, /hydrateFromStore|readPersistedFunnel/);
    assert.match(panel, /generationFlightRef/);
    assert.match(panel, /data-m55-generation-count/);
    assert.match(panel, /formatActiveDobSummaryJa/);
  });

  it('dtr lp fails closed without free result', () => {
    const prep = readFileSync(join(ROOT, 'components/dtr/DtrPaidPurchasePrep.tsx'), 'utf8');
    assert.match(prep, /DtrNeedFreeResultGate/);
    assert.match(prep, /resolveDtrLpGate/);
    const gate = readFileSync(join(ROOT, 'components/dtr/DtrNeedFreeResultGate.tsx'), 'utf8');
    assert.doesNotMatch(gate, /無料結果はすでに完了/);
    assert.match(gate, /m55-dtr-need-free/);
  });

  it('mobile contextual CTA is one-tap (free or premium by state)', () => {
    const header = readFileSync(join(ROOT, 'components/shell/PublicHeader.tsx'), 'utf8');
    assert.match(header, /m55-mobile-nav-contextual/);
    assert.match(header, /contextualPrimaryAction/);
    const state = readFileSync(join(ROOT, 'lib/m55/commercialUx/publicHeaderState.ts'), 'utf8');
    assert.match(state, /resolveContextualPrimaryAction/);
  });
});
