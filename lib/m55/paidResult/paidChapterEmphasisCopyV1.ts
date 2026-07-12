/**
 * selectors-v1 paid chapter emphasis → calm Japanese fragments (display only).
 * IDs are frozen; copy polish allowed within gate scope.
 */

import type { PaidChapterEmphasisIdV1 } from '../individualization/individualizationSelectorTypesV1';

export const PAID_CHAPTER_EMPHASIS_COPY_V1: Readonly<
  Record<PaidChapterEmphasisIdV1, string>
> = {
  paid_ch1__baseline_landscape:
    '生年月日から見える土台の輪郭を、いまの読みの入口として整えます。',
  paid_ch1__expression_mirror:
    '6問の回答から見える、いま表れやすい動き方を土台の上に重ねて見ます。',
  paid_ch1__align_diverge_bridge:
    '土台と今の見取りが重なる点と、少し異なる点を分けて読み返せる形にします。',
  paid_ch2__start_rhythm:
    '始め方のリズムを意識すると、着手の負荷が整いやすくなります。',
  paid_ch2__decision_flow:
    '迷いが出やすい場面では、比較と区切りを先に置くと戻りやすくなります。',
  paid_ch2__change_adaptation:
    '変化の前後で、様子を見るか早めに微調整するかの差を意識できます。',
  paid_ch3__distance_posture:
    '人との距離の取り方が、関係の負荷にどうつながるかを見ます。',
  paid_ch3__decision_in_relation:
    '近い関係の中での決め方の癖を、負荷の出方として読み返します。',
  paid_ch3__recovery_connection:
    '回復の仕方と、つながり方のバランスを一緒に見ます。',
  paid_ch4__recovery_pace:
    '疲れがたまりやすい条件と、戻しやすいペースを生活のリズムに結びます。',
  paid_ch4__change_life_load:
    '変化が続くときの負荷の出方を、日常の区切りとして読み返します。',
  paid_ch4__distance_boundary:
    '距離の線引きと、疲れのサインを一緒に意識すると整えやすくなります。',
  paid_ch4__strain_life_context:
    'いまの生活文脈で出やすい負荷の手がかりを、戻し方につなげます。',
};
