import { PAID_DTR_LP, PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';
import { M55_PUBLIC_COMMERCIAL_TRUTH } from './analysisAuthorityReferenceModel';

/** Top / free-entry public copy — references PAID_DTR_LP SSOT; no long LP duplication. */
export const TOP_FREE_ENTRY_PUBLIC_COPY = {
  m55Definition: {
    centerJa:
      'M55は、生年月日の暦リズムと選択式の質問を重ね、\n考え方・動き方・負担が出やすい場面を整理する\n自己理解と関係性整理のための読み解きシステムです。',
    shortJa:
      M55_PUBLIC_COMMERCIAL_TRUTH.summaryJa,
    principleJa:
      '本人に代わって答えを決めるのではなく、\n現実的な見方と、次に確かめることを示します。',
  },
  freeEntry: {
    leadJa:
      'ニックネームと生年月日を入力し、5つの短い質問と今の関心に答えると、\n暦の土台と現在の表れ方を分けた見取り図を無料で確認できます。',
  },
  savedReport: {
    definitionJa:
      '保存版では、10資質レーンを土台に、生年月日の暦リズムまで重ねて、\n比較的変わりにくい自分の出方を\n正式4章で整理します。',
  },
  consultReply: {
    definitionJa:
      '追加読み解きでは、保存版に今回入力した\n一つの読み解きテーマを重ねて読み直します。',
    notConversationJa: '会話を続ける形式ではありません。',
    coreStaticJa:
      '追加読み解きは、\n保存版に今回入力した一つの読み解きテーマを重ねて\n読み直す追加読み解きです。',
  },
  threeLayerOrderJa:
    '無料の見取り図 → 4章の保存版 → 保存版に紐づく追加読み解き',
  formalChapters: PAID_DTR_LP.chapters.items.map((ch) => ({
    roman: ch.roman,
    titleJa: ch.titleJa,
    labelJa: `${ch.roman} ${ch.titleJa}`,
  })),
  storefront: {
    introJa:
      M55_PUBLIC_COMMERCIAL_TRUTH.summaryJa,
    fullPlanNameJa: PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa,
    fullPriceLabelJa: PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa,
    fullSavedReportJa: '正式4章',
    fullConsultReplyJa: '追加読み解き合計5件',
    lightPlanNameJa: PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa,
    lightPriceLabelJa: PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa,
    lightSavedReportJa: '正式4章',
    lightConsultReplyJa: '追加読み解き1件',
    upgradeNoteJa:
      'ライト購入後でも、必要になったらFULL化できます。\n保存版を読んだあと、もう少し深く整理したくなった場合に選べます。',
  },
  home: {
    heroTitleLine1Ja: '生まれた日と、いまの答えから。',
    heroTitleLine2Ja: '自分の輪郭を、読み解く。',
    heroSubJa:
      '生年月日の暦リズムと選択式の質問を重ね、\n考え方・動き方・負担が出やすい場面を整理します。',
    heroSupportJa: M55_PUBLIC_COMMERCIAL_TRUTH.summaryJa,
    heroTrustJa:
      '未来や性格を断定する診断ではありません。\n入力内容をM55のルールで整理し、見直すための言葉にします。',
    heroFunnelLinesJa: [
      '無料で、現在の輪郭を見る。',
      '4章の保存版で、日常の場面まで深める。',
      '追加読み解きで、今の1テーマを整理する。',
    ] as const,
    heroFunnelCtaJa: '無料で自分を読み解く',
    heroCompatibilityCtaJa: '二人の関係を無料で見る',
    seenThingsBridgeLabelJa: '見えてくること',
    seenThingsBridgeHeadlineLine1Ja: '自分のことほど、',
    seenThingsBridgeHeadlineLine2Ja: '近すぎて見えにくい。',
    seenThingsBridgeItemsJa: [
      '同じところで迷う理由。',
      'なぜか疲れやすい場面。',
      '人との距離で、無理をする自分。',
    ] as const,
    seenThingsBridgeClosingJa:
      'M55で見えてくるのは、\nいつもの自分の輪郭。\n\nさらに深く見ることで、\nその輪郭をもっと具体的に読み解いていきます。',
    seenThingsBridgeAriaLabelJa: '見えてくること',
    tierStackAriaLabelJa: '無料、保存版、追加読み解き',
    tierFreeJa: '生年月日の暦リズムと今の回答から、現在の輪郭を見る。',
    tierSavedBadgeJa: '保存版',
    tierSavedJa: '動き方・疲れ方・戻し方を、読める言葉に整理して残す。',
    tierConsultBadgeJa: '追加読み解き',
    tierConsultJa: '保存版に沿って、いまの1テーマを整理する。',
    exploreHowSubJa: 'M55の見方を見る →',
    exploreQualitiesTitleJa: '10資質レーンから読む',
    exploreQualitiesSubJa: '10資質レーンを見る →',
    readNextSectionTitleJa: 'どちらを読みますか',
    readNextHowTitleJa: '自分を読む',
    readNextHowDescJa: '生年月日の暦リズムと、5つの質問・今の関心から現在の輪郭を整理します。',
    readNextHowCtaJa: '無料で始める →',
    readNextQualitiesTitleJa: '二人を読む',
    readNextQualitiesDescJa: '二人分の生年月日と、今の距離や会話についての回答から反応の違いを整理します。',
    readNextQualitiesCtaJa: '無料で始める →',
    tenViewsLearnLinkJa: '10資質レーン',
    methodFlowLabelJa: 'M55の仕組み',
    methodFlowHeadlineLine1Ja: '生年月日を、',
    methodFlowHeadlineLine2Ja: '暦の体系で読み直す。',
    methodFlowBodyJa:
      'M55は、生まれた日を旧暦に置き直し、\n十干・二十四節気・節入りの重なりを暦の土台として扱います。\nその土台に選択式の質問を重ね、現在の表れ方を整理します。',
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
      '暦の流れに置き直すことで、\n近すぎて見えにくい自分の輪郭を、\nもう一度見つめ直していきます。',
    fiveAxisLeadJa: 'いまのバランスをつかむための見方です。',
    fiveAxisSectionTitleJa: '輪郭の見方',
    algorithmNoteJa:
      '生年月日の暦リズムを入口に、M55独自の10資質フレームと現在の回答を重ねて輪郭をつかみます。',
    fiveAxisQualitiesNoteJa:
      '10資質レーンは入口の地図です。決めつけず、生年月日の暦リズムと重ねて読みます。',
    fiveAxisMeterNoteJa:
      '順位ではなく、いまのバランスをつかむための見方です。',
    reportSectionEyebrowJa: '無料で見えた輪郭の、その先へ',
    paidPlanLabelJa: '',
    paidPlanHeadlineLine1Ja: '今の答えを重ねた輪郭を、',
    paidPlanHeadlineLine2Ja: '4章で読み返せる形に。',
    paidPlanLeadJa:
      '無料で使った生年月日の暦リズムと回答を土台に、\n日常の場面、負荷が強くなる前のサイン、戻し方までを4章で整理します。\n\n保存版は購入したアカウントに残り、あとから読み返せます。',
    paidPlanUniquenessChipsJa: [
      '10通りの資質',
      '旧暦',
      '二十四節気',
      '節入り調整',
      '見方と整え方',
    ] as const,
    paidPlanValueHeadingJa: '無料では、現在の輪郭を。\n保存版では、日常の場面と戻し方まで。',
    paidPlanValueSubheadingJa:
      'ライトとFULLの4章は共通です。\n違いは、保存版を土台に使える追加読み解きの件数です。',
    paidPlanSavedPreviewLabelJa: '深く見るほど、見えてくること',
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
          '同じ資質でも、\n生まれた日によって出方は変わります。\n\nその違いを、\n自分に出やすい傾向として見ていきます。',
      },
      {
        titleJa: '無理が出やすい条件を知る',
        descJa:
          '本質が悪いのではなく、\n負荷がたまりやすい条件があります。\n\nその条件を、\nひとつずつひも解いていきます。',
      },
      {
        titleJa: '追加読み解きで、今の1テーマを整理する',
        descJa:
          '解析で見えた自分の傾向を、\n今気になっている場面に重ねていきます。\n\n一般論ではなく、\n自分の場合はどう見ればいいかを、\nさらに具体的に深めていきます。',
      },
    ] as const,
    paidPlanPriceLeadJa: '保存版では、本質と特質性をもとに、自分を深めていきます。',
    paidPlanFunnelTitleJa: 'まずは無料で、現在の輪郭を見る',
    paidPlanFunnelBodyJa:
      '無料の見取り図を最後まで確認する。\n必要なら4章の保存版を選ぶ。\n購入後は、読み解きホームからいつでも再開できます。',
    paidPlanCtaJa: '無料で自分を読み解く',
    paidPlanSavedInfoHeadingJa: '保存版ライトと保存版FULL',
    paidPlanSavedInfoBodyJa:
      'どちらも同じ4章の保存版です。\nライトは追加読み解き1件、FULLは追加読み解き合計5件です。',
    paidPlanSavedInfoPriceJa:
      `${PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa} ${PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa}・追加読み解き1件\n${PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa} ${PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa}・追加読み解き合計5件\nいずれも日本円の買い切りです。`,
    compatibilitySavedAvailableJa:
      '二人の保存版の商品内容は、無料の見取り図を確認したあとに案内します。',
    compatibilitySavedPausedJa:
      '二人の保存版は準備中です。無料の見取り図は引き続き利用できます。',
    paidPlanFootnoteUpgradeJa: '必要に応じて、保存版をもとにさらに見方を深められます。',
    reportLightEyebrowJa: PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa,
    reportLightPriceJa: PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa,
    reportLightSummaryJa:
      '4章の保存版 + 追加読み解き1件。ウェブ上で閲覧（物理配送なし）。',
    reportFullEyebrowJa: PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa,
    reportFullPriceJa: PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa,
    reportFullSummaryJa:
      '追加読み解き合計5件まで深めたい方向け（保存版FULL）。',
    reportFullLineJa:
      '保存版FULL（¥1,480（税込））：追加読み解き合計5件。',
    reportFullUpgradeNoteJa:
      'ライトで始めたあとも、必要に応じてFULL化できます。',
    reportDepthNoteJa: '無料で見えた輪郭を、暦リズム込みで保存版に深めます。',
    reportAuxJa:
      '追加読み解きは、保存版に紐づく一テーマを整理する追加読み解きです。会話を続ける形式ではありません。',
    chapterPreviewLabelJa: '保存版では、次の整理で深めます',
  },
  learnMore: {
    summaryJa: 'M55の仕組み',
    homeHowLinkJa: 'M55の仕組み',
    homeTenViewsLinkJa: '10資質の見方',
    homeIntroJa:
      'M55は、生年月日の暦リズムを手がかりに、\nM55独自の10資質フレームと選択式の回答を重ねて、\n現在の自分や二人の関係を整理します。',
    homeFreeNoteJa: '無料では、自分の入口を見ていきます。',
    homePaidNoteJa:
      'さらに深く見ると、感じ方・無理の出方・戻り方まで深めていきます。',
    homeUpgradeNoteJa: '必要に応じて、あとからさらに詳しい内容へ広げられます。',
    homeCtaJa: 'まずは無料で見てみる',
    rulesJa: [
      '無料では、生年月日の暦リズムと現在の回答から見取り図を確認できます。',
      '保存版は、同じ入力に基づく4章を購入したアカウントで読み返せます。',
      'ライト購入後でも、必要になったらFULL化できます。',
      'プランの詳細は「保存版のプランを見る」から確認できます。',
    ] as const,
  },
  coreBoundary: {
    titleJa: 'このページと保存版の違い',
    freeLeadJa:
      '無料の見取り図では、\n生年月日の暦リズムと5つの質問・今の関心から、\n現在の5つの視点と最初の小さな行動まで確認できます。',
    savedLeadJa:
      '保存版では、\n生年月日の暦リズムまで重ねて、\n動き方・疲れ方・戻し方を\n4章で読み返せる形に残します。\n追加読み解きでは、保存版に沿って、いまの1テーマだけ整理します。',
  },
  coreCta: {
    overlineJa: '保存版',
    titleJa: '保存版で読めること',
    introJa:
      '無料の見取り図では、生年月日の暦リズムと現在の回答を重ね、\n5つの視点と最初の小さな行動まで表示しています。',
    benefitsHeadingJa: '保存版で深められる視点',
    benefitsJa: [
      '内側の動き',
      '人との距離感',
      '判断が止まりやすい場面',
      '変化の前に出やすい反応',
      '追加で深めやすい視点',
    ] as const,
    bundleNoteJa:
      'その先で必要になったら、追加読み解きで保存版に沿って、いまの1テーマだけ整理できます。会話を続ける形式ではありません。',
    linkLabelJa: '保存版で続きを読む',
  },
  howM55Works: {
    heroTitleJa: 'M55の見方を知る',
    heroHookJa: '生まれた日と、いまの答えから。',
    heroLeadJa:
      'M55は、生年月日の暦リズムと選択式の質問を重ね、\n自分や二人の関係を少し離れて見つめるための言葉に変えます。',
    heroBridgeJa:
      '暦の土台、現在の回答、固定ルール、生成AIの使用範囲を分けて説明します。\n無料と保存版の違い、入力の扱い、支払い条件もここで確認できます。',
    section01KickerJa: '01 — 生まれた日は、見つめ直すための入口',
    section01TitleJa: '生まれた日は、見つめ直すための入口',
    section01ParagraphsJa: [
      '自分を見つめ直すとき、\n変わらない手がかりになるのが、生まれた日です。',
      'M55は、生まれた日をただの日付で終わらせず、\n自分を見つめ直すための入口として扱います。',
      'ひとつの言葉で、あなたを決めつけない。\n生まれた日に重なる暦の層から、\n自分を見つめ直すための輪郭を描いていく。\nそれが、M55の見方です。',
      '生まれた日の暦リズムは、\nあなたを固定する結論ではなく、\n今の回答と重ねて自分を見つめ直すための手がかりです。',
    ] as const,
    section01LandingJa:
      'まず、生まれた日を入口に、\n近すぎて見えにくかった自分を、落ち着いて見つめ直せます。',
    section02KickerJa: '02 — M55が重ねる4つの暦の層',
    section02TitleJa: 'M55が重ねる4つの暦の層',
    section02IntroJa:
      'M55は、生まれた日を一つの暦だけで見ません。\n\n旧暦、十干、二十四節気、節入り。\n4つの暦の層を重ね、\n生まれた日から見える輪郭を、少しずつ立体的にしていきます。\n\nひとつだけでは、見える輪郭に限りがあります。\n重ねて見るほど、\n「なぜ自分には、こういう輪郭があるのか」が、\n自分ごとに見えてきます。',
    section02LandingJa:
      '同じ入口に見えても、\n見えてくる輪郭はそれぞれ変わります。',
    section02GridAriaLabelJa: '4つの暦の層',
    calendarLayerHowLabelJa: 'M55ではどう見るか',
    calendarLayersJa: [
      {
        layerId: 'lunar',
        titleJa: '旧暦',
        subLabelJa: '月のリズムに置き直す',
        whatJa:
          '月の満ち欠けをもとに月日を組み立ててきた暦です。\n西暦の日付だけでは見えにくい、月ごとのリズムや置き方の違いを、別の角度から見ます。',
        howJa:
          'M55は、あなたの生まれた日を旧暦上の月日にも置き直します。\n今のカレンダーだけでは見えにくい輪郭を、\nもう一つの角度から重ねて見ます。',
      },
      {
        layerId: 'stems',
        titleJa: '十干',
        subLabelJa: '日の周期の位置を見る',
        whatJa:
          '甲・乙・丙・丁…と続く、暦の目印です。\n性格名ではなく、その日がどの周期の位置にあるかを示します。',
        howJa:
          'M55では、十干を、あなたを決めるものではなく、\n生まれた日に重なる周期の目印として見ます。\n他の暦の層と重ねることで、\n同じ入口に見えても、見えてくる輪郭が少しずつ変わってきます。',
      },
      {
        layerId: 'terms',
        titleJa: '二十四節気',
        subLabelJa: '季節の位置を見る',
        whatJa:
          '一年を24の季節の節目に分ける暦の見方です。\n生まれた日が、季節の始まり・深まり・切り替わりのどこにあるかを示します。',
        howJa:
          'M55は、生まれた日が季節のどの位置にあるかを重ねます。\n西暦の月だけでは見えにくい輪郭を、\n季節の流れの中から見ていきます。',
      },
      {
        layerId: 'setsuiri',
        titleJa: '節入り',
        subLabelJa: '境目の前後を見る',
        whatJa:
          '暦上で季節の読み方が切り替わる境目です。\n同じ西暦の月でも、節入りの前か後かで、参照する季節の層が変わることがあります。',
        howJa:
          'M55は、生まれた日が節入りの前後どちらにあるかも重ねて見ます。\n同じ月に見えても、境目の前後で見え方が変わることがあります。',
      },
    ] as const,
    section03KickerJa: '03 — 4つの層を重ねると、なぜ一人ずつ違って見えるのか',
    section03TitleJa: '4つの層を重ねると、なぜ一人ずつ違って見えるのか',
    section03ParagraphsJa: [
      'M55では、まず生まれた日を入口として使います。\nただし、これは全体を決める答えではありません。\n最初の手がかりです。',
      'そのうえで、旧暦・十干・二十四節気・節入りを重ねます。\n同じ入口に見えても、\n重なる暦の層が違えば、\n見取り図の中身は同じにはなりません。',
      'さらに、選択式の質問と今の関心を重ねて、\n現在の表れ方を見やすくします。\n暦だけで結論を出さず、同じ暦の土台でも回答が変われば、現在の見取り図も変わります。',
    ] as const,
    section03LandingJa:
      'だからM55は、生まれた日の暦リズムと今の回答から、\nまだ言葉になっていなかった輪郭を整理します。',
    section03FiveViewsLeadJa: '自分の輪郭を見ていく視点',
    section03FiveViewLabelsJa: [
      '近い人との距離',
      '感受性',
      '発想',
      '協調',
      '段取り',
    ] as const,
    section04KickerJa: '04 — 無料の見取り図と保存版',
    section04TitleJa: '無料の見取り図と4章の保存版',
    section04FreeIntroJa: '無料でも、最初の理解を最後まで確認できます。',
    section04FreeMapBodyJa:
      '無料の見取り図では、\n生年月日の暦リズムと5つの質問・今の関心から、\n現在の輪郭と最初の小さな行動を確認できます。',
    section04CompositeHookJa: '無料で見えた輪郭の先へ。',
    section04CompositeBodyJa:
      '4章の保存版は、\n無料で見えた輪郭を、仕事・近い関係・生活と疲れの具体的な場面へ広げ、\n購入したアカウントで読み返せる形に残します。',
    section04ValueCardsJa: [
      {
        cardId: 'essence',
        titleJa: '自分の本質',
        bodyJa: 'なんとなく感じていた自分の輪郭が、言葉になる。',
      },
      {
        cardId: 'rest',
        titleJa: '生活や疲れの整え方',
        bodyJa: '疲れが出やすい場面や、整えられる余白が見えてくる。',
      },
      {
        cardId: 'work',
        titleJa: '仕事の進め方',
        bodyJa: '力が出やすい場面と、消耗しやすい場面が見えてくる。',
      },
      {
        cardId: 'distance',
        titleJa: '近い人との距離感',
        bodyJa: '距離の取り方や言葉の選び方を、自分の感覚から見直せる。',
      },
    ] as const,
    section04ClosingJa: '気になったテーマは、\n追加読み解きでさらに整理できます。',
    section05KickerJa: '05 — 見て、感じて、自分の言葉で確かめる',
    section05TitleJa: '見て、感じて、自分の言葉で確かめる',
    section05ParagraphsJa: [
      'M55は、結果を見て終わりではありません。',
      '「ここは近い」\n「ここは少し違う」',
      'その感覚も、\n自分を知るための手がかりです。',
      '自分を少し離れて見られるようになると、\nいつもの考え方や選び方に、\n別の角度が加わります。',
      'たとえば、\nいつもの反応や選び方を、\n自分の輪郭と重ねて見られると、\n次にどう選ぶかを見直しやすくなります。',
      '見えた輪郭を、\n自分の言葉で確かめていくほど、\n今まで気づいていなかった自分が見えてきます。',
    ] as const,
    section06KickerJa: '06 — M55が大切にしていること',
    section06TitleJa: 'M55が大切にしていること',
    section06ParagraphsJa: [
      'M55は、未来予測、運命や吉凶の断定、医学的・心理学的な診断ではありません。\n医療・法律・投資などの専門的な判断に代わるものでもありません。',
      '生年月日の暦リズムと現在の回答を重ね、\n自分や二人の関係を少し離れて見つめるための見取り図です。',
      '答えを代わりに決めるのではなく、\n今の自分を知るための視点を届けます。',
    ] as const,
    section06LandingJa:
      '自分の言葉で確かめながら、\n落ち着いて見つめ直せます。',
    section07KickerJa: '07 — 次のステップ',
    section07TitleJa: '次のステップ',
    nextLeadJa:
      'まずは、無料の見取り図で、\n自分の輪郭を確認してみてください。',
    nextSubJa: '生まれた日と、いまの答えから。\nここから、M55を始められます。',
    nextFootJa:
      '4章の保存版では、\n無料の見取り図で見えた輪郭を、\n日常の具体的な場面まで深めて残します。',
    nextClosingJa:
      '気になったテーマは、\n追加読み解きで今の自分に合わせて整理できます。',
    primaryCtaJa: '無料の見取り図を見る',
    secondaryCtaJa: '4章の保存版を見る',
    backButtonJa: '前のページへ戻る',
  },
  metadata: {
    howM55WorksDescriptionJa:
      'M55が生年月日の暦リズムと選択式の質問をどう重ねるか、固定ルールと生成AIの範囲、無料と保存版、個人情報、支払い条件を説明します。',
  },
  cta: {
    openFreeMapJa: '無料で見てみる',
    viewFreeMapJa: '無料で見てみる',
    viewSavedPlansJa: '保存版のプランを見る',
    /** Primary /core conversion CTA (Phase1). Same href as viewSavedPlans. */
    continueSavedReportJa: '保存版で続きを読む',
    viewSavedPlansHref: '/dtr/lp',
    homeHref: '/home',
    coreFreeHref: '/core',
  },
} as const;
