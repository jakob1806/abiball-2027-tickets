"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AGE_GROUPS } from "@/lib/event";

interface Props {
  orderId: string;
  initial: {
    buyer_name: string;
    email: string;
    relation: "abiturient" | "gast";
    guest_of: string | null;
    notes: string | null;
    tickets: { id: string; holder_name: string; age_group: string | null; code: string; type: string }[];
  };
}

export default function EditOrderForm({ orderId, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!open) {
    return <button className="btn small ghost" onClick={() => setOpen(true)}>Daten bearbeiten</button>;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyer_name: v.buyer_name,
        email: v.email,
        relation: v.relation,
        guest_of: v.relation === "gast" ? v.guest_of : null,
        notes: v.notes,
        tickets: v.tickets.map((t) => ({ id: t.id, holder_name: t.holder_name, age_group: t.age_group || null })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: data.message } : { ok: false, text: data.error ?? "Fehler" });
    if (res.ok) router.refresh();
  }

  return (
    <form className="panel form" onSubmit={save} style={{ marginTop: 16 }}>
      <h2 className="h3" style={{ margin: 0 }}>Daten bearbeiten</h2>
      <div className="grid-2">
        <label className="field">Name<input type="text" required value={v.buyer_name} onChange={(e) => setV({ ...v, buyer_name: e.target.value })} /></label>
        <label className="field">E-Mail<input type="email" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></label>
      </div>
      <div className="grid-2">
        <label className="field">
          Bezug
          <select value={v.relation} onChange={(e) => setV({ ...v, relation: e.target.value as "abiturient" | "gast" })}>
            <option value="abiturient">Abiturient/in</option>
            <option value="gast">Gast von …</option>
          </select>
        </label>
        {v.relation === "gast" && (
          <label className="field">Gast von<input type="text" required value={v.guest_of ?? ""} onChange={(e) => setV({ ...v, guest_of: e.target.value })} /></label>
        )}
      </div>
      {v.tickets.length > 0 && (
        <div className="form" style={{ gap: 12 }}>
          <div className="small muted">Namen und Alter auf den Tickets</div>
          {v.tickets.map((t, i) => (
            <div className="grid-2" key={t.id}>
              <label className="field">
                {t.type} · <span className="mono">{t.code}</span>
                <input
                  type="text"
                  required
                  value={t.holder_name}
                  onChange={(e) => setV({ ...v, tickets: v.tickets.map((x, j) => (j === i ? { ...x, holder_name: e.target.value } : x)) })}
                />
              </label>
              <label className="field">
                Alter am Abiball
                <select
                  value={t.age_group ?? ""}
                  onChange={(e) => setV({ ...v, tickets: v.tickets.map((x, j) => (j === i ? { ...x, age_group: e.target.value || null } : x)) })}
                >
                  <option value="">nicht angegeben</option>
                  {AGE_GROUPS.map((a) => <option key={a.id} value={a.id}>{a.label} ({a.wristband})</option>)}
                </select>
              </label>
            </div>
          ))}
        </div>
      )}
      <label className="field">Notiz (intern)<textarea rows={2} value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value })} maxLength={500} /></label>
      {msg && <div className={msg.ok ? "note" : "alert"}>{msg.text}</div>}
      <div className="row">
        <button className="btn small" disabled={busy}>{busy ? "Speichere …" : "Speichern"}</button>
        <button type="button" className="btn small ghost" onClick={() => { setOpen(false); setV(initial); setMsg(null); }}>Schließen</button>
      </div>
    </form>
  );
}
