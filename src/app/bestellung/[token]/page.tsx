import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AutoRefresh from "@/components/AutoRefresh";
import WalletButtons from "@/components/WalletButtons";
import MailQueuedNotice from "@/components/MailQueuedNotice";
import { EVENT, VENUE_ONE_LINE } from "@/lib/event";
import { euro, relationLabel, STATUS_LABEL } from "@/lib/format";
import { getOrderByToken, ticketTypeMap } from "@/lib/orders";
import { qrSvg } from "@/lib/qr";
import { isAppleWalletConfigured } from "@/lib/pkpass";
import { googleWalletUrl } from "@/lib/gwallet";
import { epcPayload, formatIban, getBankDetails } from "@/lib/transfer";
import { dateTime } from "@/lib/format";

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

  const isTransfer = order.payment_method === "ueberweisung";
  const transferOpen = order.status === "pending" && isTransfer && !!order.transfer_reference;
  const bank = transferOpen ? await getBankDetails() : null;
  const giroQr = transferOpen && bank?.iban ? await qrSvg(epcPayload(bank, order.amount_cents, order.transfer_reference!)) : null;
  const waiting = order.status === "pending" && !isTransfer && searchParams.zahlung === "erfolgreich";

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
          {transferOpen && bank && (
            <>
              <h1 className="h1">Bitte überweisen</h1>
              <p className="lead">
                Deine Plätze sind bis {dateTime(order.transfer_due_at)} Uhr reserviert. Sobald das Geld da ist, bekommst du deine Tickets per
                E-Mail. Ohne Zahlungseingang wird die Bestellung danach automatisch storniert.
              </p>
              <div className="bank-box">
                <dl>
                  <dt>Empfänger</dt><dd>{bank.holder}</dd>
                  <dt>IBAN</dt><dd className="mono">{formatIban(bank.iban)}</dd>
                  {bank.bic && (<><dt>BIC</dt><dd className="mono">{bank.bic}</dd></>)}
                  {bank.bankName && (<><dt>Bank</dt><dd>{bank.bankName}</dd></>)}
                  <dt>Betrag</dt><dd>{euro(order.amount_cents)}</dd>
                  <dt>Verwendungszweck</dt><dd className="mono">{order.transfer_reference}</dd>
                </dl>
                {giroQr && (
                  <div>
                    <div className="qr" dangerouslySetInnerHTML={{ __html: giroQr }} />
                    <div className="small muted" style={{ textAlign: "center", marginTop: 6 }}>GiroCode für deine Banking-App</div>
                  </div>
                )}
              </div>
              <p className="small muted" style={{ maxWidth: 640 }}>
                Bitte gib genau diesen Verwendungszweck an. Die Bankdaten haben wir dir auch per E-Mail geschickt.
              </p>
            </>
          )}
          {order.status === "pending" && !isTransfer && !waiting && (
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
              <h1 className="h1">{isTransfer ? "Bestellung storniert" : "Reservierung abgelaufen"}</h1>
              <p className="lead">
                {isTransfer
                  ? "Bis zur Zahlungsfrist ist keine Überweisung eingegangen. Die Plätze wurden wieder freigegeben. Falls du doch überwiesen hast, melde dich bitte bei uns."
                  : "Die Zahlung wurde nicht innerhalb von 30 Minuten abgeschlossen. Die Plätze wurden wieder freigegeben."}
              </p>
              <div className="row" style={{ marginTop: 32 }}><Link className="btn" href="/#tickets">Neu buchen</Link></div>
            </>
          )}
          {(order.status === "cancelled" || order.status === "refunded") && (
            <>
              <h1 className="h1">{order.status === "refunded" ? "Bestellung erstattet" : "Bestellung storniert"}</h1>
              <p className="lead">Die Tickets dieser Bestellung sind nicht mehr gültig.</p>
            </>
          )}

          {paid && !order.mail_sent_at && order.mail_queued_at && <MailQueuedNotice email={order.email} />}
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
