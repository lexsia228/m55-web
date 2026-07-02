import { PAID_DTR_LP, PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';

/** Top / free-entry public copy — references PAID_DTR_LP SSOT; no long LP duplication. */
export const TOP_FREE_ENTRY_PUBLIC_COPY = {
  m55Definition: {
    centerJa:
      'M55は、生年月日を10資質レーンへ分けるだけではありません。\n旧暦月・季節位置・日帯などの暦信号を重ねて、\n自分の動き方・疲れ方・戻し方まで見える保存版に整えます。',
    shortJa:
      'M55は、生年月日から、自分の動き方・疲れ方・戻し方を見える形にする保存版の見取り図です。',
    principleJa:
      '本人に代わって答えを決めるのではなく、\n現実的な見方と、次に確かめることを示します。',
  },
  freeEntry: {
    leadJa:
      'ニックネームと生年月日を入力すると、\n自分に出やすい輪郭を無料で確認できます。',
  },
  savedReport: {
    definitionJa:
      '保存版では、10資質レーンを土台に、生年月日の暦リズムまで重ねて、\n比較的変わりにくい自分の出方を\n正式4章で整理します。',
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
      'M55は、生年月日から、自分の動き方・疲れ方・戻し方を見える形にする保存版の見取り図です。',
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
    heroTitleLine2Ja: '自分が見える。',
    heroSubJa: 'M55は、生年月日を暦で見つめ直す\n自己理解の入口です。',
    heroSupportJa: 'M55は、生年月日を暦で見つめ直す自己理解の入口です。',
    seenThingsBridgeLabelJa: '見えてくること',
    seenThingsBridgeHeadlineLine1Ja: '自分のことほど、',
    seenThingsBridgeHeadlineLine2Ja: '近すぎて見えにくい。',
    seenThingsBridgeItemsJa: [
      '同じところで迷う理由。',
      'なぜか疲れやすい場面。',
      '人との距離で、無理をする自分。',
    ] as const,
    seenThingsBridgeClosingJa: 'M55で見えてくるのは、\nいつもの自分の輪郭。',
    seenThingsBridgeAriaLabelJa: '見えてくること',
    tierStackAriaLabelJa: '無料、保存版、相談返書',
    tierFreeJa: '10資質レーンと5つの視点で、いまの輪郭を見る。',
    tierSavedBadgeJa: '保存版',
    tierSavedJa: '動き方・疲れ方・戻し方を4章で読み返せる形に残す。',
    tierConsultBadgeJa: '相談返書',
    tierConsultJa: '保存版に沿って、いまの1テーマを整理する。',
    exploreHowSubJa: 'M55の見方を見る →',
    exploreQualitiesTitleJa: '10資質レーンから読む',
    exploreQualitiesSubJa: '10資質レーンを見る →',
    readNextSectionTitleJa: 'M55をもう少し深く',
    readNextHowTitleJa: 'M55の見方',
    readNextHowDescJa: 'なぜ生まれた日から、自分の輪郭が見えるのか。',
    readNextHowCtaJa: '読み方を知る →',
    readNextQualitiesTitleJa: '10通りの資質',
    readNextQualitiesDescJa: '自分の輪郭を、10の資質の語彙で確認する。',
    readNextQualitiesCtaJa: '資質を読む →',
    tenViewsLearnLinkJa: '10資質レーン',
    methodFlowLabelJa: 'M55の見方',
    methodFlowHeadlineLine1Ja: '生年月日を、',
    methodFlowHeadlineLine2Ja: '暦の体系で読み直す。',
    methodFlowBodyJa:
      'M55は、生まれた日を旧暦に置き直し、\n十干と二十四節気の重なりから、\nいつもの自分の輪郭を見ていきます。',
    methodFlowNodesJa: [
      {
        layerId: 'lunar',
        leadJa: '月と季節の流れ',
        titleJa: '旧暦',
        descJa: '生まれた日を、時間の流れに置き直す',
      },
      {
        layerId: 'stems',
        leadJa: '生まれた日に重なる質',
        titleJa: '十干',
        descJa: 'その日に出やすい傾向を見る',
      },
      {
        layerId: 'terms',
        leadJa: '季節の節目',
        titleJa: '二十四節気',
        descJa: '変わり目に現れるパターンを見る',
      },
    ] as const,
    methodFlowClosingJa:
      'この3つの暦体系の重なりから、\n5つの視点で今のあなたのバランスを\n読み解いていきます。',
    fiveAxisLeadJa: '五つの視点は、いまのバランスをつかむためのものです。',
    fiveAxisSectionTitleJa: '5つの視点の見方',
    algorithmNoteJa:
      '生年月日を入口に、10資質レーンと5つの視点でいまの輪郭をつかみます。',
    fiveAxisQualitiesNoteJa:
      '10資質レーンは入口の地図です。決めつけず、生年月日の暦リズムと重ねて読みます。',
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
    reportDepthNoteJa: '無料で見えた輪郭を、暦リズム込みで4章に深めます。',
    reportAuxJa:
      '相談返書は、保存版に紐づく一テーマへの返書です。会話を続ける形式ではありません。',
    chapterPreviewLabelJa: '保存版では、次の4章で整理します',
  },
  learnMore: {
    summaryJa: 'M55の仕組み',
    rulesJa: [
      '無料では、10資質レーンと5つの視点で輪郭まで確認できます。',
      '保存版は、暦リズム込みで4章読み返せる固定ルールの読み物です。',
      'ライト購入後でも、必要になったらFULL化できます。',
      'プランの詳細は「保存版のプランを見る」から確認できます。',
    ] as const,
  },
  coreBoundary: {
    titleJa: 'このページと保存版の違い',
    freeLeadJa:
      '無料の見取り図では、\n10資質レーンと5つの視点で、\n自分に出やすい輪郭を短く確認できます。',
    savedLeadJa:
      '保存版では、\n生年月日の暦リズムまで重ねて、\n動き方・疲れ方・戻し方を\n4章で読み返せる形に残します。\n相談返書では、保存版に沿って、いまの1テーマだけ整理します。',
  },
  coreCta: {
    overlineJa: '保存版',
    titleJa: '4章の保存版',
    introJa:
      '無料では、輪郭まで確認できました。\n保存版では、力が出やすい場面、無理がたまりやすい条件、戻し方まで含めて、\n4章で読み返せる形に残します。',
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
    receiveFreeLeadJa:
      'まず無料の見取り図では、10資質レーンと5つの視点で自分の輪郭を確認できます。',
    receiveSavedLeadJa:
      '4章の保存版では、生年月日の暦リズムまで重ねて、動き方・疲れ方・戻し方を、固定ルールで読み返せる形に整理します。',
    receiveContrastJa: '無料が輪郭なら、4章の保存版は構造と戻し方です。',
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
    openFreeMapJa: '無料で見てみる',
    viewFreeMapJa: '無料で見てみる',
    viewSavedPlansJa: '保存版のプランを見る',
    viewSavedPlansHref: '/dtr/lp',
    homeHref: '/home',
    coreFreeHref: '/core',
  },
} as const;
