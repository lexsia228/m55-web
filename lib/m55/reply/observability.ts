export interface ReplyGenerateLogFields {
  request_id: string;
  user_id: string;
  reply_session_id: string | null;
  idempotency_key: string;
  theme: string;
  input_mode: string;
  selected_subquestion_count: number;
  free_text_length: number;
  stub_mode: boolean;
  response_status: number;
  schema_validation_result: 'pass' | 'fail' | 'not_run';
  latency_ms: number;
  error_code?: string;
}

export function logReplyGenerateEvent(fields: ReplyGenerateLogFields) {
  console.info('[api/reply/generate]', fields);
}
