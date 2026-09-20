import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { M55_METHOD_CANONICAL_COPY } from './method/m55MethodAuthority';
import { PAID_DTR_CHAPTERS } from './paidDtrProductCopy';
import { PAID_CHAPTER_EMPHASIS_EXPLANATION_V1 } from './paidResult/paidChapterEmphasisCopyV1';
import type { PaidChapterEmphasisIdV1 } from './individualization/individualizationSelectorTypesV1';
import {
  SELF_PREMIUM_SAMPLE_DISCLAIMER_JA,
  SELF_PREMIUM_SAMPLE_EMPHASIS_ANSWER_IDS,
  SELF_PREMIUM_SAMPLE_EMPHASIS_CATALOG_IDS,
  SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE,
  SELF_PREMIUM_SAMPLE_PREVIEW_ID,
} from './selfPremiumSamplePreviewFixture';

const ROOT = process.cwd();

function readRepo(rel: string): string {
  const abs = join(ROOT, rel);
  assert.ok(existsSync(abs), `missing: ${rel}`);
  return readFileSync(abs, 'utf8');
}

const EXPECTED_EMPHASIS_PASSAGE_WIRING: readonly {
  chapterId: 'structure' | 'strain' | 'ease';
  role: string;
  catalogId: PaidChapterEmphasisIdV1;
}[] = [
  { chapterId: 'structure', role: 'why', catalogId: 'paid_ch2__work_focus_priority' },
  { chapterId: 'structure', role: 'structure', catalogId: 'paid_ch2__decision_friction_too_many' },
  { chapterId: 'strain', role: 'condition', catalogId: 'paid_ch3__relation_focus_words' },
  { chapterId: 'ease', role: 'consequence', catalogId: 'paid_ch4__fatigue_signal_after_push' },
  { chapterId: 'ease', role: 'handling', catalogId: 'paid_ch4__recovery_sequence_pause_first' },
  { chapterId: 'ease', role: 'next', catalogId: 'paid_ch4__restart_condition_overview_first' },
];

const VISITOR_SOURCE_PATTERNS = [
  /\bnickname\b/,
  /\bbirthDate\b/,
  /\bpremiumAnswers\b/,
  /\bfreeAnswers\b/,
  /\buserId\b/,
] as const;

function collectKeys(value: unknown, keys: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    keys.add(key);
    collectKeys(nested, keys);
  }
}

describe('self premium sample preview fixture', () => {
  it('freezes the exact sample id', () => {
    assert.equal(SELF_PREMIUM_SAMPLE_PREVIEW_ID, 'self.premium.sample.preview.illustrative_q1_align_work_v1');
    assert.equal(SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE.sampleId, SELF_PREMIUM_SAMPLE_PREVIEW_ID);
  });

  it('freezes the six representative emphasis answer IDs', () => {
    assert.deepEqual([...SELF_PREMIUM_SAMPLE_EMPHASIS_ANSWER_IDS], [
      'paid.work_focus.priority',
      'paid.decision_friction.too_many',
      'paid.relation_focus.words',
      'paid.fatigue_signal.after_push',
      'paid.recovery_sequence.pause_first',
      'paid.restart_condition.overview_first',
    ]);
    assert.deepEqual(
      [...SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE.emphasisAnswerIds],
      [...SELF_PREMIUM_SAMPLE_EMPHASIS_ANSWER_IDS],
    );
    assert.deepEqual(
      [...SELF_PREMIUM_SAMPLE_EMPHASIS_CATALOG_IDS],
      EXPECTED_EMPHASIS_PASSAGE_WIRING.map((entry) => entry.catalogId),
    );
  });

  it('wires the six emphasis catalog IDs into visible sample passages', () => {
    const chapters = SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE.chapters;
    const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));

    for (const expected of EXPECTED_EMPHASIS_PASSAGE_WIRING) {
      const chapter = chapterById.get(expected.chapterId);
      assert.ok(chapter, `missing chapter ${expected.chapterId}`);
      const expectedText = PAID_CHAPTER_EMPHASIS_EXPLANATION_V1[expected.catalogId];
      assert.ok(expectedText?.trim(), `missing catalog explanation: ${expected.catalogId}`);
      const passage = chapter!.passagesJa.find(
        (item) => item.role === expected.role && item.textJa === expectedText,
      );
      assert.ok(
        passage,
        `passage missing for ${expected.chapterId}/${expected.role} -> ${expected.catalogId}`,
      );
    }

    for (const catalogId of SELF_PREMIUM_SAMPLE_EMPHASIS_CATALOG_IDS) {
      const expected = EXPECTED_EMPHASIS_PASSAGE_WIRING.find((entry) => entry.catalogId === catalogId);
      assert.ok(expected, `missing wiring expectation for ${catalogId}`);
      const chapter = chapterById.get(expected!.chapterId)!;
      const expectedText = PAID_CHAPTER_EMPHASIS_EXPLANATION_V1[catalogId]!;
      const wired = chapter.passagesJa.some(
        (passage) => passage.role === expected!.role && passage.textJa === expectedText,
      );
      assert.equal(wired, true, `catalog id not wired into visible passages: ${catalogId}`);
    }
  });

  it('keeps four chapter labels and order from product authority', () => {
    const chapters = SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE.chapters;
    assert.equal(chapters.length, 4);
    assert.deepEqual(
      chapters.map((ch) => `${ch.roman} ${ch.titleJa}`),
      PAID_DTR_CHAPTERS.map((ch) => `${ch.roman} ${ch.title}`),
    );
    assert.deepEqual(
      chapters.map((ch) => ch.titleJa),
      ['輪郭を見る', '構造を読む', '無理を知る', '楽に扱う'],
    );
  });

  it('includes the illustrative-sample disclaimer', () => {
    assert.equal(
      SELF_PREMIUM_SAMPLE_DISCLAIMER_JA,
      'これは購入後のプレミアムレポートの読み方の例です。あなたの回答から作られたものではありません。',
    );
    assert.equal(SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE.disclaimerJa, SELF_PREMIUM_SAMPLE_DISCLAIMER_JA);
    assert.equal(SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE.labelJa, '見本');
  });

  it('contains no visitor field keys', () => {
    const keys = new Set<string>();
    collectKeys(SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE, keys);
    for (const forbidden of [
      'nickname',
      'birthDate',
      'answers',
      'premiumAnswers',
      'freeAnswers',
      'userId',
    ]) {
      assert.equal(keys.has(forbidden), false, `visitor key leaked: ${forbidden}`);
    }
  });

  it('does not expose engine-generated body input or visitor-specific source dependencies', () => {
    const keys = new Set<string>();
    collectKeys(SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE, keys);
    for (const forbidden of [
      'seedBodies',
      'generatedChapterBodies',
      'chapterBodies',
      'fullSections',
      'payload',
      'purchaseInput',
      'stemLaneIndex',
    ]) {
      assert.equal(keys.has(forbidden), false, `engine input leaked: ${forbidden}`);
    }

    const fixtureSrc = readRepo('lib/m55/selfPremiumSamplePreviewFixture.ts');
    const componentSrc = readRepo('components/dtr/SelfPremiumSamplePreview.tsx');
    for (const src of [fixtureSrc, componentSrc]) {
      assert.doesNotMatch(src, /buildPaidSavedReportChapterBodiesV1/);
      assert.doesNotMatch(src, /paidEditorialDepthQ1/);
      for (const pattern of VISITOR_SOURCE_PATTERNS) {
        assert.doesNotMatch(src, pattern, `visitor-specific source dependency: ${pattern}`);
      }
    }
  });

  it('keeps L3 wording as emphasis/focus, not whole identity', () => {
    const l3 = SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE.layer3Ja;
    assert.equal(l3, M55_METHOD_CANONICAL_COPY.premiumDifferencePremiumJa);
    assert.match(l3, /重点的に読むところ/);
    assert.doesNotMatch(l3, /性格を決める|本当の自分|診断/);
    assert.match(SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE.layer2Ja, /深く読むところを合わせます/);
  });

  it('does not introduce prohibited claim terms', () => {
    const blob = `${JSON.stringify(SELF_PREMIUM_SAMPLE_PREVIEW_FIXTURE)}\n${readRepo(
      'components/dtr/SelfPremiumSamplePreview.tsx',
    )}`;
    for (const term of ['診断', '運命', '科学的', '高精度', '本当の自分']) {
      assert.equal(blob.includes(term), false, `prohibited term: ${term}`);
    }
  });

  it('mounts once after the visitor context strip and before Q1', () => {
    const layer = readRepo('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    const strip = layer.indexOf('<DtrPaidResultContextStrip />');
    const sample = layer.indexOf('<SelfPremiumSamplePreview />');
    const progress = layer.indexOf('className={styles.progressRow}');
    assert.ok(strip >= 0, 'context strip missing');
    assert.ok(sample >= 0, 'sample mount missing');
    assert.equal((layer.match(/<SelfPremiumSamplePreview \/>/g) ?? []).length, 1);
    assert.ok(strip < sample, 'sample must follow context strip');
    assert.ok(sample < progress, 'sample must precede Q1 progress');
  });

  it('guards the sample mount with index === 0 && !isEditingFromReview', () => {
    const layer = readRepo('components/dtr/DtrPaidQuestionnaireLayer.tsx');
    const guardedMount =
      /index === 0 && !isEditingFromReview \? <SelfPremiumSamplePreview \/> : null/;
    assert.match(layer, guardedMount, 'sample mount must be guarded for Q1 only');
    assert.doesNotMatch(
      layer,
      /<SelfPremiumSamplePreview \/>[\s\S]*index === 0 && !isEditingFromReview/,
      'sample must not appear before its guard condition',
    );
    assert.doesNotMatch(layer, /\? <SelfPremiumSamplePreview \/> : null[\s\S]*\? <SelfPremiumSamplePreview \/> : null/);
  });
});
