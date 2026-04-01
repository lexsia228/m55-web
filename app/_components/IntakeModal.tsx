'use client';

/**
 * M55 Release-Night Intake Modal (HTML玄関)
 * - First-access gate: nickname, birthdate, privacy checkbox (required)
 * - Guest mode: no account required
 * - Syncs to both ProfileRepository and legacy m55_profile_v1 for iframe compatibility
 * - Per M55_WEB_FIRST_ACCESS_SSOT, M55_FREE_CORE_TO_DTR_CONCIERGE_FUNNEL_SSOT
 */
import { useState } from 'react';
import Link from 'next/link';
import { ProfileRepository } from '../../lib/soul/profile';

const INTAKE_COMPLETE_KEY = 'm55_intake_complete_v1';
const LEGACY_PROFILE_KEY = 'm55_profile_v1';

export function isIntakeComplete(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(INTAKE_COMPLETE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setIntakeComplete(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INTAKE_COMPLETE_KEY, '1');
  } catch {
    /* no-op */
  }
}

function syncToLegacyProfile(nickname: string, birthDate: string): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = { nickname: nickname.trim(), birthDateISO: birthDate };
    localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify(payload));
  } catch {
    /* no-op */
  }
}

export default function IntakeModal({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nick = nickname.trim();
    if (!nick) {
      setError('ニックネームを入力してください');
      return;
    }
    if (!birthDate) {
      setError('生年月日を入力してください');
      return;
    }
    if (!privacyChecked) {
      setError('プライバシーポリシーへの同意が必要です');
      return;
    }

    ProfileRepository.save(null, { nickname: nick, birthDate });
    syncToLegacyProfile(nick, birthDate);
    setIntakeComplete();
    window.dispatchEvent(new Event('m55:profile_updated'));
    onComplete?.();
  };

  const wrap: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
    padding: 16,
  };

  const panel: React.CSSProperties = {
    maxWidth: 400,
    width: '100%',
    background: '#fff',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  };

  const title: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 700,
    margin: '0 0 8px',
  };

  const sub: React.CSSProperties = {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
    margin: '0 0 20px',
    lineHeight: 1.5,
  };

  const label: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
    color: 'rgba(0,0,0,0.7)',
  };

  const input: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    border: '1px solid rgba(0,0,0,0.2)',
    borderRadius: 10,
    marginBottom: 16,
    boxSizing: 'border-box',
  };

  const checkboxRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
  };

  const cta: React.CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    fontSize: 15,
    fontWeight: 600,
    background: 'linear-gradient(135deg, #9aa3ff, #c3b5ff)',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    cursor: 'pointer',
  };

  const legalRow: React.CSSProperties = {
    marginTop: 16,
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
  };

  return (
    <div style={wrap} role="dialog" aria-modal="true" aria-labelledby="intake-title">
      <div style={panel}>
        <h1 id="intake-title" style={title}>
          はじめに
        </h1>
        <p style={sub}>
          あなたの輪郭を、静かに読み解く。まずは無料で、本質・今日・今週をお届けします。
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="intake-nickname" style={label}>
            ニックネーム
          </label>
          <input
            id="intake-nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="例）なお"
            style={input}
            autoComplete="nickname"
          />

          <label htmlFor="intake-birthdate" style={label}>
            生年月日
          </label>
          <input
            id="intake-birthdate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            style={input}
          />

          <div style={checkboxRow}>
            <input
              id="intake-privacy"
              type="checkbox"
              checked={privacyChecked}
              onChange={(e) => setPrivacyChecked(e.target.checked)}
              required
              aria-required="true"
            />
            <label htmlFor="intake-privacy" style={{ fontSize: 13, lineHeight: 1.5 }}>
              <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#6b66ff', textDecoration: 'underline' }}>
                プライバシーポリシー
              </Link>
              に同意する
            </label>
          </div>

          {error && (
            <p role="alert" style={{ color: '#c00', fontSize: 13, margin: '0 0 12px' }}>
              {error}
            </p>
          )}

          <button type="submit" style={cta}>
            無料で読み始める
          </button>
        </form>

        <p style={legalRow}>
          <Link href="/legal/tokushoho">特商法</Link>
          {' · '}
          <Link href="/legal/terms">利用規約</Link>
          {' · '}
          <Link href="/support">サポート</Link>
        </p>
      </div>
    </div>
  );
}
