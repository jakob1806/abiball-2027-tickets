import "server-only";
import { Resend } from "resend";
import { EVENT, VENUE_ONE_LINE } from "./event";
import { optionalEnv, requireEnv, siteUrl } from "./env";
import { euro } from "./format";
import { buildIcs } from "./ics";
import { getOrderById, ticketTypeMap } from "./orders";
import { buildTicketsPdf } from "./pdf";
import { buildPkpass, isAppleWalletConfigured } from "./pkpass";
import { googleWalletUrl } from "./gwallet";
import { db } from "./supabase";

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Versendet die Ticketmail mit PDF, .pkpass-Dateien und .ics. Setzt mail_sent_at. */
export async function sendTicketMail(orderId: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("Bestellung nicht gefunden");
  if (order.status !== "paid") throw new Error("Bestellung ist nicht bezahlt");

  const types = await ticketTypeMap();
  const tickets = order.tickets.filter((t) => t.status === "valid");
  if (tickets.length === 0) throw new Error("Keine gültigen Tickets");

  const orderUrl = `${siteUrl()}/bestellung/${order.public_token}`;
  const afterpartyOnly = tickets.every((t) => t.ticket_type_id === "afterparty");

  const attachments: { filename: string; content: Buffer; contentType?: string }[] = [
    { filename: "Abiball-2027-Tickets.pdf", content: await buildTicketsPdf(order, tickets, types), contentType: "application/pdf" },
    {
      filename: "Abiball-2027.ics",
      content: Buffer.from(buildIcs({ uid: order.id, afterpartyOnly, orderUrl }), "utf8"),
      contentType: "text/calendar",
    },
  ];

  if (isAppleWalletConfigured()) {
    for (const [i, t] of tickets.entries()) {
      try {
        attachments.push({
          filename: `Abiball-2027-Ticket-${i + 1}.pkpass`,
          content: await buildPkpass(order, t, types[t.ticket_type_id]),
          contentType: "application/vnd.apple.pkpass",
        });
      } catch (err) {
        console.error("pkpass fehlgeschlagen", t.code, err);
      }
    }
  }

  let gUrl: string | null = null;
  try {
    gUrl = await googleWalletUrl(order, tickets, types);
  } catch (err) {
    console.error("Google Wallet fehlgeschlagen", err);
  }

  const counts = order.order_items
    .map((i) => `${i.quantity} × ${types[i.ticket_type_id]?.name ?? i.ticket_type_id}`)
    .join(", ");

  const button = (href: string, label: string) =>
    `<a href="${esc(href)}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:600;margin:0 8px 8px 0">${esc(label)}</a>`;

  const html = `<!doctype html><html lang="de"><body style="margin:0;background:#fff;color:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <p style="font-size:14px;color:#6b6b6b;margin:0 0 8px">${esc(EVENT.school)}</p>
  <h1 style="font-size:40px;line-height:1.05;margin:0 0 24px;letter-spacing:-0.02em">${esc(EVENT.title)}</h1>
  <p style="font-size:17px;line-height:1.5">Hallo ${esc(order.buyer_name)},<br>danke für deine Bestellung. Deine Tickets sind im Anhang (PDF${isAppleWalletConfigured() ? " und Apple Wallet" : ""}).</p>
  <p style="font-size:17px;line-height:1.5"><strong>${esc(counts)}</strong> · ${esc(euro(order.amount_cents))}</p>
  <p style="font-size:17px;line-height:1.5">${esc(EVENT.dateLabel)}, ${esc(EVENT.timeLabel)}<br>${esc(VENUE_ONE_LINE)}</p>
  <div style="margin:28px 0">${button(orderUrl, "Tickets online ansehen")}${gUrl ? button(gUrl, "Zu Google Wallet hinzufügen") : ""}</div>
  <p style="font-size:14px;line-height:1.5;color:#6b6b6b">Jeder QR-Code gilt für genau einen Einlass. Bitte leite die Tickets nur an die jeweiligen Gäste weiter. Personen unter 18 Jahren dürfen ohne erziehungsbeauftragte Person nur bis 24 Uhr bleiben.</p>
  <hr style="border:0;border-top:1px solid #e5e5e5;margin:32px 0">
  <p style="font-size:12px;line-height:1.5;color:#6b6b6b">Veranstalter: ${esc(EVENT.organizer)}. Keine Schulveranstaltung.<br><a href="${siteUrl()}/impressum" style="color:#6b6b6b">Impressum</a> · <a href="${siteUrl()}/datenschutz" style="color:#6b6b6b">Datenschutz</a> · <a href="${siteUrl()}/agb" style="color:#6b6b6b">AGB</a></p>
</div></body></html>`;

  const text = [
    `Hallo ${order.buyer_name},`,
    "",
    "danke für deine Bestellung. Deine Tickets sind im Anhang.",
    `${counts} · ${euro(order.amount_cents)}`,
    `${EVENT.dateLabel}, ${EVENT.timeLabel}`,
    VENUE_ONE_LINE,
    "",
    `Tickets online: ${orderUrl}`,
    gUrl ? `Google Wallet: ${gUrl}` : "",
    "",
    `Veranstalter: ${EVENT.organizer}. Keine Schulveranstaltung.`,
  ].join("\n");

  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const payload = {
    from: requireEnv("MAIL_FROM"),
    to: order.email,
    replyTo: optionalEnv("MAIL_REPLY_TO"),
    subject: `Deine Tickets: ${EVENT.title}`,
    html,
    text,
    attachments,
  };
  let { error } = await resend.emails.send(payload);
  // Kurzzeitiges Ratenlimit (wenige Mails pro Sekunde): einmal kurz warten und erneut senden
  if (error && /rate_limit/i.test(error.name ?? "")) {
    await new Promise((r) => setTimeout(r, 1200));
    ({ error } = await resend.emails.send(payload));
  }
  if (error) {
    const quota = /quota|rate_limit/i.test(`${error.name ?? ""} ${error.message ?? ""}`);
    throw new MailSendError(`Resend: ${error.message}`, quota);
  }

  await db()
    .from("orders")
    .update({ mail_sent_at: new Date().toISOString(), mail_queued_at: null, mail_last_error: null })
    .eq("id", order.id);
}

export class MailSendError extends Error {
  constructor(message: string, public readonly quotaReached: boolean) {
    super(message);
    this.name = "MailSendError";
  }
}

export type DeliveryResult = { status: "sent" } | { status: "queued"; quotaReached: boolean; error: string };

/**
 * Versucht die Ticketmail zu senden. Klappt das nicht (z. B. Tageslimit bei Resend erreicht),
 * wird die Bestellung in die Warteschlange gelegt und später automatisch erneut versucht.
 */
export async function deliverOrQueue(orderId: string): Promise<DeliveryResult> {
  try {
    await sendTicketMail(orderId);
    return { status: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const quotaReached = err instanceof MailSendError && err.quotaReached;
    const { data } = await db().from("orders").select("mail_queued_at, mail_attempts").eq("id", orderId).single();
    await db()
      .from("orders")
      .update({
        mail_queued_at: data?.mail_queued_at ?? new Date().toISOString(),
        mail_attempts: (data?.mail_attempts ?? 0) + 1,
        mail_last_error: message.slice(0, 500),
      })
      .eq("id", orderId);
    console.warn(`Mail für ${orderId} in Warteschlange: ${message}`);
    return { status: "queued", quotaReached, error: message };
  }
}

/** Arbeitet die Warteschlange ab (älteste zuerst). Stoppt, sobald das Limit wieder greift. */
export async function processMailQueue(max = 50): Promise<{ sent: number; remaining: number; stoppedByQuota: boolean }> {
  const { data, error } = await db()
    .from("orders")
    .select("id")
    .eq("status", "paid")
    .is("mail_sent_at", null)
    .not("mail_queued_at", "is", null)
    .order("mail_queued_at", { ascending: true })
    .limit(max);
  if (error) throw error;

  let sent = 0;
  let stoppedByQuota = false;
  for (const { id } of data ?? []) {
    const r = await deliverOrQueue(id);
    if (r.status === "sent") sent += 1;
    else if (r.quotaReached) {
      stoppedByQuota = true;
      break;
    }
  }
  const { count } = await db()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid")
    .is("mail_sent_at", null)
    .not("mail_queued_at", "is", null);
  return { sent, remaining: count ?? 0, stoppedByQuota };
}
