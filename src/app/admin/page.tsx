import Link from "next/link";
import { getStats, listOrders } from "@/lib/admin-data";
import { ticketTypeMap } from "@/lib/orders";
import { dateTime, euro, PAYMENT_LABEL, relationLabel, STATUS_LABEL } from "@/lib/format";
import { isStripeTestMode } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const badgeClass: Record<string, string> = { paid: "ok", pending: "warn", expired: "", cancelled: "bad", refunded: "bad" };

export default async function AdminHome({ searchParams }: { searchParams: { q?: string; status?: string; type?: string } }) {
  const [stats, orders, types] = await Promise.all([getStats(), listOrders(searchParams), ticketTypeMap()]);

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64 }}>
      {isStripeTestMode() && <div className="note" style={{ marginBottom: 16 }}>Stripe läuft im Testmodus.</div>}

      <div className="stats">
        <div className="stat"><div className="v">{stats.sold}</div><div className="l">Tickets verkauft</div></div>
        <div className="stat"><div className="v">{euro(stats.revenue)}</div><div className="l">Umsatz (davon online {euro(stats.revenueOnline)})</div></div>
        <div className="stat"><div className="v">{stats.remaining}</div><div className="l">Restplätze von {stats.capacity}</div></div>
        <div className="stat"><div className="v">{stats.checkedIn}</div><div className="l">Eingecheckt</div></div>
      </div>

      <div className="row small muted" style={{ marginBottom: 32, gap: 24 }}>
        {Object.values(types).map((t) => (
          <span key={t.id}>
            <strong style={{ color: "#000" }}>{t.name}</strong>: {stats.perType[t.id]?.sold ?? 0} verkauft · {stats.perTypeAvailable[t.id] ?? 0} frei
            (Kontingent {t.quota}, {euro(t.price_cents)}) · {stats.perType[t.id]?.checkedIn ?? 0} drin
          </span>
        ))}
      </div>

      <form className="filters" method="get">
        <input type="search" name="q" placeholder="Name, E-Mail, „Gast von“ oder Ticketcode" defaultValue={searchParams.q ?? ""} />
        <select name="status" defaultValue={searchParams.status ?? ""}>
          <option value="">Alle Status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="type" defaultValue={searchParams.type ?? ""}>
          <option value="">Alle Ticketarten</option>
          {Object.values(types).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="btn">Filtern</button>
      </form>

      <p className="small muted">{orders.length} Buchungen</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Datum</th><th>Name</th><th>Bezug</th><th>Tickets</th><th>Betrag</th><th>Zahlung</th><th>Status</th><th>Einlass</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const valid = o.tickets.filter((t) => t.status === "valid");
              return (
                <tr key={o.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{dateTime(o.created_at)}</td>
                  <td>
                    <Link href={`/admin/bestellung/${o.id}`}>{o.buyer_name}</Link>
                    <div className="small muted">{o.email}</div>
                  </td>
                  <td>{relationLabel(o.relation, o.guest_of)}</td>
                  <td>{o.order_items.map((i) => <div key={i.ticket_type_id}>{i.quantity} × {types[i.ticket_type_id]?.name ?? i.ticket_type_id}</div>)}</td>
                  <td>{euro(o.amount_cents)}</td>
                  <td>{PAYMENT_LABEL[o.payment_method]}</td>
                  <td><span className={`badge ${badgeClass[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                  <td>{valid.length ? `${valid.filter((t) => t.checked_in_at).length}/${valid.length}` : "–"}</td>
                </tr>
              );
            })}
            {orders.length === 0 && <tr><td colSpan={8} className="muted">Keine Buchungen gefunden.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
