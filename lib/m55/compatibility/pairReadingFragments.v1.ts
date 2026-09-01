/**
 * Pair reading static fragments (copy-freeze directions).
 * Safe, non-advisory, everyday Japanese. No raw DOB / scores.
 */

import type {
  CompatibilityFreeResultFragments,
  CompatibilityImmediateActionFragment,
  PaidTopicId,
  PairAxisId,
  RelationStatusId,
  TemperatureId,
} from './pairReadingTypes';
import { CH_ABOUT_DISCLAIMER, getAxisLabel, getTopicLabel } from './pairReadingCatalog.v1';
import {
  auditPairReadingText,
  countFullWidthChars,
  countSentencesJa,
  findTeaserDeepeningLeakage,
  textsAreNearDuplicates,
} from './pairReadingSafetyAudit';

export type GuestFreeTeaserValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export const PAIR_READING_FRAGMENT_SET_VERSION = 'pair_fragments_v1' as const;

export const PAIR_AXIS_TEASER_OPENERS: Readonly<Record<PairAxisId, string>> = {
  A1: 'この2人は、気持ちの強さよりも、近づくペースの違いが見えやすい組み合わせです。',
  A2: 'この2人は、気持ちの強さよりも、反応の出方の違いが見えやすい組み合わせです。',
  A3: 'この2人は、好き嫌いよりも、安心するまでの時間差としてすれ違いが見えやすい組み合わせです。',
  A4: 'この2人は、特別な言葉よりも、接点や入口の作り方の違いが見えやすい組み合わせです。',
};

export const TOPIC_TEASER_BRIDGES: Readonly<Record<PaidTopicId, string>> = {
  T1: '今の視点「2人の距離が縮まりやすい入口」では、近づき方の間合いが手がかりになります。',
  T2: '今の視点「すれ違いやすい場面」では、正しさより安心までの間合いが手がかりになります。',
  T3: '今の視点「連絡や会話のペース差」では、速さより会話の温度の続き方が手がかりになります。',
  T4: '今の視点「相手が反応しやすい場面」では、反応の有無より場面の作り方が手がかりになります。',
  T5: '今の視点「気持ちを伝える前に見る距離の温度差」では、伝える前の距離の温度が手がかりになります。',
};

const R1_TOPIC_TEASER_BRIDGES: Readonly<Record<PaidTopicId, string>> = {
  T1: '今の視点「近づき方の入口」では、まだ会話がない状態での間合いの見え方が手がかりになります。',
  T2: '今の視点「気持ちの整え方」では、まだ会話がない状態での安心の取り方の違いが手がかりになります。',
  T3: '今の視点「言葉の出方の違い」では、まだ会話がない状態での読み取りのずれが手がかりになります。',
  T4: '今の視点「反応の見えなさ」では、まだ会話がない状態での読み取りのずれが手がかりになります。',
  T5: '今の視点「距離の温度差」では、まだ会話がない状態での距離の見え方が手がかりになります。',
};

export const PAIR_AXIS_GAP_BODIES: Readonly<Record<PairAxisId, string>> = {
  A1: [
    '2人の距離に出やすいズレは、まず近づくペースの差として見えやすいです。',
    '一方が先に間合いを詰め、もう一方が整うまで待つ、という差が重なると、熱量の話より先に距離の話になります。',
    'ここでの手がかりは、正しさの判定ではなく、急ぎ方と待ち方の型を並べて見ることです。',
  ].join('\n\n'),
  A2: [
    '2人の距離に出やすいズレは、反応の出方の差として見えやすいです。',
    '同じ出来事でも、言葉ですぐ返す側と、返す前に間を取る側では、受け取った温度が違って見えやすいです。',
    'ここでの手がかりは、反応の有無を断定することではなく、出方の型の違いを整理することです。',
  ].join('\n\n'),
  A3: [
    '2人の距離に出やすいズレは、受け止め方の時間差として見えやすいです。',
    '同じ話題でも、理由を先に説明する側と、短い合図で安心したい側では、会話の続き方が違って見えやすいです。',
    'ここでの手がかりは、どちらが正しいかの断定ではなく、安心するまでの返事の速さの差を見ることです。',
  ].join('\n\n'),
  A4: [
    '2人の距離に出やすいズレは、会話の始め方の差として見えやすいです。',
    '本題から入りたい側と、短いやり取りから入りたい側では、最初の返事の置き方が違って見えやすいです。',
    'ここでの手がかりは、大きな決断ではなく、誰が先に話題を出すかと、返事までの間の取り方を見ることです。',
  ].join('\n\n'),
};

export const TOPIC_DEEP_BODIES: Readonly<Record<PaidTopicId, string>> = {
  T1: [
    '距離が縮まりやすい入口は、特別な宣言より、近づき方の速さや間合いに出やすいです。',
    '入口が合うときは、小さな接点が続きやすく、急ぎすぎると温度の出し方にズレが出やすいです。',
    '深掘りの一点は、「近づけるかどうか」の断定ではなく、縮まりやすい入口の型を見ることです。',
  ].join('\n\n'),
  T2: [
    'すれ違いやすい場面は、正しさの争点より、安心するまでの時間差として出やすいです。',
    '受け止めのペースが違うと、同じ話題でも温度の残り方が違って見えやすいです。',
    '深掘りの一点は、終わりの断定ではなく、長引きやすいズレの型を整理することです。',
  ].join('\n\n'),
  T3: [
    '連絡や会話のペース差は、返信の速さそのものより、会話の温度の続き方に出やすいです。',
    '頻度の感じ方が違うと、同じ連絡量でも距離の見え方が変わりやすいです。',
    '深掘りの一点は、追う・待つ指示ではなく、ペース差が距離に見える瞬間を見ることです。',
  ].join('\n\n'),
  T4: [
    '反応しやすい場面は、好意の断定より、場面の作り方で出やすいです。',
    '出やすい場面と出にくい場面の差が見えると、反応の温度の読み違いが減りやすいです。',
    '深掘りの一点は、気持ちの断定ではなく、反応の出方と場面の噛み合いを整理することです。',
  ].join('\n\n'),
  T5: [
    '気持ちを伝える前に見えやすいのは、勇気の有無より、今の距離の温度差です。',
    '急ぎやすい側と、整うまで待ちやすい側では、同じタイミングでも見え方が違います。',
    '深掘りの一点は、伝えるべき断定ではなく、伝える前に見える距離の温度を見ることです。',
  ].join('\n\n'),
};

export const STATUS_EMPHASIS: Readonly<
  Record<RelationStatusId, { deepAdd: string; clueAdd: string }>
> = {
  R1: {
    deepAdd:
      '片思いの現在地では、反応の見え方と温度差が厚く出やすいです。好きかどうかの断定はしません。',
    clueAdd: '反応の有無より、反応の温度を見る向きです。',
  },
  R2: {
    deepAdd:
      '連絡を取っている現在地では、ペース差と反応場面が厚く出やすいです。返信時期の予測はしません。',
    clueAdd: '速さより、返ってきた時の間合いを見る向きです。',
  },
  R3: {
    deepAdd:
      '付き合っている現在地では、近さの中のすれ違いや生活リズムの芽が厚く出やすいです。別れる断定はしません。',
    clueAdd: '近さの中の小さなズレを見る向きです。',
  },
  R4: {
    deepAdd:
      '距離ができている現在地では、距離の入口とズレの型が厚く出やすいです。終わりの断定はしません。',
    clueAdd: '遠さの理由探しより、距離の型を見る向きです。',
  },
  R5: {
    deepAdd:
      '以前は近かったがいま離れている状態では、間合いの見え方と言葉の出方の違いが厚く出やすいです。結果の保証はしません。',
    clueAdd: 'いまの距離の見え方を先に見る向きです。',
  },
  R6: {
    deepAdd:
      '長く一緒にいることを考えている現在地では、生活ペースの差が厚く出やすいです。将来の保証はしません。',
    clueAdd: '特別な日より、日常のリズム差を見る向きです。',
  },
};

export const TEMPERATURE_CLUE_MOD: Readonly<Record<TemperatureId, string>> = {
  E0: '',
  E1: '少し気になっている温度感なら、観察は軽く、一点だけに絞ると整いやすいです。',
  E2: '連絡や反応が気になる温度感なら、速さより温度と間合いを先に見ると整いやすいです。',
  E3: '距離の取り方に迷う温度感なら、詰め方の指示ではなく、距離の見え方を先に見ると整いやすいです。',
  E4: '一度距離ができている温度感なら、終わりの断定ではなく、いまの距離の型を先に見ると整いやすいです。',
  E5: 'これからを真剣に考えている温度感でも、急がず、今の温度差を一点だけ見ると整いやすいです。',
};

const R1_TEMPERATURE_CLUE_MOD: Readonly<Record<TemperatureId, string>> = {
  E0: '',
  E1: '少し気になっている温度感なら、まだ会話がない状態でも一点だけに絞ると見えやすいです。',
  E2: '気持ちの言葉の出方が気になる温度感なら、反応の有無より自分の中の温度を先に見ると見えやすいです。',
  E3: '近づくかどうか迷う温度感なら、結論より今の迷いの見え方を先に見ると見えやすいです。',
  E4: '静けさが気になる温度感なら、拒否の断定ではなく、距離の見え方を先に見ると見えやすいです。',
  E5: 'これからを考え始めている温度感でも、急がず、今の温度差を一点だけ見ると見えやすいです。',
};

export const TOPIC_CLUE_CORE: Readonly<Record<PaidTopicId, string>> = {
  T1: '今日見るなら、特別な言葉ではなく、近づき方の間合いです。',
  T2: '今日見るなら、正しさの勝ち負けではなく、安心するまでの間合いです。',
  T3: '今日見るなら、返事の速さではなく、返ってきた時の温度です。',
  T4: '今日見るなら、反応の有無ではなく、反応の温度です。',
  T5: '今日見るなら、勇気の有無ではなく、今の距離の温度です。',
};

type CompatibilityFreeAxisAuthority = {
  semanticKeys: CompatibilityFreeResultFragments['semanticKeys'];
  overlap: string;
  difference: string;
  perspectiveOne: string;
  perspectiveTwo: string;
  dynamicOutcome: string;
};

/**
 * Guest-free relationship-map authority.
 * Perspective one/two are assigned canonically, so reversing A/B only swaps
 * the visible person perspectives and never changes relationship semantics.
 */
export const PAIR_AXIS_FREE_RESULT_FRAGMENTS: Readonly<
  Record<PairAxisId, CompatibilityFreeAxisAuthority>
> = {
  A1: {
    semanticKeys: {
      overlap: 'free_overlap_shared_forecast',
      difference: 'free_difference_decision_pace',
      relationshipDynamic: 'free_dynamic_early_reply_and_settling_time',
    },
    overlap:
      '二人とも、予定や返事の見通しが一つあると、次の動きを選びやすいところが重なります。',
    difference:
      'その場で輪郭を決めたいときと、自分の中で整えてから返したいときに、進め方の違いが表れやすいです。',
    perspectiveOne:
      '予定の輪郭が先に見えると動きやすく、返事も早めに置きやすい',
    perspectiveTwo:
      '自分の中で予定を整えてから、返事を置きやすい',
    dynamicOutcome:
      '返事を待つ時間の意味がずれ、急いでいるようにも、関心が薄いようにも受け取りやすくなります',
  },
  A2: {
    semanticKeys: {
      overlap: 'free_overlap_received_signal',
      difference: 'free_difference_response_visibility',
      relationshipDynamic: 'free_dynamic_visible_and_quiet_response',
    },
    overlap:
      '二人とも、受け取ったことが分かる小さな合図があると、会話を続けやすいところが重なります。',
    difference:
      '反応をすぐ言葉にする場面と、考えている間は表に出さない場面で、受け取り方の違いが表れやすいです。',
    perspectiveOne:
      '受け取った反応を、その場で言葉や表情に出しながら整理しやすい',
    perspectiveTwo:
      '受け取った内容を内側で整えてから、反応を出しやすい',
    dynamicOutcome:
      '見える反応の量だけで温度を判断し、届いていないようにも、急かされているようにも受け取りやすくなります',
  },
  A3: {
    semanticKeys: {
      overlap: 'free_overlap_received_before_discussion',
      difference: 'free_difference_reassurance_timing',
      relationshipDynamic: 'free_dynamic_explanation_and_reassurance',
    },
    overlap:
      '二人とも、意見が違うときも、まず受け取られたと分かると、話を続けやすいところが重なります。',
    difference:
      '理由を先に説明したい場面と、安心できる合図を先に受け取りたい場面で、順序の違いが表れやすいです。',
    perspectiveOne:
      '違いが出たとき、理由を順に説明することで整理しやすい',
    perspectiveTwo:
      '違いが出たとき、受け止められた合図があると整理しやすい',
    dynamicOutcome:
      '説明を重ねるほど安心の確認が後ろに回り、話の中身より受け止め方のずれが残りやすくなります',
  },
  A4: {
    semanticKeys: {
      overlap: 'free_overlap_small_entry',
      difference: 'free_difference_conversation_entry',
      relationshipDynamic: 'free_dynamic_direct_and_gradual_entry',
    },
    overlap:
      '二人とも、短く自然なきっかけがあると、無理なく会話を始めやすいところが重なります。',
    difference:
      '本題から入りたい場面と、前置きや日常の話から入りたい場面で、会話の入口の違いが表れやすいです。',
    perspectiveOne:
      '話したい内容が決まると、本題から会話を始めやすい',
    perspectiveTwo:
      '日常の短いやり取りを重ねてから、本題へ入りやすい',
    dynamicOutcome:
      '入口が合わないまま内容を進め、唐突なようにも、話を避けているようにも受け取りやすくなります',
  },
};

export const TOPIC_IMMEDIATE_ACTIONS: Readonly<
  Record<PaidTopicId, CompatibilityImmediateActionFragment>
> = {
  T1: {
    situation: '次に二人で会う予定や連絡のきっかけを決めるとき',
    action: '返事をする時間を一つ決めてみてください。',
  },
  T2: {
    situation: '次に意見が分かれたとき',
    action: '相手の意図を一文で確認してみてください。',
  },
  T3: {
    situation: '次に返事を待つ場面ができたとき',
    action: '返事が必要な時間を一つ決めてみてください。',
  },
  T4: {
    situation: '次に相手の反応が分かりにくいと感じたとき',
    action: '反応が出た場面を一行だけ記録してみてください。',
  },
  T5: {
    situation: '次に大切な話を始めるとき',
    action: '話し始める時間を一つ決めてみてください。',
  },
};

const R1_TOPIC_IMMEDIATE_OBSERVATIONS: Readonly<
  Record<PaidTopicId, CompatibilityImmediateActionFragment>
> = {
  T1: {
    situation: 'まだ会話がない状態で、近づき方の入口の違いが見えやすい場面',
    action: '入口の作り方の差が、読み取りのずれとして見えやすいことがあります。',
  },
  T2: {
    situation: 'まだ会話がない状態で、安心の取り方の違いが見えやすい場面',
    action: '整える速さの差が、読み取りのずれとして見えやすいことがあります。',
  },
  T3: {
    situation: 'まだ会話がない状態で、気持ちの言葉の出方の違いが見えやすい場面',
    action: '言葉の出方の差が、読み取りのずれとして見えやすいことがあります。',
  },
  T4: {
    situation: 'まだ会話がない状態で、相手の反応の見えなさが気になりやすい場面',
    action: '反応の見えなさが、読み取りのずれとして見えやすいことがあります。',
  },
  T5: {
    situation: 'まだ会話がない状態で、距離の温度差が見えやすい場面',
    action: '距離の見え方の差が、読み取りのずれとして見えやすいことがあります。',
  },
};

const V2_FREE_TOPIC_OBSERVATIONS: Readonly<
  Record<RelationStatusId, Record<PaidTopicId, CompatibilityImmediateActionFragment>>
> = {
  R1: R1_TOPIC_IMMEDIATE_OBSERVATIONS,
  R2: {
    T1: {
      situation: 'やり取りのリズムを整える場面で、近づき方の入口の違いが見えやすいとき',
      action: '入口の作り方の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T2: {
      situation: '言葉の置き方がずれてきた場面で、安心の取り方の違いが見えやすいとき',
      action: '受け取り方の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T3: {
      situation: 'やり取りの速さがずれて見える場面',
      action: '反応の見え方の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T4: {
      situation: '反応がまだ見えにくい場面',
      action: '反応の量だけを手がかりにすると、読み取りのずれが起きやすいことがあります。',
    },
    T5: {
      situation: '間合いを感じる場面',
      action: '距離の見え方の差が、読み取りのずれとして見えやすいことがあります。',
    },
  },
  R3: {
    T1: {
      situation: '近づき方の入口がずれて見える場面',
      action: '入口の作り方の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T2: {
      situation: '意見が分かれ、受け止め方の順序がずれて見える場面',
      action: '安心の確認の順序の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T3: {
      situation: '決める速さと言葉の出方がずれて見える場面',
      action: '速さの差が、読み取りのずれとして見えやすいことがあります。',
    },
    T4: {
      situation: '反応の見え方が分かれて見える場面',
      action: '反応の量だけを手がかりにすると、読み取りのずれが起きやすいことがあります。',
    },
    T5: {
      situation: '距離の温度差がずれて見える場面',
      action: '距離の見え方の差が、読み取りのずれとして見えやすいことがあります。',
    },
  },
  R4: {
    T1: {
      situation: '距離がある中で、近づき方の入口の違いが見えやすい場面',
      action: '間合いの見え方の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T2: {
      situation: '距離がある中で、受け止め方の順序がずれて見える場面',
      action: '静けさの意味の見え方の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T3: {
      situation: '距離がある中で、言葉の出方の違いが見えやすい場面',
      action: '言葉の出方の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T4: {
      situation: '距離がある中で、反応の見え方が分かれて見える場面',
      action: '反応の量だけを手がかりにすると、読み取りのずれが起きやすいことがあります。',
    },
    T5: {
      situation: '距離がある中で、間合いの温度差が見えやすい場面',
      action: '距離の見え方の差が、読み取りのずれとして見えやすいことがあります。',
    },
  },
  R5: {
    T1: {
      situation: '以前は近かったがいま離れている状態では、入口の作り方の違いが見えやすい場面',
      action: '近づき方の入口の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T2: {
      situation: '以前は近かったがいま離れている状態では、受け止め方の順序がずれて見えるとき',
      action: '整える順序の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T3: {
      situation: '以前は近かったがいま離れている状態では、言葉の出方の違いが見えやすいとき',
      action: '言葉の出方の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T4: {
      situation: '以前は近かったがいま離れている状態では、反応の見え方が分かれて見えるとき',
      action: '相手の気持ちを決めつけずに読むと、読み取りのずれが小さく見えることがあります。',
    },
    T5: {
      situation: '以前は近かったがいま離れている状態では、間合いの温度差が見えやすい場面',
      action: '間合いの見え方の差が、読み取りのずれとして見えやすいことがあります。',
    },
  },
  R6: {
    T1: {
      situation: '日常のリズムの中で、近づき方の入口の違いが見えやすい場面',
      action: '入口の作り方の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T2: {
      situation: '日常の中で、受け止め方の順序がずれて見える場面',
      action: '安心の確認の順序の差が、読み取りのずれとして見えやすいことがあります。',
    },
    T3: {
      situation: '日常の中で、決める速さと言葉の出方がずれて見える場面',
      action: '速さの差が、読み取りのずれとして見えやすいことがあります。',
    },
    T4: {
      situation: '日常の中で、反応の見え方が分かれて見える場面',
      action: '反応の量だけを手がかりにすると、読み取りのずれが起きやすいことがあります。',
    },
    T5: {
      situation: '日常の中で、距離の温度差がずれて見える場面',
      action: '距離の見え方の差が、読み取りのずれとして見えやすいことがあります。',
    },
  },
};

const R1_PARTNER_FREE_UNCERTAINTY =
  'まだ反応材料が少ないため、こちらからは意味を決めにくい状態です';

const R1_FREE_RESULT_FRAGMENTS: Readonly<
  Record<PairAxisId, CompatibilityFreeAxisAuthority>
> = {
  A1: {
    semanticKeys: PAIR_AXIS_FREE_RESULT_FRAGMENTS.A1.semanticKeys,
    overlap:
      'まだ会話がない状態でも、気持ちの言葉の出方や近づく前の迷いが見えやすいところが重なります。',
    difference:
      'その場で輪郭を決めたいときと、自分の中で整えてから動きたいときに、進め方の違いが表れやすいです。',
    perspectiveOne: '気持ちの輪郭を先に言葉へ置こうとする動きが見えやすい',
    perspectiveTwo: '自分の中で整えてから動きを選びたい状態に見えやすい',
    dynamicOutcome:
      '相手の反応が見えないまま、自分の中だけで意味を置きやすく、読み取りのずれが先に立ちやすい',
  },
  A2: {
    semanticKeys: PAIR_AXIS_FREE_RESULT_FRAGMENTS.A2.semanticKeys,
    overlap:
      'まだ会話がない状態でも、気持ちの言葉の出方の違いが見えやすいところが重なります。',
    difference:
      '気持ちが先に言葉になりやすい傾向と、整えてから動きやすい傾向の差が表れやすいです。',
    perspectiveOne: '気持ちを先に言葉へ置こうとする動きが見えやすい',
    perspectiveTwo: '言葉が整うまで動きを控えたい状態に見えやすい',
    dynamicOutcome:
      '相手の反応が見えないまま、自分の中だけで意味を置きやすく、読み取りのずれが先に立ちやすい',
  },
  A3: {
    semanticKeys: PAIR_AXIS_FREE_RESULT_FRAGMENTS.A3.semanticKeys,
    overlap:
      'まだ会話がない状態でも、気持ちの整理の仕方に近いリズムが見えやすいところが重なります。',
    difference:
      '理由を先に整理したいときと、感覚を先に言葉にしたいときに、順序の違いが表れやすいです。',
    perspectiveOne: '気持ちの順序を先に整えようとする動きが見えやすい',
    perspectiveTwo: '感覚が整うまで動きを控えたい状態に見えやすい',
    dynamicOutcome:
      '相手の反応が見えないまま、自分の中だけで意味を置きやすく、読み取りのずれが先に立ちやすい',
  },
  A4: {
    semanticKeys: PAIR_AXIS_FREE_RESULT_FRAGMENTS.A4.semanticKeys,
    overlap:
      'まだ会話がない状態でも、近づき方の入口を探す動きが見えやすいところが重なります。',
    difference:
      '短い一文から始めたいときと、整えてから動きたいときに、入口の作り方の違いが表れやすいです。',
    perspectiveOne: '短い入口から動きを考え始めやすい',
    perspectiveTwo: '入口の形を整えてから動きを選びたい状態に見えやすい',
    dynamicOutcome:
      '相手の反応が見えないまま、自分の中だけで意味を置きやすく、読み取りのずれが先に立ちやすい',
  },
};

export function buildCompatibilityFreeResultFragments(args: {
  pairAxisId: PairAxisId;
  paidTopicId: PaidTopicId;
  personAUsesFirstPerspective: boolean;
  relationStatusId?: RelationStatusId;
  recognitionOnly?: boolean;
}): CompatibilityFreeResultFragments {
  const axis =
    args.relationStatusId === 'R1'
      ? R1_FREE_RESULT_FRAGMENTS[args.pairAxisId]
      : PAIR_AXIS_FREE_RESULT_FRAGMENTS[args.pairAxisId];
  const personA = args.personAUsesFirstPerspective
    ? axis.perspectiveOne
    : axis.perspectiveTwo;
  const personB =
    args.relationStatusId === 'R1'
      ? R1_PARTNER_FREE_UNCERTAINTY
      : args.personAUsesFirstPerspective
        ? axis.perspectiveTwo
        : axis.perspectiveOne;
  const immediateAction =
    args.recognitionOnly && args.relationStatusId
      ? V2_FREE_TOPIC_OBSERVATIONS[args.relationStatusId][args.paidTopicId]
      : args.relationStatusId === 'R1'
        ? R1_TOPIC_IMMEDIATE_OBSERVATIONS[args.paidTopicId]
        : TOPIC_IMMEDIATE_ACTIONS[args.paidTopicId];

  return {
    semanticKeys: axis.semanticKeys,
    overlap: axis.overlap,
    difference: axis.difference,
    perspectives: { personA, personB },
    relationshipDynamic:
      args.relationStatusId === 'R1'
        ? `あなた側は、${personA}傾向があります。相手側については、${R1_PARTNER_FREE_UNCERTAINTY}。そのため二人の間では、${axis.dynamicOutcome}。`
        : `あなた側は、${personA}傾向があります。相手側は、${personB}傾向があります。そのため二人の間では、${axis.dynamicOutcome}。`,
    immediateAction,
  };
}

export const PERSON_A_BODY =
  [
    'あなた側は、反応やペースが「間合いの取り方」として出やすい傾向があります。',
    '強さの話というより、安心するまでの時間や、先に動く／整えてから動く、の差として見えやすいです。',
    'ここでの自己理解は、良し悪しの断定ではなく、自分側に出やすい動き方を一つ見つけることです。',
  ].join('\n\n');

export const PERSON_B_BODY =
  [
    'お相手側は、反応の出方が「言葉ですぐ返す／返す前に間を取る」の差として見えやすい傾向があります。',
    '好き嫌いの判定ではなく、同じ場面でも返事の出方が違って見えやすい、という整理です。',
    'ここでの手がかりは、お相手の気持ちを断定することではなく、返事の出方の違いを一つ見つけることです。',
  ].join('\n\n');

export function buildTeaserText(args: {
  pairAxisId: PairAxisId;
  paidTopicId: PaidTopicId;
  safetyShortText: string;
  ctaText: string;
  relationStatusId?: RelationStatusId;
}): string {
  const s1 = PAIR_AXIS_TEASER_OPENERS[args.pairAxisId];
  const s2 =
    args.relationStatusId === 'R1'
      ? R1_TOPIC_TEASER_BRIDGES[args.paidTopicId]
      : TOPIC_TEASER_BRIDGES[args.paidTopicId];
  // Single sentence: safety short + CTA (must keep total teaser at exactly 3 sentences).
  const safetyCore = args.safetyShortText.replace(/。\s*$/u, '');
  const s3 = `${safetyCore}が、${args.ctaText}で開けます。`;
  return `${s1}${s2}${s3}`;
}

export function validateGuestFreeTeaser(args: {
  teaserText: string;
  ctaText: string;
  dobs: readonly [string, string];
  paidChapterBodies?: readonly string[];
}): GuestFreeTeaserValidationResult {
  // Renderer-equivalent: validate RAW teaser text (pairReadingRenderer.ts — no trim).
  const teaserText = args.teaserText;
  if (teaserText.length === 0) {
    return { ok: false, code: 'teaser_empty', message: 'teaser is empty' };
  }
  const sentences = countSentencesJa(teaserText);
  if (sentences !== 3) {
    return {
      ok: false,
      code: 'teaser_sentence_count',
      message: `expected 3 sentences, got ${sentences}`,
    };
  }
  const len = countFullWidthChars(teaserText);
  if (len < 120 || len > 220) {
    return {
      ok: false,
      code: 'teaser_length',
      message: `teaser length ${len} out of 120-220`,
    };
  }
  const leak = findTeaserDeepeningLeakage(teaserText);
  const audit = auditPairReadingText(teaserText, { dobs: args.dobs });
  if (leak.length > 0 || !audit.ok) {
    return {
      ok: false,
      code: 'teaser_unsafe',
      message: [...leak, ...audit.hits].join(','),
    };
  }
  for (const body of args.paidChapterBodies ?? []) {
    if (textsAreNearDuplicates(teaserText, body)) {
      return { ok: false, code: 'teaser_paid_duplicate', message: 'near duplicate paid chapter' };
    }
  }
  const ctaCore = args.ctaText.replace(/[。！？]$/u, '');
  if (teaserText.split(ctaCore).length > 2) {
    return { ok: false, code: 'teaser_cta_duplicate', message: 'duplicate cta' };
  }
  return { ok: true };
}

export function buildTodayClueBody(args: {
  paidTopicId: PaidTopicId;
  relationStatusId: RelationStatusId;
  temperatureId: TemperatureId;
}): string {
  const core = TOPIC_CLUE_CORE[args.paidTopicId];
  const status = STATUS_EMPHASIS[args.relationStatusId].clueAdd;
  const temp =
    args.relationStatusId === 'R1'
      ? R1_TEMPERATURE_CLUE_MOD[args.temperatureId]
      : TEMPERATURE_CLUE_MOD[args.temperatureId];
  return [core, status, temp].filter(Boolean).join('\n\n');
}

export function buildTopicDeepBody(args: {
  paidTopicId: PaidTopicId;
  relationStatusId: RelationStatusId;
}): string {
  return [
    TOPIC_DEEP_BODIES[args.paidTopicId],
    STATUS_EMPHASIS[args.relationStatusId].deepAdd,
  ].join('\n\n');
}

export function buildPairGapBody(pairAxisId: PairAxisId): string {
  return PAIR_AXIS_GAP_BODIES[pairAxisId];
}

export function getAboutBody(): string {
  return CH_ABOUT_DISCLAIMER;
}

/** Required everyday terms for quality heuristics (at least one family). */
export const DAILY_LANGUAGE_TERMS = [
  '距離',
  '反応',
  'ペース',
  'ズレ',
  '間合い',
  '入口',
  '温度',
  '手がかり',
] as const;

export function axisTopicHint(pairAxisId: PairAxisId, paidTopicId: PaidTopicId): string {
  return `${getAxisLabel(pairAxisId)} / ${getTopicLabel(paidTopicId)}`;
}
