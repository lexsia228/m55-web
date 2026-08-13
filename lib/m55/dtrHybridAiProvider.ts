/**
 * Hybrid AI snapshot generation provider interface.
 *
 * This module defines the contract for AI-based paid DTR body generation.
 * No real AI provider is called here — production integration is a separate gate.
 *
 * Design principles:
 * - Provider receives a structured HybridAiPromptPayload; it must not receive raw
 *   internal labels, stem codes, or DB identifiers.
 * - Provider must return the four section bodies (s1–s4) or throw.
 * - Caller is responsible for quality validation and fail-closed fallback.
 */
import type { HybridAiPromptPayload } from './dtrHybridAiPrompt';

// ── Output type ────────────────────────────────────────────────────────────────

export type HybridAiProviderOutput = {
  s1_identity: string;
  s2_composition: string;
  s3_essence: string;
  s4_strengths: string;
  /** Internal provider metadata — must NOT appear in user-facing text. */
  providerMeta?: {
    modelName?: string;
    promptVersion?: string;
    tokensUsed?: number;
  };
};

// ── Provider interface ─────────────────────────────────────────────────────────

/**
 * Interface for any AI provider that generates paid DTR section bodies.
 *
 * Contract:
 * - Receives only HybridAiPromptPayload — no raw DB IDs, stem codes, or internal labels.
 * - Returns four section bodies when generation succeeds.
 * - Throws on timeout, network error, or malformed response (caller handles as fallback).
 * - Provider MUST NOT persist any user data or self-learn.
 * - Real provider implementations are a separate gate.
 */
export type HybridAiProvider = {
  readonly providerId: string;
  generate(payload: HybridAiPromptPayload): Promise<HybridAiProviderOutput>;
};

// ── Mock / test providers ──────────────────────────────────────────────────────

/**
 * Mock provider that returns plausible, quality-passing bodies.
 * For tests — never called in production.
 */
export function createMockHybridAiProvider(
  overrides?: Partial<HybridAiProviderOutput>,
): HybridAiProvider {
  return {
    providerId: 'mock_pass',
    async generate(payload): Promise<HybridAiProviderOutput> {
      const trait = payload.traitContext.publicTitle;
      const season = payload.dobContext.seasonDescription;
      const interNote = payload.traitContext.interactionNote;
      return {
        s1_identity: overrides?.s1_identity ??
          `${trait}の力は、方向が決まるほど安定しやすくなります。自分の輪郭が出やすい場面では、向きを短く確かめると動き出しが整いやすくなります。${interNote}この形を知っておくと、力が出やすい場面を自分で作りやすくなります。日常の中で小さく確かめる習慣を置くほど、自分の輪郭がはっきりしやすくなります。`,
        s2_composition: overrides?.s2_composition ??
          `仕事の段取りでは、試す範囲を先に決めるほど扱いやすくなります。${trait}の進め方として、一手ずつ確かめながら進む形が合いやすくなります。最初の一手を小さく置くほど、後から修正しやすくなります。進め方の区切りを先に決めておくと、負荷を分散しやすくなります。`,
        s3_essence: overrides?.s3_essence ??
          `安定しやすい条件から見ると、${season}。${trait}の本質は、急がず確かめる場面で力を発揮しやすい形にあります。節目を意識することで、このリズムを長く続けるための軸が生まれます。生活の節目ごとに短く立ち止まるほど、安定の感覚を保ちやすくなります。`,
        s4_strengths: overrides?.s4_strengths ??
          `生活のリズムとして、疲れが出やすい場面を先に把握しておくほど、戻しやすくなります。短く区切って休む時間を入れるほど力が持続します。切り替えのサインを自分で決めておくと、消耗を抑えやすくなります。小さな区切りを習慣にすることが、長く動き続けるための助けになります。`,
        providerMeta: { modelName: 'mock', promptVersion: payload.promptVersion },
      };
    },
  };
}

/**
 * Mock provider that always throws — for testing fallback behaviour.
 */
export function createThrowingMockProvider(): HybridAiProvider {
  return {
    providerId: 'mock_throw',
    async generate(): Promise<never> {
      throw new Error('mock provider error: simulated timeout');
    },
  };
}

/**
 * Mock provider that returns a forbidden-phrase body — for testing quality rejection.
 */
export function createForbiddenPhraseMockProvider(
  phrase = 'このタイプの人は必ず成功します',
): HybridAiProvider {
  return {
    providerId: 'mock_forbidden',
    async generate(): Promise<HybridAiProviderOutput> {
      return {
        s1_identity: phrase,
        s2_composition: phrase,
        s3_essence: phrase,
        s4_strengths: phrase,
      };
    },
  };
}

/**
 * Mock provider that returns too-short bodies — for testing length rejection.
 */
export function createTooShortMockProvider(): HybridAiProvider {
  return {
    providerId: 'mock_too_short',
    async generate(): Promise<HybridAiProviderOutput> {
      return {
        s1_identity: '短い。',
        s2_composition: '短い。',
        s3_essence: '短い。',
        s4_strengths: '短い。',
      };
    },
  };
}

/**
 * Mock provider that returns malformed output (missing required sections).
 */
export function createMalformedMockProvider(): HybridAiProvider {
  return {
    providerId: 'mock_malformed',
    async generate(): Promise<HybridAiProviderOutput> {
      return {
        s1_identity: '',
        s2_composition: '',
        s3_essence: '',
        s4_strengths: '',
      };
    },
  };
}
