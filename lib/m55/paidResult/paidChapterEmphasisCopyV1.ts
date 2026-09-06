/**
 * selectors-v1 paid chapter emphasis → calm Japanese fragments (display only).
 * IDs are frozen; copy polish allowed within gate scope.
 *
 * PAID_CHAPTER_EMPHASIS_EXPLANATION_V1 — selector-bound substantive paragraphs (Q1.1).
 * Short consequence lines in COPY_V1 remain verbatim for answer-specific IDs.
 */

import type { PaidChapterEmphasisIdV1 } from '../individualization/individualizationSelectorTypesV1';

export const PAID_CHAPTER_EMPHASIS_EXPLANATION_V1: Readonly<
  Partial<Record<PaidChapterEmphasisIdV1, string>>
> = {
  paid_ch1__baseline_landscape:
    '生年月日から置かれる輪郭は、日々の気分では入れ替わりません。冒頭では、その輪郭を先に置き、あとから重ねる回答の意味がぶれないようにします。',
  paid_ch1__expression_mirror:
    '6問の回答は、いま表に出ている動き方の手がかりです。生年月日の輪郭と並べることで、「いつもそう」と「いまそう」が分かれて読めます。',
  paid_ch1__align_diverge_bridge:
    '重なる点は、いまの動きが素直に出ている場面です。ずれる点は、無理がかかっている場面の手がかりとして扱います。どちらか一方だけを正解とはしません。',
  paid_ch2__start_rhythm:
    '着手のリズムは、仕事の入口そのものです。先に全体を整えたい日と、短い往復から入りたい日では、同じ仕事量でも負荷の出方が変わります。',
  paid_ch2__decision_flow:
    '決め方の流れは、比較と区切りの順番に左右されます。比較が先に立つ日は材料が増え、区切りが先に立つ日は動きは早くても中で検討が残ることがあります。',
  paid_ch2__change_adaptation:
    '変化の前後では、様子を見る時間と微調整の時間の配分が分かれます。急いで形を変えるより、一度置いてから直すほうが戻りやすい場面もあります。',
  paid_ch2__work_focus_priority:
    '同時に頼まれる場面では、全部を等しく扱うより、先に「今日は後回しにする作業」を決めるほうが入口が整います。この型は、頼られ方が重なる日に特に効きます。逆に、後回しの線引きが曖昧なまま量だけ増えると、着手前の比較が長く残ります。',
  paid_ch2__work_focus_pace:
    '進め方のペースは、疲れのたまり方とセットで動きます。生活のリズムに合わせて区切ると、同じ仕事量でも余白が戻ります。一方、区切りが薄いまま続くと、ペースを保とうとして内側の検討だけが増えます。',
  paid_ch2__work_focus_boundary:
    '始める前に「今日はここまで」を自分の言葉で置くと、入口の幅が先に決まります。この一手は、頼まれが続く日の負荷を外側で整える役割を持ちます。境界がないまま進むと、終わりの見えない仕事が積み上がります。',
  paid_ch2__decision_friction_too_many:
    '候補が並ぶ場面では、比較そのものが仕事になります。一気に答えを出そうとすると、考える量が増え、判断がさらに重くなる流れに入ります。比較を先に終わらせるより、今日決める範囲を狭めるほうが戻りやすい日もあります。',
  paid_ch2__decision_friction_unclear_end:
    '終わりの見えない仕事は、着手後も区切りが残ります。一つ進めたらその日はそこで止める、という区切りは、終点のない仕事に対する手当てとして機能します。区切りがないまま続くと、進んでいるのに完了感が戻りません。',
  paid_ch2__decision_friction_fear_mistake:
    '失敗が気になる場面では、一度で決め切るより、見直せる小さな確認単位に分けたほうが次の一手が選べます。この型は慎重さを保ちながら前に進むための分け方です。確認単位が大きすぎると、また一括判断に戻ります。',
  paid_ch3__distance_posture:
    '距離の取り方は、関係の負荷を左右する入口です。近すぎると調整が増え、遠すぎると材料が足りなくなる、という両方の出方があります。',
  paid_ch3__decision_in_relation:
    '近い関係の中では、決め方の癖がそのまま負荷になります。相手のペースに合わせる日と、自分の区切りを先に置く日では、同じ話題でも残る疲れの形が変わります。',
  paid_ch3__recovery_connection:
    '関わりのあとにどれだけ休み、どう戻るかは、関係の続き方を決めます。休みが足りないまま次の会話に入ると、距離の戻し方が分からなくなることがあります。',
  paid_ch3__relation_focus_words:
    '言葉の場面では、正しさを先に整えるより、感じたことを一つ返すほうが関係の流れが軽くなります。これは相手を説得するためではなく、いま起きていることを共有するための一手です。正しさを急ぐ日は、返事が遅れて内側だけが忙しくなることがあります。',
  paid_ch3__relation_focus_timing:
    '言葉が詰まる場面では、結論の前に一つだけ返す順番が有効です。短い返答が先に出ると、相手は待たずに材料を受け取れます。結論だけを先に出すと、途中の温度差が残りやすくなります。',
  paid_ch3__relation_focus_recovery:
    '不快感を内部に溜めると、距離の戻し方が分からなくなります。関係の中で起きた違和感を外に出さない日は、表面上は穏やかでも、次の会話の入口が重くなります。小さな違和感を一つ言葉にしたほうが、戻りの線が見えやすくなります。',
  paid_ch4__recovery_pace:
    '休む間と動く間の配分は、一日の終わり方を決めます。動く間が長く続く日は、休みを先に確保したほうが翌日の入口が整います。',
  paid_ch4__change_life_load:
    '変化が続く時期は、日常の区切りが薄くなります。区切りを外側に置くと、変化の中でも戻る場所が残ります。',
  paid_ch4__distance_boundary:
    '距離の線引きと疲れのサインは、同じ流れの中で出ます。線引きが曖昧なまま進むと、疲れが「我慢」に変わります。',
  paid_ch4__strain_life_context:
    'いまの生活文脈では、負荷の手がかりが特定の場面に偏ります。その手がかりを先に言葉にすると、戻し方の選択肢が増えます。',
  paid_ch4__fatigue_signal_after_push:
    '無理をして押し切ったあとは、余白が戻るまで動きが重くなります。押し切る前に一度止まるほうが、同じ仕事量でも翌日の入口が整います。余白が戻る前に次を積むと、疲れが「続けられない日」として表に出ます。',
  paid_ch4__fatigue_signal_before_start:
    '着手の前に重さが先に立つ日は、始め方のリズムそのものが負荷になっています。入口を小さくする、比較を後ろに回す、どちらかを先に置くと動きが戻ります。入口を変えずに量だけ増やすと、始める前から一日が埋まります。',
  paid_ch4__fatigue_signal_long_stretch:
    '休めない続きや切り替えの多さは、崩れやすい条件として先に置く価値があります。条件が見えていると、「今日は区切りを増やす」という戻し方を選べます。条件を見ないまま続けると、原因が自分の意志のように感じられます。',
  paid_ch4__recovery_sequence_pause_first:
    '今日決めなくていいことを一つ横に置き、休める時間を先に作ると、戻る場所が見えます。決めごとを減らす一手は、回復の入口として機能します。休みの前に決めごとを増やすと、休んでいるのに頭が動き続けます。',
  paid_ch4__recovery_sequence_small_start:
    '小さな手ごたえが見えると、動きを戻す単位が小さくなります。大きな成果を待つより、短い完了を一つ置くほうが続きやすい日があります。完了が遠いままだと、再開の入口自体が重くなります。',
  paid_ch4__recovery_sequence_sort_materials:
    '迷いが出る場面では、比較と区切りを先に置くと戻りやすくなります。材料を並べ直す時間は、動きを止めるためではなく、次の一手の幅を狭めるための時間です。並べずに進むと、同じ比較が作業の途中に何度も戻ります。',
  paid_ch4__restart_condition_overview_first:
    '急かされる場面や見通しの立ちにくさでは、論点を一本化したほうが判断へ戻れます。全体の図を一度置くと、今日決める範囲と後回しにする範囲が分かれます。図がないまま細部だけ動くと、進んだのに迷いが残ります。',
  paid_ch4__restart_condition_shrink_scope:
    '確かめたい点を一つに絞り、今日決める範囲を小さくすると、判断の入口が戻ります。範囲を狭める一手は、失敗への恐れが強い日にも使えます。範囲が広いままだと、比較だけが増えて再開が遅れます。',
  paid_ch4__restart_condition_trusted_support:
    '信頼できる相手に一度話すと、回復とつながりのバランスが整います。相談は依存ではなく、戻りの材料を増やす一手として扱えます。一人で抱え続けると、つながりはあるのに距離だけが開きます。',
};

export const PAID_CHAPTER_EMPHASIS_COPY_V1: Readonly<
  Record<PaidChapterEmphasisIdV1, string>
> = {
  paid_ch1__baseline_landscape:
    '生年月日から見える、比較的変わりにくい自分の出方の輪郭を、冒頭に置きます。',
  paid_ch1__expression_mirror:
    '6問の回答から見える、いま表に出やすい動き方を、次に重ねます。',
  paid_ch1__align_diverge_bridge:
    '生年月日の基調と今の回答が重なる点と、少しずれる点を分けて示します。',
  paid_ch2__start_rhythm:
    '着手のリズムと、動き始めの条件を先に扱います。',
  paid_ch2__decision_flow:
    '迷いが出る場面では、比較と区切りの順番が負荷に影を落とします。',
  paid_ch2__change_adaptation:
    '変化の前後で、様子を見るか早めに微調整するかの差が出やすいです。',
  paid_ch3__distance_posture:
    '人との距離の取り方が、関係の負荷にどうつながるかを扱います。',
  paid_ch3__decision_in_relation:
    '近い関係の中での決め方の癖を、負荷の出方として扱います。',
  paid_ch3__recovery_connection:
    '関わりのあと、どれくらい休み、どう戻るかのバランスを扱います。',
  paid_ch4__recovery_pace:
    '休む間と動く間の取り方が、一日の負荷の残り方を左右します。',
  paid_ch4__change_life_load:
    '変化が続くときの負荷の出方を、日常の区切りとして扱います。',
  paid_ch4__distance_boundary:
    '距離の線引きと、疲れのサインを一緒に意識すると整えやすくなります。',
  paid_ch4__strain_life_context:
    'いまの生活文脈で出やすい負荷の手がかりを、戻し方につなげます。',
  paid_ch2__work_focus_priority:
    '同時に頼まれた日は、こなす量を増やさず、後回しにする作業を先に決める。',
  paid_ch2__work_focus_pace:
    '疲れがたまりやすい条件と、戻しやすいペースを生活のリズムに結びます。',
  paid_ch2__work_focus_boundary:
    '始める前に「今日はここまで」と自分の言葉で決める。',
  paid_ch2__decision_friction_too_many:
    '一気に答えを出そうとすると、考えることが増え、判断がさらに重くなりやすくなります。',
  paid_ch2__decision_friction_unclear_end:
    '一つ進めたら、その日はそこで区切る。',
  paid_ch2__decision_friction_fear_mistake:
    '失敗が気になるときは、一度で決め切ろうとせず、\n見直せる小さな確認単位に分けると、\n次の一手を選びやすくなります。',
  paid_ch3__relation_focus_words:
    '正しさを急ぐより、感じたことを一つ返すほうが扱いやすいです。',
  paid_ch3__relation_focus_timing:
    '次に言葉が詰まったとき、結論の前に一つだけ返すところから試せます。',
  paid_ch3__relation_focus_recovery:
    '不快感を内部に溜めると、距離の戻し方が分からなくなる。',
  paid_ch4__fatigue_signal_after_push:
    '無理をして押し切るより、余白が戻るほど動きやすくなる形です。',
  paid_ch4__fatigue_signal_before_start:
    '始め方のリズムを意識すると、着手の負荷が整いやすくなります。',
  paid_ch4__fatigue_signal_long_stretch:
    '休めない続きや切り替えの多さなど、崩れやすい条件を先に見える化する。',
  paid_ch4__recovery_sequence_pause_first:
    '今日決めなくていいことを一つ横に置き、休める時間を先に作ると、戻る場所が見えやすくなります。',
  paid_ch4__recovery_sequence_small_start:
    '小さな手ごたえが見えると、少しずつ動きを戻しやすいです。',
  paid_ch4__recovery_sequence_sort_materials:
    '迷いが出やすい場面では、比較と区切りを先に置くと戻りやすくなります。',
  paid_ch4__restart_condition_overview_first:
    '急かされる場面や見通しの立ちにくさのなかで、論点を一本化しやすくする。',
  paid_ch4__restart_condition_shrink_scope:
    '確かめたい点を一つに絞り、今日決める範囲を小さくすると判断へ戻りやすくなります。',
  paid_ch4__restart_condition_trusted_support:
    '回復の仕方と、つながり方のバランスを一緒に見ます。',
};
