'use client';

import { SignInButton } from '@clerk/nextjs';
import { GUEST_SAVE_RESULT_COPY_V1 } from '../../lib/m55/freeResult/guestFreeJourneyCopyV1';
import styles from './CoreExperience.module.css';

export default function CoreGuestSaveResultCTA() {
  return (
    <section
      className={`${styles.section} ${styles.coreSectionSurface} ${styles.freeGuestSaveCta}`}
      aria-labelledby="core-guest-save-title"
    >
      <h2 id="core-guest-save-title" className={styles.freeGuestSaveTitle}>
        {GUEST_SAVE_RESULT_COPY_V1.titleJa}
      </h2>
      <p className={styles.freeGuestSaveBody}>{GUEST_SAVE_RESULT_COPY_V1.bodyJa}</p>
      <div data-m55-print-hide>
        <SignInButton mode="modal" forceRedirectUrl="/core" fallbackRedirectUrl="/core">
          <button type="button" className={styles.freeGuestSaveBtn} data-testid="m55-guest-save-signin">
            {GUEST_SAVE_RESULT_COPY_V1.actionJa}
          </button>
        </SignInButton>
      </div>
    </section>
  );
}
