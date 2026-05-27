/**
 * Paid /dtr/core — chapter-end bridge to AI 返書 (see M55 product design).
 * Copy only; no engine coupling.
 */

export type ReportBridgePartId = '1' | '2' | '3' | '4';

export type ReportBridgeBlock = {
  partId: ReportBridgePartId;
  /** One line: what this chapter made visible (map role, not advice). */
  seenOneLiner: string;
  /** Three prompts for deeper work in 返書 (situation translation). */
  questions: readonly [string, string, string];
};

export const REPORT_BRIDGE_BY_PART: Record<ReportBridgePartId, ReportBridgeBlock> = {
  '1': {
    partId: '1',
    seenOneLiner:
      'この章では、どんな場面で力が出やすいか、どこで疲れやすいかの輪郭が見えてきました。自分が納得できる形や、無理に合わせ続けると苦しくなる場面は、相談返書で具体的に整理できます。',
    questions: [
      '図の中で、いまの生活や近い人との関係に一番近いと感じるところはどこですか。',
      '平気に見えていたのに、あとから疲れが出る場面は最近ありましたか。',
      '大切な人にほど言葉を選びすぎてしまうと感じる場面はありますか。',
    ],
  },
  '2': {
    partId: '2',
    seenOneLiner:
      'この章では、力が出やすい条件と、崩れやすい条件が整理されました。',
    questions: [
      'いま一番不安定に感じるのは、ひとりで落ち着く時間・人との距離・言葉のやりとりのどれに近いですか。',
      '力が戻りやすい条件のうち、いまの生活で一番足りていないと感じるものはどれですか。',
      '今週、安心して過ごすために、ひとつだけ変えるなら何ですか。',
    ],
  },
  '3': {
    partId: '3',
    seenOneLiner:
      'この章では、どんな場面で無理が出やすいか、人とのやりとりで疲れやすいところが見えてきました。',
    questions: [
      'この1か月で、一番しんどかった場面はどれに近いですか。',
      'そのとき、内側ではどんな不安や疲れが先に出ていましたか。',
      'いま、近い人にほど誤解されやすい伝え方・距離の取り方はありますか。',
    ],
  },
  '4': {
    partId: '4',
    seenOneLiner:
      'この章では、力が出やすい条件と、疲れたときに戻りやすい整え方が整理されました。',
    questions: [
      'いま一番整えたいのは、近い人との関係・ひとり時間・日常のどこですか。',
      '今日の現実に一番足りないのは、安心できる距離・言葉をほどく時間・整える余白のどれですか。',
      '今週、無理を少し減らすためにできる小さな一手は何ですか。',
    ],
  },
};
