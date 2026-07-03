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
    seenThingsBridgeClosingJa:
      'M55で見えてくるのは、\nいつもの自分の輪郭。\n\n保存版では、\nその輪郭をさらに深くひも解きます。',
    seenThingsBridgeAriaLabelJa: '見えてくること',
    tierStackAriaLabelJa: '無料、保存版、相談返書',
    tierFreeJa: '10資質レーンで、いまの輪郭を見る。',
    tierSavedBadgeJa: '保存版',
    tierSavedJa: '動き方・疲れ方・戻し方を、読める言葉に整理して残す。',
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
    methodFlowLabelJa: 'M55複合暦解析',
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
      'この3つの暦体系を重ね、\nその人に出やすい本質と特質性を見ていきます。',
    fiveAxisLeadJa: 'いまのバランスをつかむための見方です。',
    fiveAxisSectionTitleJa: '輪郭の見方',
    algorithmNoteJa:
      '生年月日を入口に、10資質レーンとM55複合暦解析でいまの輪郭をつかみます。',
    fiveAxisQualitiesNoteJa:
      '10資質レーンは入口の地図です。決めつけず、生年月日の暦リズムと重ねて読みます。',
    fiveAxisMeterNoteJa:
      '順位ではなく、いまのバランスをつかむための見方です。',
    reportSectionEyebrowJa: '保存版',
    paidPlanLabelJa: '保存版',
    paidPlanHeadlineLine1Ja: 'その誕生日を、',
    paidPlanHeadlineLine2Ja: '一般論で終わらせない。',
    paidPlanLeadJa:
      'M55複合暦解析で、10通りの資質・旧暦・二十四節気・節入り調整を重ね、\n生年月日から、その人に出やすい本質と特質性を読み解きます。\n\n保存版では、その輪郭をもとに、\n感じ方、無理の出方、戻り方までをひも解き、\nあなた固有の取扱説明書として受け取れます。',
    paidPlanUniquenessChipsJa: [
      '10資質',
      '旧暦',
      '二十四節気',
      '節入り調整',
      '見方と整え方',
    ] as const,
    paidPlanValueHeadingJa: '無料結果の先で深まること',
    paidPlanValueSubheadingJa: '本質を、もう少し深くひも解く',
    paidPlanSavedPreviewLabelJa: '保存版の中身',
    paidPlanSavedPreviewNoteJa:
      '本質の輪郭から、感じ方、無理の出方、戻り方までをひも解いていきます。',
    paidPlanSavedPreviewChaptersJa: [
      { roman: 'Ⅰ', titleJa: '輪郭を見る', teaserJa: '自分に出やすい傾向をつかむ' },
      { roman: 'Ⅱ', titleJa: '構造を読む', teaserJa: '考え方と動き方のつながり' },
      { roman: 'Ⅲ', titleJa: '無理を知る', teaserJa: '負荷がたまりやすい条件' },
      { roman: 'Ⅳ', titleJa: '楽に扱う', teaserJa: '疲れたときの戻り方' },
    ] as const,
    paidPlanCardsJa: [
      {
        titleJa: '本質の輪郭を深く見る',
        descJa:
          '同じ資質でも、生まれた日によって出方は変わります。\n保存版では、その違いをあなた固有の特質性として見ていきます。',
      },
      {
        titleJa: '無理が出やすい条件を知る',
        descJa:
          '本質が悪いのではなく、負荷がたまりやすい条件があります。\n保存版では、その条件をひも解いていきます。',
      },
      {
        titleJa: '気になることを、M55と見直す',
        descJa:
          '保存版でひも解いた自分をもとに、\nいま気になることをM55に渡せます。\n保存版に照らして、\n見方と次に整えることを返します。',
      },
    ] as const,
    paidPlanPriceLeadJa: '保存版では、本質と特質性をもとに、自分を深めていきます。',
    paidPlanFunnelTitleJa: 'まずは無料で、自分を見てみる',
    paidPlanFunnelBodyJa:
      'M55は、無料結果から始められます。\n保存版は、無料結果を見たあと、\nもっと深く知りたい人のためのものです。',
    paidPlanCtaJa: 'まずは無料で見てみる',
    paidPlanSavedInfoHeadingJa: '保存版について',
    paidPlanSavedInfoBodyJa:
      '無料結果の先では、\n本質・特質性をさらにひも解き、\nあなた固有の取扱説明書として受け取れます。',
    paidPlanSavedInfoPriceJa: '保存版は ¥1,000（税込）です。',
    paidPlanFootnoteUpgradeJa: '必要に応じて、保存版をもとにさらに見方を深められます。',
    freeBridgeNoProfileTitleJa: 'まずは、生年月日から見る',
    freeBridgeNoProfileBodyJa:
      'まずは無料で、自分の輪郭を確認できます。\n生年月日を入力すると、10通りの資質から今の自分の輪郭を見られます。\n結果を見てから、詳しい保存版へ進めます。',
    freeBridgeNoProfileCtaJa: '無料で見てみる',
    freeBridgeHasProfileTitleJa: 'まずは無料結果を見る',
    freeBridgeHasProfileBodyJa:
      '無料結果ページで、あなたの輪郭を確認できます。\n保存版へ進む前に、まずは無料でM55を試せます。',
    freeBridgeHasProfileCtaJa: '無料で見てみる',
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
    reportDepthNoteJa: '無料で見えた輪郭を、暦リズム込みで保存版に深めます。',
    reportAuxJa:
      '相談返書は、保存版に紐づく一テーマへの返書です。会話を続ける形式ではありません。',
    chapterPreviewLabelJa: '保存版では、次の整理で深めます',
  },
  learnMore: {
    summaryJa: 'M55の仕組み',
    homeHowLinkJa: 'M55の見方',
    homeTenViewsLinkJa: '10資質レーン',
    homeIntroJa:
      'M55は、生年月日を手がかりに、\n10資質と旧暦・二十四節気・節入り調整などを重ねて、\n自分の輪郭を整理します。',
    homeFreeNoteJa: '無料では、まず自分の輪郭まで確認できます。',
    homePaidNoteJa:
      '保存版では、本質と特質性をもとに、自分を深めていきます。',
    homeUpgradeNoteJa: '必要に応じて、あとからさらに詳しい内容へ広げられます。',
    homeCtaJa: 'まずは無料で見てみる',
    rulesJa: [
      '無料では、10資質レーンで輪郭まで確認できます。',
      '保存版は、暦リズム込みで固定ルールの読み物です。',
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
