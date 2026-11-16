import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import WalletButtons from "@/components/WalletButtons";
import { EVENT, VENUE_ONE_LINE } from "@/lib/event";
import { getTicketByCode, ticketTypeMap } from "@/lib/orders";
import { qrSvg } from "@/lib/qr";
import { isAppleWalletConfigured } from "@/lib/pkpass";
import { googleWalletUrl } from "@/lib/gwallet";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ticket", robots: { index: false, follow: false } };

export default async function TicketPage({ params }: { params: { code: string } }) {
  const found = await getTicketByCode(decodeURIComponent(params.code));
  if (!found) notFound();
  const { ticket, order } = found;
  const types = await ticketTypeMap();
  const type = types[ticket.ticket_type_id];
  const valid = ticket.status === "valid" && order.status === "paid";

  let gUrl: string | null = null;
  try {
    gUrl = valid ? await googleWalletUrl(order, [ticket], types) : null;
  } catch (err) {
    console.error(err);
  }

  return (
    <>
      <SiteHeader />
      <main className="hero" style={{ paddingTop: 56 }}>
        <div className="wrap" style={{ maxWidth: 520 }}>
          <p className="eyebrow">{EVENT.title} · {type?.admission}</p>
          <h1 className="h1">{type?.name ?? "Ticket"}</h1>
          <p style={{ fontSize: 22, margin: "0 0 24px" }}>{ticket.holder_name}</p>
          {valid ? (
            <>
              <div className="qr" style={{ border: "1px solid var(--line)", borderRadius: 16, padding: 16 }} dangerouslySetInnerHTML={{ __html: await qrSvg(ticket.code) }} />
              <p className="mono" style={{ textAlign: "center", fontWeight: 600, fontSize: 20 }}>{ticket.code}</p>
              {ticket.checked_in_at && <p className="note">Dieses Ticket wurde bereits am Einlass gescannt.</p>}
              <WalletButtons appleHref={isAppleWalletConfigured() ? `/api/tickets/${ticket.code}/pkpass` : null} googleHref={gUrl} />
            </>
          ) : (
            <div className="alert">Dieses Ticket ist nicht gültig.</div>
          )}
          <p className="muted" style={{ marginTop: 32 }}>
            {EVENT.dateLabel}, {EVENT.timeLabel}<br />{VENUE_ONE_LINE}
          </p>
          <p className="small muted">Unter 18 Jahren ohne erziehungsbeauftragte Person nur bis 24 Uhr. Bitte Ausweis mitbringen.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
