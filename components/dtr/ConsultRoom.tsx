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

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ConsultRoom.module.css';

const INPUT_MIN = 10;
const INPUT_WARN = 450;
const INPUT_MAX = 500;
/** Max consults per report thread (SSOT M55_REPORT_CONCIERGE_ROOM_SSOT_v1 §2.3) */
const MAX_CREDITS = 3;

/** 用途ラベル（往復券・1テーマ）— 保存版の型に当てはめて返書で深める軸 */
const THEMES = [
  '役割・裁量',
  '距離と期待',
  '消耗と回復',
  '迷いの一本化',
  '入り方・抜け方',
] as const;

type Theme = (typeof THEMES)[number];

const SUPPLEMENTARY_QUESTIONS: { id: string; label: string }[] = [
  { id: 'q1', label: '最近、判断を急がされる場面が増えている' },
  { id: 'q2', label: '対人関係で消耗を感じることがある' },
  { id: 'q3', label: '見通しが立ちにくい状態が続いている' },
  { id: 'q4', label: '自分のペースを保ちにくい' },
  { id: 'q5', label: '休息が十分に取れていない' },
];

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

function buildComposedMessage(
  theme: Theme | null,
  selectedIds: Set<string>,
  freeText: string
): string {
  const parts: string[] = [];
  if (theme) parts.push(`【テーマ】${theme}`);
  if (selectedIds.size > 0) {
    const labels = SUPPLEMENTARY_QUESTIONS.filter((q) => selectedIds.has(q.id)).map(
      (q) => `・${q.label}`
    );
    parts.push(`【補助（最大3つ）】\n${labels.join('\n')}`);
  }
  const body = freeText.trim();
  if (body) parts.push(body);
  return parts.join('\n\n');
}

function ThemeChip({
  theme,
  selected,
  onSelect,
}: {
  theme: Theme;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? `${styles.themeChip} ${styles.themeChipSelected}` : styles.themeChip}
      onClick={onSelect}
      aria-pressed={selected}
    >
      {theme}
    </button>
  );
}

function SupplementaryToggle({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={
        selected ? `${styles.questionToggle} ${styles.questionToggleSelected}` : styles.questionToggle
      }
      onClick={onToggle}
      aria-pressed={selected}
    >
      {label}
    </button>
  );
}

export default function ConsultRoom({ birthDate, nickname }: Props) {
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(() => new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendLock = useRef(false);
  const skipInitialThreadScrollRef = useRef(true);

  const composedMessage = useMemo(
    () => buildComposedMessage(selectedTheme, selectedQuestionIds, inputText),
    [selectedTheme, selectedQuestionIds, inputText]
  );

  const composedLen = composedMessage.length;
  const isOverMax = composedLen > INPUT_MAX;
  const isUnderMin = composedMessage.trim().length < INPUT_MIN;
  const isWarn = composedLen >= INPUT_WARN && !isOverMax;

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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!roomData) return;
    if (skipInitialThreadScrollRef.current) {
      skipInitialThreadScrollRef.current = false;
      return;
    }
    if (roomData.messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomData?.messages]);

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (sendLock.current) return;
    if (!roomData) return;
    if (!selectedTheme) return;

    const msg = composedMessage.trim();
    if (msg.length < INPUT_MIN) return;
    if (msg.length > INPUT_MAX) return;
    if (roomData.thread.state !== 'writable') return;
    if (roomData.thread.credits_remaining <= 0) return;

    const snapshot = {
      free: inputText,
      questions: new Set(selectedQuestionIds),
      theme: selectedTheme,
    };

    sendLock.current = true;
    setSending(true);
    setSendError(null);

    const optimisticMsg: Message = { role: 'user', content: msg };
    setRoomData((prev) => (prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev));
    setInputText('');
    setSelectedQuestionIds(new Set());

    try {
      const res = await fetch('/api/room/core/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, birthDate, nickname }),
      });
      const data = await res.json();

      if (!res.ok) {
        setRoomData((prev) => (prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev));
        setSendError(
          (data as { safeMessage?: string }).safeMessage ??
            (data as { error?: string }).error ??
            `送信エラー (${res.status})`
        );
        setInputText(snapshot.free);
        setSelectedQuestionIds(snapshot.questions);
        setSelectedTheme(snapshot.theme);
        return;
      }

      const { reply, thread } = data as { reply: Message; thread: ThreadState };
      setRoomData((prev) => (prev ? { thread, messages: [...prev.messages, reply] } : null));
    } catch {
      setRoomData((prev) => (prev ? { ...prev, messages: prev.messages.slice(0, -1) } : prev));
      setSendError('送信に失敗しました。ネットワークを確認して再度お試しください。');
      setInputText(snapshot.free);
      setSelectedQuestionIds(snapshot.questions);
      setSelectedTheme(snapshot.theme);
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  };

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

  const usageLine =
    thread.credits_remaining > 0
      ? `返書 ${thread.credits_remaining}件利用可能`
      : 'このスレッドの相談は利用済みです';

  const submitDisabled = sending || !selectedTheme || isOverMax || isUnderMin;

  return (
    <section className={styles.room} aria-label="相談ルーム（purchaser-only）">
      <header className={styles.roomHeaderBar}>
        <div className={styles.roomHeaderMain}>
          <h2 className={styles.roomTitle}>相談返書ルーム</h2>
          <p className={styles.roomLead}>
            見えている傾向を土台に、今回の論点を整理する
          </p>
        </div>
        <div className={styles.roomHeaderMeta}>
          <span className={styles.usageLabel}>利用状態</span>
          <p className={styles.usageValue} aria-live="polite">
            {usageLine}
            <span className={styles.usageSub}>
              （{thread.credits_remaining} / {thread.credits_total}）
            </span>
          </p>
        </div>
      </header>

      {isReadOnly && (
        <div className={styles.readOnlyNotice} role="status" aria-live="polite">
          <p className={styles.readOnlyText}>
            このレポートスレッドの相談上限に達しました。これまでのやりとりは引き続き確認できます。
          </p>
          {thread.credits_total < MAX_CREDITS && (
            <p className={styles.addOnNote}>
              追加の相談（1回）はこのルーム内でのみ申し込み可能です。上限は合計{MAX_CREDITS}回です。
            </p>
          )}
        </div>
      )}

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
            <p className={styles.msgContent} aria-live="polite">
              返答を生成しています…
            </p>
          </div>
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {sendError && <p className={styles.sendError} role="alert">{sendError}</p>}

      {!isReadOnly && (
        <div className={styles.composeColumn}>
          <section className={styles.composeSection}>
            <h3 className={styles.composeSectionLabel}>用途を選択（1つ）</h3>
            <div className={styles.themeRow}>
              {THEMES.map((t) => (
                <ThemeChip
                  key={t}
                  theme={t}
                  selected={selectedTheme === t}
                  onSelect={() => setSelectedTheme(t)}
                />
              ))}
            </div>
          </section>

          <section className={styles.composeSection}>
            <h3 className={styles.composeSectionLabel}>補助質問（最大3つ）</h3>
            <p className={styles.composeHint}>当てはまるものがあれば選択してください</p>
            <div className={styles.questionList}>
              {SUPPLEMENTARY_QUESTIONS.map((q) => (
                <SupplementaryToggle
                  key={q.id}
                  label={q.label}
                  selected={selectedQuestionIds.has(q.id)}
                  onToggle={() => toggleQuestion(q.id)}
                />
              ))}
            </div>
          </section>

          <section className={styles.composeSection}>
            <h3 className={styles.composeSectionLabel}>自由入力</h3>
            <label htmlFor="consult-input" className={styles.srOnly}>
              相談メッセージを入力（全体で{INPUT_MIN}〜{INPUT_MAX}文字）
            </label>
            <textarea
              id="consult-input"
              className={styles.textarea}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="今気になっていること、整理したいことがあればご記入ください"
              rows={6}
              maxLength={INPUT_MAX + 80}
              disabled={sending}
              aria-describedby="char-counter"
            />
            <div className={styles.counterRow}>
              <span
                id="char-counter"
                className={
                  isOverMax ? styles.counterOver : isWarn ? styles.counterWarn : styles.counter
                }
                aria-live="polite"
              >
                送信内容全体 {composedLen} / {INPUT_MAX}
                {selectedTheme == null && ' — テーマを選択してください'}
                {isWarn && ` — あと${INPUT_MAX - composedLen}文字`}
                {isOverMax && ' — 上限を超えています。短くしてください'}
              </span>
            </div>
          </section>

          <button
            type="button"
            className={submitDisabled ? `${styles.submitBtn} ${styles.submitBtnDisabled}` : styles.submitBtn}
            onClick={handleSend}
            disabled={submitDisabled}
            aria-busy={sending}
          >
            {sending ? (
              <span className={styles.submitBtnInner}>
                <svg className={styles.submitSpinner} viewBox="0 0 24 24" aria-hidden>
                  <circle
                    className={styles.submitSpinnerTrack}
                    cx="12"
                    cy="12"
                    r="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className={styles.submitSpinnerArc}
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                作成中
              </span>
            ) : (
              '返書を作成する'
            )}
          </button>

          <p className={styles.inputNote}>
            1回の送信で相談1回を消費します。送信後の取り消しはできません。返答は保存されます。
          </p>
        </div>
      )}
    </section>
  );
}
