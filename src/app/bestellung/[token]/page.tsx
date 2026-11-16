import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AutoRefresh from "@/components/AutoRefresh";
import WalletButtons from "@/components/WalletButtons";
import { EVENT, VENUE_ONE_LINE } from "@/lib/event";
import { euro, relationLabel, STATUS_LABEL } from "@/lib/format";
import { getOrderByToken, ticketTypeMap } from "@/lib/orders";
import { qrSvg } from "@/lib/qr";
import { isAppleWalletConfigured } from "@/lib/pkpass";
import { googleWalletUrl } from "@/lib/gwallet";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Deine Bestellung", robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: { params: { token: string }; searchParams: { zahlung?: string } }) {
  const order = await getOrderByToken(params.token);
  if (!order) notFound();
  const types = await ticketTypeMap();

  const paid = order.status === "paid";
  const validTickets = order.tickets.filter((t) => t.status === "valid");
  const qrs = paid ? await Promise.all(validTickets.map((t) => qrSvg(t.code))) : [];
  const apple = isAppleWalletConfigured();
  let gUrl: string | null = null;
  try {
    gUrl = paid ? await googleWalletUrl(order, validTickets, types) : null;
  } catch (err) {
    console.error(err);
  }

  const waiting = order.status === "pending" && searchParams.zahlung === "erfolgreich";

  return (
    <>
      <SiteHeader />
      <main className="hero" style={{ paddingTop: 64 }}>
        <div className="wrap">
          <p className="eyebrow">Bestellung · {STATUS_LABEL[order.status]}</p>
          {paid && <h1 className="h1">Du bist dabei.</h1>}
          {waiting && (
            <>
              <AutoRefresh />
              <h1 className="h1">Zahlung wird bestätigt …</h1>
              <p className="lead">Das dauert meist nur wenige Sekunden. Die Seite aktualisiert sich automatisch, deine Tickets kommen zusätzlich per E-Mail.</p>
            </>
          )}
          {order.status === "pending" && !waiting && (
            <>
              <h1 className="h1">Zahlung nicht abgeschlossen</h1>
              <p className="lead">
                {searchParams.zahlung === "abgebrochen" ? "Du hast die Zahlung abgebrochen. " : ""}
                Deine Plätze bleiben bis zu 30 Minuten reserviert und werden danach wieder freigegeben.
              </p>
              <div className="row" style={{ marginTop: 32 }}><Link className="btn" href="/#tickets">Neu buchen</Link></div>
            </>
          )}
          {order.status === "expired" && (
            <>
              <h1 className="h1">Reservierung abgelaufen</h1>
              <p className="lead">Die Zahlung wurde nicht innerhalb von 30 Minuten abgeschlossen. Die Plätze wurden wieder freigegeben.</p>
              <div className="row" style={{ marginTop: 32 }}><Link className="btn" href="/#tickets">Neu buchen</Link></div>
            </>
          )}
          {(order.status === "cancelled" || order.status === "refunded") && (
            <>
              <h1 className="h1">{order.status === "refunded" ? "Bestellung erstattet" : "Bestellung storniert"}</h1>
              <p className="lead">Die Tickets dieser Bestellung sind nicht mehr gültig.</p>
            </>
          )}

          {paid && (
            <>
              <p className="lead">
                {EVENT.dateLabel}, {EVENT.timeLabel}<br />{VENUE_ONE_LINE}
              </p>
              <div className="row" style={{ marginTop: 32 }}>
                <a className="btn" href={`/api/orders/${order.public_token}/pdf`}>Tickets als PDF</a>
                <a className="btn ghost" href={`/api/orders/${order.public_token}/ics`}>In den Kalender</a>
                {gUrl && <a className="btn ghost" href={gUrl} target="_blank" rel="noopener noreferrer">Alle zu Google Wallet</a>}
              </div>
            </>
          )}

          <dl className="facts" style={{ marginTop: 64 }}>
            <div><dt>Name</dt><dd>{order.buyer_name}<br /><span className="muted small">{relationLabel(order.relation, order.guest_of)}</span></dd></div>
            <div><dt>E-Mail</dt><dd style={{ wordBreak: "break-all" }}>{order.email}</dd></div>
            <div>
              <dt>Bestellung</dt>
              <dd>
                {order.order_items.map((i) => (
                  <div key={i.ticket_type_id}>{i.quantity} × {types[i.ticket_type_id]?.name ?? i.ticket_type_id}</div>
                ))}
                <strong>{euro(order.amount_cents)}</strong>
              </dd>
            </div>
          </dl>
        </div>
      </main>

      {paid && validTickets.length > 0 && (
        <section className="section">
          <div className="wrap">
            <h2 className="h2">Deine Tickets</h2>
            <div className="ticket-cards">
              {validTickets.map((t, i) => (
                <div className="ticket-card" key={t.id}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>{types[t.ticket_type_id]?.name ?? t.ticket_type_id}</strong>
                    {t.checked_in_at ? <span className="badge warn">Eingelassen</span> : <span className="badge ok">Gültig</span>}
                  </div>
                  <div>{t.holder_name}</div>
                  <div className="qr" dangerouslySetInnerHTML={{ __html: qrs[i] }} />
                  <div className="mono" style={{ textAlign: "center", fontWeight: 600 }}>{t.code}</div>
                  <WalletButtons appleHref={apple ? `/api/tickets/${t.code}/pkpass` : null} />
                  <Link className="small muted" href={`/ticket/${t.code}`}>Einzelticket öffnen und weiterleiten</Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <SiteFooter />
    </>
  );
}
