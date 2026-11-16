"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminOrderActions({
  orderId,
  status,
  canRefund,
}: {
  orderId: string;
  status: string;
  canRefund: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(action: "cancel" | "refund" | "resend", confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(action);
    setMsg(null);
    const res = await fetch(`/api/admin/orders/${orderId}/${action}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    setMsg(res.ok ? { ok: true, text: data.message ?? "Erledigt." } : { ok: false, text: data.error ?? "Fehler" });
    router.refresh();
  }

  const active = status === "paid" || status === "pending";
  return (
    <div className="form" style={{ gap: 12 }}>
      <div className="row">
        {status === "paid" && (
          <button className="btn small" disabled={!!busy} onClick={() => run("resend")}>
            {busy === "resend" ? "Sende …" : "Mail erneut senden"}
          </button>
        )}
        {status === "paid" && canRefund && (
          <button
            className="btn small danger"
            disabled={!!busy}
            onClick={() => run("refund", "Den vollen Betrag über Stripe erstatten und alle Tickets ungültig machen?")}
          >
            {busy === "refund" ? "Erstatte …" : "Über Stripe erstatten"}
          </button>
        )}
        {active && (
          <button
            className="btn small ghost"
            disabled={!!busy}
            onClick={() => run("cancel", "Bestellung stornieren? Alle Tickets werden ungültig. Es wird NICHT automatisch erstattet.")}
          >
            {busy === "cancel" ? "Storniere …" : "Stornieren (ohne Erstattung)"}
          </button>
        )}
      </div>
      {msg && <div className={msg.ok ? "note" : "alert"}>{msg.text}</div>}
    </div>
  );
}
