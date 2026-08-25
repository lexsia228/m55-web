/**
 * M55 narrative + public share v1 — projection, sanitization, pair privacy, X encoding.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PERSONAL_V5_FIXTURES } from '../freeResult/personalFreeCommercialCopyV5.test';
import { PAIR_V5_FIXTURES } from '../compatibility/pairFreeCommercialCopyV5.test';
import { buildPairFreeInsightSpecV2 } from '../compatibility/pairFreeInsightSpecV2';
import { buildPaidCompatibilityReportV1 } from '../compatibility/buildPaidCompatibilityReportV1';
import { buildPersonalFreeNarrativeShareContextV1 } from './projectPersonalFreeNarrativeV1';
import { projectPersonalPremiumNarrativeV1 } from './projectPersonalPremiumNarrativeV1';
import { projectCompatibilityFreeNarrativeV1 } from './projectCompatibilityFreeNarrativeV1';
import {
  decideCompatibilityPaidShare,
  projectCompatibilityPaidNarrativeV1,
} from './projectCompatibilityPaidNarrativeV1';
import {
  projectPersonalPublicShareV1,
  projectPairPublicShareV1,
  projectGenericPublicShareV1,
  projectPremiumPublicShareV1,
  resolvePublicShareSpecFromToken,
} from './projectPublicShareV1';
import { encodePublicShareToken, decodePublicShareToken } from './publicShareTokenV1';
import { buildXShareIntentUrl, xShareEncodedPreview } from './xShareIntentV1';
import { narrativeSafetyHits, paidContentWouldLeak, PUBLIC_DOB_PROVENANCE_CUE_JA } from './narrativeSafetyV1';
import {
  publicSemanticKey,
  recommendPublicShareVariant,
} from './reconstructPublicCardV1';
import {
  assertSharePayloadPrivacySafe,
  sharePayloadContainsSensitive,
} from '../freeResult/privacySafeShareCardV1';
import { customerLanguageBanned } from '../freeResult/personalFreeManifestationV4';
import { M55_FUNNEL_EVENTS, assertPrivacySafeFunnelPayload, buildPrivacySafeFunnelPayload } from '../privacySafeFunnelAnalytics';
import type { DtrPayload } from '../dtrEngine';
import { buildPurchaseInputSnapshotV1 } from '../paidResult/purchaseInputSnapshotV1';
import { buildPremiumPurchasedSemanticProjectionV1 } from './buildPremiumPurchasedSemanticProjectionV1';
import { DTR_CORE_LIGHT_V1 } from '../../oneTimeCheckout';

function personalContext(fixture: (typeof PERSONAL_V5_FIXTURES)[number]) {
  const built = buildPersonalFreeNarrativeShareContextV1(fixture);
  assert.equal(built.ok, true, fixture.id);
  if (!built.ok) throw new Error(fixture.id);
  return built.value;
}

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

describe('personal free narrative projection', () => {
  it('five fixtures produce short manuals of 4–6 slots with provenance', () => {
    for (const fixture of PERSONAL_V5_FIXTURES.slice(0, 5)) {
      const ctx = personalContext(fixture);
      const slots = ctx.narrative.manualSpec.slots;
      assert.ok(slots.length >= 4 && slots.length <= 6, `${fixture.id}:${slots.length}`);
      assert.equal(ctx.narrative.shareCandidates.length, 3);
      assert.deepEqual(
        ctx.narrative.shareCandidates.map((item) => item.variant),
        ['manual', 'seen_vs_actual', 'hidden_spec'],
      );
      const blob = [
        ctx.narrative.openingHit.text,
        ...slots.map((slot) => slot.bodyJa),
        ctx.narrative.manualSpec.hiddenSpecJa,
      ].join('\n');
      assert.deepEqual(narrativeSafetyHits(blob), [], fixture.id);
      assert.deepEqual(customerLanguageBanned(blob), [], fixture.id);
      assert.doesNotMatch(blob, /★|レア|ランキング|%|dal-v1|free\.start_style/);
    }
  });

  it('does not collide Personal Free fused identity across V5 fixtures', () => {
    const ids = PERSONAL_V5_FIXTURES.map((fixture) => personalContext(fixture).narrative.inferenceIds[0]);
    assert.equal(new Set(ids).size, PERSONAL_V5_FIXTURES.length);
  });
});

describe('public share sanitization', () => {
  it('encodes catalog keys only and round-trips', () => {
    const ctx = personalContext(PERSONAL_V5_FIXTURES[0]!);
    const spec = projectPersonalPublicShareV1({
      narrative: ctx.narrative,
      variant: 'manual',
      stemLaneIndex: ctx.stemLaneIndex,
      answerAxes: ctx.answerAxes,
      birthAxes: ctx.birthAxes,
      hingeAxisId: ctx.hingeAxisId,
    });
    assert.ok(spec);
    assert.match(spec.token, /^n1p/);
    assert.doesNotMatch(spec.token, /\d{4}-\d{2}-\d{2}|free\.|dal-v1/);
    const decoded = decodePublicShareToken(spec.token);
    assert.ok(decoded);
    assert.equal(encodePublicShareToken(decoded!), spec.token);
    const landing = resolvePublicShareSpecFromToken(spec.token);
    assert.ok(landing);
    assert.equal(landing!.headline, spec.headline);
    assertSharePayloadPrivacySafe({
      title: 'M55',
      text: spec.shareTextJa,
      url: spec.canonicalUrl,
    });
    assert.equal(sharePayloadContainsSensitive(spec.shareTextJa), false);
    assert.match(spec.body, /：/);
    assert.ok(spec.body.split('\n').filter((line) => line.includes('：')).length >= 4);
    assert.match(spec.body, new RegExp(PUBLIC_DOB_PROVENANCE_CUE_JA));
    assert.doesNotMatch(spec.canonicalUrl, /[?&]/);
  });

  it('rejects raw DOB and answer leak in public copy', () => {
    assert.ok(narrativeSafetyHits('生年月日は1983-02-28').includes('NO_PRIVATE_DATA'));
    assert.ok(narrativeSafetyHits('free.start_style.try_first').includes('NO_PRIVATE_DATA'));
    assert.deepEqual(narrativeSafetyHits(PUBLIC_DOB_PROVENANCE_CUE_JA), []);
  });
});

describe('pair privacy and A/B semantics', () => {
  it('five private readings map to public-safe cards without partner identity', () => {
    for (const fixture of PAIR_V5_FIXTURES.slice(0, 5)) {
      const spec = pairSpec(fixture);
      const narrative = projectCompatibilityFreeNarrativeV1({ spec });
      const publicSpec = projectPairPublicShareV1({ spec });
      assert.match(narrative.openingHit.text, /二人|片方|間|側|関係/);
      assert.doesNotMatch(publicSpec.body, /1983|1997|生年月日|personA|email|focusLabel/);
      assert.equal(publicSpec.shareTextJa.includes(fixture.personA), false);
      assert.equal(publicSpec.shareTextJa.includes(fixture.personB), false);
      assert.equal(sharePayloadContainsSensitive(publicSpec.shareTextJa), false);
      assert.match(publicSpec.body, /すれ違いの入口/);
      assert.doesNotMatch(publicSpec.body, /戻りやすい方法/);
      assert.doesNotMatch(publicSpec.body, /逆方向になりやすい/);
      const sideIds = narrative.manualSpec.slots.map((slot) => slot.id);
      assert.ok(sideIds.includes('one_tends'));
      assert.ok(sideIds.includes('mismatch_entry'));
      assert.equal(sideIds.includes('return_path'), false);
    }
  });
});

describe('paid content leak guard', () => {
  it('compatibility paid share is generic NO_OP', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      pairAxisId: 'A2',
      paidTopicId: 'T3',
      relationStatusId: 'R2',
      temperatureId: 'E0',
      personAUsesFirstPerspective: true,
      currentContext: PAIR_V5_FIXTURES[0]!.answers,
      personABirthDate: PAIR_V5_FIXTURES[0]!.personA,
      personBBirthDate: PAIR_V5_FIXTURES[0]!.personB,
    });
    const pairFree = pairSpec(PAIR_V5_FIXTURES[0]!);
    const decision = decideCompatibilityPaidShare({ snapshot, pairFree });
    assert.equal(decision.mode, 'generic');
    const narrative = projectCompatibilityPaidNarrativeV1({ snapshot, pairFree });
    assert.equal(narrative.shareCandidates[0]?.variant, 'pair_generic');
    const publicSpec = projectGenericPublicShareV1({ variant: 'pair_generic' });
    assert.equal(paidContentWouldLeak(publicSpec.body), false);
    assert.doesNotMatch(publicSpec.body, /使える一言|一度だけ試す|振り返る一問/);
  });
});

describe('personal premium takeaway share', () => {
  it('does not dump chapter bodies', () => {
    const payload: DtrPayload = {
      title: 'プレミアムレポート',
      teaserSections: [],
      fullSections: [
        {
          id: 's1_identity',
          title: '輪郭',
          summary: '静かに拾った差分を一つ言葉にできるとき、力が戻る。',
          body: '章本文は共有しない。',
          visibility: 'full',
        },
        {
          id: 's7_work',
          title: '日々の取扱いヒント',
          summary: '短い区切りを置いてから返す。',
          body: '始める前に、今日はここまでと自分の言葉で決める。選択肢を減らしてから動く。',
          visibility: 'full',
        },
      ],
      ownershipType: 'static',
      expiresAt: null,
      aiConsultIncluded: true,
      version: 'v1',
    };
    const purchaseBuilt = buildPurchaseInputSnapshotV1({
      userId: 'user_narrative_premium_test',
      productId: DTR_CORE_LIGHT_V1,
      profile: { nickname: 'T', birthDate: '1990-03-12', birthTimeUnknown: true, country: 'JP' },
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
    const narrative = projectPersonalPremiumNarrativeV1({
      payload,
      stemLaneIndex: 1,
      projection: projection.value,
    });
    assert.ok(narrative.takeaway?.text);
    assert.ok(narrative.manualSpec.slots.length >= 4);
    assert.doesNotMatch(narrative.takeaway!.text, /章本文は共有しない/);
    assert.doesNotMatch(narrative.trustCue.text, /生年月日/);
    const ctx = personalContext(PERSONAL_V5_FIXTURES[1]!);
    const share = projectPremiumPublicShareV1({
      stemLaneIndex: ctx.stemLaneIndex,
      answerAxes: ctx.answerAxes,
      birthAxes: ctx.birthAxes,
      hingeAxisId: ctx.hingeAxisId,
    });
    assert.match(share.cta, /プレミアムレポートから/);
    assert.doesNotMatch(share.body, /s7_work|章本文/);
    assert.match(share.body, new RegExp(PUBLIC_DOB_PROVENANCE_CUE_JA));
    assert.match(share.token, /^n1r/);
  });
});

describe('X URL encoding and native fallback contract', () => {
  it('encodes Japanese text without fake endorsement', () => {
    const ctx = personalContext(PERSONAL_V5_FIXTURES[4]!);
    const spec = projectPersonalPublicShareV1({
      narrative: ctx.narrative,
      variant: 'hidden_spec',
      stemLaneIndex: ctx.stemLaneIndex,
      answerAxes: ctx.answerAxes,
      birthAxes: ctx.birthAxes,
      hingeAxisId: ctx.hingeAxisId,
    })!;
    const preview = xShareEncodedPreview(spec);
    assert.match(preview.href, /^https:\/\/x\.com\/intent\/tweet\?/);
    assert.match(preview.href, /text=/);
    assert.match(preview.href, /url=/);
    assert.doesNotMatch(preview.text, /当たりすぎ|震えた|怖いくらい当たった/);
    assert.match(preview.text, /#M55/);
    assert.match(preview.text, /あなたはどう出る？/);
    assert.doesNotMatch(preview.text, /小さく一つ動かしてから、様子を見る。候補を並べてから閉じる/);
    const decodedText = new URL(preview.href).searchParams.get('text') ?? '';
    assert.equal(decodedText, spec.shareTextJa);
    assert.doesNotMatch(preview.href, /media=|attachment=/);
  });
});

describe('analytics payload privacy', () => {
  it('new share events stay on the allowlisted payload', () => {
    assert.equal(M55_FUNNEL_EVENTS.shareCardImpression, 'share_card_impression');
    assert.equal(M55_FUNNEL_EVENTS.shareCardSelected, 'share_card_selected');
    assert.equal(M55_FUNNEL_EVENTS.shareXClicked, 'share_x_clicked');
    const payload = buildPrivacySafeFunnelPayload('core_share');
    assertPrivacySafeFunnelPayload(payload);
    assert.deepEqual(Object.keys(payload).sort(), ['eventVersion', 'occurredAt', 'surface']);
  });
});

describe('human copy pack examples', () => {
  it('emits 5×3 personal free cards, 5 premium takeaways, 5 pair public cards', () => {
    const personal = PERSONAL_V5_FIXTURES.slice(0, 5).map((fixture) => {
      const ctx = personalContext(fixture);
      return {
        id: fixture.id,
        cards: (['manual', 'seen_vs_actual', 'hidden_spec'] as const).map((variant) => {
          const spec = projectPersonalPublicShareV1({
            narrative: ctx.narrative,
            variant,
            stemLaneIndex: ctx.stemLaneIndex,
            answerAxes: ctx.answerAxes,
            birthAxes: ctx.birthAxes,
            hingeAxisId: ctx.hingeAxisId,
          })!;
          return { variant, headline: spec.headline, body: spec.body, shareTextJa: spec.shareTextJa };
        }),
      };
    });
    assert.equal(personal.length, 5);
    assert.equal(personal[0]!.cards.length, 3);
    const pair = PAIR_V5_FIXTURES.slice(0, 5).map((fixture) => {
      const spec = pairSpec(fixture);
      const narrative = projectCompatibilityFreeNarrativeV1({ spec });
      const pub = projectPairPublicShareV1({ spec });
      return {
        id: fixture.id,
        privateHit: narrative.openingHit.text,
        publicBody: pub.body,
      };
    });
    assert.equal(pair.length, 5);
    for (const row of pair) {
      assert.notEqual(row.privateHit, row.publicBody);
    }
  });
});

describe('selected-card X and public collision', () => {
  it('P1 manual X uses a fused on-card slot, not two weak axis summaries', () => {
    const ctx = personalContext(PERSONAL_V5_FIXTURES[0]!);
    const spec = projectPersonalPublicShareV1({
      narrative: ctx.narrative,
      variant: 'manual',
      stemLaneIndex: ctx.stemLaneIndex,
      answerAxes: ctx.answerAxes,
      birthAxes: ctx.birthAxes,
      hingeAxisId: ctx.hingeAxisId,
    })!;
    assert.doesNotMatch(
      spec.shareTextJa,
      /小さく一つ動かしてから、様子を見る。候補を並べてから閉じる/,
    );
    assert.match(spec.body, /誤解されやすいところ|自分に出やすい傾向/);
    assert.match(spec.shareTextJa, /相談している|一人になったあと|決めているように見られ/);
    if (ctx.birthAxes.start !== ctx.answerAxes.start) {
      assert.equal(
        recommendPublicShareVariant({
          answerAxes: ctx.answerAxes,
          birthAxes: ctx.birthAxes,
        }),
        'hidden_spec',
      );
    }
  });

  it('reports public semantic collision for Human fixtures and a larger sample', () => {
    function cluster(keys: string[]) {
      const counts = new Map<string, number>();
      for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
      const sizes = [...counts.values()];
      return {
        unique: counts.size,
        exactCollision: keys.length - counts.size,
        largest: Math.max(...sizes),
      };
    }

    const human = PERSONAL_V5_FIXTURES.slice(0, 5).map((fixture) => personalContext(fixture));
    const variants = ['manual', 'seen_vs_actual', 'hidden_spec'] as const;
    const humanReport = Object.fromEntries(
      variants.map((variant) => [
        variant,
        cluster(
          human.map((ctx) =>
            publicSemanticKey({
              variant,
              answerAxes: ctx.answerAxes,
              birthAxes: ctx.birthAxes,
            }),
          ),
        ),
      ]),
    );
    assert.ok(humanReport.manual.unique >= 3, JSON.stringify(humanReport.manual));
    assert.ok(humanReport.hidden_spec.unique >= 3, JSON.stringify(humanReport.hidden_spec));

    const larger = PERSONAL_V5_FIXTURES.flatMap((dobSource) =>
      PERSONAL_V5_FIXTURES.map((answerSource) =>
        personalContext({
          ...dobSource,
          freeAnswerSet: answerSource.freeAnswerSet,
        }),
      ),
    );
    const largeReport = Object.fromEntries(
      variants.map((variant) => [
        variant,
        cluster(
          larger.map((ctx) =>
            publicSemanticKey({
              variant,
              answerAxes: ctx.answerAxes,
              birthAxes: ctx.birthAxes,
            }),
          ),
        ),
      ]),
    );
    assert.equal(larger.length, PERSONAL_V5_FIXTURES.length ** 2);
    assert.ok(largeReport.manual.unique >= 5, JSON.stringify(largeReport));
  });
});
