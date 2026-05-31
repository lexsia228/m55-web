/**
 * Local self-check. Run: node lib/m55/ai/m55ConsultReplyQualitySanitizer.selfcheck.mjs
 */
async function main() {
  let mod;
  try {
    mod = await import('./m55ConsultReplyQualitySanitizer.ts');
  } catch (e) {
    console.error('SKIP: cannot import m55ConsultReplyQualitySanitizer.ts', e);
    process.exit(1);
  }

  const { applyM55ConsultReplyQualityPasses } = mod;
  let failed = 0;

  const cases = [
    [
      'generic advice',
      'この進め方は効果的です。役立つかもしれません。',
      (r) =>
        r.text.includes('整理しやすくなります') &&
        r.text.includes('保存版の観点で見直しやすくなります'),
    ],
    [
      'outcome regex',
      '言葉を選び直すことは、落ち着きにつながります。',
      (r) => r.text.includes('見えやすくする材料になります'),
    ],
    [
      'other check',
      'まず相手に直接尋ねてみるより、一度立ち止まってください。',
      (r) => r.text.includes('いまの中で、言葉と距離を一度分けてみる'),
    ],
    [
      'heavy self mgmt',
      '自分の限界を意識することが、最初の一歩になります。',
      (r) => r.text.includes('いま抱えすぎている線を見る'),
    ],
    [
      'unchanged',
      '【無理が出やすいところ】の観点では、距離の取り方が論点です。短い整理だけ置きます。',
      (r) => r.text.includes('距離の取り方が論点') && r.replacementCount === 0,
    ],
    [
      'chapter title line',
      '【本質と安定の条件】\n本文では負荷を整理します。',
      (r) => r.text.startsWith('【本質と安定の条件】'),
    ],
  ];

  for (const [label, input, ok] of cases) {
    const r = applyM55ConsultReplyQualityPasses(input);
    if (!ok(r)) {
      console.error(`FAIL ${label}:`, r.text);
      failed += 1;
    } else {
      console.log(`OK ${label} (replacements=${r.replacementCount})`);
    }
  }

  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
