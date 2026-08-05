/**
 * OpenAI-backed HybridAiProvider for M55 paid DTR snapshot generation.
 *
 * Primary model: GPT-4.1 mini (default).
 * Uses structured output (json_schema) to receive 4-chapter bodies.
 * Fail-closed: provider throw → orchestration fallback to deterministic.
 *
 * Safety invariants:
 * - No real API call in tests; inject `client` for mocking.
 * - raw response, raw prompt, PII, DOB are NOT persisted.
 * - providerMeta contains only: modelName, promptVersion, tokensUsed.
 * - Does not throw at construction; throws at generate() if no key/client.
 */
import OpenAI from 'openai';
import type { HybridAiProvider, HybridAiProviderOutput } from './dtrHybridAiProvider';
import type { HybridAiPromptPayload } from './dtrHybridAiPrompt';

// ── Defaults ──────────────────────────────────────────────────────────────────

export const OPENAI_DEFAULT_MODEL = 'gpt-4.1-mini' as const;
const DEFAULT_TIMEOUT_MS = 25_000;
const GENERATE_TEMPERATURE = 0.55;
const GENERATE_MAX_TOKENS = 2000;

// ── Minimal response shape ────────────────────────────────────────────────────

/** The subset of ChatCompletion we consume from the API response. */
export interface OpenAICompletionResult {
  choices: { message: { content: string | null } }[];
  usage?: { total_tokens?: number };
}

/**
 * Minimal OpenAI client interface for test injection.
 * The real OpenAI class satisfies this structurally; tests provide lightweight mocks.
 * params intentionally uses concrete types matching what we pass from the implementation.
 */
export interface OpenAILikeClientForTest {
  chat: {
    completions: {
      create(
        params: {
          model: string;
          messages: { role: 'system' | 'user'; content: string }[];
          response_format: { type: string; json_schema?: Record<string, unknown> };
          temperature: number;
          max_tokens: number;
        },
        options?: { signal?: AbortSignal },
      ): Promise<OpenAICompletionResult>;
    };
  };
}

// ── Structured output schema ──────────────────────────────────────────────────

const SECTION_RESPONSE_FORMAT: {
  type: 'json_schema';
  json_schema: Record<string, unknown>;
} = {
  type: 'json_schema',
  json_schema: {
    name: 'hybrid_dtr_sections',
    description: '4章構成のプレミアムレポート本文。各章の本文のみを出力する。',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        s1_identity: { type: 'string' },
        s2_composition: { type: 'string' },
        s3_essence: { type: 'string' },
        s4_strengths: { type: 'string' },
      },
      required: ['s1_identity', 's2_composition', 's3_essence', 's4_strengths'],
      additionalProperties: false,
    },
  },
};

// ── Section output type guard ─────────────────────────────────────────────────

type SectionOutput = {
  s1_identity: string;
  s2_composition: string;
  s3_essence: string;
  s4_strengths: string;
};

function isSectionOutput(v: unknown): v is SectionOutput {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o['s1_identity'] === 'string' && o['s1_identity'].length > 0 &&
    typeof o['s2_composition'] === 'string' && o['s2_composition'].length > 0 &&
    typeof o['s3_essence'] === 'string' && o['s3_essence'].length > 0 &&
    typeof o['s4_strengths'] === 'string' && o['s4_strengths'].length > 0
  );
}

// ── Prompt serializer ─────────────────────────────────────────────────────────

/**
 * Convert HybridAiPromptPayload → { systemMessage, userMessage }.
 * Pure function — no network, no DB, no AI.
 * Does NOT include raw birth_date, birth_time, PII, or DB IDs.
 */
export function serializeHybridPayloadToMessages(payload: HybridAiPromptPayload): {
  systemMessage: string;
  userMessage: string;
} {
  const { systemConstraints, sections } = payload;

  const sectionSpecs = sections
    .map((s) =>
      [
        `■ ${s.sectionId}（${s.lengthGuidance}）`,
        `役割: ${s.roleDescription}`,
        `禁止トピック: ${s.forbiddenTopics.join(' / ')}`,
        `必須テーマ: ${s.requiredThemes.join(' / ')}`,
      ].join('\n')
    )
    .join('\n\n');

  const systemMessage = [
    'あなたはM55プレミアムレポートDTR章生成AIです。以下の制約をすべて厳守すること。',
    '',
    `【トーン】\n${systemConstraints.toneName}`,
    '',
    `【文体制約】\n${systemConstraints.styleGuidance}`,
    '',
    `【役割制約】\n${systemConstraints.roleGuidance}`,
    '',
    `【絶対禁止フレーズ】（出力に含めないこと）\n${systemConstraints.forbiddenPhrases.join(' / ')}`,
    '',
    `【断定禁止パターン】\n${systemConstraints.hardClaims.join(' / ')}`,
    '',
    '【出力形式 — 厳守】',
    '- 出力はJSONオブジェクト1つのみ。それ以外のテキスト・前置き・後書き不可。',
    '- マークダウン記法・見出し・箇条書き記号・コードブロック不可。',
    '- 出生時刻・birth time・時刻補正・正午基準を含めないこと。',
    '- 各章は自然な散文のみ（箇条書き・番号付きリスト不可）。',
    '- 章ごとの役割を厳守し、他の章の内容に踏み込まないこと。',
    '',
    `【各章の役割と制約】\n${sectionSpecs}`,
  ].join('\n');

  const { traitContext, dobContext, fallbackMaterial } = payload;

  const userMessage = [
    '【主要特性】',
    `特性: ${traitContext.publicTitle}`,
    `相互作用メモ: ${traitContext.interactionNote}`,
    `傾向の説明: ${traitContext.blueprintDescription}`,
    '',
    '【生年月日から導くリズム（生活語として使用）】',
    `季節のリズム: ${dobContext.seasonDescription}`,
    `月相のリズム: ${dobContext.phaseDescription}`,
    `本質のリズム: ${dobContext.essenceNote}`,
    `補助傾向: ${dobContext.auxiliaryNote}`,
    '',
    '【スタイル参考素材（文体・密度の参考のみ。丸写し厳禁）】',
    `s1参考: ${fallbackMaterial.s1Note}`,
    `s2参考: ${fallbackMaterial.s2Note}`,
    `s3参考: ${fallbackMaterial.s3Note}`,
    `s4参考: ${fallbackMaterial.s4Note}`,
    '',
    '上記を踏まえ、4章構成のプレミアムレポート本文をJSON形式で生成すること。',
  ].join('\n');

  return { systemMessage, userMessage };
}

// ── Provider factory ──────────────────────────────────────────────────────────

/**
 * Create an OpenAI-backed HybridAiProvider.
 *
 * Options:
 * - `model`: OpenAI model name (default: 'gpt-4.1-mini')
 * - `timeoutMs`: request timeout in ms (default: 10_000)
 * - `apiKey`: overrides process.env.OPENAI_API_KEY; resolved at generate() time
 * - `client`: test-injectable client; bypasses real OpenAI construction entirely
 *
 * Construction never throws — only generate() throws when no usable key/client.
 */
export function createOpenAiHybridAiProvider(options: {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  client?: OpenAILikeClientForTest;
} = {}): HybridAiProvider {
  const model = options.model ?? OPENAI_DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    providerId: `openai_${model}`,

    async generate(payload: HybridAiPromptPayload): Promise<HybridAiProviderOutput> {
      // ── Resolve client ───────────────────────────────────────────────────
      let client: OpenAILikeClientForTest;
      if (options.client) {
        client = options.client;
      } else {
        const apiKey = options.apiKey ?? process.env['OPENAI_API_KEY'];
        if (!apiKey) {
          throw new Error('openai_provider_missing_api_key');
        }
        // OpenAI structurally satisfies OpenAILikeClientForTest
        client = new OpenAI({ apiKey }) as unknown as OpenAILikeClientForTest;
      }

      // ── Serialize prompt (no raw DOB / PII) ──────────────────────────────
      const { systemMessage, userMessage } = serializeHybridPayloadToMessages(payload);

      // ── Call with timeout (AbortController + Promise.race) ───────────────
      const controller = new AbortController();
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          controller.abort();
          reject(new Error('provider_timeout'));
        }, timeoutMs);
      });

      let raw: OpenAICompletionResult;
      try {
        raw = await Promise.race([
          client.chat.completions.create(
            {
              model,
              messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: userMessage },
              ],
              response_format: SECTION_RESPONSE_FORMAT,
              temperature: GENERATE_TEMPERATURE,
              max_tokens: GENERATE_MAX_TOKENS,
            },
            { signal: controller.signal },
          ),
          timeoutPromise,
        ]);
      } finally {
        clearTimeout(timeoutHandle);
      }

      // ── Parse and validate output ────────────────────────────────────────
      const content = raw.choices[0]?.message?.content ?? null;
      if (!content || content.trim().length === 0) {
        throw new Error('provider_malformed_output: empty content');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error('provider_malformed_output: invalid JSON');
      }

      if (!isSectionOutput(parsed)) {
        throw new Error('provider_malformed_output: missing or empty required sections');
      }

      // ── Return safe output — no raw response, no PII ─────────────────────
      return {
        s1_identity: parsed.s1_identity,
        s2_composition: parsed.s2_composition,
        s3_essence: parsed.s3_essence,
        s4_strengths: parsed.s4_strengths,
        providerMeta: {
          modelName: model,
          promptVersion: payload.promptVersion,
          tokensUsed:
            typeof raw.usage?.total_tokens === 'number'
              ? raw.usage.total_tokens
              : undefined,
        },
      };
    },
  };
}
