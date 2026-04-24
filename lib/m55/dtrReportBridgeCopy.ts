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
      '核の言葉と5軸の配置から、あなたの「輪郭としての立ち方」が地図として示されました。',
    questions: [
      'いまの職・暮らしの中で、図のどの軸が一番、手応えとして立ち上がっていますか。',
      '逆に、図上は出ているのに生活では沈んでいる軸は、どこだと感じますか。',
      '「輪郭としての自分」が、誰にどう誤解されやすいか、最近の具体例はありますか。',
    ],
  },
  '2': {
    partId: '2',
    seenOneLiner:
      '本質条件と「この形が自然に動きやすい」場面が、あなたの構造の読み方として置かれました。',
    questions: [
      'いま一番不安定に感じているのは、外の条件（裁量・期限・人の反応）のどれに近いですか。',
      '「この形が自然に動きやすい」と書かれた条件のうち、いま最も遠いのはどれですか。',
      '本質の話を行動の癖に直すと、週に一度のループで直したいのは何ですか。',
    ],
  },
  '3': {
    partId: '3',
    seenOneLiner:
      '出やすさの場面・摩擦・交流の型が、無理の出方として地図上に置かれました。',
    questions: [
      '摩擦の項目のうち、直近1か月で本当に痛かったのは、どれに近いですか。',
      'そのとき、内側の切迫感を一言で言うと何でしたか（行動の言い訳は不要）。',
      '交流のパターンのうち、いま相手に誤解されやすい渡し方・引き方はどれですか。',
    ],
  },
  '4': {
    partId: '4',
    seenOneLiner:
      '力が出る条件・詰まり・生活の戻し方が、日常で扱える手引きとして置かれました。',
    questions: [
      'いま最も戻しを忘れがちなのは、仕事・人間・生活のどこですか。',
      '「力が出る条件」の言葉のうち、今日の現実に一番近いのはどれですか。',
      '詰まりを短く減らすなら、今週いちばん小さい一手にできることは何ですか。',
    ],
  },
};
