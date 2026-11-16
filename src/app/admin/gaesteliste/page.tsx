import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import { getGuestList } from "@/lib/admin-data";
import { ticketTypeMap } from "@/lib/orders";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type View = "tickets" | "abiturienten";

export default async function GuestList({ searchParams }: { searchParams: { ansicht?: string; type?: string; q?: string } }) {
  const view: View = searchParams.ansicht === "abiturienten" ? "abiturienten" : "tickets";
  const [all, types] = await Promise.all([getGuestList(), ticketTypeMap()]);
  const q = (searchParams.q ?? "").trim().toLowerCase();
  const rows = all.filter(
    (r) =>
      (!searchParams.type || r.ticket_type_id === searchParams.type) &&
      (!q || r.holder_name.toLowerCase().includes(q) || r.orders.buyer_name.toLowerCase().includes(q) || (r.orders.guest_of ?? "").toLowerCase().includes(q)),
  );

  // Gruppierung nach Abiturient/in: eigene Bestellungen + „Gast von“
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = (r.orders.relation === "abiturient" ? r.orders.buyer_name : r.orders.guest_of ?? "Ohne Angabe").trim();
    const norm = key.toLowerCase();
    const existing = [...groups.keys()].find((k) => k.toLowerCase() === norm) ?? key;
    groups.set(existing, [...(groups.get(existing) ?? []), r]);
  }
  const groupList = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], "de"));

  const tab = (v: View, label: string) => (
    <Link className={`btn small ${view === v ? "" : "ghost"}`} href={`/admin/gaesteliste?ansicht=${v}`}>{label}</Link>
  );

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="admin-head">
        <div>
          <h1 className="h2" style={{ margin: 0 }}>Gästeliste</h1>
          <p className="muted small" style={{ margin: "6px 0 0" }}>
            {rows.length} gültige Tickets · {rows.filter((r) => r.checked_in_at).length} eingecheckt · Stand {dateTime(new Date().toISOString())}
          </p>
        </div>
        <div className="row no-print">
          {tab("tickets", "Alle Gäste A–Z")}
          {tab("abiturienten", "Nach Abiturient/in")}
          <PrintButton label="Drucken / PDF" />
        </div>
      </div>

      <form className="filters no-print" method="get" style={{ gridTemplateColumns: "1fr 200px auto", marginTop: 24 }}>
        <input type="hidden" name="ansicht" value={view} />
        <input type="search" name="q" placeholder="Name suchen" defaultValue={searchParams.q ?? ""} />
        <select name="type" defaultValue={searchParams.type ?? ""}>
          <option value="">Alle Ticketarten</option>
          {Object.values(types).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="btn">Filtern</button>
      </form>

      {view === "tickets" ? (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead><tr><th style={{ width: 36 }}>✓</th><th>Name</th><th>Ticket</th><th>Code</th><th>Bestellt von</th><th>Eingecheckt</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><span className="checkbox-box">{r.checked_in_at ? "✓" : ""}</span></td>
                  <td><strong>{r.holder_name}</strong></td>
                  <td>{types[r.ticket_type_id]?.name ?? r.ticket_type_id}</td>
                  <td className="mono small">{r.code}</td>
                  <td>
                    <Link href={`/admin/bestellung/${r.orders.id}`}>{r.orders.buyer_name}</Link>
                    <div className="small muted">{r.orders.relation === "abiturient" ? "Abiturient/in" : `Gast von ${r.orders.guest_of ?? "–"}`}</div>
                  </td>
                  <td className="small">{r.checked_in_at ? dateTime(r.checked_in_at) : "–"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="muted">Keine Tickets.</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
          {groupList.map(([name, list]) => (
            <div className="panel" key={name} style={{ breakInside: "avoid" }}>
              <div className="meter-label" style={{ marginBottom: 8 }}>
                <strong>{name}</strong>
                <span className="muted">{list.length} {list.length === 1 ? "Ticket" : "Tickets"}</span>
              </div>
              <table>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td>{r.holder_name}</td>
                      <td className="small muted">{types[r.ticket_type_id]?.name ?? r.ticket_type_id}</td>
                      <td className="small">{r.checked_in_at ? <span className="badge ok">drin</span> : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {groupList.length === 0 && <p className="muted">Keine Tickets.</p>}
        </div>
      )}
    </main>
  );
}
