"use client";

import { useState } from "react";

/** Klickbares Kästchen in der Gästeliste: setzt bzw. entfernt den Einlass. */
export default function GuestCheckbox({ ticketId, initial, name }: { ticketId: string; initial: string | null; name: string }) {
  const [checkedAt, setCheckedAt] = useState<string | null>(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !checkedAt;
    if (!next && !window.confirm(`Einlass für ${name} wirklich zurücknehmen?`)) return;
    setBusy(true);
    const prev = checkedAt;
    setCheckedAt(next ? new Date().toISOString() : null); // sofort anzeigen
    const res = await fetch(`/api/admin/tickets/${ticketId}/checkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setCheckedAt(data.checked_in_at ?? null);
    else {
      setCheckedAt(prev);
      window.alert(data.error ?? "Fehler beim Speichern");
    }
  }

  return (
    <button
      type="button"
      className={`checkbox-box ${checkedAt ? "is-checked" : ""}`}
      onClick={toggle}
      disabled={busy}
      aria-pressed={!!checkedAt}
      aria-label={checkedAt ? `${name} ist eingelassen – zurücknehmen` : `${name} einlassen`}
      title={checkedAt ? `Eingelassen ${new Date(checkedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr` : "Abhaken = eingelassen"}
    >
      {checkedAt ? "✓" : ""}
    </button>
  );
}
