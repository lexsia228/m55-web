import { z } from 'zod';

// Keep in lockstep with the public Creator Affiliate Terms source page.
export const CREATOR_TERMS_VERSION = '2026-09-13-v1';
export const APPLICATION_STATUSES = [
  'SUBMITTED', 'UNDER_REVIEW', 'NEED_MORE_INFO', 'TERMS_REACCEPT_REQUIRED',
  'APPROVED_PENDING_ACTIVATION', 'REJECTED', 'BLOCKED',
] as const;
export type ApplicationStatus = typeof APPLICATION_STATUSES[number];
export const PROFILE_STATUSES = ['APPROVED_PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'REVOKED'] as const;
export type ProfileStatus = typeof PROFILE_STATUSES[number];
export const MEDIA_METHODS = ['DM_CHALLENGE', 'BIO_CHALLENGE', 'EXISTING_SCOUT_THREAD', 'MANUAL_OTHER'] as const;
export const REVIEW_REASON_CODES = [
  'QUALIFIED', 'INSUFFICIENT_ACTIVE_AUDIENCE_EVIDENCE', 'MEDIA_CONTROL_UNVERIFIED',
  'INACTIVE_OR_LOW_SIGNAL', 'SUSPECTED_FAKE_ENGAGEMENT', 'CONTENT_FIT_RISK',
  'DISCLOSURE_COMPLIANCE_RISK', 'ELIGIBILITY_REQUIREMENT_FAILED', 'DUPLICATE_IDENTITY',
  'NEED_MORE_INFO', 'OTHER',
] as const;
export const REVIEW_DIMENSIONS = [
  'ACTIVITY_CONTINUITY', 'CREATOR_TRACK_RECORD', 'ENGAGEMENT_QUALITY',
  'AUDIENCE_AUTHENTICITY', 'CONTENT_FIT', 'DISCLOSURE_READINESS',
] as const;
export const REVIEW_RATINGS = ['PASS', 'CONCERN', 'FAIL'] as const;
export const approvalEvidenceInput = z.object({
  ACTIVITY_CONTINUITY: z.enum(REVIEW_RATINGS),
  CREATOR_TRACK_RECORD: z.enum(REVIEW_RATINGS),
  ENGAGEMENT_QUALITY: z.enum(REVIEW_RATINGS),
  AUDIENCE_AUTHENTICITY: z.enum(REVIEW_RATINGS),
  CONTENT_FIT: z.enum(REVIEW_RATINGS),
  DISCLOSURE_READINESS: z.enum(REVIEW_RATINGS),
});

export const applicationInput = z.object({
  inviteToken: z.string().min(32).max(256).optional(),
  age18Plus: z.literal(true),
  japanResident: z.literal(true),
  termsAccepted: z.literal(true),
  termsVersion: z.literal(CREATOR_TERMS_VERSION),
  contentFocus: z.string().trim().min(1).max(1000),
  promotionExperience: z.string().trim().max(1000).optional(),
  platform: z.string().trim().min(1).max(80),
  mediaUrl: z.string().trim().url().max(500),
  handle: z.string().trim().max(120).optional(),
  audienceSize: z.number().int().nonnegative().safe().nullable().optional(),
  recentAvgViews: z.number().int().nonnegative().safe().nullable().optional(),
});

export const reviewActionInput = z.object({
  action: z.enum(['START_REVIEW', 'NEED_MORE_INFO', 'REJECT', 'BLOCK', 'APPROVE',
    'MEDIA_CHALLENGE', 'MEDIA_VERIFIED', 'MEDIA_FAILED', 'REVOKE_INVITE']),
  reasonCode: z.enum(REVIEW_REASON_CODES).optional(),
  notes: z.string().trim().max(2000).optional(),
  mediaId: z.string().uuid().optional(),
  method: z.enum(MEDIA_METHODS).optional(),
  approvalEvidence: approvalEvidenceInput.optional(),
});

export type ApplicationInput = z.infer<typeof applicationInput>;
export type ReviewActionInput = z.infer<typeof reviewActionInput>;
