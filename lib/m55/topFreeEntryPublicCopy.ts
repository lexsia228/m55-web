import { PAID_DTR_LP, PAID_DTR_PUBLIC_SCOPE_CLARITY, PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';

/** Top / free-entry public copy — references PAID_DTR_LP SSOT; no long LP duplication. */
export const TOP_FREE_ENTRY_PUBLIC_COPY = {
  m55Definition: {
    centerJa:
      'M55は、入力された情報と言葉をもとに、\n自分の出方と今のテーマを読み直し、\n本人が確かめられる視点として渡す\nパーソナルシステムです。',
    shortJa:
      'M55は、入力された情報と言葉をもとに、\n自分の出方と今のテーマを読み直す\nパーソナルシステムです。',
    principleJa:
      '本人に代わって答えを決めるのではなく、\n現実的な見方と、次に確かめることを示します。',
  },
  freeEntry: {
    leadJa:
      'ニックネームと生年月日を入力すると、\n自分に出やすい輪郭を無料で確認できます。',
  },
  savedReport: {
    definitionJa:
      '保存版では、購入時までに入力された情報をもとに、\n比較的変わりにくい自分の出方を\n正式4章で整理します。',
  },
  consultReply: {
    definitionJa:
      '相談返書では、保存版に今回入力した\n一つの相談テーマを重ねて読み直します。',
    notConversationJa: '会話を続ける形式ではありません。',
    coreStaticJa:
      '相談返書は、\n保存版に今回入力した一つの相談テーマを重ねて\n読み直す返書です。',
  },
  threeLayerOrderJa:
    '無料の見取り図 → 4章の保存版 → 保存版に紐づく相談返書',
  formalChapters: PAID_DTR_LP.chapters.items.map((ch) => ({
    roman: ch.roman,
    titleJa: ch.titleJa,
    labelJa: `${ch.roman} ${ch.titleJa}`,
  })),
  storefront: {
    introJa:
      'M55は、入力された情報と言葉をもとに、自分の出方と今のテーマを読み直すパーソナルシステムです。',
    fullPlanNameJa: PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa,
    fullPriceLabelJa: PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa,
    fullSavedReportJa: '正式4章',
    fullConsultReplyJa: '相談返書合計5件',
    lightPlanNameJa: PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa,
    lightPriceLabelJa: PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa,
    lightSavedReportJa: '正式4章',
    lightConsultReplyJa: '相談返書1件',
    upgradeNoteJa: 'ライト購入後は、¥600でFULL化できます（合計¥1,600）。最初からFULLなら¥1,480です。',
  },
  home: {
    heroProductLabelJa: '個人向けの見取り図',
    tierFreeContourJa:
      '生まれた日から5つの視点の見取り図（傾向のバランス）が開きます。',
    tierFreeExploreJa:
      '仕組みと読み方、10通りの資質の地図はページから読めます。',
    fiveAxisLeadJa:
      '無料では傾向の輪郭まで確認できます。保存版レポートでは同じ土台を読み返し用4章に整理し、相談返書では一つの相談テーマを件数内で読み直します。',
    algorithmNoteJa:
      'M55は、入力された情報と言葉をもとに、統合アルゴリズムで自分の出方を読み解くパーソナルシステムです。',
    reportSectionEyebrowJa: '保存版レポート',
    reportLightEyebrowJa: PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa,
    reportLightPriceJa: PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa,
    reportLightSummaryJa:
      'まず保存版を読みたい方向け。4章の保存版 + 相談返書1件。決済完了後にウェブ上で閲覧できます（物理配送なし）。',
    reportFullEyebrowJa: PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa,
    reportFullPriceJa: PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa,
    reportFullSummaryJa:
      '返書で複数回深めたい方向け。4章の保存版 + 相談返書合計5件。',
    reportDepthNoteJa:
      '無料の見取り図と同じ土台を、購入時点の入力内容をもとに読み返せる保存版に整理します。',
    reportAuxJa:
      '相談返書は、保存版に今回入力した一つの相談テーマを重ねて読み直す補助価値です。会話を続ける形式ではありません。',
    chapterPreviewLabelJa: '今回の保存版では',
    chapterMoreJa: '今回のレポートでは、複数の観点から整理します。',
    valueGapNoteJa: '無料＝見取り図／保存版＝読み返しできる構造化レポート。',
  },
  learnMore: {
    summaryJa: 'M55の仕組みと資料',
    rulesJa: [
      '無料では基礎の見取り図が見えます。「今日」「今週」は入力・表示時点の補助表現です。',
      PAID_DTR_PUBLIC_SCOPE_CLARITY.notDailyWeeklyMonthlyServiceJa,
      '保存版レポートでは、購入時点の入力内容をもとに同じ土台を4章で読み返せます。',
      '保存版ライト（¥1,000）は相談返書1件。まず保存版を読みたい方向けです。',
      '保存版FULL（¥1,480）は相談返書合計5件。返書で複数回深めたい方向けです。',
      'ライト購入後のFULL化は¥600（合計¥1,600）。最初からFULLなら¥1,480です。',
      '相談返書は保存版に紐づく一テーマへの返書で、会話を続ける形式ではありません。',
      '購入後はウェブ上で閲覧できます。物理配送はありません。',
    ] as const,
  },
  coreBoundary: {
    titleJa: 'このページと保存版の違い',
    freeLeadJa:
      '無料の見取り図では、\n自分に出やすい輪郭を確認できます。',
    savedLeadJa:
      '保存版では、\n購入時までに入力された情報をもとに、\n自分の出方を正式4章で整理します。',
  },
  coreCta: {
    overlineJa: '4章の保存版',
    titleJa: '4章の保存版',
    introJa:
      '無料の見取り図で見えた輪郭を、\n正式4章の保存版として読み返せる形に整理します。',
    benefitsHeadingJa: '保存版で整理できること',
    benefitsJa: [
      '仕事や学びで、どこに力が出やすいか',
      '人間関係で、どこで無理がたまりやすいか',
      '疲れやすい条件と、崩れやすい流れ',
      '自分をどこから整えると戻りやすいか',
    ] as const,
    bundleNoteJa:
      '相談返書は、保存版に紐づく一つの相談テーマへの返書です。会話を続ける形式ではありません。',
    linkLabelJa: '保存版のプランを見る',
  },
  howM55Works: {
    metadataDescriptionJa:
      'M55の読み方を、無料の見取り図、4章の保存版、相談返書の順で静かに説明します。',
    receiveFreeLeadJa: 'まず無料の見取り図では、自分の輪郭を確認できます。',
    receiveSavedLeadJa:
      '4章の保存版では、入口として見えていた傾向を、生活の中でどう表れやすいか、どこで負荷になりやすいか、どの順番で整えると使いやすいかを、正式4章で整理します。',
    receiveContrastJa: '無料が輪郭なら、4章の保存版は構造です。',
    receiveConsultJa:
      '相談返書は、保存版に紐づく一つの相談テーマへの返書です。会話を続ける形式ではありません。',
    flowKickerJa: '無料（輪郭）→ 4章の保存版 → 相談返書',
    flowNoteJa:
      '相談返書は独立した商品ではなく、保存版に付随する返書です。',
    frameworkSavedJa: '4章の保存版まで同じになるわけではありません。',
    nextLeadJa: 'まずは、無料の見取り図で自分の輪郭を確認してみてください。',
    nextSubJa:
      'その先で必要になったら、4章の保存版で読み返し、相談返書でいまのテーマを読み直せます。',
  },
  metadata: {
    howM55WorksDescriptionJa:
      'M55の読み方を、無料の見取り図、4章の保存版、相談返書の順で静かに説明します。',
  },
  cta: {
    openFreeMapJa: '無料で見取り図を開く',
    viewFreeMapJa: '無料の見取り図を見る',
    viewSavedPlansJa: '保存版のプランを見る',
    viewSavedPlansHref: '/dtr/lp',
    homeHref: '/home',
    coreFreeHref: '/core',
  },
} as const;
