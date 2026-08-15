/**
 * Delight-finalization presentation tests — copy, visual parse, analytics enums.
 * Does not rebuild identity fingerprints.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { humanizePrivatePresentationJa } from './humanizePrivatePresentationV1';
import {
  cardCSupportEligible,
  parsePublicCardDisplayV1,
  shareVariantEnum,
} from './publicCardDisplayV1';
import { PERSONAL_V5_FIXTURES } from '../freeResult/personalFreeCommercialCopyV5.test';
import { buildPersonalFreeNarrativeShareContextV1 } from './projectPersonalFreeNarrativeV1';
import { reconstructPersonalPublicCard } from './reconstructPublicCardV1';
import { buildPairManualV1 } from './pairManualV1';
import { buildPairFreeInsightSpecV2 } from '../compatibility/pairFreeInsightSpecV2';
import {
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
  M55_FUNNEL_EVENTS,
} from '../privacySafeFunnelAnalytics';
import { PUBLIC_DOB_PROVENANCE_CUE_JA } from './narrativeSafetyV1';

describe('private presentation humanize', () => {
  it('rewrites mechanical catalog lines without changing meaning', () => {
    assert.equal(
      humanizePrivatePresentationJa('候補を並べてから閉じる。'),
      '候補を並べてから、答えを一つに絞る。',
    );
    assert.equal(
      humanizePrivatePresentationJa(
        '土台では範囲を狭くして戻りやすいのに、今回の答えでは場面を変えて戻る側に寄っています。',
      ),
      '普段は範囲を狭くして戻りやすいのに、今回は場面を変えて戻るほうが出やすい。',
    );
    assert.match(
      humanizePrivatePresentationJa('結論ではなく、次の短い接点だけを一文で置く。返事は急がない。'),
      /次に話す一点だけ先に置く/,
    );
  });

  it('private manual source no longer contains 候補を閉じる / 一句置く', () => {
    const src = readFileSync(join(process.cwd(), 'lib/m55/narrative/personalManualV1.ts'), 'utf8');
    assert.doesNotMatch(src, /候補を並べてから閉じる/);
    assert.doesNotMatch(src, /一句置く/);
    assert.doesNotMatch(src, /返事を急がず、一人の時間のあとに続きを置く/);
  });
});

describe('card C support eligibility', () => {
  it('rejects generic frequency modifiers', () => {
    const hero =
      '人に聞くのは、決めてもらいたいからではない。最後に自分で決めるための材料を集めている。';
    assert.equal(cardCSupportEligible(hero, '連絡の頻度を、あまり変えずに保つ。'), false);
    assert.equal(cardCSupportEligible(hero, '近い関係ほど、今の距離感を言葉にする。'), false);
  });

  it('keeps a second line only when it shares the same mechanism', () => {
    const hero = '全体を見てから動くのに、最後の決断はさらに間を置く。';
    assert.equal(
      cardCSupportEligible(hero, 'すぐ返さず、一人の時間のあとに続きを置く。'),
      true,
    );
  });
});

describe('public card display parse', () => {
  it('P1 card C shows hero without generic extra', () => {
    const ctx = buildPersonalFreeNarrativeShareContextV1(PERSONAL_V5_FIXTURES[0]!);
    assert.equal(ctx.ok, true);
    if (!ctx.ok) return;
    const card = reconstructPersonalPublicCard({
      variant: 'hidden_spec',
      answerAxes: ctx.value.answerAxes,
      birthAxes: ctx.value.birthAxes,
    });
    assert.ok(card);
    const display = parsePublicCardDisplayV1({
      variant: 'hidden_spec',
      headline: card!.headline,
      body: card!.body,
      cta: card!.cta,
    });
    assert.match(display.heroJa, /人に聞くのは、決めてもらいたいからではない/);
    assert.equal(display.supportJa, '');
    assert.match(card!.body, /連絡の頻度を、あまり変えずに保つ/);
    assert.equal(display.cueJa, PUBLIC_DOB_PROVENANCE_CUE_JA);
  });

  it('manual parse keeps labeled rows', () => {
    const ctx = buildPersonalFreeNarrativeShareContextV1(PERSONAL_V5_FIXTURES[0]!);
    assert.equal(ctx.ok, true);
    if (!ctx.ok) return;
    const card = reconstructPersonalPublicCard({
      variant: 'manual',
      answerAxes: ctx.value.answerAxes,
      birthAxes: ctx.value.birthAxes,
    });
    const display = parsePublicCardDisplayV1({
      variant: 'manual',
      headline: card!.headline,
      body: card!.body,
      cta: card!.cta,
    });
    assert.ok(display.rows.length >= 4);
    assert.equal(shareVariantEnum('seen_vs_actual'), 'mirror');
  });

  it('pair short manual shows 一方 / もう一方 when starts differ', () => {
    const spec = buildPairFreeInsightSpecV2({
      answers: {
        decisionPace: 'decide_now',
        disagreement: 'talk_now',
        distance: 'go_quiet',
        expressionPace: 'words_later',
        returnPattern: 'someone_reaches',
        focus: 'conversation_focus',
      },
      pairAxisId: 'A2',
      personABirthDate: '1983-02-28',
      personBBirthDate: '1997-06-15',
      personAUsesFirstPerspective: true,
      focusLabel: 'conversation',
    });
    const manual = buildPairManualV1({ spec, completeness: 'short' });
    const ids = manual.slots.map((slot) => slot.id);
    assert.ok(ids.includes('one_tends'));
    assert.ok(ids.includes('other_tends'));
    assert.equal(manual.slots.find((slot) => slot.id === 'one_tends')?.labelJa, '一方');
    assert.equal(manual.slots.find((slot) => slot.id === 'other_tends')?.labelJa, 'もう一方');
  });
});

describe('growth attribution enums', () => {
  it('allows shareVariant / shareChannel / entrySource only as enums', () => {
    const base = buildPrivacySafeFunnelPayload('core_share');
    assertPrivacySafeFunnelPayload({
      ...base,
      shareVariant: 'hidden_spec',
      shareChannel: 'copy',
      entrySource: 'shared_result',
    });
    assert.throws(() =>
      assertPrivacySafeFunnelPayload({
        ...base,
        shareVariant: 'rare_gold',
      }),
    );
    assert.throws(() =>
      assertPrivacySafeFunnelPayload({
        ...base,
        token: 'n1pc',
      } as Record<string, unknown>),
    );
    assert.equal(M55_FUNNEL_EVENTS.shareImageSaved, 'share_image_saved');
  });
});
