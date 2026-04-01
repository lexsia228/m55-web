/**
 * M55 SOUL MEMORY HOOK
 * - Provides reactive access to HeartLogRepository / BoostRepository
 * - Clerk user if present, otherwise guest device id is handled in repository
 */
import { useCallback, useEffect, useState } from 'react';
import { HeartLog, UserPlan, HeartLogType } from '../lib/soul/types';
import { HeartLogRepository, BoostRepository } from '../lib/soul/repository';
import { useUser } from '@clerk/nextjs';

export function useSoulMemory() {
  const { user, isLoaded } = useUser();
  const [logs, setLogs] = useState<HeartLog[]>([]);
  const [boostBalance, setBoostBalance] = useState<number>(0);

  const plan: UserPlan = (user?.publicMetadata?.plan as UserPlan) || 'FREE';

  const refresh = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!isLoaded) return;

    const uid = user ? user.id : null;
    setLogs(HeartLogRepository.getAuthorizedLogs(uid, plan));
    setBoostBalance(BoostRepository.getBalance(uid));
  }, [user, plan, isLoaded]);

  useEffect(() => { refresh(); }, [refresh]);

  const addLog = useCallback((type: HeartLogType, content: string, metadata?: Record<string, unknown>) => {
    const uid = user ? user.id : null;
    HeartLogRepository.save(uid, {
      type,
      content,
      metadata
    });
    refresh();
  }, [user, refresh]);

  const consumeBoost = useCallback((amount: number) => {
    const uid = user ? user.id : null;
    const cur = BoostRepository.getBalance(uid);
    if (cur < amount) return false;
    BoostRepository.add(uid, -amount);
    refresh();
    return true;
  }, [user, refresh]);

  return {
    logs,
    boostBalance,
    addLog,
    consumeBoost,
    refresh,
    isLoading: !isLoaded
  };
}
