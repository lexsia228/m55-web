'use client';

/**
 * Purchaser-only concierge room.
 * M55_REPORT_CONCIERGE_ROOM_SSOT_v1 + M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1
 *
 * Constraints:
 * - Shows only when ownership is confirmed (server gate already checked).
 * - Input: min=10, warning=450, hard max=500 chars.
 * - Output target: 700-900 chars, hard cap 1000.
 * - Thread cap: 3 consults (credits_total max 3).
 * - Read-only when credits_remaining=0 (prior messages remain visible).
 * - Add-on CTA: room-only, no public lane.
 * - No generic public chat wording.
 *
 * Hardening (2026-03-25):
 * - sendLock ref prevents double-submit before React state updates.
 * - Microcopy aligned with SSOT §5.2 (no urgency/shame/failure wording).
 * - High-risk block response shows safe guidance only.
 */

import { useEffect, useRef, useState } from 'react';
import styles from './ConsultRoom.module.css';

const INPUT_MIN = 10;
const INPUT_WARN = 450;
const INPUT_MAX = 500;
/** Max consults per report thread (SSOT M55_REPORT_CONCIERGE_ROOM_SSOT_v1 §2.3) */
const MAX_CREDITS = 3;

type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
};

type ThreadState = {
  credits_total: number;
  credits_remaining: number;
  state: 'writable' | 'read_only';
};

type RoomData = {
  thread: ThreadState;
  messages: Message[];
};

type Props = {
  birthDate: string;
  nickname: string;
};

export default function ConsultRoom({ birthDate, nickname }: Props) {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Immediate double-submit guard — set before any async op, cleared in finally.
  // Separate from `sending` state which controls UI after re-render.
  const sendLock = useRef(false);

  // Load thread state + messages on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/room/core', { cache: 'no-store' });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          if (!cancelled) setLoadError((d as { error?: string }).error ?? `読み込みエラー (${res.status})`);
          return;
        }
        const data = await res.json();
        if (!cancelled) setRoomData(data as RoomData);
      } catch {
        if (!cancelled) setLoadError('ルームの読み込みに失敗しました。ページを再読み込みしてください。');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomData?.messages]);

  const handleSend = async () => {
    // Double-submit guard: ref check before state check
    if (sendLock.current) return;
    if (!roomData) return;

    const msg = inputText.trim();
    if (msg.length < INPUT_MIN) return;
    if (msg.length > INPUT_MAX) return;
    if (roomData.thread.state !== 'writable') return;
    if (roomData.thread.credits_remaining <= 0) return;

    sendLock.current = true;
    setSending(true);
    setSendError(null);

    // Optimistic: show user message immediately, clear input
    const optimisticMsg: Message = { role: 'user', content: msg };
    setRoomData((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev
    );
    setInputText('');

    try {
      const res = await fetch('/api/room/core/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, birthDate, nickname }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Roll back optimistic message on error
        setRoomData((prev) =>
          prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev
        );
        // Show safe message for high-risk blocks, error text for others
        setSendError(
          (data as { safeMessage?: string }).safeMessage ??
          (data as { error?: string }).error ??
          `送信エラー (${res.status})`
        );
        // Restore input text for user to edit and retry
        setInputText(msg);
        return;
      }

      const { reply, thread } = data as { reply: Message; thread: ThreadState };
      setRoomData((prev) =>
        prev ? { thread, messages: [...prev.messages, reply] } : null
      );
    } catch {
      // Network error: roll back
      setRoomData((prev) =>
        prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev
      );
      setSendError('送信に失敗しました。ネットワークを確認して再度お試しください。');
      setInputText(msg);
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

  const charCount = inputText.length;
  const isOverMax = charCount > INPUT_MAX;
  const isUnderMin = inputText.trim().length < INPUT_MIN;
  const isWarn = charCount >= INPUT_WARN && !isOverMax;

  // ── Loading / error states ──────────────────────────────────────────
  if (loadError) {
    return (
      <div className={styles.room} aria-label="相談ルーム">
        <p className={styles.errorMsg}>{loadError}</p>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className={styles.room} aria-label="相談ルーム">
        <p className={styles.loading}>読み込み中…</p>
      </div>
    );
  }

  const { thread, messages } = roomData;
  const isReadOnly = thread.state === 'read_only' || thread.credits_remaining <= 0;

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <section className={styles.room} aria-label="相談ルーム（purchaser-only）">
      <div className={styles.roomHeader}>
        <h2 className={styles.roomTitle}>相談ルーム</h2>

        {/* Credits counter — required by SSOT §6.1 */}
        <div className={styles.credits} aria-label="相談の残り回数">
          <span className={styles.creditsLabel}>相談残り</span>
          <span className={styles.creditsValue} aria-live="polite">
            {thread.credits_remaining} / {thread.credits_total}
          </span>
        </div>
      </div>

      {/* Read-only notice — SSOT §5.2: no urgency/shame/failure wording */}
      {isReadOnly && (
        <div className={styles.readOnlyNotice} role="status" aria-live="polite">
          <p className={styles.readOnlyText}>
            このレポートスレッドの相談上限に達しました。これまでのやりとりは引き続き確認できます。
          </p>
          {/* Add-on hint: room-only, no public hero (SSOT §3.2) */}
          {thread.credits_total < MAX_CREDITS && (
            <p className={styles.addOnNote}>
              追加の相談（1回）はこのルーム内でのみ申し込み可能です。上限は合計{MAX_CREDITS}回です。
            </p>
          )}
        </div>
      )}

      {/* Message thread */}
      <div className={styles.messages} role="log" aria-label="相談のやりとり" aria-live="polite">
        {messages.length === 0 && !isReadOnly && (
          <p className={styles.emptyMsg}>
            レポートの内容について確認したいことがあれば、こちらで整理できます。
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={msg.id ?? i}
            className={msg.role === 'user' ? styles.msgUser : styles.msgAssistant}
          >
            <p className={styles.msgRole}>{msg.role === 'user' ? 'あなた' : 'M55'}</p>
            <p className={styles.msgContent}>{msg.content}</p>
          </div>
        ))}
        {sending && (
          <div className={styles.msgAssistant}>
            <p className={styles.msgRole}>M55</p>
            <p className={styles.msgContent} aria-live="polite">返答を生成しています…</p>
          </div>
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Send error */}
      {sendError && (
        <p className={styles.sendError} role="alert">{sendError}</p>
      )}

      {/* Input area — hidden when read-only (SSOT §5.1) */}
      {!isReadOnly && (
        <div className={styles.inputArea}>
          <label htmlFor="consult-input" className={styles.srOnly}>
            相談メッセージを入力（{INPUT_MIN}〜{INPUT_MAX}文字）
          </label>
          <textarea
            id="consult-input"
            className={styles.textarea}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`このレポートの内容について確認したいことを入力（${INPUT_MIN}〜${INPUT_MAX}文字）`}
            rows={4}
            maxLength={INPUT_MAX + 10}
            disabled={sending}
            aria-describedby="char-counter"
          />
          <div className={styles.inputFooter}>
            <span
              id="char-counter"
              className={
                isOverMax ? styles.counterOver : isWarn ? styles.counterWarn : styles.counter
              }
              aria-live="polite"
            >
              {charCount} / {INPUT_MAX}
              {isWarn && ` — あと${INPUT_MAX - charCount}文字`}
              {isOverMax && ' — 上限を超えています。短くしてください'}
            </span>
            <button
              type="button"
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={sending || isOverMax || isUnderMin}
              aria-busy={sending}
            >
              {sending ? '送信中…' : '送信する（1回消費）'}
            </button>
          </div>
          <p className={styles.inputNote}>
            1回の送信で相談1回を消費します。送信後の取り消しはできません。返答は保存されます。
          </p>
        </div>
      )}
    </section>
  );
}

