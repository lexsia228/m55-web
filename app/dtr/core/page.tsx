import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  DTR_HIDDEN_ONLY_REPURCHASE_LP_PATH,
  DTR_OWNED_RECOVERY_PROCESSING_PATH,
  isDtrOwnedHiddenOnlyState,
} from "../../../lib/m55/dtrShelfAccess";
import { resolveEntryReportOwnership } from "../../../lib/m55/dtrOwnershipGate";
import { getVisibleSavedReportSnapshot } from "../../../lib/m55/dtrSavedReportOwnership";
import { resolveSavedReportTierSummary } from "../../../lib/m55/dtrSavedReportTier";
import { resolveDisplayedDtrEnvelope } from "../../../lib/m55/compositeStem/resolveDisplayedDtrEnvelope";
import DtrFullReader from "../../../components/dtr/DtrFullReader";
import LightToFullUpgradeCta from "../../../components/dtr/LightToFullUpgradeCta";
import { readConsultWalletDisplaySnapshot } from "../../../lib/m55/reply/consultWalletDisplaySnapshot";
import styles from "./core.module.css";

import { LABEL_SAVED_REPORT_METADATA_JP } from "../../../lib/m55/dtrProductLabels";

export const metadata = { title: `${LABEL_SAVED_REPORT_METADATA_JP} | M55` };

export default async function DtrCorePage() {
  const { userId } = await auth();

  // Anonymous → LP (fail-closed)
  if (!userId) redirect("/dtr/lp");

  // Layer1 ownership check (M55_ENTITLEMENT_KEY_NORMALIZATION + BINDING_ROLLOUT Step 5)
  const ownership = await resolveEntryReportOwnership(userId);

  // locked or expired → fail-closed to LP
  if (ownership.unlockState === "locked") redirect("/dtr/lp");
  if (ownership.unlockState === "expired") redirect("/dtr/lp?state=expired");

  const snap = await getVisibleSavedReportSnapshot(userId);
  const tier = await resolveSavedReportTierSummary(userId);

  if (snap) {
    const read = resolveDisplayedDtrEnvelope(snap);
    if (!read.ok) {
      console.info(
        "[dtr/core]",
        JSON.stringify({
          event: "displayed_envelope_read_fail",
          reason: read.reason,
          engineVersion: snap.engine_version ?? null,
        }),
      );
      redirect(DTR_OWNED_RECOVERY_PROCESSING_PATH);
    }

    const consultWalletSnapshot =
      ownership.aiConsultIncluded && ownership.reportInstanceId
        ? await readConsultWalletDisplaySnapshot(userId, ownership.reportInstanceId)
        : null;

    return (
      <main className={styles.page}>
        <DtrFullReader
          ownershipType={ownership.ownershipType}
          aiConsultIncluded={ownership.aiConsultIncluded}
          expiresAt={ownership.expiresAt}
          displayedEnvelopeReadMode={read.mode}
          consultWalletSnapshot={consultWalletSnapshot}
          purchasedSnapshot={{
            envelope: read.envelope,
            profile: read.profile,
          }}
        />
        {tier.canUpgradeFromLight && tier.reportInstanceId && (
          <div className={styles.upgradeAssist}>
            <LightToFullUpgradeCta
              reportInstanceId={tier.reportInstanceId}
              variant="subtle"
            />
          </div>
        )}
      </main>
    );
  }

  // owned + hidden-only（削除後）: 無限 recovery poll へ入れず LP 再購入導線へ
  if (await isDtrOwnedHiddenOnlyState(userId)) {
    redirect(DTR_HIDDEN_ONLY_REPURCHASE_LP_PATH);
  }

  // owned だが visible snapshot なし（未反映）: 保存版 read-path 回復へ
  redirect(DTR_OWNED_RECOVERY_PROCESSING_PATH);
}
