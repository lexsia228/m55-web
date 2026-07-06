import { z } from 'zod';
import {
  composeReplyUserMessage,
  validateComposedReplyMessage,
} from './consultSendMessage';
import {
  REPLY_THEME_IDS,
  resolveReplyQuestion,
  type ConsultQuestionCatalogEntry,
  type ReplyThemeId,
} from './consultQuestionCatalog.v1';

export { REPLY_THEME_IDS };

export const consultSendRequestSchema = z
  .object({
    reply_theme_id: z.enum(REPLY_THEME_IDS),
    reply_question_id: z.string().min(3).max(64),
    birthDate: z.string().optional(),
    nickname: z.string().optional(),
  })
  .strict();

export type ConsultSendRequest = z.infer<typeof consultSendRequestSchema>;

export type ConsultSendRequestValidationResult =
  | {
      ok: true;
      data: ConsultSendRequest;
      catalogEntry: ConsultQuestionCatalogEntry;
      composedUserMessage: string;
    }
  | { ok: false; error: string; status: 422 };

const FORBIDDEN_BODY_KEYS = [
  'message',
  'free_text',
  'freeBody',
  'consultationText',
  'userMessage',
  'selected_subquestions',
  'body',
  'prompt',
] as const;

function hasForbiddenBodyKeys(body: Record<string, unknown>): string | null {
  for (const key of FORBIDDEN_BODY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      return key;
    }
  }
  return null;
}

export function validateConsultSendRequest(body: unknown): ConsultSendRequestValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'リクエスト形式が不正です。', status: 422 };
  }

  const record = body as Record<string, unknown>;
  const forbiddenKey = hasForbiddenBodyKeys(record);
  if (forbiddenKey) {
    return {
      ok: false,
      error: `自由入力フィールド（${forbiddenKey}）は受け付けません。`,
      status: 422,
    };
  }

  const parsed = consultSendRequestSchema.safeParse(body);
  if (!parsed.success) {
    const themeIssue = parsed.error.issues.find((issue) => issue.path[0] === 'reply_theme_id');
    if (themeIssue) {
      return { ok: false, error: '有効なテーマを選択してください。', status: 422 };
    }
    return { ok: false, error: 'リクエスト形式が不正です。', status: 422 };
  }

  const { reply_theme_id, reply_question_id } = parsed.data;
  const catalogEntry = resolveReplyQuestion(reply_theme_id as ReplyThemeId, reply_question_id);
  if (!catalogEntry) {
    if (!reply_question_id.startsWith(`${reply_theme_id}.`)) {
      return {
        ok: false,
        error: '選択した質問がテーマと一致しません。',
        status: 422,
      };
    }
    return { ok: false, error: '有効な質問を選択してください。', status: 422 };
  }

  const composedUserMessage = composeReplyUserMessage(
    catalogEntry.themeLabelJa,
    catalogEntry.labelJa,
  );
  const composeValidation = validateComposedReplyMessage(composedUserMessage);
  if (!composeValidation.ok) {
    return { ok: false, error: composeValidation.error, status: 422 };
  }

  return {
    ok: true,
    data: parsed.data,
    catalogEntry,
    composedUserMessage,
  };
}
