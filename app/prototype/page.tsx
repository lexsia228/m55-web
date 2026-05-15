export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from 'next/link';

export default function PrototypeHub() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Prototype Hub</h1>
      <p>Protected route (requires x-m55-proto header).</p>
      <p style={{ marginTop: 16 }}>
        <Link href="/prototype/hub">接続ハブ（DTR棚・保存期間）</Link>
      </p>
    </main>
  );
}
