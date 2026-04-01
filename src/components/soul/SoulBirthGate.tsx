'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { ProfileRepository, type BirthProfile } from '../../../lib/soul/profile';

export function SoulBirthGate() {
  const { user, isLoaded } = useUser();

  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    if (!isLoaded) return;

    if (ProfileRepository.exists(user ? user.id : null)) {
      setOpen(false);
      return;
    }

    if (ProfileRepository.isDismissedToday(user ? user.id : null)) {
      setOpen(false);
      return;
    }

    const pre = (user?.firstName || user?.username || '').trim();
    if (pre && !nickname) setNickname(pre);

    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  const onSave = () => {
    if (!nickname.trim() || !birthDate) return;

    const profile: BirthProfile = { nickname: nickname.trim(), birthDate };
    ProfileRepository.save(user ? user.id : null, profile);

    window.dispatchEvent(new Event('m55:profile_updated'));
    setOpen(false);
  };

  const onLater = () => {
    ProfileRepository.dismissForToday(user ? user.id : null);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-black/80 p-5">
        <div className="text-sm text-white/80">はじめに</div>
        <div className="mt-2 text-xs text-white/55">
          ニックネームと生年月日は、この端末にだけ静かに保存されます。
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-[11px] text-white/45">ニックネーム</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white/85 outline-none"
              placeholder="例）t"
              autoComplete="nickname"
            />
          </div>

          <div>
            <label className="block text-[11px] text-white/45">生年月日</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white/85 outline-none"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onLater} className="flex-1 rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm text-white/70">
            後で
          </button>
          <button onClick={onSave} className="flex-1 rounded-md bg-white/90 px-3 py-2 text-sm text-black">
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}