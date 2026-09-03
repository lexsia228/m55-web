'use client';

import { useEffect, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import { ensureSealedCoreResult } from '../../lib/m55/coreResult/store';
import { resolveTraitIdentity } from '../../lib/m55/commercialUx/traitIdentityCatalog';
import { STATIC_FREE_TO_PAID_BRIDGE } from '../core/corePublicCopy';
import {
  isValidBasicInfo,
  resolveSelfFunnelStage,
} from '../../lib/m55/selfFunnel/selfFunnelRuntimeState';
import { readPersistedFunnel } from '../../lib/m55/selfFunnel/selfFunnelClientStore';
import { isCompleteFreeAnswerSet } from '../../lib/m55/freeResult/ensureFreeAnswerSetCompleteV1';
import styles from './DtrPaidDecisionUx.module.css';

type StripView = {
  traitName: string;
  sentenceJa: string;
};

/**
 * Compact free→Premium continuity strip shown before paid Q1/6.
 * Not a second sales card — trait + one sentence + effort only.
 */
export default function DtrPaidResultContextStrip() {
  const [view, setView] = useState<StripView | null>(null);

  useEffect(() => {
    const profile = ProfileRepository.get(null);
    if (!isValidBasicInfo(profile)) return;
    const persisted = readPersistedFunnel();
    const basic = {
      nickname: profile.nickname.trim(),
      birthDate: profile.birthDate.trim().slice(0, 10),
    };
    const stage = resolveSelfFunnelStage({
      basicInfo: basic,
      draftFreeAnswers: persisted.draftFreeAnswers,
      committedFreeAnswers: persisted.committedFreeAnswers,
      freeResultFingerprint: persisted.freeResultFingerprint,
      paidAnswers: {},
    });
    if (
      stage !== 'FREE_RESULT_READY' &&
      stage !== 'PAID_QUESTIONS_IN_PROGRESS' &&
      stage !== 'PAID_QUESTIONS_COMPLETE' &&
      stage !== 'PLAN_SELECTION'
    ) {
      return;
    }
    const answers = persisted.committedFreeAnswers;
    if (!answers || !isCompleteFreeAnswerSet(answers)) return;
    const sealed = ensureSealedCoreResult(null, profile);
    const identity = resolveTraitIdentity(sealed.stemLaneIndex);
    if (!identity) return;
    setView({
      traitName: identity.traitName,
      sentenceJa: identity.canonicalTagline,
    });
  }, []);

  if (!view) return null;

  return (
    <aside
      className={styles.contextStrip}
      data-testid="m55-paid-result-context"
      aria-label="無料結果からの続き"
      data-m55-visual-subsystem="self"
    >
      <p className={styles.contextTrait}>
        あなたの資質 <strong>{view.traitName}</strong>
      </p>
      <p className={styles.contextSentence}>{view.sentenceJa}</p>
      <p className={styles.contextEffort}>{STATIC_FREE_TO_PAID_BRIDGE.effortJa}</p>
    </aside>
  );
}
