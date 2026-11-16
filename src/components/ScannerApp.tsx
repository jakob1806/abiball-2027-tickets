"use client";

import { useCallback, useEffect, useState } from "react";
import Scanner from "./Scanner";
import AgeBadge from "./AgeBadge";
import DoorSales from "./DoorSales";

interface Guest { id: string; ticket_number: string | null; holder_name: string; ticket_type_id: string; checked_in_at: string | null; checked_in_by_label: string | null; age_group?: string | null }

/** Web-Scanner für Helfer mit eigenem Konto (z. B. Android oder als Ersatz zur iPhone-App). */
export default function ScannerApp() {
  const [me, setMe] = useState<{ name: string } | null | undefined>(undefined);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"scan" | "list" | "kasse">("scan");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [q, setQ] = useState("");

  const check = useCallback(async () => {
    const res = await fetch("/api/scanner/me", { cache: "no-store" });
    setMe(res.ok ? await res.json() : null);
  }, []);

  useEffect(() => void check(), [check]);

  const loadGuests = useCallback(async () => {
    const res = await fetch(`/api/scanner/guests?status=missing&q=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (res.status === 401) return setMe(null);
    if (res.ok) setGuests((await res.json()).guests);
  }, [q]);

  useEffect(() => {
    if (me && tab === "list") void loadGuests();
  }, [me, tab, loadGuests]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/scanner/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Anmeldung fehlgeschlagen");
    setPassword("");
    setMe({ name: data.user.name });
  }

  async function logout() {
    await fetch("/api/scanner/logout", { method: "POST" });
    setMe(null);
  }

  async function manual(g: Guest) {
    if (!window.confirm(`${g.holder_name} (${g.ticket_number}) ohne Scan einlassen?`)) return;
    const res = await fetch("/api/scanner/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId: g.id }),
    });
    const data = await res.json().catch(() => ({}));
    window.alert(data.result === "ok" ? `${g.holder_name} eingelassen.` : data.result === "duplicate" ? "War schon drin." : data.error ?? "Nicht möglich");
    void loadGuests();
  }

  if (me === undefined) return <main className="wrap" style={{ paddingTop: 48 }}><p className="muted">Lade …</p></main>;

  if (!me) {
    return (
      <main className="hero">
        <div className="wrap" style={{ maxWidth: 420 }}>
          <p className="eyebrow">Abiball 2027</p>
          <h1 className="h1">Einlass</h1>
          <form className="form" onSubmit={login}>
            <label className="field">Benutzername<input type="text" autoCapitalize="none" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} /></label>
            <label className="field">Passwort<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {error && <div className="alert">{error}</div>}
            <button className="btn block" disabled={busy}>{busy ? "Prüfe …" : "Anmelden"}</button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="top">
        <div className="wrap">
          <span className="brand">Einlass · {me.name}</span>
          <button className="btn small ghost" onClick={logout}>Abmelden</button>
        </div>
      </header>
      <main className="wrap" style={{ maxWidth: 560, paddingTop: 20, paddingBottom: 64 }}>
        <div className="row" style={{ marginBottom: 16 }}>
          <button className={`btn small ${tab === "scan" ? "" : "ghost"}`} onClick={() => setTab("scan")}>Scannen</button>
          <button className={`btn small ${tab === "list" ? "" : "ghost"}`} onClick={() => setTab("list")}>Noch nicht da</button>
          <button className={`btn small ${tab === "kasse" ? "" : "ghost"}`} onClick={() => setTab("kasse")}>Abendkasse</button>
        </div>
        {tab === "scan" ? (
          <Scanner checkinUrl="/api/scanner/checkin" statsUrl="/api/scanner/stats" onUnauthorized={() => setMe(null)} />
        ) : tab === "kasse" ? (
          <DoorSales onUnauthorized={() => setMe(null)} />
        ) : (
          <div className="form">
            <input type="search" placeholder="Name oder Nummer suchen" value={q} onChange={(e) => setQ(e.target.value)} />
            <p className="small muted" style={{ margin: 0 }}>{guests.length} noch nicht eingecheckt</p>
            <div className="table-wrap">
              <table>
                <tbody>
                  {guests.map((g) => (
                    <tr key={g.id}>
                      <td className="ticket-no small">{g.ticket_number}</td>
                      <td>{g.holder_name}<div className="small muted">{g.ticket_type_id === "ball" ? "Ball" : "Afterparty"}</div><div style={{ marginTop: 4 }}><AgeBadge id={g.age_group} /></div></td>
                      <td style={{ textAlign: "right" }}><button className="btn small ghost" onClick={() => manual(g)}>Einlassen</button></td>
                    </tr>
                  ))}
                  {guests.length === 0 && <tr><td className="muted">Alle da.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
