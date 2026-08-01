/**
 * Canonical trait identity — single source for free result, share, OG, Premium intro.
 * No DOB, nickname, answers, or private result content.
 *
 * Each trait is one semantic chain: name → tagline → recognition → premium continuity.
 * Sentence forms may differ across surfaces; person/behavior meaning must not.
 */
import { TEN_STEM_DISPLAY } from '../tenStemCatalog';
import { STEM_LANE_TEN_VIEWS_IMAGE } from '../publicStemDisplay';

export type TraitIdentity = {
  stemLaneIndex: number;
  traitName: string;
  /** Canonical identity line (Experience Control Plane). */
  identityLine: string;
  /** Short memorable identity — result/share hero line. */
  canonicalTagline: string;
  /** Alias; equals canonicalTagline. */
  tagline: string;
  /** Alias kept for callers; equals canonicalTagline. */
  shortStatement: string;
  /** Alias kept for callers; equals canonicalTagline. */
  longDescription: string;
  /** Distinct concrete recognition — must not paraphrase the tagline. */
  shareStatement: string;
  /** Alias for share recognition. */
  recognitionStatement: string;
  /** Shared-entry recipient-facing line (same meaning, recipient grammar). */
  sharedEntryStatement: string;
  /** Evidence framing templates for result reasons (plain language). */
  evidenceTemplates: readonly [string, string];
  /** Scene framing templates (work / relation). */
  sceneTemplates: readonly [string, string];
  imagePath: string;
  image: string;
  accent: string;
  premiumContinuityTemplate: string;
  premiumContinuation: string;
};

const TRAIT_ACCENTS: readonly string[] = [
  '#4a6741',
  '#5c6b8a',
  '#c47a2c',
  '#6b4f7a',
  '#5a6b72',
  '#7a6b4f',
  '#4f5a7a',
  '#8a6b7a',
  '#3d6b8a',
  '#5a5a72',
];

/**
 * Conversation-ready identity lines — one credible person per trait.
 * Index aligns with TEN_STEM_DISPLAY / stem lane 0–9.
 */
const CANONICAL_TAGLINES: readonly string[] = [
  '自分の進め方が見えたときに、力が出やすい人',
  '人との距離や流れを読み、受け渡しを整えやすい人',
  '近い人との場の空気を読み、動き出しやすくする人',
  '材料を集め、比べながら形を整えていく人',
  '日々のリズムを整え、崩れにくい土台を守りやすい人',
  'まだ形になる前のものを見つけ、育てて形にする人',
  '方針が固まったときに、迷いなく動き出しやすい人',
  '細かな違和感に気づき、納得できる形まで整えやすい人',
  'いつもの枠を越え、新しいつながりをひらきやすい人',
  '全体を見渡し、つながりを整えてから動く人',
];

/**
 * Distinct recognition statements — same person as tagline, different grammar.
 * Must not be a near-copy of CANONICAL_TAGLINES.
 */
const SHARE_STATEMENTS: readonly string[] = [
  '進め方がはっきりした場面で、静かに前へ出やすくなります。',
  '人との間のタイミングを見ながら、受け渡しを整えやすくなります。',
  '近い人の空気が読めると、場の一歩目を出しやすくなります。',
  '答えを急ぐより、材料と候補がそろったときに形が見えやすくなります。',
  '日々の区切りを保つほど、崩れにくい土台を守りやすくなります。',
  'まだはっきりしないものを拾い、育てて形にしやすくなります。',
  '方針が固まったあとは、迷いを残さず動き出しやすくなります。',
  '小さな違和感を見逃さず、納得できる形まで整えやすくなります。',
  'いつもの枠の外に目を向けると、新しいつながりをひらきやすくなります。',
  '急いで動くより、全体と選択肢が見えたときに選びやすくなります。',
];

const EVIDENCE_TEMPLATES: readonly (readonly [string, string])[] = [
  ['進め方の答えが、いまの動き方に重なっていました。', '人との関わりでも、同じ整え方が表れやすいです。'],
  ['受け渡しや距離の答えが、いまの関わり方に重なっていました。', '変化の場面でも、タイミングを見てから整える傾向があります。'],
  ['近い人との場づくりの答えが、いまの動き出しに重なっていました。', '空気が読めたときに、一歩目を出しやすい読みです。'],
  ['材料を集める答えと、比べてから形にする答えが重なっていました。', '急がず候補をそろえてから決める動きが出やすいです。'],
  ['日々のリズムを守る答えが、いまの土台づくりに重なっていました。', '区切りがあるほど、崩れにくさを保ちやすい読みです。'],
  ['まだ形になる前のものを拾う答えが、いまの育て方に重なっていました。', 'はっきりしない段階から形にしていく動きが出やすいです。'],
  ['方針が固まるまでの答えと、固まったあとの動きがつながっていました。', '迷いが晴れたあとに前へ出やすい読みです。'],
  ['細かな違和感に気づく答えが、いまの整え方に重なっていました。', '納得できる形まで直していく動きが出やすいです。'],
  ['枠の外を見る答えが、いまのつながり方に重なっていました。', '新しい接点をひらきやすい場面が出てきます。'],
  ['全体を見てから選ぶ答えと、候補を比べる答えが重なっていました。', '人との距離や予定の変化でも、いったん見直してから整える傾向があります。'],
];

const SCENE_TEMPLATES: readonly (readonly [string, string])[] = [
  ['仕事では、進め方が見えると着手しやすくなります。', '関係では、役割の受け渡しがはっきりすると動きやすいです。'],
  ['仕事では、タイミングを見てから渡すと進みやすいです。', '関係では、距離を整えながら続ける場面が出やすいです。'],
  ['仕事では、場の空気が整うと提案しやすくなります。', '関係では、近い人の一歩目を支えやすいです。'],
  ['仕事では、材料がそろうと形が見えやすくなります。', '関係では、候補を比べてから返事しやすいです。'],
  ['仕事では、日々の区切りがあると続きやすいです。', '関係では、リズムが保たれると安心しやすいです。'],
  ['仕事では、未完成の案を育てる場面が出やすいです。', '関係では、まだ言葉にならない気配を拾いやすいです。'],
  ['仕事では、方針確定後に一気に進めやすいです。', '関係では、決めたあとに迷いを残しにくいです。'],
  ['仕事では、細部の違和感を直してから提出しやすいです。', '関係では、納得できる形まで整えやすいです。'],
  ['仕事では、いつもの枠の外に接点を見つけやすいです。', '関係では、新しいつながりをひらきやすいです。'],
  ['仕事では、全体と候補が見えてから決めやすいです。', '関係では、状況を見直してから距離を整えやすいです。'],
];

function buildPremiumContinuityTemplate(traitName: string): string {
  return `「${traitName}」の結果を、さらに深く読み解く`;
}

export const TRAIT_IDENTITY_CATALOG: readonly TraitIdentity[] = TEN_STEM_DISPLAY.map(
  (stem, stemLaneIndex) => {
    const tagline = CANONICAL_TAGLINES[stemLaneIndex] ?? stem.displayOneLine;
    const recognition = SHARE_STATEMENTS[stemLaneIndex] ?? `${tagline}。`;
    const continuity = buildPremiumContinuityTemplate(stem.publicTitle);
    const imagePath = STEM_LANE_TEN_VIEWS_IMAGE[stemLaneIndex] ?? '/ten-views/analyst.webp';
    const evidence = EVIDENCE_TEMPLATES[stemLaneIndex] ?? [
      'いまの回答が、動き方に重なっていました。',
      '場面が変わっても、同じ整え方が表れやすいです。',
    ];
    const scenes = SCENE_TEMPLATES[stemLaneIndex] ?? [
      '仕事では、同じ動きが出やすいです。',
      '関係では、同じ整え方が表れやすいです。',
    ];
    return {
      stemLaneIndex,
      traitName: stem.publicTitle,
      identityLine: tagline,
      canonicalTagline: tagline,
      tagline,
      shortStatement: tagline,
      longDescription: tagline,
      shareStatement: recognition,
      recognitionStatement: recognition,
      sharedEntryStatement: recognition,
      evidenceTemplates: evidence,
      sceneTemplates: scenes,
      imagePath,
      image: imagePath,
      accent: TRAIT_ACCENTS[stemLaneIndex] ?? '#5a5a72',
      premiumContinuityTemplate: continuity,
      premiumContinuation: continuity,
    };
  },
);

export function resolveTraitIdentity(stemLaneIndex: number): TraitIdentity | null {
  const idx = ((stemLaneIndex % 10) + 10) % 10;
  return TRAIT_IDENTITY_CATALOG[idx] ?? null;
}

export function assertTraitIdentityCatalogComplete(): void {
  if (TRAIT_IDENTITY_CATALOG.length !== 10) {
    throw new Error(`trait catalog incomplete: expected 10, got ${TRAIT_IDENTITY_CATALOG.length}`);
  }
  for (const trait of TRAIT_IDENTITY_CATALOG) {
    for (const key of [
      'traitName',
      'identityLine',
      'canonicalTagline',
      'tagline',
      'shortStatement',
      'longDescription',
      'imagePath',
      'image',
      'accent',
      'shareStatement',
      'recognitionStatement',
      'sharedEntryStatement',
      'premiumContinuityTemplate',
      'premiumContinuation',
    ] as const) {
      const value = trait[key];
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`trait ${trait.stemLaneIndex} missing ${key}`);
      }
    }
    // Tagline and recognition must not be the same sentence form.
    const normalize = (s: string) =>
      s.replace(/[。、\s]|人$|傾向があります|やすくなります/g, '');
    if (normalize(trait.canonicalTagline) === normalize(trait.shareStatement)) {
      throw new Error(
        `trait ${trait.stemLaneIndex} (${trait.traitName}) tagline/shareStatement identical`,
      );
    }
    if (!Array.isArray(trait.evidenceTemplates) || trait.evidenceTemplates.length !== 2) {
      throw new Error(`trait ${trait.stemLaneIndex} evidenceTemplates must be length 2`);
    }
    if (!Array.isArray(trait.sceneTemplates) || trait.sceneTemplates.length !== 2) {
      throw new Error(`trait ${trait.stemLaneIndex} sceneTemplates must be length 2`);
    }
    for (const line of [...trait.evidenceTemplates, ...trait.sceneTemplates]) {
      if (typeof line !== 'string' || line.trim().length === 0) {
        throw new Error(`trait ${trait.stemLaneIndex} empty evidence/scene template`);
      }
    }
  }
}
