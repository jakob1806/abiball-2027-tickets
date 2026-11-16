import Scanner from "@/components/Scanner";

export default function ScannerPage() {
  return (
    <main className="wrap" style={{ maxWidth: 560, paddingTop: 24, paddingBottom: 64 }}>
      <h1 className="h2" style={{ marginBottom: 16 }}>Einlass</h1>
      <Scanner />
    </main>
  );
}
