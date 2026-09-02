/**
 * Deterministic M55 Japanese semantic integrity checks (P0 audit-infra + P1 systemic groups).
 */

import type {
  ContentIntegrityCategory,
  ContentIntegrityCorpusItem,
  ContentIntegrityFinding,
  ContentIntegritySeverity,
} from './contentIntegrityTypes';
import type { ExpressionAxes } from '../m55/individualization/types';
import { buildPaidCompatibilityReportV1 } from '../m55/compatibility/buildPaidCompatibilityReportV1';
import {
  hasInvalidQuoteNesting,
  PAIR_SHARE_CTA_JA,
} from '../m55/narrative/sharePostSerializationV1';
import { PERSONAL_V5_FIXTURES } from '../m55/freeResult/personalFreeCommercialCopyV5.test';
import { PAIR_V5_FIXTURES } from '../m55/compatibility/pairFreeCommercialCopyV5.test';
import { resolveCanonicalBirthProfileV2 } from '../m55/individualization/canonicalBirthProfileV2';
import { resolveFreeAxes } from '../m55/freeResult/buildFreeFiveViewCompositionV1';
import { hiddenSpecLine, reconstructPersonalPublicCard, reconstructPairPublicCard } from '../m55/narrative/reconstructPublicCardV1';
import { buildPairFreeInsightSpecV2 } from '../m55/compatibility/pairFreeInsightSpecV2';
import type { RelationStatusId } from '../m55/compatibility/pairReadingTypes';
import { buildCompatibilityPublicResult } from '../m55/compatibility/pairReadingGuestResult';
import { projectPairPublicShareV1 } from '../m55/narrative/projectPublicShareV1';

/** Permanent Person-B DOB source-anchor identity (CompatibilityGuestExperience.tsx). */
export const PERSON_B_DOB_SOURCE_ANCHOR_V1 = {
  copyIdRole: 'pair.dob.input.person_b_role',
  copyIdLabel: 'pair.dob.input.person_b_label',
  expectedRoleJa: '相手',
  expectedLabelJa: '相手の生年月日',
  forbiddenMisextractRoleJa: 'あなた',
  forbiddenMisextractLabelJa: 'あなたの生年月日',
} as const;

/** Actor-consistency fixture — manual talk_hint must keep もらう frame, not 自分が伝える. */
export const ACTOR_CONSISTENCY_TALK_HINT_REGRESSION_V1 = {
  manualAuthorityJa:
    '話しかけるときは、決める前に今の距離感を一言確認してもらえると続きやすい。',
  forbiddenInvertedJa: '決める前に、今の距離感を一言伝える',
} as const;

const SELF_SHARE_CTA_MARKERS = ['これ、私っぽい', 'あなたはどう出る？'] as const;
const PAIR_SHARE_CTA_MARKER = PAIR_SHARE_CTA_JA;

const FORBIDDEN_PAIR_SHARE_PERSPECTIVE = /あなたの二人/;
const FORBIDDEN_PAIR_BRIDGE_SIDE_LABELS = /あなた側と相手側/;
const FORBIDDEN_PAIR_ROBOTIC_SIDE_TEMPLATE = /あなた側は|お相手側は|相手側は、/;

const FORBIDDEN_ABSTRACT_FRAGMENTS: readonly RegExp[] = [
  /タイミングを戻す/,
  /組み直す前提/,
  /手の動きが組み替え/,
  /決めたこととしてはまだ置いている/,
  /言葉で寄せる/,
  /結論を置(く|こう|いた|いてから)/,
  /結論を置く前に/,
  /タイミングを戻したくなる/,
  /一日の終わりの整えは一人に残る/,
  /小さな直しの先が組み直しに見える/,
  /進み方の土台/,
  /ずれが先に立つ/,
];

const DOUBLED_TERMINAL_PUNCTUATION = /。{2,}/;

const FORBIDDEN_PAID_TONE_FRAGMENTS: readonly RegExp[] = [
  /勢い屋/,
  /ポンプ型/,
  /身体反応/,
  /酸素/,
  /燃料/,
  /回路/,
  /動員/,
];

const FORBIDDEN_PAIR_FREE_FRAGMENTS: readonly RegExp[] = [
  /間に出る/,
  /型を一つ置く/,
  /見えやすい傾向が見えやすい/,
  /すれ違いやすい面/,
  /近づき始めの段差/,
  /入口の小ささ/,
  /安心の形/,
  /同じ動き/,
  /同じ速さの間/,
  /別の意味として受け取り/,
  /進み方の土台/,
  /ずれが先に立つ/,
  /無料では、/,
];

const FORBIDDEN_PAIR_ACTOR_SIDE_LABELS = /[AB]側/;

const FORBIDDEN_DELIVERY_WORDING = /配送処理/;

const NESTED_SAME_BRACKET_QUOTE = /「[^」]*「[^」]*」[^」]*」/;

function finding(
  item: ContentIntegrityCorpusItem,
  severity: ContentIntegritySeverity,
  category: ContentIntegrityCategory,
  evidence: string,
  currentText: string,
  expectedText?: string,
): ContentIntegrityFinding {
  return {
    findingId: `CI-${category}-${item.itemId}`,
    itemId: item.itemId,
    severity,
    category,
    deterministicEvidence: evidence,
    currentText: currentText.slice(0, 200),
    expectedText: expectedText?.slice(0, 200),
  };
}

export function hasNestedSameBracketQuote(text: string): boolean {
  return hasInvalidQuoteNesting(text);
}

/** Invalid share serialization — outer 「」 wrapped around labeled seen_vs_actual insight. */
export function hasInvalidSeenVsActualShareNesting(text: string): boolean {
  if (!text.includes('見える私は「')) return false;
  if (/\n\n「見える私は/.test(text)) return true;
  if (/「[^」\n]*見える私は「/.test(text)) return true;
  return false;
}

export function checkPersonBSourceAnchorIdentity(
  item: ContentIntegrityCorpusItem,
): ContentIntegrityFinding[] {
  if (item.variantIdentity !== PERSON_B_DOB_SOURCE_ANCHOR_V1.copyIdRole &&
    item.variantIdentity !== PERSON_B_DOB_SOURCE_ANCHOR_V1.copyIdLabel) {
    return [];
  }
  const expected =
    item.variantIdentity === PERSON_B_DOB_SOURCE_ANCHOR_V1.copyIdRole
      ? PERSON_B_DOB_SOURCE_ANCHOR_V1.expectedRoleJa
      : PERSON_B_DOB_SOURCE_ANCHOR_V1.expectedLabelJa;
  if (item.semanticText === expected) return [];
  return [
    finding(
      item,
      'P0',
      'corpus_person_b_extraction_misidentification',
      `expected=${expected} got=${item.semanticText}`,
      item.semanticText,
      expected,
    ),
  ];
}

export function checkSelfGeneratedAbstraction(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  const generatedSurfaces = new Set([
    'self.free.result',
    'self.free.result.manual',
    'self.free.share_card',
    'self.free.share_post',
    'self.premium.result',
    'self.premium.result.manual',
    'pair.free.result',
    'pair.free.result.manual',
  ]);
  if (!generatedSurfaces.has(item.surface)) return [];
  const findings: ContentIntegrityFinding[] = [];
  for (const pattern of FORBIDDEN_ABSTRACT_FRAGMENTS) {
    if (pattern.test(item.semanticText)) {
      findings.push(
        finding(item, 'P1', 'self_generated_abstraction', pattern.source, item.semanticText),
      );
      break;
    }
  }
  return findings;
}

export function checkPairShareSelfPerspective(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  if (!item.surface.startsWith('pair.free.share')) return [];
  const findings: ContentIntegrityFinding[] = [];
  if (FORBIDDEN_PAIR_SHARE_PERSPECTIVE.test(item.semanticText)) {
    findings.push(
      finding(
        item,
        'P1',
        'pair_share_forbidden_perspective',
        'forbidden=あなたの二人',
        item.semanticText,
        PAIR_SHARE_CTA_MARKER,
      ),
    );
  }
  for (const marker of SELF_SHARE_CTA_MARKERS) {
    if (item.semanticText.includes(marker)) {
      findings.push(
        finding(
          item,
          'P1',
          'pair_share_self_perspective',
          `forbidden=${marker}`,
          item.semanticText,
          PAIR_SHARE_CTA_MARKER,
        ),
      );
    }
  }
  return findings;
}

export function checkPairShareCanonicalCta(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  if (item.surface !== 'pair.free.share_post') return [];
  if (!item.semanticText.includes(PAIR_SHARE_CTA_JA)) {
    return [
      finding(
        item,
        'P1',
        'pair_share_cta_missing',
        'missing canonical pair share CTA',
        item.semanticText,
        PAIR_SHARE_CTA_JA,
      ),
    ];
  }
  return [];
}

export function checkPairBridgeRoboticLabels(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  if (!item.surface.startsWith('pair.free') && item.sourceCategory !== 'governed_inventory') return [];
  if (!FORBIDDEN_PAIR_BRIDGE_SIDE_LABELS.test(item.semanticText)) return [];
  return [
    finding(
      item,
      'P1',
      'pair_bridge_robotic_side_labels',
      'あなた側と相手側 in pair bridge prose',
      item.semanticText,
      'あなたと相手それぞれ',
    ),
  ];
}

export function checkPairPaidRoboticSideTemplate(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  const paidSurfaces = new Set([
    'pair.premium.report',
    'pair.premium.report.chapter',
    'static.pair.pair.paid.report.body',
  ]);
  if (!paidSurfaces.has(item.surface) && !item.surface.startsWith('pair.premium.report')) return [];
  if (!FORBIDDEN_PAIR_ROBOTIC_SIDE_TEMPLATE.test(item.semanticText)) return [];
  return [
    finding(
      item,
      'P1',
      'pair_paid_robotic_side_template',
      FORBIDDEN_PAIR_ROBOTIC_SIDE_TEMPLATE.source,
      item.semanticText,
    ),
  ];
}

export function checkDoubledTerminalPunctuation(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  const shareSurfaces = new Set([
    'self.free.share_post',
    'self.premium.share_post',
    'pair.free.share_post',
  ]);
  if (!shareSurfaces.has(item.surface)) return [];
  if (!DOUBLED_TERMINAL_PUNCTUATION.test(item.semanticText)) return [];
  return [
    finding(
      item,
      'P1',
      'share_doubled_terminal_punctuation',
      'doubled Japanese terminal punctuation in share post',
      item.semanticText,
    ),
  ];
}

export function checkNestedQuoteShareSerialization(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  const shareSurfaces = new Set([
    'self.free.share_post',
    'self.premium.share_post',
    'pair.free.share_post',
  ]);
  if (!shareSurfaces.has(item.surface)) return [];
  if (!hasInvalidQuoteNesting(item.semanticText)) return [];
  return [
    finding(
      item,
      'P1',
      'share_quote_nesting',
      'same-bracket nested quotation in share serialization',
      item.semanticText,
    ),
  ];
}

export function checkPairFreeBrokenAbstraction(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  if (!item.surface.startsWith('pair.free')) return [];
  for (const pattern of FORBIDDEN_PAIR_FREE_FRAGMENTS) {
    if (pattern.test(item.semanticText)) {
      return [
        finding(item, 'P1', 'pair_free_broken_abstraction', pattern.source, item.semanticText),
      ];
    }
  }
  return [];
}

export function checkPairActorSideLabels(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  const pairGenerated = new Set([
    'pair.free.result',
    'pair.premium.report',
    'pair.premium.report.chapter',
    'pair.free.share_card',
    'pair.free.share_post',
  ]);
  if (!pairGenerated.has(item.surface) && item.surface !== 'pair.free.result.manual') return [];
  if (!FORBIDDEN_PAIR_ACTOR_SIDE_LABELS.test(item.semanticText)) return [];
  return [
    finding(
      item,
      'P1',
      'pair_actor_side_label',
      'legacy A側/B側 label in pair generated prose',
      item.semanticText,
      'あなた/相手',
    ),
  ];
}

export function checkActorConsistencyFragments(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  if (item.sourceCategory !== 'personal_manual_slot') return [];
  if (!item.variantIdentity.endsWith('.talk_hint')) return [];
  if (item.semanticText.includes(ACTOR_CONSISTENCY_TALK_HINT_REGRESSION_V1.forbiddenInvertedJa)) {
    return [
      finding(
        item,
        'P1',
        'personal_manual_actor_inversion',
        'talk_hint inverted to self-actor 伝える frame',
        item.semanticText,
        ACTOR_CONSISTENCY_TALK_HINT_REGRESSION_V1.manualAuthorityJa,
      ),
    ];
  }
  return [];
}

export function checkCrossProfileShareDuplicate(
  corpus: readonly ContentIntegrityCorpusItem[],
): ContentIntegrityFinding[] {
  const shareItems = corpus.filter(
    (item) =>
      item.surface === 'self.free.share_post' &&
      item.variantIdentity.includes('hidden_spec'),
  );
  const byInsight = new Map<string, ContentIntegrityCorpusItem[]>();
  for (const item of shareItems) {
    const normalized = item.semanticText.replace(/\s+/g, '').replace(/#M55/g, '');
    const bucket = byInsight.get(normalized) ?? [];
    bucket.push(item);
    byInsight.set(normalized, bucket);
  }
  const findings: ContentIntegrityFinding[] = [];
  for (const [, group] of byInsight) {
    if (group.length < 2) continue;
    const profiles = new Set(group.map((item) => item.variantIdentity.split('.')[0]));
    if (profiles.size < 2) continue;
    findings.push(
      finding(
        group[0]!,
        'P1',
        'cross_profile_share_duplicate',
        `identical share_post across ${group.map((g) => g.variantIdentity).join(',')}`,
        group[0]!.semanticText.slice(0, 120),
      ),
    );
  }
  return findings;
}

export function assertCrossProfileShareDistinctness(): void {
  const pairs: [string, string, 'hidden_spec' | 'manual'][] = [
    ['P2', 'P4', 'hidden_spec'],
    ['P5', 'P7', 'hidden_spec'],
    ['P2', 'P4', 'manual'],
    ['P5', 'P7', 'manual'],
    ['R2', 'R5', 'hidden_spec'],
  ];
  for (const [leftId, rightId, variant] of pairs) {
    if (leftId.startsWith('P')) {
      const left = PERSONAL_V5_FIXTURES.find((f) => f.id === leftId);
      const right = PERSONAL_V5_FIXTURES.find((f) => f.id === rightId);
      if (!left || !right) continue;
      const shareFor = (fixture: (typeof PERSONAL_V5_FIXTURES)[number]) => {
        const free = resolveFreeAxes(fixture.freeAnswerSet);
        const canonical = resolveCanonicalBirthProfileV2({ birthDate: fixture.birthDate });
        if (!free.ok || !canonical.ok) return null;
        return reconstructPersonalPublicCard({
          variant,
          answerAxes: free.value.axes,
          birthAxes: canonical.value.birthSignature.dimensions,
        });
      };
      const leftCard = shareFor(left);
      const rightCard = shareFor(right);
      if (!leftCard || !rightCard) continue;
      const leftNorm = leftCard.shareTextJa.replace(/\s+/g, '');
      const rightNorm = rightCard.shareTextJa.replace(/\s+/g, '');
      if (leftNorm === rightNorm) {
        throw new Error(`share duplicate: ${leftId} vs ${rightId} (${variant})`);
      }
      continue;
    }
    const left = PAIR_V5_FIXTURES.find((f) => f.id === leftId);
    const right = PAIR_V5_FIXTURES.find((f) => f.id === rightId);
    if (!left || !right) continue;
    const pairShareFor = (fixture: (typeof PAIR_V5_FIXTURES)[number]) =>
      projectPairPublicShareV1({
        spec: buildPairFreeInsightSpecV2({
          answers: fixture.answers,
          answersV2: fixture.answers,
          pairAxisId: 'A2',
          personABirthDate: fixture.personA,
          personBBirthDate: fixture.personB,
          personAUsesFirstPerspective: true,
          focusLabel: fixture.focus,
          relationStatusId: fixture.id as RelationStatusId,
        }),
      }).shareTextJa.replace(/\s+/g, '');
    const leftNorm = pairShareFor(left);
    const rightNorm = pairShareFor(right);
    if (leftNorm === rightNorm) {
      throw new Error(`pair share duplicate: ${leftId} vs ${rightId}`);
    }
    const leftCard = projectPairPublicShareV1({
      spec: buildPairFreeInsightSpecV2({
        answers: left.answers,
        answersV2: left.answers,
        pairAxisId: 'A2',
        personABirthDate: left.personA,
        personBBirthDate: left.personB,
        personAUsesFirstPerspective: true,
        focusLabel: left.focus,
        relationStatusId: left.id as RelationStatusId,
      }),
    }).body.replace(/\s+/g, '');
    const rightCard = projectPairPublicShareV1({
      spec: buildPairFreeInsightSpecV2({
        answers: right.answers,
        answersV2: right.answers,
        pairAxisId: 'A2',
        personABirthDate: right.personA,
        personBBirthDate: right.personB,
        personAUsesFirstPerspective: true,
        focusLabel: right.focus,
        relationStatusId: right.id as RelationStatusId,
      }),
    }).body.replace(/\s+/g, '');
    if (leftCard === rightCard) {
      throw new Error(`pair share card duplicate: ${leftId} vs ${rightId}`);
    }
  }
}

export function checkPairManualSlotPerspective(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  if (item.sourceCategory !== 'pair_manual_slot') return [];
  if (item.variantIdentity.endsWith('.one_tends') || item.variantIdentity.endsWith('.other_tends')) {
    const coachingPattern =
      /進み方が近いときは|今夜は方向だけ置いて|噛み合いやすい|今の二人の速さだけを/;
    if (coachingPattern.test(item.semanticText)) {
      return [
        finding(
          item,
          'P1',
          'pair_manual_slot_perspective',
          'coaching/mesh copy in side-tendency slot',
          item.semanticText,
        ),
      ];
    }
  }
  return [];
}

export function checkPaidReportTone(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  if (item.surface !== 'self.premium.report.chapter') return [];
  const findings: ContentIntegrityFinding[] = [];
  for (const pattern of FORBIDDEN_PAID_TONE_FRAGMENTS) {
    if (pattern.test(item.semanticText)) {
      findings.push(
        finding(item, 'P1', 'paid_report_tone_fragment', pattern.source, item.semanticText),
      );
    }
  }
  return findings;
}

export function checkDigitalReportDeliveryWording(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  if (!FORBIDDEN_DELIVERY_WORDING.test(item.semanticText)) return [];
  return [
    finding(
      item,
      'P1',
      'digital_report_delivery_wording',
      'physical-delivery 配送処理 in digital report context',
      item.semanticText,
      'レポートの準備はこのまま続きます',
    ),
  ];
}

function normalizeChapterComponent(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[。、！？\n]/g, '')
    .toLowerCase();
}

export function checkPairPremiumChapterStructuralUniqueness(
  corpus: readonly ContentIntegrityCorpusItem[],
): ContentIntegrityFinding[] {
  const chapters = corpus.filter((item) => item.surface === 'pair.premium.report.chapter');
  if (chapters.length < 2) return [];
  const findings: ContentIntegrityFinding[] = [];
  const bodies = chapters.map((ch) => normalizeChapterComponent(ch.semanticText));
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i]!;
      const b = bodies[j]!;
      const shorter = a.length < b.length ? a : b;
      const longer = a.length < b.length ? b : a;
      if (shorter.length >= 120 && longer.includes(shorter)) {
        findings.push(
          finding(
            chapters[i]!,
            'P1',
            'pair_premium_chapter_duplication',
            `chapter body substantially contains another chapter (${chapters[j]!.variantIdentity})`,
            chapters[i]!.semanticText.slice(0, 120),
          ),
        );
        break;
      }
    }
  }
  return findings;
}

export function checkPremiumShareTierCollapse(
  corpus: readonly ContentIntegrityCorpusItem[],
): ContentIntegrityFinding[] {
  const premiumShare = corpus.find(
    (item) => item.surface === 'self.premium.share_card' && item.variantIdentity === 'premium_takeaway',
  );
  if (!premiumShare) return [];
  const freeHidden = corpus.filter(
    (item) =>
      item.surface === 'self.free.share_card_display' &&
      item.variantIdentity.endsWith('.heroJa') &&
      item.variantIdentity.includes('hidden_spec'),
  );
  const findings: ContentIntegrityFinding[] = [];
  for (const free of freeHidden) {
    const freeInsight = free.authoritySemanticText ?? free.semanticText;
    if (freeInsight && premiumShare.semanticText.trim() === freeInsight.trim()) {
      findings.push(
        finding(
          premiumShare,
          'P1',
          'premium_share_tier_collapse',
          `equals free hidden_spec hero (${free.variantIdentity})`,
          premiumShare.semanticText,
        ),
      );
      break;
    }
  }
  return findings;
}

export function checkPairPremiumFreeRestatement(
  corpus: readonly ContentIntegrityCorpusItem[],
): ContentIntegrityFinding[] {
  const paidSummary = corpus.find(
    (item) =>
      item.surface === 'pair.premium.report' &&
      item.sourceCategory === 'paid_compatibility_summary',
  );
  const freeBetween = corpus.find(
    (item) => item.surface === 'pair.free.result' && item.headingLabel === 'betweenThem',
  );
  if (!paidSummary || !freeBetween) return [];
  if (paidSummary.semanticText.includes(freeBetween.semanticText.slice(0, 48))) {
    return [
      finding(
        paidSummary,
        'P1',
        'pair_premium_free_restatement',
        'relationshipSummary restates free betweenThem opening',
        paidSummary.semanticText.slice(0, 120),
      ),
    ];
  }
  return [];
}

const PAIR_PREMIUM_BANNED_EXPERIMENT_CLOSER =
  '一回分の場面だけを見て、次も続けるかはそのあとで選びます。';

export function checkPairPremiumSharedExperimentCloser(
  corpus: readonly ContentIntegrityCorpusItem[],
): ContentIntegrityFinding[] {
  const chapters = corpus.filter((item) => item.surface === 'pair.premium.report.chapter');
  if (chapters.length < 6) return [];
  const hits = chapters.filter((chapter) =>
    chapter.semanticText.includes(PAIR_PREMIUM_BANNED_EXPERIMENT_CLOSER),
  );
  if (hits.length === 0) return [];
  return [
    finding(
      hits[0]!,
      'P1',
      'pair_premium_chapter_grammar',
      'identical banned experiment closer repeated across chapters',
      PAIR_PREMIUM_BANNED_EXPERIMENT_CLOSER,
    ),
  ];
}

export function checkPairPremiumActorBehaviorCollapse(
  corpus: readonly ContentIntegrityCorpusItem[],
): ContentIntegrityFinding[] {
  const chapters = corpus.filter((item) => item.surface === 'pair.premium.report.chapter');
  if (chapters.length < 6) return [];
  const actorLines = chapters.map((chapter) => {
    const lines = chapter.semanticText.split('\n');
    return `${lines[1] ?? ''}|${lines[2] ?? ''}`;
  });
  if (new Set(actorLines).size >= chapters.length) return [];
  return [
    finding(
      chapters[0]!,
      'P1',
      'pair_premium_chapter_duplication',
      'chapter A/B behavior scaffold collapsed across chapters',
      actorLines[0] ?? '',
    ),
  ];
}

export function checkMalformedPaidChapterGrammar(
  item: ContentIntegrityCorpusItem,
): ContentIntegrityFinding[] {
  if (item.surface !== 'pair.premium.report.chapter') return [];
  const patterns = [
    /やすいと受け取りやすい/,
    /続くことです/,
    /と受け取られる前に/,
    /整理しやすい先に/,
    /反応を出しやすい整えて/,
    /反応を出しやすい置き方/,
    /反応を出しやすい温度/,
    /反応を出しやすい反応/,
    /と決めてしまうと決め/,
    /と読みやすい読み方/,
    /と読みやすいと見えない/,
    /と読みやすいよう/,
    /と読みやすい偏りやすい/,
    /と受け取ることです/,
    /と受け取りやすいこと/,
    /続く合図が返りやすく/,
    /と見られないよう/,
    /やすいです。.*やすい/,
    /急かしに見えやすい/,
    /追い詰めに見えやすい/,
    /冷たさと読みやすい/,
    /可能性がある見え方があり/,
    /しようとする出やすいことがあります/,
    /可能性があります見え方/,
    /感じると感じやすい/,
  ];
  for (const pattern of patterns) {
    if (pattern.test(item.semanticText)) {
      return [
        finding(
          item,
          'P1',
          'pair_premium_chapter_grammar',
          pattern.source,
          item.semanticText,
        ),
      ];
    }
  }
  return [];
}

export function checkStaticPaidOpeningBarnum(
  item: ContentIntegrityCorpusItem,
): ContentIntegrityFinding[] {
  if (item.surface !== 'static.self.self.paid.report.body') return [];
  if (!item.variantIdentity.includes('opening.tendencyJa')) return [];
  const barnumPatterns = [/力があります/, /自然に場を変える影響力/];
  for (const pattern of barnumPatterns) {
    if (pattern.test(item.semanticText)) {
      return [
        finding(
          item,
          'P1',
          'static_paid_opening_barnum',
          pattern.source,
          item.semanticText,
        ),
      ];
    }
  }
  return [];
}

export function checkPaidCompositionContradiction(
  item: ContentIntegrityCorpusItem,
): ContentIntegrityFinding[] {
  if (item.surface !== 'self.premium.report.chapter') return [];
  if (item.variantIdentity !== 's2_composition') return [];
  if (/自己否定/.test(item.semanticText)) {
    return [
      finding(
        item,
        'P1',
        'paid_composition_contradiction',
        'unsupported psychological inference: 自己否定',
        item.semanticText.slice(0, 160),
      ),
    ];
  }
  if (/推進の勢い/.test(item.semanticText) && /確かめながら進み/.test(item.semanticText)) {
    return [];
  }
  const fastLaunchPatterns = [
    /推進の勢い/,
    /行動と言葉が先に出て/,
    /言葉や行動が先に出て/,
    /立ち上がりは対話に依存/,
    /感受が深い/,
    /周囲が乗る/,
  ];
  for (const pattern of fastLaunchPatterns) {
    if (pattern.test(item.semanticText)) {
      return [
        finding(
          item,
          'P1',
          'paid_composition_contradiction',
          pattern.source,
          item.semanticText.slice(0, 160),
        ),
      ];
    }
  }
  return [];
}

export function checkR2PairShareAmbiguousEnding(
  item: ContentIntegrityCorpusItem,
): ContentIntegrityFinding[] {
  if (item.surface !== 'pair.free.share_card' || item.variantIdentity !== 'R2') return [];
  const ambiguousPatterns = [
    /終わらせたい気持ち/,
    /終わらせたい気持ちと置いて考えたい気持ち/,
  ];
  for (const pattern of ambiguousPatterns) {
    if (pattern.test(item.semanticText)) {
      return [
        finding(
          item,
          'P1',
          'pair_r2_share_ambiguous_ending',
          pattern.source,
          item.semanticText,
        ),
      ];
    }
  }
  return [];
}

export function checkPairPremiumBoilerplateSignature(
  corpus: readonly ContentIntegrityCorpusItem[],
): ContentIntegrityFinding[] {
  const chapters = corpus.filter((item) => item.surface === 'pair.premium.report.chapter');
  if (chapters.length < 6) return [];
  const signature = 'ことが自然に見えます';
  const hits = chapters.filter((chapter) => chapter.semanticText.includes(signature));
  if (hits.length >= 4) {
    return [
      finding(
        hits[0]!,
        'P1',
        'pair_premium_boilerplate_signature',
        `${hits.length} chapters share boilerplate signature`,
        hits[0]!.semanticText.slice(0, 120),
      ),
    ];
  }
  return [];
}

export function checkPremiumOpenLoopCollapse(
  corpus: readonly ContentIntegrityCorpusItem[],
): ContentIntegrityFinding[] {
  const loops = corpus.filter((item) => item.itemId.endsWith('premiumOpenLoopJa'));
  const findings: ContentIntegrityFinding[] = [];
  const pairs: [string, string][] = [
    ['P1', 'P7'],
    ['P5', 'P6'],
  ];
  for (const [leftId, rightId] of pairs) {
    const left = loops.find((item) => item.variantIdentity === leftId);
    const right = loops.find((item) => item.variantIdentity === rightId);
    if (!left || !right) continue;
    if (left.semanticText === right.semanticText) {
      findings.push(
        finding(
          left,
          'P1',
          'premium_open_loop_collapse',
          `premiumOpenLoopJa identical for ${leftId} and ${rightId}`,
          left.semanticText.slice(0, 120),
        ),
      );
    }
  }
  return findings;
}

export function checkSemanticIntegrityItem(item: ContentIntegrityCorpusItem): ContentIntegrityFinding[] {
  return [
    ...checkPersonBSourceAnchorIdentity(item),
    ...checkSelfGeneratedAbstraction(item),
    ...checkPairShareSelfPerspective(item),
    ...checkPairShareCanonicalCta(item),
    ...checkPairBridgeRoboticLabels(item),
    ...checkPairPaidRoboticSideTemplate(item),
    ...checkDoubledTerminalPunctuation(item),
    ...checkNestedQuoteShareSerialization(item),
    ...checkPairFreeBrokenAbstraction(item),
    ...checkPairActorSideLabels(item),
    ...checkActorConsistencyFragments(item),
    ...checkPairManualSlotPerspective(item),
    ...checkPaidReportTone(item),
    ...checkDigitalReportDeliveryWording(item),
    ...checkMalformedPaidChapterGrammar(item),
    ...checkStaticPaidOpeningBarnum(item),
    ...checkPaidCompositionContradiction(item),
    ...checkR2PairShareAmbiguousEnding(item),
  ];
}

export function checkSemanticIntegrityCorpus(
  corpus: readonly ContentIntegrityCorpusItem[],
): ContentIntegrityFinding[] {
  const findings: ContentIntegrityFinding[] = [];
  for (const item of corpus) {
    findings.push(...checkSemanticIntegrityItem(item));
  }
  findings.push(...checkPairPremiumChapterStructuralUniqueness(corpus));
  findings.push(...checkPairPremiumSharedExperimentCloser(corpus));
  findings.push(...checkPairPremiumActorBehaviorCollapse(corpus));
  findings.push(...checkPremiumShareTierCollapse(corpus));
  findings.push(...checkPairPremiumFreeRestatement(corpus));
  findings.push(...checkCrossProfileShareDuplicate(corpus));
  findings.push(...checkPairPremiumBoilerplateSignature(corpus));
  findings.push(...checkPremiumOpenLoopCollapse(corpus));
  findings.push(...checkPairFreeAdjacentSectionDuplication());
  findings.push(...checkPairPaidGeneratorGrammarAcrossVariants());
  return findings;
}

function normalizeJaSentence(text: string): string {
  return text.replace(/[\s。．、,]/gu, '').trim();
}

function extractJaSentences(text: string): string[] {
  return text
    .split(/。+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 8);
}

function sharedNormalizedSentences(left: string, right: string): string[] {
  const leftSet = new Set(extractJaSentences(left).map(normalizeJaSentence));
  return extractJaSentences(right)
    .map(normalizeJaSentence)
    .filter((sentence) => leftSet.has(sentence));
}

const PAIR_PAID_GRAMMAR_BANNED = [
  /可能性がある見え方があり/,
  /しようとする出やすいことがあります/,
  /可能性があります見え方/,
  /感じると感じやすい/,
] as const;

const PAIR_PAID_ASSEMBLED_PROSE_BANNED = [
  /動きが見えやすい場面があります/,
  /受け取る場面があります/,
  /と感じやすい場面があります/,
  /場面があります。.*場面があります/,
] as const;

const PAIR_PAID_ACTIVE_PERCEPTION_PREDICATE =
  /(?:ように)?(?:受け取る|感じる|捉える|見える)(?:こと)?が(?:あります|ある|ります)|見えやすい(?:こと)?が(?:あります|ある)/u;

export function classifyPairPaidPerspectiveFrames(perspective: string): {
  subjectFrame: string;
  predicateFrame: string;
} {
  const sentences = extractJaSentences(perspective);
  const subjectFrames = new Set<string>();
  const predicateFrames = new Set<string>();
  for (const sentence of sentences) {
    const subjectMatch = /^(あなた|相手)(は|には)、/u.exec(sentence);
    if (subjectMatch) {
      subjectFrames.add(`${subjectMatch[1]}${subjectMatch[2]}`);
    } else if (/^相手については、/.test(sentence)) {
      subjectFrames.add('相手については');
    }
    if (PAIR_PAID_ACTIVE_PERCEPTION_PREDICATE.test(sentence)) {
      predicateFrames.add('active-perception');
    }
    if (/(?:受け取られる|感じられる|捉えられる|見られる)(?:こと)?が(?:あります|ある)/.test(sentence)) {
      predicateFrames.add('passive-perception');
    }
    if (/可能性があります/.test(sentence)) {
      predicateFrames.add('possibility');
    }
    if (/しようとすることがあります|したいことがあります|取りたいことがあります/.test(sentence)) {
      predicateFrames.add('active-action');
    }
  }
  return {
    subjectFrame: [...subjectFrames].join('|') || 'unknown',
    predicateFrame: [...predicateFrames].join('|') || 'unknown',
  };
}

export function incompatibleNihaActivePerception(perspective: string): string | null {
  for (const sentence of perspective
    .split(/。+/u)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)) {
    const match = /^(あなた|相手)には、(.+)$/u.exec(sentence);
    if (!match) continue;
    const [, actor, clause] = match;
    if (/可能性があります$/.test(clause)) continue;
    if (/(?:受け取られる|感じられる|捉えられる|見られる)(?:こと)?が(?:あります|ある)/.test(clause)) {
      continue;
    }
    if (PAIR_PAID_ACTIVE_PERCEPTION_PREDICATE.test(clause)) {
      return `incompatible ${actor}には + active perception predicate`;
    }
  }
  return null;
}

function pairPaidPerspectivePassesNaturalness(perspective: string): string | null {
  const nihaIssue = incompatibleNihaActivePerception(perspective);
  if (nihaIssue) return nihaIssue;
  for (const pattern of PAIR_PAID_ASSEMBLED_PROSE_BANNED) {
    if (pattern.test(perspective)) return pattern.source;
  }
  if (!/(あなた|相手)/.test(perspective)) return 'missing clear actor referent';
  if ((perspective.match(/場面があります/g) ?? []).length > 0) return '場面があります templated ending';
  if (!/。$/u.test(perspective.trim())) return 'incomplete sentence sequence';
  return null;
}

export function checkPairFreeAdjacentSectionDuplication(): ContentIntegrityFinding[] {
  const findings: ContentIntegrityFinding[] = [];
  for (const fixture of PAIR_V5_FIXTURES) {
    const spec = buildPairFreeInsightSpecV2({
      answers: fixture.answers,
      answersV2: fixture.answers,
      pairAxisId: 'A2',
      personABirthDate: fixture.personA,
      personBBirthDate: fixture.personB,
      personAUsesFirstPerspective: true,
      focusLabel: fixture.focus,
      relationStatusId: fixture.id as RelationStatusId,
    });
    const shared = sharedNormalizedSentences(spec.betweenThem, spec.currentExpressionJa);
    if (shared.length > 0 || normalizeJaSentence(spec.betweenThem) === normalizeJaSentence(spec.currentExpressionJa)) {
      const item: ContentIntegrityCorpusItem = {
        itemId: `pair.free.adjacent.${fixture.id}`,
        surface: 'pair.free.result',
        sourceCategory: 'pair_free_insight',
        variantIdentity: fixture.id,
        headingLabel: 'betweenThem|currentExpressionJa',
        semanticText: `${spec.betweenThem}\n---\n${spec.currentExpressionJa}`,
        sourceOwner: 'lib/m55/compatibility/pairFreeInsightSpecV2.ts',
      };
      findings.push(
        finding(
          item,
          'P1',
          'duplicate_adjacent_prose',
          shared[0] ?? 'identical adjacent sections',
          spec.betweenThem,
        ),
      );
    }
  }
  const guest = buildCompatibilityPublicResult(
    { personA: '1990-01-15', personB: '1992-08-20' },
    'R3',
    undefined,
    undefined,
    PAIR_V5_FIXTURES[0]!.answers,
  );
  if (guest.ok && guest.value.currentContext) {
    const dynamic = guest.value.free.relationshipDynamic;
    const expression = guest.value.currentContext.currentExpression;
    const shared = sharedNormalizedSentences(dynamic, expression);
    if (shared.length > 0 || normalizeJaSentence(dynamic) === normalizeJaSentence(expression)) {
      const item: ContentIntegrityCorpusItem = {
        itemId: 'pair.free.adjacent.guest.R3',
        surface: 'pair.free.result',
        sourceCategory: 'pair_free_insight',
        variantIdentity: 'R3.guest',
        headingLabel: 'relationshipDynamic|currentExpression',
        semanticText: `${dynamic}\n---\n${expression}`,
        sourceOwner: 'lib/m55/compatibility/pairReadingGuestResult.ts',
      };
      findings.push(
        finding(
          item,
          'P1',
          'duplicate_adjacent_prose',
          shared[0] ?? 'identical guest adjacent sections',
          dynamic,
        ),
      );
    }
  }
  return findings;
}

export function checkPairPaidGeneratorGrammarAcrossVariants(): ContentIntegrityFinding[] {
  const findings: ContentIntegrityFinding[] = [];
  const paidTopics = ['T1', 'T2', 'T3'] as const;
  for (const fixture of PAIR_V5_FIXTURES) {
    for (const paidTopicId of paidTopics) {
      const report = buildPaidCompatibilityReportV1({
        pairAxisId: 'A2',
        paidTopicId,
        relationStatusId: fixture.id as RelationStatusId,
        temperatureId: 'E0',
        personAUsesFirstPerspective: true,
        currentContext: fixture.answers,
        personABirthDate: fixture.personA,
        personBBirthDate: fixture.personB,
      });
      for (const [chapterIndex, chapter] of report.chapters.entries()) {
        for (const [role, perspective] of [
          ['A', chapter.personAPerspective],
          ['B', chapter.personBPerspective],
        ] as const) {
          const trimmed = perspective.trim();
          const item: ContentIntegrityCorpusItem = {
            itemId: `pair.paid.grammar.${fixture.id}.${paidTopicId}.ch${chapterIndex}.${role}`,
            surface: 'pair.premium.report.chapter',
            sourceCategory: 'pair_premium_report',
            variantIdentity: `${fixture.id}.${paidTopicId}.ch${chapterIndex}`,
            headingLabel: `chapter${chapterIndex}.${role}`,
            semanticText: perspective,
            sourceOwner: 'lib/m55/compatibility/buildPaidCompatibilityReportV1.ts',
          };
          if (!/。$/u.test(trimmed)) {
            findings.push(
              finding(
                item,
                'P1',
                'pair_premium_chapter_grammar',
                'incomplete consumer sentence sequence',
                perspective,
              ),
            );
            continue;
          }
          const assembled = pairPaidPerspectivePassesNaturalness(perspective);
          if (assembled) {
            findings.push(
              finding(
                item,
                'P1',
                'pair_premium_chapter_grammar',
                assembled,
                perspective,
              ),
            );
            continue;
          }
          for (const pattern of PAIR_PAID_GRAMMAR_BANNED) {
            if (pattern.test(perspective)) {
              findings.push(
                finding(
                  item,
                  'P1',
                  'pair_premium_chapter_grammar',
                  pattern.source,
                  perspective,
                ),
              );
              break;
            }
          }
        }
      }
    }
  }
  return findings;
}

export function assertPairFreeAdjacentSectionsDistinct(): void {
  const findings = checkPairFreeAdjacentSectionDuplication();
  if (findings.length > 0) {
    throw new Error(findings.map((f) => f.deterministicEvidence).join('; '));
  }
}

export function assertPairPaidGeneratorGrammarInvariant(): void {
  const findings = checkPairPaidGeneratorGrammarAcrossVariants();
  if (findings.length > 0) {
    throw new Error(findings.map((f) => f.deterministicEvidence).join('; '));
  }
}

export function assertPaidChapterComponentUniquenessForFixture(): void {
  const fixture = PAIR_V5_FIXTURES[0]!;
  const report = buildPaidCompatibilityReportV1({
    pairAxisId: 'A2',
    paidTopicId: 'T3',
    relationStatusId: 'R2',
    temperatureId: 'E0',
    personAUsesFirstPerspective: true,
    currentContext: fixture.answers,
    personABirthDate: fixture.personA,
    personBBirthDate: fixture.personB,
  });
  const scenes = new Set(report.chapters.map((ch) => ch.scene));
  const experiments = new Set(report.chapters.map((ch) => ch.smallExperiment));
  const actorPairs = new Set(
    report.chapters.map((ch) => `${ch.personAPerspective}|${ch.personBPerspective}`),
  );
  const mechanisms = new Set(report.chapters.map((ch) => ch.relationshipLoop.join('\n')));
  if (
    scenes.size < report.chapters.length ||
    experiments.size < report.chapters.length ||
    actorPairs.size < report.chapters.length ||
    mechanisms.size < report.chapters.length
  ) {
    throw new Error('pair premium chapters lack structural uniqueness');
  }
  if (
    report.chapters.some((chapter) =>
      chapter.smallExperiment.includes(PAIR_PREMIUM_BANNED_EXPERIMENT_CLOSER),
    )
  ) {
    throw new Error('pair premium chapters share banned experiment closer');
  }
}

export function assertPremiumShareDiffersFromFreeHiddenSpec(input: {
  answerAxes: ExpressionAxes;
  birthAxes: ExpressionAxes;
  premiumTakeawayJa: string;
}): void {
  const freeHidden = hiddenSpecLine(input.birthAxes, input.answerAxes);
  const premiumCard = reconstructPersonalPublicCard({
    variant: 'premium_takeaway',
    answerAxes: input.answerAxes,
    birthAxes: input.birthAxes,
    hingeAxisId: 'decision',
    premiumTakeawayJa: input.premiumTakeawayJa,
  });
  if (!premiumCard) throw new Error('premium card missing');
  if (premiumCard.insightJa.trim() === freeHidden.trim()) {
    throw new Error('premium share collapsed to free hidden_spec');
  }
}
