import { getSupabaseAdmin } from '../../supabaseAdmin';
import {
  PAID_COMPATIBILITY_REPORT_VERSION,
  PAID_COMPATIBILITY_R1_TOPIC_DEEP_TITLES,
  paidCompatibilityChapterTitle,
  type PaidCompatibilityReportSnapshot,
} from './buildPaidCompatibilityReportV1';
import {
  CHAPTER_IDS,
  PAID_TOPIC_CATALOG,
} from './pairReadingCatalog.v1';
import {
  COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS,
  COMPATIBILITY_CURRENT_CONTEXT_VERSION,
  type CompatibilityCurrentContextAnswers,
} from './currentContextContract.v1';
import {
  COMPATIBILITY_CURRENT_CONTEXT_VERSION_V2,
  questionsForRelationStage,
} from './currentContextContract.v2';
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
const FORBIDDEN_PROVIDER_ID_PATTERNS = [
  /user_[A-Za-z0-9]{10,}/,
  /cus_[A-Za-z0-9]{10,}/,
  /sub_[A-Za-z0-9]{10,}/,
  /acct_[A-Za-z0-9]{10,}/,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
] as const;
const RAW_RELATION_STATUS_IDS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'] as const;
const RAW_V2_ANSWER_IDS = questionsForRelationStage('R3')
  .flatMap((question) => question.choices.map((choice) => choice.answerId))
  .concat(
    questionsForRelationStage('R1').flatMap((q) => q.choices.map((c) => c.answerId)),
    questionsForRelationStage('R2').flatMap((q) => q.choices.map((c) => c.answerId)),
    questionsForRelationStage('R4').flatMap((q) => q.choices.map((c) => c.answerId)),
    questionsForRelationStage('R5').flatMap((q) => q.choices.map((c) => c.answerId)),
  );
const RAW_CURRENT_CONTEXT_ANSWER_IDS = [
  ...COMPATIBILITY_CURRENT_CONTEXT_QUESTIONS.flatMap(
    (question) => question.choices.map((choice) => choice.answerId),
  ),
  ...RAW_V2_ANSWER_IDS,
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

const PAID_SNAPSHOT_TOP_LEVEL_KEYS = [
  'version',
  'reportTitle',
  'relationshipSummary',
  'sharedFoundation',
  'differentFoundation',
  'recurringLoop',
  'highlightedChapterKeys',
  'currentContext',
  'chapters',
  'safetyNote',
] as const;

const PAID_CHAPTER_KEYS = [
  'key',
  'number',
  'title',
  'scene',
  'personAPerspective',
  'personBPerspective',
  'relationshipLoop',
  'resetSteps',
  'phraseSpeaker',
  'usablePhrase',
  'smallExperiment',
  'reflectionQuestion',
  'sceneInteractionId',
] as const;

const CURRENT_CONTEXT_DISPLAY_KEYS = [
  'questionnaireContractVersion',
  'currentExpression',
  'relationshipLoop',
  'relationshipLoopSteps',
  'glanceLabel',
  'immediateAction',
  'focusLabel',
  'readingGuide',
  'highlightedChapterKeys',
  'chapterPreview',
] as const;

const CHAPTER_PREVIEW_KEYS = ['chapterKey', 'reason', 'concreteValue'] as const;

function hasExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const keys = Object.keys(value);
  return keys.length === allowed.length && keys.every((key) => allowed.includes(key));
}

export function isOpaqueCompatibilityId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function isDisplaySafeCurrentContext(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const context = value as Record<string, unknown>;
  if (!hasExactKeys(context, CURRENT_CONTEXT_DISPLAY_KEYS)) return false;
  if (
    (context.questionnaireContractVersion !== COMPATIBILITY_CURRENT_CONTEXT_VERSION &&
      context.questionnaireContractVersion !== COMPATIBILITY_CURRENT_CONTEXT_VERSION_V2) ||
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
    if (!hasExactKeys(item, CHAPTER_PREVIEW_KEYS)) return false;
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
  const snapshot = value as Record<string, unknown>;
  const optionalCurrentContext = snapshot.currentContext === undefined;
  if (
    !hasExactKeys(
      snapshot,
      optionalCurrentContext
        ? PAID_SNAPSHOT_TOP_LEVEL_KEYS.filter((key) => key !== 'currentContext')
        : [...PAID_SNAPSHOT_TOP_LEVEL_KEYS],
    )
  ) {
    return false;
  }
  const typedSnapshot = snapshot as Partial<PaidCompatibilityReportSnapshot>;
  if (
    typedSnapshot.version !== PAID_COMPATIBILITY_REPORT_VERSION ||
    typedSnapshot.reportTitle !== '二人の相性レポート' ||
    !isNonEmptyString(typedSnapshot.relationshipSummary) ||
    !isNonEmptyString(typedSnapshot.sharedFoundation) ||
    !isNonEmptyString(typedSnapshot.differentFoundation) ||
    !isNonEmptyString(typedSnapshot.recurringLoop) ||
    !isNonEmptyString(typedSnapshot.safetyNote) ||
    !Array.isArray(typedSnapshot.highlightedChapterKeys) ||
    !Array.isArray(typedSnapshot.chapters) ||
    typedSnapshot.chapters.length !== CHAPTER_IDS.length ||
    (typedSnapshot.currentContext !== undefined &&
      !isDisplaySafeCurrentContext(typedSnapshot.currentContext))
  ) {
    return false;
  }

  for (let index = 0; index < CHAPTER_IDS.length; index += 1) {
    const chapter = typedSnapshot.chapters![index] as Record<string, unknown>;
    const key = CHAPTER_IDS[index];
    if (!hasExactKeys(chapter, PAID_CHAPTER_KEYS)) return false;
    const typedChapter = chapter as PaidCompatibilityReportSnapshot['chapters'][number];
    const titleIsCanonical =
      key === 'ch_topic_deep'
        ? PAID_TOPIC_CATALOG.some((topic) => topic.labelJa === typedChapter.title) ||
          PAID_COMPATIBILITY_R1_TOPIC_DEEP_TITLES.includes(
            typedChapter.title as (typeof PAID_COMPATIBILITY_R1_TOPIC_DEEP_TITLES)[number],
          )
        : typedChapter.title === paidCompatibilityChapterTitle(key);
    if (
      typedChapter.key !== key ||
      typedChapter.number !== index + 1 ||
      !titleIsCanonical ||
      !isNonEmptyString(typedChapter.scene) ||
      !isNonEmptyString(typedChapter.personAPerspective) ||
      !isNonEmptyString(typedChapter.personBPerspective) ||
      !Array.isArray(typedChapter.relationshipLoop) ||
      typedChapter.relationshipLoop.length < 3 ||
      !typedChapter.relationshipLoop.every(isNonEmptyString) ||
      !Array.isArray(typedChapter.resetSteps) ||
      typedChapter.resetSteps.length < 2 ||
      !typedChapter.resetSteps.every(isNonEmptyString) ||
      !['personA', 'personB', 'either'].includes(typedChapter.phraseSpeaker) ||
      !isNonEmptyString(typedChapter.usablePhrase) ||
      !isNonEmptyString(typedChapter.smallExperiment) ||
      !isNonEmptyString(typedChapter.reflectionQuestion) ||
      !isNonEmptyString(typedChapter.sceneInteractionId) ||
      RAW_RELATION_STATUS_IDS.some((statusId) =>
        typedChapter.sceneInteractionId.includes(statusId),
      )
    ) {
      return false;
    }
  }

  const serialized = JSON.stringify(typedSnapshot);
  return (
    !RAW_DOB_RE.test(serialized) &&
    !FORBIDDEN_SNAPSHOT_KEYS.test(serialized) &&
    !FORBIDDEN_PROVIDER_ID_PATTERNS.some((pattern) => pattern.test(serialized)) &&
    !RAW_RELATION_STATUS_IDS.some((statusId) => serialized.includes(`"${statusId}"`)) &&
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
