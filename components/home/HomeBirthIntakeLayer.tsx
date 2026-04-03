'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ProfileRepository, type BirthProfile } from '../../lib/soul/profile';
import styles from './HomeBirthIntakeLayer.module.css';

type Props = {
  open: boolean;
  ownerId: string | null;
  /** Prefill hint (e.g. Clerk firstName) — user may edit */
  nicknameHint?: string;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Home-only: nickname + birth date required; CTA-opened only.
 * Native dialog element + ::backdrop — top layer, viewport-centered.
 */
export default function HomeBirthIntakeLayer({
  open,
  ownerId,
  nicknameHint = '',
  onClose,
  onSaved,
}: Props) {
  const id = useId();
  const birthId = `${id}-birth`;
  const nickId = `${id}-nick`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const birthRef = useRef<HTMLInputElement>(null);
  const nickRef = useRef<HTMLInputElement>(null);
  const [birthDate, setBirthDate] = useState('');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setBirthDate('');
      setNickname('');
      return;
    }
    const hint = nicknameHint.trim();
    if (hint) setNickname(hint);
    const t = window.setTimeout(() => nickRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, nicknameHint]);

  const handleSave = () => {
    const nick = nickname.trim();
    const bday = birthDate.trim();
    if (!nick || !bday) return;

    const profile: BirthProfile = { nickname: nick, birthDate: bday };
    ProfileRepository.save(ownerId, profile);
    window.dispatchEvent(new Event('m55:profile_updated'));
    onSaved();
    onClose();
  };

  const rowActivateBirth = () => {
    const el = birthRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        /* fall through */
      }
    }
    el.focus();
  };

  const canSave = nickname.trim().length > 0 && birthDate.trim().length > 0;

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      data-testid="m55-home-birth-intake-layer"
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialogRef.current?.close();
      }}
    >
      <div
        className={styles.panel}
        role="document"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={`${id}-title`} className={styles.title}>
          プロフィールを保存
        </h2>
        <p className={styles.lead}>
          端末に保存され、本質・今日・今週の無料読み取りが開きます。マイページでいつでも変更できます。
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
          <label
            htmlFor={birthId}
            className={styles.fieldRow}
            onClick={(e) => {
              if (e.target === birthRef.current) return;
              rowActivateBirth();
            }}
          >
            <span className={styles.fieldLabel}>生年月日</span>
            <input
              ref={birthRef}
              id={birthId}
              type="date"
              name="bday"
              autoComplete="bday"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={styles.dateInput}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
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
          >
            保存して開く
          </button>
        </div>
      </div>
    </dialog>
  );
}
