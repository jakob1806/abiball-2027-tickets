"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface U { id: string; name: string; username: string; active: boolean; last_login_at: string | null; created_at: string; scans: number }

const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" }) : "–");
const slug = (name: string) =>
  name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "").slice(0, 32);

export default function TeamManager({ users }: { users: U[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [touchedUser, setTouchedUser] = useState(false);
  const [shown, setShown] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function call(url: string, init: RequestInit, key: string) {
    setBusy(key);
    setMsg(null);
    const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) setMsg({ ok: false, text: data.error ?? "Fehler" });
    return res.ok ? data : null;
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const data = await call("/api/admin/scanners", { method: "POST", body: JSON.stringify({ name, username }) }, "create");
    if (data) {
      setShown((s) => ({ ...s, [data.id]: data.password }));
      setMsg({ ok: true, text: `Konto „${username}“ angelegt. Passwort: ${data.password}` });
      setName("");
      setUsername("");
      setTouchedUser(false);
      router.refresh();
    }
  }

  async function reveal(u: U) {
    if (shown[u.id]) return setShown(({ [u.id]: _, ...rest }) => rest);
    const data = await call(`/api/admin/scanners/${u.id}/password`, { method: "GET" }, `pw-${u.id}`);
    if (data) setShown((s) => ({ ...s, [u.id]: data.password }));
  }

  async function reset(u: U) {
    if (!window.confirm(`Neues Passwort für ${u.name} erzeugen? Das Konto wird auf allen Geräten abgemeldet.`)) return;
    const data = await call(`/api/admin/scanners/${u.id}/reset`, { method: "POST" }, `reset-${u.id}`);
    if (data) {
      setShown((s) => ({ ...s, [u.id]: data.password }));
      setMsg({ ok: true, text: `${data.message} Neues Passwort: ${data.password}` });
    }
  }

  async function toggle(u: U) {
    const data = await call(`/api/admin/scanners/${u.id}`, { method: "PATCH", body: JSON.stringify({ active: !u.active }) }, `act-${u.id}`);
    if (data) router.refresh();
  }

  async function remove(u: U) {
    if (!window.confirm(`Konto ${u.name} löschen? Bisherige Scans bleiben mit dem Namen protokolliert.`)) return;
    const data = await call(`/api/admin/scanners/${u.id}`, { method: "DELETE" }, `del-${u.id}`);
    if (data) router.refresh();
  }

  return (
    <div className="form" style={{ gap: 24 }}>
      <form className="panel form" onSubmit={create}>
        <h2 className="h3" style={{ margin: 0 }}>Neues Konto</h2>
        <div className="grid-2">
          <label className="field">
            Name
            <input type="text" required value={name} maxLength={80} onChange={(e) => { setName(e.target.value); if (!touchedUser) setUsername(slug(e.target.value)); }} />
          </label>
          <label className="field">
            Benutzername
            <input type="text" required value={username} autoCapitalize="none" autoComplete="off" onChange={(e) => { setUsername(e.target.value.toLowerCase()); setTouchedUser(true); }} />
          </label>
        </div>
        <p className="small muted" style={{ margin: 0 }}>Das Passwort wird automatisch erzeugt und kann jederzeit angezeigt oder zurückgesetzt werden.</p>
        <div><button className="btn small" disabled={busy === "create"}>{busy === "create" ? "Lege an …" : "Konto anlegen"}</button></div>
      </form>

      {msg && <div className={msg.ok ? "note" : "alert"}>{msg.text}</div>}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Benutzername</th><th>Passwort</th><th>Scans</th><th>Letzte Anmeldung</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ opacity: u.active ? 1 : 0.55 }}>
                <td><strong>{u.name}</strong></td>
                <td className="mono small">{u.username}</td>
                <td>
                  <span className="mono small" style={{ marginRight: 8 }}>{shown[u.id] ?? "••••••••••••"}</span>
                  <button className="btn small ghost" onClick={() => reveal(u)} disabled={busy === `pw-${u.id}`}>{shown[u.id] ? "Verbergen" : "Anzeigen"}</button>
                </td>
                <td>{u.scans}</td>
                <td className="small">{dt(u.last_login_at)}</td>
                <td>{u.active ? <span className="badge ok">Aktiv</span> : <span className="badge bad">Gesperrt</span>}</td>
                <td>
                  <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                    <button className="btn small ghost" onClick={() => reset(u)} disabled={!!busy}>Zurücksetzen</button>
                    <button className="btn small ghost" onClick={() => toggle(u)} disabled={!!busy}>{u.active ? "Sperren" : "Entsperren"}</button>
                    <button className="btn small danger" onClick={() => remove(u)} disabled={!!busy}>Löschen</button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={7} className="muted">Noch keine Konten.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
