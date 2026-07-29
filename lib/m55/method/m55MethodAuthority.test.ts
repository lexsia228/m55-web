import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  M55_AUTHORITY_LEVEL_1,
  M55_AUTHORITY_LEVEL_2,
  M55_AUTHORITY_LEVEL_3,
  M55_INTERNAL_VOCABULARY_NOT_FOR_DISPLAY,
  M55_METHOD_CANONICAL_COPY,
  M55_METHOD_CANONICAL_ROUTE,
  M55_METHOD_INPUTS,
  M55_METHOD_PLACEMENTS,
  M55_METHOD_PUBLIC_NAME,
  M55_METHOD_SECTIONS,
  M55_METHOD_STEPS,
  methodInputsForStage,
  methodPlacementById,
  unsupportedAuthorityClaims,
} from './m55MethodAuthority';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/** Every string a reader could see, in one blob, for claim scanning. */
function allPublicMethodCopy(): string {
  const parts: string[] = [
    M55_METHOD_PUBLIC_NAME,
    ...Object.values(M55_METHOD_CANONICAL_COPY),
    ...M55_METHOD_STEPS.flatMap((s) => [s.titleJa, s.bodyJa]),
    ...M55_METHOD_INPUTS.flatMap((i) => [i.publicLabelJa, i.publicDescriptionJa]),
    ...M55_METHOD_SECTIONS.flatMap((s) => [
      s.titleJa,
      ...s.bodyJa,
      ...(s.itemsJa ?? []).flatMap((i) => [i.labelJa, i.descriptionJa]),
    ]),
  ];
  return parts.join('\n');
}

describe('M55 method authority — public identity', () => {
  it('uses one public name', () => {
    assert.equal(M55_METHOD_PUBLIC_NAME, 'M55 複合読み解きモデル');
  });

  it('names /how-m55-works as the only canonical method route', () => {
    assert.equal(M55_METHOD_CANONICAL_ROUTE, '/how-m55-works');
    for (const placement of M55_METHOD_PLACEMENTS) {
      assert.ok(placement.linksToCanonicalRoute, `${placement.id} must link to the method route`);
    }
  });
});

describe('M55 method authority — inputs derive from real composition authorities', () => {
  it('exposes exactly the nine existing authorities', () => {
    assert.deepEqual(
      M55_METHOD_INPUTS.map((i) => i.id),
      [
        'dob_base',
        'free_expression',
        'paid_depth',
        'align',
        'diverge',
        'intensity',
        'hesitation',
        'reactive_context',
        'reply_affinity',
      ],
    );
  });

  it('maps every input to a field that exists on the fingerprint type', () => {
    const fingerprintSource = read('lib/m55/individualization/types.ts');
    for (const input of M55_METHOD_INPUTS) {
      assert.match(
        fingerprintSource,
        new RegExp(`\\b${input.fingerprintField}\\b`),
        `${input.id} claims a fingerprint field that does not exist: ${input.fingerprintField}`,
      );
    }
  });

  it('translates every input into daily Japanese without internal vocabulary', () => {
    for (const input of M55_METHOD_INPUTS) {
      assert.ok(input.publicLabelJa.length > 0);
      assert.ok(input.publicDescriptionJa.length > 0);
      for (const word of M55_INTERNAL_VOCABULARY_NOT_FOR_DISPLAY) {
        assert.ok(
          !input.publicLabelJa.includes(word) && !input.publicDescriptionJa.includes(word),
          `${input.id} leaks internal vocabulary: ${word}`,
        );
      }
    }
  });

  it('splits the inputs into free and premium stages', () => {
    assert.ok(methodInputsForStage('free').length > 0);
    assert.deepEqual(
      methodInputsForStage('premium').map((i) => i.id),
      ['paid_depth', 'intensity'],
    );
  });
});

describe('M55 method authority — canonical sentences', () => {
  it('keeps the explanation, reproducibility and boundary wording intact', () => {
    assert.equal(
      M55_METHOD_CANONICAL_COPY.explanationJa,
      'M55は、生年月日だけでも、今の回答だけでも人を決めません。変わりにくい土台と、今表れている反応を別々に見て、近いところとずれるところ、負担が重なりやすい場面を一つの読み解きに組み立てます。',
    );
    assert.equal(
      M55_METHOD_CANONICAL_COPY.reproducibilityJa,
      '中核となる整理は、版管理された固定規則で行われます。同じ入力を同じ版で処理した場合、同じ読み解きの土台が再現されます。',
    );
    assert.equal(
      M55_METHOD_CANONICAL_COPY.boundaryJa,
      '診断、占い、未来予測、相手の気持ちの断定ではありません。',
    );
  });

  it('frames the Premium difference as added scope, not better accuracy', () => {
    assert.match(M55_METHOD_CANONICAL_COPY.premiumDifferencePremiumJa, /読み解ける範囲が増える/);
    assert.match(
      M55_METHOD_CANONICAL_COPY.premiumDifferencePremiumJa,
      /当たり方が上がるという意味ではありません/,
    );
  });
});

describe('M55 method authority — four-step model', () => {
  it('has exactly four ordered steps built from declared inputs', () => {
    assert.equal(M55_METHOD_STEPS.length, 4);
    assert.deepEqual(
      M55_METHOD_STEPS.map((s) => s.order),
      [1, 2, 3, 4],
    );
    const known = new Set(M55_METHOD_INPUTS.map((i) => i.id));
    for (const step of M55_METHOD_STEPS) {
      assert.ok(step.inputIds.length > 0, `step ${step.order} cites no input`);
      for (const id of step.inputIds) assert.ok(known.has(id), `step ${step.order} cites ${id}`);
    }
  });
});

describe('M55 method authority — required sections', () => {
  it('covers the ten required sections in order', () => {
    assert.deepEqual(
      [...M55_METHOD_SECTIONS].sort((a, b) => a.order - b.order).map((s) => s.titleJa),
      [
        '一つの情報だけで決めない',
        '入力として使うもの',
        '変わりにくい土台',
        '今の回答に表れること',
        '近い点とずれる点',
        'Premiumで加わる深さ',
        '生活場面への整理',
        '再現性と版管理',
        '保存とプライバシー',
        'M55が行わないこと',
      ],
    );
  });

  it('lists every input in the inputs section', () => {
    const inputsSection = M55_METHOD_SECTIONS.find((s) => s.id === 'inputs_used');
    assert.ok(inputsSection?.itemsJa);
    assert.equal(inputsSection.itemsJa.length, M55_METHOD_INPUTS.length);
  });

  it('states that reproducibility is not an accuracy claim', () => {
    const section = M55_METHOD_SECTIONS.find((s) => s.id === 'reproducibility_and_versioning');
    assert.ok(section);
    assert.ok(section.bodyJa.some((p) => p.includes('精度の主張ではありません')));
  });
});

describe('M55 method authority — authority levels are frozen', () => {
  it('lists the eight LEVEL 1 claims', () => {
    assert.equal(M55_AUTHORITY_LEVEL_1.length, 8);
    assert.ok(M55_AUTHORITY_LEVEL_1.includes('reproducibility of the reading foundation'));
  });

  it('keeps LEVEL 2 and LEVEL 3 out of LEVEL 1', () => {
    const level1 = new Set<string>(M55_AUTHORITY_LEVEL_1);
    for (const claim of [...M55_AUTHORITY_LEVEL_2, ...M55_AUTHORITY_LEVEL_3]) {
      assert.ok(!level1.has(claim), `${claim} must not be claimable today`);
    }
    assert.equal(M55_AUTHORITY_LEVEL_2.length, 5);
    assert.equal(M55_AUTHORITY_LEVEL_3.length, 5);
  });
});

describe('M55 method authority — claim detector', () => {
  it('passes the entire public method copy', () => {
    assert.deepEqual(unsupportedAuthorityClaims(allPublicMethodCopy()), []);
  });

  const negativeFixtures: readonly { id: string; text: string }[] = [
    { id: 'scientific', text: 'この読み解きは科学的に証明されています。' },
    { id: 'psychological_diagnosis', text: '心理診断として利用できます。' },
    { id: 'clinical', text: '臨床的な評価に使えます。' },
    { id: 'accuracy_percentage', text: '的中率は92%です。' },
    { id: 'expert_supervision', text: '専門家監修のもとで作成しました。' },
    { id: 'participant_count', text: '12,000人が検証に参加しました。' },
    { id: 'fortune_accuracy', text: '当たる占いとして評判です。' },
    { id: 'ai_understanding', text: 'AIがあなたを理解します。' },
    { id: 'future_prediction', text: '未来を予測してお伝えします。' },
    { id: 'other_person_feelings', text: '相手の気持ちがわかるようになります。' },
  ];

  for (const fixture of negativeFixtures) {
    it(`rejects ${fixture.id}`, () => {
      const hits = unsupportedAuthorityClaims(fixture.text);
      assert.ok(hits.length > 0, `"${fixture.text}" was not rejected`);
    });
  }
});

describe('M55 method authority — route consumption contract', () => {
  it('declares the six required placements', () => {
    assert.deepEqual(
      M55_METHOD_PLACEMENTS.map((p) => p.id),
      [
        'home',
        'core_free_result',
        'dtr_lp',
        'purchased_report',
        'pricing_checkout_prep',
        'footer_nav',
      ],
    );
  });

  it('has every placement rendered by its declared owner file', () => {
    for (const placement of M55_METHOD_PLACEMENTS) {
      const source = read(placement.ownerFile);
      assert.ok(
        source.includes(placement.testId),
        `${placement.ownerFile} does not render ${placement.testId}`,
      );
    }
  });

  it('mounts every placement component into its route', () => {
    const mounts: readonly [string, string][] = [
      ['components/home/HomePanel.tsx', 'HomeMethodModel'],
      ['components/core/CoreEssencePanel.tsx', 'CoreMethodCompact'],
      ['components/dtr/DtrPaidPurchasePrep.tsx', 'DtrMethodDifference'],
      ['components/dtr/DtrFullReader.tsx', 'DtrMethodReportNote'],
      ['app/pricing/page.tsx', 'M55MethodTrustLink'],
      ['app/how-m55-works/page.tsx', 'M55MethodSections'],
    ];
    for (const [file, component] of mounts) {
      const source = read(file);
      assert.match(source, new RegExp(`<${component}\\s*/?>`), `${file} does not mount ${component}`);
    }
  });

  it('places the HOME model between the value explanation and the Premium comparison', () => {
    const home = read('components/home/HomePanel.tsx');
    const mechanism = home.indexOf('m55-home-mechanism"');
    const method = home.indexOf('<HomeMethodModel />');
    const premium = home.indexOf('m55-home-premium-preview"');
    assert.ok(mechanism >= 0 && method > mechanism && premium > method);
  });

  it('places the /core compact block before the Premium bridge', () => {
    const core = read('components/core/CoreEssencePanel.tsx');
    const method = core.indexOf('<CoreMethodCompact />');
    const bridge = core.indexOf('<CoreEntryReportCTASection');
    assert.ok(method >= 0 && bridge > method);
  });

  it('places the /dtr/lp difference before plan selection cards', () => {
    const prep = read('components/dtr/DtrPaidPurchasePrep.tsx');
    const method = prep.indexOf('<DtrMethodDifference />');
    const cards = prep.indexOf('styles.planStack');
    assert.ok(method >= 0 && cards > method);
  });

  it('keeps the purchased-report note free of identifiers and raw inputs', () => {
    const note = read('components/dtr/DtrMethodReportNote.tsx');
    for (const word of M55_INTERNAL_VOCABULARY_NOT_FOR_DISPLAY) {
      assert.ok(!note.includes(word), `purchased-report note leaks ${word}`);
    }
    assert.doesNotMatch(note, /birthDate|dob|answerSet|nickname/);
  });

  it('keeps the pricing placement to a link only', () => {
    const pricing = methodPlacementById('pricing_checkout_prep');
    assert.equal(pricing?.density, 'link_only');
    const source = read('components/pages/M55MethodTrustLink.tsx');
    assert.ok(!source.includes('MethodStepList'), 'pricing must not carry dense method copy');
  });
});
