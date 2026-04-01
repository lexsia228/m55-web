/**
 * M55 SOUL TYPES (SSOT-aligned)
 * - HeartLog: local-first memory entry
 * - UserPlan: plan tier (retention window)
 * - HeartLogType: category for log entries
 */
export type UserPlan = 'FREE' | 'STANDARD' | 'PREMIUM';

export type HeartLogType = 'note' | 'mood' | 'boost' | 'reflection' | string;

export interface HeartLog {
  id: string;
  user_id: string;
  created_at: string;
  type: HeartLogType;
  content: string;
  metadata?: Record<string, unknown>;
}
