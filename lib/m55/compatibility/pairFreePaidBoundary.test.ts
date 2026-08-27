/**
 * Pair Free/Paid boundary enforcement — Human-approved mapping implementation.
 * Does not re-map; asserts runtime leaks are removed from Free surfaces.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAIR_READING_FREE_STRUCTURE_ITEMS } from './pairReadingPublicStructure';
import { PAIR_V5_FIXTURES } from './pairFreeCommercialCopyV5.test';
import { buildPairFreeInsightSpecV2 } from './pairFreeInsightSpecV2';
import { buildPairManualV1 } from '../narrative/pairManualV1';
import { projectCompatibilityFreeNarrativeV1 } from '../narrative/projectCompatibilityFreeNarrativeV1';
import { projectCompatibilityPaidNarrativeV1 } from '../narrative/projectCompatibilityPaidNarrativeV1';
import { buildPaidCompatibilityReportV1 } from './buildPaidCompatibilityReportV1';
import {
  projectPairPublicShareV1,
  resolvePublicShareSpecFromToken,
  pairStartsFromInsight,
} from '../narrative/projectPublicShareV1';
import { reconstructPairPublicCard } from '../narrative/reconstructPublicCardV1';
import { sharePayloadContainsSensitive } from '../freeResult/privacySafeShareCardV1';

const ROOT = join(import.meta.dirname, '../../..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

function pairSpec(fixture: (typeof PAIR_V5_FIXTURES)[number]) {
  return buildPairFreeInsightSpecV2({
    answers: fixture.answers,
    pairAxisId: 'A2',
    personABirthDate: fixture.personA,
    personBBirthDate: fixture.personB,
    personAUsesFirstPerspective: true,
    focusLabel: fixture.focus,
    relationStatusId: 'R3',
  });
}

describe('pair free paid boundary — structure and UI wiring', () => {
  it('free public structure has no actionable next-try item', () => {
    const titles = PAIR_READING_FREE_STRUCTURE_ITEMS.map((item) => item.titleJa);
    assert.equal(titles.length, 3);
    assert.doesNotMatch(titles.join('\n'), /次に一度だけ試す|試すこと/);
    assert.deepEqual(
      PAIR_READING_FREE_STRUCTURE_ITEMS.map((item) => item.index),
      ['01', '02', '03'],
    );
  });

  it('PairResultSignature and guest result do not render free action handling', () => {
    const signature = read('components/compatibility/PairResultSignature.tsx');
    const guest = read('components/compatibility/CompatibilityGuestExperience.tsx');
    assert.doesNotMatch(signature, /immediateAction/);
    assert.doesNotMatch(guest, /immediateAction/);
    assert.doesNotMatch(guest, /actionCard/);
    assert.doesNotMatch(guest, /次に一度だけ試すこと/);
  });
});

describe('pair free paid boundary — short manual and narrative', () => {
  it('short pair manual omits return_path and pair_talk_hint', () => {
    for (const fixture of PAIR_V5_FIXTURES.slice(0, 5)) {
      const spec = pairSpec(fixture);
      const manual = buildPairManualV1({ spec, completeness: 'short' });
      const ids = manual.slots.map((slot) => slot.id);
      assert.ok(ids.includes('one_tends') || ids.includes('mismatch_entry'), fixture.id);
      assert.ok(ids.includes('mismatch_entry'), fixture.id);
      assert.ok(ids.includes('pair_misread'), fixture.id);
      assert.equal(ids.includes('return_path'), false, fixture.id);
      assert.equal(ids.includes('pair_talk_hint'), false, fixture.id);
    }
  });

  it('complete pair manual retains return_path and pair_talk_hint', () => {
    const spec = pairSpec(PAIR_V5_FIXTURES[0]!);
    const manual = buildPairManualV1({ spec, completeness: 'complete' });
    const ids = manual.slots.map((slot) => slot.id);
    assert.ok(ids.includes('return_path'));
    assert.ok(ids.includes('pair_talk_hint'));
  });

  it('free narrative does not expose reset via actions or share candidate', () => {
    for (const fixture of PAIR_V5_FIXTURES.slice(0, 5)) {
      const spec = pairSpec(fixture);
      const narrative = projectCompatibilityFreeNarrativeV1({ spec });
      assert.equal(narrative.actions.length, 0, fixture.id);
      const share = narrative.shareCandidates.find((item) => item.variant === 'pair_manual');
      assert.ok(share, fixture.id);
      assert.doesNotMatch(share!.bodyJa, /戻りやすい方法|return|reset/i);
      assert.doesNotMatch(share!.bodyJa, new RegExp(firstSentence(spec.reset)));
    }
  });
});

describe('pair free paid boundary — public share privacy and determinism', () => {
  it('reconstructed pair free public card has no return procedure', () => {
    for (const fixture of PAIR_V5_FIXTURES.slice(0, 5)) {
      const spec = pairSpec(fixture);
      const pub = projectPairPublicShareV1({ spec });
      assert.doesNotMatch(pub.body, /戻りやすい方法/);
      assert.doesNotMatch(pub.shareTextJa, /戻りやすい方法/);
      assert.equal(sharePayloadContainsSensitive(pub.shareTextJa), false);
      assert.equal(pub.shareTextJa.includes(fixture.personA), false);
      assert.equal(pub.shareTextJa.includes(fixture.personB), false);
    }
  });

  it('public share remains deterministic for identical safe semantic identity', () => {
    const spec = pairSpec(PAIR_V5_FIXTURES[0]!);
    const a = projectPairPublicShareV1({ spec });
    const b = projectPairPublicShareV1({ spec });
    assert.equal(a.token, b.token);
    assert.equal(a.body, b.body);
    assert.equal(a.shareTextJa, b.shareTextJa);
    const starts = pairStartsFromInsight(spec);
    const card = reconstructPairPublicCard(
      spec.interactionId,
      starts.visibleStart,
      starts.inwardStart,
    );
    assert.doesNotMatch(card.body, /戻りやすい方法/);
    const roundTrip = resolvePublicShareSpecFromToken(a.token);
    assert.ok(roundTrip);
    assert.equal(roundTrip!.headline, a.headline);
    assert.equal(roundTrip!.body, a.body);
  });
});

describe('pair free paid boundary — paid capability and commerce posture', () => {
  it('paid narrative retains richer manual capability', () => {
    const fixture = PAIR_V5_FIXTURES[0]!;
    const snapshot = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T3',
      relationStatusId: 'R2',
      temperatureId: 'E0',
      personAUsesFirstPerspective: true,
      currentContext: fixture.answers,
      personABirthDate: fixture.personA,
      personBBirthDate: fixture.personB,
    });
    const pairFree = pairSpec(fixture);
    const paid = projectCompatibilityPaidNarrativeV1({ snapshot, pairFree });
    const ids = paid.manualSpec.slots.map((slot) => slot.id);
    assert.ok(ids.includes('return_path'));
  });

  it('commerce-off guest surface remains non-purchasable', () => {
    const guest = read('components/compatibility/CompatibilityGuestExperience.tsx');
    assert.match(guest, /commerceEnabled \?/);
    assert.match(guest, /準備中/);
    assert.doesNotMatch(guest, /M55_COMPATIBILITY_COMMERCE_ENABLED/);
  });

  it('pair premium remains unactivated in reader wiring', () => {
    const reader = read('components/compatibility/PaidCompatibilityReportReader.tsx');
    assert.doesNotMatch(reader, /M55_COMPATIBILITY_COMMERCE_ENABLED/);
    assert.doesNotMatch(reader, /checkout|stripe/i);
  });
});

function firstSentence(text: string): string {
  return text.split('。')[0] ?? text;
}
