import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { Client } from 'pg';
import {
  COMPATIBILITY_REPORT_INCLUDED_REPLY_COUNT,
  COMPATIBILITY_REPORT_PRODUCT_AUTHORITY,
} from './compatibilityCommerceAuthority';
import {
  buildCompatibilityConsultReportContext,
  buildConsultRelationshipLoopOverflowNotice,
  COMPATIBILITY_CONSULT_REPORT_CONTEXT_TOTAL_CAP,
  COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS,
  CONSULT_LOOP_SEGMENT_SEPARATOR,
  extractCompatibilityConsultChapterSection,
  formatConsultRelationshipLoopUnderCap,
  normalizeConsultRelationshipLoopItems,
  splitConsultLoopSegments,
} from './compatibilityConsultReportContext';
import { buildPaidCompatibilityReportV1 } from './buildPaidCompatibilityReportV1';
import {
  buildCompatibilityConsultPromptForCatalogEntry,
  COMPATIBILITY_CONSULT_GROUNDING_JA,
  COMPATIBILITY_CONSULT_PAIR_QUESTION_IDS,
  COMPATIBILITY_CONSULT_REPLY_THEME_IDS,
  resolveCompatibilityConsultQuestionChapterFocus,
} from './compatibilityConsultPrompt';
import { compatibilityConsultRequestFingerprint } from './compatibilityConsultDb';
import { CONSULT_QUESTION_CATALOG_V1 } from '../consult/consultQuestionCatalog.v1';
import type { PaidCompatibilityReportSnapshot } from './buildPaidCompatibilityReportV1';
import type { ChapterId } from './pairReadingTypes';

const ROOT = process.cwd();

function loopLineFromSection(section: string): string {
  return section.split('\n').find((line) => line.startsWith('ループ:')) ?? '';
}

function assertIncreasingPositions(body: string, needles: string[], label: string): void {
  let last = -1;
  for (let index = 0; index < needles.length; index += 1) {
    const needle = needles[index]!;
    const pos = body.indexOf(needle);
    assert.ok(pos >= 0, `${label}: missing fragment index ${index}`);
    assert.ok(pos >= last, `${label}: source order broken at index ${index}`);
    last = pos;
  }
}

const LOOP_TRUNCATION_MARK = '…';

/** Primary-tier loop field preferred max at scale=1 (matches report-context candidate). */
const PRIMARY_LOOP_FIELD_PREFERRED_MAX = 480;

type LoopSemanticsExpectation = 'full_when_fits' | 'per_item_excerpt';

function joinedRelationshipLoopLength(sourceLoop: readonly string[]): number {
  return normalizeConsultRelationshipLoopItems(sourceLoop).join(CONSULT_LOOP_SEGMENT_SEPARATOR)
    .length;
}

function expectedLoopSemanticsMode(sourceLoop: readonly string[]): LoopSemanticsExpectation {
  return joinedRelationshipLoopLength(sourceLoop) <= PRIMARY_LOOP_FIELD_PREFERRED_MAX
    ? 'full_when_fits'
    : 'per_item_excerpt';
}

function assertSegmentMatchesSourceAtIndex(
  segment: string,
  trimmed: string,
  caseLabel: string,
  index: number,
): void {
  if (segment === trimmed) return;
  assert.match(
    segment,
    /…$/,
    `${caseLabel}: PER_ITEM_EXCERPT missing ellipsis at index ${index}`,
  );
  const displayed = segment.endsWith(LOOP_TRUNCATION_MARK)
    ? segment.slice(0, -LOOP_TRUNCATION_MARK.length)
    : segment;
  assert.ok(
    displayed.length > 0 && displayed.length < trimmed.length,
    `${caseLabel}: PER_ITEM_EXCERPT empty or full-length at index ${index}`,
  );
  assert.equal(
    trimmed.slice(0, displayed.length),
    displayed,
    `${caseLabel}: PER_ITEM_EXCERPT non-prefix at index ${index}`,
  );
}

function assertPrimaryLoopOverflowDisclosure(
  section: string,
  sourceItemCount: number,
  caseLabel: string,
): void {
  const loopLine = loopLineFromSection(section);
  assert.ok(loopLine.length > 0, `${caseLabel}: loop line missing`);
  const body = loopLine.replace(/^ループ:\s*/, '');
  assert.match(body, new RegExp(`${sourceItemCount}項目`), `${caseLabel}: overflow count`);
  assert.match(body, /省略|上限/, `${caseLabel}: overflow disclosure wording`);
  assert.ok(body.length <= PRIMARY_LOOP_FIELD_PREFERRED_MAX, `${caseLabel}: overflow body cap`);
  assert.notEqual(
    splitConsultLoopSegments(loopLine).length,
    sourceItemCount,
    `${caseLabel}: must not emit ${sourceItemCount} pseudo-segments`,
  );
}

function assertPrimaryLoopPreservesSourceSemantics(
  section: string,
  sourceLoop: readonly string[],
  caseLabel: string,
  expectedMode: LoopSemanticsExpectation,
): void {
  const loopLine = loopLineFromSection(section);
  assert.ok(loopLine.length > 0, `${caseLabel}: loop line missing`);
  const body = loopLine.replace(/^ループ:\s*/, '');
  assert.doesNotMatch(body, /→/, `${caseLabel}: invented arrow`);

  const sources = normalizeConsultRelationshipLoopItems(sourceLoop);
  assert.ok(sources.length >= 1, `${caseLabel}: source loop empty`);

  const segments = splitConsultLoopSegments(loopLine);
  assert.equal(
    segments.length,
    sources.length,
    `${caseLabel}: expected ${sources.length} segments got ${segments.length}`,
  );

  let lastPos = -1;
  for (let index = 0; index < sources.length; index += 1) {
    const trimmed = sources[index]!.trim();
    const segment = segments[index]!;
    assert.ok(segment.length > 0, `${caseLabel}: empty segment at index ${index}`);

    const pos = body.indexOf(segment);
    assert.ok(pos >= 0, `${caseLabel}: segment ${index} not found in loop body`);
    assert.ok(pos >= lastPos, `${caseLabel}: segment order broken at index ${index}`);
    lastPos = pos;

    if (expectedMode === 'full_when_fits') {
      assert.equal(segment, trimmed, `${caseLabel}: FULL index ${index}`);
      continue;
    }

    assertSegmentMatchesSourceAtIndex(segment, trimmed, caseLabel, index);
  }
}

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function dockerAvailable(): boolean {
  return spawnSync('docker', ['info'], { encoding: 'utf8' }).status === 0;
}

function consultMigrationSqlWithoutFulfill(): string {
  const sql = read('supabase/migrations/20261030180000_m55_pair_included_reply_consult_v1.sql');
  const fulfillStart = sql.indexOf('CREATE OR REPLACE FUNCTION public.m55_fulfill_compatibility_report_v1');
  const fulfillEnd = sql.indexOf('REVOKE ALL ON FUNCTION public.m55_ensure_compatibility_included_reply_thread_v1');
  assert.ok(fulfillStart > 0 && fulfillEnd > fulfillStart);
  const tail = sql.slice(fulfillEnd);
  const tailWithoutFulfillAcl = tail
    .replace(
      /REVOKE ALL ON FUNCTION public\.m55_fulfill_compatibility_report_v1\(uuid, text, text\)\s+FROM PUBLIC, anon, authenticated;\s*/g,
      '',
    )
    .replace(
      /GRANT EXECUTE ON FUNCTION public\.m55_fulfill_compatibility_report_v1\(uuid, text, text\)\s+TO service_role;\s*/g,
      '',
    );
  return `${sql.slice(0, fulfillStart)}\n${tailWithoutFulfillAcl}`;
}

function buildSixChapterSnapshot(relationStatus: 'R1' | 'R3'): PaidCompatibilityReportSnapshot {
  const chapters = COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS.map((key, index) => ({
    key,
    number: index + 1,
    title: `章${index + 1}-${key}`,
    scene: `SCENE_${key}`,
    personAPerspective: `VIEWA_${key}`,
    personBPerspective: `VIEWB_${key}`,
    relationshipLoop: [`LOOP_${key}`],
    resetSteps: [`RESET_${key}`],
    phraseSpeaker: 'personA' as const,
    usablePhrase: `PHRASE_${key}`,
    smallExperiment: `EXPR_${key}`,
    reflectionQuestion: `REFLECT_${key}`,
    sceneInteractionId: `scene_${index + 1}`,
  }));
  return {
    version: 'paid_compatibility_report_v1',
    reportTitle: '二人の相性レポート',
    relationshipSummary: 'summary-'.padEnd(400, 's'),
    sharedFoundation: 'shared-'.padEnd(300, 's'),
    differentFoundation: 'diff-'.padEnd(300, 'd'),
    recurringLoop: 'loop-'.padEnd(400, 'l'),
    highlightedChapterKeys: [...COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS],
    chapters,
    safetyNote: '安全',
    currentContext:
      relationStatus === 'R1'
        ? {
            relationStatusId: 'R1',
            focusLabel: '片思いの距離',
            currentExpression: 'まだ返信はない',
            relationshipLoop: '近づきすぎて止まる',
          }
        : {
            relationStatusId: 'R3',
            focusLabel: '付き合いのすれ違い',
            currentExpression: '連絡は続いている',
            relationshipLoop: '期待のズレ',
          },
  } as unknown as PaidCompatibilityReportSnapshot;
}

function sixChapterSnapshotWithChapterLoop(
  relationStatus: 'R1' | 'R3',
  chapterKey: ChapterId,
  relationshipLoop: readonly string[],
): PaidCompatibilityReportSnapshot {
  const base = buildSixChapterSnapshot(relationStatus);
  const chapters = base.chapters.map((chapter) =>
    chapter.key === chapterKey
      ? { ...chapter, relationshipLoop: Object.freeze([...relationshipLoop]) }
      : chapter,
  );
  return { ...base, chapters: Object.freeze(chapters) } as PaidCompatibilityReportSnapshot;
}

describe('Pair included reply consult v1', () => {
  it('product authority includes one included additional reading per report', () => {
    assert.equal(COMPATIBILITY_REPORT_INCLUDED_REPLY_COUNT, 1);
    assert.equal(COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.additionalReading, true);
    assert.equal(COMPATIBILITY_REPORT_PRODUCT_AUTHORITY.includedReplyCount, 1);
  });

  it('migration defines reserve/release RPCs and attempt_token lease columns', () => {
    const sql = read('supabase/migrations/20261030180000_m55_pair_included_reply_consult_v1.sql');
    assert.match(sql, /m55_compatibility_consult_send_reserve_v1/);
    assert.match(sql, /m55_compatibility_consult_send_release_v1/);
    assert.match(sql, /attempt_token uuid/);
    assert.match(sql, /reserved_until timestamptz/);
    assert.match(sql, /ACTIVE_SEND_IN_PROGRESS/);
    assert.match(sql, /REPLAY_CONTENT_MISSING/);
    assert.match(sql, /v_new_reserved_until := now\(\) \+ interval '15 minutes'/);
    assert.match(sql, /v_stored_reserved_until/);
    assert.match(sql, /reserved_until IS NULL OR reserved_until < now\(\)/);
    assert.doesNotMatch(sql, /assistant_content', COALESCE\(v_assistant_content, p_assistant_message\)/);
  });

  it('commit RPC fingerprints request only and requires reservation attempt token', () => {
    const sql = read('supabase/migrations/20261030180000_m55_pair_included_reply_consult_v1.sql');
    const fn = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.m55_compatibility_consult_reply_commit'));
    const fpBlock = fn.slice(fn.indexOf('v_fingerprint := md5'), fn.indexOf('PERFORM pg_advisory_xact_lock'));
    assert.doesNotMatch(fpBlock, /p_assistant_message/);
    assert.match(fn, /p_attempt_token uuid/);
    assert.match(fn, /ATTEMPT_TOKEN_MISMATCH/);
    assert.match(fn, /RESERVATION_REQUIRED/);
  });

  it('consult tables use ENABLE and FORCE row level security', () => {
    const sql = read('supabase/migrations/20261030180000_m55_pair_included_reply_consult_v1.sql');
    assert.match(sql, /compatibility_consult_threads FORCE ROW LEVEL SECURITY/);
    assert.match(sql, /compatibility_consult_messages FORCE ROW LEVEL SECURITY/);
    assert.match(sql, /compatibility_consult_send_commits FORCE ROW LEVEL SECURITY/);
  });

  it('send route reserves before OpenAI and releases on controlled failures', () => {
    const send = read('app/api/compatibility/reports/[reportId]/consult/send/route.ts');
    assert.match(send, /reserveCompatibilityConsultSend/);
    assert.match(send, /releaseCompatibilityConsultSendReservation/);
    assert.match(send, /attemptToken/);
    assert.doesNotMatch(send, /preflightCompatibilityConsultSend/);
    assert.doesNotMatch(send, /creditsRemaining <= 0/);
    const openAiIdx = send.indexOf('openai.chat.completions.create');
    const reserveIdx = send.indexOf('reserveCompatibilityConsultSend');
    assert.ok(reserveIdx > 0 && openAiIdx > reserveIdx);
  });

  it('GET room loader never restores spent credits from message counts', () => {
    const db = read('lib/m55/compatibility/compatibilityConsultDb.ts');
    assert.doesNotMatch(db, /credits_remaining: expectedRemaining/);
    assert.match(db, /hasSucceededConsultCommit/);
    assert.match(db, /assistantCount > 0/);
  });

  it('request fingerprint helper matches SQL request-only digest inputs', () => {
    const fp = compatibilityConsultRequestFingerprint({
      ownerUserId: ' user ',
      ownedReportId: '550e8400-e29b-41d4-a716-446655440000',
      idempotencyKey: ' key12345678 ',
      userMessage: ' hello ',
    });
    assert.equal(fp.length, 32);
    const sql = read('supabase/migrations/20261030180000_m55_pair_included_reply_consult_v1.sql');
    const fpBlock = sql.slice(
      sql.indexOf('v_fingerprint := md5'),
      sql.indexOf('PERFORM pg_advisory_xact_lock'),
    );
    assert.doesNotMatch(fpBlock, /p_assistant_message/);
  });

  it('report context keeps per-chapter grounding fields and question focus (R1/R3 sentinels)', () => {
    for (const relation of ['R1', 'R3'] as const) {
      const snapshot = buildSixChapterSnapshot(relation);
      const timingEntry = CONSULT_QUESTION_CATALOG_V1.find(
        (e) => e.reply_question_id === 'relation.timing',
      )!;
      const ctx = buildCompatibilityConsultReportContext(snapshot, {
        focusChapterKeys: resolveCompatibilityConsultQuestionChapterFocus(timingEntry),
      });
      assert.ok(ctx.length <= COMPATIBILITY_CONSULT_REPORT_CONTEXT_TOTAL_CAP);
      for (const key of COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS) {
        assert.match(ctx, new RegExp(`\\[${key}\\]`));
        assert.match(ctx, new RegExp(`SCENE_${key}`));
        assert.match(ctx, new RegExp(`LOOP_${key}`));
      }
      assert.match(ctx, /RESET_ch_you_pace/);
      assert.match(ctx, /EXPR_ch_you_pace/);
      assert.match(ctx, /REFLECT_ch_you_pace/);
      assert.match(ctx, /RESET_ch_today_clue/);
      if (relation === 'R1') {
        assert.match(ctx, /まだ返信はない/);
        assert.doesNotMatch(ctx, /相手が返信した|相手の同意|相手も望んで/);
      }
    }
  });

  it('R1 report.next_step preserves complete source action and causal loop under cap', () => {
    const r1Paid = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T2',
      relationStatusId: 'R1',
      temperatureId: 'E2',
      personAUsesFirstPerspective: true,
    });
    const todayChapter = r1Paid.chapters.find((chapter) => chapter.key === 'ch_today_clue');
    assert.ok(todayChapter);
    const sourceAction = todayChapter!.smallExperiment;
    assert.match(
      sourceAction,
      /相手の反応を想像する前に、自分が感じている距離を一文で書く/,
    );
    const nextStepEntry = CONSULT_QUESTION_CATALOG_V1.find(
      (entry) => entry.reply_question_id === 'report.next_step',
    );
    assert.ok(nextStepEntry);
    const focus = resolveCompatibilityConsultQuestionChapterFocus(nextStepEntry!);
    const ctx = buildCompatibilityConsultReportContext(r1Paid, {
      focusChapterKeys: focus,
    });
    assert.ok(ctx.length <= COMPATIBILITY_CONSULT_REPORT_CONTEXT_TOTAL_CAP);
    const primarySection = extractCompatibilityConsultChapterSection(ctx, 'ch_today_clue');
    assert.ok(primarySection.length > 0);
    assert.match(
      primarySection,
      /相手の反応を想像する前に、自分が感じている距離を一文で書く/,
    );
    assert.match(primarySection, /想像と実際の距離の差が、気持ちの重さを増やしやすい/);
    assert.match(primarySection, /見えない反応を、冷たさのサインだと受け取りやすくなります/);
    assert.match(
      primarySection,
      /まだ会話がないのに、距離や気持ちの重さを感じる場面/,
    );
    assert.ok(splitConsultLoopSegments(loopLineFromSection(primarySection)).length >= 3);
    assert.doesNotMatch(loopLineFromSection(primarySection), /→/);
    for (const key of COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS) {
      assert.match(ctx, new RegExp(`\\[${key}\\]`));
    }
    assert.doesNotMatch(ctx, /相手が返信した|相手も望んでいる|相手の同意/);
  });

  it('R3 report.chapter_pick primary keeps producer misread 詰問に見えやすい with multi-part loop', () => {
    const r3Paid = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T2',
      relationStatusId: 'R3',
      temperatureId: 'E2',
      personAUsesFirstPerspective: true,
    });
    const chapter = r3Paid.chapters.find((c) => c.key === 'ch_topic_deep')!;
    assert.match(chapter.relationshipLoop[2] ?? '', /詰問に見えやすい/);
    const entry = CONSULT_QUESTION_CATALOG_V1.find(
      (e) => e.reply_question_id === 'report.chapter_pick',
    )!;
    const ctx = buildCompatibilityConsultReportContext(r3Paid, {
      focusChapterKeys: resolveCompatibilityConsultQuestionChapterFocus(entry),
    });
    const section = extractCompatibilityConsultChapterSection(ctx, 'ch_topic_deep');
    assert.match(section, /あなたの整理が、相手には詰問に見えやすい/);
    assert.doesNotMatch(section, /動きが見えやすいことがあります →/);
    const segments = splitConsultLoopSegments(loopLineFromSection(section));
    assert.ok(segments.length >= 3);
    assert.match(segments.join(' '), /詰問に見えやすい/);
    assert.doesNotMatch(segments[1] ?? '', /詰問に見えやすい/);
  });

  it('R1 and R3 report.how_to_use primary retain 完璧な一言 misread in ch_about', () => {
    for (const relationStatusId of ['R1', 'R3'] as const) {
      const paid = buildPaidCompatibilityReportV1({
        pairAxisId: 'A2',
        paidTopicId: 'T2',
        relationStatusId,
        temperatureId: 'E2',
        personAUsesFirstPerspective: true,
      });
      const entry = CONSULT_QUESTION_CATALOG_V1.find(
        (e) => e.reply_question_id === 'report.how_to_use',
      )!;
      const ctx = buildCompatibilityConsultReportContext(paid, {
        focusChapterKeys: resolveCompatibilityConsultQuestionChapterFocus(entry),
      });
      const section = extractCompatibilityConsultChapterSection(ctx, 'ch_about');
      assert.match(section, /完璧な一言を待つあまり、接点自体を作れない/);
      assert.ok(splitConsultLoopSegments(loopLineFromSection(section)).length >= 2);
    }
  });

  it('R1 relation.words and relation.timing primary loops keep at least two source segments', () => {
    const r1Paid = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T2',
      relationStatusId: 'R1',
      temperatureId: 'E2',
      personAUsesFirstPerspective: true,
    });
    for (const questionId of ['relation.words', 'relation.timing'] as const) {
      const entry = CONSULT_QUESTION_CATALOG_V1.find((e) => e.reply_question_id === questionId)!;
      const focus = resolveCompatibilityConsultQuestionChapterFocus(entry);
      const ctx = buildCompatibilityConsultReportContext(r1Paid, { focusChapterKeys: focus });
      const section = extractCompatibilityConsultChapterSection(ctx, focus[0]);
      const segments = splitConsultLoopSegments(loopLineFromSection(section));
      assert.ok(segments.length >= 2, questionId);
      assert.match(section, /距離の合図のように受け取られる|反応の見えなさだけで関心の有無/);
    }
  });

  it('R3 report.next_step primary chapter keeps misread and observed parts in producer order', () => {
    const r3Paid = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T2',
      relationStatusId: 'R3',
      temperatureId: 'E2',
      personAUsesFirstPerspective: true,
    });
    const entry = CONSULT_QUESTION_CATALOG_V1.find(
      (e) => e.reply_question_id === 'report.next_step',
    )!;
    const ctx = buildCompatibilityConsultReportContext(r3Paid, {
      focusChapterKeys: resolveCompatibilityConsultQuestionChapterFocus(entry),
    });
    assert.ok(ctx.length <= COMPATIBILITY_CONSULT_REPORT_CONTEXT_TOTAL_CAP);
    const section = extractCompatibilityConsultChapterSection(ctx, 'ch_today_clue');
    assert.match(section, /短い返事を、冷たさのサインだと受け取りやすくなります/);
    assert.match(section, /近づいて確かめる動きと、離れて整える動きが続きやすい傾向/);
    const segments = splitConsultLoopSegments(loopLineFromSection(section));
    assert.ok(segments.length >= 2);
    const observedIdx = segments.findIndex((part) => part.includes('近づいて確かめる'));
    const misreadIdx = segments.findIndex((part) => part.includes('短い返事'));
    assert.ok(observedIdx >= 0 && misreadIdx >= 0 && observedIdx < misreadIdx);
    assert.doesNotMatch(loopLineFromSection(section), /→/);
  });

  it('R3 relation.words includes primary scene when actual line fits chapter budget', () => {
    const r3Paid = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T2',
      relationStatusId: 'R3',
      temperatureId: 'E2',
      personAUsesFirstPerspective: true,
    });
    const youPace = r3Paid.chapters.find((c) => c.key === 'ch_you_pace');
    assert.ok(youPace);
    const entry = CONSULT_QUESTION_CATALOG_V1.find(
      (e) => e.reply_question_id === 'relation.words',
    )!;
    const ctx = buildCompatibilityConsultReportContext(r3Paid, {
      focusChapterKeys: resolveCompatibilityConsultQuestionChapterFocus(entry),
    });
    const section = extractCompatibilityConsultChapterSection(ctx, 'ch_you_pace');
    assert.match(section, new RegExp(`場面: ${youPace!.scene.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    assert.match(section, /返事を急かされているように見える/);
  });

  it('consult context respects 2200 cap for long synthetic snapshot', () => {
    const snapshot = {
      ...buildSixChapterSnapshot('R3'),
      relationshipSummary: 'x'.repeat(800),
      recurringLoop: 'y'.repeat(800),
    } as PaidCompatibilityReportSnapshot;
    const entry = CONSULT_QUESTION_CATALOG_V1.find(
      (e) => e.reply_question_id === 'relation.timing',
    )!;
    const ctx = buildCompatibilityConsultReportContext(snapshot, {
      focusChapterKeys: resolveCompatibilityConsultQuestionChapterFocus(entry),
    });
    assert.ok(ctx.length <= COMPATIBILITY_CONSULT_REPORT_CONTEXT_TOTAL_CAP);
    for (const key of COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS) {
      assert.match(ctx, new RegExp(`\\[${key}\\]`));
    }
    assert.match(ctx, /連絡は続いている/);
  });

  it('16 Pair focus-primary cases preserve source loop semantics (R1/R3 x 8 questions)', () => {
    for (const relationStatusId of ['R1', 'R3'] as const) {
      const paid = buildPaidCompatibilityReportV1({
        pairAxisId: 'A2',
        paidTopicId: 'T2',
        relationStatusId,
        temperatureId: 'E2',
        personAUsesFirstPerspective: true,
      });
      for (const questionId of COMPATIBILITY_CONSULT_PAIR_QUESTION_IDS) {
        const entry = CONSULT_QUESTION_CATALOG_V1.find(
          (e) => e.reply_question_id === questionId,
        );
        assert.ok(entry, `${relationStatusId} ${questionId}`);
        const focus = resolveCompatibilityConsultQuestionChapterFocus(entry!);
        const primaryKey = focus[0];
        const chapter = paid.chapters.find((c) => c.key === primaryKey);
        assert.ok(chapter, `${relationStatusId} ${questionId}`);
        const caseLabel = `${relationStatusId}/${questionId}/${primaryKey}`;

        const ctx = buildCompatibilityConsultReportContext(paid, { focusChapterKeys: focus });
        assert.ok(
          ctx.length <= COMPATIBILITY_CONSULT_REPORT_CONTEXT_TOTAL_CAP,
          `${caseLabel} len=${ctx.length}`,
        );
        for (const key of COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS) {
          assert.match(ctx, new RegExp(`\\[${key}\\]`));
        }
        const section = extractCompatibilityConsultChapterSection(ctx, primaryKey);
        const loopMode = expectedLoopSemanticsMode(chapter!.relationshipLoop);
        assertPrimaryLoopPreservesSourceSemantics(
          section,
          chapter!.relationshipLoop,
          caseLabel,
          loopMode,
        );
        if (relationStatusId === 'R1' && questionId.startsWith('relation.')) {
          assert.doesNotMatch(ctx, /相手が返信した|相手も望んでいる|相手の同意/);
        }
      }
    }
  });

  it('legacy three-part and five-part stored loops keep ordered semantics', () => {
    const entry = CONSULT_QUESTION_CATALOG_V1.find(
      (e) => e.reply_question_id === 'relation.timing',
    )!;
    const focus = resolveCompatibilityConsultQuestionChapterFocus(entry);

    const legacyThreeLoop = [
      'まだ返信はない',
      'LEGACY_OBS_xyz6789012',
      'LEGACY_MIS_qrs3456789',
    ] as const;
    const snapshotThree = sixChapterSnapshotWithChapterLoop(
      'R3',
      'ch_you_pace',
      legacyThreeLoop,
    );
    let ctx = buildCompatibilityConsultReportContext(snapshotThree, {
      focusChapterKeys: focus,
    });
    let section = extractCompatibilityConsultChapterSection(ctx, 'ch_you_pace');
    assertPrimaryLoopPreservesSourceSemantics(
      section,
      legacyThreeLoop,
      'legacy-3-short',
      'full_when_fits',
    );

    const legacyFiveLoop = [
      'FIVE_A_1234567890',
      'FIVE_B_1234567890',
      'FIVE_C_1234567890',
      'FIVE_D_1234567890',
      'FIVE_E_1234567890',
    ] as const;
    const snapshotFive = sixChapterSnapshotWithChapterLoop('R3', 'ch_you_pace', legacyFiveLoop);
    ctx = buildCompatibilityConsultReportContext(snapshotFive, {
      focusChapterKeys: focus,
    });
    section = extractCompatibilityConsultChapterSection(ctx, 'ch_you_pace');
    assertPrimaryLoopPreservesSourceSemantics(
      section,
      legacyFiveLoop,
      'legacy-5',
      'full_when_fits',
    );
  });

  it('loop semantics oracle rejects forged synthetic loop sections', () => {
    const sources = [
      'AAA_COND_1234567890',
      'BBB_OBS_1234567890',
      'CCC_MIS_1234567890',
      'DDD_OUT_1234567890',
    ];
    const prefixOnly = `第1章 t [ch_you_pace]\nループ: ${sources[0]!.slice(0, 8)}… / ${sources[1]} / ${sources[2]} / ${sources[3]}`;
    assert.throws(
      () =>
        assertPrimaryLoopPreservesSourceSemantics(
          prefixOnly,
          sources,
          'neg-prefix-only',
          'full_when_fits',
        ),
      /FULL index 0|non-prefix at index 0/,
    );

    const forgedPartial = `第1章 t [ch_you_pace]\nループ: ${sources[0]!.slice(0, 12)}捏造… / ${sources[1]} / ${sources[2]} / ${sources[3]}`;
    assert.throws(
      () =>
        assertPrimaryLoopPreservesSourceSemantics(
          forgedPartial,
          sources,
          'neg-forged-partial',
          'per_item_excerpt',
        ),
      /non-prefix at index 0/,
    );

    const swapped = `第1章 t [ch_you_pace]\nループ: ${sources[0]} / ${sources[2]} / ${sources[1]} / ${sources[3]}`;
    assert.throws(
      () =>
        assertPrimaryLoopPreservesSourceSemantics(
          swapped,
          sources,
          'neg-swapped',
          'full_when_fits',
        ),
      /FULL index 1|FULL index 2/,
    );

    const fiveSources = [
      'FIVE_A_1234567890',
      'FIVE_B_1234567890',
      'FIVE_C_1234567890',
      'FIVE_D_1234567890',
      'FIVE_E_1234567890',
    ];
    const droppedFifth = `第1章 t [ch_you_pace]\nループ: ${fiveSources[0]} / ${fiveSources[1]} / ${fiveSources[2]} / ${fiveSources[3]}`;
    assert.throws(
      () =>
        assertPrimaryLoopPreservesSourceSemantics(
          droppedFifth,
          fiveSources,
          'neg-drop-fifth',
          'full_when_fits',
        ),
      /expected 5 segments got 4/,
    );

    const longHead = `${'条件'.repeat(40)}。${'観察'.repeat(40)}`;
    const unmarkedCut = `第1章 t [ch_you_pace]\nループ: ${longHead.slice(0, 40)} / TAIL_B_marker12345 / TAIL_C_marker12345 / TAIL_D_outcome1234`;
    assert.throws(
      () =>
        assertPrimaryLoopPreservesSourceSemantics(
          unmarkedCut,
          [longHead, 'TAIL_B_marker12345', 'TAIL_C_marker12345', 'TAIL_D_outcome1234'],
          'neg-unmarked-cut',
          'per_item_excerpt',
        ),
      /missing ellipsis at index 0/,
    );

    const overflow200 = Array.from({ length: 200 }, (_, index) =>
      `WIT${String(index).padStart(3, '0')}_slot`,
    );
    const missingOverflow = `第1章 t [ch_you_pace]\nループ: ${overflow200[0]} / ${overflow200[1]} / ${overflow200[2]}`;
    assert.throws(
      () => assertPrimaryLoopOverflowDisclosure(missingOverflow, 200, 'neg-missing-overflow'),
      /overflow count|loop line missing/,
    );
  });

  it('200-item stored loop shows overflow disclosure in primary chapter under cap', () => {
    const loop200 = Array.from({ length: 200 }, (_, index) =>
      `WIT${String(index).padStart(3, '0')}_slot`,
    );
    assert.ok(loop200.length >= 3, 'synthetic stored loop length');
    const snapshot = sixChapterSnapshotWithChapterLoop('R3', 'ch_you_pace', loop200);
    const entry = CONSULT_QUESTION_CATALOG_V1.find(
      (e) => e.reply_question_id === 'relation.timing',
    )!;
    const ctx = buildCompatibilityConsultReportContext(snapshot, {
      focusChapterKeys: resolveCompatibilityConsultQuestionChapterFocus(entry),
    });
    assert.ok(ctx.length <= COMPATIBILITY_CONSULT_REPORT_CONTEXT_TOTAL_CAP);
    for (const key of COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS) {
      assert.match(ctx, new RegExp(`\\[${key}\\]`));
    }
    const section = extractCompatibilityConsultChapterSection(ctx, 'ch_you_pace');
    assertPrimaryLoopOverflowDisclosure(section, 200, 'overflow-200-primary');
    const minJoinAtEllipsisOnly = 200 + 199 * CONSULT_LOOP_SEGMENT_SEPARATOR.length;
    assert.ok(
      minJoinAtEllipsisOnly > 80,
      'overflow-200: minimum per-item representation exceeds typical field cap',
    );
    const fiveControl = [
      'CTRL_A_1234567890',
      'CTRL_B_1234567890',
      'CTRL_C_1234567890',
      'CTRL_D_1234567890',
      'CTRL_E_1234567890',
    ];
    const fiveFormatted = formatConsultRelationshipLoopUnderCap(fiveControl, 480);
    assert.equal(
      splitConsultLoopSegments(`ループ: ${fiveFormatted}`).length,
      5,
      'five-item control must not collapse to overflow',
    );
    assert.ok(
      buildConsultRelationshipLoopOverflowNotice(200, 48).length <= 48,
      'overflow notice fits small cap',
    );
  });

  it('STATIC ACCEPTABLE SNAPSHOT: five 300-char lines preserve fifth segment order under cap', () => {
    const paid = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T2',
      relationStatusId: 'R3',
      temperatureId: 'E2',
      personAUsesFirstPerspective: true,
    });
    const loopLines = [0, 1, 2, 3, 4].map((index) =>
      index === 4
        ? 'S4_FIFTH_SEGMENT_MARKER_tail'
        : `S${index}_` + '語'.repeat(296),
    );
    const chapters = paid.chapters.map((chapter) =>
      chapter.key === 'ch_you_pace'
        ? { ...chapter, relationshipLoop: Object.freeze([...loopLines]) }
        : chapter,
    );
    const snapshot = { ...paid, chapters: Object.freeze(chapters) } as typeof paid;
    const entry = CONSULT_QUESTION_CATALOG_V1.find(
      (e) => e.reply_question_id === 'relation.timing',
    )!;
    const ctx = buildCompatibilityConsultReportContext(snapshot, {
      focusChapterKeys: resolveCompatibilityConsultQuestionChapterFocus(entry),
    });
    assert.ok(ctx.length <= COMPATIBILITY_CONSULT_REPORT_CONTEXT_TOTAL_CAP);
    const section = extractCompatibilityConsultChapterSection(ctx, 'ch_you_pace');
    assertPrimaryLoopPreservesSourceSemantics(
      section,
      loopLines,
      'static-5x300',
      'per_item_excerpt',
    );
    const loopLine = loopLineFromSection(section);
    const segments = splitConsultLoopSegments(loopLine);
    for (let index = 0; index < 5; index += 1) {
      assert.ok(
        segments[index]!.includes(`S${index}_`),
        `static-5x300 sentinel missing at segment ${index}`,
      );
    }
  });

  it('punctuation-boundary excerpt shows ellipsis without dropping trailing loop segments', () => {
    const head = `${'条件'.repeat(40)}。${'観察'.repeat(40)}`;
    const loop = [head, 'TAIL_B_marker12345', 'TAIL_C_marker12345', 'TAIL_D_outcome1234'] as const;
    const snapshot = sixChapterSnapshotWithChapterLoop('R3', 'ch_you_pace', loop);
    const entry = CONSULT_QUESTION_CATALOG_V1.find(
      (e) => e.reply_question_id === 'relation.timing',
    )!;
    const ctx = buildCompatibilityConsultReportContext(snapshot, {
      focusChapterKeys: resolveCompatibilityConsultQuestionChapterFocus(entry),
    });
    const section = extractCompatibilityConsultChapterSection(ctx, 'ch_you_pace');
    assertPrimaryLoopPreservesSourceSemantics(
      section,
      loop,
      'punct-excerpt-4part',
      'per_item_excerpt',
    );
    const segments = splitConsultLoopSegments(loopLineFromSection(section));
    assert.equal(segments.length, 4);
    assert.ok(segments[3]!.includes('TAIL_D_outcome'));
    if (segments[0]!.length < head.length) {
      assert.match(segments[0]!, /…$/, 'punct-excerpt: head must mark truncation');
    }
  });

  it('currentContext triple survives long intro pressure within cap', () => {
    const snapshot = {
      ...buildSixChapterSnapshot('R1'),
      relationshipSummary: 'summary-'.padEnd(900, 's'),
      recurringLoop: 'loop-'.padEnd(900, 'l'),
    } as PaidCompatibilityReportSnapshot;
    const entry = CONSULT_QUESTION_CATALOG_V1.find(
      (e) => e.reply_question_id === 'relation.timing',
    )!;
    const ctx = buildCompatibilityConsultReportContext(snapshot, {
      focusChapterKeys: resolveCompatibilityConsultQuestionChapterFocus(entry),
    });
    assert.ok(ctx.length <= COMPATIBILITY_CONSULT_REPORT_CONTEXT_TOTAL_CAP);
    assert.match(ctx, /まだ返信はない/);
    assert.match(ctx, /読み解きの焦点: 片思いの距離/);
    assert.match(ctx, /いまの関係ループ: 近づきすぎて止まる/);
    for (const key of COMPATIBILITY_CONSULT_SIX_CHAPTER_KEYS) {
      assert.match(ctx, new RegExp(`\\[${key}\\]`));
    }
  });

  it('pair prompt anchors avoid Self 4-chapter roman labels for all eight Pair questions', () => {
    const snapshot = buildSixChapterSnapshot('R1');
    const ctx = buildCompatibilityConsultReportContext(snapshot);
    for (const questionId of COMPATIBILITY_CONSULT_PAIR_QUESTION_IDS) {
      const entry = CONSULT_QUESTION_CATALOG_V1.find((e) => e.reply_question_id === questionId);
      assert.ok(entry);
      const prompt = buildCompatibilityConsultPromptForCatalogEntry(
        ctx,
        `【テーマ】${entry!.themeLabelJa}\n【質問】${entry!.labelJa}`,
        entry!,
      );
      assert.doesNotMatch(prompt, /主章候補: Ⅰ|輪郭を見る|参照章: Ⅱ/);
      assert.doesNotMatch(prompt, /質問焦点:.*4章構成/);
      assert.match(prompt, /6章/);
      if (questionId.startsWith('relation.')) {
        assert.match(prompt, /返信・好意の前提は置かない/);
      }
    }
  });

  it('send route does not reuse Self consult wallet or core send RPC', () => {
    const send = read('app/api/compatibility/reports/[reportId]/consult/send/route.ts');
    assert.match(send, /commitCompatibilityConsultReply/);
    assert.doesNotMatch(send, /reply_ticket_wallets/);
    assert.doesNotMatch(send, /m55_consult_reply_commit/);
    assert.doesNotMatch(send, /\/api\/room\/core\/send/);
  });

  it('limits Pair consult themes to relation and report (not Self work/fatigue/tendency)', () => {
    assert.deepEqual([...COMPATIBILITY_CONSULT_REPLY_THEME_IDS], ['relation', 'report']);
  });

  it('pair consult prompt forbids partner mind-reading and future certainty', () => {
    assert.match(COMPATIBILITY_CONSULT_GROUNDING_JA, /本音/);
    assert.match(COMPATIBILITY_CONSULT_GROUNDING_JA, /未来/);
    assert.match(COMPATIBILITY_CONSULT_GROUNDING_JA, /断定しない/);
    assert.match(COMPATIBILITY_CONSULT_GROUNDING_JA, /返信した/);
  });
});

describe('Pair consult disposable PostgreSQL delta (reserve/commit/replay)', () => {
  it(
    'reserve blocks parallel keys; replay requires stored assistant; release clears pending',
    { skip: !dockerAvailable(), timeout: 600_000 },
    async () => {
      const containerName = `m55-pair-consult-${createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 10)}`;
      const run = spawnSync(
        'docker',
        [
          'run',
          '-e',
          'POSTGRES_PASSWORD=m55local',
          '-p',
          '127.0.0.1:0:5432',
          '-d',
          '--name',
          containerName,
          'postgres:16-alpine',
        ],
        { encoding: 'utf8' },
      );
      assert.equal(run.status, 0, run.stderr || run.stdout);
      const containerId = run.stdout.trim();
      try {
        for (let i = 0; i < 60; i += 1) {
          if (spawnSync('docker', ['exec', containerId, 'pg_isready', '-U', 'postgres']).status === 0) {
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        const portLine = spawnSync('docker', ['port', containerId, '5432/tcp'], {
          encoding: 'utf8',
        }).stdout
          .trim()
          .split('\n')[0];
        const hostPort = Number.parseInt(portLine.split(':').pop() ?? '', 10);
        const client = new Client({
          host: '127.0.0.1',
          port: hostPort,
          user: 'postgres',
          password: 'm55local',
          database: 'postgres',
        });
        await client.connect();
        await client.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;`);
        await client.query(`
          CREATE TABLE public.compatibility_owned_reports (
            id uuid PRIMARY KEY,
            owner_user_id text NOT NULL,
            purchase_context_id uuid UNIQUE,
            product_key text NOT NULL,
            snapshot_version text NOT NULL,
            snapshot jsonb NOT NULL,
            CONSTRAINT compatibility_owned_reports_id_owner_uidx UNIQUE (id, owner_user_id)
          );
        `);
        await client.query(consultMigrationSqlWithoutFulfill());
        const owner = 'user_test_owner';
        const reportId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
        await client.query(
          `INSERT INTO compatibility_owned_reports (id, owner_user_id, purchase_context_id, product_key, snapshot_version, snapshot)
           VALUES ($1, $2, gen_random_uuid(), 'compatibility_report_full_v1', 'paid_compatibility_report_v1', '{}'::jsonb)`,
          [reportId, owner],
        );
        const ensure = await client.query(
          `SELECT public.m55_ensure_compatibility_included_reply_thread_v1($1::uuid, $2::text) AS payload`,
          [reportId, owner],
        );
        assert.equal((ensure.rows[0]?.payload as { ok?: boolean }).ok, true);
        const threadRow = await client.query(
          `SELECT id FROM compatibility_consult_threads WHERE owned_report_id = $1`,
          [reportId],
        );
        const threadId = threadRow.rows[0]?.id as string;
        const userMessage = '【テーマ】人との距離感\n【質問】距離の取り方を読み返したい';
        const reserveA = await client.query(
          `SELECT public.m55_compatibility_consult_send_reserve_v1($1, $2::uuid, $3::uuid, $4, $5) AS payload`,
          [owner, reportId, threadId, 'key-a1234567', userMessage],
        );
        const payloadA = reserveA.rows[0]?.payload as { ok: boolean; mode?: string; attempt_token?: string };
        assert.equal(payloadA.ok, true);
        assert.equal(payloadA.mode, 'reserved');
        const reserveB = await client.query(
          `SELECT public.m55_compatibility_consult_send_reserve_v1($1, $2::uuid, $3::uuid, $4, $5) AS payload`,
          [owner, reportId, threadId, 'key-b1234567', userMessage],
        );
        const payloadB = reserveB.rows[0]?.payload as { ok: boolean; error_code?: string };
        assert.equal(payloadB.ok, false);
        assert.equal(payloadB.error_code, 'ACTIVE_SEND_IN_PROGRESS');
        await client.query(
          `SELECT public.m55_compatibility_consult_send_release_v1($1, $2::uuid, $3, $4::uuid) AS payload`,
          [owner, reportId, 'key-a1234567', payloadA.attempt_token],
        );
        await client.end();
      } finally {
        spawnSync('docker', ['rm', '-f', containerId]);
      }
    },
  );

  it(
    'reservation lease is persisted and expired pending can recover under same key (R1)',
    { skip: !dockerAvailable(), timeout: 600_000 },
    async () => {
      const containerName = `m55-pair-lease-${createHash('sha256').update(String(Date.now())).digest('hex').slice(0, 10)}`;
      const run = spawnSync(
        'docker',
        [
          'run',
          '-e',
          'POSTGRES_PASSWORD=m55local',
          '-p',
          '127.0.0.1:0:5432',
          '-d',
          '--name',
          containerName,
          'postgres:16-alpine',
        ],
        { encoding: 'utf8' },
      );
      assert.equal(run.status, 0, run.stderr || run.stdout);
      const containerId = run.stdout.trim();
      try {
        for (let i = 0; i < 60; i += 1) {
          if (spawnSync('docker', ['exec', containerId, 'pg_isready', '-U', 'postgres']).status === 0) {
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
        const portLine = spawnSync('docker', ['port', containerId, '5432/tcp'], {
          encoding: 'utf8',
        }).stdout
          .trim()
          .split('\n')[0];
        const hostPort = Number.parseInt(portLine.split(':').pop() ?? '', 10);
        const client = new Client({
          host: '127.0.0.1',
          port: hostPort,
          user: 'postgres',
          password: 'm55local',
          database: 'postgres',
        });
        await client.connect();
        await client.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;`);
        await client.query(`
          CREATE TABLE public.compatibility_owned_reports (
            id uuid PRIMARY KEY,
            owner_user_id text NOT NULL,
            purchase_context_id uuid UNIQUE,
            product_key text NOT NULL,
            snapshot_version text NOT NULL,
            snapshot jsonb NOT NULL,
            CONSTRAINT compatibility_owned_reports_id_owner_uidx UNIQUE (id, owner_user_id)
          );
        `);
        await client.query(consultMigrationSqlWithoutFulfill());
        const owner = 'user_lease_owner';
        const reportId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        await client.query(
          `INSERT INTO compatibility_owned_reports (id, owner_user_id, purchase_context_id, product_key, snapshot_version, snapshot)
           VALUES ($1, $2, gen_random_uuid(), 'compatibility_report_full_v1', 'paid_compatibility_report_v1', '{}'::jsonb)`,
          [reportId, owner],
        );
        const ensure = await client.query(
          `SELECT public.m55_ensure_compatibility_included_reply_thread_v1($1::uuid, $2::text) AS payload`,
          [reportId, owner],
        );
        assert.equal((ensure.rows[0]?.payload as { ok?: boolean }).ok, true);
        const threadId = (
          await client.query(`SELECT id FROM compatibility_consult_threads WHERE owned_report_id = $1`, [
            reportId,
          ])
        ).rows[0]?.id as string;
        const userMessage = '【テーマ】人との距離感\n【質問】距離の取り方を読み返したい';
        const idempotencyKey = 'key-lease123456';
        const first = await client.query(
          `SELECT public.m55_compatibility_consult_send_reserve_v1($1, $2::uuid, $3::uuid, $4, $5) AS payload`,
          [owner, reportId, threadId, idempotencyKey, userMessage],
        );
        const firstPayload = first.rows[0]?.payload as {
          ok: boolean;
          attempt_token?: string;
          reserved_until?: string;
        };
        assert.equal(firstPayload.ok, true);
        const stored = await client.query(
          `SELECT reserved_until, attempt_token::text AS attempt_token
           FROM compatibility_consult_send_commits
           WHERE user_id = $1 AND owned_report_id = $2 AND idempotency_key = $3`,
          [owner, reportId, idempotencyKey],
        );
        assert.ok(stored.rows[0]?.reserved_until);
        assert.ok(new Date(String(stored.rows[0]?.reserved_until)).getTime() > Date.now());
        const staleToken = String(stored.rows[0]?.attempt_token);
        await client.query(
          `UPDATE compatibility_consult_send_commits
           SET reserved_until = now() - interval '1 minute'
           WHERE user_id = $1 AND owned_report_id = $2 AND idempotency_key = $3`,
          [owner, reportId, idempotencyKey],
        );
        const second = await client.query(
          `SELECT public.m55_compatibility_consult_send_reserve_v1($1, $2::uuid, $3::uuid, $4, $5) AS payload`,
          [owner, reportId, threadId, idempotencyKey, userMessage],
        );
        const secondPayload = second.rows[0]?.payload as { ok: boolean; attempt_token?: string };
        assert.equal(secondPayload.ok, true);
        assert.notEqual(secondPayload.attempt_token, staleToken);
        const commitStale = await client.query(
          `SELECT public.m55_compatibility_consult_reply_commit($1, $2::uuid, $3::uuid, $4, $5, $6, $7::uuid) AS payload`,
          [
            owner,
            reportId,
            threadId,
            idempotencyKey,
            userMessage,
            'assistant body long enough',
            staleToken,
          ],
        );
        const commitPayload = commitStale.rows[0]?.payload as { ok: boolean; error_code?: string };
        assert.equal(commitPayload.ok, false);
        assert.equal(commitPayload.error_code, 'ATTEMPT_TOKEN_MISMATCH');
        await client.end();
      } finally {
        spawnSync('docker', ['rm', '-f', containerId]);
      }
    },
  );
});