'use client';

import CoreShareResultBody, { useCoreShareTitleId } from './CoreShareResultBody';
import { useCoreShareActions } from './useCoreShareActions';
import type { PrivacySafeShareCardV1 } from '../../lib/m55/freeResult/privacySafeShareCardV1';
import styles from './CoreExperience.module.css';

type Props = {
  card: PrivacySafeShareCardV1;
};

/**
 * Free share presentation — light editorial surface, no Premium decision wrapper.
 */
export default function CoreFreeResultShareCTA({ card }: Props) {
  const titleId = useCoreShareTitleId();
  const share = useCoreShareActions(card);

  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeShareSection}`}
      aria-labelledby={titleId}
      data-testid="m55-free-result-share"
      data-m55-share-presentation="free"
    >
      <CoreShareResultBody
        card={card}
        titleId={titleId}
        status={share.status}
        nativeAvailable={share.nativeAvailable}
        fallbackText={share.fallbackText}
        onNativeShare={share.handleNativeShare}
        onCopyLink={share.handleCopyLink}
        testId="m55-free-result-share"
      />
    </section>
  );
}
