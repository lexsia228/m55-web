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
      '図の中で、いまの生活に一番近いと感じるところはどこですか。',
      '表では強く見えるのに、実際の生活では使えていないと感じるところはありますか。',
      '自分の力が誰かに誤解されやすいと感じる場面が、最近ありましたか。',
    ],
  },
  '2': {
    partId: '2',
    seenOneLiner:
      'この章では、力が出やすい条件と、崩れやすい条件が整理されました。',
    questions: [
      'いま一番不安定に感じているのは、集中できる時間・締切・人の反応のどれに近いですか。',
      '力が出やすい条件のうち、いまの生活から一番遠いと感じるものはどれですか。',
      '今週、少しでも進めやすくするために、ひとつだけ変えるなら何ですか。',
    ],
  },
  '3': {
    partId: '3',
    seenOneLiner:
      'この章では、どんな場面で無理が出やすいか、人とのやりとりで疲れやすいところが見えてきました。',
    questions: [
      'この1か月で、一番しんどかった場面はどれに近いですか。',
      'そのとき、内側ではどんな焦りや苦しさがありましたか。',
      'いま相手に誤解されやすい伝え方・距離の取り方はありますか。',
    ],
  },
  '4': {
    partId: '4',
    seenOneLiner:
      'この章では、力が出やすい条件と、疲れたときに戻りやすい方法が整理されました。',
    questions: [
      'いま一番整えたいのは、仕事・人間関係・生活のどこですか。',
      '「力が出る条件」の中で、今日の現実に一番近いものはどれですか。',
      '今週、無理を少し減らすためにできる小さな一手は何ですか。',
    ],
  },
};
