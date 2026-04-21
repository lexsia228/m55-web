import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { resolveEntryReportOwnership } from "../../../lib/m55/dtrOwnershipGate";
import { getDtrReportSnapshot } from "../../../lib/m55/dtrDraftDb";
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
    return (
      <main className={styles.page}>
        <DtrFullReader
          ownershipType={ownership.ownershipType}
          aiConsultIncluded={ownership.aiConsultIncluded}
          expiresAt={ownership.expiresAt}
          purchasedSnapshot={{
            envelope: snap.envelope_json,
            profile: snap.profile_snapshot,
          }}
        />
      </main>
    );
  }

  // owned だが snapshot なし: 本文は出さず LP（processing は checkout session_id 付きでのみ利用）
  redirect("/dtr/lp");
}
