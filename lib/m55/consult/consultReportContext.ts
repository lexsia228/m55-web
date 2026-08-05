/**
 * Lane A consult — report context excerpt from purchased snapshot envelope (read-only).
 * Pure function only; no DB access.
 */
import type { DtrEnvelope } from '../dtrEngine';

/** Per-section body excerpt limits (chars). s3–s5 are primary grounding chapters. */
const SECTION_LIMITS: { id: string; maxBodyChars: number; role: 'support' | 'primary' }[] = [
  { id: 's1_identity', maxBodyChars: 120, role: 'support' },
  { id: 's2_composition', maxBodyChars: 120, role: 'support' },
  { id: 's3_essence', maxBodyChars: 400, role: 'primary' },
  { id: 's4_strengths', maxBodyChars: 360, role: 'primary' },
  { id: 's5_friction', maxBodyChars: 360, role: 'primary' },
];

/** Total consult context budget for system prompt injection. */
export const CONSULT_REPORT_CONTEXT_TOTAL_CAP = 1800;

const TENDENCY_TERM_MAX = 4;
const TENDENCY_TERM_MIN_LEN = 2;
const TENDENCY_TERM_MAX_LEN = 12;

function excerptBody(body: string, maxChars: number): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars - 1) + '…';
}

/** Pull short tendency phrases from primary chapter bodies (verbatim, no new labels). */
function extractTendencyTerms(primaryBodies: string[], nickname: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const body of primaryBodies) {
    const chunks = body
      .replace(/[。．！？\n]/g, ' ')
      .split(/[、,・\s]+/)
      .map((c) => c.trim())
      .filter((c) => c.length >= TENDENCY_TERM_MIN_LEN && c.length <= TENDENCY_TERM_MAX_LEN);

    for (const chunk of chunks) {
      if (/^(あなた|自分|こと|もの|ため|よう|など)$/.test(chunk)) continue;
      if (/[A-Za-z0-9]/.test(chunk)) continue;
      if (nickname && chunk.includes(nickname)) continue;
      if (seen.has(chunk)) continue;
      seen.add(chunk);
      terms.push(chunk);
      if (terms.length >= TENDENCY_TERM_MAX) return terms;
    }
  }

  return terms;
}

export type BuildConsultReportContextOptions = {
  /** Redact purchaser nickname from excerpts (prompt grounding only). */
  redactNickname?: string;
};

function redactNicknameInExcerpt(text: string, nickname: string): string {
  const nick = nickname.trim();
  if (!nick || nick === 'あなた') return text;
  return text.split(nick).join('あなた');
}

/**
 * Build consult report context from stored envelope sections.
 * Returns empty string when no usable sections exist (caller must fail-closed).
 */
export function buildConsultReportContextFromEnvelope(
  envelope: DtrEnvelope,
  options: BuildConsultReportContextOptions = {},
): string {
  const sections = envelope.payload?.fullSections;
  if (!Array.isArray(sections) || sections.length === 0) return '';

  const byId = new Map(sections.map((s) => [s.id, s]));
  const sectionParts: string[] = [];
  const metaParts: string[] = [];
  const primaryBodies: string[] = [];
  const nickname = options.redactNickname?.trim() ?? '';

  for (const spec of SECTION_LIMITS) {
    const section = byId.get(spec.id);
    if (!section?.title?.trim() || !section.body?.trim()) continue;

    const roleNote = spec.role === 'primary' ? '（主章候補）' : '（補助章候補）';
    const title = redactNicknameInExcerpt(section.title.trim(), nickname);
    const header = `【${title}】${roleNote}`;
    const body = redactNicknameInExcerpt(excerptBody(section.body, spec.maxBodyChars), nickname);
    if (!body) continue;

    if (spec.role === 'primary') primaryBodies.push(body);
    sectionParts.push(`${header}\n${body}`);
  }

  const paidIndividualization = envelope.auditMeta?.paidIndividualization;
  const isDobV2 = paidIndividualization?.version === 'v2';
  if (paidIndividualization?.essenceRhythmNote?.trim()) {
    const essence = redactNicknameInExcerpt(
      excerptBody(paidIndividualization.essenceRhythmNote.trim(), 200),
      nickname,
    );
    metaParts.push(`【プレミアムレポートの本質リズム（購入時固定）】\n${essence}`);
  }
  if (paidIndividualization?.auxiliaryReading?.trim()) {
    const auxiliary = redactNicknameInExcerpt(
      excerptBody(paidIndividualization.auxiliaryReading.trim(), 240),
      nickname,
    );
    metaParts.push(`【プレミアムレポートの補助整理（購入時固定）】\n${auxiliary}`);
  }
  if (isDobV2 && paidIndividualization?.handlingHint?.trim()) {
    const handling = redactNicknameInExcerpt(
      excerptBody(paidIndividualization.handlingHint.trim(), 180),
      nickname,
    );
    metaParts.push(`【プレミアムレポートの扱い方ヒント（購入時固定）】\n${handling}`);
  }

  const tendencyTerms = extractTendencyTerms(primaryBodies, nickname);
  if (tendencyTerms.length > 0) {
    metaParts.push(`【抜粋からそのまま使える傾向語の例】\n${tendencyTerms.join(' / ')}`);
  }

  metaParts.push(
    '【プレミアムレポート抜粋の使い方】\n' +
      '- 主章1つ・補助章最大1つ。傾向語2〜4個を抜粋からそのまま使う。\n' +
      '- 購入時点のプレミアムレポートの読み直し（新しい鑑定ではない）。'
  );

  let context = [
    ...(isDobV2 ? metaParts : sectionParts),
    ...(isDobV2 ? sectionParts : metaParts),
  ].join('\n\n').trim();
  if (context.length > CONSULT_REPORT_CONTEXT_TOTAL_CAP) {
    context = context.slice(0, CONSULT_REPORT_CONTEXT_TOTAL_CAP - 1) + '…';
  }

  return context;
}
