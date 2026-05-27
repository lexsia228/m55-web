'use client';

/**
 * Purchaser-only concierge room.
 * M55_REPORT_CONCIERGE_ROOM_SSOT_v1 + M55_AI_CONSULT_SAFETY_AND_LIMITS_SSOT_v1
 *
 * Constraints:
 * - Shows only when ownership is confirmed (server gate already checked).
 * - Input: min=10, warning=450, hard max=500 chars.
 * - Output target: 700-900 chars, hard cap 1000.
 * - Thread cap display: 5 tickets per report (included 1 + purchased max 4).
 * - Read-only when credits_remaining=0 (prior messages remain visible).
 * - Add-on CTA: room-only, no public lane.
 * - No generic public chat wording.
 *
 * Hardening (2026-03-25):
 * - sendLock ref prevents double-submit before React state updates.
 * - Microcopy aligned with SSOT §5.2 (no urgency/shame/failure wording).
 * - High-risk block response shows safe guidance only.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { REPLY_TICKET_TOTAL_CAP_PER_REPORT } from '../../lib/m55/reply/replyTicketCheckoutConstants';
import styles from './ConsultRoom.module.css';

const INPUT_MIN = 10;
const INPUT_WARN = 450;
const INPUT_MAX = 500;
const DISPLAY_CAP_PER_REPORT = REPLY_TICKET_TOTAL_CAP_PER_REPORT;

/** 用途ラベル（往復券・1テーマ）— 保存版の型に当てはめて返書で深める軸 */
const THEMES = [
  '近い人との距離',
  '言葉を選びすぎる場面',
  '断れなかったあとの疲れ',
  '平気なふりのしんどさ',
  'ひとりで戻る時間',
] as const;

type Theme = (typeof THEMES)[number];

const SUPPLEMENTARY_QUESTIONS: { id: string; label: string }[] = [
  { id: 'q1', label: '大切な人にほど言葉を飲み込んでしまう' },
  { id: 'q2', label: '断れなかったあとに強く疲れを感じる' },
  { id: 'q3', label: 'わかってほしいのに、うまく伝えられない' },
  { id: 'q4', label: 'ひとりで落ち着く時間が足りていない' },
  { id: 'q5', label: '平気なふりをして、後からしんどくなる' },
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
  effective_credits_remaining?: number;
  effective_state?: 'writable' | 'read_only';
  wallet?: {
    initial_included_count: number;
    purchased_count: number;
    consumed_count: number;
    available_count: number;
    status: string;
  } | null;
  has_wallet_row?: boolean;
  report_instance_id?: string | null;
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
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(() => new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendLock = useRef(false);
  const skipInitialThreadScrollRef = useRef(true);
  const checkoutReturnRefreshDoneRef = useRef(false);
  const activeIdempotencyKeyRef = useRef<string | null>(null);
  const activeSnapshotHashRef = useRef<string | null>(null);

  const composedMessage = useMemo(
    () => buildComposedMessage(selectedTheme, selectedQuestionIds, inputText),
    [selectedTheme, selectedQuestionIds, inputText]
  );

  const composedLen = composedMessage.length;
  const isOverMax = composedLen > INPUT_MAX;
  const isUnderMin = composedMessage.trim().length < INPUT_MIN;
  const isWarn = composedLen >= INPUT_WARN && !isOverMax;

  const reloadRoom = useCallback(async (cancelledRef?: { cancelled: boolean }) => {
    try {
      const res = await fetch('/api/room/core', { cache: 'no-store' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (!cancelledRef?.cancelled) {
          setLoadError((d as { error?: string }).error ?? `読み込みエラー (${res.status})`);
        }
        return;
      }
      const data = await res.json();
      if (!cancelledRef?.cancelled) {
        setLoadError(null);
        setRoomData(data as RoomData);
      }
    } catch {
      if (!cancelledRef?.cancelled) {
        setLoadError('ルームの読み込みに失敗しました。ページを再読み込みしてください。');
      }
    }
  }, []);

  useEffect(() => {
    const cancelledRef = { cancelled: false };
    void reloadRoom(cancelledRef);
    return () => {
      cancelledRef.cancelled = true;
    };
  }, [reloadRoom]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    if (checkout !== 'complete' && checkout !== 'cancelled') {
      checkoutReturnRefreshDoneRef.current = false;
      return;
    }
    if (checkoutReturnRefreshDoneRef.current) return;
    checkoutReturnRefreshDoneRef.current = true;
    void reloadRoom();
  }, [reloadRoom]);

  useEffect(() => {
    const onFocus = () => {
      void reloadRoom();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [reloadRoom]);

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

  const buildSnapshotHash = (
    msg: string,
    theme: Theme | null,
    questionIds: Set<string>
  ): string => `${theme ?? ''}|${[...questionIds].sort().join(',')}|${msg}`;

  const handleSend = async () => {
    if (sendLock.current) return;
    if (!roomData) return;
    if (!selectedTheme) return;

    const msg = composedMessage.trim();
    if (msg.length < INPUT_MIN) return;
    if (msg.length > INPUT_MAX) return;
    const liveWallet = roomData.wallet ?? null;
    const liveHasWalletRow = roomData.has_wallet_row === true;
    const liveWalletUsable =
      Boolean(liveWallet) &&
      liveHasWalletRow &&
      liveWallet?.status === 'active';
    const liveWalletAvailable = liveWallet?.available_count ?? 0;
    const liveEffectiveRemaining = liveWalletUsable
      ? liveWalletAvailable
      : typeof roomData.effective_credits_remaining === 'number'
        ? roomData.effective_credits_remaining
        : roomData.thread.credits_remaining;
    const liveEffectiveState = liveWalletUsable
      ? (liveEffectiveRemaining > 0 ? 'writable' : 'read_only')
      : roomData.effective_state ?? roomData.thread.state;
    if (liveEffectiveState !== 'writable') return;
    if (liveEffectiveRemaining <= 0) return;

    const snapshot = {
      free: inputText,
      questions: new Set(selectedQuestionIds),
      theme: selectedTheme,
    };

    const snapshotHash = buildSnapshotHash(msg, selectedTheme, selectedQuestionIds);
    if (activeSnapshotHashRef.current !== snapshotHash) {
      activeIdempotencyKeyRef.current = crypto.randomUUID();
      activeSnapshotHashRef.current = snapshotHash;
    }
    const idempotencyKey = activeIdempotencyKeyRef.current!;

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
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
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
      activeIdempotencyKeyRef.current = null;
      activeSnapshotHashRef.current = null;
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

  const messageForCheckoutError = (code?: string): string => {
    switch (code) {
      case 'unauthenticated':
        return 'サインインの状態を確認してください。';
      case 'forbidden_not_owner':
        return 'このレポートの利用権限を確認できませんでした。';
      case 'wallet_not_found':
        return '返書チケット情報が見つかりませんでした。';
      case 'wallet_not_active':
        return '現在、追加購入を受け付けていません。';
      case 'cap_reached':
        return 'このレポートでの追加相談返書は上限に達しています。';
      case 'invalid_request':
      case 'invalid_product':
        return '購入リクエストを確認してください。';
      case 'stripe_error':
      default:
        return '決済の準備に失敗しました。時間をおいてもう一度お試しください。';
    }
  };

  const handlePurchase = async () => {
    if (!roomData) return;
    const reportInstanceId =
      typeof roomData.report_instance_id === 'string' && roomData.report_instance_id.trim().length > 0
        ? roomData.report_instance_id.trim()
        : null;
    if (!reportInstanceId || checkoutBusy) return;

    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/reply-tickets/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reportInstanceId,
          productKey: 'additional_reply_ticket',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        checkout_url?: string;
        error?: { code?: string };
      };
      if (!res.ok) {
        setCheckoutError(messageForCheckoutError(data.error?.code));
        return;
      }
      if (typeof data.checkout_url === 'string' && data.checkout_url.length > 0) {
        window.location.assign(data.checkout_url);
        return;
      }
      setCheckoutError('決済ページの作成に失敗しました。時間をおいてもう一度お試しください。');
    } catch {
      setCheckoutError('通信に失敗しました。時間をおいてもう一度お試しください。');
    } finally {
      setCheckoutBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className={styles.room} aria-label="相談返書ルーム">
        <p className={styles.errorMsg}>{loadError}</p>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className={styles.room} aria-label="相談返書ルーム">
        <p className={styles.loading}>読み込み中…</p>
      </div>
    );
  }

  const { thread, messages } = roomData;
  const wallet = roomData.wallet ?? null;
  const hasWalletRow = roomData.has_wallet_row === true;
  const walletUsable =
    Boolean(wallet) && hasWalletRow && wallet!.status === 'active';
  const effectiveRemaining =
    walletUsable
      ? wallet!.available_count
      : typeof roomData.effective_credits_remaining === 'number'
        ? roomData.effective_credits_remaining
        : thread.credits_remaining;
  const effectiveState =
    walletUsable
      ? (effectiveRemaining > 0 ? 'writable' : 'read_only')
      : roomData.effective_state ?? thread.state;
  const isReadOnly = effectiveState === 'read_only' || effectiveRemaining <= 0;
  const reportInstanceId =
    typeof roomData.report_instance_id === 'string' && roomData.report_instance_id.trim().length > 0
      ? roomData.report_instance_id.trim()
      : null;
  const walletLoading = !wallet || !hasWalletRow;
  const walletTotal = wallet ? wallet.initial_included_count + wallet.purchased_count : 0;
  const walletReachedLimit =
    walletTotal >= DISPLAY_CAP_PER_REPORT || (wallet?.purchased_count ?? 0) >= 4;
  const walletCanPurchase =
    !walletLoading &&
    wallet!.available_count === 0 &&
    wallet!.status === 'active' &&
    walletTotal < DISPLAY_CAP_PER_REPORT &&
    wallet!.purchased_count < 4 &&
    Boolean(reportInstanceId);

  const usageLine = walletLoading
    ? '残数確認中'
    : wallet!.available_count > 0
      ? `残り ${wallet!.available_count}件`
      : walletReachedLimit
        ? '上限到達'
        : '残り 0件';

  const actionLocked = sending || checkoutBusy || walletLoading;
  const submitDisabled =
    actionLocked || sending || !selectedTheme || isOverMax || isUnderMin || isReadOnly;

  return (
    <section className={styles.room} aria-label="相談返書ルーム（purchaser-only）">
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
            {!walletLoading ? (
              <span className={styles.usageSub}>（合計{DISPLAY_CAP_PER_REPORT}件まで）</span>
            ) : null}
          </p>
        </div>
      </header>

      {walletLoading ? (
        <div className={styles.readOnlyNotice} role="status" aria-live="polite">
          <p className={styles.readOnlyText}>残数確認中です。しばらくお待ちください。</p>
        </div>
      ) : wallet!.available_count > 0 ? (
        <div className={styles.readOnlyNotice} role="status" aria-live="polite">
          <p className={styles.readOnlyText}>
            相談返書チケット 残り {wallet!.available_count}件 / 合計{DISPLAY_CAP_PER_REPORT}件まで
          </p>
          <p className={styles.addOnNote}>この本質の読み解きに紐づいて、4章の内容を深掘りできます。</p>
        </div>
      ) : walletReachedLimit ? (
        <div className={styles.readOnlyNotice} role="status" aria-live="polite">
          <p className={styles.readOnlyText}>
            このレポートで利用できる追加相談返書は上限に達しました。
          </p>
          <p className={styles.addOnNote}>付属1件 + 追加購入4件までが上限です。</p>
        </div>
      ) : walletCanPurchase ? (
        <div className={styles.readOnlyNotice} role="status" aria-live="polite">
          <p className={styles.readOnlyText}>追加相談返書 1件 500円</p>
          <p className={styles.addOnNote}>この本質の読み解きの相談をもう一度整理できます。</p>
          {checkoutError ? <p className={styles.sendError} role="alert">{checkoutError}</p> : null}
          <button
            type="button"
            className={checkoutBusy ? `${styles.submitBtn} ${styles.submitBtnDisabled}` : styles.submitBtn}
            onClick={handlePurchase}
            disabled={checkoutBusy || actionLocked || !reportInstanceId}
          >
            {checkoutBusy ? '処理中…' : '追加相談返書 1件 500円'}
          </button>
        </div>
      ) : !reportInstanceId ? (
        <div className={styles.readOnlyNotice} role="status" aria-live="polite">
          <p className={styles.readOnlyText}>
            追加購入に必要なレポート情報を確認できないため、購入操作を表示していません。
          </p>
        </div>
      ) : isReadOnly ? (
        <div className={styles.readOnlyNotice} role="status" aria-live="polite">
          <p className={styles.readOnlyText}>
            返書チケットの上限に達しました。これまでのやりとりは引き続き確認できます。
          </p>
          {wallet!.status !== 'active' && (
            <p className={styles.addOnNote}>
              返書チケットの追加はこのルーム内でのみ申し込み可能です。上限は合計
              {DISPLAY_CAP_PER_REPORT}件です。
            </p>
          )}
        </div>
      ) : null}

      <div className={styles.messages} role="log" aria-label="相談返書のやりとり" aria-live="polite">
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
          <p className={styles.composeGroundingHint}>
            相談返書は、購入した保存版レポートの章に沿って深掘りするためのものです。別テーマの質問や、レポートと関係のない相談にはお答えできません。
          </p>
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
              相談内容を入力（全体で{INPUT_MIN}〜{INPUT_MAX}文字）
            </label>
            <textarea
              id="consult-input"
              className={styles.textarea}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="今気になっていること、整理したいことがあればご記入ください"
              rows={6}
              maxLength={INPUT_MAX + 80}
              disabled={actionLocked}
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
              '相談返書を作成する'
            )}
          </button>

          <p className={styles.inputNote}>
            1回の送信で返書チケット1件を消費します。送信後の取り消しはできません。返書は保存されます。
          </p>
        </div>
      )}
    </section>
  );
}
