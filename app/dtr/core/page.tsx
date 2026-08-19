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
import CorePairReadingCrossSell from "../../../components/core/CorePairReadingCrossSell";
import { readConsultWalletDisplaySnapshot } from "../../../lib/m55/reply/consultWalletDisplaySnapshot";
import {
  buildPremiumPurchasedSemanticProjectionV1,
  readPurchaseInputFromDraftSnapshot,
} from "../../../lib/m55/narrative/buildPremiumPurchasedSemanticProjectionV1";
import styles from "./core.module.css";

import { LABEL_SAVED_REPORT_METADATA_JP } from "../../../lib/m55/dtrProductLabels";

export const metadata = { title: `${LABEL_SAVED_REPORT_METADATA_JP} | M55` };

export default async function DtrCorePage() {
  const { userId } = await auth();

  // Anonymous → sign-in with deep return to owned report route
  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent("/dtr/core")}`);
  }

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

    const purchaseInput = readPurchaseInputFromDraftSnapshot(snap.draft_snapshot);
    const premiumProjection =
      purchaseInput && read.envelope.auditMeta.stemLaneIndex != null
        ? (() => {
            const built = buildPremiumPurchasedSemanticProjectionV1({
              purchaseInput,
              stemLaneIndex: read.envelope.auditMeta.stemLaneIndex,
            });
            return built.ok ? built.value : null;
          })()
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
          premiumProjection={premiumProjection}
        />
        <div className={styles.upgradeAssist}>
          <CorePairReadingCrossSell tone="night" />
        </div>
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
