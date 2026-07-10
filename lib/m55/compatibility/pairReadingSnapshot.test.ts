/**
 * Pair reading snapshot shape tests.
 * Dry-run only.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PAIR_READING_CTA,
  PRODUCT_INTERNAL_NAME,
  PRODUCT_PUBLIC_NAME,
  SAFETY_PROFILE,
  getTopicLabel,
} from './pairReadingCatalog.v1';
import {
  DOB_PAIR_ARCHETYPES,
  SAMPLE_LANES,
  buildSampleCase,
} from './pairReadingQualityMatrix.fixtures';
import { renderPairReading } from './pairReadingRenderer';

describe('pairReading snapshot shapes', () => {
  it('FreeTeaserSnapshot + PaidReportSnapshot + generationMeta', () => {
    const sample = SAMPLE_LANES[0]!;
    const dob = DOB_PAIR_ARCHETYPES[0]!;
    const out = renderPairReading(buildSampleCase(sample, dob));
    assert.equal(out.ok, true);
    if (!out.ok) return;

    const t = out.freeTeaser;
    assert.equal(t.schemaVersion, 'pair_teaser_v1');
    assert.equal(typeof t.teaserId, 'string');
    assert.equal(t.pairAxisId, sample.pairAxisId);
    assert.equal(t.relationStatusId, sample.relationStatusId);
    assert.equal(t.paidTopicId, sample.paidTopicId);
    assert.equal(t.temperatureId, sample.temperatureId);
    assert.equal(typeof t.teaserText, 'string');
    assert.equal(t.ctaText, PAIR_READING_CTA);
    assert.equal(t.containsPaidDeepening, false);
    assert.equal(t.noRawDobFlag, true);
    assert.equal(t.productPublicName, PRODUCT_PUBLIC_NAME);

    const r = out.paidReport;
    assert.equal(r.schemaVersion, 'pair_report_v1');
    assert.equal(r.productPublicName, PRODUCT_PUBLIC_NAME);
    assert.equal(r.productInternalName, PRODUCT_INTERNAL_NAME);
    assert.equal(r.safetyProfile, SAFETY_PROFILE);
    assert.equal(r.chapters.length, 6);
    assert.equal(r.chapters[3]?.chapterTitle, getTopicLabel(sample.paidTopicId));
    assert.equal(r.chapters[5]?.chapterId, 'ch_about');
    assert.equal(r.safetyFlags.disclaimerPresent, true);
    assert.equal(r.safetyFlags.noRawDob, true);

    const meta = r.generationMeta;
    assert.equal(meta.no_raw_dob_in_output, true);
    assert.equal(meta.product_name_lock_ok, true);
    assert.equal(meta.forbidden_wording_audit, 'pass');
    assert.equal(meta.disclaimer_presence, 'pass');
    assert.equal(typeof meta.output_hash, 'string');
    assert.equal(meta.output_hash.length, 32);
    assert.equal(meta.personA_dob_hash.length, 32);
    assert.equal(meta.personB_dob_hash.length, 32);

    // No raw DOB fields on snapshots
    const json = JSON.stringify({ t, r });
    assert.equal(json.includes(dob.personA), false);
    assert.equal(json.includes(dob.personB), false);
    assert.equal('birthDate' in t, false);
    assert.equal('birthDate' in r, false);
  });

  it('outputHash is stable for identical input', () => {
    const sample = SAMPLE_LANES[1]!;
    const dob = DOB_PAIR_ARCHETYPES[2]!;
    const input = buildSampleCase(sample, dob);
    const a = renderPairReading(input);
    const b = renderPairReading(input);
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(a.paidReport.generationMeta.output_hash, b.paidReport.generationMeta.output_hash);
    assert.equal(a.laneId, b.laneId);
  });

  it('A/B swap changes outputHash and person dob hashes', () => {
    const sample = SAMPLE_LANES[0]!;
    const p01 = DOB_PAIR_ARCHETYPES.find((d) => d.id === 'P01')!;
    const p02 = DOB_PAIR_ARCHETYPES.find((d) => d.id === 'P02')!;
    const a = renderPairReading(buildSampleCase(sample, p01));
    const b = renderPairReading(buildSampleCase(sample, p02));
    assert.equal(a.ok && b.ok, true);
    if (!a.ok || !b.ok) return;
    assert.equal(a.laneId, b.laneId);
    assert.notEqual(a.pairFingerprint.personADobHash, b.pairFingerprint.personADobHash);
    assert.notEqual(a.paidReport.generationMeta.output_hash, b.paidReport.generationMeta.output_hash);
    assert.deepEqual(
      {
        laneId: a.laneId,
        status: a.paidReport.sourceKeys.relationStatusId,
        topic: a.paidReport.sourceKeys.paidTopicId,
        axis: a.paidReport.sourceKeys.pairAxisId,
      },
      {
        laneId: b.laneId,
        status: b.paidReport.sourceKeys.relationStatusId,
        topic: b.paidReport.sourceKeys.paidTopicId,
        axis: b.paidReport.sourceKeys.pairAxisId,
      },
    );
  });
});
