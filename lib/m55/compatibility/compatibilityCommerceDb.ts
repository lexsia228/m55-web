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
import {
  legacyPairDisplayIdentity,
  parsePairDisplayIdentity,
  type PairDisplayIdentityV1,
} from './pairDisplayIdentity';
import { isStrictUuidV4 } from './pairOwnedStateIdentity';

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

export type CompatibilityPurchaseContextResumeRow = CompatibilityPurchaseContextRow & {
  pairIdentityId: string;
  paidContextId: string;
};

export type CompatibilityOwnedReportSummary = {
  id: string;
  createdAt: string;
  chapterCount: 6;
  displayIdentity: PairDisplayIdentityV1;
  pairIdentityId: string | null;
  paidContextId: string | null;
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
  'displayIdentity',
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
  const optionalDisplayIdentity = snapshot.displayIdentity === undefined;
  const expectedKeys = PAID_SNAPSHOT_TOP_LEVEL_KEYS.filter(
    (key) =>
      !(optionalCurrentContext && key === 'currentContext') &&
      !(optionalDisplayIdentity && key === 'displayIdentity'),
  );
  if (
    !hasExactKeys(snapshot, expectedKeys)
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
      !isDisplaySafeCurrentContext(typedSnapshot.currentContext)) ||
    (typedSnapshot.displayIdentity !== undefined &&
      !parsePairDisplayIdentity(typedSnapshot.displayIdentity))
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

export const COMPATIBILITY_STRIPE_CHECKOUT_IDEMPOTENCY_PREFIX = 'm55_compat_cs_v1_';

export function compatibilityStripeCheckoutIdempotencyKey(contextId: string): string {
  return `${COMPATIBILITY_STRIPE_CHECKOUT_IDEMPOTENCY_PREFIX}${contextId}`;
}

export type ReserveCompatibilityCheckoutResult =
  | { kind: 'reserved'; contextId: string }
  | { kind: 'already_owned'; reportId: string }
  | { kind: 'checkout_in_progress'; contextId: string }
  | { kind: 'checkout_unknown'; contextId: string }
  | { kind: 'unavailable' };

export async function reserveCompatibilityCheckoutContext(
  params: {
    contextId: string;
    ownerUserId: string;
    pairIdentityId: string;
    paidContextId: string;
    snapshot: PaidCompatibilityReportSnapshot;
    checkoutOriginFrozen: string;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<ReserveCompatibilityCheckoutResult> {
  if (
    !isOpaqueCompatibilityId(params.contextId) ||
    !params.ownerUserId.trim() ||
    !isPaidCompatibilityReportSnapshot(params.snapshot) ||
    !isStrictUuidV4(params.pairIdentityId) ||
    !isStrictUuidV4(params.paidContextId) ||
    !params.checkoutOriginFrozen.trim()
  ) {
    return { kind: 'unavailable' };
  }
  const { data, error } = await (db as any).rpc('m55_reserve_compatibility_checkout_v1', {
    p_context_id: params.contextId,
    p_owner_user_id: params.ownerUserId,
    p_pair_identity_id: params.pairIdentityId,
    p_paid_context_id: params.paidContextId,
    p_pending_snapshot: params.snapshot,
    p_checkout_origin_frozen: params.checkoutOriginFrozen,
  });
  if (error || !data || typeof data !== 'object') {
    return { kind: 'unavailable' };
  }
  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    return { kind: 'unavailable' };
  }
  const state = row.state;
  if (state === 'already_owned' && isOpaqueCompatibilityId(row.report_id)) {
    return { kind: 'already_owned', reportId: String(row.report_id) };
  }
  if (!isOpaqueCompatibilityId(row.context_id)) {
    return { kind: 'unavailable' };
  }
  const contextId = String(row.context_id);
  if (state === 'checkout_in_progress') {
    return { kind: 'checkout_in_progress', contextId };
  }
  if (state === 'checkout_unknown') {
    return { kind: 'checkout_unknown', contextId };
  }
  if (state === 'reserved') {
    return { kind: 'reserved', contextId };
  }
  return { kind: 'unavailable' };
}

export async function acquireCompatibilityCheckoutCreateSlot(
  params: {
    contextId: string;
    ownerUserId: string;
    leaseToken: string;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<boolean> {
  if (
    !isOpaqueCompatibilityId(params.contextId) ||
    !params.ownerUserId.trim() ||
    !isStrictUuidV4(params.leaseToken)
  ) {
    return false;
  }
  const { data, error } = await (db as any).rpc('m55_acquire_compatibility_checkout_create_slot_v1', {
    p_context_id: params.contextId,
    p_owner_user_id: params.ownerUserId,
    p_lease_token: params.leaseToken,
  });
  return !error && Boolean((data as { ok?: unknown } | null)?.ok);
}

export async function casAttachCompatibilityCheckoutSession(
  params: {
    contextId: string;
    ownerUserId: string;
    checkoutSessionId: string;
    expiresAt: string | null;
    leaseToken: string;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<boolean> {
  if (
    !isOpaqueCompatibilityId(params.contextId) ||
    !params.ownerUserId.trim() ||
    !params.checkoutSessionId.trim() ||
    !isStrictUuidV4(params.leaseToken)
  ) {
    return false;
  }
  const { data, error } = await (db as any).rpc('m55_cas_attach_compatibility_checkout_session_v1', {
    p_context_id: params.contextId,
    p_owner_user_id: params.ownerUserId,
    p_checkout_session_id: params.checkoutSessionId,
    p_session_expires_at: params.expiresAt,
    p_lease_token: params.leaseToken,
  });
  return !error && Boolean((data as { ok?: unknown } | null)?.ok);
}

export async function releaseExpiredCompatibilityCheckoutContext(
  params: {
    contextId: string;
    ownerUserId: string;
    checkoutSessionId: string;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<boolean> {
  if (
    !isOpaqueCompatibilityId(params.contextId) ||
    !params.ownerUserId.trim() ||
    !params.checkoutSessionId.trim()
  ) {
    return false;
  }
  const { data, error } = await (db as any).rpc(
    'm55_cas_release_compatibility_checkout_expired_v1',
    {
      p_context_id: params.contextId,
      p_owner_user_id: params.ownerUserId,
      p_checkout_session_id: params.checkoutSessionId,
      p_stripe_session_status: 'expired',
      p_stripe_payment_status: 'unpaid',
    },
  );
  return !error && Boolean((data as { ok?: unknown } | null)?.ok);
}

export async function getCompatibilityPurchaseContextForCheckoutResume(
  contextId: string,
  db: DbClient = getSupabaseAdmin(),
): Promise<CompatibilityPurchaseContextResumeRow | null> {
  if (!isOpaqueCompatibilityId(contextId)) return null;
  const { data, error } = await (db as any)
    .from('compatibility_purchase_contexts')
    .select(
      'id, owner_user_id, product_key, snapshot_version, pending_snapshot, status, stripe_checkout_session_id, stripe_payment_intent_id, pair_identity_id, paid_context_id',
    )
    .eq('id', contextId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  if (
    row.product_key !== COMPATIBILITY_REPORT_FULL_PRODUCT_KEY ||
    row.snapshot_version !== PAID_COMPATIBILITY_REPORT_VERSION ||
    row.status !== 'pending' ||
    !isNonEmptyString(row.owner_user_id) ||
    !isPaidCompatibilityReportSnapshot(row.pending_snapshot) ||
    !isStrictUuidV4(row.pair_identity_id) ||
    !isStrictUuidV4(row.paid_context_id)
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
    pairIdentityId: String(row.pair_identity_id),
    paidContextId: String(row.paid_context_id),
  };
}

export async function createCompatibilityPurchaseContext(
  params: {
    id: string;
    ownerUserId: string;
    snapshot: PaidCompatibilityReportSnapshot;
    pairIdentityId: string;
    paidContextId: string;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<boolean> {
  if (
    !isOpaqueCompatibilityId(params.id) ||
    !params.ownerUserId.trim() ||
    !isPaidCompatibilityReportSnapshot(params.snapshot) ||
    !isStrictUuidV4(params.pairIdentityId) ||
    !isStrictUuidV4(params.paidContextId)
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
    pair_identity_id: params.pairIdentityId,
    paid_context_id: params.paidContextId,
  });
  return !error;
}

export async function findOwnedCompatibilityReportIdByIdentity(
  params: {
    ownerUserId: string;
    pairIdentityId: string;
    paidContextId: string;
  },
  db: DbClient = getSupabaseAdmin(),
): Promise<
  | { kind: 'owned'; reportId: string }
  | { kind: 'not_owned' }
  | { kind: 'unavailable' }
  | { kind: 'ambiguous' }
> {
  if (
    !params.ownerUserId.trim() ||
    !isStrictUuidV4(params.pairIdentityId) ||
    !isStrictUuidV4(params.paidContextId)
  ) {
    return { kind: 'unavailable' };
  }

  const { data, error } = await (db as any)
    .from('compatibility_owned_report_identity_links')
    .select('report_id, owner_user_id')
    .eq('owner_user_id', params.ownerUserId)
    .eq('pair_identity_id', params.pairIdentityId)
    .eq('paid_context_id', params.paidContextId);

  if (error || !Array.isArray(data)) {
    return { kind: 'unavailable' };
  }

  const reportIds = data.flatMap((row: { report_id?: unknown }) =>
    isOpaqueCompatibilityId(row.report_id) ? [row.report_id] : [],
  );
  if (reportIds.length > 1) return { kind: 'ambiguous' };
  if (reportIds.length === 1) return { kind: 'owned', reportId: reportIds[0] };
  return { kind: 'not_owned' };
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
    .select(
      'id, created_at, snapshot, compatibility_owned_report_identity_links(pair_identity_id, paid_context_id)',
    )
    .eq('owner_user_id', ownerUserId)
    .eq('product_key', COMPATIBILITY_REPORT_FULL_PRODUCT_KEY)
    .order('created_at', { ascending: false });
  if (error || !Array.isArray(data)) {
    return { available: false, reports: [] };
  }
  return {
    available: true,
    reports: data.flatMap((row) => {
      if (!isOpaqueCompatibilityId(row.id) || !isNonEmptyString(row.created_at)) {
        return [];
      }
      const linkRaw = row.compatibility_owned_report_identity_links;
      const link = Array.isArray(linkRaw) ? linkRaw[0] : linkRaw;
      let pairIdentityId: string | null = null;
      let paidContextId: string | null = null;
      if (link && typeof link === 'object') {
        const pairField = (link as { pair_identity_id?: unknown }).pair_identity_id;
        const paidField = (link as { paid_context_id?: unknown }).paid_context_id;
        if (pairField === null && paidField === null) {
          pairIdentityId = null;
          paidContextId = null;
        } else if (isStrictUuidV4(pairField) && isStrictUuidV4(paidField)) {
          pairIdentityId = pairField;
          paidContextId = paidField;
        } else if (pairField !== undefined || paidField !== undefined) {
          pairIdentityId = null;
          paidContextId = null;
        }
      }
      return [{
        id: row.id,
        createdAt: row.created_at,
        chapterCount: 6 as const,
        displayIdentity: isPaidCompatibilityReportSnapshot(row.snapshot)
          ? row.snapshot.displayIdentity ?? legacyPairDisplayIdentity()
          : legacyPairDisplayIdentity(),
        pairIdentityId,
        paidContextId,
      }];
    }),
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
    displayIdentity: data.snapshot.displayIdentity ?? legacyPairDisplayIdentity(),
    pairIdentityId: null,
    paidContextId: null,
    snapshot: data.snapshot,
  };
}
