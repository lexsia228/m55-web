'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { ProfileRepository } from '../../lib/soul/profile';
import { GUEST_PROFILE_INTAKE_COPY_V1 } from '../../lib/m55/freeResult/guestFreeJourneyCopyV1';
import { FREE_FUNNEL_PAGE_CONTENT as C } from '../../lib/m55/commercialUx/experience/pageContent/freeFunnelCopy';
import CoreFreeContinuousFlowProgress from './CoreFreeContinuousFlowProgress';
import CoreFreeSegmentedDobFields from './CoreFreeSegmentedDobFields';
import styles from './CoreExperience.module.css';

type Props = {
  ownerId: string | null;
  onSaved: () => void;
};

/**
 * Inline /core profile gate — nickname + segmented DOB (no native date picker).
 */
export default function CoreFreeProfileIntakeSection({ ownerId, onSaved }: Props) {
  const nickId = useId();
  const [nickname, setNickname] = useState('');
  const [nickError, setNickError] = useState<string | null>(null);

  useEffect(() => {
    const existing = ProfileRepository.get(ownerId);
    const hint = existing?.nickname?.trim() ?? '';
    if (hint) setNickname(hint);
  }, [ownerId]);

  function handleDobConfirmed(birthDateIso: string) {
    const nick = nickname.trim();
    if (!nick) {
      setNickError('ニックネームを入力してください。');
      return;
    }
    setNickError(null);
    ProfileRepository.save(ownerId, { nickname: nick, birthDate: birthDateIso });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('m55:profile_updated'));
    }
    onSaved();
  }

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeGuidedShell} ${styles.freeProfileIntakeShell}`}
      aria-labelledby="core-free-profile-intake-title"
      data-testid="m55-core-profile-intake"
    >
      <div className={styles.freeGuidedVisualCol}>
        <CoreFreeContinuousFlowProgress stepNumber={1} completedCount={0} />
      </div>
      <div className={styles.freeGuidedFormCol} data-testid="m55-core-locked">
        <p className={styles.freeGuidedSupportLabel}>はじめに</p>
        <h1 id="core-free-profile-intake-title" className={styles.freeContinuousQuestionTitle}>
          {GUEST_PROFILE_INTAKE_COPY_V1.titleJa}
        </h1>
        <p className={styles.sectionLead}>{GUEST_PROFILE_INTAKE_COPY_V1.leadJa}</p>

        <label htmlFor={nickId} className={styles.freeProfileNickLabel}>
          ニックネーム
        </label>
        <input
          id={nickId}
          type="text"
          name="nickname"
          autoComplete="nickname"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setNickError(null);
          }}
          className={styles.freeProfileNickInput}
          placeholder="表示名"
          data-testid="m55-free-profile-nickname"
        />
        {nickError ? (
          <p className={styles.freeSegmentedDobError} role="alert">
            {nickError}
          </p>
        ) : null}

        <p className={styles.freeProfileDobLabel}>生年月日</p>
        <CoreFreeSegmentedDobFields
          initialIsoDate=""
          onValidSubmit={handleDobConfirmed}
          submitLabelJa={GUEST_PROFILE_INTAKE_COPY_V1.primaryActionJa}
          submitTestId="m55-core-start-intake"
        />

        <p className={styles.freeGuidedTrustRow}>約1分・正解なし</p>
        <p className={styles.freeGuidedPrivacy}>{GUEST_PROFILE_INTAKE_COPY_V1.loginHintJa}</p>
        <p className={styles.freeGuidedPrivacy}>
          <Link href="/home" className={styles.coreProfileGateSecondaryLink} data-testid="m55-core-locked-home-link">
            {C.homeLinkJa}
          </Link>
        </p>
      </div>
    </section>
  );
}
