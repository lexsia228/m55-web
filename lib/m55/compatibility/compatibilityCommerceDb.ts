import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  PAID_COMPATIBILITY_REPORT_VERSION,
  type PaidCompatibilityReportSnapshot,
} from './buildPaidCompatibilityReportV1';
import {
  CHAPTER_IDS,
  PAID_TOPIC_CATALOG,
  getChapterTitle,
} from './pairReadingCatalog.v1';
import {
  COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS,
  COMPATIBILITY_CURRENT_CONTEXT_VERSION,
} from './currentContextContract.v1';
import { COMPATIBILITY_REPORT_FULL_PRODUCT_KEY } from './compatibilityCommerceAuthority';

type DbClient = ReturnType<typeof getSupabaseAdmin>;

export type CompatibilityPurchaseContextRow = {
  id: string;
  ownerUserId: string;
  productKey: typeof COMPATIBILITY_REPORT_FULL_PRODUCT_KEY;
  snapshotVersion: typeof PAID_COMPATIBILITY_REPORT_VERSION;
  pendingSnapshot: PaidCompatibilityReportSnapshot;
  status: 'pending' | 'fulfilled';
  stripeCheckoutSessionId: string | null;
  stripePaymentIntentId: string | null;
};

export type CompatibilityOwnedReportSummary = {
  id: string;
  createdAt: string;
  chapterCount: 6;
};

export type CompatibilityOwnedReport = CompatibilityOwnedReportSummary & {
  snapshot: PaidCompatibilityReportSnapshot;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RAW_DOB_RE = /\b\d{4}-\d{2}-\d{2}\b/;
const FORBIDDEN_SNAPSHOT_KEYS =
  /"(?:birthDate|dob|dobHash|nickname|userId|clerkId|stripeId|matrixScore|prompt|providerMetadata|answers|decisionPace|disagreement|distance|expressionPace|returnPattern|focus)"\s*:/i;
const RAW_CURRENT_CONTEXT_ANSWER_IDS = COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS.flatMap(
  (question) => question.choices.map((choice) => choice.answerId),
);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isOpaqueCompatibilityId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function isDisplaySafeCurrentContext(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const context = value as Record<string, unknown>;
  if (
    context.questionnaireContractVersion !== COMPATIBILITY_CURRENT_CONTEXT_VERSION ||
    !isNonEmptyString(context.currentExpression) ||
    !isNonEmptyString(context.relationshipLoop) ||
    !isNonEmptyString(context.glanceLabel) ||
    !isNonEmptyString(context.immediateAction) ||
    !isNonEmptyString(context.focusLabel) ||
    !isNonEmptyString(context.readingGuide) ||
    !Array.isArray(context.relationshipLoopSteps) ||
    context.relationshipLoopSteps.length !== 3 ||
    !context.relationshipLoopSteps.every(isNonEmptyString) ||
    !Array.isArray(context.highlightedChapterKeys) ||
    context.highlightedChapterKeys.length !== 2 ||
    !context.highlightedChapterKeys.every(
      (key) => typeof key === 'string' && CHAPTER_IDS.includes(key as any),
    ) ||
    !Array.isArray(context.chapterPreview) ||
    context.chapterPreview.length !== 2
  ) {
    return false;
  }
  return context.chapterPreview.every((preview) => {
    if (!preview || typeof preview !== 'object' || Array.isArray(preview)) return false;
    const item = preview as Record<string, unknown>;
    return (
      typeof item.chapterKey === 'string' &&
      CHAPTER_IDS.includes(item.chapterKey as any) &&
      isNonEmptyString(item.reason) &&
      isNonEmptyString(item.concreteValue)
    );
  });
}

export function isPaidCompatibilityReportSnapshot(
  value: unknown,
): value is PaidCompatibilityReportSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const snapshot = value as Partial<PaidCompatibilityReportSnapshot>;
  if (
    snapshot.version !== PAID_COMPATIBILITY_REPORT_VERSION ||
    snapshot.reportTitle !== '二人の相性レポート' ||
    !isNonEmptyString(snapshot.relationshipSummary) ||
    !isNonEmptyString(snapshot.sharedFoundation) ||
    !isNonEmptyString(snapshot.differentFoundation) ||
    !isNonEmptyString(snapshot.recurringLoop) ||
    !isNonEmptyString(snapshot.safetyNote) ||
    !Array.isArray(snapshot.highlightedChapterKeys) ||
    !Array.isArray(snapshot.chapters) ||
    snapshot.chapters.length !== CHAPTER_IDS.length ||
    (snapshot.currentContext !== undefined &&
      !isDisplaySafeCurrentContext(snapshot.currentContext))
  ) {
    return false;
  }

  for (let index = 0; index < CHAPTER_IDS.length; index += 1) {
    const chapter = snapshot.chapters[index];
    const key = CHAPTER_IDS[index];
    const titleIsCanonical =
      key === 'ch_topic_deep'
        ? PAID_TOPIC_CATALOG.some((topic) => topic.labelJa === chapter?.title)
        : chapter?.title === getChapterTitle(key);
    if (
      !chapter ||
      chapter.key !== key ||
      chapter.number !== index + 1 ||
      !titleIsCanonical ||
      !isNonEmptyString(chapter.scene) ||
      !isNonEmptyString(chapter.personAPerspective) ||
      !isNonEmptyString(chapter.personBPerspective) ||
      !Array.isArray(chapter.relationshipLoop) ||
      chapter.relationshipLoop.length < 3 ||
      !chapter.relationshipLoop.every(isNonEmptyString) ||
      !Array.isArray(chapter.resetSteps) ||
      chapter.resetSteps.length < 2 ||
      !chapter.resetSteps.every(isNonEmptyString) ||
      !['personA', 'personB', 'either'].includes(chapter.phraseSpeaker) ||
      !isNonEmptyString(chapter.usablePhrase) ||
      !isNonEmptyString(chapter.smallExperiment) ||
      !isNonEmptyString(chapter.reflectionQuestion)
    ) {
      return false;
    }
  }

  const serialized = JSON.stringify(snapshot);
  return (
    !RAW_DOB_RE.test(serialized) &&
    !FORBIDDEN_SNAPSHOT_KEYS.test(serialized) &&
    !RAW_CURRENT_CONTEXT_ANSWER_IDS.some((answerId) => serialized.includes(answerId))
  );
}

export async function createCompatibilityPurchaseContext(
  params: {
    id: string;
    ownerUserId: string;
    snapshot: PaidCompatibilityReportSnapshot;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<boolean> {
  if (
    !isOpaqueCompatibilityId(params.id) ||
    !params.ownerUserId.trim() ||
    !isPaidCompatibilityReportSnapshot(params.snapshot)
  ) {
    return false;
  }
  const { error } = await (db as any).from('compatibility_purchase_contexts').insert({
    id: params.id,
    owner_user_id: params.ownerUserId,
    product_key: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
    snapshot_version: PAID_COMPATIBILITY_REPORT_VERSION,
    pending_snapshot: params.snapshot,
    status: 'pending',
  });
  return !error;
}

export async function attachCompatibilityCheckoutSession(
  params: {
    contextId: string;
    ownerUserId: string;
    checkoutSessionId: string;
    expiresAt: string | null;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<boolean> {
  const { data, error } = await (db as any)
    .from('compatibility_purchase_contexts')
    .update({
      stripe_checkout_session_id: params.checkoutSessionId,
      stripe_session_expires_at: params.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.contextId)
    .eq('owner_user_id', params.ownerUserId)
    .eq('status', 'pending')
    .is('stripe_checkout_session_id', null)
    .select('id')
    .maybeSingle();
  return !error && Boolean(data);
}

export async function getCompatibilityPurchaseContext(
  contextId: string,
  db: DbClient = getSupabaseAdmin(),
): Promise<CompatibilityPurchaseContextRow | null> {
  if (!isOpaqueCompatibilityId(contextId)) return null;
  const { data, error } = await (db as any)
    .from('compatibility_purchase_contexts')
    .select(
      'id, owner_user_id, product_key, snapshot_version, pending_snapshot, status, stripe_checkout_session_id, stripe_payment_intent_id',
    )
    .eq('id', contextId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  if (
    row.product_key !== COMPATIBILITY_REPORT_FULL_PRODUCT_KEY ||
    row.snapshot_version !== PAID_COMPATIBILITY_REPORT_VERSION ||
    (row.status !== 'pending' && row.status !== 'fulfilled') ||
    !isNonEmptyString(row.owner_user_id) ||
    !isPaidCompatibilityReportSnapshot(row.pending_snapshot)
  ) {
    return null;
  }
  return {
    id: String(row.id),
    ownerUserId: row.owner_user_id,
    productKey: COMPATIBILITY_REPORT_FULL_PRODUCT_KEY,
    snapshotVersion: PAID_COMPATIBILITY_REPORT_VERSION,
    pendingSnapshot: row.pending_snapshot,
    status: row.status,
    stripeCheckoutSessionId:
      typeof row.stripe_checkout_session_id === 'string'
        ? row.stripe_checkout_session_id
        : null,
    stripePaymentIntentId:
      typeof row.stripe_payment_intent_id === 'string'
        ? row.stripe_payment_intent_id
        : null,
  };
}

export async function commitCompatibilityFulfillment(
  params: {
    contextId: string;
    checkoutSessionId: string;
    paymentIntentId: string | null;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<boolean> {
  const { data, error } = await (db as any).rpc('m55_fulfill_compatibility_report_v1', {
    p_purchase_context_id: params.contextId,
    p_checkout_session_id: params.checkoutSessionId,
    p_payment_intent_id: params.paymentIntentId,
  });
  return !error && Boolean((data as { ok?: unknown } | null)?.ok);
}

export async function listOwnedCompatibilityReports(
  ownerUserId: string,
  db: DbClient = getSupabaseAdmin(),
): Promise<{
  available: boolean;
  reports: CompatibilityOwnedReportSummary[];
}> {
  const { data, error } = await (db as any)
    .from('compatibility_owned_reports')
    .select('id, created_at')
    .eq('owner_user_id', ownerUserId)
    .eq('product_key', COMPATIBILITY_REPORT_FULL_PRODUCT_KEY)
    .order('created_at', { ascending: false });
  if (error || !Array.isArray(data)) {
    return { available: false, reports: [] };
  }
  return {
    available: true,
    reports: data.flatMap((row) =>
      isOpaqueCompatibilityId(row.id) && isNonEmptyString(row.created_at)
        ? [{ id: row.id, createdAt: row.created_at, chapterCount: 6 as const }]
        : [],
    ),
  };
}

export async function getOwnedCompatibilityReport(
  ownerUserId: string,
  reportId: string,
  db: DbClient = getSupabaseAdmin(),
): Promise<CompatibilityOwnedReport | null> {
  if (!isOpaqueCompatibilityId(reportId)) return null;
  const { data, error } = await (db as any)
    .from('compatibility_owned_reports')
    .select('id, snapshot, created_at')
    .eq('id', reportId)
    .eq('owner_user_id', ownerUserId)
    .eq('product_key', COMPATIBILITY_REPORT_FULL_PRODUCT_KEY)
    .maybeSingle();
  if (
    error ||
    !data ||
    !isOpaqueCompatibilityId(data.id) ||
    !isNonEmptyString(data.created_at) ||
    !isPaidCompatibilityReportSnapshot(data.snapshot)
  ) {
    return null;
  }
  return {
    id: data.id,
    createdAt: data.created_at,
    chapterCount: 6,
    snapshot: data.snapshot,
  };
}
