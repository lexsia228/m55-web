/**
 * Tests for M55 Generation Quality Analytics — Privacy-Safe Event Builder
 *
 * Gate: CATEGORY-2-M55-GENERATION-QUALITY-ANALYTICS-LEDGER-IMPLEMENTATION-REV1
 *
 * Test scope:
 *   1. Analytics event builder does not accept raw body fields (type-level + runtime)
 *   2. Migration SQL does not contain forbidden columns
 *   3. Consult reply mutation code not touched
 *   4. Consult reply integration not added in this gate
 *   5. violation_match / reject_reason_codes use fixed catalog keys, not free text
 *   6. Naturalness Guardrail metrics can be converted to counts
 *   7. paid_dtr_chapter_body event can be created without raw text
 *   8. dob_v2_visible_copy event can be created without raw text
 *   9. paid_dtr_snapshot event can be created without raw text
 *  10. Migration SQL has RLS and service_role grants
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  extractNaturalnessMetrics,
  extractTextMetrics,
  extractJudgeReasonCodes,
  buildPaidDtrChapterBodyEvent,
  buildDobV2VisibleCopyEvent,
  buildPaidDtrSnapshotEvent,
  emitGenerationQualityEvent,
  type GenerationQualityEvent,
} from './generationQualityAnalytics.ts';
import { checkNaturalness } from './dtrVisibleCopyNaturalness.ts';
import type { ChapterBodyJudgeResult } from './dtrPaidChapterBodyJudge.ts';

// ── Fixtures ──────────────────────────────────────────────────────────────

const CLEAN_BODY = '向きが決まるほど力を出しやすくなります。日々のどこかに短い区切りを置くと、動き出しがスムーズになります。';
const FORBIDDEN_BODY = '感受の解像度が高く、観測所型の思考をしています。読み取りです。';

const FAKE_JUDGE_PASS: ChapterBodyJudgeResult = {
  verdict: 'PASS',
  sections: [
    { sectionId: 's1_identity', verdict: 'PASS', failedChecks: [] },
  ],
};

const FAKE_JUDGE_FAIL: ChapterBodyJudgeResult = {
  verdict: 'FAIL',
  sections: [
    {
      sectionId: 's1_identity',
      verdict: 'FAIL',
      failedChecks: [
        { check: 'forbidden_internal_labels', severity: 'major' },
        { check: 'dob_material_unreflected', severity: 'major' },
      ],
    },
  ],
};

// ── Helper ────────────────────────────────────────────────────────────────

function hasNoForbiddenFields(event: GenerationQualityEvent): boolean {
  const forbidden = [
    'raw_body', 'raw_user_message', 'raw_consult_reply', 'raw_paid_report_body',
    'excerpt', 'text_fragment', 'sentence_sample', 'debug_sample',
    'raw_payload', 'prompt_raw', 'response_raw',
    'user_id', 'scoped_anon_user_id', 'dob_date',
    'stripe_customer_id', 'stripe_session_id', 'payment_session_id', 'clerk_user_id',
  ];
  return forbidden.every(f => !(f in event));
}

// ── Migration SQL path ────────────────────────────────────────────────────

const MIGRATION_PATH = join(
  new URL('.', import.meta.url).pathname,
  '../../supabase/migrations/20260628000000_m55_generation_quality_analytics_ledger_v1.sql',
);

function loadMigration(): string {
  return readFileSync(MIGRATION_PATH, 'utf-8');
}

// ── 1. Type boundary: GenerationQualityEvent has no raw text fields ───────

describe('privacy boundary: event type has no raw text fields', () => {
  it('event built from clean body has no forbidden fields', () => {
    const event = buildPaidDtrChapterBodyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      FAKE_JUDGE_PASS,
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.ok(hasNoForbiddenFields(event), 'event must not contain forbidden fields');
  });

  it('does not include raw_body in the event object', () => {
    const event = buildPaidDtrChapterBodyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      FAKE_JUDGE_PASS,
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.ok(!('raw_body' in event), 'raw_body must not be present');
  });

  it('does not include raw_user_message in the event object', () => {
    const event = buildPaidDtrChapterBodyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      FAKE_JUDGE_PASS,
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.ok(!('raw_user_message' in event), 'raw_user_message must not be present');
  });

  it('does not include user_id or scoped_anon_user_id', () => {
    const event = buildPaidDtrChapterBodyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      FAKE_JUDGE_PASS,
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.ok(!('user_id' in event));
    assert.ok(!('scoped_anon_user_id' in event));
  });

  it('does not include dob_date', () => {
    const event = buildPaidDtrChapterBodyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      FAKE_JUDGE_PASS,
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.ok(!('dob_date' in event));
  });

  it('does not include payment/Stripe/Clerk identifiers', () => {
    const event = buildPaidDtrChapterBodyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      FAKE_JUDGE_PASS,
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.ok(!('stripe_customer_id' in event));
    assert.ok(!('stripe_session_id' in event));
    assert.ok(!('clerk_user_id' in event));
    assert.ok(!('payment_session_id' in event));
  });
});

// ── 2. Migration SQL forbidden columns check ──────────────────────────────

describe('migration SQL: no forbidden columns', () => {
  const FORBIDDEN_COLUMN_PATTERNS = [
    /\braw_body\b/i,
    /\braw_user_message\b/i,
    /\braw_consult_reply\b/i,
    /\braw_paid_report_body\b/i,
    /\bexcerpt\b/i,
    /\btext_fragment\b/i,
    /\bsentence_sample\b/i,
    /\bdebug_sample\b/i,
    /\braw_payload\b/i,
    /\bprompt_raw\b/i,
    /\bresponse_raw\b/i,
    /\bscoped_anon_user_id\b/i,
    /\buser_id\b(?!\s*--)/i,
    /\bdob_date\b/i,
    /\bstripe_customer_id\b/i,
    /\bstripe_session_id\b/i,
    /\bpayment_session_id\b/i,
    /\bclerk_user_id\b/i,
  ];

  const sql = loadMigration();

  // Strip comments for actual column check
  const sqlWithoutComments = sql.replace(/--.*$/gm, '');

  for (const pattern of FORBIDDEN_COLUMN_PATTERNS) {
    it(`migration SQL does not contain column matching: ${pattern.source}`, () => {
      assert.ok(
        !pattern.test(sqlWithoutComments),
        `Migration SQL contains forbidden pattern: ${pattern.source}`,
      );
    });
  }
});

describe('migration SQL: RLS and access control', () => {
  const sql = loadMigration();

  it('migration enables RLS on m55_generation_quality_events', () => {
    assert.ok(
      sql.includes('m55_generation_quality_events ENABLE ROW LEVEL SECURITY'),
      'RLS must be enabled on m55_generation_quality_events',
    );
  });

  it('migration enables RLS on m55_generation_quality_daily_rollups', () => {
    assert.ok(
      sql.includes('m55_generation_quality_daily_rollups ENABLE ROW LEVEL SECURITY'),
    );
  });

  it('migration enables RLS on m55_guardrail_violation_catalog', () => {
    assert.ok(
      sql.includes('m55_guardrail_violation_catalog ENABLE ROW LEVEL SECURITY'),
    );
  });

  it('migration enables RLS on m55_prompt_version_quality_rollups', () => {
    assert.ok(
      sql.includes('m55_prompt_version_quality_rollups ENABLE ROW LEVEL SECURITY'),
    );
  });

  it('migration revokes access from anon and authenticated roles', () => {
    assert.ok(
      sql.includes('REVOKE ALL ON') && sql.includes('FROM anon, authenticated'),
      'migration must REVOKE ALL from anon and authenticated roles',
    );
  });

  it('migration does not GRANT to anon or authenticated', () => {
    const grantLines = sql
      .split('\n')
      .filter(line => /GRANT/i.test(line) && !line.trim().startsWith('--'));
    const badGrants = grantLines.filter(
      line => /\banon\b/i.test(line) || /\bauthenticated\b/i.test(line),
    );
    assert.equal(badGrants.length, 0, `Bad grants found: ${badGrants.join('\n')}`);
  });
});

// ── 3. Consult reply: not touched ─────────────────────────────────────────

describe('consult reply hard boundary: no mutation in this gate', () => {
  it('generationQualityAnalytics.ts does not import from reply/ modules', () => {
    const src = readFileSync(
      join(new URL('.', import.meta.url).pathname, 'generationQualityAnalytics.ts'),
      'utf-8',
    );
    assert.ok(
      !src.includes("from './reply/"),
      'analytics module must not import from reply/ modules',
    );
  });

  it('generationQualityAnalytics.ts has no raw_consult_reply as a real field (only as comment)', () => {
    const src = readFileSync(
      join(new URL('.', import.meta.url).pathname, 'generationQualityAnalytics.ts'),
      'utf-8',
    );
    // Strip comment lines (// ...) before checking; the word appears only in prohibition comments
    const srcWithoutComments = src.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    assert.ok(
      !srcWithoutComments.includes('raw_consult_reply'),
      'raw_consult_reply must not appear as a real field (only allowed in comments)',
    );
  });

  it('generationQualityAnalytics.ts has no consult reply body field in event type', () => {
    const src = readFileSync(
      join(new URL('.', import.meta.url).pathname, 'generationQualityAnalytics.ts'),
      'utf-8',
    );
    assert.ok(!src.includes('consult_body'));
    assert.ok(!src.includes('reply_body'));
    assert.ok(!src.includes('assistant_message'));
  });

  it('GenerationQualityEvent type has no raw consult reply field at runtime', () => {
    const event = buildDobV2VisibleCopyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.ok(!('raw_consult_reply' in event));
    assert.ok(!('consult_body' in event));
    assert.ok(!('assistant_message' in event));
  });
});

// ── 4. violation_match / reject_reason_codes use catalog keys only ─────────

describe('violation_match / reject_reason_codes: catalog keys only', () => {
  it('extractNaturalnessMetrics returns rule names (catalog keys), not body text', () => {
    const result = checkNaturalness(FORBIDDEN_BODY);
    const metrics = extractNaturalnessMetrics(result);
    for (const code of metrics.reject_reason_codes) {
      // Rule names must be from the fixed catalog — no Japanese text
      assert.ok(
        /^[a-z_]+$/.test(code),
        `reject_reason_code "${code}" must be a snake_case catalog key, not free text`,
      );
    }
  });

  it('extractJudgeReasonCodes returns ChapterBodyCheckId enum values only', () => {
    const codes = extractJudgeReasonCodes(FAKE_JUDGE_FAIL);
    assert.deepEqual(codes.sort(), ['dob_material_unreflected', 'forbidden_internal_labels'].sort());
    for (const code of codes) {
      assert.ok(
        /^[a-z_]+$/.test(code),
        `reason code "${code}" must be snake_case enum value`,
      );
    }
  });

  it('reject_reason_codes in chapter body event are enum values, not body text', () => {
    const event = buildPaidDtrChapterBodyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      FAKE_JUDGE_FAIL,
      { provider_id: 'fake_deterministic', final_status: 'rejected' },
    );
    for (const code of event.reject_reason_codes ?? []) {
      assert.ok(
        /^[a-z_]+$/.test(code),
        `code "${code}" must be snake_case only`,
      );
    }
  });
});

// ── 5. Naturalness Guardrail metrics → counts ─────────────────────────────

describe('extractNaturalnessMetrics: counts from guardrail result', () => {
  it('clean text: naturalness_pass = true, all hit counts = 0', () => {
    const result = checkNaturalness(CLEAN_BODY);
    const metrics = extractNaturalnessMetrics(result);
    assert.equal(metrics.naturalness_pass, true);
    assert.equal(metrics.forbidden_term_hits, 0);
    assert.equal(metrics.mechanical_phrase_hits, 0);
    assert.equal(metrics.cold_evaluation_phrase_hits, 0);
    assert.equal(metrics.system_framing_hits, 0);
    assert.equal(metrics.duplicate_sentence_count, 0);
    assert.deepEqual(metrics.reject_reason_codes, []);
  });

  it('forbidden body: naturalness_pass = false, hits > 0', () => {
    const result = checkNaturalness(FORBIDDEN_BODY);
    const metrics = extractNaturalnessMetrics(result);
    assert.equal(metrics.naturalness_pass, false);
    assert.ok(
      metrics.forbidden_term_hits + metrics.mechanical_phrase_hits > 0,
      'at least one hit category must be > 0',
    );
    assert.ok(metrics.reject_reason_codes.length > 0);
  });

  it('metrics object has no raw text from the input body', () => {
    const result = checkNaturalness(FORBIDDEN_BODY);
    const metrics = extractNaturalnessMetrics(result);
    const serialized = JSON.stringify(metrics);
    assert.ok(
      !serialized.includes('感受の解像度'),
      'serialized metrics must not contain body text fragments',
    );
  });
});

describe('extractTextMetrics: length counts only', () => {
  it('returns numeric counts, not the text itself', () => {
    const m = extractTextMetrics(CLEAN_BODY);
    assert.ok(typeof m.output_length === 'number');
    assert.ok(typeof m.sentence_count === 'number');
    assert.ok(typeof m.avg_sentence_length === 'number');
    assert.ok(typeof m.long_sentence_count === 'number');
  });

  it('metrics object does not contain the body text', () => {
    const m = extractTextMetrics(CLEAN_BODY);
    const serialized = JSON.stringify(m);
    assert.ok(!serialized.includes('向きが決まるほど'), 'body text must not appear in metrics');
  });
});

// ── 6. paid_dtr_chapter_body event: no raw text ───────────────────────────

describe('buildPaidDtrChapterBodyEvent: no raw text', () => {
  it('event does not contain body text', () => {
    const event = buildPaidDtrChapterBodyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      FAKE_JUDGE_PASS,
      {
        provider_id: 'fake_deterministic',
        stem_lane_index: 0,
        chapter_id: 's1_identity',
        dob_v2_flags: { season_group: 'winter', lunar_phase_bucket: 'early', birth_time_unknown: false },
        final_status: 'accepted',
      },
    );
    const serialized = JSON.stringify(event);
    assert.ok(
      !serialized.includes('向きが決まるほど'),
      'event JSON must not contain body text',
    );
  });

  it('event generation_kind is paid_dtr_chapter_body', () => {
    const event = buildPaidDtrChapterBodyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      FAKE_JUDGE_PASS,
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.equal(event.generation_kind, 'paid_dtr_chapter_body');
  });

  it('event naturalness metrics are counts, not text', () => {
    const event = buildPaidDtrChapterBodyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      FAKE_JUDGE_PASS,
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.ok(event.naturalness);
    assert.equal(typeof event.naturalness.forbidden_term_hits, 'number');
    assert.equal(typeof event.naturalness.naturalness_pass, 'boolean');
  });
});

// ── 7. dob_v2_visible_copy event: no raw text ────────────────────────────

describe('buildDobV2VisibleCopyEvent: no raw text', () => {
  const DOB_BODY = '【この保存版だけの本質リズム】\n向きが決まるほど力を出しやすくなります。\n';

  it('event does not contain body text', () => {
    const event = buildDobV2VisibleCopyEvent(
      DOB_BODY,
      checkNaturalness(DOB_BODY),
      { provider_id: 'fake_deterministic', chapter_id: 's3_essence', final_status: 'accepted' },
    );
    const serialized = JSON.stringify(event);
    assert.ok(
      !serialized.includes('向きが決まるほど'),
      'event JSON must not contain body text',
    );
  });

  it('event generation_kind is dob_v2_visible_copy', () => {
    const event = buildDobV2VisibleCopyEvent(
      DOB_BODY,
      checkNaturalness(DOB_BODY),
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.equal(event.generation_kind, 'dob_v2_visible_copy');
  });

  it('event has no user_id or DOB date', () => {
    const event = buildDobV2VisibleCopyEvent(
      DOB_BODY,
      checkNaturalness(DOB_BODY),
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.ok(!('user_id' in event));
    assert.ok(!('dob_date' in event));
  });
});

// ── 8. paid_dtr_snapshot event: no raw text ───────────────────────────────

describe('buildPaidDtrSnapshotEvent: no raw text', () => {
  const SNAPSHOT_BODY = '{"sections": "example envelope json content"}';

  it('event does not contain snapshot body text', () => {
    const event = buildPaidDtrSnapshotEvent(
      SNAPSHOT_BODY,
      checkNaturalness(SNAPSHOT_BODY),
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    const serialized = JSON.stringify(event);
    assert.ok(
      !serialized.includes('example envelope json content'),
      'event JSON must not contain snapshot body text',
    );
  });

  it('event generation_kind is paid_dtr_snapshot', () => {
    const event = buildPaidDtrSnapshotEvent(
      SNAPSHOT_BODY,
      checkNaturalness(SNAPSHOT_BODY),
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.equal(event.generation_kind, 'paid_dtr_snapshot');
  });

  it('event has no raw_paid_report_body field', () => {
    const event = buildPaidDtrSnapshotEvent(
      SNAPSHOT_BODY,
      checkNaturalness(SNAPSHOT_BODY),
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.ok(!('raw_paid_report_body' in event));
  });
});

// ── 9. emitGenerationQualityEvent: fire-and-forget, does not throw ────────

describe('emitGenerationQualityEvent: safe emit', () => {
  it('emit does not throw for a valid accepted event', () => {
    const event = buildPaidDtrChapterBodyEvent(
      CLEAN_BODY,
      checkNaturalness(CLEAN_BODY),
      FAKE_JUDGE_PASS,
      { provider_id: 'fake_deterministic', final_status: 'accepted' },
    );
    assert.doesNotThrow(() => emitGenerationQualityEvent(event));
  });

  it('emit does not throw for a failed_guardrail event', () => {
    const event = buildPaidDtrChapterBodyEvent(
      FORBIDDEN_BODY,
      checkNaturalness(FORBIDDEN_BODY),
      FAKE_JUDGE_FAIL,
      { provider_id: 'fake_deterministic', final_status: 'failed_guardrail' },
    );
    assert.doesNotThrow(() => emitGenerationQualityEvent(event));
  });
});

// ── 10. Source inspection: no consult reply mutation in new files ──────────

describe('source inspection: consult reply hard boundary', () => {
  const analyticsSource = readFileSync(
    join(new URL('.', import.meta.url).pathname, 'generationQualityAnalytics.ts'),
    'utf-8',
  );

  it('analytics module does not contain rewrite/repair/regeneration/backfill for consult reply', () => {
    assert.ok(!analyticsSource.includes('replyGenerateRequest'));
    assert.ok(!analyticsSource.includes('m55_consult_reply_commit'));
    assert.ok(!analyticsSource.includes('stubReplyGenerator'));
    assert.ok(!analyticsSource.includes('replyTicketFulfillmentRpc'));
  });

  it('analytics module does not GRANT access to consult reply body', () => {
    assert.ok(!analyticsSource.includes('assistant_message'));
    assert.ok(!analyticsSource.includes('p_assistant_message'));
    assert.ok(!analyticsSource.includes('reply_document'));
  });

  it('migration SQL does not modify consult reply tables', () => {
    const sql = loadMigration();
    assert.ok(!sql.includes('m55_consult_reply'));
    assert.ok(!sql.includes('consult_thread'));
    assert.ok(!sql.includes('p_assistant_message'));
  });
});
