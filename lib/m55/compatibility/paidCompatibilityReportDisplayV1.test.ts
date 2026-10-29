import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPaidCompatibilityReportV1 } from './buildPaidCompatibilityReportV1';
import {
  parsePaidCompatibilityGenerationContract,
  preparePaidCompatibilityChapterForDisplay,
  preparePaidCompatibilityReportForDisplay,
} from './paidCompatibilityReportDisplayV1';

const BASE = {
  pairAxisId: 'A1' as const,
  paidTopicId: 'T3' as const,
  relationStatusId: 'R2' as const,
  temperatureId: 'E0' as const,
};

describe('paid compatibility report display normalization', () => {
  it('keeps product_ab_v1 snapshots unchanged while merging duplicate leading sentences for legacy bodies', () => {
    const legacyChapter = {
      key: 'ch_you_pace' as const,
      number: 1,
      title: 'テスト',
      scene: '場面のみ',
      personAPerspective: '次の予定や返事のタイミングを決める直前。あなた側の固有文。',
      personBPerspective: '次の予定や返事のタイミングを決める直前。相手は、相手側の固有文。',
      relationshipLoop: ['a'],
      resetSteps: ['b', 'c'],
      phraseSpeaker: 'personA' as const,
      usablePhrase: '一言',
      smallExperiment: '実験',
      reflectionQuestion: '振り返り',
      sceneInteractionId: 'paid-compatibility:paid_compatibility_report_v1:ch_you_pace:scene',
    };
    const prepared = preparePaidCompatibilityChapterForDisplay(legacyChapter);
    assert.match(prepared.chapter.scene, /次の予定や返事のタイミングを決める直前/);
    assert.doesNotMatch(prepared.chapter.personAPerspective, /次の予定や返事のタイミングを決める直前/);
    assert.doesNotMatch(prepared.chapter.personBPerspective, /次の予定や返事のタイミングを決める直前/);
    assert.equal(prepared.limits.sharedContextMerged, true);
  });

  it('does not drop shared sentences when only part of the duplicate is already in scene', () => {
    const shared = '次の予定や返事のタイミングを決める直前';
    const legacyChapter = {
      key: 'ch_you_pace' as const,
      number: 1,
      title: 'テスト',
      scene: `場面のみ。${shared}。`,
      personAPerspective: `${shared}。あなた側の固有文。`,
      personBPerspective: `${shared}。相手は、相手側の固有文。`,
      relationshipLoop: ['a', 'b', 'c'],
      resetSteps: ['b', 'c'],
      phraseSpeaker: 'personA' as const,
      usablePhrase: '一言',
      smallExperiment: '実験',
      reflectionQuestion: '振り返り',
      sceneInteractionId: 'paid-compatibility:paid_compatibility_report_v1:ch_you_pace:scene',
    };
    const prepared = preparePaidCompatibilityChapterForDisplay(legacyChapter);
    assert.match(prepared.chapter.scene, new RegExp(shared));
    assert.match(prepared.chapter.personAPerspective, /あなた側の固有文/);
    assert.match(prepared.chapter.personBPerspective, /相手側の固有文/);
    assert.doesNotMatch(prepared.chapter.personAPerspective, new RegExp(`^${shared}`));
  });

  it('falls back on inverted legacy perspectives without contract', () => {
    const legacyChapter = {
      key: 'ch_pair_gap' as const,
      number: 3,
      title: 'テスト',
      scene: '場面',
      personAPerspective: '相手から見ると、動きが見えやすいことがあります。',
      personBPerspective: 'あなたから見ると、別の動きが見えやすいことがあります。',
      relationshipLoop: ['a', 'b', 'c'],
      resetSteps: ['b', 'c'],
      phraseSpeaker: 'either' as const,
      usablePhrase: '一言',
      smallExperiment: '実験',
      reflectionQuestion: '振り返り',
      sceneInteractionId: 'paid-compatibility:paid_compatibility_report_v1:ch_pair_gap:scene',
    };
    const prepared = preparePaidCompatibilityChapterForDisplay(legacyChapter);
    assert.match(prepared.chapter.personAPerspective, /安全に整えられない/);
    assert.match(prepared.chapter.personBPerspective, /安全に整えられない/);
    assert.equal(prepared.limits.uncorrectableLegacyPerspective, true);
    assert.equal(prepared.limits.perspectiveLayoutCorrected, false);
  });

  it('maps buyer and partner columns for both perspective orders in new generation', () => {
    for (const personAUsesFirstPerspective of [true, false]) {
      const snapshot = buildPaidCompatibilityReportV1({
        ...BASE,
        personAUsesFirstPerspective,
      });
      const prepared = preparePaidCompatibilityReportForDisplay(snapshot);
      for (const chapter of prepared.chapters) {
        assert.doesNotMatch(
          chapter.personAPerspective,
          /^相手から見えること|^相手には、|安全に整えられない/,
          `${personAUsesFirstPerspective} personA`,
        );
        const aSentences = chapter.personAPerspective.split('。').filter(Boolean);
        const bSentences = chapter.personBPerspective.split('。').filter(Boolean);
        for (const sentence of aSentences) {
          assert.ok(
            !bSentences.includes(sentence),
            `duplicate sentence in chapter ${chapter.key}: ${sentence}`,
          );
        }
      }
    }
  });

  it('labels R1 second-chapter phrases as buyer-side, not partner speech examples', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      ...BASE,
      relationStatusId: 'R1',
      personAUsesFirstPerspective: false,
    });
    const otherPace = snapshot.chapters.find((chapter) => chapter.key === 'ch_other_pace');
    assert.equal(otherPace?.phraseSpeaker, 'personA');
    assert.match(otherPace?.usablePhrase ?? '', /自分|近づく|書き留め/);
    const prepared = preparePaidCompatibilityChapterForDisplay(otherPace!);
    assert.equal(prepared.chapter.phraseSpeaker, 'personA');
  });

  it('rejects invalid generationContract payloads', () => {
    assert.equal(parsePaidCompatibilityGenerationContract(null), null);
    assert.equal(parsePaidCompatibilityGenerationContract([]), null);
    assert.equal(
      parsePaidCompatibilityGenerationContract({
        version: 'paid_compatibility_generation_contract_v1',
        personAUsesFirstPerspective: true,
        perspectiveLayout: 'product_ab_v1',
        extra: true,
      }),
      null,
    );
    assert.equal(
      parsePaidCompatibilityGenerationContract({
        version: 'paid_compatibility_generation_contract_v1',
        personAUsesFirstPerspective: 'true',
        perspectiveLayout: 'product_ab_v1',
      }),
      null,
    );
    assert.equal(
      parsePaidCompatibilityGenerationContract({
        version: 'paid_compatibility_generation_contract_v1',
        personAUsesFirstPerspective: true,
        perspectiveLayout: 'unknown_layout',
      }),
      null,
    );
    assert.ok(
      parsePaidCompatibilityGenerationContract({
        version: 'paid_compatibility_generation_contract_v1',
        personAUsesFirstPerspective: false,
        perspectiveLayout: 'product_ab_v1',
      }),
    );
  });
});
