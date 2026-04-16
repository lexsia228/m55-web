import { z } from 'zod';
import { REPLY_SCHEMA_VERSION } from './constants';

const trimmedNonEmptyString = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1, { message: 'must not be empty after trim' }));

const optionalTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const replyGenerateRequestSchema = z
  .object({
    theme: trimmedNonEmptyString,
    input_mode: trimmedNonEmptyString,
    selected_subquestions: z.array(trimmedNonEmptyString).optional(),
    free_text: optionalTrimmedString,
    schema_version: z.literal(REPLY_SCHEMA_VERSION),
  })
  .strict()
  .transform((value) => ({
    ...value,
    selected_subquestions: value.selected_subquestions ?? [],
  }));

export type ReplyGenerateRequest = z.infer<typeof replyGenerateRequestSchema>;
