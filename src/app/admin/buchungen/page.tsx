import Link from "next/link";
import { listOrders } from "@/lib/admin-data";
import DeleteExpiredButton from "@/components/DeleteExpiredButton";
import { db } from "@/lib/supabase";
import { ticketTypeMap } from "@/lib/orders";
import { dateTime, euro, PAYMENT_LABEL, relationLabel, STATUS_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

const badgeClass: Record<string, string> = { paid: "ok", pending: "warn", expired: "", cancelled: "bad", refunded: "bad" };

export default async function AdminBookings({ searchParams }: { searchParams: { q?: string; status?: string; type?: string; zahlung?: string } }) {
  const [orders, types, expired] = await Promise.all([
    listOrders(searchParams),
    ticketTypeMap(),
    db().from("orders").select("id", { count: "exact", head: true }).eq("status", "expired").is("paid_at", null),
  ]);

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <h1 className="h2" style={{ marginBottom: 24 }}>Buchungen</h1>

      <form className="filters" method="get">
        <input type="search" name="q" placeholder="Name, E-Mail, „Gast von“, Ticketnr. (B-012) oder Code" defaultValue={searchParams.q ?? ""} />
        <select name="status" defaultValue={searchParams.status ?? ""}>
          <option value="">Alle Status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="type" defaultValue={searchParams.type ?? ""}>
          <option value="">Alle Ticketarten</option>
          {Object.values(types).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select name="zahlung" defaultValue={searchParams.zahlung ?? ""}>
          <option value="">Alle Zahlungsarten</option>
          {Object.entries(PAYMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn">Filtern</button>
      </form>

      <div className="row small muted" style={{ justifyContent: "space-between", marginBottom: 8 }}><span>{orders.length} Buchungen</span><span className="row"><DeleteExpiredButton count={expired.count ?? 0} /><a href="/api/admin/export">Excel-Export</a></span></div>
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
