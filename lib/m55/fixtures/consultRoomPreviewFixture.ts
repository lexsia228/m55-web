/**
 * Dev-only consult room display fixtures for /dev/dtr-drawer-preview.
 * Does not call /api/room/core — no DB, wallet mutation, or checkout.
 */
import { PAID_DTR_CONSULT_REPLY } from '../paidDtrProductCopy';

export type ConsultRoomPreviewWalletScenario =
  | 'available'
  | 'purchase'
  | 'exhausted'
  | 'history';

export type ConsultRoomPreviewRoomData = {
  thread: {
    credits_total: number;
    credits_remaining: number;
    state: 'writable' | 'read_only';
  };
  messages: Array<{
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    created_at?: string;
  }>;
  effective_credits_remaining?: number;
  effective_state?: 'writable' | 'read_only';
  wallet?: {
    initial_included_count: number;
    purchased_count: number;
    consumed_count: number;
    available_count: number;
    status: string;
  } | null;
  has_wallet_row?: boolean;
  report_instance_id?: string | null;
};

const PREVIEW_REPORT_INSTANCE_ID = 'preview-report-instance-dev-only';

const BASE_WALLET = {
  initial_included_count: PAID_DTR_CONSULT_REPLY.includedCount,
  status: 'active' as const,
};

function roomData(
  partial: Omit<ConsultRoomPreviewRoomData, 'report_instance_id'> & {
    report_instance_id?: string | null;
  }
): ConsultRoomPreviewRoomData {
  return {
    report_instance_id: PREVIEW_REPORT_INSTANCE_ID,
    has_wallet_row: true,
    ...partial,
  };
}

/** Remaining ≥1 — compose form visible at top. */
export const CONSULT_ROOM_PREVIEW_AVAILABLE: ConsultRoomPreviewRoomData = roomData({
  thread: { credits_total: 1, credits_remaining: 1, state: 'writable' },
  messages: [],
  wallet: {
    ...BASE_WALLET,
    purchased_count: 0,
    consumed_count: 0,
    available_count: 1,
  },
  effective_credits_remaining: 1,
  effective_state: 'writable',
});

/** Remaining 0 — additional purchase CTA visible. */
export const CONSULT_ROOM_PREVIEW_PURCHASE: ConsultRoomPreviewRoomData = roomData({
  thread: { credits_total: 1, credits_remaining: 0, state: 'read_only' },
  messages: [],
  wallet: {
    ...BASE_WALLET,
    purchased_count: 0,
    consumed_count: 1,
    available_count: 0,
  },
  effective_credits_remaining: 0,
  effective_state: 'read_only',
});

/** Cap reached — history only, no purchase. */
export const CONSULT_ROOM_PREVIEW_EXHAUSTED: ConsultRoomPreviewRoomData = roomData({
  thread: { credits_total: 5, credits_remaining: 0, state: 'read_only' },
  messages: [
    {
      id: 'preview-user-1',
      role: 'user',
      content: '【テーマ】お金・生活・疲れの整え方\n\n今月の支出の見直し方を整理したい',
    },
    {
      id: 'preview-assistant-1',
      role: 'assistant',
      content:
        '今の場面では、先に負担が集中しやすい流れが見えます。\n\n' +
        '保存版の生活の整え方の章から見ると、いまは大きな決断より、小さく整える順番が合いやすい状態です。\n\n' +
        '別の見方として、支出そのものより「何を先に見るか」を一つに絞ると負担が軽くなります。\n\n' +
        '今日は、固定費の一覧を書き出すだけにとどめてください。',
    },
  ],
  wallet: {
    ...BASE_WALLET,
    purchased_count: PAID_DTR_CONSULT_REPLY.additionalMaxPurchased,
    consumed_count: 5,
    available_count: 0,
  },
  effective_credits_remaining: 0,
  effective_state: 'read_only',
});

const PREVIEW_HISTORY_MESSAGES: ConsultRoomPreviewRoomData['messages'] = [
  {
    id: 'preview-user-1',
    role: 'user',
    content: '【テーマ】お金・生活・疲れの整え方\n\n今月の支出の見直し方を整理したい',
  },
  {
    id: 'preview-assistant-1',
    role: 'assistant',
    content:
      '今の場面では、先に負担が集中しやすい流れが見えます。\n\n' +
      '保存版の生活の整え方の章から見ると、いまは大きな決断より、小さく整える順番が合いやすい状態です。\n\n' +
      '別の見方として、支出そのものより「何を先に見るか」を一つに絞ると負担が軽くなります。\n\n' +
      '今日は、固定費の一覧を書き出すだけにとどめてください。',
  },
  {
    id: 'preview-user-2',
    role: 'user',
    content:
      '【テーマ】対人と伝え方\n\n職場で意見を言うタイミングが分からず、言い出せずにいます。',
  },
  {
    id: 'preview-assistant-2',
    role: 'assistant',
    content:
      '今の場面では、伝える前に自分の言葉を整えたい気持ちが強く出ています。\n\n' +
      '保存版の対人の章から見ると、いまは結論より「一度書き出す」段階が合いやすいです。\n\n' +
      '別の見方として、正しい一言を探すより、短いメモで意図だけ残す方法もあります。\n\n' +
      '今日は、伝えたい要点を3行だけ書いてみてください。',
  },
];

/** Remaining ≥1 with prior replies — history band visible (2 replies, newest last). */
export const CONSULT_ROOM_PREVIEW_HISTORY: ConsultRoomPreviewRoomData = roomData({
  thread: { credits_total: 2, credits_remaining: 1, state: 'writable' },
  messages: PREVIEW_HISTORY_MESSAGES,
  wallet: {
    ...BASE_WALLET,
    purchased_count: 1,
    consumed_count: 1,
    available_count: 1,
  },
  effective_credits_remaining: 1,
  effective_state: 'writable',
});

const SCENARIO_MAP: Record<ConsultRoomPreviewWalletScenario, ConsultRoomPreviewRoomData> = {
  available: CONSULT_ROOM_PREVIEW_AVAILABLE,
  purchase: CONSULT_ROOM_PREVIEW_PURCHASE,
  exhausted: CONSULT_ROOM_PREVIEW_EXHAUSTED,
  history: CONSULT_ROOM_PREVIEW_HISTORY,
};

export function resolveConsultRoomPreviewScenario(
  raw: string | undefined
): ConsultRoomPreviewWalletScenario {
  if (raw === 'available' || raw === 'purchase' || raw === 'exhausted' || raw === 'history') {
    return raw;
  }
  return 'purchase';
}

export function getConsultRoomPreviewRoomData(
  scenario: ConsultRoomPreviewWalletScenario
): ConsultRoomPreviewRoomData {
  const base = SCENARIO_MAP[scenario];
  return {
    ...base,
    thread: { ...base.thread },
    messages: base.messages.map((m) => ({ ...m })),
    wallet: base.wallet ? { ...base.wallet } : null,
  };
}
