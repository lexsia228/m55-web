/**
 * M55 content integrity + Japanese semantic corpus audit tests.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  checkJapaneseBracketBalance,
  checkShareCardBodyParseIntegrity,
  looksTruncatedAgainstAuthority,
  runContentIntegrityAudit,
} from './contentIntegrityChecks';
import {
  ACTOR_CONSISTENCY_TALK_HINT_REGRESSION_V1,
  assertPaidChapterComponentUniquenessForFixture,
  assertCrossProfileShareDistinctness,
  assertPremiumShareDiffersFromFreeHiddenSpec,
  hasInvalidSeenVsActualShareNesting,
  PERSON_B_DOB_SOURCE_ANCHOR_V1,
} from './contentIntegritySemanticChecks';
import {
  CONTENT_INTEGRITY_SEEN_VS_ACTUAL_REGRESSION_V1,
  type ContentIntegrityCorpusItem,
} from './contentIntegrityTypes';
import { buildM55GovernedCopyInventory } from '../m55/commercialUx/qualityControl/m55JapaneseComprehensionInventory';
import { PERSONAL_V5_FIXTURES } from '../m55/freeResult/personalFreeCommercialCopyV5.test';
import { buildPersonalFreeNarrativeShareContextV1 } from '../m55/narrative/projectPersonalFreeNarrativeV1';
import {
  extractJapaneseLabelQuoteJa,
  parsePublicCardDisplayV1,
} from '../m55/narrative/publicCardDisplayV1';
import { reconstructPersonalPublicCard, reconstructPairPublicCard } from '../m55/narrative/reconstructPublicCardV1';
import { buildPairManualV1 } from '../m55/narrative/pairManualV1';
import { buildPairFreeInsightSpecV2 } from '../m55/compatibility/pairFreeInsightSpecV2';
import { PAIR_V5_FIXTURES } from '../m55/compatibility/pairFreeCommercialCopyV5.test';
import { buildPurchaseInputSnapshotV1 } from '../m55/paidResult/purchaseInputSnapshotV1';
import { buildPremiumPurchasedSemanticProjectionV1 } from '../m55/narrative/buildPremiumPurchasedSemanticProjectionV1';
import { DTR_CORE_LIGHT_V1 } from '../oneTimeCheckout';
import {
  buildM55ContentIntegrityCorpus,
  buildM55ContentIntegrityCorpusExportLines,
} from '../m55/commercialUx/qualityControl/m55ContentIntegrityCorpus';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const corpusArtifactPath = join(
  repoRoot,
  'docs/audit/local/M55_CONTENT_INTEGRITY_CORPUS_LOCAL_PHASE3.jsonl',
);

test('extractJapaneseLabelQuoteJa handles nested 「ここまで」 without truncation', () => {
  const actual =
    CONTENT_INTEGRITY_SEEN_VS_ACTUAL_REGRESSION_V1.expectedActualJa;
  const body = `人から見える私\n「近い関係でも、段取りを揃えてから進む人」\n\n実際の私\n「${actual}」`;
  assert.equal(extractJapaneseLabelQuoteJa(body, '実際の私'), actual);
  const display = parsePublicCardDisplayV1({
    variant: 'seen_vs_actual',
    headline: CONTENT_INTEGRITY_SEEN_VS_ACTUAL_REGRESSION_V1.headingLabel,
    body,
    cta: 'test',
  });
  assert.equal(display.actualJa, actual);
  assert.notEqual(display.actualJa, CONTENT_INTEGRITY_SEEN_VS_ACTUAL_REGRESSION_V1.truncatedDisplayJa);
});

test('P3 fixture seen_vs_actual regression fixture stays GREEN', () => {
  const fixture = PERSONAL_V5_FIXTURES.find((f) => f.id === 'P3');
  assert.ok(fixture);
  const ctx = buildPersonalFreeNarrativeShareContextV1(fixture!);
  assert.equal(ctx.ok, true);
  if (!ctx.ok) return;
  const card = reconstructPersonalPublicCard({
    variant: 'seen_vs_actual',
    answerAxes: ctx.value.answerAxes,
    birthAxes: ctx.value.birthAxes,
    hingeAxisId: ctx.value.hingeAxisId,
  });
  assert.ok(card);
  const display = parsePublicCardDisplayV1({
    variant: 'seen_vs_actual',
    headline: card!.headline,
    body: card!.body,
    cta: card!.cta,
  });
  assert.equal(
    display.actualJa,
    CONTENT_INTEGRITY_SEEN_VS_ACTUAL_REGRESSION_V1.expectedActualJa,
  );
  assert.match(card!.shareTextJa, /が見えたところで、自分の中で決めている/);
  assert.equal(hasInvalidSeenVsActualShareNesting(card!.shareTextJa), false);
  const parseFindings = checkShareCardBodyParseIntegrity({
    itemId: 'regression.P3',
    body: card!.body,
    cta: card!.cta,
    variant: 'seen_vs_actual',
  });
  assert.equal(parseFindings.length, 0);
});

test('Person B DOB source-anchor identity in governed inventory', () => {
  const inventory = buildM55GovernedCopyInventory();
  const role = inventory.find((e) => e.copyId === PERSON_B_DOB_SOURCE_ANCHOR_V1.copyIdRole);
  const label = inventory.find((e) => e.copyId === PERSON_B_DOB_SOURCE_ANCHOR_V1.copyIdLabel);
  assert.ok(role);
  assert.ok(label);
  assert.equal(role!.visibleText, PERSON_B_DOB_SOURCE_ANCHOR_V1.expectedRoleJa);
  assert.equal(label!.visibleText, PERSON_B_DOB_SOURCE_ANCHOR_V1.expectedLabelJa);
});

test('pair share uses pair perspective CTA not self CTA', () => {
  const card = reconstructPairPublicCard('tempo_mismatch', 'try', 'map');
  assert.match(card.shareTextJa, /あなたの二人では、どう出る？/);
  assert.doesNotMatch(card.shareTextJa, /これ、私っぽい/);
});

test('actor consistency talk_hint keeps もらう frame', () => {
  assert.doesNotMatch(
    ACTOR_CONSISTENCY_TALK_HINT_REGRESSION_V1.manualAuthorityJa,
    new RegExp(ACTOR_CONSISTENCY_TALK_HINT_REGRESSION_V1.forbiddenInvertedJa),
  );
});

test('pair manual one_tends describes side tendency not mesh coaching', () => {
  const fixture = PAIR_V5_FIXTURES.find((f) => f.id === 'R2');
  assert.ok(fixture);
  const spec = buildPairFreeInsightSpecV2({
    answers: fixture!.answers,
    pairAxisId: 'A2',
    personABirthDate: fixture!.personA,
    personBBirthDate: fixture!.personB,
    personAUsesFirstPerspective: true,
    focusLabel: fixture!.focus,
    relationStatusId: 'R3',
  });
  const manual = buildPairManualV1({ spec, completeness: 'short' });
  const one = manual.slots.find((s) => s.id === 'one_tends');
  assert.ok(one);
  assert.doesNotMatch(one!.bodyJa, /進み方が近いときは|噛み合いやすい/);
});

test('premium share differs from free hidden_spec for purchase projection', () => {
  const purchaseBuilt = buildPurchaseInputSnapshotV1({
    userId: 'user_content_integrity_test',
    productId: DTR_CORE_LIGHT_V1,
    profile: { nickname: 'CI', birthDate: '1990-01-15', birthTimeUnknown: true, country: 'JP' },
    freeAnswerSet: {
      'free.start_style': 'free.start_style.map_first',
      'free.decision_style': 'free.decision_style.sort_first',
      'free.recovery_style': 'free.recovery_style.pause_short',
      'free.distance_style': 'free.distance_style.close_careful',
      'free.change_style': 'free.change_style.observe_first',
      'free.primary_theme': 'free.primary_theme.work',
    },
    paidAnswerSet: {
      'paid.work_focus': 'paid.work_focus.priority',
      'paid.decision_friction': 'paid.decision_friction.too_many',
      'paid.relation_focus': 'paid.relation_focus.words',
      'paid.fatigue_signal': 'paid.fatigue_signal.after_push',
      'paid.recovery_sequence': 'paid.recovery_sequence.pause_first',
      'paid.restart_condition': 'paid.restart_condition.overview_first',
    },
    stemLaneIndex: 1,
  });
  assert.equal(purchaseBuilt.ok, true);
  if (!purchaseBuilt.ok) return;
  const projection = buildPremiumPurchasedSemanticProjectionV1({
    purchaseInput: purchaseBuilt.value,
    stemLaneIndex: 1,
  });
  assert.equal(projection.ok, true);
  if (!projection.ok) return;
  assertPremiumShareDiffersFromFreeHiddenSpec({
    answerAxes: projection.value.axes,
    birthAxes: projection.value.birthAxes,
    premiumTakeawayJa: projection.value.takeawayJa,
  });
});

test('pair premium chapters have structural uniqueness', () => {
  assert.doesNotThrow(() => assertPaidChapterComponentUniquenessForFixture());
});

test('pair premium chapters reject confirmed malformed misread fragments', () => {
  const corpus = buildM55ContentIntegrityCorpus();
  const chapters = corpus.filter((item) => item.surface === 'pair.premium.report.chapter');
  const banned = ['急かしに見えやすい', '追い詰めに見えやすい', '冷たさと読みやすい'];
  for (const chapter of chapters) {
    for (const fragment of banned) {
      assert.equal(
        chapter.semanticText.includes(fragment),
        false,
        `${chapter.variantIdentity} still contains ${fragment}`,
      );
    }
  }
});

test('cross-profile share posts stay distinct for paired fixtures', () => {
  assert.doesNotThrow(() => assertCrossProfileShareDistinctness());
});

test('full corpus audit has zero P0 and P1 findings after systemic remediation', () => {
  const corpus = buildM55ContentIntegrityCorpus();
  assert.ok(corpus.length > 100, `corpus too small: ${corpus.length}`);
  const audit = runContentIntegrityAudit(corpus);
  const p0 = audit.findings.filter((f) => f.severity === 'P0');
  const p1 = audit.findings.filter((f) => f.severity === 'P1');
  assert.equal(
    p0.length,
    0,
    p0.map((f) => `${f.findingId}: ${f.deterministicEvidence}`).join('\n'),
  );
  assert.equal(
    p1.length,
    0,
    p1.map((f) => `${f.findingId}: ${f.deterministicEvidence}`).join('\n'),
  );
});

test('export deterministic Phase3 corpus artifact for Codex (local only)', () => {
  const lines = buildM55ContentIntegrityCorpusExportLines();
  mkdirSync(dirname(corpusArtifactPath), { recursive: true });
  writeFileSync(
    corpusArtifactPath,
    lines.map((line) => JSON.stringify(line)).join('\n') + '\n',
    'utf8',
  );
  assert.ok(lines.length > 0);
  const audit = runContentIntegrityAudit(lines);
  assert.equal(audit.findings.filter((f) => f.severity === 'P0').length, 0);
  assert.equal(audit.findings.filter((f) => f.severity === 'P1').length, 0);
});
