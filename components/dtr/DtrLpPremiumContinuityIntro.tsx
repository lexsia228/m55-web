'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProfileRepository } from '../../lib/soul/profile';
import { ensureSealedCoreResult } from '../../lib/m55/coreResult/store';
import { buildFreeDepthAnalysisV1 } from '../../lib/m55/freeResult/buildFreeDepthAnalysisV1';
import { isCompleteFreeAnswerSet } from '../../lib/m55/freeResult/ensureFreeAnswerSetCompleteV1';
import { resolveTraitIdentity } from '../../lib/m55/commercialUx/traitIdentityCatalog';
import { STATIC_FREE_TO_PAID_BRIDGE } from '../core/corePublicCopy';
import {
  isValidBasicInfo,
  resolveSelfFunnelStage,
} from '../../lib/m55/selfFunnel/selfFunnelRuntimeState';
import { readPersistedFunnel } from '../../lib/m55/selfFunnel/selfFunnelClientStore';
import PremiumExperienceSurface from '../experience/PremiumExperienceSurface';
import styles from './DtrLpPremiumContinuity.module.css';

type ContinuityView = {
  traitName: string;
  titleJa: string;
  continuationJa: string;
  lockedHeadingsJa: readonly string[];
};

export default function DtrLpPremiumContinuityIntro() {
  const [view, setView] = useState<ContinuityView | null>(null);

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

    const depthBuilt = buildFreeDepthAnalysisV1({
      birthDate: profile.birthDate,
      stemLaneIndex: sealed.stemLaneIndex,
      freeAnswerSet: answers,
    });
    if (!depthBuilt.ok) return;

    const identity = resolveTraitIdentity(sealed.stemLaneIndex);
    if (!identity) return;

    setView({
      traitName: identity.traitName,
      titleJa: identity.premiumContinuityTemplate,
      continuationJa: depthBuilt.value.premiumOpenLoopJa,
      lockedHeadingsJa: depthBuilt.value.premiumLockedHeadingsJa.slice(0, 2),
    });
  }, []);

  if (!view) return null;

  const copy = STATIC_FREE_TO_PAID_BRIDGE;

  return (
    <PremiumExperienceSurface stateId="premium.lp.prerequisite" testId="m55-premium-experience-continuity">
    <section
      className={styles.root}
      aria-labelledby="dtr-lp-continuity-heading"
      data-testid="m55-dtr-lp-continuity"
    >
      <h2 id="dtr-lp-continuity-heading" className={styles.title}>
        {view.titleJa}
      </h2>
      <p className={styles.continuation}>{view.continuationJa}</p>
      <ul className={styles.lockedList}>
        {view.lockedHeadingsJa.map((heading) => (
          <li key={heading}>{heading}</li>
        ))}
      </ul>
      <ul className={styles.outcomes}>
        {copy.outcomesJa.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className={styles.support}>{copy.ctaSupportJa}</p>
      <Link href="#dtr-lp-tiers-heading" className={styles.cta} data-testid="m55-dtr-lp-continuity-cta">
        {copy.primaryCtaJa}
      </Link>
    </section>
    </PremiumExperienceSurface>
  );
}
