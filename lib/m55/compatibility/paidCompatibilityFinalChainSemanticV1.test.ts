import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPaidCompatibilityReportV1 } from './buildPaidCompatibilityReportV1';
import {
  DUPLICATE_PARTNER_LABEL_IN_LOOP,
  finalChainSemanticIssuesForChapter,
} from './paidCompatibilityFinalChainSemanticV1';
import { CHAPTER_IDS } from './pairReadingCatalog.v1';
import type { RelationStatusId } from './pairReadingTypes';

const BASE = {
  pairAxisId: 'A1' as const,
  paidTopicId: 'T3' as const,
  temperatureId: 'E0' as const,
};

const STATUSES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'] as const satisfies readonly RelationStatusId[];

describe('paid compatibility final chain semantics — 72 chapters', () => {
  for (const relationStatusId of STATUSES) {
    for (const personAUsesFirstPerspective of [true, false] as const) {
      it(`validates enriched loop coherence for ${relationStatusId} / ${personAUsesFirstPerspective}`, () => {
        const snapshot = buildPaidCompatibilityReportV1({
          ...BASE,
          relationStatusId,
          personAUsesFirstPerspective,
        });
        for (const key of CHAPTER_IDS) {
          const chapter = snapshot.chapters.find((item) => item.key === key)!;
          const issues = finalChainSemanticIssuesForChapter(
            chapter,
            relationStatusId,
            personAUsesFirstPerspective,
          );
          assert.deepEqual(
            issues,
            [],
            `${relationStatusId}/${key}/${personAUsesFirstPerspective}: ${issues.map((item) => item.message).join('; ')}`,
          );
        }
      });
    }
  }

  it('regression: R2 false ch_pair_gap partner view line (Codex 113155)', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      ...BASE,
      relationStatusId: 'R2',
      personAUsesFirstPerspective: false,
    });
    const chapter = snapshot.chapters.find((item) => item.key === 'ch_pair_gap')!;
    const blob = chapter.relationshipLoop.join('');
    assert.doesNotMatch(blob, DUPLICATE_PARTNER_LABEL_IN_LOOP);
    assert.match(blob, /相手から見ると、返事を整えるために間を取りたい動きが見える/);
    assert.doesNotMatch(blob, /相手には、反応を確かめようとするパターン/);
  });

  it('regression: R2 false ch_other_pace handling aligns with buyer reducing reaction', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      ...BASE,
      relationStatusId: 'R2',
      personAUsesFirstPerspective: false,
    });
    const chapter = snapshot.chapters.find((item) => item.key === 'ch_other_pace')!;
    const tail = chapter.relationshipLoop.slice(-1)[0] ?? '';
    assert.match(tail, /整える時間が必要な旨を一行で伝える/);
    assert.doesNotMatch(tail, /読んだ合図だけ返してもらう/);
    assert.match(tail, /相手が催促せず/);
  });

  it('negative control: validator detects wrong handling on ch_other_pace', () => {
    const snapshot = buildPaidCompatibilityReportV1({
      ...BASE,
      relationStatusId: 'R2',
      personAUsesFirstPerspective: false,
    });
    const chapter = snapshot.chapters.find((item) => item.key === 'ch_other_pace')!;
    const poisoned = {
      ...chapter,
      relationshipLoop: Object.freeze(
        chapter.relationshipLoop.map((line, index) =>
          index === chapter.relationshipLoop.length - 1
            ? '返事がない時間を、関係の終わりと決めてしまうと、読み取りが一方向に寄りやすい。答えを求めず、読んだ合図だけ返してもらう。短い合図だけ先に返り、本題はあとで続けられる余白が残る。'
            : line,
        ),
      ),
    };
    const issues = finalChainSemanticIssuesForChapter(poisoned, 'R2', false);
    assert.ok(
      issues.some((item) => item.code === 'handling_expects_partner_signal_wrong'),
    );
  });

  it('regression: scans all 72 chapters for duplicate partner label pattern', () => {
    const hits: string[] = [];
    for (const relationStatusId of STATUSES) {
      for (const personAUsesFirstPerspective of [true, false] as const) {
        const snapshot = buildPaidCompatibilityReportV1({
          ...BASE,
          relationStatusId,
          personAUsesFirstPerspective,
        });
        for (const key of CHAPTER_IDS) {
          const chapter = snapshot.chapters.find((item) => item.key === key)!;
          const blob = [
            chapter.personAPerspective,
            chapter.personBPerspective,
            chapter.relationshipLoop.join(''),
          ].join('');
          if (DUPLICATE_PARTNER_LABEL_IN_LOOP.test(blob)) {
            hits.push(`${relationStatusId}/${personAUsesFirstPerspective}/${key}`);
          }
        }
      }
    }
    assert.deepEqual(hits, []);
  });
});
