/**
 * Presentation-only Japanese for customer-visible private manuals.
 * Does not change semantic keys, axes, or fused inference.
 */

const REPLACEMENTS: readonly Readonly<{ from: RegExp; to: string }>[] = [
  { from: /候補を並べてから閉じる/g, to: '候補を並べてから、答えを一つに絞る' },
  { from: /全体の手順が見えてから動き出す/g, to: '全体の段取りが見えてから動き出す' },
  { from: /周囲の視点を足してから着手する/g, to: '周りの意見を聞いてから取りかかる' },
  { from: /区切りが見えたところで決める/g, to: '「ここまで」が見えたところで決める' },
  { from: /今の間合いを言葉にして整える/g, to: '今の距離感を言葉にして整える' },
  { from: /連絡や同席の間隔を一定に保ちながら続ける/g, to: '連絡や会う頻度を、あまり変えずに続ける' },
  { from: /短い区切りを入れて立て直す/g, to: '短い休みを入れて立て直す' },
  { from: /場所や刺激を変えてから戻る/g, to: '場所や空気を変えてから戻る' },
  { from: /変わった点だけ小さく合わせて進める/g, to: '変わったところだけ、少し直して進める' },
  { from: /結論の前に、今の間合いを一句置く/g, to: '決める前に、今の距離感を一言伝える' },
  { from: /返事を急がず、一人の時間のあとに続きを置く/g, to: 'すぐ返さず、一人の時間のあとに続きを置く' },
  { from: /土台では/g, to: '普段は' },
  { from: /今回の答えでは/g, to: '今回は' },
  { from: /側に寄っています/g, to: 'ほうが出やすい' },
  { from: /次の短い接点だけを一文で置く/g, to: '次に話す一点だけ先に置く' },
  { from: /次の短い接点だけを伝える/g, to: '次に話す一点だけを伝える' },
];

export function humanizePrivatePresentationJa(text: string): string {
  let next = text;
  for (const rule of REPLACEMENTS) {
    next = next.replace(rule.from, rule.to);
  }
  return next;
}
