/**
 * Tests for DTR Visible Copy Naturalness Guardrail.
 *
 * Coverage:
 *  1. Guard rejects internal analysis terms
 *  2. Guard rejects 読み取りです
 *  3. Guard rejects raw computation / 正午基準
 *  4. Guard rejects duplicate nearby sentence
 *  5. Guard accepts M55 lifestyle-language replacement
 *  6. DOB-v2 essence block does not contain forbidden terms (source inspection)
 *  7. DOB-v2 support block does not contain forbidden terms (source inspection)
 *  8. Existing seed / fallback body (stem 9) does not leak internal terms (source inspection)
 *  9. Displayed reader fixture passes naturalness guard
 * 10. Future generated body fixture must pass before activation
 *
 * No DB, no network, no real AI, no production POST, no module dynamic import needed.
 * Pure function calls + source-file string inspection only.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  checkNaturalness,
  checkForbiddenInternalTerms,
  checkForbiddenMechanicalPhrases,
  checkRawComputationDisclosure,
  checkForbiddenObservationTerms,
  checkForbiddenSystemFraming,
  checkForbiddenColdEvaluationPhrases,
  checkRepeatedSentenceNearby,
  assertNaturalness,
} from './dtrVisibleCopyNaturalness.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');

function readSrc(relPath: string): string {
  return readFileSync(join(repoRoot, relPath), 'utf8');
}

// ─── source snapshots ────────────────────────────────────────────────────────
const dobV2Src = readSrc('lib/m55/dtrDobPersonalizationV2.ts');
const engineSrc = readSrc('lib/m55/dtrEngine.ts');
const composeSrc = readSrc('lib/m55/dtrPaidIndividualizationCompose.ts');

describe('DTR Visible Copy Naturalness Guardrail — pure function tests', () => {
  // ── 1. Reject internal analysis terms ────────────────────────────────────
  it('rejects 感受の解像度 (internal analysis term)', () => {
    const result = checkNaturalness('構成は、感受の解像度が高く、安定と精度が観測を支えます。');
    assert.equal(result.pass, false);
    const rules = result.violations.map(v => v.rule);
    assert.ok(rules.includes('forbidden_internal_term'), 'should flag forbidden_internal_term');
  });

  it('rejects 微細な信号 (internal analysis term)', () => {
    const result = checkForbiddenInternalTerms('微細な信号からパターンを立ち上げることです。');
    assert.ok(result.length > 0, 'must flag 微細な信号');
    assert.equal(result[0]!.match, '微細な信号');
  });

  it('rejects 外部化 (internal term)', () => {
    const result = checkForbiddenInternalTerms('気づきを小さく外部化し、内側だけで完結しないこと');
    assert.ok(result.length > 0, 'must flag 外部化');
  });

  it('rejects 観測所型 (scientific observer label)', () => {
    const result = checkForbiddenObservationTerms('ひと言で言えば、観測所型です。');
    assert.ok(result.length > 0, 'must flag 観測所型');
  });

  it('rejects 観測を支えます (scientific observation in body)', () => {
    const result = checkForbiddenObservationTerms('安定と精度が観測を支えます。');
    assert.ok(result.length > 0);
  });

  it('rejects 長期記憶として保持 (computational memory term)', () => {
    const result = checkForbiddenInternalTerms('言葉・状況のズレを長期記憶として保持できます。');
    assert.ok(result.length > 0, 'must flag 長期記憶として保持');
  });

  // ── 2. Reject 読み取りです ────────────────────────────────────────────────
  it('rejects 読み取りです。 as a sentence ending', () => {
    const result = checkForbiddenMechanicalPhrases(
      '向きを決めてから動く力が、日々の区切りと結びつきやすい読み取りです。',
    );
    assert.ok(result.length > 0, 'must flag 読み取りです。');
    assert.equal(result[0]!.rule, 'forbidden_mechanical_phrase');
  });

  it('rejects multiple 読み取りです occurrences (excess reading-style)', () => {
    const block = [
      '月初めに近いリズムがあり、始める前の準備を短く置くと落ち着きやすい読み取りです。',
      '動きが戻りやすいリズムがあり、小さな試行を早めに出すほど、手ごたえを得やすい読み取りです。',
    ].join('\n');
    const result = checkForbiddenMechanicalPhrases(block);
    assert.ok(result.length >= 2, 'must flag both occurrences');
  });

  // ── 3. Reject raw computation / 正午基準 ───────────────────────────────────
  it('rejects 正午基準 (raw computation disclosure)', () => {
    const result = checkRawComputationDisclosure(
      '生活リズムは正午基準で静かに補正した読み取りです。',
    );
    assert.ok(result.length > 0, 'must flag 正午基準');
    assert.ok(
      result.some(v => v.match === '正午基準'),
      'match should be 正午基準',
    );
  });

  it('rejects 補正した読み取り (computation framing)', () => {
    const result = checkRawComputationDisclosure('正午基準で静かに補正した読み取りです。');
    assert.ok(result.some(v => v.match === '補正した読み取り'));
  });

  // ── 4. Reject duplicate nearby sentence ───────────────────────────────────
  it('rejects a block with a duplicate sentence', () => {
    const sentence = '続ける場面では、一度置いた流れを途中で確かめる時間を入れると、疲れが溜まりにくくなります。';
    const block = `${sentence}\n別の文がここにあります。\n${sentence}`;
    const result = checkRepeatedSentenceNearby(block);
    assert.ok(result.length > 0, 'must flag duplicate sentence');
    assert.ok(result.some(v => v.rule === 'repeated_sentence_nearby'));
  });

  it('accepts a block with no duplicate sentences', () => {
    const block = [
      '始める場面では、最初から大きく抱えず、試す範囲を小さく切ると扱いやすくなります。',
      '続ける場面では、一度置いた流れを途中で確かめる時間を入れると、疲れが溜まりにくくなります。',
      '区切る場面では、終えるものと残すものを分けてから動くと、次の一歩が軽くなります。',
    ].join('\n');
    const result = checkRepeatedSentenceNearby(block);
    assert.equal(result.length, 0, 'no duplicates expected');
  });

  // ── 5. Accept M55 lifestyle-language replacements ─────────────────────────
  it('accepts natural lifestyle-language body for stem 9 composition replacement', () => {
    // fixture matches the patched stem 9 composition source (外からは慎重に見えても removed)
    const natural =
      '細かな違和感や小さな変化に気づきやすく、落ち着いて深く入るほど力が出ます。' +
      '派手に広げる型ではなく、染み込むように深く入る型です。\n' +
      '力として出やすいのは、人が見落としやすい変化を拾い、何が起きているかを言葉にすることです。' +
      '言葉や状況のズレを静かに積み上げられます。\n' +
      'つまずきやすいのは、深掘りが完了を遅らせるときです。' +
      '慎重に見えることが多いですが、内側では「まだ足りない」という感覚が先に立ちやすいです。\n' +
      'ひと言で言えば、積み上げ型です。急いで出すより、確かめてから届けるほうが価値が伝わります。' +
      'ただし、発信が遅れると貢献が見えず、手ごたえが空振りします。';
    const result = checkNaturalness(natural);
    assert.equal(result.pass, true, `Expected pass but got violations: ${JSON.stringify(result.violations)}`);
  });

  it('accepts natural 生まれ時刻 note without 正午基準', () => {
    const natural = '生まれ時刻が未入力の場合でも、ここでは一日の細かな時間より、大きな流れを中心に見ています。';
    const result = checkNaturalness(natural);
    assert.equal(result.pass, true, `Expected pass: ${JSON.stringify(result.violations)}`);
  });

  it('accepts natural STEM_RHYTHM_LEAD (no 読み取りです)', () => {
    const natural = '小さな変化を読む力があります。気づいたことを短く言葉にして外に出すほど、ひとりで抱え込みにくくなります。';
    const result = checkNaturalness(natural);
    assert.equal(result.pass, true, `Expected pass: ${JSON.stringify(result.violations)}`);
  });

  it('assertNaturalness does not throw for clean text', () => {
    assert.doesNotThrow(() => assertNaturalness('向きが決まるほど力を出しやすくなります。', 'test'));
  });

  it('assertNaturalness throws for text containing 観測所型', () => {
    assert.throws(
      () => assertNaturalness('ひと言で言えば、観測所型です。', 'test'),
      /Naturalness guard failed/,
    );
  });

  // ── B3: 速報より、蓄積 ────────────────────────────────────────────────────
  it('rejects 速報より、蓄積 (system framing phrase) [B3]', () => {
    const result = checkForbiddenSystemFraming('ひと言で言えば、観測所型です。速報より、蓄積。');
    assert.ok(result.length > 0, 'must flag 速報より、蓄積');
    assert.equal(result[0]!.rule, 'forbidden_system_framing');
    assert.equal(result[0]!.match, '速報より、蓄積');
  });

  it('checkNaturalness rejects text containing 速報より、蓄積 [B3]', () => {
    const result = checkNaturalness('速報より、蓄積。ただし、発信が遅れると貢献が見えない。');
    assert.equal(result.pass, false);
    assert.ok(result.violations.some(v => v.rule === 'forbidden_system_framing'));
  });

  it('assertNaturalness throws for 速報より、蓄積 [B3]', () => {
    assert.throws(
      () => assertNaturalness('速報より、蓄積。', 'test'),
      /Naturalness guard failed/,
    );
  });

  // ── B4: 外からは〜見えても (cold evaluation phrases) ──────────────────────
  it('rejects 外からは慎重に見えても (cold evaluation phrase) [B4]', () => {
    const result = checkForbiddenColdEvaluationPhrases(
      '外からは慎重に見えても、内側では「まだ足りない」が先に立ちやすいです。',
    );
    assert.ok(result.length > 0, 'must flag 外からは慎重に見えても');
    assert.equal(result[0]!.rule, 'forbidden_cold_evaluation');
  });

  it('rejects 外からは細かい人に見えても (cold evaluation phrase) [B4]', () => {
    const result = checkForbiddenColdEvaluationPhrases(
      '外からは細かい人に見えても、内側では「見落としたら終わる」という恐怖がある。',
    );
    assert.ok(result.length > 0, 'must flag 外からは細かい人に見えても');
  });

  it('rejects 外からは器用に見えても (cold evaluation phrase) [B4]', () => {
    const result = checkForbiddenColdEvaluationPhrases(
      '外からは器用に見えても、内側では集中の喪失が怖く、次々に手を伸ばします。',
    );
    assert.ok(result.length > 0, 'must flag 外からは器用に見えても');
  });

  it('checkNaturalness rejects 外からは慎重に見えても via master check [B4]', () => {
    const result = checkNaturalness('外からは慎重に見えても、実際は多くを積み上げています。');
    assert.equal(result.pass, false);
    assert.ok(result.violations.some(v => v.rule === 'forbidden_cold_evaluation'));
  });

  it('accepts patched stem 9 replacement without 外からは慎重に見えても [B4]', () => {
    const patched = '慎重に見えることが多いですが、内側では「まだ足りない」という感覚が先に立ちやすいです。';
    const result = checkNaturalness(patched);
    assert.equal(result.pass, true, `Expected pass: ${JSON.stringify(result.violations)}`);
  });
});

describe('DOB-v2 source inspection — forbidden terms must not appear', () => {
  // ── 6. Essence block source ───────────────────────────────────────────────
  it('STEM_RHYTHM_LEADS does not contain 読み取りです。', () => {
    // Extract the STEM_RHYTHM_LEADS block
    const match = dobV2Src.match(/STEM_RHYTHM_LEADS[^][\s\S]*?\] as const/);
    assert.ok(match, 'STEM_RHYTHM_LEADS block should be found');
    const block = match[0];
    assert.ok(!block.includes('読み取りです。'), 'STEM_RHYTHM_LEADS must not contain 読み取りです。');
    assert.ok(!block.includes('読み取りです\n'), 'STEM_RHYTHM_LEADS must not contain 読み取りです (newline)');
  });

  it('MONTH_RHYTHMS does not contain 読み取りです。', () => {
    const match = dobV2Src.match(/MONTH_RHYTHMS[^][\s\S]*?\] as const/);
    assert.ok(match, 'MONTH_RHYTHMS block should be found');
    const block = match[0];
    assert.ok(!block.includes('読み取りです。'), 'MONTH_RHYTHMS must not contain 読み取りです。');
  });

  it('BIRTH_TIME_UNKNOWN_NOTE does not contain 正午基準', () => {
    assert.ok(
      !dobV2Src.includes('正午基準'),
      'dtrDobPersonalizationV2.ts must not contain 正午基準',
    );
  });

  it('BIRTH_TIME_UNKNOWN_NOTE does not contain 補正した読み取り', () => {
    assert.ok(
      !dobV2Src.includes('補正した読み取り'),
      'dtrDobPersonalizationV2.ts must not contain 補正した読み取り',
    );
  });

  // ── 7. Support (s7) block source ──────────────────────────────────────────
  it('s7 prefix builder does not add handlingHint again (duplicate fix)', () => {
    // auxiliaryReading already contains handlingHint; the compose should not add it separately
    assert.ok(
      !composeSrc.includes('ind.handlingHint'),
      'dtrPaidIndividualizationCompose.ts: s7 prefix must not include ind.handlingHint to avoid duplicate',
    );
  });

  it('DOB-v2 source does not contain 外部化', () => {
    assert.ok(!dobV2Src.includes('外部化'), 'dtrDobPersonalizationV2.ts must not contain 外部化');
  });

  // ── B1: stem 7 and stem 8 opener source inspection ───────────────────────
  it('stem 7 composition does not start with 構成は、 [B1]', () => {
    // Find the stem 7 composition value
    const stem7Match = engineSrc.match(/\/\* stem 7 \*\/[\s\S]*?composition:\s*\n?\s*'([^']*)/);
    assert.ok(stem7Match, 'stem 7 composition should be found');
    const opener = stem7Match[1]!;
    assert.ok(!opener.startsWith('構成は、'), `stem 7 must not start with 構成は、 — got: ${opener.slice(0, 30)}`);
  });

  it('stem 8 composition does not start with 構成は、 [B1]', () => {
    const stem8Match = engineSrc.match(/\/\* stem 8 \*\/[\s\S]*?composition:\s*\n?\s*'([^']*)/);
    assert.ok(stem8Match, 'stem 8 composition should be found');
    const opener = stem8Match[1]!;
    assert.ok(!opener.startsWith('構成は、'), `stem 8 must not start with 構成は、 — got: ${opener.slice(0, 30)}`);
  });

  it('stem 7 composition does not contain 外からは細かい人に見えても [B1+B4]', () => {
    assert.ok(
      !engineSrc.includes('外からは細かい人に見えても'),
      'stem 7 must not contain 外からは細かい人に見えても',
    );
  });

  it('stem 8 composition does not contain 外からは器用に見えても [B1+B4]', () => {
    assert.ok(
      !engineSrc.includes('外からは器用に見えても'),
      'stem 8 must not contain 外からは器用に見えても',
    );
  });

  // ── B2: 観測 removal source inspection ───────────────────────────────────
  it('IDENTITY_DESIGN_VIZ[9].blueprint.natural does not contain 観測 [B2]', () => {
    assert.ok(
      !engineSrc.includes('静かに観測し'),
      'blueprint.natural must not contain 静かに観測し',
    );
  });

  // ── B3: 速報より、蓄積 source inspection ─────────────────────────────────
  it('dtrEngine.ts does not contain 速報より、蓄積 [B3]', () => {
    assert.ok(
      !engineSrc.includes('速報より、蓄積'),
      'dtrEngine.ts must not contain 速報より、蓄積',
    );
  });

  // ── B4: 外からは慎重に見えても source inspection ──────────────────────────
  it('stem 9 composition does not contain 外からは慎重に見えても [B4]', () => {
    assert.ok(
      !engineSrc.includes('外からは慎重に見えても'),
      'stem 9 must not contain 外からは慎重に見えても after patch',
    );
  });
});

describe('Seed body / engine source inspection — forbidden terms must not appear', () => {
  // ── 8. Stem 9 STEM_SEED_BODIES ────────────────────────────────────────────
  it('stem 9 composition does not contain 感受の解像度', () => {
    assert.ok(!engineSrc.includes('感受の解像度'), 'dtrEngine.ts must not contain 感受の解像度');
  });

  it('stem 9 composition does not contain 微細な信号', () => {
    assert.ok(!engineSrc.includes('微細な信号'), 'dtrEngine.ts must not contain 微細な信号');
  });

  it('stem 9 composition does not contain 観測所型', () => {
    assert.ok(!engineSrc.includes('観測所型'), 'dtrEngine.ts must not contain 観測所型');
  });

  it('stem 9 composition does not contain 長期記憶として保持', () => {
    assert.ok(
      !engineSrc.includes('長期記憶として保持'),
      'dtrEngine.ts must not contain 長期記憶として保持',
    );
  });

  it('stem 9 strengths does not contain 観測した事実', () => {
    assert.ok(
      !engineSrc.includes('観測した事実'),
      'dtrEngine.ts must not contain 観測した事実',
    );
  });

  it('ESSENCE_STABILITY_VIZ guard does not contain 外部化', () => {
    assert.ok(!engineSrc.includes('外部化'), 'dtrEngine.ts must not contain 外部化');
  });

  it('strengthEmergence for stem 9 does not contain 微細な信号', () => {
    // After rewrite, strengthEmergence should be natural
    assert.ok(
      !engineSrc.includes('微細な信号からの立ち上がり'),
      'strengthEmergence must not reference 微細な信号',
    );
  });

  it('patternLabel for stem 9 does not contain 観測', () => {
    assert.ok(
      !engineSrc.includes('観測蓄積型'),
      'patternLabel must not be 観測蓄積型 (changed to 積み上げ型)',
    );
  });

  // ── 9. Reader fixture — key visible copy passes guard ─────────────────────
  it('replacement stem 9 composition fixture passes naturalness guard', () => {
    const fixture =
      '細かな違和感や小さな変化に気づきやすく、落ち着いて深く入るほど力が出ます。\n' +
      '力として出やすいのは、人が見落としやすい変化を拾い、何が起きているかを言葉にすることです。\n' +
      'ひと言で言えば、積み上げ型です。確かめてから届けるほうが価値が伝わります。';
    const result = checkNaturalness(fixture);
    assert.equal(result.pass, true, `Reader fixture failed guard: ${JSON.stringify(result.violations)}`);
  });

  it('replacement DOB-v2 essence note fixture passes naturalness guard', () => {
    const fixture = [
      '生年月日の細かなリズムから見ると、',
      '小さな変化を読む力があります。気づいたことを短く言葉にして外に出すほど、ひとりで抱え込みにくくなります。',
      '見直しと整理に向きやすい時期の生まれとして、残すものを先に決めるほど、無理のない集中に戻りやすくなります。',
      '深まりを確かめるリズムがあります。急いで決めず短く検討するほど、落ち着きやすくなります。',
    ].join('\n');
    const result = checkNaturalness(fixture);
    assert.equal(result.pass, true, `DOB-v2 essence fixture failed: ${JSON.stringify(result.violations)}`);
  });

  it('replacement BIRTH_TIME_UNKNOWN_NOTE fixture passes naturalness guard', () => {
    const note = '生まれ時刻が未入力の場合でも、ここでは一日の細かな時間より、大きな流れを中心に見ています。';
    const result = checkNaturalness(note);
    assert.equal(result.pass, true, `Birth time note failed: ${JSON.stringify(result.violations)}`);
  });

  // ── 10. Future AI-generated body must pass before activation ──────────────
  it('future generated body fixture with natural Japanese passes guard', () => {
    // Representative fixture of what a real AI provider should produce
    const futureBody =
      'takeさんは、細かな違和感や小さな変化に気づきやすいところがあります。\n' +
      'すぐに大きく動くより、見えたことを少しずつ整理すると、自分の力を使いやすくなります。\n' +
      'だから、最初から大きく変えようとするより、短く試して確かめるほうが整いやすくなります。';
    assert.doesNotThrow(
      () => assertNaturalness(futureBody, 'AI generated body fixture'),
      'Future AI body fixture must pass naturalness guard before feature activation',
    );
  });

  it('future generated body with internal analysis terms fails guard (regression guard)', () => {
    const badBody =
      '構成は、感受の解像度が高く、安定と精度が観測を支えます。微細な信号からパターンを立ち上げることです。';
    const result = checkNaturalness(badBody);
    assert.equal(result.pass, false, 'Body with internal terms must fail guard');
    assert.ok(result.violations.length >= 2, 'Should catch multiple violations');
  });
});
