'use client';

import { useEffect, useId, useRef, useState, type ClipboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ProfileRepository, type BirthProfile } from '../../lib/soul/profile';
import { GUEST_PROFILE_INTAKE_COPY_V1 } from '../../lib/m55/freeResult/guestFreeJourneyCopyV1';
import {
  parseFlexibleDobInput,
  partsFromIsoDate,
  validateSegmentedDob,
  type SegmentedDobParts,
} from '../../lib/m55/freeResult/segmentedDobInputV1';
import styles from './BirthProfileIntakeLayer.module.css';
import dobStyles from '../core/CoreExperience.module.css';

type Props = {
  open: boolean;
  ownerId: string | null;
  nicknameHint?: string;
  onClose: () => void;
  onSaved: () => void;
  /** E2E など用（例: m55-home-birth-intake-layer / m55-core-birth-intake-layer） */
  dataTestId?: string;
};

function SegmentedDobFieldsInline({
  birthDate,
  onBirthDateChange,
}: {
  birthDate: string;
  onBirthDateChange: (iso: string) => void;
}) {
  const initial = partsFromIsoDate(birthDate) ?? { year: '', month: '', day: '' };
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [errorJa, setErrorJa] = useState<string | null>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const parts = partsFromIsoDate(birthDate);
    if (!parts) return;
    setYear(parts.year);
    setMonth(parts.month);
    setDay(parts.day);
  }, [birthDate]);

  function applyParts(parts: SegmentedDobParts) {
    setYear(parts.year);
    setMonth(parts.month);
    setDay(parts.day);
  }

  function syncValidDate(parts: SegmentedDobParts) {
    const result = validateSegmentedDob(parts);
    if (result.ok) {
      setErrorJa(null);
      applyParts(result.parts);
      onBirthDateChange(result.birthDate);
    } else {
      onBirthDateChange('');
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const text = event.clipboardData.getData('text');
    const parts = parseFlexibleDobInput(text);
    if (!parts) return;
    event.preventDefault();
    applyParts(parts);
    syncValidDate(parts);
    dayRef.current?.focus();
  }

  return (
    <div
      className={dobStyles.freeSegmentedDobRow}
      onPaste={handlePaste}
      data-testid="m55-free-segmented-dob"
    >
      <label className={dobStyles.freeSegmentedDobField}>
        <span className={dobStyles.visuallyHidden}>年</span>
        <input
          ref={yearRef}
          className={dobStyles.freeSegmentedDobInputYear}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="bday-year"
          maxLength={4}
          placeholder="YYYY"
          value={year}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
            setYear(digits);
            setErrorJa(null);
            if (digits.length === 4) monthRef.current?.focus();
            syncValidDate({ year: digits, month, day });
          }}
          aria-label="年"
        />
        <span className={dobStyles.freeSegmentedDobUnit} aria-hidden>
          年
        </span>
      </label>
      <label className={dobStyles.freeSegmentedDobField}>
        <span className={dobStyles.visuallyHidden}>月</span>
        <input
          ref={monthRef}
          className={dobStyles.freeSegmentedDobInputMonth}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="bday-month"
          maxLength={2}
          placeholder="MM"
          value={month}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
            setMonth(digits);
            setErrorJa(null);
            if (digits.length === 2) dayRef.current?.focus();
            syncValidDate({ year, month: digits, day });
          }}
          aria-label="月"
        />
        <span className={dobStyles.freeSegmentedDobUnit} aria-hidden>
          月
        </span>
      </label>
      <label className={dobStyles.freeSegmentedDobField}>
        <span className={dobStyles.visuallyHidden}>日</span>
        <input
          ref={dayRef}
          className={dobStyles.freeSegmentedDobInputDay}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="bday-day"
          maxLength={2}
          placeholder="DD"
          value={day}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
            setDay(digits);
            setErrorJa(null);
            syncValidDate({ year, month, day: digits });
          }}
          aria-label="日"
        />
        <span className={dobStyles.freeSegmentedDobUnit} aria-hidden>
          日
        </span>
      </label>
      {errorJa ? (
        <p className={dobStyles.freeSegmentedDobError} role="alert">
          {errorJa}
        </p>
      ) : null}
    </div>
  );
}

/**
 * ニックネーム＋生年月日の保存モーダル。Home・/core で同一 UI を共有する。
 */
export default function BirthProfileIntakeLayer({
  open,
  ownerId,
  nicknameHint = '',
  onClose,
  onSaved,
  dataTestId = 'm55-birth-profile-intake-layer',
}: Props) {
  const id = useId();
  const nickId = `${id}-nick`;
  const nickRef = useRef<HTMLInputElement>(null);
  const [birthDate, setBirthDate] = useState('');
  const [nickname, setNickname] = useState('');
  const [portalReady, setPortalReady] = useState(false);
  const [dobError, setDobError] = useState<string | null>(null);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setBirthDate('');
      setNickname('');
      setDobError(null);
      return;
    }
    const existing = ProfileRepository.get(ownerId);
    const hint = nicknameHint.trim() || existing?.nickname?.trim() || '';
    if (hint) setNickname(hint);
    if (existing?.birthDate?.trim()) {
      setBirthDate(existing.birthDate.trim().slice(0, 10));
    }
    const t = window.setTimeout(() => nickRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, nicknameHint, ownerId]);

  const handleSave = () => {
    const nick = nickname.trim();
    const bday = birthDate.trim();
    if (!nick) return;
    const validated = validateSegmentedDob(partsFromIsoDate(bday) ?? { year: '', month: '', day: '' });
    if (!validated.ok) {
      setDobError(validated.errorJa);
      return;
    }
    setDobError(null);

    const profile: BirthProfile = { nickname: nick, birthDate: validated.birthDate };
    ProfileRepository.save(ownerId, profile);
    window.dispatchEvent(new Event('m55:profile_updated'));
    onSaved();
    onClose();
  };

  const canSave = nickname.trim().length > 0 && birthDate.trim().length > 0;

  if (!portalReady || !open) return null;

  return createPortal(
    <div
      className={styles.root}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      data-testid={dataTestId}
    >
      <button
        type="button"
        className={styles.overlay}
        aria-label="閉じる"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className={styles.panel}>
        <h2 id={`${id}-title`} className={styles.title}>
          {GUEST_PROFILE_INTAKE_COPY_V1.titleJa}
        </h2>
        <p className={styles.lead}>{GUEST_PROFILE_INTAKE_COPY_V1.leadJa}</p>
        <p className={styles.lead} style={{ fontSize: '0.82rem', opacity: 0.88 }}>
          {GUEST_PROFILE_INTAKE_COPY_V1.loginHintJa}
        </p>

        <div className={styles.fieldBlock}>
          <label htmlFor={nickId} className={`${styles.fieldRow} ${styles.textInputWrap}`}>
            <span className={styles.fieldLabel}>ニックネーム</span>
            <input
              ref={nickRef}
              id={nickId}
              type="text"
              name="nickname"
              autoComplete="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className={styles.textInput}
              placeholder="表示名"
            />
          </label>
        </div>

        <div className={`${styles.fieldBlock} ${styles.fieldGap}`}>
          <span className={styles.fieldLabel}>生年月日</span>
          <SegmentedDobFieldsInline birthDate={birthDate} onBirthDateChange={setBirthDate} />
          {dobError ? (
            <p className={dobStyles.freeSegmentedDobError} role="alert">
              {dobError}
            </p>
          ) : null}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            閉じる
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={!canSave}
            data-testid="m55-birth-intake-start"
          >
            {GUEST_PROFILE_INTAKE_COPY_V1.primaryActionJa}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
