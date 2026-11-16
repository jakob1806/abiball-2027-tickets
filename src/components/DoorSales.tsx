"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AgeSelect from "./AgeSelect";
import AgeBadge from "./AgeBadge";

const euro = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);
const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }) : "–";

interface Person { name: string; ageGroup: string }
interface SoldTicket { holder_name: string; ticket_number: string | null; age_group: string | null }
interface Info {
  ticketTypeName: string | null;
  priceCents: number | null;
  available: number;
  maxPerSale: number;
  totalTickets: number;
  totalCents: number;
  sales: { id: string; paid_at: string | null; amount_cents: number; seller: string | null; tickets: SoldTicket[] }[];
}
const empty = (): Person => ({ name: "", ageGroup: "" });

/** Abendkasse im Web-Scanner: nur Afterparty-Tickets, bar, Gäste direkt eingelassen. */
export default function DoorSales({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [persons, setPersons] = useState<Person[]>([empty()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ tickets: SoldTicket[]; cents: number } | null>(null);

  // Callback in einer Ref, damit ein neuer Funktionswert vom Elternteil kein erneutes Laden auslöst
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;

  const load = useCallback(async () => {
    const res = await fetch("/api/scanner/abendkasse", { cache: "no-store" });
    if (res.status === 401) return unauthorized.current();
    if (res.ok) setInfo(await res.json());
  }, []);

  useEffect(() => void load(), [load]);

  const set = (i: number, p: Partial<Person>) => setPersons((list) => list.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!info || info.priceCents === null) return;
    setError(null);
    if (persons.some((p) => !p.ageGroup)) return setError("Bitte für jede Person das Alter wählen.");
    const sum = euro(info.priceCents * persons.length);
    if (!window.confirm(`${sum} bar erhalten? Danach werden ${persons.length === 1 ? "das Ticket" : "die Tickets"} angelegt.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/scanner/abendkasse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persons }),
      });
      if (res.status === 401) return unauthorized.current();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Fehler");
      setDone({ tickets: data.tickets ?? [], cents: data.amount_cents ?? info.priceCents * persons.length });
      setPersons([empty()]);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setBusy(false);
    }
  }

  if (!info) return <p className="muted">Lade …</p>;
  if (info.priceCents === null) return <div className="alert">Die Ticketart für die Abendkasse fehlt. Bitte beim Orga-Team melden.</div>;
  const max = Math.min(info.maxPerSale, info.available);

  return (
    <div className="form">
      <p className="small muted" style={{ margin: 0 }}>
        Hier gibt es nur {info.ticketTypeName ?? "Afterparty-Tickets"} für {euro(info.priceCents)}, bezahlt wird bar. Vorher Ausweis
        prüfen, danach das Bändchen in der angezeigten Farbe ausgeben. Die Gäste sind nach dem Speichern direkt eingelassen.
      </p>

      {done && (
        <div className="note" role="status">
          <strong>Gespeichert, {euro(done.cents)} kassiert. Bändchen ausgeben:</strong>
          {done.tickets.map((t, i) => (
            <div key={i} className="row" style={{ gap: 8, marginTop: 6 }}>
              <span className="ticket-no small">{t.ticket_number}</span> {t.holder_name} <AgeBadge id={t.age_group} />
            </div>
          ))}
        </div>
      )}

      {info.available <= 0 ? (
        <div className="alert">Keine {info.ticketTypeName ?? "Afterparty-Tickets"} mehr frei.</div>
      ) : (
        <form className="form" onSubmit={submit}>
          {persons.map((p, i) => (
            <div className="grid-2" key={i}>
              <label className="field">
                {i === 0 ? "Vor- und Nachname" : `Person ${i + 1}`}
                <input type="text" required maxLength={120} value={p.name} onChange={(e) => set(i, { name: e.target.value })} autoComplete="off" />
              </label>
              <AgeSelect label="Alter laut Ausweis" value={p.ageGroup} onChange={(v) => set(i, { ageGroup: v })} />
            </div>
          ))}
          {persons.some((p) => p.ageGroup === "u16") && (
            <div className="alert">Unter 16: nur mit personensorgeberechtigter oder erziehungsbeauftragter Person einlassen.</div>
          )}
          <div className="row">
            <button type="button" className="btn small ghost" disabled={persons.length >= max} onClick={() => setPersons([...persons, empty()])}>
              + Person
            </button>
            {persons.length > 1 && (
              <button type="button" className="btn small ghost" onClick={() => setPersons(persons.slice(0, -1))}>− Person</button>
            )}
            <span className="small muted">{info.available} frei</span>
          </div>
          <div className="summary"><span>{persons.length} × {euro(info.priceCents)}</span><strong>{euro(info.priceCents * persons.length)}</strong></div>
          {error && <div className="alert">{error}</div>}
          <button className="btn block" disabled={busy}>{busy ? "Speichere …" : "Bar bezahlt: Tickets anlegen und einlassen"}</button>
        </form>
      )}

      <div className="stats" style={{ marginTop: 8 }}>
        <div className="stat"><div className="v">{info.totalTickets}</div><div className="l">Tickets an der Abendkasse</div></div>
        <div className="stat"><div className="v">{euro(info.totalCents)}</div><div className="l">sollte in der Kasse sein</div></div>
      </div>
      {info.sales.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Zeit</th><th>Gäste</th><th>Betrag</th></tr></thead>
            <tbody>
              {info.sales.map((s) => (
                <tr key={s.id}>
                  <td className="small">{time(s.paid_at)}<div className="muted">{s.seller}</div></td>
                  <td>
                    {s.tickets.map((t, i) => (
                      <div key={i} className="row" style={{ gap: 6 }}>{t.holder_name} <AgeBadge id={t.age_group} /></div>
                    ))}
                  </td>
                  <td>{euro(s.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
