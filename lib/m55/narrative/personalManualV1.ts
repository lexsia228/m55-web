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
import { humanizePrivatePresentationJa } from './humanizePrivatePresentationV1';
import {
  assertCustomerCopyJa,
  normalizeCustomerCopyJa,
} from '../freeResult/humanizeFreeResultWhyV1';

const START_SLOT: Readonly<Record<StartTendency, string>> = {
  try: '小さく一つ動かしてから、様子を見る。',
  map: '全体の段取りが見えてから動き出す。',
  ask: '周りの意見を聞いてから取りかかる。',
};

const DECISION_SLOT: Readonly<Record<DecisionTendency, string>> = {
  sort: '候補を並べてから、答えを一つに絞る。',
  deadline: '「ここまで」が見えたところで決める。',
  wait: '一度置いてから返す。',
};

const DISTANCE_SLOT: Readonly<Record<DistanceTendency, string>> = {
  close: '近い関係ほど、今の距離感を言葉にして整える。',
  middle: '連絡や会う頻度を、あまり変えずに続ける。',
  solo: '人と会ったあと、一人の時間で整えてから戻る。',
};

const RECOVERY_SLOT: Readonly<Record<RecoveryTendency, string>> = {
  pause: '短い休みを入れて立て直す。',
  shrink: 'やることの範囲を狭くして戻る。',
  scene: '場所や空気を変えてから戻る。',
};

const CHANGE_SLOT: Readonly<Record<ChangeTendency, string>> = {
  observe: '変化の直後は、一日様子を見てから動く。',
  adjust: '変わったところだけ、少し直して進める。',
  rebuild: '前提が変わったら、一度組み直す。',
};

const TALK_HINT: Readonly<Record<DistanceTendency, string>> = {
  close: '話しかけるときは、決める前に今の距離感を一言確認してもらえると続きやすい。',
  middle: '頻度は変えずに、決める話と様子を見る話を分けてもらえると話しやすい。',
  solo: 'すぐ返事を求めず、一人の時間のあとに返してもらえると話しやすい。',
};

function slot(
  id: ManualSlotV1['id'],
  labelJa: string,
  bodyJa: string,
  provenanceIds: readonly string[],
): ManualSlotV1 {
  const humanized = humanizePrivatePresentationJa(bodyJa);
  assertCustomerCopyJa(humanized);
  return { id, labelJa, bodyJa: humanized, provenanceIds };
}

function pickHiddenSpec(fused: PersonalFreeFusedInsightSpecV3): {
  text: string;
  provenanceIds: readonly string[];
} | null {
  const actualNorm = normalizeCustomerCopyJa(firstSentenceJa(fused.manifestation.shortJa));
  const candidates: readonly { text: string; provenanceIds: readonly string[] }[] = [
    {
      text: fused.manifestation.supportingObservationJa,
      provenanceIds: [fused.manifestation.patternId, 'supportingObservationJa'],
    },
    {
      text: fused.behavioralPrediction,
      provenanceIds: [fused.manifestation.patternId, 'behavioralPrediction'],
    },
    {
      text: fused.body,
      provenanceIds: [fused.interactionId, fused.hingeAxisId],
    },
    {
      text: fused.fusedStackJa,
      provenanceIds: [fused.interactionId, fused.hingeAxisId, 'fusedStackJa'],
    },
  ];

  for (const candidate of candidates) {
    const sentence = firstSentenceJa(candidate.text);
    const norm = normalizeCustomerCopyJa(sentence);
    if (
      sentence.trim().length >= 8 &&
      norm !== actualNorm &&
      !actualNorm.includes(norm.slice(0, 10)) &&
      !norm.includes(actualNorm.slice(0, 10))
    ) {
      return { text: sentence, provenanceIds: candidate.provenanceIds };
    }
  }
  return null;
}

function extractSeenPhrase(before: string): string {
  const clause =
    before
      .split(/[。、]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .pop() ?? before.trim();
  if (clause.endsWith('人')) return clause;
  if (/ように$/.test(clause)) return `${clause.replace(/ように$/, 'い')}人`;
  if (/ている$|いる$|った$|い$|え$/.test(clause)) return `${clause}人`;
  return clause;
}

function cleanActualPhrase(text: string): string {
  return text
    .replace(/^実際に/u, '')
    .replace(/^、/u, '')
    .replace(/^自分の中では/u, '')
    .replace(/^本人の中では/u, '')
    .trim();
}

function parseSocialContrast(text: string): { seenJa: string; actualJa: string } | null {
  const markers = ['に見られても', 'に見えても', 'ように見えても', 'に見られやすいが', 'ように見られやすい'];
  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx < 8) continue;
    const before = text.slice(0, idx).trim();
    const after = text.slice(idx + marker.length).replace(/^、/u, '').trim();
    const seenJa = extractSeenPhrase(before);
    const actualJa = cleanActualPhrase(firstSentenceJa(after));
    if (seenJa.length >= 4 && actualJa.length >= 6) {
      return { seenJa, actualJa };
    }
  }
  return null;
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

  const seenActual = seenVsActualFromFused(fused);
  const misreadBody = seenActual.seenJa.trim();
  const misreadActual = seenActual.actualJa.trim();
  if (
    misreadBody.length >= 4 &&
    misreadActual.length >= 4 &&
    misreadBody !== misreadActual &&
    !misreadBody.includes(misreadActual.slice(0, 8))
  ) {
    ranked.push(
      slot(
        'misread',
        '誤解されやすいところ',
        `人からは「${misreadBody}」に見えやすい一方で、本人の中では${misreadActual}。`,
        [hingeId, fused.hingeAxisId, manifestId],
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
  const hidden = pickHiddenSpec(input.fused);
  return {
    titleJa: '私の取扱説明書',
    slots,
    hiddenSpecJa: hidden?.text ?? '',
    hiddenSpecProvenanceIds: hidden?.provenanceIds ?? [],
    completeness: input.completeness,
  };
}

export function seenVsActualFromFused(fused: PersonalFreeFusedInsightSpecV3): {
  seenJa: string;
  actualJa: string;
} {
  const sources = [
    fused.currentExpressionJa,
    fused.fusedStackJa,
    fused.manifestation.supportingObservationJa,
    fused.manifestation.manifestationJa,
  ];
  for (const source of sources) {
    const parsed = parseSocialContrast(source);
    if (parsed) return parsed;
  }

  return {
    seenJa: firstSentenceJa(fused.currentExpressionJa),
    actualJa: firstSentenceJa(fused.manifestation.shortJa),
  };
}
