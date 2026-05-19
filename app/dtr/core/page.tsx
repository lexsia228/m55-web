import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DTR_OWNED_RECOVERY_PROCESSING_PATH } from "../../../lib/m55/dtrShelfAccess";
import { resolveEntryReportOwnership } from "../../../lib/m55/dtrOwnershipGate";
import { getDtrReportSnapshot } from "../../../lib/m55/dtrDraftDb";
import { runDtrEngine } from "../../../lib/m55/dtrEngine";
import { DTR_CORE_STATIC_V1 } from "../../../lib/oneTimeCheckout";
import DtrFullReader from "../../../components/dtr/DtrFullReader";
import styles from "./core.module.css";

export const metadata = { title: "Entry Report | M55" };

export default async function DtrCorePage() {
  const { userId } = await auth();

  // Anonymous → LP (fail-closed)
  if (!userId) redirect("/dtr/lp");

  // Layer1 ownership check (M55_ENTITLEMENT_KEY_NORMALIZATION + BINDING_ROLLOUT Step 5)
  const ownership = await resolveEntryReportOwnership(userId);

  // locked or expired → fail-closed to LP
  if (ownership.unlockState === "locked") redirect("/dtr/lp");
  if (ownership.unlockState === "expired") redirect("/dtr/lp?state=expired");

  const snap = await getDtrReportSnapshot(userId, DTR_CORE_STATIC_V1);

  if (snap) {
    // Re-derive envelope from the current engine so code-side text edits are
    // immediately visible without a DB migration.
    // Ownership / entitlement remain DB-gated; only the body text is refreshed.
    const envelope = runDtrEngine({
      birthDate: snap.profile_snapshot.birthDate,
      nickname: snap.profile_snapshot.nickname,
      locale: "ja-JP",
      contextScope: "dtr",
    });

    return (
      <main className={styles.page}>
        <DtrFullReader
          ownershipType={ownership.ownershipType}
          aiConsultIncluded={ownership.aiConsultIncluded}
          expiresAt={ownership.expiresAt}
          purchasedSnapshot={{
            envelope,
            profile: snap.profile_snapshot,
          }}
        />
      </main>
    );
  }

  // owned だが snapshot なし: 未購入 LP へ戻さず、保存版 read-path 回復へ
  redirect(DTR_OWNED_RECOVERY_PROCESSING_PATH);
}
