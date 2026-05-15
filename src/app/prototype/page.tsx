export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PrototypeHub() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Prototype Hub</h1>
      <p>Protected route (requires x-m55-proto header).</p>
    </main>
  );
}
