import type { PaidCompatibilityChapter } from './buildPaidCompatibilityReportV1';
import {
  paidCompatibilityBuyerUsesFirstSemanticSlot,
  paidCompatibilityNaturalActionJa,
} from './buildPaidCompatibilityReportV1';
import type { ChapterId, RelationStatusId } from './pairReadingTypes';

export const DUPLICATE_PARTNER_LABEL_IN_LOOP =
  /相手には、相手の/u;

export const FIRST_SLOT_CH_YOU_PACE_MISREAD =
  /あなたが先に動くと、相手からは返事を急かされている/u;

export const HANDLING_ASKS_PARTNER_TO_SIGNAL =
  /読んだ合図だけ返してもらう/u;

export const SUCCESS_BUYER_RECEIVES_FIRST =
  /短い合図だけ先に返り/u;

function postMisreadTail(
  chapter: PaidCompatibilityChapter,
  key: ChapterId,
): string {
  const misread = misreadLine(chapter, key);
  if (!misread) return '';
  const idx = chapter.relationshipLoop.indexOf(misread);
  if (idx < 0) return '';
  return chapter.relationshipLoop.slice(idx + 1).join('');
}

function loopBuyerMotionPhrase(chapter: PaidCompatibilityChapter): string | null {
  const match = chapter.relationshipLoop.join('').match(
    /あなたから見ると、(.+?)動きが見えやすい/u,
  );
  return match?.[1]?.trim() ?? null;
}

function misreadLine(
  chapter: PaidCompatibilityChapter,
  key: ChapterId,
): string | null {
  for (const line of chapter.relationshipLoop) {
    if (/誤読|起きやすい誤読|見落としやすい誤読|誤読の入口/.test(line)) {
      return line;
    }
  }
  if (key === 'ch_topic_deep') {
    return (
      chapter.relationshipLoop.find((line) =>
        /詰問|自分の中だけで整理|一点が広がり|話題そのものを避け/.test(line),
      ) ?? null
    );
  }
  if (key === 'ch_about') {
    return (
      chapter.relationshipLoop.find((line) =>
        /完璧な一言|接点自体を作れない/.test(line),
      ) ?? null
    );
  }
  return null;
}

function depthTailBlob(chapter: PaidCompatibilityChapter, key: ChapterId): string {
  const misread = misreadLine(chapter, key);
  if (!misread) return chapter.relationshipLoop.join('');
  const idx = chapter.relationshipLoop.indexOf(misread);
  if (idx < 0) return chapter.relationshipLoop.join('');
  return chapter.relationshipLoop.slice(idx).join('');
}

export type FinalChainSemanticIssue = {
  readonly code: string;
  readonly message: string;
};

export function finalChainSemanticIssuesForChapter(
  chapter: PaidCompatibilityChapter,
  relationStatusId: RelationStatusId,
  personAUsesFirstPerspective: boolean,
): readonly FinalChainSemanticIssue[] {
  const issues: FinalChainSemanticIssue[] = [];
  const blob = [
    chapter.personAPerspective,
    chapter.personBPerspective,
    chapter.relationshipLoop.join(''),
  ].join('\n');

  if (DUPLICATE_PARTNER_LABEL_IN_LOOP.test(blob)) {
    issues.push({
      code: 'duplicate_partner_label',
      message: `${chapter.key}: duplicate partner actor label in chain`,
    });
  }

  const buyerFirst = paidCompatibilityBuyerUsesFirstSemanticSlot(
    relationStatusId,
    personAUsesFirstPerspective,
  );
  const buyerMotionPhrase = loopBuyerMotionPhrase(chapter);
  if (!buyerMotionPhrase) {
    issues.push({
      code: 'missing_buyer_motion_in_loop',
      message: `${chapter.key}: loop missing buyer motion line`,
    });
    return issues;
  }

  const misread = misreadLine(chapter, chapter.key);
  if (!misread) {
    issues.push({
      code: 'missing_misread_line',
      message: `${chapter.key}: enriched loop missing misread`,
    });
    return issues;
  }

  if (buyerFirst) {
    if (
      chapter.key === 'ch_you_pace' &&
      relationStatusId !== 'R1' &&
      !FIRST_SLOT_CH_YOU_PACE_MISREAD.test(misread)
    ) {
      issues.push({
        code: 'first_slot_misread_expected',
        message: `${chapter.key}: first-slot ch_you_pace misread should describe先に動く/返事を急かされている`,
      });
    }
    return issues;
  }

  if (relationStatusId === 'R1') {
    return issues;
  }

  if (
    chapter.key === 'ch_you_pace' &&
    FIRST_SLOT_CH_YOU_PACE_MISREAD.test(misread)
  ) {
    issues.push({
      code: 'wrong_slot_misread',
      message: `${chapter.key}: second-slot buyer must not use first-slot misread template`,
    });
  }

  const expectedNatural = paidCompatibilityNaturalActionJa(buyerMotionPhrase)
    .replace(/。+$/u, '')
    .replace(/^あなたは、/u, '');
  const misreadBody = misread.replace(/^ここで起きやすい誤読は、/u, '');
  if (!misreadBody.includes(expectedNatural.slice(0, 10))) {
    issues.push({
      code: 'misread_buyer_motion_drift',
      message: `${chapter.key}: misread must reflect natural buyer motion for loop action`,
    });
  }

  const questionLine = chapter.relationshipLoop.find((line) =>
    /どう受け取る|何を確かめ|どこで詰ま|何が引っか|何を確認|何を先に/.test(line),
  );
  if (
    questionLine &&
    questionLine.includes('あなたが') &&
    !questionLine.includes(buyerMotionPhrase.slice(0, 4))
  ) {
    issues.push({
      code: 'chapter_question_motion_drift',
      message: `${chapter.key}: chapterQuestion must align with buyer motion phrase`,
    });
  }

  const tail = depthTailBlob(chapter, chapter.key);
  if (chapter.key === 'ch_you_pace' && /返事の速さだけで/.test(tail)) {
    issues.push({
      code: 'failure_assumes_wrong_buyer_pace',
      message: `${chapter.key}: failureCondition still assumes返事の速さ for second-slot buyer`,
    });
  }
  if (
    chapter.key === 'ch_topic_deep' &&
    /答えを急ぎ、話題の入口を広げすぎる/.test(tail)
  ) {
    issues.push({
      code: 'failure_assumes_wrong_topic_entry',
      message: `${chapter.key}: failureCondition assumes buyer pushes topic when second-slot`,
    });
  }

  if (chapter.key === 'ch_pair_gap') {
    const loopBlob = chapter.relationshipLoop.join('');
    if (/相手には、/.test(loopBlob) && !/相手から見ると、/.test(loopBlob)) {
      issues.push({
        code: 'ambiguous_partner_visibility_line',
        message: `${chapter.key}: must distinguish partner view from partner-own-action`,
      });
    }
    const hasPartnerView = /相手から見ると、/.test(loopBlob);
    const hasStageUncertainty =
      /相手については、いまの間合いの見え方だけでは/.test(loopBlob) ||
      /相手が再接近を望んでいるとは限らず/.test(loopBlob);
    if (!hasPartnerView && !hasStageUncertainty) {
      issues.push({
        code: 'pair_gap_missing_partner_view_of_buyer',
        message: `${chapter.key}: ch_pair_gap loop must include partner-from-view or stage uncertainty`,
      });
    }
  }

  if (!buyerFirst && chapter.key === 'ch_other_pace') {
    const handlingTail = postMisreadTail(chapter, chapter.key);
    if (HANDLING_ASKS_PARTNER_TO_SIGNAL.test(handlingTail)) {
      issues.push({
        code: 'handling_expects_partner_signal_wrong',
        message: `${chapter.key}: handling must not ask buyer to receive partner合図 when buyer reduces reaction`,
      });
    }
    if (
      SUCCESS_BUYER_RECEIVES_FIRST.test(handlingTail) &&
      !/相手が/.test(handlingTail)
    ) {
      issues.push({
        code: 'success_buyer_receives_signal_wrong',
        message: `${chapter.key}: successSignal must describe partner response without buyer-as-receiver drift`,
      });
    }
  }

  return issues;
}
