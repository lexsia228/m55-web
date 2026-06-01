import { PAID_DTR_CONSULT_REPLY } from '../paidDtrProductCopy';

export type ConsultReplyPartInfo = {
  roman: 'Ⅰ' | 'Ⅱ' | 'Ⅲ' | 'Ⅳ';
  name: string;
  anchor: 'section-overview' | 'section-structure' | 'section-strain' | 'section-practice';
};

const DEFAULT_PART: ConsultReplyPartInfo = {
  roman: 'Ⅲ',
  name: '無理を知る',
  anchor: 'section-strain',
};

const MAP: Record<string, ConsultReplyPartInfo> = {
  近い人との距離: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  言葉を選びすぎてしまう場面: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  断れなかったあとの疲れ: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  平気なふりをしてしまうとき: { roman: 'Ⅲ', name: '無理を知る', anchor: 'section-strain' },
  ひとりで戻る時間の作り方: { roman: 'Ⅱ', name: '構造を読む', anchor: 'section-structure' },
};

export function resolveConsultReplyPartByTheme(theme: string | null): ConsultReplyPartInfo {
  if (!theme) return DEFAULT_PART;
  return MAP[theme] ?? DEFAULT_PART;
}

export function isKnownConsultTheme(theme: string): theme is (typeof PAID_DTR_CONSULT_REPLY.themeExamplesJa)[number] {
  return PAID_DTR_CONSULT_REPLY.themeExamplesJa.includes(
    theme as (typeof PAID_DTR_CONSULT_REPLY.themeExamplesJa)[number]
  );
}
