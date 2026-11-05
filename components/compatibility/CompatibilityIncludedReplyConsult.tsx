'use client';

/**
 * Pair Premium — one included additional reading per owned report (#251).
 * API + persistence live in lib/m55/compatibility/*Consult* and /api/compatibility/reports/.../consult.
 * Commercial polish / layout tokens: integrate in PR #255 without duplicating wallet or DTR ConsultRoom routes.
 */

import { useEffect, useMemo, useState } from 'react';
import { COMPATIBILITY_CONSULT_REPLY_THEME_IDS } from '../../lib/m55/compatibility/compatibilityConsultPrompt';
import {
  getQuestionsForTheme,
  type ConsultQuestionCatalogEntry,
} from '../../lib/m55/consult/consultQuestionCatalog.v1';
import {
  mapConsultRoomLoadErrorToUserMessage,
  mapConsultRoomSendErrorToUserMessage,
} from '../../lib/m55/consult/consultRoomUserFacingErrors';
import styles from './CompatibilityIncludedReplyConsult.module.css';

type CompatibilityConsultReplyThemeId = (typeof COMPATIBILITY_CONSULT_REPLY_THEME_IDS)[number];

type ConsultMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type IncludedReplyRoom = {
  reportId: string;
  creditsRemaining: number;
  creditsTotal: number;
  state: 'writable' | 'read_only';
  messages: ConsultMessage[];
};

export type IncludedReplySelection = {
  replyThemeId: CompatibilityConsultReplyThemeId;
  replyQuestionId: string;
};

export type IncludedReplySendIntent = IncludedReplySelection & { idempotencyKey: string };

export type IncludedReplySendOutcome =
  /** Server state shows the reading saved; the intent is settled. */
  | { kind: 'committed'; room: IncludedReplyRoom }
  /** Definitive rejection with no live reservation; a new intent may use a new key. */
  | { kind: 'rejected'; room: IncludedReplyRoom | null; message: string }
  /** Outcome unknown or still in progress; the same intent and key must be kept. */
  | { kind: 'unresolved'; room: IncludedReplyRoom | null; message: string };

export type IncludedReplySessionResult =
  | IncludedReplySendOutcome
  | { kind: 'ignored'; reason: 'in_flight' | 'intent_locked' | 'invalid_selection' };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const THEME_LABELS: Record<CompatibilityConsultReplyThemeId, string> = {
  relation: '関係の整理',
  report: 'レポートの読み方',
};

export const INCLUDED_REPLY_QUESTION_OPTIONS: Readonly<
  Record<CompatibilityConsultReplyThemeId, readonly ConsultQuestionCatalogEntry[]>
> = Object.freeze({
  relation: Object.freeze(getQuestionsForTheme('relation')),
  report: Object.freeze(getQuestionsForTheme('report')),
});

const ROOM_INCONSISTENT_MESSAGE_JA =
  '追加読み解きの状態を確認できませんでした。ページを再読み込みしてください。';
const NETWORK_UNRESOLVED_MESSAGE_JA =
  '通信が途切れたため、作成結果を確認できませんでした。同じ内容でもう一度送ると、作成済みの場合はその結果を表示します。';
const IN_PROGRESS_MESSAGE_JA =
  '前の送信を処理しています。少し時間をおいて、同じ内容でもう一度送ってください。';
const RESULT_UNCONFIRMED_MESSAGE_JA =
  '作成結果を確認できませんでした。ページを再読み込みしてご確認ください。';
const SEND_IN_PROGRESS_API_ERROR = 'Send already in progress. Reload and try again.';

function consultUrl(reportId: string): string {
  return `/api/compatibility/reports/${encodeURIComponent(reportId)}/consult`;
}

function parseMessage(value: unknown): ConsultMessage | null {
  if (!value || typeof value !== 'object') return null;
  const m = value as Record<string, unknown>;
  if (typeof m.id !== 'string' || !m.id) return null;
  if (m.role !== 'user' && m.role !== 'assistant') return null;
  if (typeof m.content !== 'string' || !m.content.trim()) return null;
  if (typeof m.createdAt !== 'string') return null;
  return { id: m.id, role: m.role, content: m.content, createdAt: m.createdAt };
}

/** Fail-closed: any missing body or contradictory credit/state combination yields null. */
export function parseIncludedReplyRoom(payload: unknown, reportId: string): IncludedReplyRoom | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (p.reportId !== reportId) return null;
  const total = p.creditsTotal;
  const remaining = p.creditsRemaining;
  if (typeof total !== 'number' || !Number.isInteger(total) || total < 1) return null;
  if (typeof remaining !== 'number' || !Number.isInteger(remaining)) return null;
  if (remaining < 0 || remaining > total) return null;
  if (p.state !== 'writable' && p.state !== 'read_only') return null;
  if (!Array.isArray(p.messages)) return null;

  const messages: ConsultMessage[] = [];
  for (const raw of p.messages) {
    const message = parseMessage(raw);
    if (!message) return null;
    messages.push(message);
  }

  const used = remaining < total || p.state === 'read_only';
  const hasAssistant = messages.some((message) => message.role === 'assistant');
  if (used !== hasAssistant) return null;

  return { reportId, creditsRemaining: remaining, creditsTotal: total, state: p.state, messages };
}

export function isIncludedReplyRoomUsed(room: IncludedReplyRoom): boolean {
  return room.creditsRemaining < room.creditsTotal || room.state === 'read_only';
}

export function isIncludedReplySelection(selection: IncludedReplySelection): boolean {
  const options = INCLUDED_REPLY_QUESTION_OPTIONS[selection.replyThemeId];
  return Boolean(options?.some((entry) => entry.reply_question_id === selection.replyQuestionId));
}

export function buildIncludedReplySendBody(selection: IncludedReplySelection): {
  reply_theme_id: CompatibilityConsultReplyThemeId;
  reply_question_id: string;
} {
  return {
    reply_theme_id: selection.replyThemeId,
    reply_question_id: selection.replyQuestionId,
  };
}

export async function loadIncludedReplyRoom(
  reportId: string,
  fetchImpl: FetchLike,
): Promise<{ ok: true; room: IncludedReplyRoom } | { ok: false; message: string }> {
  let res: Response;
  try {
    res = await fetchImpl(consultUrl(reportId), { cache: 'no-store', credentials: 'same-origin' });
  } catch {
    return { ok: false, message: mapConsultRoomLoadErrorToUserMessage(null, 503) };
  }
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const apiError =
      payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string'
        ? ((payload as { error: string }).error)
        : null;
    return { ok: false, message: mapConsultRoomLoadErrorToUserMessage(apiError, res.status) };
  }
  const room = parseIncludedReplyRoom(payload, reportId);
  if (!room) return { ok: false, message: ROOM_INCONSISTENT_MESSAGE_JA };
  return { ok: true, room };
}

/**
 * One POST with the intent's key, then GET as the source of truth.
 * Only a definitive 4xx (no live reservation) releases the key; everything else keeps it,
 * because the server replays, reports in-progress, or re-reserves for the same key.
 */
export async function executeIncludedReplySend(
  reportId: string,
  intent: IncludedReplySendIntent,
  fetchImpl: FetchLike,
): Promise<IncludedReplySendOutcome> {
  let status: number | null = null;
  let payload: Record<string, unknown> | null = null;
  try {
    const res = await fetchImpl(`${consultUrl(reportId)}/send`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': intent.idempotencyKey,
      },
      body: JSON.stringify(buildIncludedReplySendBody(intent)),
    });
    status = res.status;
    payload = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  } catch {
    status = null;
  }

  const sync = await loadIncludedReplyRoom(reportId, fetchImpl);
  const room = sync.ok ? sync.room : null;
  if (room && isIncludedReplyRoomUsed(room)) return { kind: 'committed', room };

  const apiError = typeof payload?.error === 'string' ? payload.error : null;
  const safeMessage = typeof payload?.safeMessage === 'string' ? payload.safeMessage : null;

  if (status !== null && status >= 400 && status < 500 && status !== 409) {
    return {
      kind: 'rejected',
      room,
      message: mapConsultRoomSendErrorToUserMessage(safeMessage, apiError),
    };
  }
  if (!sync.ok) return { kind: 'unresolved', room: null, message: sync.message };
  if (status === null) return { kind: 'unresolved', room, message: NETWORK_UNRESOLVED_MESSAGE_JA };
  if (status === 409) {
    return {
      kind: 'unresolved',
      room,
      message:
        apiError === SEND_IN_PROGRESS_API_ERROR
          ? IN_PROGRESS_MESSAGE_JA
          : mapConsultRoomSendErrorToUserMessage(safeMessage, apiError),
    };
  }
  if (status >= 200 && status < 300) {
    return { kind: 'unresolved', room, message: RESULT_UNCONFIRMED_MESSAGE_JA };
  }
  return {
    kind: 'unresolved',
    room,
    message: mapConsultRoomSendErrorToUserMessage(safeMessage, apiError),
  };
}

export function createIncludedReplyIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pair-consult-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Holds at most one send intent; a different intent is refused until the current one settles. */
export function createIncludedReplySendSession(deps: {
  reportId: string;
  fetchImpl: FetchLike;
  createIdempotencyKey: () => string;
}) {
  let intent: IncludedReplySendIntent | null = null;
  let inFlight = false;

  return {
    get pendingIntent(): IncludedReplySendIntent | null {
      return intent;
    },
    get inFlight(): boolean {
      return inFlight;
    },
    async send(selection: IncludedReplySelection): Promise<IncludedReplySessionResult> {
      if (inFlight) return { kind: 'ignored', reason: 'in_flight' };
      if (!isIncludedReplySelection(selection)) return { kind: 'ignored', reason: 'invalid_selection' };
      if (
        intent &&
        (intent.replyThemeId !== selection.replyThemeId ||
          intent.replyQuestionId !== selection.replyQuestionId)
      ) {
        return { kind: 'ignored', reason: 'intent_locked' };
      }

      const current = intent ?? { ...selection, idempotencyKey: deps.createIdempotencyKey() };
      intent = current;
      inFlight = true;
      try {
        const outcome = await executeIncludedReplySend(deps.reportId, current, deps.fetchImpl);
        if (outcome.kind !== 'unresolved') intent = null;
        return outcome;
      } finally {
        inFlight = false;
      }
    },
  };
}

type Props = {
  reportId: string;
};

export default function CompatibilityIncludedReplyConsult({ reportId }: Props) {
  const [room, setRoom] = useState<IncludedReplyRoom | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [themeId, setThemeId] = useState<CompatibilityConsultReplyThemeId | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<IncludedReplySendIntent | null>(null);

  const session = useMemo(
    () =>
      createIncludedReplySendSession({
        reportId,
        fetchImpl: (input, init) => fetch(input, init),
        createIdempotencyKey: createIncludedReplyIdempotencyKey,
      }),
    [reportId],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    void loadIncludedReplyRoom(reportId, (input, init) => fetch(input, init)).then((result) => {
      if (!active) return;
      if (result.ok) {
        setRoom(result.room);
      } else {
        setRoom(null);
        setLoadError(result.message);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [reportId]);

  const activeThemeId = pendingIntent?.replyThemeId ?? themeId;
  const activeQuestionId = pendingIntent?.replyQuestionId ?? questionId;
  const questions = activeThemeId ? INCLUDED_REPLY_QUESTION_OPTIONS[activeThemeId] : [];

  async function handleSend() {
    if (session.inFlight || !activeThemeId || !activeQuestionId) return;
    setSending(true);
    setSendError(null);
    try {
      const result = await session.send({
        replyThemeId: activeThemeId,
        replyQuestionId: activeQuestionId,
      });
      setPendingIntent(session.pendingIntent);
      if (result.kind === 'ignored') return;
      if (result.room) setRoom(result.room);
      if (result.kind === 'committed') {
        setThemeId(null);
        setQuestionId(null);
        return;
      }
      setSendError(result.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <section className={styles.section} data-testid="pair-included-reply-loading" aria-busy="true">
        <p className={styles.hint}>追加読み解きを読み込んでいます…</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className={styles.section} data-testid="pair-included-reply-load-error">
        <p className={styles.error}>{loadError}</p>
      </section>
    );
  }

  if (!room) return null;

  const canCompose = !isIncludedReplyRoomUsed(room) && room.creditsRemaining > 0;
  const selectionLocked = sending || pendingIntent !== null;

  return (
    <section
      className={styles.section}
      data-testid="pair-included-reply-consult"
      aria-labelledby="pair-included-reply-heading"
    >
      <h2 id="pair-included-reply-heading" className={styles.heading}>
        追加読み解き（1件）
      </h2>
      <p className={styles.lead}>
        購入済みの6章レポートを根拠に、今の関係について1テーマだけ読み解きます。相手の本音や未来の結果は断定しません。
      </p>
      <p className={styles.credits} data-testid="pair-included-reply-credits">
        残り {room.creditsRemaining} / {room.creditsTotal} 件
      </p>

      {room.messages.length > 0 ? (
        <div className={styles.messages} data-testid="pair-included-reply-history">
          {room.messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === 'user' ? styles.messageUser : styles.messageAssistant
              }
            >
              {message.content}
            </div>
          ))}
        </div>
      ) : null}

      {canCompose ? (
        <div className={styles.compose} data-testid="pair-included-reply-compose">
          <p className={styles.label}>テーマ</p>
          <div className={styles.themeGrid} role="group" aria-label="テーマ">
            {COMPATIBILITY_CONSULT_REPLY_THEME_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={styles.themeButton}
                aria-pressed={activeThemeId === id}
                disabled={selectionLocked}
                onClick={() => {
                  setThemeId(id);
                  setQuestionId(null);
                }}
              >
                {THEME_LABELS[id]}
              </button>
            ))}
          </div>

          {activeThemeId && questions.length > 0 ? (
            <>
              <p className={styles.label}>焦点</p>
              <div className={styles.themeGrid} role="group" aria-label="焦点">
                {questions.map((entry) => (
                  <button
                    key={entry.reply_question_id}
                    type="button"
                    className={styles.questionButton}
                    aria-pressed={activeQuestionId === entry.reply_question_id}
                    disabled={selectionLocked}
                    onClick={() => setQuestionId(entry.reply_question_id)}
                  >
                    {entry.labelJa}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <button
            type="button"
            className={styles.submit}
            disabled={!activeQuestionId || sending}
            onClick={() => void handleSend()}
          >
            {sending
              ? '作成中…'
              : pendingIntent
                ? '同じ内容でもう一度送る'
                : '追加読み解きを作成する'}
          </button>
          {sendError ? <p className={styles.error}>{sendError}</p> : null}
        </div>
      ) : (
        <p className={styles.hint} data-testid="pair-included-reply-readonly">
          このレポートに付いている追加読み解きは使用済みです。上の内容をいつでも読み返せます。
        </p>
      )}
    </section>
  );
}
