/**
 * Synthetic fixtures for additional-reading wizard 20×15 quality matrix.
 * Pure / local only — no DB, RPC, AI, ticket mutation, or production PII.
 */

import { createHash } from 'node:crypto';
import { buildV2FulfillmentSnapshotFromFields } from '../compositeStem/buildV2FulfillmentSnapshot';
import type { DtrEnvelope } from '../dtrEngine';
import {
  CONSULT_QUESTION_CATALOG_V1,
  REPLY_THEME_IDS,
  type ConsultQuestionCatalogEntry,
  type ReplyThemeId,
} from './consultQuestionCatalog.v1';
import {
  WIZARD_ENTRY_CARD_DISPLAY,
  WIZARD_QUESTION_LABEL_DISPLAY,
  wizardQuestionLabelJa,
} from './consultReplyWizardDisplay.v1';
import { buildConsultReportContextFromEnvelope } from './consultReportContext';
import {
  buildConsultUserAnchors,
  buildQuestionSelectConsultMessage,
  parseConsultUserMessage,
} from './consultSendMessage';

export const FIXED_NICKNAME = 'GX' as const;

/** CI matrix: 20 combo × 15 DOB = 300. */
export const CI_COMBO_COUNT = 20;
export const CI_DOB_COUNT = 15;
export const CI_CASE_COUNT = CI_COMBO_COUNT * CI_DOB_COUNT;

/** Optional matrix design constants (not executed in CI by default). */
export const NIGHTLY_CASE_COUNT = 20 * 15 * 3; // 900
export const STRESS_CASE_COUNT = 20 * 15 * 3 * 2; // 1800

export const DOB_ARCHETYPES_15 = [
  { id: 'D01', birthDate: '1955-03-01' },
  { id: 'D02', birthDate: '1968-08-15' },
  { id: 'D03', birthDate: '1975-10-31' },
  { id: 'D04', birthDate: '1982-02-28' },
  { id: 'D05', birthDate: '1983-02-28' },
  { id: 'D06', birthDate: '1990-01-10' },
  { id: 'D07', birthDate: '1990-01-11' },
  { id: 'D08', birthDate: '1990-01-21' },
  { id: 'D09', birthDate: '1992-04-15' },
  { id: 'D10', birthDate: '1995-05-20' },
  { id: 'D11', birthDate: '1997-06-15' },
  { id: 'D12', birthDate: '1999-07-15' },
  { id: 'D13', birthDate: '2000-02-29' },
  { id: 'D14', birthDate: '2001-09-30' },
  { id: 'D15', birthDate: '2010-12-31' },
] as const;

export const INVALID_DOB_FIXTURES = [
  '2001-02-29',
  '1990-13-01',
  '1990-00-10',
  'not-a-date',
] as const;

export const TRAIT_ARCHETYPES = [
  'trait_default',
  'trait_inner',
  'trait_relation',
  'trait_pace',
] as const;

export type TraitArchetype = (typeof TRAIT_ARCHETYPES)[number];

export const CONTEXT_VARIATIONS = ['ctx_dense', 'ctx_short'] as const;
export type ContextVariation = (typeof CONTEXT_VARIATIONS)[number];

/** UI ↔ server label correspondence (drift allowed; key mapping must hold). */
export type UiServerLabelPair = {
  reply_theme_id: ReplyThemeId;
  reply_question_id: string;
  uiThemeLabel: string;
  serverThemeLabel: string;
  uiQuestionLabel: string;
  serverQuestionLabel: string;
};

export function buildUiServerLabelCorrespondenceTable(): UiServerLabelPair[] {
  return CONSULT_QUESTION_CATALOG_V1.map((entry) => ({
    reply_theme_id: entry.reply_theme_id,
    reply_question_id: entry.reply_question_id,
    uiThemeLabel: WIZARD_ENTRY_CARD_DISPLAY[entry.reply_theme_id].label,
    serverThemeLabel: entry.themeLabelJa,
    uiQuestionLabel: wizardQuestionLabelJa(
      entry.reply_question_id,
      entry.labelJa,
    ),
    serverQuestionLabel: entry.labelJa,
  }));
}

export type WalletMock = {
  status: 'active' | 'exhausted';
  available_count: number;
};

export type RpcMock = {
  commitCalls: number;
  lastKey: string | null;
};

export function createWalletMock(
  available_count = 1,
): WalletMock {
  return {
    status: available_count > 0 ? 'active' : 'exhausted',
    available_count,
  };
}

/** success-only-consume: dry-run must never increment commitCalls. */
export function createRpcMock(): RpcMock {
  return { commitCalls: 0, lastKey: null };
}

export function assertRpcUncalled(rpc: RpcMock): void {
  if (rpc.commitCalls !== 0) {
    throw new Error(
      `success-only-consume violated: m55_consult_reply_commit mock called ${rpc.commitCalls} time(s)`,
    );
  }
}

export type SyntheticConsultCase = {
  caseId: string;
  comboIndex: number;
  dobIndex: number;
  birthDate: string;
  dobId: string;
  trait: TraitArchetype;
  contextVariation: ContextVariation;
  catalogEntry: ConsultQuestionCatalogEntry;
  uiThemeLabel: string;
  uiQuestionLabel: string;
  envelope: DtrEnvelope;
  reportContext: string;
  composedUserMessage: string;
  anchors: string;
  contextHash: string;
  wallet: WalletMock;
  rpc: RpcMock;
};

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function applyTraitChapterTint(
  envelope: DtrEnvelope,
  trait: TraitArchetype,
): DtrEnvelope {
  if (trait === 'trait_default') return envelope;
  const clone = structuredClone(envelope);
  const sections = clone.payload.fullSections;
  if (!Array.isArray(sections)) return clone;

  const tint: Record<Exclude<TraitArchetype, 'trait_default'>, { id: string; phrase: string }> = {
    trait_inner: {
      id: 's3_essence',
      phrase: '内側で整えてから動く流れが、場面ごとに出やすいです。',
    },
    trait_relation: {
      id: 's5_friction',
      phrase: '人との距離で疲れが重なりやすい場面があります。',
    },
    trait_pace: {
      id: 's2_composition',
      phrase: '進め方の区切りが曖昧だと、ペースが乱れやすいです。',
    },
  };
  const spec = tint[trait];
  const target = sections.find((s) => s.id === spec.id);
  if (target?.body) {
    target.body = `${spec.phrase}\n${target.body}`;
  }
  return clone;
}

function applyContextVariation(
  envelope: DtrEnvelope,
  variation: ContextVariation,
): DtrEnvelope {
  if (variation === 'ctx_dense') return envelope;
  const clone = structuredClone(envelope);
  const sections = clone.payload.fullSections;
  if (!Array.isArray(sections)) return clone;
  for (const section of sections) {
    if (section.body && section.body.length > 80) {
      section.body = `${section.body.slice(0, 79)}…`;
    }
  }
  return clone;
}

/**
 * Build a synthetic purchased saved-report envelope for a DOB.
 * Uses local v2 fulfillment helper only (no DB).
 */
export function buildSyntheticSavedReportEnvelope(input: {
  birthDate: string;
  nickname?: string;
  trait?: TraitArchetype;
  contextVariation?: ContextVariation;
}): DtrEnvelope {
  const nickname = input.nickname ?? FIXED_NICKNAME;
  const built = buildV2FulfillmentSnapshotFromFields(
    {
      nickname,
      birthDate: input.birthDate,
      birthTime: '12:00',
      birthTimeUnknown: false,
      country: 'JP',
      birthplace: '東京都',
      timezone: 'Asia/Tokyo',
    },
    { dobPersonalizationV2Enabled: true },
  );
  let envelope = built.envelope_json;
  envelope = applyTraitChapterTint(envelope, input.trait ?? 'trait_default');
  envelope = applyContextVariation(
    envelope,
    input.contextVariation ?? 'ctx_dense',
  );
  return envelope;
}

export function buildSyntheticConsultCase(input: {
  comboIndex: number;
  dobIndex: number;
  trait?: TraitArchetype;
  contextVariation?: ContextVariation;
}): SyntheticConsultCase {
  const catalogEntry = CONSULT_QUESTION_CATALOG_V1[input.comboIndex];
  if (!catalogEntry) {
    throw new Error(`invalid comboIndex ${input.comboIndex}`);
  }
  const dob = DOB_ARCHETYPES_15[input.dobIndex];
  if (!dob) {
    throw new Error(`invalid dobIndex ${input.dobIndex}`);
  }

  const trait = input.trait ?? 'trait_default';
  const contextVariation = input.contextVariation ?? 'ctx_dense';
  const envelope = buildSyntheticSavedReportEnvelope({
    birthDate: dob.birthDate,
    trait,
    contextVariation,
  });
  const reportContext = buildConsultReportContextFromEnvelope(envelope, {
    redactNickname: FIXED_NICKNAME,
  });
  const composedUserMessage = buildQuestionSelectConsultMessage(
    catalogEntry.themeLabelJa,
    catalogEntry.labelJa,
  );
  const parsed = parseConsultUserMessage(composedUserMessage);
  const anchors = buildConsultUserAnchors(parsed, catalogEntry);

  return {
    caseId: `c${String(input.comboIndex).padStart(2, '0')}_d${String(input.dobIndex).padStart(2, '0')}`,
    comboIndex: input.comboIndex,
    dobIndex: input.dobIndex,
    birthDate: dob.birthDate,
    dobId: dob.id,
    trait,
    contextVariation,
    catalogEntry,
    uiThemeLabel: WIZARD_ENTRY_CARD_DISPLAY[catalogEntry.reply_theme_id].label,
    uiQuestionLabel: wizardQuestionLabelJa(
      catalogEntry.reply_question_id,
      catalogEntry.labelJa,
    ),
    envelope,
    reportContext,
    composedUserMessage,
    anchors,
    contextHash: hashText(reportContext),
    wallet: createWalletMock(1),
    rpc: createRpcMock(),
  };
}

export function buildAll300ConsultQualityCases(): SyntheticConsultCase[] {
  const cases: SyntheticConsultCase[] = [];
  for (let comboIndex = 0; comboIndex < CI_COMBO_COUNT; comboIndex += 1) {
    for (let dobIndex = 0; dobIndex < CI_DOB_COUNT; dobIndex += 1) {
      cases.push(buildSyntheticConsultCase({ comboIndex, dobIndex }));
    }
  }
  return cases;
}

export function emptySnapshotEnvelope(): DtrEnvelope {
  const envelope = buildSyntheticSavedReportEnvelope({
    birthDate: '1983-02-28',
  });
  const clone = structuredClone(envelope);
  clone.payload.fullSections = [];
  return clone;
}

/**
 * User-facing / prompt-facing catalog fields for forbidden scans.
 * Excludes `forbidden_scope` (intentionally names banned topics, e.g. 体調診断).
 */
export function catalogSourcedPromptBlob(
  entry: ConsultQuestionCatalogEntry,
): string {
  return [
    entry.themeLabelJa,
    entry.labelJa,
    entry.promptFocusAnchor,
    entry.grounding_target,
    entry.output_intent,
    entry.primaryChapterRoman,
    entry.secondaryChapterRoman ?? '',
  ].join('\n');
}

export function assertWizardDisplayKeysCoverCatalog(): void {
  for (const themeId of REPLY_THEME_IDS) {
    if (!WIZARD_ENTRY_CARD_DISPLAY[themeId]?.label) {
      throw new Error(`missing UI entry label for ${themeId}`);
    }
  }
  for (const entry of CONSULT_QUESTION_CATALOG_V1) {
    if (!WIZARD_QUESTION_LABEL_DISPLAY[entry.reply_question_id]) {
      throw new Error(
        `missing UI question label for ${entry.reply_question_id}`,
      );
    }
  }
}
