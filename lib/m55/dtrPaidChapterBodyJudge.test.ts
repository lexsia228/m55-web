/**
 * Tests for dtrPaidChapterBodyJudge (pure function — no AI / no network / no DB).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resetCalendarBundleCacheForTests } from './calendar/loadCalendarBundle';
import { buildV2FulfillmentSnapshotFromFields } from './compositeStem/buildV2FulfillmentSnapshot';
import { composePaidIndividualizationFromEngineContext } from './dtrPaidIndividualizationCompose';
import { buildPaidDtrChapterMaterialPack } from './dtrPaidChapterMaterialPack';
import { judgePaidDtrChapterBodies } from './dtrPaidChapterBodyJudge';

const FIELDS_BASE = {
  birthTime: '12:00:00' as string | null,
  birthTimeUnknown: false,
  country: 'JP',
  birthplace: null as string | null,
  timezone: 'Asia/Tokyo',
};

function makeMaterialPack(birthDate: string) {
  resetCalendarBundleCacheForTests();
  const built = buildV2FulfillmentSnapshotFromFields({ nickname: 't', birthDate, ...FIELDS_BASE });
  const ctx = built.engine_context_json;
  const ind = composePaidIndividualizationFromEngineContext(ctx);
  return buildPaidDtrChapterMaterialPack(ctx, ind);
}

/**
 * Build a body that is long enough (≥300 chars stripped) and includes DOB-v2 keywords.
 * Avoids all forbidden single-character celestial stems (甲乙丙丁戊己庚辛壬癸).
 * Passes all major and minor Quality Judge checks when used as test content.
 */
function goodBody(pack: ReturnType<typeof makeMaterialPack>, extraContent = ''): string {
  const seasonKw = pack.seasonJudgeKeywords[0]!;
  const phaseKw  = pack.phaseJudgeKeywords[0]!;
  return [
    `生年月日の細かなリズムから見ると、${seasonKw}の影響が土台として現れやすい時期の生まれです。`,
    ``,
    `${phaseKw}ことを意識すると、日々の動き方が安定してきます。`,
    ``,
    `この特性を活かす場面として、生活の節目ごとに小さな区切りを持つことが大切です。`,
    `特に日常の中で意識的に動き方を選ぶことで、本来のリズムを保ちやすくなります。`,
    ``,
    `生活の積み重ねとして、毎日の小さな選択を意識的に行うことが、長い目で見た安定につながります。`,
    `この動き方を日常に取り入れることで、自分のペースを保ちながら前に進みやすくなります。`,
    `節目ごとに立ち止まって確かめることも、長く続けるための大切な習慣のひとつです。`,
    extraContent,
  ].join('\n');
}

describe('judgePaidDtrChapterBodies', () => {
  it('returns PASS for well-formed bodies that include DOB-v2 material', () => {
    const pack = makeMaterialPack('1992-12-19');
    const bodies = {
      s1_identity:    goodBody(pack, '自分の核としての動き方が明確になります。このリズムを日常に取り入れることで整います。'),
      s2_composition: goodBody(pack, '構成として見たとき、この配置が安定をもたらします。続けることが鍵になります。'),
      s3_essence:     goodBody(pack, '本質の安定のために、生活の節目を意識することが効果的です。小さな積み重ねが整いを生みます。'),
      s4_strengths:   goodBody(pack, '強みを活かすために、日々の場面でこのリズムを意識します。自然な動き方が広がります。'),
    };
    const result = judgePaidDtrChapterBodies(bodies, pack);
    assert.equal(result.verdict, 'PASS', `verdict should be PASS; got: ${JSON.stringify(result.sections.map(s => ({id: s.sectionId, v: s.verdict, checks: s.failedChecks.map(c => c.check)})))}`);
  });

  it('fails template_verbatim when body is identical to seed', () => {
    const pack = makeMaterialPack('1992-12-19');
    // Use the seed body verbatim as the generated body
    const seedBody = pack.seedBodies.s1_identity;
    const bodies = {
      s1_identity:    seedBody,
      s2_composition: goodBody(pack),
      s3_essence:     goodBody(pack),
      s4_strengths:   goodBody(pack),
    };
    const result = judgePaidDtrChapterBodies(bodies, pack);
    const s1 = result.sections.find((s) => s.sectionId === 's1_identity')!;
    assert.ok(
      s1.failedChecks.some((c) => c.check === 'template_verbatim'),
      'should fail template_verbatim when body is the seed verbatim',
    );
    assert.notEqual(result.verdict, 'PASS');
  });

  it('fails dob_material_unreflected when body has no season or phase keywords', () => {
    const pack = makeMaterialPack('1992-12-19');
    const noDoBody = [
      'この保存版レポートでは、あなたの動き方を詳しくお伝えします。',
      'プランナーとしての本質的な動き方を理解することが大切です。',
      '日々の積み重ねを意識することで、安定が生まれてきます。',
    ].join('\n');
    const bodies = {
      s1_identity:    noDoBody,
      s2_composition: goodBody(pack),
      s3_essence:     goodBody(pack),
      s4_strengths:   goodBody(pack),
    };
    const result = judgePaidDtrChapterBodies(bodies, pack);
    const s1 = result.sections.find((s) => s.sectionId === 's1_identity')!;
    assert.ok(
      s1.failedChecks.some((c) => c.check === 'dob_material_unreflected'),
      'should fail dob_material_unreflected when no DOB keywords present',
    );
  });

  it('fails forbidden_internal_labels when internal labels appear', () => {
    const pack = makeMaterialPack('1980-01-07');
    const seasonKw = pack.seasonJudgeKeywords[0]!;
    const phaseKw  = pack.phaseJudgeKeywords[0]!;
    // Inject an internal label (甲) into the body
    const bodyWithLeak = `甲という特性から見ると、${seasonKw}の影響が現れます。${phaseKw}ことが大切です。この動き方を日常に活かしてください。`;
    const bodies = {
      s1_identity:    bodyWithLeak,
      s2_composition: goodBody(pack),
      s3_essence:     goodBody(pack),
      s4_strengths:   goodBody(pack),
    };
    const result = judgePaidDtrChapterBodies(bodies, pack);
    const s1 = result.sections.find((s) => s.sectionId === 's1_identity')!;
    assert.ok(
      s1.failedChecks.some((c) => c.check === 'forbidden_internal_labels'),
      'should fail forbidden_internal_labels when 甲乙丙丁 appears',
    );
  });

  it('fails forbidden_cold_language when dismissive terms appear', () => {
    const pack = makeMaterialPack('1994-05-03');
    const seasonKw = pack.seasonJudgeKeywords[0]!;
    const phaseKw  = pack.phaseJudgeKeywords[0]!;
    const coldBody = `このタイプは${seasonKw}が得意です。${phaseKw}ことを意識してください。日々の動き方に注意が必要です。`;
    const bodies = {
      s1_identity:    coldBody,
      s2_composition: goodBody(pack),
      s3_essence:     goodBody(pack),
      s4_strengths:   goodBody(pack),
    };
    const result = judgePaidDtrChapterBodies(bodies, pack);
    const s1 = result.sections.find((s) => s.sectionId === 's1_identity')!;
    assert.ok(
      s1.failedChecks.some((c) => c.check === 'forbidden_cold_language'),
      'should fail forbidden_cold_language for "このタイプ"',
    );
  });

  it('returns MINOR_FIX for char_count_insufficient (short body)', () => {
    const pack = makeMaterialPack('1983-02-28');
    const seasonKw = pack.seasonJudgeKeywords[0]!;
    const phaseKw  = pack.phaseJudgeKeywords[0]!;
    // Body includes DOB keywords but is too short (< 200 chars after whitespace strip)
    const shortBody = `${seasonKw}の時期です。${phaseKw}ことが大切です。`;
    const bodies = {
      s1_identity:    shortBody,
      s2_composition: goodBody(pack),
      s3_essence:     goodBody(pack),
      s4_strengths:   goodBody(pack),
    };
    const result = judgePaidDtrChapterBodies(bodies, pack);
    const s1 = result.sections.find((s) => s.sectionId === 's1_identity')!;
    assert.ok(
      s1.failedChecks.some((c) => c.check === 'char_count_insufficient'),
      'should flag char_count_insufficient for short body',
    );
    assert.equal(s1.failedChecks.find((c) => c.check === 'char_count_insufficient')!.severity, 'minor');
    // Aggregate verdict should be at most MINOR_FIX (no major failures)
    const majorFails = s1.failedChecks.filter((c) => c.severity === 'major');
    assert.equal(majorFails.length, 0, 'char_count_insufficient should be minor only');
  });
});
