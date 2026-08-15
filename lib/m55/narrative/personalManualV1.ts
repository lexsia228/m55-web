/**
 * Personal "私の取扱説明書" — presentation slots from existing axes / fused copy.
 * Does not recompute DOB math or answers.
 */

import type {
  ChangeTendency,
  DecisionTendency,
  DistanceTendency,
  ExpressionAxes,
  RecoveryTendency,
  StartTendency,
} from '../individualization/types';
import type { PersonalFreeFusedInsightSpecV3 } from '../freeResult/personalFreeFusedInsightSpecV3';
import type { ManualSlotV1, ManualSpecV1 } from './m55NarrativeSpecV1';
import { firstSentenceJa } from './narrativeSafetyV1';

const START_SLOT: Readonly<Record<StartTendency, string>> = {
  try: '小さく一つ動かしてから、様子を見る。',
  map: '全体の手順が見えてから動き出す。',
  ask: '周囲の視点を足してから着手する。',
};

const DECISION_SLOT: Readonly<Record<DecisionTendency, string>> = {
  sort: '候補を並べてから閉じる。',
  deadline: '区切りが見えたところで決める。',
  wait: '一度置いてから返す。',
};

const DISTANCE_SLOT: Readonly<Record<DistanceTendency, string>> = {
  close: '近い関係ほど、今の間合いを言葉にして整える。',
  middle: '連絡や同席の間隔を一定に保ちながら続ける。',
  solo: '人と会ったあと、一人の時間で整えてから戻る。',
};

const RECOVERY_SLOT: Readonly<Record<RecoveryTendency, string>> = {
  pause: '短い区切りを入れて立て直す。',
  shrink: 'やることの範囲を狭くして戻る。',
  scene: '場所や刺激を変えてから戻る。',
};

const CHANGE_SLOT: Readonly<Record<ChangeTendency, string>> = {
  observe: '変化の直後は、一日様子を見てから動く。',
  adjust: '変わった点だけ小さく合わせて進める。',
  rebuild: '前提が変わったら、一度組み直す。',
};

const TALK_HINT: Readonly<Record<DistanceTendency, string>> = {
  close: '結論の前に、今の間合いを一句置く。',
  middle: '頻度は変えず、決める話と様子を見る話を分ける。',
  solo: '返事を急がず、一人の時間のあとに続きを置く。',
};

function slot(
  id: ManualSlotV1['id'],
  labelJa: string,
  bodyJa: string,
  provenanceIds: readonly string[],
): ManualSlotV1 {
  return { id, labelJa, bodyJa, provenanceIds };
}

function pickShortSlots(
  axes: ExpressionAxes,
  fused: PersonalFreeFusedInsightSpecV3,
): ManualSlotV1[] {
  const startId = `axis.start.${axes.start}`;
  const decisionId = `axis.decision.${axes.decision}`;
  const distanceId = `axis.distance.${axes.distance}`;
  const recoveryId = `axis.recovery.${axes.recovery}`;
  const changeId = `axis.change.${axes.change}`;
  const hingeId = fused.interactionId;
  const manifestId = fused.manifestation.patternId;

  const ranked: ManualSlotV1[] = [
    slot('start', '始め方', START_SLOT[axes.start], [startId, hingeId]),
    slot('decision', '決め方', DECISION_SLOT[axes.decision], [decisionId, hingeId]),
  ];

  const actual = firstSentenceJa(fused.manifestation.shortJa);
  if (actual) {
    ranked.push(slot('actual', '実際は', actual, [manifestId, 'personal_free_manifestation_v4']));
  }

  if (fused.interactionKind === 'diverge_overlay') {
    ranked.push(
      slot(
        'misread',
        '誤解されやすいところ',
        firstSentenceJa(fused.body) || firstSentenceJa(fused.fusedStackJa),
        [hingeId, fused.hingeAxisId],
      ),
    );
  }

  ranked.push(slot('distance', '距離の取り方', DISTANCE_SLOT[axes.distance], [distanceId]));

  if (axes.distance === 'solo' || axes.distance === 'close') {
    ranked.push(
      slot('talk_hint', '私と話すときのヒント', TALK_HINT[axes.distance], [distanceId, decisionId]),
    );
  }

  if (fused.hingeAxisId === 'recovery' || fused.hingeAxisId === 'change') {
    ranked.push(
      fused.hingeAxisId === 'recovery'
        ? slot('recovery', '回復方法', RECOVERY_SLOT[axes.recovery], [recoveryId, hingeId])
        : slot('change', '変化したとき', CHANGE_SLOT[axes.change], [changeId, hingeId]),
    );
  } else if (ranked.length < 5) {
    ranked.push(slot('recovery', '回復方法', RECOVERY_SLOT[axes.recovery], [recoveryId]));
  }

  const unique: ManualSlotV1[] = [];
  const seen = new Set<string>();
  for (const item of ranked) {
    if (seen.has(item.id) || item.bodyJa.trim().length < 4) continue;
    seen.add(item.id);
    unique.push(item);
    if (unique.length >= 6) break;
  }
  return unique.slice(0, Math.max(4, Math.min(6, unique.length)));
}

function completeSlots(
  axes: ExpressionAxes,
  fused: PersonalFreeFusedInsightSpecV3,
): ManualSlotV1[] {
  const short = pickShortSlots(axes, fused);
  const extra: ManualSlotV1[] = [
    slot('recovery', '回復方法', RECOVERY_SLOT[axes.recovery], [`axis.recovery.${axes.recovery}`]),
    slot('change', '変化したとき', CHANGE_SLOT[axes.change], [`axis.change.${axes.change}`]),
    slot('talk_hint', '私と話すときのヒント', TALK_HINT[axes.distance], [
      `axis.distance.${axes.distance}`,
    ]),
  ];
  const byId = new Map(short.map((item) => [item.id, item]));
  for (const item of extra) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

export function buildPersonalManualV1(input: {
  axes: ExpressionAxes;
  fused: PersonalFreeFusedInsightSpecV3;
  completeness: 'short' | 'complete';
}): ManualSpecV1 {
  const slots =
    input.completeness === 'complete'
      ? completeSlots(input.axes, input.fused)
      : pickShortSlots(input.axes, input.fused);
  return {
    titleJa: '私の取扱説明書',
    slots,
    hiddenSpecJa: firstSentenceJa(input.fused.manifestation.shortJa),
    hiddenSpecProvenanceIds: [
      input.fused.manifestation.patternId,
      input.fused.interactionId,
    ],
    completeness: input.completeness,
  };
}

export function seenVsActualFromFused(fused: PersonalFreeFusedInsightSpecV3): {
  seenJa: string;
  actualJa: string;
} {
  const source = `${fused.fusedStackJa}${fused.body}`;
  const markers = ['に見られても', 'に見えても', 'ように見えて', 'に見えて', 'に見られ'];
  for (const marker of markers) {
    const at = source.indexOf(marker);
    if (at < 8) continue;
    const before = source.slice(Math.max(0, at - 24), at).replace(/^[^、。]*[、。]/, '');
    const after = firstSentenceJa(source.slice(at + marker.length));
    if (before.trim().length >= 4 && after.trim().length >= 4) {
      return {
        seenJa: `${before.trim()}${marker.startsWith('に見') ? '人' : ''}`.replace(/人人$/, '人'),
        actualJa: after,
      };
    }
  }
  return {
    seenJa: firstSentenceJa(fused.currentExpressionJa),
    actualJa: firstSentenceJa(fused.manifestation.shortJa),
  };
}
