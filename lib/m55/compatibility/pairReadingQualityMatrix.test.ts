/**
 * Pair reading quality matrix — CI core.
 * Dry-run only: no POST, ticket, AI, DB, RPC, fetch.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  CHAPTER_IDS,
  CH_ABOUT_DISCLAIMER,
  PAIR_AXIS_IDS,
  PAIR_READING_CTA,
  PAID_TOPIC_IDS,
  PRODUCT_INTERNAL_NAME,
  PRODUCT_PUBLIC_NAME,
  RELATION_STATUS_IDS,
  SAFETY_PROFILE,
  TEMPERATURE_IDS,
  getTopicLabel,
} from './pairReadingCatalog.v1';
import {
  DOB_PAIR_ARCHETYPES,
  INVALID_DOB_FIXTURES,
  SAMPLE_LANES,
  buildPairReadingInput,
  buildSampleCase,
} from './pairReadingQualityMatrix.fixtures';
import { renderPairReading } from './pairReadingRenderer';
import {
  auditPairReadingText,
  countFullWidthChars,
  countSentencesJa,
  textsAreNearDuplicates,
} from './pairReadingSafetyAudit';

const HERE = dirname(fileURLToPath(import.meta.url));

function assertNoRawDob(blob: string, a: string, b: string, label: string): void {
  assert.equal(blob.includes(a), false, `${label} leaks personA DOB`);
  assert.equal(blob.includes(b), false, `${label} leaks personB DOB`);
}

function visiblePaid(result: Extract<ReturnType<typeof renderPairReading>, { ok: true }>): string {
  return result.paidReport.chapters.map((c) => `${c.chapterTitle}\n${c.chapterBody}`).join('\n');
}

describe('pairReading catalog lock', () => {
  it('locks counts and product identity', () => {
    assert.equal(RELATION_STATUS_IDS.length, 6);
    assert.equal(PAID_TOPIC_IDS.length, 5);
    assert.equal(TEMPERATURE_IDS.length, 6);
    assert.equal(PAIR_AXIS_IDS.length, 4);
    assert.equal(CHAPTER_IDS.length, 6);
    assert.equal(PRODUCT_PUBLIC_NAME, '2人の距離の読み解き');
    assert.equal(PRODUCT_INTERNAL_NAME, 'pair_reading');
    assert.equal(SAFETY_PROFILE, 'm55_pair_non_advisory_v1');
    assert.equal(PAIR_READING_CTA, '続きは、二人の相性レポート');
  });
});

describe('pairReading safety allowlist / denylist', () => {
  it('passes ch_about disclaimer (negation allowlist)', () => {
    const r = auditPairReadingText(CH_ABOUT_DISCLAIMER);
    assert.equal(r.ok, true, r.hits.join(','));
  });

  it('fails affirmative forbidden wording', () => {
    const r = auditPairReadingText('これは占いです。相手の本音がわかります。');
    assert.equal(r.ok, false);
    assert.ok(r.hits.length > 0);
  });

  it('does not over-fail bare できます', () => {
    const r = auditPairReadingText('この整理は、今日の手がかりとして使えます。');
    assert.equal(r.ok, true, r.hits.join(','));
  });

  it('fails dangerous できます collocations', () => {
    const r1 = auditPairReadingText('復縁できます');
    const r2 = auditPairReadingText('結婚できます');
    const r3 = auditPairReadingText('必ず進展できます');
    assert.equal(r1.ok, false);
    assert.equal(r2.ok, false);
    assert.equal(r3.ok, false);
  });
});

describe('pairReading CI core — S1–S5 × boundary / no DOB', () => {
  for (const sample of SAMPLE_LANES) {
    it(`${sample.id} ${sample.laneId} renders safely on P01`, () => {
      const dob = DOB_PAIR_ARCHETYPES[0]!;
      const input = buildSampleCase(sample, dob);
      const out = renderPairReading(input);
      assert.equal(out.ok, true, out.ok === false ? out.message : '');
      if (!out.ok) return;

      assert.equal(out.laneId, sample.laneId);
      assert.equal(out.freeTeaser.containsPaidDeepening, false);
      assert.equal(out.freeTeaser.ctaText, PAIR_READING_CTA);
      assert.equal(countSentencesJa(out.freeTeaser.teaserText), 3);
      const len = countFullWidthChars(out.freeTeaser.teaserText);
      assert.ok(len >= 120 && len <= 220, `teaser len ${len}`);

      assert.equal(out.paidReport.chapters.length, 6);
      assert.equal(out.paidReport.chapters[5]?.chapterId, 'ch_about');
      assert.equal(
        out.paidReport.chapters[3]?.chapterTitle,
        getTopicLabel(sample.paidTopicId),
      );
      assert.equal(out.paidReport.productPublicName, PRODUCT_PUBLIC_NAME);

      const paid = visiblePaid(out);
      assertNoRawDob(out.freeTeaser.teaserText, dob.personA, dob.personB, `${sample.id} teaser`);
      assertNoRawDob(paid, dob.personA, dob.personB, `${sample.id} paid`);
      assertNoRawDob(
        JSON.stringify(out.paidReport.generationMeta),
        dob.personA,
        dob.personB,
        `${sample.id} meta`,
      );

      for (const term of sample.requiredTerms) {
        assert.ok(
          paid.includes(term) || out.freeTeaser.teaserText.includes(term),
          `${sample.id} missing required term ${term}`,
        );
      }
      for (const bad of sample.forbiddenRisks) {
        assert.equal(paid.includes(bad), false, `${sample.id} has forbidden ${bad}`);
        assert.equal(out.freeTeaser.teaserText.includes(bad), false);
      }

      for (const ch of out.paidReport.chapters) {
        assert.equal(textsAreNearDuplicates(out.freeTeaser.teaserText, ch.chapterBody), false);
      }
    });
  }
});

describe('pairReading DOB archetypes P01–P08', () => {
  it('renders all archetypes on S1 without DOB leakage', () => {
    const sample = SAMPLE_LANES[0]!;
    for (const dob of DOB_PAIR_ARCHETYPES) {
      const out = renderPairReading(buildSampleCase(sample, dob));
      assert.equal(out.ok, true, `${dob.id}: ${out.ok === false ? out.message : ''}`);
      if (!out.ok) continue;
      assertNoRawDob(out.freeTeaser.teaserText, dob.personA, dob.personB, dob.id);
      assertNoRawDob(visiblePaid(out), dob.personA, dob.personB, dob.id);
      assert.equal(out.paidReport.generationMeta.no_raw_dob_in_output, true);
    }
  });

  it('rejects invalid DOBs fail-closed', () => {
    for (const bad of INVALID_DOB_FIXTURES) {
      const out = renderPairReading(
        buildPairReadingInput({
          personA: bad,
          personB: '1990-01-10',
          relationStatusId: 'R1',
          paidTopicId: 'T1',
          pairAxisOverride: 'A1',
        }),
      );
      assert.equal(out.ok, false);
      if (out.ok === false) assert.equal(out.code, 'invalid_dob');
    }
  });
});

describe('pairReading output variance', () => {
  const sample = SAMPLE_LANES[0]!;

  it('P01 vs P08 differ in pairHash or outputHash', () => {
    const p01 = DOB_PAIR_ARCHETYPES.find((d) => d.id === 'P01')!;
    const p08 = DOB_PAIR_ARCHETYPES.find((d) => d.id === 'P08')!;
    const a = renderPairReading(buildSampleCase(sample, p01));
    const b = renderPairReading(buildSampleCase(sample, p08));
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.pairFingerprint.pairHash, b.pairFingerprint.pairHash);
    assert.notEqual(a.paidReport.generationMeta.output_hash, b.paidReport.generationMeta.output_hash);
  });

  it('P01 vs P02 A/B swap differs', () => {
    const p01 = DOB_PAIR_ARCHETYPES.find((d) => d.id === 'P01')!;
    const p02 = DOB_PAIR_ARCHETYPES.find((d) => d.id === 'P02')!;
    const a = renderPairReading(buildSampleCase(sample, p01));
    const b = renderPairReading(buildSampleCase(sample, p02));
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(a.laneId, b.laneId);
    assert.notEqual(a.pairFingerprint.personADobHash, b.pairFingerprint.personADobHash);
    assert.notEqual(a.paidReport.generationMeta.output_hash, b.paidReport.generationMeta.output_hash);
  });

  it('P03 same DOB succeeds without score markers', () => {
    const p03 = DOB_PAIR_ARCHETYPES.find((d) => d.id === 'P03')!;
    const out = renderPairReading(buildSampleCase(sample, p03));
    assert.equal(out.ok, true);
    if (!out.ok) return;
    assert.equal(out.pairFingerprint.pairDifferenceType, 'same_dob_pair');
    const blob = visiblePaid(out);
    assert.equal(/\d+\s*%/.test(blob), false);
    assert.equal(blob.includes('ranking'), false);
    assert.equal(blob.includes('score'), false);
  });

  it('R difference changes chapter 4/5', () => {
    const dob = DOB_PAIR_ARCHETYPES[0]!;
    const base = buildPairReadingInput({
      personA: dob.personA,
      personB: dob.personB,
      relationStatusId: 'R1',
      paidTopicId: 'T4',
      temperatureId: 'E2',
      pairAxisOverride: 'A2',
    });
    const alt = { ...base, relationStatusId: 'R4' as const };
    const a = renderPairReading(base);
    const b = renderPairReading(alt);
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(
      a.paidReport.chapters[3]?.chapterBody,
      b.paidReport.chapters[3]?.chapterBody,
    );
    assert.notEqual(
      a.paidReport.chapters[4]?.chapterBody,
      b.paidReport.chapters[4]?.chapterBody,
    );
  });

  it('T difference changes ch_topic_deep', () => {
    const dob = DOB_PAIR_ARCHETYPES[0]!;
    const a = renderPairReading(
      buildPairReadingInput({
        personA: dob.personA,
        personB: dob.personB,
        relationStatusId: 'R2',
        paidTopicId: 'T3',
        temperatureId: 'E0',
        pairAxisOverride: 'A1',
      }),
    );
    const b = renderPairReading(
      buildPairReadingInput({
        personA: dob.personA,
        personB: dob.personB,
        relationStatusId: 'R2',
        paidTopicId: 'T2',
        temperatureId: 'E0',
        pairAxisOverride: 'A1',
      }),
    );
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.paidReport.chapters[3]?.chapterTitle, b.paidReport.chapters[3]?.chapterTitle);
    assert.notEqual(a.paidReport.chapters[3]?.chapterBody, b.paidReport.chapters[3]?.chapterBody);
  });

  it('E difference changes ch_today_clue', () => {
    const dob = DOB_PAIR_ARCHETYPES[0]!;
    const a = renderPairReading(
      buildPairReadingInput({
        personA: dob.personA,
        personB: dob.personB,
        relationStatusId: 'R2',
        paidTopicId: 'T3',
        temperatureId: 'E0',
        pairAxisOverride: 'A1',
      }),
    );
    const b = renderPairReading(
      buildPairReadingInput({
        personA: dob.personA,
        personB: dob.personB,
        relationStatusId: 'R2',
        paidTopicId: 'T3',
        temperatureId: 'E2',
        pairAxisOverride: 'A1',
      }),
    );
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.notEqual(a.paidReport.chapters[4]?.chapterBody, b.paidReport.chapters[4]?.chapterBody);
  });

  it('S1 across P01–P08 does not fully collapse', () => {
    const hashes = new Set<string>();
    for (const dob of DOB_PAIR_ARCHETYPES) {
      const out = renderPairReading(buildSampleCase(sample, dob));
      assert.equal(out.ok, true);
      if (!out.ok) continue;
      hashes.add(out.paidReport.generationMeta.output_hash);
    }
    assert.ok(hashes.size > 1, 'all DOB pairs collapsed to one outputHash');
  });
});

describe('pairReading dry-run guarantee', () => {
  it('support modules do not reference fetch/DB/AI/ticket/POST APIs', () => {
    const files = [
      'pairReadingRenderer.ts',
      'pairReadingFingerprint.ts',
      'pairReadingSafetyAudit.ts',
      'pairReadingFragments.v1.ts',
      'pairReadingCatalog.v1.ts',
      'pairReadingQualityMatrix.fixtures.ts',
    ];
    const banned = [
      'fetch(',
      'openai',
      'stripe',
      'createClient',
      'supabase',
      'process.env',
      'http.request',
      'XMLHttpRequest',
      'consumeTicket',
      'ticket_consume',
    ];
    for (const file of files) {
      const src = readFileSync(join(HERE, file), 'utf8');
      for (const token of banned) {
        assert.equal(src.includes(token), false, `${file} contains ${token}`);
      }
    }
  });
});
