"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AGE_GROUPS } from "@/lib/event";
import type { ClientWristbands } from "./WristbandContext";

/** Admin: welche Altersgruppe welches Bändchen bekommt. */
export default function WristbandForm({ initial }: { initial: ClientWristbands }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/wristbands", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: data.message } : { ok: false, text: data.error ?? "Fehler" });
    if (res.ok) router.refresh();
  }

  return (
    <form className="panel form" onSubmit={save} style={{ marginTop: 24 }}>
      <h2 className="h3" style={{ margin: 0 }}>Bändchenfarben</h2>
      <p className="muted small" style={{ margin: 0 }}>
        Welches Bändchen jede Altersgruppe am Einlass bekommt. Web-Scanner, iOS-App, Gästeliste und Excel zeigen die Farbe sofort an.
      </p>
      {AGE_GROUPS.map((a) => (
        <div key={a.id} className="grid-2" style={{ alignItems: "end" }}>
          <label className="field">
            {a.label} – Bändchen
            <input value={v[a.id]?.name ?? ""} maxLength={30} required onChange={(e) => setV({ ...v, [a.id]: { ...v[a.id], name: e.target.value } })} />
          </label>
          <label className="field">
            Farbe
            <span className="row" style={{ gap: 10, alignItems: "center" }}>
              <input type="color" value={v[a.id]?.color ?? "#000000"} style={{ width: 56, height: 40, padding: 2 }}
                onChange={(e) => setV({ ...v, [a.id]: { ...v[a.id], color: e.target.value } })} />
              <span className="age-badge" style={{ borderColor: v[a.id]?.color }}>
                <span className="age-dot" style={{ background: v[a.id]?.color }} aria-hidden />
                {a.short} · {v[a.id]?.name}
              </span>
            </span>
          </label>
        </div>
      ))}
      {msg && <p className={msg.ok ? "small" : "small error"} style={{ margin: 0, color: msg.ok ? undefined : "#c40000" }}>{msg.text}</p>}
      <div><button className="btn" disabled={busy}>{busy ? "Speichern …" : "Bändchenfarben speichern"}</button></div>
    </form>
  );
}
