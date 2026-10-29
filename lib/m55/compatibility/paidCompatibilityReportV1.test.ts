import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  M55_FUNNEL_EVENTS,
  assertPrivacySafeFunnelPayload,
  buildPrivacySafeFunnelPayload,
} from '../privacySafeFunnelAnalytics';
import {
  PAID_COMPATIBILITY_REPORT_VERSION,
  buildPaidCompatibilityReportV1,
  paidCompatibilityChapterTitle,
  type PaidCompatibilityReportInput,
} from './buildPaidCompatibilityReportV1';
import { CHAPTER_IDS } from './pairReadingCatalog.v1';
import { SAMPLE_LANES } from './pairReadingQualityMatrix.fixtures';
import { isPaidCompatibilityPreviewBlocked } from './paidCompatibilityPreviewGuard';

const ROOT = join(import.meta.dirname, '../../..');
const BASE_INPUT: PaidCompatibilityReportInput = {
  pairAxisId: 'A1',
  paidTopicId: 'T3',
  relationStatusId: 'R2',
  temperatureId: 'E2',
  personAUsesFirstPerspective: true,
};

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

function build(overrides: Partial<PaidCompatibilityReportInput> = {}) {
  return buildPaidCompatibilityReportV1({ ...BASE_INPUT, ...overrides });
}

function swapVisibleRoles(value: string): string {
  return value.replaceAll('A', '__A__').replaceAll('B', 'A').replaceAll('__A__', 'B');
}

describe('paid compatibility report content', () => {
  it('preserves exactly the six actual chapter keys and titles', () => {
    const snapshot = build();
    assert.equal(snapshot.version, PAID_COMPATIBILITY_REPORT_VERSION);
    assert.equal(snapshot.chapters.length, 6);
    assert.deepEqual(
      snapshot.chapters.map((chapter) => chapter.key),
      CHAPTER_IDS,
    );
    assert.deepEqual(
      snapshot.chapters.map((chapter) => chapter.title),
      CHAPTER_IDS.map((key) => paidCompatibilityChapterTitle(key, BASE_INPUT.paidTopicId)),
    );
    assert.deepEqual(snapshot.highlightedChapterKeys, ['ch_pair_gap', 'ch_topic_deep']);
  });

  it('fills every action-oriented block and keeps chapter content distinct', () => {
    const chapters = build().chapters;
    for (const chapter of chapters) {
      assert.ok(chapter.scene.length > 12);
      assert.ok(chapter.personAPerspective.length > 30);
      assert.ok(chapter.personBPerspective.length > 30);
      assert.ok(chapter.relationshipLoop.length >= 3 && chapter.relationshipLoop.length <= 5);
      assert.ok(chapter.relationshipLoop.every(Boolean));
      assert.ok(chapter.resetSteps.length >= 2 && chapter.resetSteps.length <= 3);
      assert.ok(chapter.resetSteps.every(Boolean));
      assert.ok(chapter.usablePhrase.length >= 20 && chapter.usablePhrase.length <= 70);
      assert.ok(chapter.smallExperiment.length > 35);
      assert.equal((chapter.reflectionQuestion.match(/？/gu) ?? []).length, 1);
    }
    assert.equal(new Set(chapters.map((chapter) => chapter.scene)).size, 6);
    assert.equal(new Set(chapters.map((chapter) => chapter.usablePhrase)).size, 6);
    assert.equal(new Set(chapters.map((chapter) => chapter.smallExperiment)).size, 6);
    assert.equal(new Set(chapters.map((chapter) => chapter.reflectionQuestion)).size, 6);
  });

  it('contains the report summary and direct two-chapter bridge without ranking language', () => {
    const snapshot = build();
    assert.ok(snapshot.relationshipSummary);
    assert.ok(snapshot.sharedFoundation);
    assert.ok(snapshot.differentFoundation);
    assert.ok(snapshot.recurringLoop);
    assert.doesNotMatch(
      JSON.stringify(snapshot),
      /おすすめ度|重要度|ランキング|相性度|AI recommendation|relevance score/i,
    );
  });
});

describe('paid compatibility report determinism and privacy', () => {
  it('is deterministic, deeply immutable at its collection boundaries, and serializable', () => {
    const first = build();
    const second = build();
    assert.deepEqual(first, second);
    assert.equal(JSON.stringify(first), JSON.stringify(second));
    assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
    assert.equal(Object.isFrozen(first), true);
    assert.equal(Object.isFrozen(first.chapters), true);
    assert.equal(Object.isFrozen(first.chapters[0]), true);
    assert.equal(Object.isFrozen(first.chapters[0]?.relationshipLoop), true);
    assert.equal(Object.isFrozen(first.chapters[0]?.resetSteps), true);
  });

  it('contains no raw DOB, hash, nickname, account, provider, prompt, or opaque ID', () => {
    const serialized = JSON.stringify(build());
    assert.doesNotMatch(serialized, /1982-02-28|1997-06-15|2000-02-29/);
    assert.doesNotMatch(
      serialized,
      /dob|birth|hash|nickname|clerk|user.?id|stripe|provider|prompt|fingerprint|reportId|snapshotId|laneId/i,
    );
    assert.doesNotMatch(serialized, /"A[1-4]"|"T[1-5]"|"R[1-6]"|"E[0-5]"|"S[1-5]"/);
  });

  it('has no random or current-time dependency in the builder source', () => {
    const source = read('lib/m55/compatibility/buildPaidCompatibilityReportV1.ts');
    assert.doesNotMatch(source, /Math\.random|Date\.now|new Date|crypto\.randomUUID/);
  });
});

describe('paid compatibility report order safety', () => {
  it('keeps buyer in personAPerspective and partner in personBPerspective across role order', () => {
    const forward = build({ personAUsesFirstPerspective: true });
    const reverse = build({ personAUsesFirstPerspective: false });
    assert.equal(forward.relationshipSummary, reverse.relationshipSummary);
    assert.equal(forward.sharedFoundation, reverse.sharedFoundation);
    assert.equal(forward.differentFoundation, reverse.differentFoundation);
    assert.equal(forward.recurringLoop, reverse.recurringLoop);
    assert.deepEqual(forward.highlightedChapterKeys, reverse.highlightedChapterKeys);
    for (let index = 0; index < 6; index += 1) {
      for (const snapshot of [forward, reverse]) {
        const chapter = snapshot.chapters[index]!;
        assert.match(chapter.personAPerspective, /あなた/);
        assert.notEqual(chapter.personAPerspective, chapter.personBPerspective);
      }
    }
  });

  it('maps semantic first and second slots to buyer column for R2 and both perspective orders', () => {
    const buyerFirstMotion = /次の連絡のタイミングを先に決めようとすることがあります/;
    const buyerSecondMotion = /返す前に、言葉を整える時間を取りたいことがあります/;
    for (const personAUsesFirstPerspective of [true, false]) {
      const snapshot = build({
        relationStatusId: 'R2',
        personAUsesFirstPerspective,
      });
      const chapter = snapshot.chapters.find((item) => item.key === 'ch_you_pace');
      assert.ok(chapter);
      if (personAUsesFirstPerspective) {
        assert.match(chapter!.personAPerspective, buyerFirstMotion);
        assert.doesNotMatch(chapter!.personAPerspective, buyerSecondMotion);
      } else {
        assert.match(chapter!.personAPerspective, buyerSecondMotion);
        assert.doesNotMatch(chapter!.personAPerspective, buyerFirstMotion);
      }
    }
  });

  it('keeps buyer-led relationship loop across R1-R6 and both perspective orders', () => {
    const statuses = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'] as const;
    for (const relationStatusId of statuses) {
      for (const personAUsesFirstPerspective of [true, false]) {
        const snapshot = build({ relationStatusId, personAUsesFirstPerspective });
        const chapter = snapshot.chapters.find((item) => item.key === 'ch_you_pace');
        assert.match(chapter!.relationshipLoop.join(''), /あなたから見ると/, relationStatusId);
        assert.match(chapter!.personAPerspective, /あなた/, relationStatusId);
      }
    }
  });

  it('moves role-specific phrases with the speaker and keeps shared intent stable', () => {
    const forward = build({ personAUsesFirstPerspective: true });
    const reverse = build({ personAUsesFirstPerspective: false });
    assert.equal(forward.chapters[0]?.phraseSpeaker, 'personA');
    assert.equal(forward.chapters[1]?.phraseSpeaker, 'personA');
    assert.equal(forward.chapters[0]?.usablePhrase, reverse.chapters[0]?.usablePhrase);
    assert.equal(forward.chapters[1]?.usablePhrase, reverse.chapters[1]?.usablePhrase);
    assert.notEqual(forward.chapters[0]?.usablePhrase, forward.chapters[1]?.usablePhrase);
    assert.deepEqual(
      forward.chapters.slice(2).map((chapter) => chapter.usablePhrase),
      reverse.chapters.slice(2).map((chapter) => chapter.usablePhrase),
    );
    assert.deepEqual(
      forward.chapters.map((chapter) => chapter.smallExperiment),
      reverse.chapters.map((chapter) => chapter.smallExperiment),
    );
  });
});

describe('paid compatibility report variance and safety', () => {
  it('changes at least four of six chapter bodies for distinct authority states', () => {
    const pace = build();
    const entry = build({
      pairAxisId: 'A4',
      paidTopicId: 'T1',
      relationStatusId: 'R5',
      temperatureId: 'E4',
    });
    const changed = pace.chapters.filter((chapter, index) => {
      const other = entry.chapters[index]!;
      return [
        chapter.personAPerspective,
        chapter.relationshipLoop.join(''),
        chapter.usablePhrase,
        chapter.smallExperiment,
      ].join('|') !== [
        other.personAPerspective,
        other.relationshipLoop.join(''),
        other.usablePhrase,
        other.smallExperiment,
      ].join('|');
    });
    assert.ok(changed.length >= 4);
  });

  it('covers A1-A4, T1-T5, R1-R6, E0-E5, and S1-S5 semantic states', () => {
    for (const sample of SAMPLE_LANES) {
      const snapshot = build({
        pairAxisId: sample.pairAxisId,
        paidTopicId: sample.paidTopicId,
        relationStatusId: sample.relationStatusId,
        temperatureId: sample.temperatureId,
      });
      assert.equal(snapshot.chapters.length, 6);
    }
    const statuses = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'] as const;
    const temperatures = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5'] as const;
    statuses.forEach((relationStatusId, index) => {
      const snapshot = build({
        relationStatusId,
        temperatureId: temperatures[index]!,
      });
      assert.equal(snapshot.chapters.length, 6);
    });
  });

  it('avoids blame, prediction, diagnosis labels, guarantees, and product promises', () => {
    const visible = JSON.stringify(build());
    assert.doesNotMatch(
      visible,
      /Aが悪い|Bが問題|支配的な人格|回避型|必ず|絶対|運命|結婚する|別れる|関係が改善する|成功を保証|購入|価格|Checkout|Stripe/i,
    );
    assert.doesNotMatch(visible, /相性点数|スコア|%|順位|ランキング|予測|診断結果/);
  });
});

describe('paid compatibility reader, bridge, analytics, and preview boundary', () => {
  it('implements the six-chapter index, disclosure, return, copy feedback, and keyboard controls', () => {
    const reader = read('components/compatibility/PaidCompatibilityReportReader.tsx');
    const css = read('components/compatibility/PaidCompatibilityReportReader.module.css');
    assert.match(reader, /aria-label="6章の一覧"/);
    assert.match(reader, /aria-expanded=\{isOpen\}/);
    assert.match(reader, /章一覧を見る/);
    assert.match(reader, /navigator\.clipboard\?\.writeText/);
    assert.match(reader, /コピーしました/);
    assert.match(reader, /コピーできませんでした/);
    assert.match(reader, /<button/g);
    assert.match(css, /min-height: 44px|min-height: 46px|min-height: 48px/);
    assert.doesNotMatch(css, /overflow-x:\s*(auto|scroll)/);
  });

  it('labels paid phrase blocks by phraseSpeaker and perspectives by display identity', () => {
    const reader = read('components/compatibility/PaidCompatibilityReportReader.tsx');
    const display = read('lib/m55/compatibility/paidCompatibilityReportDisplayV1.ts');
    assert.match(reader, /function phraseSpeakerBlockLabel/);
    assert.match(reader, /phraseSpeakerBlockLabel\(/);
    assert.match(reader, /paidCompatibilityPhraseBlockLabelForChapter/);
    assert.match(display, /自分の中で整理する言葉/);
    assert.match(display, /相手側の言い方の例/);
    assert.match(display, /相手とのやり取りに使う表現例/);
    assert.match(reader, /phraseSpeakerBlockLabel\(leadChapter, inferredRelationStatus\)/);
    assert.match(reader, /phraseSpeakerBlockLabel\(chapter, inferredRelationStatus\)/);
    assert.match(reader, /displaySnapshot\.chapters\.map\(\(chapter\) => \{/);
    assert.match(reader, /perspectiveBlockLabel\('self', displayIdentity\)/);
    assert.match(reader, /perspectiveBlockLabel\('partner', displayIdentity\)/);
    assert.doesNotMatch(reader, /そのまま使える一言/);
    assert.doesNotMatch(reader, /Aから見えること|Bから見えること/);

    const forward = build(BASE_INPUT);
    const reverse = build({ ...BASE_INPUT, personAUsesFirstPerspective: false });
    assert.equal(forward.chapters[0]?.phraseSpeaker, 'personA');
    assert.equal(forward.chapters[1]?.phraseSpeaker, 'personA');
    assert.equal(forward.chapters[2]?.phraseSpeaker, 'either');
    assert.equal(reverse.chapters[0]?.phraseSpeaker, 'personA');
    assert.equal(reverse.chapters[1]?.phraseSpeaker, 'personA');
    assert.equal(reverse.chapters[2]?.phraseSpeaker, 'either');
    assert.notEqual(
      forward.chapters[0]?.usablePhrase,
      forward.chapters[1]?.usablePhrase,
    );
  });

  it('anchors chapter navigation below the public shell header and meters experiments on viewport reach', () => {
    const reader = read('components/compatibility/PaidCompatibilityReportReader.tsx');
    const css = read('components/compatibility/PaidCompatibilityReportReader.module.css');
    const saved = read('components/my/CompatibilitySavedReportsSection.tsx');
    const guest = read('components/compatibility/CompatibilityGuestExperience.tsx');
    assert.match(css, /scroll-margin-top: calc\(env\(safe-area-inset-top, 0px\) \+ 64px \+ 12px\)/);
    assert.match(reader, /function scrollChapterIntoView/);
    assert.match(reader, /PaidReportExperimentSection/);
    assert.match(reader, /IntersectionObserver/);
    assert.equal(
      (reader.match(/M55_FUNNEL_EVENTS\.compatibilityExperimentView/g) ?? []).length,
      1,
    );
    assert.doesNotMatch(saved, /compatibilityOwnedReportOpen/);
    assert.match(guest, /レポートを使う場面/);
    assert.doesNotMatch(guest, /読み返せる場面/);
  });

  it('updates the free bridge only with implemented deliverables', () => {
    const bridge = read('components/compatibility/CompatibilityGuestExperience.tsx');
    for (const copy of [
      '二人それぞれの視点',
      'すれ違いが始まる場面',
      'stagePremiumBridgeCopy',
      'そのまま使える',
      '小さな実験',
      'あとで振り返る一問',
      'レポートを使う場面',
    ]) {
      assert.ok(bridge.includes(copy), `bridge must offer ${copy}`);
    }
    assert.match(bridge, /commerceEnabled \? \(/);
    assert.match(bridge, /¥1,480（税込）/);
    assert.match(bridge, /\/synastry\/purchase\/confirm/);
    assert.doesNotMatch(bridge, /PurchaseButton|\/api\/purchase|今だけ|高精度|完全版/);
  });

  it('uses allowlisted analytics with no chapter, phrase, experiment, matrix, or user data', () => {
    const payload = buildPrivacySafeFunnelPayload(
      'compatibility_paid_report',
      '2026-07-13T00:00:00.000Z',
    );
    assert.deepEqual(Object.keys(payload).sort(), ['eventVersion', 'occurredAt', 'surface']);
    assertPrivacySafeFunnelPayload(payload);
    assert.equal(
      M55_FUNNEL_EVENTS.compatibilityPaidReportView,
      'm55_compatibility_paid_report_view',
    );
    assert.equal(
      M55_FUNNEL_EVENTS.compatibilityPaidChapterOpen,
      'm55_compatibility_paid_chapter_open',
    );
    assert.equal(
      M55_FUNNEL_EVENTS.compatibilityPhraseCopy,
      'm55_compatibility_phrase_copy',
    );
    assert.equal(
      M55_FUNNEL_EVENTS.compatibilityExperimentView,
      'm55_compatibility_experiment_view',
    );
    assert.throws(() =>
      assertPrivacySafeFunnelPayload({ ...payload, phraseText: 'forbidden' }),
    );
  });

  it('fails closed for Production and has only synthetic preview inputs', () => {
    assert.equal(
      isPaidCompatibilityPreviewBlocked({ nodeEnv: 'production', vercelEnv: undefined }),
      true,
    );
    assert.equal(
      isPaidCompatibilityPreviewBlocked({ nodeEnv: 'development', vercelEnv: 'production' }),
      true,
    );
    assert.equal(
      isPaidCompatibilityPreviewBlocked({ nodeEnv: 'development', vercelEnv: 'preview' }),
      false,
    );
    const fixture = read(
      'components/compatibility/__preview__/PaidCompatibilityReportPreviewClient.tsx',
    );
    const middleware = read('middleware.ts');
    assert.doesNotMatch(fixture, /\d{4}-\d{2}-\d{2}|checkout|fetch\(|\/api\//i);
    assert.match(middleware, /'\/dev\/synastry-paid-report-preview'/);
  });
});
