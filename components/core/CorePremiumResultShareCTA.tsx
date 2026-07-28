'use client';

import PremiumDecisionSurface from '../experience/PremiumDecisionSurface';
import CoreShareResultBody, { useCoreShareTitleId } from './CoreShareResultBody';
import { useCoreShareActions } from './useCoreShareActions';
import type { PrivacySafeShareCardV1 } from '../../lib/m55/freeResult/privacySafeShareCardV1';
import styles from './CoreExperience.module.css';

type Props = {
  card: PrivacySafeShareCardV1;
};

/**
 * Premium share presentation — explicit typed owner for premium.share.card only.
 * Must not be mounted from Free result callers.
 */
export default function CorePremiumResultShareCTA({ card }: Props) {
  const titleId = useCoreShareTitleId();
  const share = useCoreShareActions(card);

  return (
    <PremiumDecisionSurface stateId="premium.share.card" testId="m55-premium-experience-share">
      <section
        className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeShareSection}`}
        aria-labelledby={titleId}
        data-testid="m55-premium-result-share"
        data-m55-share-presentation="premium"
      >
        <CoreShareResultBody
          card={card}
          titleId={titleId}
          status={share.status}
          nativeAvailable={share.nativeAvailable}
          fallbackText={share.fallbackText}
          onNativeShare={share.handleNativeShare}
          onCopyLink={share.handleCopyLink}
          testId="m55-premium-result-share"
        />
      </section>
    </PremiumDecisionSurface>
  );
}
