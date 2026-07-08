import { PAID_DTR_CONSULT_ROOM_UI } from '../paidDtrProductCopy';

const ENGLISH_SEND_ERROR_MAP: Record<string, string> = {
  'Ticket consumption failed. Please reload and try again.':
    '保存に失敗しました。ページを再読み込みしてもう一度お試しください。',
  'AI service error. Please try again.':
    '返書の準備に失敗しました。時間をおいてもう一度お試しください。',
  'Invalid commit response. Please reload and try again.':
    '保存に失敗しました。ページを再読み込みしてもう一度お試しください。',
  Unauthorized: 'サインインの状態を確認してください。',
  'Report context missing. Reload and try again.':
    'レポートの読み込みに失敗しました。ページを再読み込みしてお試しください。',
  'Reply wallet not found. Reload and try again.':
  '追加読み解きの利用情報を確認できませんでした。ページを再読み込みしてお試しください。',
  'Thread not found. Reload and try again.':
  '追加読み解きの読み込みに失敗しました。ページを再読み込みしてお試しください。',
  'AI service is not configured.':
    '返書の準備に失敗しました。時間をおいてもう一度お試しください。',
};

export function mapConsultRoomSendErrorToUserMessage(
  safeMessage: string | null | undefined,
  apiError: string | null | undefined,
): string {
  const safe = safeMessage?.trim();
  if (safe) return safe;

  const raw = apiError?.trim() ?? '';
  if (!raw) return '送信に失敗しました。時間をおいてもう一度お試しください。';
  if (ENGLISH_SEND_ERROR_MAP[raw]) return ENGLISH_SEND_ERROR_MAP[raw];
  if (/利用枠|追加読み解きの残り|メッセージは|文字|この内容は/.test(raw)) return raw;
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(raw)) return raw;
  return '時間をおいてもう一度お試しください。';
}

export function mapConsultRoomLoadErrorToUserMessage(
  apiError: string | null | undefined,
  status: number,
): string {
  if (status === 404) return PAID_DTR_CONSULT_ROOM_UI.loadErrorJa;

  const raw = apiError?.trim() ?? '';
  if (raw === 'Not owned') {
    return 'この保存版を開く権限を確認できませんでした。マイページから保存版をご確認ください。';
  }
  if (raw === 'Unauthorized') return 'サインインの状態を確認してください。';
  if (raw && /[\u3040-\u30ff\u4e00-\u9fff]/.test(raw)) return raw;

  return PAID_DTR_CONSULT_ROOM_UI.loadErrorJa;
}
