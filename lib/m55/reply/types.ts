import type {
  ReplySessionStatus,
  ReplyTicketWalletStatus,
  WalletLedgerEventType,
  WalletSourceOfGrant,
} from './constants';

/** LLM / stored payload — SSOT: M55_REPLY_JSON_SCHEMA_v1 */
export interface ReplyPayloadV11 {
  theme: string;
  issue_summary: string;
  current_flow: string;
  background_tendency: string;
  load_point: string;
  first_step: string;
  next_question: string;
  version: '1.1';
  supporting_axes?: number[];
  caution_note?: string;
  tone_label?: string;
  followup_prompts?: string[];
}

/** DB / persistence row — SSOT field names (snake_case). */
export interface ReplySessionRecord {
  id: string;
  user_id: string;
  theme: string;
  input_mode: string;
  selected_subquestions_json: unknown[];
  free_text: string | null;
  schema_version: string;
  idempotency_key: string;
  status: ReplySessionStatus;
  core_profile_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReplyDocumentRecord {
  id: string;
  reply_session_id: string;
  user_id: string;
  theme: string;
  payload_json: ReplyPayloadV11;
  version: string;
  generator_version: string | null;
  created_at: string;
}

export interface ReplyTicketWalletRecord {
  id: string;
  user_id: string;
  initial_included_count: number;
  purchased_count: number;
  consumed_count: number;
  available_count: number;
  status: ReplyTicketWalletStatus;
  created_at: string;
  updated_at: string;
}

export interface WalletLedgerRecord {
  id: string;
  user_id: string;
  wallet_id: string;
  reply_session_id: string | null;
  delta: number;
  balance_after: number;
  event_type: WalletLedgerEventType;
  source_of_grant: WalletSourceOfGrant | null;
  created_at: string;
}
