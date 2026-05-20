/**
 * M55 output-side AI safety sanitizer (AS-C5-B).
 * Stateless: no env, network, DB, payment, or ticket mutation.
 * Reuses category taxonomy from m55AiSafetyPolicy.
 */
import {
  classifyM55AiSafetyInput,
  buildGenericRefusalMessage,
  safeMessageForCategory,
  type M55AiSafetyCategory,
  type M55AiSafetySurface,
} from './m55AiSafetyPolicy.js';
import { replyPayloadV11Schema } from '../reply/replyPayload.zod.js';
import type { ReplyPayloadV11 } from '../reply/types.js';
import { generateStubReplyPayload } from '../reply/stubReplyGenerator.js';

export type M55AiOutputAction =
  | 'allow'
  | 'sanitize'
  | 'refuse'
  | 'redirect'
  | 'escalate'
  | 'block';

export type M55AiOutputSurface = M55AiSafetySurface | 'public_copy' | 'unknown';

export type M55AiOutputSanitizeOptions = {
  surface?: M55AiOutputSurface;
  locale?: string;
  productLane?: string;
  /** Required for reply fallback JSON theme alignment */
  theme?: string;
  inputMode?: string;
  selectedSubquestions?: string[];
  freeText?: string | null;
};

export type M55AiTextOutputResult = {
  action: M55AiOutputAction;
  safeText: string;
  categories: M55AiSafetyCategory[];
  reasonSafeLabel: string | null;
  fallbackUsed: boolean;
};

export type M55AiReplyJsonOutputResult = {
  ok: boolean;
  sanitizedJson: ReplyPayloadV11 | null;
  fallbackUsed: boolean;
  categories: M55AiSafetyCategory[];
  reasonSafeLabel: string | null;
  worstAction: M55AiOutputAction;
};

const REPLY_TEXT_FIELDS = [
  'theme',
  'issue_summary',
  'current_flow',
  'background_tendency',
  'load_point',
  'first_step',
  'next_question',
  'caution_note',
] as const;

const TONE_LABEL_ALLOWLIST = new Set(['steady', 'calm', 'grounded']);

const ACTION_SEVERITY: Record<M55AiOutputAction, number> = {
  allow: 0,
  sanitize: 1,
  redirect: 2,
  refuse: 3,
  escalate: 4,
  block: 5,
};

function resolveSafetySurface(surface: M55AiOutputSurface | undefined): M55AiSafetySurface {
  if (surface === 'consult' || surface === 'reply' || surface === 'dtr' || surface === 'general') {
    return surface;
  }
  return 'general';
}

function worstOutputAction(actions: M55AiOutputAction[]): M55AiOutputAction {
  let worst: M55AiOutputAction = 'allow';
  for (const a of actions) {
    if (ACTION_SEVERITY[a] > ACTION_SEVERITY[worst]) {
      worst = a;
    }
  }
  return worst;
}

function mapClassificationToOutputAction(
  inputAction: ReturnType<typeof classifyM55AiSafetyInput>['action'],
): M55AiOutputAction {
  return inputAction;
}

function classifyOutputText(
  text: string,
  surface: M55AiOutputSurface | undefined,
): {
  action: M55AiOutputAction;
  category: M55AiSafetyCategory | null;
  safeMessage: string | null;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { action: 'allow', category: null, safeMessage: null };
  }
  const r = classifyM55AiSafetyInput(trimmed, { surface: resolveSafetySurface(surface) });
  return {
    action: mapClassificationToOutputAction(r.action),
    category: r.category,
    safeMessage: r.safeMessage,
  };
}

/**
 * Sanitize plain-text LLM output (consult room, etc.).
 */
export function sanitizeM55AiTextOutput(
  text: string,
  options: M55AiOutputSanitizeOptions = {},
): M55AiTextOutputResult {
  try {
    const trimmed = text.trim();
    if (!trimmed) {
      return {
        action: 'allow',
        safeText: trimmed,
        categories: [],
        reasonSafeLabel: null,
        fallbackUsed: false,
      };
    }

    const { action, category, safeMessage } = classifyOutputText(trimmed, options.surface);

    if (action === 'allow') {
      return {
        action: 'allow',
        safeText: trimmed,
        categories: [],
        reasonSafeLabel: null,
        fallbackUsed: false,
      };
    }

    const safeText = safeMessage ?? safeMessageForCategory(category ?? 'medical') ?? buildGenericRefusalMessage();
    return {
      action,
      safeText,
      categories: category ? [category] : [],
      reasonSafeLabel: category,
      fallbackUsed: true,
    };
  } catch {
    return {
      action: 'refuse',
      safeText: buildGenericRefusalMessage(),
      categories: [],
      reasonSafeLabel: 'sanitizer_error',
      fallbackUsed: true,
    };
  }
}

/** Consult: block persistence when output safety action is not allow. */
export function isConsultOutputSafetyBlocked(result: M55AiTextOutputResult): boolean {
  return result.action !== 'allow';
}

export type BuildM55SafeFallbackReplyJsonReason = {
  reasonSafeLabel: string;
  theme: string;
  inputMode?: string;
  selectedSubquestions?: string[];
  freeText?: string | null;
};

/**
 * Schema-compatible fallback reply (DTR-grounded stub tone).
 */
export function buildM55SafeFallbackReplyJson(
  reason: BuildM55SafeFallbackReplyJsonReason,
): ReplyPayloadV11 {
  const theme = reason.theme.trim() || 'テーマ未設定';
  const payload = generateStubReplyPayload({
    theme,
    inputMode: reason.inputMode ?? 'guided',
    selectedSubquestions: reason.selectedSubquestions ?? [],
    freeText: reason.freeText ?? null,
  });

  const issuePrefix =
    reason.reasonSafeLabel === 'jailbreak' || reason.reasonSafeLabel === 'block'
      ? 'ご入力の範囲を、購入済みレポートに沿って整理しました。'
      : 'レポートの文脈に沿って、いまの流れを一段階だけ整理しました。';

  return {
    ...payload,
    theme,
    issue_summary: `${issuePrefix} ${payload.issue_summary}`.slice(0, 800),
    caution_note:
      '医療・法律・投資の具体的判断はお受けできません。生活のリズムと負荷の傾向として読んでください。',
    tone_label: TONE_LABEL_ALLOWLIST.has(payload.tone_label ?? '') ? payload.tone_label : 'steady',
  };
}

function sanitizeToneLabel(value: unknown, surface: M55AiOutputSurface | undefined): {
  value: string | undefined;
  action: M55AiOutputAction;
  category: M55AiSafetyCategory | null;
} {
  if (value == null || value === '') {
    return { value: undefined, action: 'allow', category: null };
  }
  const s = String(value).trim();
  const c = classifyOutputText(s, surface);
  if (c.action !== 'allow') {
    return { value: 'steady', action: c.action, category: c.category };
  }
  if (!TONE_LABEL_ALLOWLIST.has(s)) {
    return { value: 'steady', action: 'sanitize', category: null };
  }
  return { value: s, action: 'allow', category: null };
}

function sanitizeFollowupPrompts(
  value: unknown,
  surface: M55AiOutputSurface | undefined,
): { value: string[] | undefined; actions: M55AiOutputAction[]; categories: M55AiSafetyCategory[] } {
  if (!Array.isArray(value)) {
    return { value: undefined, actions: [], categories: [] };
  }
  const out: string[] = [];
  const actions: M55AiOutputAction[] = [];
  const categories: M55AiSafetyCategory[] = [];
  for (const item of value.slice(0, 3)) {
    const r = sanitizeM55AiTextOutput(String(item ?? ''), { surface });
    out.push(r.safeText);
    actions.push(r.action);
    categories.push(...r.categories);
  }
  return { value: out.length ? out : undefined, actions, categories };
}

/**
 * Sanitize reply JSON object before schema validation / RPC.
 */
export function sanitizeM55ReplyJsonOutput(
  json: Record<string, unknown>,
  options: M55AiOutputSanitizeOptions = {},
): M55AiReplyJsonOutputResult {
  const surface = options.surface ?? 'reply';
  const theme = typeof options.theme === 'string' ? options.theme.trim() : '';
  const actions: M55AiOutputAction[] = [];
  const categories: M55AiSafetyCategory[] = [];
  let reasonSafeLabel: string | null = null;

  try {
    const working: Record<string, unknown> = { ...json };

    for (const field of REPLY_TEXT_FIELDS) {
      if (working[field] == null) continue;
      const r = sanitizeM55AiTextOutput(String(working[field]), { surface, ...options });
      working[field] = r.safeText;
      actions.push(r.action);
      categories.push(...r.categories);
      if (r.reasonSafeLabel && !reasonSafeLabel) {
        reasonSafeLabel = r.reasonSafeLabel;
      }
    }

    const tone = sanitizeToneLabel(working.tone_label, surface);
    if (tone.value !== undefined) {
      working.tone_label = tone.value;
    } else {
      delete working.tone_label;
    }
    actions.push(tone.action);
    if (tone.category) categories.push(tone.category);

    const prompts = sanitizeFollowupPrompts(working.followup_prompts, surface);
    if (prompts.value) {
      working.followup_prompts = prompts.value;
    } else {
      delete working.followup_prompts;
    }
    actions.push(...prompts.actions);
    categories.push(...prompts.categories);

    if (working.version == null) {
      working.version = '1.1';
    }

    const worst = worstOutputAction(actions);

    if (worst === 'block' || worst === 'escalate') {
      const fallback = buildM55SafeFallbackReplyJson({
        reasonSafeLabel: reasonSafeLabel ?? worst,
        theme: theme || String(working.theme ?? 'テーマ未設定'),
        inputMode: options.inputMode,
        selectedSubquestions: options.selectedSubquestions,
        freeText: options.freeText,
      });
      return {
        ok: true,
        sanitizedJson: fallback,
        fallbackUsed: true,
        categories: [...new Set(categories)],
        reasonSafeLabel: reasonSafeLabel ?? worst,
        worstAction: worst,
      };
    }

    const parsed = replyPayloadV11Schema.safeParse(working);
    if (!parsed.success) {
      const fallback = buildM55SafeFallbackReplyJson({
        reasonSafeLabel: reasonSafeLabel ?? 'schema_validation_failed',
        theme: theme || String(working.theme ?? 'テーマ未設定'),
        inputMode: options.inputMode,
        selectedSubquestions: options.selectedSubquestions,
        freeText: options.freeText,
      });
      return {
        ok: true,
        sanitizedJson: fallback,
        fallbackUsed: true,
        categories: [...new Set(categories)],
        reasonSafeLabel: 'schema_validation_failed',
        worstAction: worst === 'allow' ? 'sanitize' : worst,
      };
    }

    if (theme && parsed.data.theme !== theme) {
      const fallback = buildM55SafeFallbackReplyJson({
        reasonSafeLabel: 'theme_mismatch',
        theme,
        inputMode: options.inputMode,
        selectedSubquestions: options.selectedSubquestions,
        freeText: options.freeText,
      });
      return {
        ok: true,
        sanitizedJson: fallback,
        fallbackUsed: true,
        categories,
        reasonSafeLabel: 'theme_mismatch',
        worstAction: 'sanitize',
      };
    }

    const fieldReplaced = REPLY_TEXT_FIELDS.some((f) => {
      if (json[f] == null) return false;
      return String(working[f] ?? '') !== String(json[f] ?? '');
    });
    const followupReplaced =
      Array.isArray(json.followup_prompts) &&
      JSON.stringify(working.followup_prompts ?? []) !== JSON.stringify(json.followup_prompts ?? []);
    const fallbackUsed =
      actions.some((a) => a !== 'allow') || fieldReplaced || followupReplaced;

    return {
      ok: true,
      sanitizedJson: parsed.data,
      fallbackUsed,
      categories: [...new Set(categories)],
      reasonSafeLabel,
      worstAction: worst,
    };
  } catch {
    const fallback = buildM55SafeFallbackReplyJson({
      reasonSafeLabel: 'sanitizer_error',
      theme: theme || 'テーマ未設定',
      inputMode: options.inputMode,
      selectedSubquestions: options.selectedSubquestions,
      freeText: options.freeText,
    });
    return {
      ok: true,
      sanitizedJson: fallback,
      fallbackUsed: true,
      categories: [],
      reasonSafeLabel: 'sanitizer_error',
      worstAction: 'refuse',
    };
  }
}
