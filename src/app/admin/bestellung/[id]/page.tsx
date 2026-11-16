import Link from "next/link";
import { notFound } from "next/navigation";
import AdminOrderActions from "@/components/AdminOrderActions";
import EditOrderForm from "@/components/EditOrderForm";
import TypeBadge from "@/components/TypeBadge";
import { getOrderById, ticketTypeMap } from "@/lib/orders";
import { dateTime, euro, PAYMENT_LABEL, relationLabel, STATUS_LABEL } from "@/lib/format";
import { isStripeTestMode } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export default async function AdminOrder({ params }: { params: { id: string } }) {
  const order = await getOrderById(params.id);
  if (!order) notFound();
  const types = await ticketTypeMap();
  const stripeBase = isStripeTestMode() ? "https://dashboard.stripe.com/test" : "https://dashboard.stripe.com";

  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <p className="small"><Link href="/admin/buchungen" className="muted">← Buchungen</Link></p>
      <h1 className="h2" style={{ marginBottom: 8 }}>{order.buyer_name}</h1>
      <p className="muted" style={{ marginTop: 0 }}>{STATUS_LABEL[order.status]} · {PAYMENT_LABEL[order.payment_method]} · {euro(order.amount_cents)}</p>

      <div className="row" style={{ alignItems: "flex-start" }}>
        <AdminOrderActions
          orderId={order.id}
          status={order.status}
          canRefund={order.payment_method === "stripe" && !!order.stripe_payment_intent}
          openTransfer={order.payment_method === "ueberweisung" && !!order.transfer_reference && ["pending", "expired"].includes(order.status)}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <EditOrderForm
          orderId={order.id}
          initial={{
            buyer_name: order.buyer_name,
            email: order.email,
            relation: order.relation,
            guest_of: order.guest_of,
            notes: order.notes,
            tickets: order.tickets.filter((t) => t.status === "valid").map((t) => ({
              id: t.id,
              holder_name: t.holder_name,
              code: t.ticket_number ?? t.code,
              type: types[t.ticket_type_id]?.name ?? t.ticket_type_id,
            })),
          }}
        />
      </div>

      <dl className="facts" style={{ margin: "40px 0" }}>
        <div><dt>E-Mail</dt><dd style={{ wordBreak: "break-all" }}>{order.email}</dd></div>
        <div><dt>Bezug</dt><dd>{relationLabel(order.relation, order.guest_of)}</dd></div>
        <div><dt>Weitere Gäste</dt><dd>{order.guest_names.length ? order.guest_names.join(", ") : "–"}</dd></div>
        <div><dt>Angelegt</dt><dd>{dateTime(order.created_at)}</dd></div>
        {order.transfer_reference && (
          <div>
            <dt>Überweisung</dt>
            <dd>
              <span className="mono">{order.transfer_reference}</span>
              {order.status === "pending" && <div className="small muted">Frist: {dateTime(order.transfer_due_at)}{order.transfer_reminder_sent_at ? ` · erinnert ${dateTime(order.transfer_reminder_sent_at)}` : ""}</div>}
            </dd>
          </div>
        )}
        <div><dt>Bezahlt</dt><dd>{dateTime(order.paid_at)}</dd></div>
        <div>
          <dt>Mail versendet</dt>
          <dd>
            {order.mail_sent_at ? dateTime(order.mail_sent_at) : order.mail_queued_at ? <span className="badge warn">In Warteschlange seit {dateTime(order.mail_queued_at)}</span> : "–"}
            {!order.mail_sent_at && order.mail_last_error && <div className="small muted">{order.mail_last_error}</div>}
          </dd>
        </div>
        <div><dt>Bestätigungen</dt><dd>Jugendschutz {order.youth_protection_ack ? "✓" : "–"} · AGB {order.terms_ack ? "✓" : "–"}</dd></div>
        <div>
          <dt>Stripe</dt>
          <dd>
            {order.stripe_payment_intent ? (
              <a href={`${stripeBase}/payments/${order.stripe_payment_intent}`} target="_blank" rel="noopener noreferrer">Zahlung öffnen</a>
            ) : "–"}
          </dd>
        </div>
        <div><dt>Kundenseite</dt><dd><a href={`/bestellung/${order.public_token}`} target="_blank">Bestellseite öffnen</a></dd></div>
        {order.notes && <div><dt>Notiz</dt><dd>{order.notes}</dd></div>}
      </dl>

      <h2 className="h3">Tickets</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nr.</th><th>Art</th><th>Name</th><th>Code</th><th>Status</th><th>Eingecheckt</th></tr></thead>
          <tbody>
            {order.tickets.map((t) => (
              <tr key={t.id}>
                <td className="ticket-no">{t.ticket_number ?? "–"}</td>
                <td><TypeBadge typeId={t.ticket_type_id} name={types[t.ticket_type_id]?.name} /></td>
                <td>{t.holder_name}</td>
                <td className="mono small"><a href={`/ticket/${t.code}`} target="_blank">{t.code}</a></td>
                <td>{t.status === "valid" ? <span className="badge ok">Gültig</span> : <span className="badge bad">Storniert</span>}</td>
                <td>{dateTime(t.checked_in_at)}</td>
              </tr>
            ))}
            {order.tickets.length === 0 && <tr><td colSpan={6} className="muted">Noch keine Tickets (erst nach Zahlung).</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
