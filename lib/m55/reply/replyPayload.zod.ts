/**
 * Zod contract synced with docs/ssot/M55_REPLY_JSON_SCHEMA_v1.md
 * — strict object (no unknown keys), trim + non-empty required strings.
 */
import { z } from 'zod';
import { REPLY_SCHEMA_VERSION } from './constants';

const nonEmptyPlainString = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1, { message: 'must not be empty after trim' }));

const axisIndex = z.number().int().min(0).max(4);

const supportingAxesSchema = z
  .array(axisIndex)
  .max(3)
  .refine((arr) => new Set(arr).size === arr.length, {
    message: 'supporting_axes must not contain duplicates',
  });

export const replyPayloadV11Schema = z
  .object({
    theme: nonEmptyPlainString,
    issue_summary: nonEmptyPlainString,
    current_flow: nonEmptyPlainString,
    background_tendency: nonEmptyPlainString,
    load_point: nonEmptyPlainString,
    first_step: nonEmptyPlainString,
    next_question: nonEmptyPlainString,
    version: z.literal(REPLY_SCHEMA_VERSION),
    supporting_axes: supportingAxesSchema.optional(),
    caution_note: nonEmptyPlainString.optional(),
    tone_label: nonEmptyPlainString.optional(),
    followup_prompts: z.array(nonEmptyPlainString).max(3).optional(),
  })
  .strict();

export type ReplyPayloadV11Parsed = z.infer<typeof replyPayloadV11Schema>;

export function parseReplyPayloadJson(input: unknown): ReplyPayloadV11Parsed {
  return replyPayloadV11Schema.parse(input);
}

export function safeParseReplyPayloadJson(input: unknown) {
  return replyPayloadV11Schema.safeParse(input);
}

/** Fails if payload.theme !== sessionTheme (SSOT §7). */
export function parseReplyPayloadJsonForSession(
  input: unknown,
  sessionTheme: string,
): ReplyPayloadV11Parsed {
  const trimmedSessionTheme = sessionTheme.trim();
  if (!trimmedSessionTheme) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: 'session theme must not be empty',
        path: ['sessionTheme'],
      },
    ]);
  }
  const parsed = replyPayloadV11Schema.parse(input);
  if (parsed.theme !== trimmedSessionTheme) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: 'payload theme must match session theme',
        path: ['theme'],
      },
    ]);
  }
  return parsed;
}
