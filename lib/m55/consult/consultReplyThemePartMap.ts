import { PAID_DTR_CONSULT_REPLY } from '../paidDtrProductCopy';

export type ConsultReplyVisualKind = 'communication' | 'strain' | 'stability' | 'balance';

export type ConsultReplyPartInfo = {
  roman: 'Ⅰ' | 'Ⅱ' | 'Ⅲ' | 'Ⅳ';
  name: string;
  anchor: 'section-overview' | 'section-structure' | 'section-strain' | 'section-practice';
};

export type ConsultReplyLensRow = {
  label: string;
};

export type ConsultReplyLensInfo = ConsultReplyPartInfo & {
  visualKind: ConsultReplyVisualKind;
  lensTitle: string;
  lensCaption: string;
  lensRows: ConsultReplyLensRow[];
  showBaseRadar: boolean;
  baseRadarTitle: string;
  baseRadarCaption: string;
};

const DEFAULT_PART: ConsultReplyPartInfo = {
  roman: 'Ⅲ',
  name: '無理を知る',
  anchor: 'section-strain',
};

/** Current Step 1 chips (Product Truth themeExamplesJa). */
const PRIMARY_THEME_PART_MAP: Record<string, ConsultReplyPartInfo> = {
  '恋人・近い人との向き合い方': { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  '仕事・これからの進め方': { roman: 'Ⅱ', name: '構造を読む', anchor: 'section-structure' },
  'お金・生活・疲れの整え方': { roman: 'Ⅳ', name: '楽に扱う', anchor: 'section-practice' },
  'これからの動き方': { roman: 'Ⅱ', name: '構造を読む', anchor: 'section-structure' },
  '疲れたときの戻り方': { roman: 'Ⅳ', name: '楽に扱う', anchor: 'section-practice' },
};

/** Renamed theme labels — resolve legacy stored user messages. */
const RENAMED_THEME_PART_ALIASES: Record<string, string> = {
  '仕事・スキルの伸ばし方': '仕事・これからの進め方',
  'お金・生活の整え方': 'お金・生活・疲れの整え方',
};

/** Legacy themes stored in past consult messages (not shown as new chips). */
const LEGACY_THEME_PART_MAP: Record<string, ConsultReplyPartInfo> = {
  近い人との距離: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  言葉を選びすぎてしまう場面: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  断れなかったあとの疲れ: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  平気なふりをしてしまうとき: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  ひとりで戻る時間の作り方: { roman: 'Ⅳ', name: '楽に扱う', anchor: 'section-practice' },
};

const THEME_PART_MAP: Record<string, ConsultReplyPartInfo> = {
  ...PRIMARY_THEME_PART_MAP,
  ...LEGACY_THEME_PART_MAP,
  ...Object.fromEntries(
    Object.entries(RENAMED_THEME_PART_ALIASES).map(([legacy, canonical]) => [
      legacy,
      PRIMARY_THEME_PART_MAP[canonical]!,
    ]),
  ),
};

type ThemeLensConfig = {
  part: ConsultReplyPartInfo;
  visualKind: Exclude<ConsultReplyVisualKind, 'balance'>;
  lensRows: ConsultReplyLensRow[];
};

const PRIMARY_THEME_LENS_MAP: Record<string, ThemeLensConfig> = {
  '恋人・近い人との向き合い方': {
    part: PRIMARY_THEME_PART_MAP['恋人・近い人との向き合い方']!,
    visualKind: 'communication',
    lensRows: [
      { label: '受け取り' },
      { label: '伝え方' },
      { label: '距離' },
      { label: '会話のリズム' },
    ],
  },
  '仕事・これからの進め方': {
    part: PRIMARY_THEME_PART_MAP['仕事・これからの進め方']!,
    visualKind: 'stability',
    lensRows: [
      { label: '動きやすい場面' },
      { label: '何から始めるか' },
      { label: '無理の少ない進め方' },
      { label: '今日小さく整えること' },
    ],
  },
  'お金・生活・疲れの整え方': {
    part: PRIMARY_THEME_PART_MAP['お金・生活・疲れの整え方']!,
    visualKind: 'stability',
    lensRows: [
      { label: '生活リズム' },
      { label: '心配の出方' },
      { label: '使い方の整理' },
      { label: '休む余白' },
    ],
  },
  'これからの動き方': {
    part: PRIMARY_THEME_PART_MAP['これからの動き方']!,
    visualKind: 'stability',
    lensRows: [
      { label: '何から始めるか' },
      { label: '選び方' },
      { label: '迷いの整理' },
      { label: '次の一手' },
    ],
  },
  '疲れたときの戻り方': {
    part: PRIMARY_THEME_PART_MAP['疲れたときの戻り方']!,
    visualKind: 'stability',
    lensRows: [
      { label: '集中できる時間' },
      { label: '守りやすい締切' },
      { label: '整える余白' },
    ],
  },
};

const LEGACY_THEME_LENS_MAP: Record<string, ThemeLensConfig> = {
  近い人との距離: {
    part: LEGACY_THEME_PART_MAP['近い人との距離']!,
    visualKind: 'communication',
    lensRows: [
      { label: '受け取り' },
      { label: '伝え方' },
      { label: '距離の取り方' },
      { label: '会話のリズム' },
    ],
  },
  言葉を選びすぎてしまう場面: {
    part: LEGACY_THEME_PART_MAP['言葉を選びすぎてしまう場面']!,
    visualKind: 'communication',
    lensRows: [
      { label: '受け取り方' },
      { label: '伝え方' },
      { label: '誤解されやすさ' },
      { label: '返すタイミング' },
    ],
  },
  断れなかったあとの疲れ: {
    part: LEGACY_THEME_PART_MAP['断れなかったあとの疲れ']!,
    visualKind: 'strain',
    lensRows: [
      { label: '歩調を合わせすぎる' },
      { label: '疲れが残る' },
      { label: '断る前に疲れがたまる' },
    ],
  },
  平気なふりをしてしまうとき: {
    part: LEGACY_THEME_PART_MAP['平気なふりをしてしまうとき']!,
    visualKind: 'strain',
    lensRows: [
      { label: '外に出すタイミング' },
      { label: '整える前に合わせる' },
      { label: 'あとから疲れる' },
    ],
  },
  ひとりで戻る時間の作り方: {
    part: LEGACY_THEME_PART_MAP['ひとりで戻る時間の作り方']!,
    visualKind: 'stability',
    lensRows: [
      { label: '集中できる時間' },
      { label: '守りやすい締切' },
      { label: 'ひとりで整える余白' },
    ],
  },
};

const THEME_LENS_MAP: Record<string, ThemeLensConfig> = {
  ...PRIMARY_THEME_LENS_MAP,
  ...LEGACY_THEME_LENS_MAP,
  ...Object.fromEntries(
    Object.entries(RENAMED_THEME_PART_ALIASES).map(([legacy, canonical]) => [
      legacy,
      PRIMARY_THEME_LENS_MAP[canonical]!,
    ]),
  ),
};

const BALANCE_LENS: ConsultReplyLensInfo = {
  ...DEFAULT_PART,
  visualKind: 'balance',
  lensTitle: 'プレミアムレポートのベース傾向',
  lensCaption: 'この相談の主役ではなく、プレミアムレポート全体の傾向の補助です。',
  lensRows: [],
  showBaseRadar: true,
  baseRadarTitle: 'プレミアムレポートのベース傾向',
  baseRadarCaption: 'この相談の主役ではなく、プレミアムレポート全体の傾向の補助です。',
};

const LENS_CAPTION_BY_KIND: Record<Exclude<ConsultReplyVisualKind, 'balance'>, string> = {
  communication:
    'プレミアムレポートの対話の章に沿って、この相談で読む流れです。新しい診断ではなく、読み返す目安です。',
  strain:
    'プレミアムレポートの無理の出方に沿って、この相談で読む条件です。新しい診断ではなく、読み返す目安です。',
  stability:
    'プレミアムレポートの戻し方に沿って、この相談で整えやすい余白です。新しい診断ではなく、読み返す目安です。',
};

export function resolveConsultReplyPartByTheme(theme: string | null): ConsultReplyPartInfo {
  if (!theme) return DEFAULT_PART;
  return THEME_PART_MAP[theme] ?? DEFAULT_PART;
}

export function resolveConsultReplyLensByTheme(theme: string | null): ConsultReplyLensInfo {
  if (!theme) return BALANCE_LENS;

  const themed = THEME_LENS_MAP[theme];
  if (!themed) return BALANCE_LENS;

  return {
    ...themed.part,
    visualKind: themed.visualKind,
    lensTitle: 'この相談で見返すところ',
    lensCaption: LENS_CAPTION_BY_KIND[themed.visualKind],
    lensRows: themed.lensRows,
    showBaseRadar: false,
    baseRadarTitle: BALANCE_LENS.baseRadarTitle,
    baseRadarCaption: BALANCE_LENS.baseRadarCaption,
  };
}

export function isKnownConsultTheme(theme: string): theme is (typeof PAID_DTR_CONSULT_REPLY.themeExamplesJa)[number] {
  return PAID_DTR_CONSULT_REPLY.themeExamplesJa.includes(
    theme as (typeof PAID_DTR_CONSULT_REPLY.themeExamplesJa)[number]
  );
}

/** Past messages only: resolve lens for legacy theme strings not in current chips. */
export function isLegacyConsultTheme(theme: string): boolean {
  return theme in LEGACY_THEME_PART_MAP && !(theme in PRIMARY_THEME_PART_MAP);
}

/**
 * Display-only next-use theme suggestions per theme bucket.
 * Shown in expanded reply card to help user plan remaining tickets.
 * No ticket consumption — read-only guidance.
 */
export const CONSULT_REPLY_NEXT_USE_SUGGESTIONS: Record<string, readonly string[]> = {
  '仕事・これからの進め方': [
    '返事がない相手との距離の取り方',
    '疲れた日の仕事量の下げ方',
    '伝え方を短くする練習',
    '今の進め方を続けるか、一度整えるか',
  ],
  'これからの動き方': [
    '次の一手を1つに絞る方法',
    '迷いが続くときの小さな整え方',
    '判断を急がないための目安',
    'プレミアムレポートの傾向を今の状況に当てる',
  ],
  '恋人・近い人との向き合い方': [
    '反応がない相手との距離の取り方',
    '言葉を選びすぎてしまう場面',
    '伝えたいのに届かないときの整え方',
    '近い人と疲れずにいる距離感',
  ],
  'お金・生活・疲れの整え方': [
    '疲れた日の仕事量の下げ方',
    'ひとりで戻る時間の作り方',
    '心配が続くときの小さな区切り方',
    '生活のリズムを整える最初の一手',
  ],
  '疲れたときの戻り方': [
    '疲れが出やすい場面と戻り方',
    '休んでも戻れないときの整え方',
    'ひとりで戻る時間の作り方',
    'プレミアムレポートの傾向から疲れの出方を読む',
  ],
};

const DEFAULT_NEXT_USE_SUGGESTIONS: readonly string[] = [
  '今回の続きとして気になること',
  '疲れた日の小さな戻し方',
  '近い人との距離の整え方',
  '次の一手を1つに絞る',
];

/** Resolve next-use suggestions for display (fallback to generic if theme unknown). */
export function resolveConsultReplyNextUseSuggestions(theme: string | null): readonly string[] {
  if (!theme) return DEFAULT_NEXT_USE_SUGGESTIONS;
  const canonical = RENAMED_THEME_PART_ALIASES[theme] ?? theme;
  return CONSULT_REPLY_NEXT_USE_SUGGESTIONS[canonical] ?? DEFAULT_NEXT_USE_SUGGESTIONS;
}
