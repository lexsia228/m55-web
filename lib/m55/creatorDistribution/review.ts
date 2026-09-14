import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { getSupabaseAdmin } from '../../supabaseAdmin';
import { approvalEvidenceInput, CREATOR_TERMS_VERSION, REVIEW_DIMENSIONS, type ReviewActionInput } from './contract';

export async function performReviewAction(applicationId: string, reviewerId: string, input: ReviewActionInput) {
  if (input.action === 'REVOKE_INVITE') throw new Error('USE_INVITE_REVOKE_ENDPOINT');
  const db = getSupabaseAdmin();
  if (input.action === 'APPROVE') {
    if (input.reasonCode !== 'QUALIFIED') throw new Error('REVIEW_REASON_REQUIRED');
    const evidence = approvalEvidenceInput.parse(input.approvalEvidence);
    if (!REVIEW_DIMENSIONS.every((dimension) => evidence[dimension] === 'PASS')) {
      throw new Error('APPROVAL_EVIDENCE_NOT_ALL_PASS');
    }
    const { data, error } = await (db as any).rpc('m55_creator_approve_application_v1', {
      p_application_id: applicationId, p_reviewer_clerk_user_id: reviewerId,
      p_current_terms_version: CREATOR_TERMS_VERSION,
      p_reason_code: input.reasonCode, p_internal_notes_safe: input.notes || null,
      p_activity_continuity: evidence.ACTIVITY_CONTINUITY,
      p_creator_track_record: evidence.CREATOR_TRACK_RECORD,
      p_engagement_quality: evidence.ENGAGEMENT_QUALITY,
      p_audience_authenticity: evidence.AUDIENCE_AUTHENTICITY,
      p_content_fit: evidence.CONTENT_FIT,
      p_disclosure_readiness: evidence.DISCLOSURE_READINESS,
    });
    if (error) throw new Error('APPROVAL_FAILED');
    return { status: data ? 'APPROVED_PENDING_ACTIVATION' : 'TERMS_REACCEPT_REQUIRED' };
  }
  if (!input.reasonCode) throw new Error('REVIEW_REASON_REQUIRED');
  if (input.action.startsWith('MEDIA_') && (!input.mediaId || !input.method)) throw new Error('MEDIA_EVIDENCE_REQUIRED');
  const challenge = input.action === 'MEDIA_CHALLENGE' ? randomBytes(9).toString('base64url') : null;
  const { data, error } = await (db as any).rpc('m55_creator_review_action_v1', {
    p_application_id: applicationId, p_reviewer_clerk_user_id: reviewerId,
    p_action: input.action, p_reason_code: input.reasonCode, p_notes: input.notes || null,
    p_media_id: input.mediaId || null, p_method: input.method || null,
    p_challenge_hash: challenge ? createHash('sha256').update(challenge).digest('hex') : null,
  });
  if (error) throw new Error('REVIEW_ACTION_FAILED');
  return { status: data as string, challenge };
}
