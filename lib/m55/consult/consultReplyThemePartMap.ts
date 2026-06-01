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

const THEME_PART_MAP: Record<string, ConsultReplyPartInfo> = {
  近い人との距離: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  言葉を選びすぎてしまう場面: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  断れなかったあとの疲れ: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  平気なふりをしてしまうとき: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  ひとりで戻る時間の作り方: { roman: 'Ⅳ', name: '楽に扱う', anchor: 'section-practice' },
};

type ThemeLensConfig = {
  part: ConsultReplyPartInfo;
  visualKind: Exclude<ConsultReplyVisualKind, 'balance'>;
  lensRows: ConsultReplyLensRow[];
};

const THEME_LENS_MAP: Record<string, ThemeLensConfig> = {
  近い人との距離: {
    part: THEME_PART_MAP['近い人との距離']!,
    visualKind: 'communication',
    lensRows: [
      { label: '受け取り' },
      { label: '伝え方' },
      { label: '距離の取り方' },
      { label: '会話のリズム' },
    ],
  },
  言葉を選びすぎてしまう場面: {
    part: THEME_PART_MAP['言葉を選びすぎてしまう場面']!,
    visualKind: 'communication',
    lensRows: [
      { label: '受け取り方' },
      { label: '伝え方' },
      { label: '誤解されやすさ' },
      { label: '返すタイミング' },
    ],
  },
  断れなかったあとの疲れ: {
    part: THEME_PART_MAP['断れなかったあとの疲れ']!,
    visualKind: 'strain',
    lensRows: [
      { label: '歩調を合わせすぎる' },
      { label: '疲れが残る' },
      { label: '断る前に消耗する' },
    ],
  },
  平気なふりをしてしまうとき: {
    part: THEME_PART_MAP['平気なふりをしてしまうとき']!,
    visualKind: 'strain',
    lensRows: [
      { label: '外に出すタイミング' },
      { label: '整える前に合わせる' },
      { label: 'あとから疲れる' },
    ],
  },
  ひとりで戻る時間の作り方: {
    part: THEME_PART_MAP['ひとりで戻る時間の作り方']!,
    visualKind: 'stability',
    lensRows: [
      { label: '集中できる時間' },
      { label: '守りやすい締切' },
      { label: 'ひとりで整える余白' },
    ],
  },
};

const BALANCE_LENS: ConsultReplyLensInfo = {
  ...DEFAULT_PART,
  visualKind: 'balance',
  lensTitle: '保存版のベース傾向',
  lensCaption: '今回の相談の主役ではなく、保存版全体の傾向の補助です。',
  lensRows: [],
  showBaseRadar: true,
  baseRadarTitle: '保存版のベース傾向',
  baseRadarCaption: '今回の相談の主役ではなく、保存版全体の傾向の補助です。',
};

const LENS_CAPTION_BY_KIND: Record<Exclude<ConsultReplyVisualKind, 'balance'>, string> = {
  communication:
    '保存版の対話の章に沿って、今回の相談で見る流れです。新しい診断ではなく、読み返す目安です。',
  strain:
    '保存版の無理の出方に沿って、今回の相談で見る条件です。新しい診断ではなく、読み返す目安です。',
  stability:
    '保存版の戻し方に沿って、今回の相談で整えやすい余白です。新しい診断ではなく、読み返す目安です。',
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
    lensTitle: '今回の相談で見るところ',
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
