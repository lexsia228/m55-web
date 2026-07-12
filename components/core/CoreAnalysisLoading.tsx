'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ensureSealedCoreResult } from '../../lib/m55/coreResult/store';
import { GUEST_PROFILE_HANDOFF_COPY_V1 } from '../../lib/m55/freeResult/guestFreeJourneyCopyV1';
import { ProfileRepository } from '../../lib/soul/profile';
import styles from './CoreAnalysisLoading.module.css';

const HANDOFF_MS = 320;

type Props = {
  open: boolean;
  ownerId: string | null;
  onComplete: () => void;
  onError: (message: string) => void;
};

/**
 * Post-profile handoff — short deterministic transition only (no fake analysis).
 */
export default function CoreAnalysisLoading({ open, ownerId, onComplete, onError }: Props) {
  const id = useId();
  const labelId = `${id}-label`;
  const [portalReady, setPortalReady] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const profile = ProfileRepository.get(ownerId);
    let processErr: string | null = null;
    try {
      if (!profile?.birthDate || !profile.nickname?.trim()) {
        processErr = 'プロフィールが見つかりません。';
      } else {
        ensureSealedCoreResult(ownerId, profile);
      }
    } catch (e) {
      processErr = e instanceof Error ? e.message : '読み取りに失敗しました。';
    }

    if (processErr) {
      onErrorRef.current(processErr);
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ms = reduced ? 0 : HANDOFF_MS;
    const timer = window.setTimeout(() => onCompleteRef.current(), ms);
    return () => window.clearTimeout(timer);
  }, [open, ownerId]);

  if (!portalReady || !open) return null;

  return createPortal(
    <div
      className={styles.root}
      role="region"
      aria-busy="true"
      aria-labelledby={labelId}
      data-testid="m55-core-analysis-loading"
    >
      <div className={styles.panel}>
        <p id={labelId} className={styles.stepText}>
          {GUEST_PROFILE_HANDOFF_COPY_V1.leadJa}
        </p>
        <p className={styles.stepText}>{GUEST_PROFILE_HANDOFF_COPY_V1.subJa}</p>
      </div>
    </div>,
    document.body,
  );
}
