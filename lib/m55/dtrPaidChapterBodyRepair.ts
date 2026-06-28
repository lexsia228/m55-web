/**
 * Repair interface + fake implementation for paid DTR chapter body quality pipeline.
 *
 * Repair contract:
 * - Must NOT change main trait / auxiliary tendency / DOB-v2 materials.
 * - Must NOT re-interpret M55 composite astrology judgments.
 * - Handles only: text quality, repetition, naturalness, lifestyle language, internal label removal.
 * - One pass only; caller re-judges after repair.
 * - Production real AI repair is a separate gate (M55_DTR_CHAPTER_BODY_GEN_ENABLED activation).
 */

import type { ChapterBodyCheckId } from './dtrPaidChapterBodyJudge';
import type { ChapterMaterialPack } from './dtrPaidChapterMaterialPack';

// ── Interface ──

export type ChapterBodyRepairInput = {
  sectionId: string;
  body: string;
  materialPack: ChapterMaterialPack;
  failedChecks: readonly ChapterBodyCheckId[];
};

export type ChapterBodyRepairOutput = {
  body: string;
  /** True if repair was able to apply changes; false if input was returned unchanged. */
  changed: boolean;
};

export type ChapterBodyRepairProvider = {
  /**
   * Attempt a single-pass repair of the body text.
   * MUST NOT alter trait, auxiliary tendency, or DOB-v2 judgments.
   * Returns the repaired body (or original if no changes were possible).
   */
  repair(input: ChapterBodyRepairInput): Promise<ChapterBodyRepairOutput>;
};

// ── Fake / deterministic provider (for tests only) ──

const COLD_LANGUAGE_REPLACEMENTS: readonly [RegExp, string][] = [
  [/このタイプ/g, 'この動き方'],
  [/こういう人は/g, 'この場合は'],
  [/タイプの人/g, ''],
  [/そういう人は/g, 'そのような場合は'],
];

/**
 * Creates a fake, deterministic RepairProvider suitable for local tests.
 * Does NOT call any real AI provider.
 * Applies minimal text substitutions to fix minor issues detectable by static patterns.
 *
 * Fake repair rules (deterministic, no AI):
 * 1. Remove forbidden cold language patterns with neutral replacements.
 * 2. If dob_material_unreflected: prepend a DOB keyword phrase using season/phase from materialPack.
 * 3. If char_count_insufficient: append a brief density-padding phrase.
 */
export function createFakeChapterBodyRepairProvider(): ChapterBodyRepairProvider {
  return {
    async repair({ sectionId: _sectionId, body, materialPack, failedChecks }): Promise<ChapterBodyRepairOutput> {
      let result = body;
      let changed = false;

      // Fix cold language
      for (const [pattern, replacement] of COLD_LANGUAGE_REPLACEMENTS) {
        const next = result.replace(pattern, replacement);
        if (next !== result) { result = next; changed = true; }
      }

      // Fix dob_material_unreflected: prepend season/phase phrase
      if (failedChecks.includes('dob_material_unreflected')) {
        const seasonKw = materialPack.seasonJudgeKeywords[0] ?? '季節';
        const phaseKw  = materialPack.phaseJudgeKeywords[0] ?? '動き出し';
        const prefix = `生年月日の細かなリズムから見ると、${seasonKw}のエネルギーが基盤になります。${phaseKw}ことを意識すると、日々が整いやすくなります。\n\n`;
        result = prefix + result;
        changed = true;
      }

      // Fix char_count_insufficient: append density phrases (enough to clear 200–300 char minimums)
      if (failedChecks.includes('char_count_insufficient')) {
        result = result + [
          '',
          '',
          'このリズムを日常に取り入れることで、本来の動き方が安定していきます。',
          '自分のペースを保ちながら前に進むことで、長く続けやすくなります。',
          '節目ごとに立ち止まって確かめることも、大切な習慣のひとつです。',
          '生活の中でこのリズムを意識することが、整いやすくなる近道です。',
          '日々の小さな積み重ねが、やがて大きな安定へとつながっていきます。',
        ].join('\n');
        changed = true;
      }

      return { body: result, changed };
    },
  };
}
