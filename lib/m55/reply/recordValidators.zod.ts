/**
 * Runtime validators for persistence rows — complements SQL constraints.
 */
import { z } from 'zod';
import {
  REPLY_SCHEMA_VERSION,
  REPLY_SESSION_STATUSES,
  REPLY_WALLET_STATUSES,
  WALLET_LEDGER_EVENT_TYPES,
  WALLET_SOURCE_OF_GRANT_VALUES,
} from './constants';
import { replyPayloadV11Schema } from './replyPayload.zod';

const uuidString = z.string().uuid();
const timestamptzString = z.string().min(1);

export const replySessionRecordSchema = z.object({
    id: uuidString,
    user_id: z.string().trim().min(1),
    theme: z.string().trim().min(1),
    input_mode: z.string().trim().min(1),
    selected_subquestions_json: z.array(z.unknown()),
    free_text: z.string().nullable(),
    schema_version: z.literal(REPLY_SCHEMA_VERSION),
    idempotency_key: z.string().trim().min(1),
    status: z.enum(REPLY_SESSION_STATUSES),
    core_profile_ref: z.string().nullable(),
    created_at: timestamptzString,
    updated_at: timestamptzString,
  })
  .strict();

export const replyTicketWalletRecordSchema = z
  .object({
    id: uuidString,
    user_id: z.string().trim().min(1),
    initial_included_count: z.number().int().min(0),
    purchased_count: z.number().int().min(0),
    consumed_count: z.number().int().min(0),
    available_count: z.number().int().min(0),
    status: z.enum(REPLY_WALLET_STATUSES),
    created_at: timestamptzString,
    updated_at: timestamptzString,
  })
  .strict()
  .superRefine((row, ctx) => {
    const derived =
      row.initial_included_count + row.purchased_count - row.consumed_count;
    if (row.available_count !== derived) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'available_count must equal initial_included_count + purchased_count - consumed_count',
        path: ['available_count'],
      });
    }
  });

export const replyDocumentRecordSchema = z
  .object({
    id: uuidString,
    reply_session_id: uuidString,
    user_id: z.string().trim().min(1),
    theme: z.string().trim().min(1),
    payload_json: replyPayloadV11Schema,
    version: z.literal(REPLY_SCHEMA_VERSION),
    generator_version: z.string().nullable(),
    created_at: timestamptzString,
  })
  .strict()
  .superRefine((row, ctx) => {
    if (row.payload_json.version !== row.version) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'version must match payload_json.version',
        path: ['version'],
      });
    }
    if (row.payload_json.theme !== row.theme) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'theme must match payload_json.theme',
        path: ['theme'],
      });
    }
  });

const sourceEnum = z.enum(WALLET_SOURCE_OF_GRANT_VALUES);

export const walletLedgerRecordSchema = z
  .object({
    id: uuidString,
    user_id: z.string().trim().min(1),
    wallet_id: uuidString,
    reply_session_id: uuidString.nullable(),
    delta: z.number().int(),
    balance_after: z.number().int().min(0),
    event_type: z.enum(WALLET_LEDGER_EVENT_TYPES),
    source_of_grant: sourceEnum.nullable(),
    created_at: timestamptzString,
  })
  .strict()
  .superRefine((row, ctx) => {
    if (row.event_type === 'reply_consume') {
      if (row.delta >= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'reply_consume requires negative delta',
          path: ['delta'],
        });
      }
      if (row.reply_session_id == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'reply_consume requires reply_session_id',
          path: ['reply_session_id'],
        });
      }
    }
    if (row.event_type === 'included_grant' || row.event_type === 'purchase_grant') {
      if (row.delta <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'grant events require positive delta',
          path: ['delta'],
        });
      }
    }
  });

export function parseReplySessionRecord(input: unknown) {
  return replySessionRecordSchema.parse(input);
}

export function parseReplyDocumentRecord(input: unknown) {
  return replyDocumentRecordSchema.parse(input);
}

export function parseReplyTicketWalletRecord(input: unknown) {
  return replyTicketWalletRecordSchema.parse(input);
}

export function parseWalletLedgerRecord(input: unknown) {
  return walletLedgerRecordSchema.parse(input);
}
