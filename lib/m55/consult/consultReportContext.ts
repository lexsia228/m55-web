/**
 * Lane A consult — report context excerpt from purchased snapshot envelope (read-only).
 * Pure function only; no DB access.
 */
import type { DtrEnvelope } from '../dtrEngine';

/** Per-section body excerpt limits (chars). s3–s5 are primary grounding chapters. */
const SECTION_LIMITS: { id: string; maxBodyChars: number }[] = [
  { id: 's1_identity', maxBodyChars: 150 },
  { id: 's2_composition', maxBodyChars: 150 },
  { id: 's3_essence', maxBodyChars: 300 },
  { id: 's4_strengths', maxBodyChars: 300 },
  { id: 's5_friction', maxBodyChars: 300 },
];

/** Total consult context budget for system prompt injection. */
export const CONSULT_REPORT_CONTEXT_TOTAL_CAP = 1500;

function excerptBody(body: string, maxChars: number): string {
  const trimmed = body.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars - 1) + '…';
}

/**
 * Build consult report context from stored envelope sections.
 * Returns empty string when no usable sections exist (caller must fail-closed).
 */
export function buildConsultReportContextFromEnvelope(envelope: DtrEnvelope): string {
  const sections = envelope.payload?.fullSections;
  if (!Array.isArray(sections) || sections.length === 0) return '';

  const byId = new Map(sections.map((s) => [s.id, s]));
  const parts: string[] = [];

  for (const spec of SECTION_LIMITS) {
    const section = byId.get(spec.id);
    if (!section?.title?.trim() || !section.body?.trim()) continue;

    const header = `【${section.title.trim()}】`;
    const body = excerptBody(section.body, spec.maxBodyChars);
    if (!body) continue;

    parts.push(`${header}\n${body}`);
  }

  let context = parts.join('\n\n').trim();
  if (context.length > CONSULT_REPORT_CONTEXT_TOTAL_CAP) {
    context = context.slice(0, CONSULT_REPORT_CONTEXT_TOTAL_CAP - 1) + '…';
  }

  return context;
}
