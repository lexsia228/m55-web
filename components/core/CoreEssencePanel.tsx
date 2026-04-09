'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';
import { ProfileRepository } from '../../lib/soul/profile';
import { ensureSealedCoreResult } from '../../lib/m55/coreResult/store';
import type { CoreResult } from '../../lib/m55/coreResult/types';
import CoreAiChatExplainerSection from './CoreAiChatExplainerSection';
import CoreAlignFlowSection from './CoreAlignFlowSection';
import CoreEntryReportCTASection from './CoreEntryReportCTASection';
import CoreExperienceStyles from './CoreExperience.module.css';
import CoreFocusLinkRow from './CoreFocusLinkRow';
import CoreHeroSection from './CoreHeroSection';
import CoreHowM55ReadsSection from './CoreHowM55ReadsSection';
import CoreLockedState from './CoreLockedState';
import CoreObservationListSection from './CoreObservationListSection';
import CoreRadarSection from './CoreRadarSection';
import CoreScrollReveal from './CoreScrollReveal';
import CoreTendencyLoadSection from './CoreTendencyLoadSection';
import CoreTypeEaseSection from './CoreTypeEaseSection';

type SealedState =
  | { kind: 'loading' }
  | { kind: 'locked' }
  | { kind: 'ready'; result: CoreResult; profile: NonNullable<ReturnType<typeof ProfileRepository.get>> }
  | { kind: 'error'; message: string };

export default function CoreEssencePanel() {
  const { user, isLoaded } = useUser();
  const ownerId = user?.id ?? null;
  const [profileEpoch, setProfileEpoch] = useState(0);

  useEffect(() => {
    const bump = () => setProfileEpoch((n) => n + 1);
    window.addEventListener('m55:profile_updated', bump);
    return () => window.removeEventListener('m55:profile_updated', bump);
  }, []);

  const sealed: SealedState = useMemo(() => {
    if (!isLoaded) return { kind: 'loading' };
    const profile = ProfileRepository.get(ownerId);
    if (!profile?.birthDate || !profile.nickname?.trim()) {
      return { kind: 'locked' };
    }
    try {
      const result = ensureSealedCoreResult(ownerId, profile);
      return { kind: 'ready', result, profile };
    } catch (e) {
      const message = e instanceof Error ? e.message : '読み取りに失敗しました。';
      return { kind: 'error', message };
    }
  }, [isLoaded, ownerId, profileEpoch]);

  if (sealed.kind === 'loading') {
    return (
      <div className={CoreExperienceStyles.page}>
        <p className={CoreExperienceStyles.muted}>読み込み中…</p>
      </div>
    );
  }

  if (sealed.kind === 'locked') {
    return <CoreLockedState />;
  }

  if (sealed.kind === 'error') {
    return (
      <div className={CoreExperienceStyles.page}>
        <div className={CoreExperienceStyles.errorBox} role="alert">
          {sealed.message}
        </div>
      </div>
    );
  }

  const { result, profile } = sealed;
  const nickname = profile.nickname.trim();

  return (
    <div className={CoreExperienceStyles.page}>
      <CoreScrollReveal />
      <CoreHeroSection result={result} nickname={nickname} />
      <CoreFocusLinkRow />
      <CoreRadarSection result={result} nickname={nickname} />
      <CoreHowM55ReadsSection nickname={nickname} />
      <CoreTendencyLoadSection result={result} />
      <CoreTypeEaseSection result={result} />
      <CoreAlignFlowSection result={result} />
      <CoreObservationListSection result={result} />
      <CoreAiChatExplainerSection />
      <CoreEntryReportCTASection />
    </div>
  );
}
