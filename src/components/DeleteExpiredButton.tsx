"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteExpiredButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (count === 0) return null;

  async function run() {
    if (!window.confirm(`${count} abgelaufene, nie bezahlte ${count === 1 ? "Buchung" : "Buchungen"} endgültig löschen? Das lässt sich nicht rückgängig machen.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/orders/expired", { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    window.alert(data.message ?? data.error ?? "Fehler");
    router.refresh();
  }

  return (
    <button className="btn small ghost" onClick={run} disabled={busy}>
      {busy ? "Lösche …" : `${count} abgelaufene löschen`}
    </button>
  );
}
