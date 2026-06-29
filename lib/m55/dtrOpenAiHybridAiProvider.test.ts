/**
 * OpenAI HybridAiProvider mocked tests.
 *
 * All tests use injected mock clients — NO real OpenAI API calls are made.
 * Covers: default model, timeout, structured output parsing, safety, and env guard.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import { DOB_PERSONALIZATION_V21_CATALOG_VERSION } from './dtrDobPersonalizationV2';
import { composePaidIndividualizationFromEngineContext } from './dtrPaidIndividualizationCompose';
import { buildPaidDtrChapterMaterialPack } from './dtrPaidChapterMaterialPack';
import { buildHybridAiPromptPayload } from './dtrHybridAiPrompt';
import {
  createOpenAiHybridAiProvider,
  serializeHybridPayloadToMessages,
  OPENAI_DEFAULT_MODEL,
  type OpenAILikeClientForTest,
  type OpenAICompletionResult,
} from './dtrOpenAiHybridAiProvider';
import {
  DTR_HYBRID_AI_ENABLED_ENV,
  isDtrHybridAiFulfillmentEnabled,
} from './dtrFulfillmentSnapshotGenerationHook';

// ── Fixture helpers ───────────────────────────────────────────────────────────

function buildTestPayload(birthDate = '1985-06-15') {
  resetCalendarBundleCacheForTests();
  const built = buildV2FulfillmentSnapshotFromFields(
    {
      nickname: 'test',
      birthDate,
      birthTime: '12:00:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: null,
      timezone: 'Asia/Tokyo',
    },
    { dobPersonalizationV2Enabled: true },
  );
  const ctx = {
    ...built.engine_context_json,
    dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
  };
  const ind = composePaidIndividualizationFromEngineContext(ctx);
  const materialPack = buildPaidDtrChapterMaterialPack(ctx, ind);
  return buildHybridAiPromptPayload(materialPack, ind);
}

/** Build a well-formed OpenAICompletionResult with all 4 sections (each ≥120 chars). */
function makeValidResult(overrides?: Partial<{
  s1_identity: string;
  s2_composition: string;
  s3_essence: string;
  s4_strengths: string;
}>): OpenAICompletionResult {
  const body = {
    s1_identity:
      overrides?.s1_identity ??
      '自分の形として、力の出やすい場面を先に把握しておくほど、動き出しが安定しやすくなります。生年月日のリズムから見ると、始める場面で向きを確かめるほど整いやすくなります。この輪郭を知っておくことが、長く続けるための土台になります。方向が決まるほど力が出やすくなる形を、日常の中で意識しておくことが助けになります。',
    s2_composition:
      overrides?.s2_composition ??
      '進め方を組み立てるとき、一手ずつ確かめながら進む形が合いやすくなります。段取りの最初を小さく置くほど、後から修正しやすくなります。ペースを整えながら進む動き方が続きやすくなります。試す範囲を先に決めておくほど、扱いやすくなる場面が増えます。',
    s3_essence:
      overrides?.s3_essence ??
      '生年月日の細かなリズムから見ると、土台を先に整えるほど安定しやすくなります。本質のリズムは急がず確かめる場面で力を発揮しやすい形にあります。節目を意識することが、長く続けるための軸になります。流れを一度確かめることが、安定の核心になりやすくなります。',
    s4_strengths:
      overrides?.s4_strengths ??
      '疲れが出やすい場面を先に把握しておくほど、戻しやすくなります。短く区切って休む時間を入れるほど力が持続します。切り替えのサインを自分で決めておくと、消耗を抑えやすくなります。小さな区切りを習慣にすることが、長く動き続けるための助けになります。',
  };
  return {
    choices: [{ message: { content: JSON.stringify(body) } }],
    usage: { total_tokens: 350 },
  };
}

/** Build a mock client wrapping a create implementation. */
function makeClient(
  impl: (
    params: Parameters<OpenAILikeClientForTest['chat']['completions']['create']>[0],
    options?: { signal?: AbortSignal },
  ) => Promise<OpenAICompletionResult>,
): OpenAILikeClientForTest {
  return { chat: { completions: { create: impl } } };
}

/** Simple passing mock client that records last call params. */
function makeCapturingClient(result: OpenAICompletionResult): {
  client: OpenAILikeClientForTest;
  getLastParams: () => Parameters<OpenAILikeClientForTest['chat']['completions']['create']>[0] | undefined;
} {
  let lastParams: Parameters<OpenAILikeClientForTest['chat']['completions']['create']>[0] | undefined;
  const client = makeClient(async (params) => {
    lastParams = params;
    return result;
  });
  return { client, getLastParams: () => lastParams };
}

// ── Test 1: default model is gpt-4.1-mini ────────────────────────────────────

describe('OpenAI provider — default model', () => {
  it('providerId reflects gpt-4.1-mini when no model specified', () => {
    const provider = createOpenAiHybridAiProvider({});
    assert.equal(provider.providerId, `openai_${OPENAI_DEFAULT_MODEL}`);
    assert.equal(OPENAI_DEFAULT_MODEL, 'gpt-4.1-mini');
  });

  it('model param is sent as gpt-4.1-mini in API call', async () => {
    const payload = buildTestPayload();
    const { client, getLastParams } = makeCapturingClient(makeValidResult());
    const provider = createOpenAiHybridAiProvider({ client });
    await provider.generate(payload);
    assert.equal(getLastParams()?.model, 'gpt-4.1-mini');
  });

  it('custom model overrides default', async () => {
    const payload = buildTestPayload();
    const { client, getLastParams } = makeCapturingClient(makeValidResult());
    const provider = createOpenAiHybridAiProvider({ client, model: 'gpt-4o-mini' });
    await provider.generate(payload);
    assert.equal(getLastParams()?.model, 'gpt-4o-mini');
    assert.equal(provider.providerId, 'openai_gpt-4o-mini');
  });
});

// ── Test 2: timeout behaviour (default is 25s; tests use explicit short values) ──

describe('OpenAI provider — timeout', () => {
  it('times out when provider is slow (using short timeoutMs)', async () => {
    const payload = buildTestPayload();
    const neverClient = makeClient(
      () => new Promise<OpenAICompletionResult>(() => { /* never resolves */ }),
    );
    const provider = createOpenAiHybridAiProvider({ client: neverClient, timeoutMs: 20 });

    await assert.rejects(
      () => provider.generate(payload),
      (e: unknown) => {
        assert.ok(e instanceof Error, 'should be Error');
        assert.match(e.message, /provider_timeout/);
        return true;
      },
    );
  });

  it('does not throw when client resolves before timeout', async () => {
    const payload = buildTestPayload();
    // 50ms delay but timeoutMs=200 → should pass
    const slowClient = makeClient(
      async (_, opts) => {
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        if (opts?.signal?.aborted) throw new Error('aborted');
        return makeValidResult();
      },
    );
    const provider = createOpenAiHybridAiProvider({ client: slowClient, timeoutMs: 200 });
    const result = await provider.generate(payload);
    assert.equal(result.s1_identity.length > 10, true);
  });
});

// ── Test 3: returns all 4 section bodies on valid JSON ───────────────────────

describe('OpenAI provider — valid JSON response', () => {
  it('returns all 4 section bodies on valid structured output', async () => {
    const payload = buildTestPayload();
    const { client } = makeCapturingClient(makeValidResult());
    const provider = createOpenAiHybridAiProvider({ client });
    const result = await provider.generate(payload);

    assert.ok(result.s1_identity.length > 10, 's1_identity should be non-trivial');
    assert.ok(result.s2_composition.length > 10, 's2_composition should be non-trivial');
    assert.ok(result.s3_essence.length > 10, 's3_essence should be non-trivial');
    assert.ok(result.s4_strengths.length > 10, 's4_strengths should be non-trivial');
  });

  it('sends response_format json_schema in the create call', async () => {
    const payload = buildTestPayload();
    const { client, getLastParams } = makeCapturingClient(makeValidResult());
    const provider = createOpenAiHybridAiProvider({ client });
    await provider.generate(payload);
    const rf = getLastParams()?.response_format;
    assert.ok(rf, 'response_format should be present');
    assert.equal(rf.type, 'json_schema');
    assert.ok(rf.json_schema, 'json_schema should be present');
  });

  it('sends system and user messages', async () => {
    const payload = buildTestPayload();
    const { client, getLastParams } = makeCapturingClient(makeValidResult());
    const provider = createOpenAiHybridAiProvider({ client });
    await provider.generate(payload);
    const messages = getLastParams()?.messages ?? [];
    assert.equal(messages.length, 2);
    assert.equal(messages[0]?.role, 'system');
    assert.equal(messages[1]?.role, 'user');
  });
});

// ── Test 4: malformed / missing sections throw ───────────────────────────────

describe('OpenAI provider — malformed output', () => {
  it('throws provider_malformed_output when JSON is invalid', async () => {
    const payload = buildTestPayload();
    const client = makeClient(async () => ({
      choices: [{ message: { content: 'not valid json {{' } }],
    }));
    const provider = createOpenAiHybridAiProvider({ client });
    await assert.rejects(
      () => provider.generate(payload),
      /provider_malformed_output/,
    );
  });

  it('throws provider_malformed_output when required section is missing', async () => {
    const payload = buildTestPayload();
    const client = makeClient(async () => ({
      choices: [{ message: { content: JSON.stringify({ s1_identity: 'only one section' }) } }],
    }));
    const provider = createOpenAiHybridAiProvider({ client });
    await assert.rejects(
      () => provider.generate(payload),
      /provider_malformed_output/,
    );
  });

  it('throws provider_malformed_output when content is empty', async () => {
    const payload = buildTestPayload();
    const client = makeClient(async () => ({
      choices: [{ message: { content: '' } }],
    }));
    const provider = createOpenAiHybridAiProvider({ client });
    await assert.rejects(
      () => provider.generate(payload),
      /provider_malformed_output/,
    );
  });

  it('throws provider_malformed_output when section body is empty string', async () => {
    const payload = buildTestPayload();
    const client = makeClient(async () => ({
      choices: [{ message: { content: JSON.stringify({
        s1_identity: '',
        s2_composition: '内容',
        s3_essence: '内容',
        s4_strengths: '内容',
      }) } }],
    }));
    const provider = createOpenAiHybridAiProvider({ client });
    await assert.rejects(
      () => provider.generate(payload),
      /provider_malformed_output/,
    );
  });
});

// ── Test 5: timeout throws safe error ────────────────────────────────────────

describe('OpenAI provider — timeout error safety', () => {
  it('timeout error message is provider_timeout (not stack trace or API detail)', async () => {
    const payload = buildTestPayload();
    const neverClient = makeClient(
      () => new Promise<OpenAICompletionResult>(() => {}),
    );
    const provider = createOpenAiHybridAiProvider({ client: neverClient, timeoutMs: 15 });

    let caughtError: unknown;
    try {
      await provider.generate(payload);
    } catch (e) {
      caughtError = e;
    }
    assert.ok(caughtError instanceof Error);
    assert.equal((caughtError as Error).message, 'provider_timeout');
    // Must not expose API key, raw response, or internal stack info
    assert.ok(!(caughtError as Error).message.includes('sk-'));
    assert.ok(!(caughtError as Error).message.includes('apiKey'));
  });
});

// ── Test 6: providerMeta safety ───────────────────────────────────────────────

describe('OpenAI provider — providerMeta safety', () => {
  it('providerMeta includes modelName and tokensUsed only', async () => {
    const payload = buildTestPayload();
    const { client } = makeCapturingClient(makeValidResult());
    const provider = createOpenAiHybridAiProvider({ client });
    const result = await provider.generate(payload);

    assert.ok(result.providerMeta, 'providerMeta should be present');
    assert.equal(result.providerMeta?.modelName, 'gpt-4.1-mini');
    assert.equal(result.providerMeta?.promptVersion, payload.promptVersion);
    assert.equal(result.providerMeta?.tokensUsed, 350);
  });

  it('providerMeta does NOT expose raw response, prompt, or messages', async () => {
    const payload = buildTestPayload();
    const { client } = makeCapturingClient(makeValidResult());
    const provider = createOpenAiHybridAiProvider({ client });
    const result = await provider.generate(payload);

    const serialized = JSON.stringify(result.providerMeta ?? {});
    assert.ok(!serialized.includes('choices'), 'raw choices must not be in providerMeta');
    assert.ok(!serialized.includes('messages'), 'messages must not be in providerMeta');
    assert.ok(!serialized.includes('system'), 'system prompt must not be in providerMeta');
    assert.ok(!serialized.includes('birth'), 'birth info must not be in providerMeta');
    assert.ok(!serialized.includes('email'), 'email must not be in providerMeta');
  });

  it('tokensUsed is undefined when usage is absent', async () => {
    const payload = buildTestPayload();
    const client = makeClient(async () => ({
      choices: [{ message: { content: JSON.stringify({
        s1_identity: makeValidResult().choices[0]!.message.content ? JSON.parse(makeValidResult().choices[0]!.message.content!).s1_identity : '内容あり',
        s2_composition: '進め方のリズムを整えながら進む形が合いやすくなります。',
        s3_essence: '土台を先に確かめるほど安定しやすくなります。',
        s4_strengths: '疲れのサインを早めに把握するほど戻しやすくなります。',
      }) } }],
      // no usage field
    }));
    const provider = createOpenAiHybridAiProvider({ client });
    const result = await provider.generate(payload);
    assert.equal(result.providerMeta?.tokensUsed, undefined);
  });
});

// ── Test 7: raw response not exposed in output ───────────────────────────────

describe('OpenAI provider — raw response isolation', () => {
  it('generate() output does not contain raw API response fields', async () => {
    const payload = buildTestPayload();
    const { client } = makeCapturingClient(makeValidResult());
    const provider = createOpenAiHybridAiProvider({ client });
    const result = await provider.generate(payload);

    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes('"choices"'), 'raw choices must not appear in output');
    assert.ok(!serialized.includes('"usage"'), 'raw usage must not appear as top-level key');
    assert.ok(!serialized.includes('"finish_reason"'), 'finish_reason must not appear in output');
    assert.ok(!serialized.includes('"created"'), 'created timestamp must not appear in output');
  });
});

// ── Test 8: no real API call in tests ────────────────────────────────────────

describe('OpenAI provider — no real API call', () => {
  it('generate() succeeds entirely through injected client without OPENAI_API_KEY', async () => {
    // Save and unset any key
    const savedKey = process.env['OPENAI_API_KEY'];
    delete process.env['OPENAI_API_KEY'];

    try {
      const payload = buildTestPayload();
      const { client } = makeCapturingClient(makeValidResult());
      // client injection bypasses all real API logic
      const provider = createOpenAiHybridAiProvider({ client });
      const result = await provider.generate(payload);
      assert.ok(result.s1_identity.length > 10);
    } finally {
      if (savedKey !== undefined) process.env['OPENAI_API_KEY'] = savedKey;
    }
  });

  it('throws openai_provider_missing_api_key when no client and no key', async () => {
    const savedKey = process.env['OPENAI_API_KEY'];
    delete process.env['OPENAI_API_KEY'];

    try {
      const payload = buildTestPayload();
      const provider = createOpenAiHybridAiProvider({}); // no client, no apiKey
      await assert.rejects(
        () => provider.generate(payload),
        /openai_provider_missing_api_key/,
      );
    } finally {
      if (savedKey !== undefined) process.env['OPENAI_API_KEY'] = savedKey;
    }
  });

  it('provider construction does not throw even without key (lazy resolution)', () => {
    const savedKey = process.env['OPENAI_API_KEY'];
    delete process.env['OPENAI_API_KEY'];
    try {
      // Must not throw at construction time
      assert.doesNotThrow(() => createOpenAiHybridAiProvider({}));
    } finally {
      if (savedKey !== undefined) process.env['OPENAI_API_KEY'] = savedKey;
    }
  });
});

// ── Test 9: no birth-time phrase or raw internal key in user-facing context ───

describe('OpenAI provider — no birth-time in prompt', () => {
  it('serialized system message includes birth-time prohibition instruction (expected)', () => {
    // The system message MUST tell the AI not to produce birth-time phrases.
    // Having "出生時刻" in a prohibition instruction is correct design, not a leak.
    const payload = buildTestPayload();
    const { systemMessage } = serializeHybridPayloadToMessages(payload);

    // The prohibition instruction must be present
    assert.ok(
      systemMessage.includes('出生時刻') || systemMessage.includes('birth time'),
      'System message must contain birth-time prohibition instruction for the AI',
    );
    // Raw clock values (hh:mm format) must not appear as data
    assert.ok(!systemMessage.includes('12:00'), 'Raw clock value must not appear in system message');
    assert.ok(!systemMessage.includes('00:00'), 'Raw clock value must not appear in system message');
  });

  it('serialized user message does not contain raw birth_date or birth_time', () => {
    const payload = buildTestPayload('1985-06-15');
    const { userMessage } = serializeHybridPayloadToMessages(payload);

    // Raw ISO date must not appear as literal data
    assert.ok(!userMessage.includes('1985-06-15'), 'Raw ISO birth_date must not appear in user message');
    assert.ok(!userMessage.includes('1985'), 'Raw birth year must not appear in user message');
    // Raw time values must not appear
    assert.ok(!userMessage.includes('12:00'), 'Raw birth_time must not appear in user message');
  });

  it('user message does not contain raw solarTerm keys as data', () => {
    // solarTerm keys appear in systemConstraints.forbiddenPhrases (system message prohibition list).
    // They must NOT appear as data in the user message (which carries the actual generation context).
    const payload = buildTestPayload();
    const { userMessage } = serializeHybridPayloadToMessages(payload);

    const internalKeys = [
      'xiaohan', 'dahan', 'lichun', 'yushui', 'jingzhe', 'chunfen',
      'stemLane', 'stemIdx', 'lunarDay',
    ];
    for (const key of internalKeys) {
      assert.ok(
        !userMessage.includes(key),
        `User message (context data) must not contain internal key: "${key}"`,
      );
    }
  });

  it('system message includes forbidden phrases prohibition list (containing solarTerm keys as constraints)', () => {
    // The system message SHOULD list xiaohan etc. in the "forbidden phrases" section so the AI
    // knows not to output them. This is intentional and correct.
    const payload = buildTestPayload();
    const { systemMessage } = serializeHybridPayloadToMessages(payload);

    assert.ok(
      systemMessage.includes('xiaohan') || systemMessage.includes('絶対禁止フレーズ'),
      'System message should include forbidden phrase list (possibly containing xiaohan as a term AI must not output)',
    );
  });
});

// ── Test 10: provider selection does not activate runtime when env unset ──────

describe('OpenAI provider — runtime activation guard', () => {
  it('isDtrHybridAiFulfillmentEnabled() is false when env unset (unchanged)', async () => {
    const savedVal = process.env[DTR_HYBRID_AI_ENABLED_ENV];
    delete process.env[DTR_HYBRID_AI_ENABLED_ENV];
    try {
      assert.equal(isDtrHybridAiFulfillmentEnabled(), false);
    } finally {
      if (savedVal !== undefined) process.env[DTR_HYBRID_AI_ENABLED_ENV] = savedVal;
    }
  });

  it('adding openai provider does not activate fulfillment runtime', async () => {
    const savedVal = process.env[DTR_HYBRID_AI_ENABLED_ENV];
    delete process.env[DTR_HYBRID_AI_ENABLED_ENV];
    try {
      // Construction of real provider must not activate anything
      const provider = createOpenAiHybridAiProvider({ client: makeClient(async () => makeValidResult()) });
      assert.equal(provider.providerId.startsWith('openai_'), true);
      assert.equal(isDtrHybridAiFulfillmentEnabled(), false);
    } finally {
      if (savedVal !== undefined) process.env[DTR_HYBRID_AI_ENABLED_ENV] = savedVal;
    }
  });

  it('provider source does not import supabase, stripe, or DB paths', () => {
    const src = readFileSync(
      new URL('./dtrOpenAiHybridAiProvider.ts', import.meta.url),
      'utf8',
    );
    assert.ok(!src.includes('supabase'), 'Provider must not import supabase');
    assert.ok(!src.includes("from '../stripe"), 'Provider must not import stripe');
    assert.ok(!src.includes('dtrDraftDb'), 'Provider must not import DB module');
    assert.ok(!src.includes('consult'), 'Provider must not reference consult paths');
    assert.ok(!src.includes('reply'), 'Provider must not reference reply paths');
  });

  it('provider source does not reference raw PII or DOB keys', () => {
    const src = readFileSync(
      new URL('./dtrOpenAiHybridAiProvider.ts', import.meta.url),
      'utf8',
    );
    // These are the prohibited meta keys — must not appear as stored data
    const prohibited = ['rawPrompt', 'rawResponse', 'rawBody', 'birth_date', 'birthDate', 'email', 'userId'];
    for (const key of prohibited) {
      // Allow the key in comments if necessary, but check it's not in assignment/storage context
      // Simple check: must not appear as a property key assignment
      assert.ok(
        !src.includes(`"${key}"`),
        `Provider source must not reference prohibited key as string literal: "${key}"`,
      );
    }
  });
});

// ── Integration: orchestration accepts openai provider ───────────────────────

describe('OpenAI provider — integration with orchestration', () => {
  it('can be used with runHybridAiSnapshotGeneration (via mock client)', async () => {
    const { runHybridAiSnapshotGeneration } = await import('./dtrHybridAiSnapshotGeneration');
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(
      {
        nickname: 'test',
        birthDate: '1990-03-20',
        birthTime: '12:00:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: null,
        timezone: 'Asia/Tokyo',
      },
      { dobPersonalizationV2Enabled: true },
    );
    const ctx = {
      ...built.engine_context_json,
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    };
    const ind = composePaidIndividualizationFromEngineContext(ctx);
    const { client } = makeCapturingClient(makeValidResult());
    const provider = createOpenAiHybridAiProvider({ client });

    const candidate = await runHybridAiSnapshotGeneration(ctx, ind, provider);
    assert.equal(candidate.meta.aiModelProvider, `openai_gpt-4.1-mini`);
    // Quality validation should pass (valid bodies from makeValidResult)
    assert.equal(candidate.ok, true);
    assert.equal(candidate.mode, 'hybrid_ai');
  });

  it('orchestration falls back when openai provider throws', async () => {
    const { runHybridAiSnapshotGeneration } = await import('./dtrHybridAiSnapshotGeneration');
    resetCalendarBundleCacheForTests();
    const built = buildV2FulfillmentSnapshotFromFields(
      {
        nickname: 'test',
        birthDate: '1992-08-10',
        birthTime: '12:00:00',
        birthTimeUnknown: false,
        country: 'JP',
        birthplace: null,
        timezone: 'Asia/Tokyo',
      },
      { dobPersonalizationV2Enabled: true },
    );
    const ctx = {
      ...built.engine_context_json,
      dobPersonalizationCatalogVersion: DOB_PERSONALIZATION_V21_CATALOG_VERSION,
    };
    const ind = composePaidIndividualizationFromEngineContext(ctx);

    // Provider that throws immediately
    const throwingClient = makeClient(async () => {
      throw new Error('provider_malformed_output: test error');
    });
    const provider = createOpenAiHybridAiProvider({ client: throwingClient });
    const candidate = await runHybridAiSnapshotGeneration(ctx, ind, provider);

    assert.equal(candidate.ok, false);
    assert.equal(candidate.mode, 'hybrid_ai_fallback');
    assert.equal(candidate.meta.qualityPassed, false);
    assert.match(candidate.failReason, /provider_throw/);
  });
});
