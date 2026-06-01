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
import {
  PAID_DTR_CONSULT_REPLY,
  PAID_DTR_CONSULT_ROOM_UI,
} from '../../lib/m55/paidDtrProductCopy';
import ConsultReplyCard from './ConsultReplyCard';
import styles from './ConsultRoom.module.css';

const INPUT_MIN = 10;
const INPUT_WARN = 450;
const INPUT_MAX = 500;
const DISPLAY_CAP_PER_REPORT = PAID_DTR_CONSULT_REPLY.totalCapPerReport;

/** Room-only display copy (Product Truth constants unchanged). */
const ROOM_UI_COPY = {
  roomLeadShort:
    '保存版に紐づいて、今の1テーマを章に沿って整理します。汎用チャットではなく、無制限の相談でもありません。',
  valueCardTitle: 'この1件で返ってくるもの',
  valueItems: [
    '今の場面の整理',
    '保存版から見る見方',
    '別視点（少しほどく見方）',
    '今日の一手',
  ] as const,
  valueCardNote:
    '保存版の章に沿った整理です。結果や未来の保証ではありません。',
  composePanelTitle: '新しく相談する',
  historyTitle: 'これまでの相談返書',
  step1Title: 'Step 1 用途を選ぶ',
  step1Badge: '必須',
  step1Hint: '1テーマだけ選びます。迷ったら、いちばん近いものを選んでください。',
  step2Title: 'Step 2 相談を書く',
  step2Hint: `1テーマに絞って書きます（${INPUT_MIN}〜${INPUT_MAX}文字）。短文でも構いません。`,
  step3Title: 'Step 3 相談返書を作成する',
  step3Consume: 'この送信で相談返書を1件使用します。',
  purchaseValue:
    '500円で、保存版の章に沿って今の1テーマを整理し、別視点と今日の一手まで返します。',
} as const;

/** 用途ラベル（1テーマ）— copy master themeExamplesJa */
const THEMES = PAID_DTR_CONSULT_REPLY.themeExamplesJa;

type Theme = (typeof PAID_DTR_CONSULT_REPLY.themeExamplesJa)[number];

const SUPPLEMENTARY_QUESTIONS: { id: string; label: string }[] = [
  { id: 'q1', label: '恋人や近い人に、どう伝えればいいか迷っている' },
  { id: 'q2', label: '仕事やスキルで、いま伸ばすところが分からない' },
  { id: 'q3', label: 'お金や生活の不安で、気持ちが落ち着かない' },
  { id: 'q4', label: 'これから何を優先すればいいか迷っている' },
  { id: 'q5', label: '疲れていて、まずどこから戻せばいいか知りたい' },
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
  stemIdx: number;
};

function extractThemeAndQuoteFromUserMessage(content: string): { theme: string | null; quote: string | null } {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const themeLine = lines.find((line) => line.startsWith('【テーマ】'));
  const theme = themeLine ? themeLine.replace('【テーマ】', '').trim() : null;
  const quoteLine = lines.find((line) => !line.startsWith('【テーマ】') && !line.startsWith('【補助'));
  return {
    theme,
    quote: quoteLine ?? null,
  };
}

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

export default function ConsultRoom({ birthDate, nickname, stemIdx }: Props) {
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
  /** True only after user send; reload/checkout/focus must not scroll the thread. */
  const shouldScrollThreadToEndRef = useRef(false);
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
    if (!shouldScrollThreadToEndRef.current) return;
    if (roomData.messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomData?.messages]);

  useEffect(() => {
    if (sending || !shouldScrollThreadToEndRef.current) return;
    const id = requestAnimationFrame(() => {
      shouldScrollThreadToEndRef.current = false;
    });
    return () => cancelAnimationFrame(id);
  }, [sending]);

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
    shouldScrollThreadToEndRef.current = true;

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
        shouldScrollThreadToEndRef.current = false;
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
      shouldScrollThreadToEndRef.current = false;
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
        return '相談返書の利用情報が見つかりませんでした。';
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
      <div className={styles.room} aria-label={PAID_DTR_CONSULT_ROOM_UI.ariaLabelJa}>
        <p className={styles.errorMsg}>{loadError}</p>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className={styles.room} aria-label={PAID_DTR_CONSULT_ROOM_UI.ariaLabelJa}>
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

  const usedCount = wallet?.consumed_count ?? 0;
  const additionalPurchasableCount = wallet
    ? Math.max(0, PAID_DTR_CONSULT_REPLY.additionalMaxPurchased - wallet.purchased_count)
    : 0;

  const actionLocked = sending || checkoutBusy || walletLoading;
  const submitDisabled =
    actionLocked || sending || !selectedTheme || isOverMax || isUnderMin || isReadOnly;
  const showComposeFirst = !walletLoading && effectiveRemaining > 0 && !isReadOnly;

  const usageStatusCard = walletLoading ? (
    <div className={styles.usageStatusCard} role="status" aria-live="polite">
      <p className={styles.usageLoadingText}>{PAID_DTR_CONSULT_ROOM_UI.walletLoadingJa}</p>
    </div>
  ) : wallet ? (
    <div className={styles.usageStatusCard} aria-live="polite">
      <p className={styles.usageStatusLabel}>{PAID_DTR_CONSULT_ROOM_UI.usageLabelJa}</p>
      <p className={styles.usageHero}>
        残り <span className={styles.usageHeroNum}>{wallet.available_count}</span> 件
      </p>
      <p className={styles.usageStat}>
        {PAID_DTR_CONSULT_ROOM_UI.usageUsedCountLabelJa}{' '}
        <span className={styles.usageStatNum}>
          {usedCount} / {DISPLAY_CAP_PER_REPORT}件
        </span>
      </p>
      <p className={styles.usageStat}>
        {PAID_DTR_CONSULT_ROOM_UI.usageAdditionalPurchasableLabelJa}{' '}
        <span className={styles.usageStatNum}>{additionalPurchasableCount}件</span>
      </p>
    </div>
  ) : null;

  const valueDeliverablesCard = !walletLoading ? (
    <div className={styles.valueDeliverablesCard}>
      <h3 className={styles.valueDeliverablesTitle}>{ROOM_UI_COPY.valueCardTitle}</h3>
      <ol className={styles.valueDeliverablesList}>
        {ROOM_UI_COPY.valueItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <p className={styles.valueDeliverablesNote}>{ROOM_UI_COPY.valueCardNote}</p>
    </div>
  ) : null;

  const statusNotice =
    walletLoading ? null : walletReachedLimit ? (
      <div className={styles.readOnlyNotice} role="status" aria-live="polite">
        <p className={styles.readOnlyText}>
          {PAID_DTR_CONSULT_ROOM_UI.usageAdditionalPurchasableLabelJa} 0件
        </p>
        <p className={styles.readOnlyText}>{PAID_DTR_CONSULT_ROOM_UI.limitReachedAdditionalJa}</p>
        <p className={styles.addOnNote}>{PAID_DTR_CONSULT_REPLY.capSummaryJa}</p>
      </div>
    ) : walletCanPurchase ? (
      <div className={styles.readOnlyNotice} role="status" aria-live="polite">
        <p className={styles.purchaseValueNote}>{ROOM_UI_COPY.purchaseValue}</p>
        <p className={styles.readOnlyText}>{PAID_DTR_CONSULT_REPLY.additionalPriceLabelJa}</p>
        <p className={styles.addOnNote}>{PAID_DTR_CONSULT_ROOM_UI.walletPurchaseRetryNoteJa}</p>
        {checkoutError ? <p className={styles.sendError} role="alert">{checkoutError}</p> : null}
        <button
          type="button"
          className={checkoutBusy ? `${styles.submitBtn} ${styles.submitBtnDisabled}` : styles.submitBtn}
          onClick={handlePurchase}
          disabled={checkoutBusy || actionLocked || !reportInstanceId}
        >
          {checkoutBusy ? '処理中…' : PAID_DTR_CONSULT_REPLY.additionalPriceLabelJa}
        </button>
      </div>
    ) : !reportInstanceId ? (
      <div className={styles.readOnlyNotice} role="status" aria-live="polite">
        <p className={styles.readOnlyText}>{PAID_DTR_CONSULT_ROOM_UI.cannotPurchaseReportInfoJa}</p>
      </div>
    ) : isReadOnly ? (
      <div className={styles.readOnlyNotice} role="status" aria-live="polite">
        <p className={styles.readOnlyText}>{PAID_DTR_CONSULT_ROOM_UI.limitReachedReadOnlyJa}</p>
        {wallet!.status !== 'active' && (
          <p className={styles.addOnNote}>
            {PAID_DTR_CONSULT_ROOM_UI.purchaseOnlyInRoomPrefixJa}
            {DISPLAY_CAP_PER_REPORT}
            {PAID_DTR_CONSULT_ROOM_UI.purchaseOnlyInRoomSuffixJa}
          </p>
        )}
      </div>
    ) : wallet!.available_count > 0 ? (
      <p className={styles.roomContextNote}>{PAID_DTR_CONSULT_ROOM_UI.savedReportLinkNoteJa}</p>
    ) : null;

  const composeBlock = !isReadOnly ? (
    <div className={styles.composePanel}>
      <h3 className={styles.composePanelTitle}>{ROOM_UI_COPY.composePanelTitle}</h3>
      <p className={styles.composeGroundingHint}>{PAID_DTR_CONSULT_REPLY.groundedInReportJa}</p>

      <section className={styles.composeStep} aria-labelledby="consult-step-1">
        <div className={styles.composeStepHead}>
          <h4 id="consult-step-1" className={styles.composeStepTitle}>
            {ROOM_UI_COPY.step1Title}
          </h4>
          <span className={styles.composeStepBadgeRequired}>{ROOM_UI_COPY.step1Badge}</span>
        </div>
        <p className={styles.composeHintMuted}>{ROOM_UI_COPY.step1Hint}</p>
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

      <section className={styles.composeStep} aria-labelledby="consult-step-2">
        <div className={styles.composeStepHead}>
          <h4 id="consult-step-2" className={styles.composeStepTitle}>
            {ROOM_UI_COPY.step2Title}
          </h4>
        </div>
        <p className={styles.composeHintMuted}>{ROOM_UI_COPY.step2Hint}</p>
        <label htmlFor="consult-input" className={styles.srOnly}>
          {PAID_DTR_CONSULT_ROOM_UI.composeFreeInputAriaJa}
          {INPUT_MIN}〜{INPUT_MAX}文字）
        </label>
        <textarea
          id="consult-input"
          className={styles.textarea}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={PAID_DTR_CONSULT_ROOM_UI.inputPlaceholderJa}
          rows={5}
          maxLength={INPUT_MAX + 80}
          disabled={actionLocked}
          aria-describedby="char-counter"
        />
        <div className={styles.counterRow}>
          <span
            id="char-counter"
            className={isOverMax ? styles.counterOver : isWarn ? styles.counterWarn : styles.counter}
            aria-live="polite"
          >
            送信内容全体 {composedLen} / {INPUT_MAX}
            {selectedTheme == null && ' — テーマを選択してください'}
            {isWarn && ` — あと${INPUT_MAX - composedLen}文字`}
            {isOverMax && ' — 上限を超えています。短くしてください'}
          </span>
        </div>
      </section>

      <section className={styles.composeStepSubmit} aria-labelledby="consult-step-3">
        <h4 id="consult-step-3" className={styles.composeStepTitle}>
          {ROOM_UI_COPY.step3Title}
        </h4>
        <p className={styles.stepConsumeNote}>{ROOM_UI_COPY.step3Consume}</p>
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
              {PAID_DTR_CONSULT_ROOM_UI.submittingLabelJa}
            </span>
          ) : (
            PAID_DTR_CONSULT_ROOM_UI.submitLabelJa
          )}
        </button>
        <p className={styles.inputNote}>{PAID_DTR_CONSULT_REPLY.consumeNoteJa}</p>
      </section>
    </div>
  ) : null;

  const messagesBlock = (
    <div className={styles.historySection}>
      {messages.length > 0 ? (
        <h3 className={styles.historyTitle}>{ROOM_UI_COPY.historyTitle}</h3>
      ) : null}
      <div className={styles.messages} role="log" aria-label="相談返書のやりとり" aria-live="polite">
        {messages.length === 0 && !isReadOnly && (
          <p className={styles.emptyMsg}>{PAID_DTR_CONSULT_ROOM_UI.emptyThreadJa}</p>
        )}
        {messages.map((msg, i) => {
          if (msg.role === 'user') {
            const next = messages[i + 1];
            if (next?.role === 'assistant') {
              const extracted = extractThemeAndQuoteFromUserMessage(msg.content);
              if (extracted.quote) {
                return null;
              }
            }
            const extracted = extractThemeAndQuoteFromUserMessage(msg.content);
            return (
              <div key={msg.id ?? i} className={styles.msgUserCompact}>
                {extracted.theme ? <p className={styles.msgUserTheme}>テーマ {extracted.theme}</p> : null}
                <p className={styles.msgUserText}>{extracted.quote ?? msg.content}</p>
              </div>
            );
          }

          let linkedTheme: string | null = null;
          let linkedQuote: string | null = null;
          for (let j = i - 1; j >= 0; j -= 1) {
            const prev = messages[j];
            if (prev?.role === 'user') {
              const extracted = extractThemeAndQuoteFromUserMessage(prev.content);
              linkedTheme = extracted.theme;
              linkedQuote = extracted.quote;
              break;
            }
          }

          return (
            <ConsultReplyCard
              key={msg.id ?? i}
              assistantContent={msg.content}
              theme={linkedTheme}
              userQuote={linkedQuote}
              stemIdx={stemIdx}
              usedCount={usedCount}
              remainingCount={wallet?.available_count ?? effectiveRemaining}
              canPurchaseMoreCount={additionalPurchasableCount}
            />
          );
        })}
        {sending && (
          <p className={styles.msgPending} aria-live="polite">
            {PAID_DTR_CONSULT_ROOM_UI.generatingReplyJa}
          </p>
        )}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>
    </div>
  );

  return (
    <section className={styles.room} aria-label={PAID_DTR_CONSULT_ROOM_UI.ariaLabelJa}>
      <header className={styles.roomHeaderBar}>
        <h2 className={styles.roomTitle}>{PAID_DTR_CONSULT_ROOM_UI.roomTitleJa}</h2>
        <p className={styles.roomLead}>{ROOM_UI_COPY.roomLeadShort}</p>
      </header>

      <div className={styles.roomIntroStack}>
        {usageStatusCard}
        {valueDeliverablesCard}
      </div>

      {statusNotice}

      {showComposeFirst ? composeBlock : null}
      {sendError ? <p className={styles.sendError} role="alert">{sendError}</p> : null}
      {messagesBlock}
      {!showComposeFirst ? composeBlock : null}
    </section>
  );
}
