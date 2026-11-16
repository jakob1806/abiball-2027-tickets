import Link from "next/link";
import SalesChart from "@/components/SalesChart";
import MailQueuePanel from "@/components/MailQueuePanel";
import { getStats } from "@/lib/admin-data";
import { ticketTypeMap } from "@/lib/orders";
import { dateTime, euro, PAYMENT_LABEL, STATUS_LABEL } from "@/lib/format";
import { isStripeTestMode } from "@/lib/stripe";
import { EVENT } from "@/lib/event";

export const dynamic = "force-dynamic";

const badgeClass: Record<string, string> = { paid: "ok", pending: "warn", expired: "", cancelled: "bad", refunded: "bad" };

function daysUntilEvent(): number {
  return Math.max(0, Math.ceil((new Date(EVENT.startISO).getTime() - Date.now()) / 86400000));
}

export default async function AdminDashboard() {
  const [stats, types] = await Promise.all([getStats(), ticketTypeMap()]);
  const taken = stats.capacity - stats.remaining;
  const pct = (n: number, d: number) => (d > 0 ? Math.min(100, Math.round((n / d) * 100)) : 0);

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="admin-head">
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>{EVENT.dateLabel} · noch {daysUntilEvent()} Tage</p>
          <h1 className="h2" style={{ margin: 0 }}>Übersicht</h1>
        </div>
        <div className="row">
          <Link className="btn small" href="/admin/neu">Neue Buchung</Link>
          <Link className="btn small ghost" href="/admin/scanner">Einlass</Link>
        </div>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 16 }}>
        {isStripeTestMode() && <span className="badge warn">Stripe-Testmodus</span>}
        {stats.salesOpen ? <span className="badge ok">Verkauf offen</span> : <span className="badge bad">Verkauf geschlossen</span>}
        {stats.reservedTickets > 0 && <span className="badge">{stats.reservedTickets} Plätze gerade reserviert</span>}
      </div>

      <MailQueuePanel count={stats.mailQueue} />

      <div className="stats">
        <div className="stat"><div className="v">{stats.sold}</div><div className="l">Tickets verkauft · {stats.paidOrders} Bestellungen</div></div>
        <div className="stat"><div className="v">{euro(stats.revenue)}</div><div className="l">Umsatz, davon online {euro(stats.revenueOnline)}</div></div>
        <div className="stat"><div className="v">{stats.remaining}</div><div className="l">Restplätze von {stats.capacity}</div></div>
        <div className="stat"><div className="v">{stats.checkedIn}</div><div className="l">Eingecheckt von {stats.sold}</div></div>
      </div>

      <section className="admin-grid">
        <div className="panel">
          <h2 className="h3">Auslastung</h2>
          <div className="meter-row">
            <div className="meter-label"><span>Gesamt</span><span>{taken} / {stats.capacity}</span></div>
            <div className="meter"><span style={{ width: `${pct(taken, stats.capacity)}%` }} /></div>
          </div>
          {Object.values(types).map((t) => {
            const sold = stats.perType[t.id]?.sold ?? 0;
            return (
              <div className="meter-row" key={t.id}>
                <div className="meter-label">
                  <span>{t.name} · {euro(t.price_cents)}{!t.active && " · inaktiv"}</span>
                  <span>{sold} / {t.quota}</span>
                </div>
                <div className="meter"><span style={{ width: `${pct(sold, t.quota)}%` }} /></div>
                <div className="small muted">{stats.perTypeAvailable[t.id] ?? 0} frei · {stats.perType[t.id]?.checkedIn ?? 0} eingecheckt</div>
              </div>
            );
          })}
          <p className="small" style={{ marginBottom: 0 }}><Link href="/admin/einstellungen">Preise und Kontingente ändern →</Link></p>
        </div>

        <div className="panel">
          <h2 className="h3">Zahlungsarten</h2>
          <table>
            <thead><tr><th>Art</th><th>Bestellungen</th><th>Tickets</th><th>Betrag</th></tr></thead>
            <tbody>
              {(["stripe", "bar", "ueberweisung", "frei"] as const).map((m) => (
                <tr key={m}>
                  <td>{PAYMENT_LABEL[m]}</td>
                  <td>{stats.byPayment[m]?.orders ?? 0}</td>
                  <td>{stats.byPayment[m]?.tickets ?? 0}</td>
                  <td>{euro(stats.byPayment[m]?.cents ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted" style={{ marginBottom: 0 }}>Online-Beträge vor Stripe-Gebühren.</p>
        </div>
      </section>

      {stats.openTransfers.length > 0 && (
        <section className="panel" style={{ marginTop: 16 }}>
          <div className="meter-label" style={{ marginBottom: 8 }}>
            <h2 className="h3" style={{ margin: 0 }}>Offene Überweisungen</h2>
            <span className="muted">{stats.openTransfers.length} · {euro(stats.openTransfers.reduce((s, t) => s + t.amount_cents, 0))}</span>
          </div>
          <table>
            <thead><tr><th>Name</th><th>Verwendungszweck</th><th>Betrag</th><th>Frist</th></tr></thead>
            <tbody>
              {stats.openTransfers.map((t) => (
                <tr key={t.id}>
                  <td><Link href={`/admin/bestellung/${t.id}`}>{t.buyer_name}</Link></td>
                  <td className="mono small">{t.transfer_reference}</td>
                  <td>{euro(t.amount_cents)}</td>
                  <td className="small">{dateTime(t.transfer_due_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted" style={{ marginBottom: 0 }}>Geld eingegangen? Bestellung öffnen und „Zahlung eingegangen“ klicken. Ohne Zahlung wird nach Ablauf der Frist automatisch storniert und der Käufer per Mail informiert.</p>
        </section>
      )}

      <section className="panel" style={{ marginTop: 16 }}>
        <SalesChart days={stats.days} />
      </section>

      <section style={{ marginTop: 40 }}>
        <div className="admin-head">
          <h2 className="h3" style={{ margin: 0 }}>Neueste Buchungen</h2>
          <Link className="small" href="/admin/buchungen">Alle Buchungen →</Link>
        </div>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead><tr><th>Datum</th><th>Name</th><th>Tickets</th><th>Betrag</th><th>Status</th></tr></thead>
            <tbody>
              {stats.recent.map((o) => (
                <tr key={o.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{dateTime(o.created_at)}</td>
                  <td><Link href={`/admin/bestellung/${o.id}`}>{o.buyer_name}</Link></td>
                  <td>{o.order_items.map((i) => `${i.quantity} × ${types[i.ticket_type_id]?.name ?? i.ticket_type_id}`).join(", ")}</td>
                  <td>{euro(o.amount_cents)}</td>
                  <td><span className={`badge ${badgeClass[o.status]}`}>{STATUS_LABEL[o.status]}</span></td>
                </tr>
              ))}
              {stats.recent.length === 0 && <tr><td colSpan={5} className="muted">Noch keine Buchungen.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
