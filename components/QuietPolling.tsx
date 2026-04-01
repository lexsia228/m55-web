"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Soft entitlement refresh for /purchase/success — avoids full document reload (reduces flicker).
 */
export function QuietPolling({ max = 8, intervalMs = 3000 }: { max?: number; intervalMs?: number }) {
  const router = useRouter();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (count >= max) return;
    const t = setTimeout(() => {
      setCount((c) => c + 1);
      router.refresh();
    }, intervalMs);
    return () => clearTimeout(t);
  }, [count, max, intervalMs, router]);

  return (
    <div
      data-testid="m55-purchase-success-quiet-poll"
      style={{ marginTop: 16, fontSize: 12, opacity: 0.72, color: "#6b5b8a" }}
    >
      {count < max ? (
        <p style={{ margin: 0 }}>
          利用権限の反映を確認しています。画面はそのまま、しばらくお待ちください。
        </p>
      ) : (
        <p style={{ margin: 0 }}>
          反映に少し時間がかかることがあります。上のボタンから本編を開くか、しばらくしてからマイページをご確認ください。
        </p>
      )}
    </div>
  );
}
