import { PAID_DTR_LP, PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';
import { M55_PUBLIC_COMMERCIAL_TRUTH } from './analysisAuthorityReferenceModel';

/** Top / free-entry public copy — references PAID_DTR_LP SSOT; no long LP duplication. */
export const TOP_FREE_ENTRY_PUBLIC_COPY = {
  m55Definition: {
    centerJa:
      'M55は、自分や二人に繰り返し現れやすい、うまくいく流れとつまずきやすい流れを、生年月日と6つの質問から詳しく解析するサービスです。',
    shortJa:
      M55_PUBLIC_COMMERCIAL_TRUTH.summaryJa,
    principleJa:
      '本人に代わって答えを決めるのではなく、\n現実的な見方と、次に確かめることを示します。',
  },
  freeEntry: {
    leadJa:
      'ニックネームと生年月日を入力し、5つの傾向質問と今の関心1問に答えると、\n暦の土台と現在の表れ方を分けた見取り図を無料で確認できます。',
  },
  savedReport: {
    definitionJa:
      '個人の保存版では、無料6回答に購入前の追加6回答と、\nより詳細な暦の手がかりを重ね、\n現在の輪郭を正式4章で整理します。',
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
    heroEyebrowJa: '自分と二人を無料で見る',
    heroTitleLine1Ja: 'あなたの「いつもこうなる」には、',
    heroTitleLine2Ja: '順番がある。',
    heroSubJa:
      'うまくいく時も、迷う時も。\n自然に合う時も、すれ違う時も。\n\n自分や二人には、\n何度も現れやすい流れがあります。\n\nM55は、生年月日と今の回答を重ねて、\n強み、判断の傾向、関係の特徴まで\n詳しく解析します。',
    heroSupportJa: M55_PUBLIC_COMMERCIAL_TRUTH.summaryJa,
    heroTrustJa:
      '自分では気づきにくい\n「うまくいく条件」も、\n無料で見えてきます。',
    heroMetaJa: '生年月日＋6つの質問・ログイン不要',
    heroFunnelLinesJa: [
      '無料で、現在の輪郭を見る。',
      '4章の保存版で、日常の場面まで深める。',
      '追加読み解きで、今の1テーマを整理する。',
    ] as const,
    heroFunnelCtaJa: '無料で見てみる',
    heroCompatibilityCtaJa: '',
    introductionLabelJa: 'M55について',
    introductionTitleJa: '決めつけるためではなく、見直すために。',
    introductionBodyJa:
      'M55は、生年月日から得る手がかりと選択式の回答を重ね、現在の傾向を見直しやすい言葉に整理します。',
    introductionTrustJa:
      '医学的・心理学的な診断や未来予測ではなく、自分や二人の反応を振り返るための参考情報です。',
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
    tierFreeJa: '個人は生年月日から得る無料用の手がかりと合計6回答から、現在の輪郭を見る。',
    tierSavedBadgeJa: '保存版',
    tierSavedJa: '動き方・疲れ方・戻し方を、読める言葉に整理して残す。',
    tierConsultBadgeJa: '追加読み解き',
    tierConsultJa: '保存版に沿って、いまの1テーマを整理する。',
    exploreHowSubJa: 'M55の見方を見る →',
    exploreQualitiesTitleJa: '10資質レーンから読む',
    exploreQualitiesSubJa: '10資質レーンを見る →',
    readNextSectionTitleJa: 'どちらを解析しますか？',
    personalFreeCardJa: {
      labelJa: '自分の無料解析',
      headlineJa: '自分の強みと、\nいつものパターンを知る',
      bodyJa:
        'どんな時に自然に力を発揮できるのか。\n何を大切にして選んでいるのか。\nどんな場面で迷いや疲れが始まりやすいのか。\n\n生年月日と6つの質問から、\n今の自分に表れやすい特徴を解析します。',
      resultHeadingJa: '無料で見えること',
      resultItemsJa: [
        '自然に力が出やすい場面',
        '自分らしい考え方と決め方',
        '人との心地よい距離',
        '迷いや疲れが始まりやすい場面',
        '今の自分に強く表れている傾向',
      ] as const,
      metaJa: ['無料・ログイン不要', '生年月日＋6つの質問'] as const,
      ctaJa: '自分を無料で見てみる',
    },
    compatibilityFreeCardJa: {
      labelJa: '二人の無料相性解析',
      headlineJa: '二人が合うところと、\n違うところを知る',
      bodyJa:
        'なぜ自然に話が合いやすいのか。\nどんな違いが互いを補いやすいのか。\nどんな場面で、気持ちやタイミングがずれやすいのか。\n\n二人の生年月日と6つの質問から、\n二人の関係に表れやすい特徴を解析します。',
      resultHeadingJa: '無料で見えること',
      resultItemsJa: [
        '自然に合いやすいところ',
        '魅力として感じやすい違い',
        '互いを補いやすい部分',
        '会話や判断のテンポ',
        'すれ違いが始まりやすい場面',
      ] as const,
      metaJa: ['無料・ログイン不要', '二人の生年月日＋6つの質問'] as const,
      ctaJa: '二人の相性を無料で見てみる',
    },
    readNextHowTitleJa: '自分の強みと、いつものパターンを知る',
    readNextHowDescJa: '生年月日と6つの質問から、今の自分に表れやすい特徴を解析します。',
    readNextHowCtaJa: '自分を無料で見てみる',
    readNextQualitiesTitleJa: '二人が合うところと、違うところを知る',
    readNextQualitiesDescJa: '二人の生年月日と6つの質問から、関係に表れやすい特徴を解析します。',
    readNextQualitiesCtaJa: '二人の相性を無料で見てみる',
    tenViewsLearnLinkJa: '10資質レーン',
    methodFlowLabelJa: 'M55の違い',
    methodFlowHeadlineLine1Ja: '生年月日だけで決めない。',
    methodFlowHeadlineLine2Ja: '今のあなたまで重ねて読む。',
    methodFlowBodyJa:
      '生年月日から見る、変わりにくい傾向。\n6つの質問から見る、今の状態。\n\nM55はこの二つを重ねることで、\n生年月日だけでは分からない\n現在の表れ方まで解析します。\n\n個人では、強みと迷いやすさを。\n二人では、合うところと\nすれ違いやすいところを。\n\n良い面と難しい面の両方から、\n今の自分や二人を詳しく見ていきます。',
    methodPreviewFrameworkJa:
      'M55は、ひとつのタイプに決めるのではなく、どんな時にどの特徴が表れやすいかを見ます。',
    methodPreviewLinkJa: 'M55の仕組みを詳しく見る',
    methodPreviewTenViewsLinkJa: '',
    methodComparisonJa: [
      {
        generalLabelJa: '一般的なタイプ診断',
        generalBodyJa: 'あなたはこのタイプ',
        m55BodyJa: 'どんな時に、どの特徴が表れやすいか',
      },
      {
        generalLabelJa: '一般的な相性判定',
        generalBodyJa: '良い・悪いの判定',
        m55BodyJa: 'どこが合い、どこで違いが表れやすいか',
      },
    ] as const,
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
      '優劣を比べるものではなく、いまのバランスをつかむための見方です。',
    reportSectionEyebrowJa: '無料で見えた輪郭の、その先へ',
    paidPlanLabelJa: '',
    paidPlanHeadlineLine1Ja: '無料で全体像を。',
    paidPlanHeadlineLine2Ja: '有料では、場面ごとに詳しく。',
    paidPlanLeadJa:
      '無料解析では、\n自分や二人の全体的な特徴を確認できます。\n\n有料レポートでは、\n無料解析をもとに、\n仕事、人との関わり、判断、\n合いやすさやすれ違いやすさなどを\n複数の場面から詳しく読み解きます。',
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
    paidPlanSavedInfoHeadingJa: 'M55 個人解析レポート',
    paidPlanSavedInfoBodyJa:
      '無料解析の続きを、4章の詳しい個人解析で。\n\n自然に力を発揮しやすい条件。\n仕事や人との関わりに表れやすい特徴。\n迷いや疲れにつながりやすい流れ。\n今の自分に強く出ている傾向。\n\n無料解析では扱わない部分まで、4章の個人解析レポートで詳しく読み解きます。',
    paidPlanSavedInfoPriceJa:
      `個人解析ライト ${PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa.replace('（税込）', '（税込・買い切り）')}\n4章の個人解析＋追加読み解き1件\n\n個人解析FULL ${PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa.replace('（税込）', '（税込・買い切り）')}\n4章の個人解析＋追加読み解き合計5件\n\n後からFULL化 ${PAID_DTR_SAVED_REPORT_PRICING.lightToFullUpgrade.priceLabelJa}`,
    paidPlanDetailsCtaJa: '個人解析レポートの内容を見る',
    paidPlanOwnershipNoteJa:
      '購入したレポートは、マイページから後で読み返せます。',
    compatibilityPaidHeadingJa: '2人の距離の読み解き',
    compatibilityPaidAuxiliaryNameJa: '2人の関係整理レポート',
    compatibilityPaidHeadlineJa: '二人の関係を、選んだテーマから詳しく読む。',
    compatibilityPaidBodyJa:
      '二人が自然に合いやすいところ、\n互いを補いやすい違い、\nすれ違いが始まりやすい場面、\n選んだテーマについて詳しく読める\nデジタルレポートです。',
    compatibilityPaidOutcomesJa: [
      'あなた側に出やすい反応',
      '相手側に表れやすい傾向',
      '二人が自然に合いやすいところ',
      '互いを補いやすい違い',
      'すれ違いが始まりやすい場面',
      '選んだテーマについての詳しい結果',
    ] as const,
    compatibilitySavedAvailableJa:
      '2人の距離の読み解きは、無料の相性解析の結果から内容と購入条件を確認できます。',
    compatibilitySavedPausedJa:
      '2人の距離の読み解きは現在準備中です。無料の相性解析は利用できます。',
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
    reportDepthNoteJa: '無料6回答に購入前の追加6回答と、より詳細な暦の手がかりを重ねて保存版に深めます。',
    reportAuxJa:
      '追加読み解きは、保存版に紐づく一テーマを整理する追加読み解きです。会話を続ける形式ではありません。',
    chapterPreviewLabelJa: '保存版では、次の整理で深めます',
  },
  learnMore: {
    summaryJa: '理解を深める',
    homeHowLinkJa: '詳しい仕組みを見る',
    homeTenViewsLinkJa: '10資質の見方',
    homeIntroJa:
      'M55は、生年月日から得る商品別の手がかりと選択式の回答を重ね、\n現在の自分や二人の関係を整理します。',
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
      '無料の見取り図では、\n生年月日から得る無料用の手がかりと5つの傾向質問・今の関心1問から、\n現在の5つの視点と最初の小さな行動まで確認できます。',
    savedLeadJa:
      '保存版では、\n無料6回答に購入前の追加6回答と、より詳細な暦の手がかりを重ね、\n動き方・疲れ方・戻し方を\n4章で読み返せる形に残します。\n追加読み解きでは、保存版に沿って、いまの1テーマだけ整理します。',
  },
  coreCta: {
    overlineJa: '保存版',
    titleJa: '保存版で読めること',
    introJa:
      '個人の無料見取り図では、生年月日から得る無料用の手がかりと合計6回答を重ね、\n5つの視点と最初の小さな行動まで表示しています。',
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
    heroTitleJa: 'M55の仕組み',
    heroHookJa: '生年月日だけで決めない。今のあなたまで重ねて読む。',
    heroLeadJa:
      '生年月日から見る、変わりにくい傾向。\n6つの質問から見る、今の状態。\nM55はこの二つを重ね、現在の表れ方まで詳しく解析します。',
    heroBridgeJa:
      '個人では強みと迷いやすさを、二人では合うところとすれ違いやすいところを、\n良い面と難しい面の両方から見ていきます。',
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
    section02KickerJa: '02 — 個人解析レポートで扱う暦の手がかり',
    section02TitleJa: '個人解析レポートで扱う暦の手がかり',
    section02IntroJa:
      '個人解析レポートでは、生年月日から得る複数の暦の手がかりを扱います。\n\n旧暦、十干、二十四節気、節入りを参照し、無料の6問と購入前の追加6問を重ねて、強みと迷いやすさを4章で詳しく読み解きます。\n\n二人の解析では、二人分の生年月日と6つの質問を使い、合いやすいところとすれ違いやすいところを整理します。',
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
      '個人の無料解析では生年月日と6つの質問を使い、個人解析レポートでは購入前の追加6問と、より詳しい暦の手がかりを重ねます。',
      '二人の解析では、二人分の生年月日と、距離・会話・今確かめたいことを含む6つの質問を使います。',
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
    section04KickerJa: '04 — 無料解析と詳しいレポート',
    section04TitleJa: '無料で全体像を。有料では、場面ごとに詳しく。',
    section04FreeIntroJa: '無料解析でも、自分や二人の全体的な特徴を最後まで確認できます。',
    section04FreeMapBodyJa:
      '個人の無料解析では、生年月日と6つの質問から、\n強み、考え方、人との距離、迷いやすい場面、\n今の自分に強く表れている傾向を確認できます。',
    section04CompositeHookJa: '無料解析では扱わない場面まで、詳しく。',
    section04CompositeBodyJa:
      '4章の個人解析レポートでは、\n仕事、人との関わり、判断、迷いや疲れにつながりやすい流れまで、\n複数の場面から詳しく読み解きます。',
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
      '生年月日と6つの質問を重ね、\n自分や二人の良い面と難しい面を見つめるための解析です。',
      '答えを代わりに決めるのではなく、\n今の自分を知るための視点を届けます。',
    ] as const,
    section06LandingJa:
      '自分の言葉で確かめながら、\n落ち着いて見つめ直せます。',
    section07KickerJa: '07 — 次のステップ',
    section07TitleJa: '次のステップ',
    nextLeadJa:
      'まずは無料解析で、\n自分の強みといつものパターンを確認してみてください。',
    nextSubJa: '生年月日と6つの質問から、無料で始められます。',
    nextFootJa:
      '4章の個人解析レポートでは、\n無料解析で見えた全体像を、\n仕事や人との関わりなどの具体的な場面まで深めます。',
    nextClosingJa:
      '気になったテーマは、\n追加読み解きで今の自分に合わせて整理できます。',
    primaryCtaJa: '自分を無料で見てみる',
    secondaryCtaJa: '個人解析レポートの内容を見る',
    backButtonJa: '前のページへ戻る',
  },
  metadata: {
    howM55WorksDescriptionJa:
      'M55が生年月日と6つの質問をどう重ね、個人の強みと迷いやすさ、二人の合いやすさとすれ違いやすさを解析するか説明します。',
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
