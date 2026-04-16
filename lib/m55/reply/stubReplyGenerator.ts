import type { ReplyPayloadV11 } from './types';

const TEMPLATE_BY_MODE: Record<string, Omit<ReplyPayloadV11, 'theme' | 'version'>> = {
  guided: {
    issue_summary:
      'いまは前に進みたい気持ちと、判断を止める要素が同時に重なっている状態です。',
    current_flow:
      '方向は見えていても、調整や切り替えが続くほど手元の整理より先に疲労が積み上がりやすい流れです。',
    background_tendency:
      '丁寧に見通しを作って進める傾向があるため、変化が増える局面では本来の強みが発揮しづらくなりやすいです。',
    load_point:
      '負荷は、優先順位の更新と対人調整が同時に発生する場面に集中しやすいです。',
    first_step:
      'まずは今日の判断を一段階だけに絞り、次に見る論点を先に決めてから着手してください。',
    next_question:
      '今の停滞は、情報不足よりも判断の迷いで起きていますか。',
    supporting_axes: [4, 0],
    caution_note:
      '余力が薄いまま複数の意思決定を重ねると、後で整え直しの負荷が増えやすいです。',
    tone_label: 'steady',
    followup_prompts: ['今いちばん重い場面はどこですか。'],
  },
  free: {
    issue_summary: '気持ちの整理より先に課題が積み重なり、着手の順序が見えづらい状態です。',
    current_flow:
      'やることが複数並ぶほど、どれも中途半端に感じて停止しやすい流れが出ています。',
    background_tendency:
      '全体の整合を重視する傾向があるため、前提が揺れる場面では動き出しまでに負荷がかかりやすいです。',
    load_point:
      '負荷は、短時間で結論を求められる場面と見直し作業の重なりに集まりやすいです。',
    first_step:
      'まずは一つだけ完了条件を明確にし、今日中に閉じる対象を先に決めてください。',
    next_question:
      'いま最も負担が大きいのは、量の多さですか、それとも決める難しさですか。',
    supporting_axes: [0, 3],
    caution_note:
      '目的を増やしすぎると焦点が散り、結果的に回復に時間がかかりやすくなります。',
    tone_label: 'calm',
    followup_prompts: ['今日中に閉じたい対象を一つ挙げると何ですか。'],
  },
};

function selectBaseTemplate(inputMode: string) {
  return TEMPLATE_BY_MODE[inputMode] ?? TEMPLATE_BY_MODE.free;
}

export function generateStubReplyPayload(params: {
  theme: string;
  inputMode: string;
  selectedSubquestions: string[];
  freeText: string | null;
}): ReplyPayloadV11 {
  const base = selectBaseTemplate(params.inputMode);
  const followupPrompts = params.selectedSubquestions.slice(0, 3);

  if (followupPrompts.length === 0) {
    followupPrompts.push(...(base.followup_prompts ?? []).slice(0, 3));
  }

  const firstStep = params.freeText
    ? base.first_step
    : '自由入力が未記入でも進められるよう、まず一つだけ着手対象を決めて見通しを戻してください。';

  return {
    theme: params.theme,
    issue_summary: base.issue_summary,
    current_flow: base.current_flow,
    background_tendency: base.background_tendency,
    load_point: base.load_point,
    first_step: firstStep,
    next_question: base.next_question,
    supporting_axes: base.supporting_axes,
    caution_note: base.caution_note,
    tone_label: base.tone_label,
    followup_prompts: followupPrompts,
    version: '1.1',
  };
}
