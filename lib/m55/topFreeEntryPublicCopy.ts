import { PAID_DTR_LP, PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';

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
    upgradeNoteJa:
      'ライト購入後でも、必要になったらFULL化できます。\n保存版を読んだあと、もう少し深く整理したくなった場合に選べます。',
  },
  home: {
    heroTitleLine1Ja: '生まれた日から、',
    heroTitleLine2Ja: '自分の輪郭を見る',
    heroSubJa: '無料で、まず輪郭を見られます。',
    heroSupportJa: 'まず無料で輪郭を確認できます。',
    tierStackAriaLabelJa: '無料、保存版、相談返書',
    tierFreeJa: '5つの視点で、今の輪郭を見る。',
    tierSavedBadgeJa: '保存版',
    tierSavedJa: '輪郭を4章で読み返せる形に残す。',
    tierConsultBadgeJa: '相談返書',
    tierConsultJa: '保存版に沿って、いまの1テーマを整理する。',
    exploreHowSubJa: 'M55の見方を見る →',
    exploreQualitiesSubJa: '10通りの資質を見る →',
    fiveAxisLeadJa: '五つの視点は、いまのバランスをつかむためのものです。',
    algorithmNoteJa:
      'M55は、入力された情報をもとに、自分の傾向を整理するための仕組みです。',
    fiveAxisQualitiesNoteJa:
      '資質は10通りの地図です。決めつけず、入口として使えます。',
    fiveAxisMeterNoteJa:
      '五つの視点は順位ではなく、いまのバランスをつかむためのものです。',
    reportSectionEyebrowJa: '4章の保存版',
    reportLightEyebrowJa: PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa,
    reportLightPriceJa: PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa,
    reportLightSummaryJa:
      '4章の保存版 + 相談返書1件。ウェブ上で閲覧（物理配送なし）。',
    reportFullEyebrowJa: PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa,
    reportFullPriceJa: PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa,
    reportFullSummaryJa:
      '相談返書合計5件まで深めたい方向け（保存版FULL）。',
    reportFullLineJa:
      '保存版FULL（¥1,480（税込））：相談返書合計5件。',
    reportFullUpgradeNoteJa:
      'ライトで始めたあとも、必要に応じてFULL化できます。',
    reportDepthNoteJa: '無料で見えた輪郭を、4章で読み返せる形に残します。',
    reportAuxJa:
      '相談返書は、保存版に紐づく一テーマへの返書です。会話を続ける形式ではありません。',
    chapterPreviewLabelJa: '保存版では、次の4章で整理します',
  },
  learnMore: {
    summaryJa: 'M55の仕組み',
    rulesJa: [
      '無料では、輪郭まで確認できます。',
      '保存版は、4章で読み返せる形に整理した有料の読み物です。',
      'ライト購入後でも、必要になったらFULL化できます。',
      'プランの詳細は「保存版のプランを見る」から確認できます。',
    ] as const,
  },
  coreBoundary: {
    titleJa: 'このページと保存版の違い',
    freeLeadJa:
      '無料の見取り図では、\n自分に出やすい輪郭を確認できます。\n5つの軸から、いまの傾向のバランスを見ます。',
    savedLeadJa:
      '保存版では、\n力が出やすい場面、無理がたまりやすい条件、戻し方を\n4章で読み返せる形に残します。\n相談返書では、保存版に沿って、いまの1テーマだけ整理します。',
  },
  coreCta: {
    overlineJa: '4章の保存版',
    titleJa: '4章の保存版',
    introJa:
      '無料で見えた輪郭は、まだ入口です。\n保存版では、力が出やすい場面、無理がたまりやすい条件、戻し方まで含めて、\n4章で読み返せる形に残します。',
    benefitsHeadingJa: '保存版で深まること',
    benefitsJa: [
      '仕事や学びで、どこに力が出やすいか',
      '人間関係で、どこで無理がたまりやすいか',
      '疲れやすい条件と、崩れやすい流れ',
      '自分をどこから整えると戻りやすいか',
    ] as const,
    bundleNoteJa:
      'その先で必要になったら、相談返書で保存版に沿って、いまの1テーマだけ整理できます。会話を続ける形式ではありません。',
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
    openFreeMapJa: '無料の見取り図を見る',
    viewFreeMapJa: '無料の見取り図を見る',
    viewSavedPlansJa: '保存版のプランを見る',
    viewSavedPlansHref: '/dtr/lp',
    homeHref: '/home',
    coreFreeHref: '/core',
  },
} as const;
