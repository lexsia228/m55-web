import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  M55_ANALYSIS_ALLOWED_TERMS,
  M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL,
  M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL_VERSION,
  M55_ANALYSIS_PROHIBITED_TERMS,
  M55_COMPATIBILITY_EXPLANATION_MODEL,
  M55_LEGAL_SAFETY_BOUNDARIES,
  M55_PERSONAL_ANALYSIS_EXPLANATION_ORDER,
  M55_PUBLIC_COMMERCIAL_TRUTH,
  M55_REFERENCE_SOURCES,
  M55_USER_FACING_POSITIONING_COPY,
  M55_VISUALIZATION_HCD_MODEL,
  m55AnalysisAuthorityPositioningBlob,
} from './analysisAuthorityReferenceModel';

const POSITIONING_DANGEROUS_TERMS = [
  '規約回避',
  'クローラー無力化',
  'Stripe通過保証',
  '審査突破保証',
  '検知回避',
  '言葉のロンダリング',
  '絶対に安全',
] as const;

describe('analysisAuthorityReferenceModel — copy SSOT', () => {
  it('locks version', () => {
    assert.equal(M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL_VERSION, 'v2');
    assert.equal(M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL.version, 'v2');
  });

  it('defines What M55 is / is not', () => {
    assert.ok(M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL.whatM55IsJa.length >= 3);
    assert.ok(M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL.whatM55IsNotJa.length >= 10);
    assert.match(
      M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL.whatM55IsJa.join('\n'),
      /文化的参照体系/,
    );
    assert.match(
      M55_ANALYSIS_AUTHORITY_REFERENCE_MODEL.whatM55IsNotJa.join('\n'),
      /医学的診断/,
    );
  });

  it('keeps allowed terms non-empty', () => {
    assert.ok(M55_ANALYSIS_ALLOWED_TERMS.length >= 20);
    assert.ok(M55_ANALYSIS_ALLOWED_TERMS.includes('compliance-by-design'));
    assert.ok(M55_ANALYSIS_ALLOWED_TERMS.includes('2人の距離の読み解き'));
  });

  it('keeps prohibited terms non-empty', () => {
    assert.ok(M55_ANALYSIS_PROHIBITED_TERMS.length >= 20);
    assert.ok(M55_ANALYSIS_PROHIBITED_TERMS.includes('規約回避'));
    assert.ok(M55_ANALYSIS_PROHIBITED_TERMS.includes('相性◯%'));
  });

  it('fixes personal analysis explanation order to six steps', () => {
    assert.equal(M55_PERSONAL_ANALYSIS_EXPLANATION_ORDER.length, 6);
    assert.deepEqual(
      M55_PERSONAL_ANALYSIS_EXPLANATION_ORDER.map((s) => s.order),
      [1, 2, 3, 4, 5, 6],
    );
    assert.equal(M55_PERSONAL_ANALYSIS_EXPLANATION_ORDER[0]?.labelJa, '暦文化上の初期ベース');
    assert.equal(M55_PERSONAL_ANALYSIS_EXPLANATION_ORDER[1]?.labelJa, '回答差分');
    assert.equal(
      M55_PERSONAL_ANALYSIS_EXPLANATION_ORDER[5]?.labelJa,
      '次に整理できるテーマ',
    );
  });

  it('defines compatibility explanation model with public name', () => {
    assert.equal(M55_COMPATIBILITY_EXPLANATION_MODEL.publicNameJa, '2人の距離の読み解き');
    assert.ok(M55_COMPATIBILITY_EXPLANATION_MODEL.displayAxesJa.includes('距離'));
    assert.ok(
      M55_COMPATIBILITY_EXPLANATION_MODEL.boundariesJa.some((b) => b.includes('良い/悪い断定')),
    );
  });

  it('forbids score ranking and percent in visualization model', () => {
    const blob = M55_VISUALIZATION_HCD_MODEL.prohibitionsJa.join('\n');
    assert.match(blob, /スコア優劣/);
    assert.match(blob, /%/);
    assert.match(blob, /ランキング/);
  });

  it('states user-facing positioning is not medical/psychological diagnosis or future certainty', () => {
    const blob = M55_USER_FACING_POSITIONING_COPY.join('\n');
    assert.match(blob, /医学的・心理学的な診断、治療、未来予測/);
    assert.match(blob, /相性の点数化ではありません/);
    assert.match(blob, /参考情報として提供されます/);
  });

  for (const term of POSITIONING_DANGEROUS_TERMS) {
    it(`excludes dangerous positioning term "${term}" from user-facing copy`, () => {
      const blob = m55AnalysisAuthorityPositioningBlob();
      assert.equal(blob.includes(term), false, `found prohibited positioning term: ${term}`);
    });
  }

  it('includes reference sources for cultural / HCD / legal boundaries', () => {
    assert.ok(M55_REFERENCE_SOURCES.length >= 7);
    const ids = M55_REFERENCE_SOURCES.map((s) => s.id);
    assert.ok(ids.includes('ndl'));
    assert.ok(ids.includes('naoj'));
    assert.ok(ids.includes('mhlw_ejim'));
    assert.ok(ids.includes('caa_tokushoho'));
  });

  it('keeps legal safety boundaries aligned with compliance framing', () => {
    assert.ok(M55_LEGAL_SAFETY_BOUNDARIES.isNotJa.length >= 5);
    assert.ok(M55_LEGAL_SAFETY_BOUNDARIES.complianceFramingJa.includes('誤認防止'));
    assert.ok(M55_LEGAL_SAFETY_BOUNDARIES.complianceFramingJa.includes('compliance-by-design'));
  });

  it('separates fixed-rule and generation-AI product layers', () => {
    assert.match(M55_PUBLIC_COMMERCIAL_TRUTH.processing.personalFreeJa, /生成AIは使用しません/);
    assert.match(M55_PUBLIC_COMMERCIAL_TRUTH.processing.personalSavedJa, /生成AIを使う場合があります/);
    assert.match(M55_PUBLIC_COMMERCIAL_TRUTH.processing.personalAdditionalJa, /生成AI/);
    assert.match(M55_PUBLIC_COMMERCIAL_TRUTH.processing.compatibilitySavedJa, /生成AIは使用せず/);
  });
});
