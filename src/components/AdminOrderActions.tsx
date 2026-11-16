"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminOrderActions({
  orderId,
  status,
  canRefund,
  openTransfer = false,
  canDelete = false,
}: {
  orderId: string;
  status: string;
  canRefund: boolean;
  openTransfer?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(action: "cancel" | "refund" | "resend" | "transfer-paid" | "transfer-reminder", confirmText?: string) {
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

  async function remove() {
    if (!window.confirm("Diese Buchung endgültig löschen? Das lässt sich nicht rückgängig machen.")) return;
    setBusy("delete");
    const res = await fetch(`/api/admin/orders/${orderId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok) {
      router.push("/admin/buchungen");
      router.refresh();
    } else setMsg({ ok: false, text: data.error ?? "Fehler" });
  }
  return (
    <div className="form" style={{ gap: 12 }}>
      <div className="row">
        {openTransfer && (
          <>
            <button
              className="btn small"
              disabled={!!busy}
              onClick={() => run("transfer-paid", "Ist die Überweisung auf dem Konto eingegangen? Danach werden die Tickets erzeugt und verschickt.")}
            >
              {busy === "transfer-paid" ? "Bestätige …" : "Zahlung eingegangen"}
            </button>
            {status === "pending" && (
              <button className="btn small ghost" disabled={!!busy} onClick={() => run("transfer-reminder")}>
                {busy === "transfer-reminder" ? "Sende …" : "Zahlungserinnerung senden"}
              </button>
            )}
          </>
        )}
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
        {canDelete && (
          <button className="btn small danger" disabled={!!busy} onClick={remove}>
            {busy === "delete" ? "Lösche …" : "Buchung löschen"}
          </button>
        )}
      </div>
      {msg && <div className={msg.ok ? "note" : "alert"}>{msg.text}</div>}
    </div>
  );
}
