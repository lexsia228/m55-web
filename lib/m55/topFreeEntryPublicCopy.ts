import { PAID_DTR_LP, PAID_DTR_SAVED_REPORT_PRICING } from './paidDtrProductCopy';

/** Shared public nav label — HOME IA SSOT (2026-07-19). */
export const PUBLIC_NAV_TEN_VIEWS_LABEL_JA = '10の資質' as const;

function formatHomePlanLightSpecJa(includedReplyCount: number): string {
  return `追加読み解き ${includedReplyCount}件`;
}

function formatHomePlanFullSpecJa(totalReplyCap: number): string {
  return `追加読み解き 合計${totalReplyCap}件`;
}

/** Top / free-entry public copy — references PAID_DTR_LP SSOT; no long LP duplication. */
export const TOP_FREE_ENTRY_PUBLIC_COPY = {
  m55Definition: {
    shortJa:
      'M55は、生年月日から、自分の動き方・疲れ方・戻し方を見える形にする無料の見取り図です。',
    principleJa:
      '本人に代わって答えを決めるのではなく、\n現実的な見方と、次に確かめることを示します。',
  },
  freeEntry: {
    leadJa:
      'ニックネームと生年月日を入力すると、\n自分に出やすい輪郭を無料で確認できます。',
  },
  savedReport: {
    definitionJa:
      'プレミアムレポートでは、10資質レーンを土台に、生年月日の暦リズムまで重ねて、\n比較的変わりにくい自分の出方を4章で整理します。',
  },
  consultReply: {
    definitionJa:
      '追加読み解きでは、プレミアムレポートに今回入力した\n一つの読み解きテーマを重ねて読み直します。',
    notConversationJa: '会話を続ける形式ではありません。',
    coreStaticJa:
      '追加読み解きは、\nプレミアムレポートに今回入力した一つの読み解きテーマを重ねて\n読み直す追加読み解きです。',
  },
  threeLayerOrderJa:
    '無料の見取り図 → プレミアムレポート → プレミアムレポートに紐づく追加読み解き',
  formalChapters: PAID_DTR_LP.chapters.items.map((ch) => ({
    roman: ch.roman,
    titleJa: ch.titleJa,
    labelJa: `${ch.roman} ${ch.titleJa}`,
  })),
  storefront: {
    introJa:
      'M55は、生年月日から、自分の動き方・疲れ方・戻し方を見える形にする無料の見取り図です。',
    fullPlanNameJa: PAID_DTR_SAVED_REPORT_PRICING.full.planNameJa,
    fullPriceLabelJa: PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa,
    fullSavedReportJa: 'プレミアムレポート',
    fullConsultReplyJa: '追加読み解き合計5件',
    lightPlanNameJa: PAID_DTR_SAVED_REPORT_PRICING.light.planNameJa,
    lightPriceLabelJa: PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa,
    lightSavedReportJa: 'プレミアムレポート',
    lightConsultReplyJa: '追加読み解き1件',
    upgradeNoteJa:
      'ライト購入後でも、必要になったらFULL化できます。\nプレミアムレポートを読んだあと、もう少し深く整理したくなった場合に選べます。',
  },
  /**
   * Home (lower, below the frozen poster hero) — SSOT for eleven always-rendered
   * sections per HOME IA REV1 + PATCH REV2.
   * heroEyebrowJa … heroPosterCtaJa are POSTER-only fields; do not change their
   * values here — the poster hero JSX/CSS is frozen and out of scope.
   */
  home: {
    heroEyebrowJa: '自分のこと、人との関係を読み解く',
    heroTitleLine1Ja: 'あなたの「いつもこうなる」には、',
    heroTitleLine2Ja: '順番がある。',
    heroSubJa: '',
    heroSupportJa: 'M55は、生年月日を暦で見つめ直す自己理解の入口です。',
    /** Hero poster–only support copy. Do not reuse for metadata/OG (heroSupportJa is the shared field). */
    heroPosterSupportJa: '生年月日を入れて、\n今の自分に近い答えを選ぶだけ。',
    heroTrustJa: 'ログイン不要',
    /** Hero poster–only CTA copy. Do not reuse for lower funnel (heroFunnelCtaJa is the shared field). */
    heroPosterCtaJa: '無料で見てみる',
    /** Referenced by app/support/page.tsx — keep key + value stable outside this gate's scope. */
    tierFreeJa: '10資質レーンで、いまの輪郭を見る。',

    /* §2 — Product map (below frozen hero, before free detail) */
    productMapEyebrowJa: 'M55でできること',
    productMapHeadlineJa: '自分の反応から、二人の関係、\n力が出やすい条件まで。',
    productMapSelfTitleJa: '自分の反応を知る',
    productMapSelfBodyJa:
      '生年月日と、いま選んだ答えを重ねて、\n自分に出やすい反応や、\n整え直すための入口を見ていきます。',
    productMapSelfStatusJa: '無料・ログイン不要',
    productMapSelfCtaJa: '無料で見てみる',
    productMapPairTitleJa: '二人の関係を読み解く',
    productMapPairBodyJa:
      'あなたと、関係を知りたい相手の生年月日と、\n今の二人に近い答えをもとに、\n話しやすい時と、\nすれ違いが続く時の流れを見ていきます。',
    productMapPairStatusJa: '無料・ログイン不要',
    productMapPairCtaJa: '二人の関係を見てみる',
    productMapPairPreparingTitleJa: '二人の関係を見る',
    productMapPairPreparingBodyJa:
      '二人の距離や、すれ違いが生まれやすい場面を読み解く体験を準備しています。',
    productMapPairPreparingStatusJa: '準備中',
    productMapPremiumTitleJa: '自分を深く読み解く',
    productMapPremiumBodyJa:
      '無料で見えた自分の入口をもとに、\n動き方、人との距離感、負担が重なり始める流れ、\n整え方まで詳しく整理します。',
    productMapPremiumLinkJa: 'プレミアムの内容を見る',

    /* §3a — Pair free (compact dedicated section, after self free) */
    pairFreeEyebrowJa: '二人の関係を見る',
    pairFreeHeadlineJa: 'なぜ話しやすい時と、\nすれ違う時があるのか。',
    pairFreeBodyJa:
      'あなたと、関係を知りたい相手の生年月日を入力し、\n今の二人に近い答えを選びます。\n重なりや違い、すれ違いが続く流れと、\n次に一度だけ試せることを、\n決めつけずに読み解きます。',
    pairFreeStatusJa: '無料・ログイン不要',
    pairFreeCtaJa: '二人の関係を無料で見てみる',
    pairFreePreparingStatusJa: '準備中',

    /* §3 — Free (outcome + preview merged) */
    outcomeBridgeEyebrowJa: 'M55で見えてくること',
    outcomeBridgeItemsJa: [
      {
        titleJa: '自分に表れやすい反応',
        bodyJa: '同じ場面で、どのような動きが出やすいか。',
      },
      {
        titleJa: '人と関わるときの自分の動き',
        bodyJa: '人と関わるとき、どのような順番で考え、動きやすいか。',
      },
      {
        titleJa: '整え直すための手がかり',
        bodyJa: '自分の状態を見直すとき、どこから整理するとよいか。',
      },
    ] as const,

    /* §4 — Mechanism band */
    mechanismEyebrowJa: 'M55の見方',
    mechanismHeadlineJa: '変わりにくい土台と、\nいまの答えを重ねて見る。',
    mechanismBodyJa:
      '生年月日から見える変わりにくい土台と、\nいま選んだ答え。\n自分を見るときも、二人の関係を見るときも、\n重なりから今表れやすい流れを整理します。',
    mechanismEthicsJa: '一つの情報だけで、人を決めない。',
    mechanismHowLinkJa: 'M55の仕組みを詳しく見る',
    mechanismDiagramSource1Ja: '生年月日から見える土台',
    mechanismDiagramSource2Ja: 'いま選んだ答え',
    mechanismDiagramOutputJa: '今表れやすい流れ',

    /* §3 continued — FREE result (merged with outcome bridge) */
    freeResultHeadlineJa: '無料で、今の自分に出やすい反応と、\n整え方の入口を知る。',
    freeResultBodyJa:
      '下の表示例のように、いまの自分に近い答えから、短い読み解きが返ります。',
    freeResultPreviewLabelJa: '無料結果の表示例',
    freeResultCtaJa: '無料で見てみる',
    freeResultSupportJa: 'ログイン不要',

    tenAssetTeaserEyebrowJa: '無料結果の入口',
    tenAssetTeaserHeadlineJa: '10の資質から、自分に表れやすい動きを見る。',
    tenAssetTeaserBodyJa:
      '無料結果では、10の資質のうち、\n自分の動きを見る入口になる資質が表示されます。\n役職や順位を示すものではありません。',
    tenAssetTeaserLinkJa: '10の資質を詳しく見る',

    /* §5 — Premium (preview + plan merged) */
    premiumValueBridgeEyebrowJa: '自分の無料結果から、さらに深く',
    premiumValueBridgeLeadJa:
      '無料は、今の自分を見る入口。\nプレミアムは、\nなぜそうなるかと、どう扱うかまで。',
    premiumValueBridgeFreeHeadingJa: '無料結果',
    premiumValueBridgeFreeItemsJa: [
      'いまの自分に近い短い読み解き',
      '自分に表れやすい資質',
      '今の状態を整理するための入口',
    ] as const,
    premiumValueBridgePremiumHeadingJa: 'プレミアムレポート',
    premiumValueBridgePremiumItemsJa: [
      '動き方と、力が出やすい条件',
      '人との距離感と、負担が重なり始める流れ',
      '整え直すための手がかり',
    ] as const,
    premiumEyebrowJa: 'M55 プレミアムレポート',
    premiumHeadlineJa: '自分の力が出やすい条件と、\n負担が重なり始める流れを読み解く。',
    premiumBodyJa:
      '生年月日から見える基礎傾向と、いまの回答をもとに、\n自分の動き方、人との距離感、\n負担が重なり始める流れ、整え方を\nプレミアムレポートとして整理します。',
    premiumPreviewLabelJa: 'M55 プレミアムレポートの表示例',
    premiumCtaJa: 'プレミアムレポートを見る',

    /* §5 continued — LIGHT / FULL (nested in premium section) */
    planComparisonIntroJa:
      'どちらも、同じプレミアムレポートを読めます。\n違いは、購入後に追加で読み解けるテーマ数です。',
    planLightNameJa: 'ライト',
    planLightFitJa: 'まず全体像を知り、\nいちばん気になることを1つ深く見たい人へ。',
    planLightPriceJa: PAID_DTR_SAVED_REPORT_PRICING.light.priceLabelJa,
    planLightSpecJa: formatHomePlanLightSpecJa(
      PAID_DTR_SAVED_REPORT_PRICING.light.includedReplyCount,
    ),
    planFullNameJa: 'フル',
    planFullFitJa: '複数の気になるテーマを、\nまとめて深く見たい人へ。',
    planFullPriceJa: PAID_DTR_SAVED_REPORT_PRICING.full.priceLabelJa,
    planFullSpecJa: formatHomePlanFullSpecJa(PAID_DTR_SAVED_REPORT_PRICING.full.totalReplyCap),
    planCommonFactsJa: ['買い切り', '自動更新なし', '購入と閲覧にはログインが必要です'] as const,
    planComparisonCtaJa: 'プレミアムレポートを見る',

    /* §6 — Final CTA */
    finalCtaHeadlineJa: 'まずは、今の自分を知るところから。',
    finalCtaBodyJa: '無料の読み解きは、ログインせずに始められます。',
    finalCtaPrimaryJa: '無料で見てみる',
    finalCtaSecondaryJa: 'プレミアムレポートを見る',
  },
  /** 05 — M55の仕組み (closed <details> disclosure; mechanism terms live only here). */
  learnMore: {
    summaryJa: 'M55の仕組み',
    headlineJa: '生年月日だけで決めつけない読み解き',
    bodyJa:
      'M55は、生年月日を手がかりにしながら、今の自分に近い回答も組み合わせます。生年月日だけで性格や行動を断定するものではなく、自分を一つの型に固定しません。',
    calendarSubheadingJa: '暦の見方について',
    calendarBodyJa:
      '生年月日の読み取りには、旧暦、十干、二十四節気、節入りを参照します。これらは結論を決めるためではなく、複数の見方を重ねるための材料です。',
    homeHowLinkJa: 'M55の仕組みを詳しく見る',
    homeTenViewsLinkJa: '10の資質を見る',
    reassuranceHeadingJa: 'M55が行わないこと',
    reassuranceJa:
      '未来や相手の気持ちを断定しません。診断、鑑定、治療、カウンセリングではありません。医療、法律、投資に関する専門的な判断の代わりにはなりません。',
  },
  coreBoundary: {
    titleJa: 'このページとプレミアムレポートの違い',
    freeLeadJa:
      '無料の見取り図では、\n10資質レーンと5つの視点で、\n自分に出やすい輪郭を短く確認できます。',
    savedLeadJa:
      'プレミアムレポートでは、\n生年月日の暦リズムまで重ねて、\n動き方・疲れ方・戻し方を\n4章で残します。\n追加読み解きでは、プレミアムレポートに沿って、いまの1テーマだけ整理します。',
  },
  coreCta: {
    overlineJa: 'プレミアムレポート',
    titleJa: 'プレミアムレポートで読めること',
    introJa:
      '無料の見取り図では、いま強く出ている一部だけを表示しています。\nこのページは、生年月日から見える出方の輪郭です。',
    benefitsHeadingJa: 'プレミアムレポートで深められる視点',
    benefitsJa: [
      '内側の動き',
      '人との距離感',
      '判断が止まりやすい場面',
      '変化の前に出やすい反応',
      '追加で深めやすい視点',
    ] as const,
    bundleNoteJa:
      'その先で必要になったら、追加読み解きでプレミアムレポートに沿って、いまの1テーマだけ整理できます。会話を続ける形式ではありません。',
    linkLabelJa: 'プレミアムレポートで続きを読む',
  },
  howM55Works: {
    heroTitleJa: 'M55の見方を知る',
    heroHookJa: '生まれた日から、自分が見える。',
    heroLeadJa:
      'M55は、生まれた日を暦の層で読み直し、\n自分を少し離れて見つめるための見取り図に変えます。',
    heroBridgeJa:
      'まずは、M55で自分がどう見えてくるのかを知る。\nそして、無料で見えた輪郭の先に、\nM55複合暦解析で何が深まるのかを見ていきます。',
    section01KickerJa: '01 — 生まれた日は、見つめ直すための入口',
    section01TitleJa: '生まれた日は、見つめ直すための入口',
    section01ParagraphsJa: [
      '自分を見つめ直すとき、\n変わらない手がかりになるのが、生まれた日です。',
      'M55は、生まれた日をただの日付で終わらせず、\n自分を見つめ直すための入口として扱います。',
      'ひとつの言葉で、あなたを決めつけない。\n生まれた日に重なる暦の層から、\n自分を見つめ直すための輪郭を描いていく。\nそれが、M55の見方です。',
      '生まれた日から見えるのは、\nあなたを固定する結論ではなく、\nいまの自分を見つめ直すための輪郭です。',
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
      'さらに、いくつかの見方を重ねて、\nいまの自分を見やすくしていきます。\n複数の暦の層を重ねるからこそ、\n「自分には、こういう輪郭があったのか」が、一般論ではなく自分ごとに見えてきます。',
    ] as const,
    section03LandingJa:
      'だからM55は、生まれた日から、\nまだ言葉になっていなかった自分の輪郭を、見える形にします。',
    section03FiveViewsLeadJa: '自分の輪郭を見ていく視点',
    section03FiveViewLabelsJa: [
      '近い人との距離',
      '感受性',
      '発想',
      '協調',
      '段取り',
    ] as const,
    section04KickerJa: '04 — 無料の見取り図とM55複合暦解析',
    section04TitleJa: '無料の見取り図とM55複合暦解析',
    section04FreeIntroJa: '無料で見えるのは、入口です。',
    section04FreeMapBodyJa:
      '無料の見取り図では、\n生まれた日を入口に、\nまず今の自分の輪郭を確認できます。',
    section04CompositeHookJa: '無料で見えた輪郭の先へ。',
    section04CompositeBodyJa:
      'M55複合暦解析は、\n無料で見えた輪郭に、さらに暦の層を重ねて、\nまだ言葉になっていなかった自分の本質を見ていく解析体験です。',
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
    section04ClosingJa: '気になったテーマは、\n追加解析でさらに深められます。',
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
      'M55は、未来を当てたり、運命を断定したりするものではありません。\n医療・法律・投資などの専門的な判断に代わるものでもありません。',
      '生まれた日を入口に、暦の層を重ね、\n自分を少し離れて見つめるための見取り図です。',
      '答えを代わりに決めるのではなく、\n今の自分を知るための視点を届けます。',
    ] as const,
    section06LandingJa:
      '自分の言葉で確かめながら、\n落ち着いて見つめ直せます。',
    section07KickerJa: '07 — 次のステップ',
    section07TitleJa: '次のステップ',
    nextLeadJa:
      'まずは、無料の見取り図で、\n自分の輪郭を確認してみてください。',
    nextSubJa: '生まれた日から、自分が見える。\nここから、M55を始められます。',
    nextFootJa:
      'M55複合暦解析では、\n無料の見取り図で見えた輪郭を、\nさらに深く見ていきます。',
    nextClosingJa:
      '気になったテーマは、\n追加解析で今の自分に合わせて深められます。',
    primaryCtaJa: '無料の見取り図を見る',
    secondaryCtaJa: 'M55複合暦解析を見る',
    backButtonJa: '前のページへ戻る',
  },
  metadata: {
    howM55WorksDescriptionJa:
      '生まれた日を暦の層で読み直し、自分を少し離れて見つめるための見取り図。旧暦・十干・二十四節気・節入りを重ねて、なぜ一人ずつ違って見えるのかを静かに説明します。',
  },
  cta: {
    openFreeMapJa: '無料で見てみる',
    viewFreeMapJa: '無料で見てみる',
    viewSavedPlansJa: 'プレミアムレポートを見る',
    /** Primary /core conversion CTA (Phase1). Same href as viewSavedPlans. */
    continueSavedReportJa: 'プレミアムレポートで続きを読む',
    viewSavedPlansHref: '/dtr/lp',
    homeHref: '/home',
    coreFreeHref: '/core',
    pairReadingHref: '/synastry',
  },
} as const;
